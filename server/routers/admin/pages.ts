import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import {
  pageRevisions,
  pages,
  pageSections,
  pageVariants,
} from "../../../drizzle/schema";
import { permissionProcedure, router } from "../../_core/trpc";
import { getDb } from "../../db";
import { writeAuditLog } from "../../services/auditing";

const sectionInput = z.object({
  id: z.number().optional(),
  type: z.string().min(1).max(64),
  position: z.number().int().min(0),
  contentJson: z.record(z.string(), z.unknown()),
  settingsJson: z.record(z.string(), z.unknown()).optional(),
  isVisible: z.boolean().default(true),
});

function getClientMeta(ctx: { req: { ip?: string; headers: Record<string, unknown> } }) {
  const ipAddress = (ctx.req.ip ?? null) as string | null;
  const userAgent = typeof ctx.req.headers["user-agent"] === "string" ? ctx.req.headers["user-agent"] : null;
  return { ipAddress, userAgent };
}

async function makePageSnapshot(pageId: number, variantId?: number | null) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

  const page = await db.select().from(pages).where(eq(pages.id, pageId)).limit(1);
  if (page.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });

  const sections = await db
    .select()
    .from(pageSections)
    .where(
      variantId != null
        ? eq(pageSections.variantId, variantId)
        : and(eq(pageSections.pageId, pageId), isNull(pageSections.variantId))
    )
    .orderBy(asc(pageSections.position));

  return {
    page: page[0],
    sections: sections.map((s) => ({
      id: s.id,
      type: s.type,
      position: s.position,
      contentJson: s.contentJson ?? {},
      settingsJson: s.settingsJson ?? {},
      isVisible: s.isVisible,
    })),
  };
}

export const adminPagesRouter = router({
  list: permissionProcedure("content.read").query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(pages).orderBy(desc(pages.updatedAt));
  }),

  getById: permissionProcedure("content.read")
    .input(z.object({ pageId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const pageRows = await db.select().from(pages).where(eq(pages.id, input.pageId)).limit(1);
      if (pageRows.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      const page = pageRows[0];

      const [sections, variants, revisions] = await Promise.all([
        db.select().from(pageSections).where(and(eq(pageSections.pageId, input.pageId), isNull(pageSections.variantId))).orderBy(asc(pageSections.position)),
        db.select().from(pageVariants).where(eq(pageVariants.pageId, input.pageId)).orderBy(desc(pageVariants.updatedAt)),
        db.select().from(pageRevisions).where(eq(pageRevisions.pageId, input.pageId)).orderBy(desc(pageRevisions.createdAt)).limit(20),
      ]);

      return { page, sections, variants, revisions };
    }),

  saveDraft: permissionProcedure("content.write")
    .input(z.object({
      pageId: z.number().int().positive().optional(),
      slug: z.string().min(1).max(128),
      title: z.string().min(1).max(512),
      sections: z.array(sectionInput).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      let pageId = input.pageId ?? null;
      const before = pageId ? await makePageSnapshot(pageId) : null;

      if (pageId == null) {
        const inserted = await db.insert(pages).values({
          slug: input.slug,
          title: input.title,
          status: "draft",
          createdBy: ctx.user.id,
          updatedBy: ctx.user.id,
        });
        pageId = Number(inserted[0].insertId);
      } else {
        await db.update(pages).set({
          slug: input.slug,
          title: input.title,
          status: "draft",
          updatedBy: ctx.user.id,
        }).where(eq(pages.id, pageId));
      }

      await db.delete(pageSections).where(and(eq(pageSections.pageId, pageId), isNull(pageSections.variantId)));
      if (input.sections.length > 0) {
        await db.insert(pageSections).values(
          input.sections.map((s) => ({
            pageId,
            variantId: null,
            type: s.type,
            position: s.position,
            contentJson: s.contentJson,
            settingsJson: s.settingsJson ?? {},
            isVisible: s.isVisible,
          }))
        );
      }

      const snapshot = await makePageSnapshot(pageId);
      const rev = await db.insert(pageRevisions).values({
        pageId,
        snapshotJson: snapshot as Record<string, unknown>,
        createdBy: ctx.user.id,
        revisionLabel: `draft-${new Date().toISOString()}`,
      });
      const revisionId = Number(rev[0].insertId);

      await db.update(pages).set({ currentRevisionId: revisionId }).where(eq(pages.id, pageId));

      const { ipAddress, userAgent } = getClientMeta(ctx);
      await writeAuditLog({
        actorUserId: ctx.user.id,
        action: "content.saveDraft",
        resourceType: "page",
        resourceId: pageId,
        before: before as Record<string, unknown> | null,
        after: snapshot as Record<string, unknown>,
        ipAddress,
        userAgent,
        clientType: "web-admin",
      });

      return { pageId, revisionId };
    }),

  publish: permissionProcedure("content.publish")
    .input(z.object({ pageId: z.number().int().positive(), notes: z.string().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const before = await makePageSnapshot(input.pageId);
      const snapshot = await makePageSnapshot(input.pageId);
      const revision = await db.insert(pageRevisions).values({
        pageId: input.pageId,
        snapshotJson: snapshot as Record<string, unknown>,
        createdBy: ctx.user.id,
        revisionLabel: input.notes?.trim() || `published-${new Date().toISOString()}`,
      });
      const revisionId = Number(revision[0].insertId);

      await db.update(pages).set({
        status: "published",
        currentRevisionId: revisionId,
        publishedRevisionId: revisionId,
        updatedBy: ctx.user.id,
        publishedAt: new Date(),
      }).where(eq(pages.id, input.pageId));

      const { ipAddress, userAgent } = getClientMeta(ctx);
      await writeAuditLog({
        actorUserId: ctx.user.id,
        action: "content.publish",
        resourceType: "page",
        resourceId: input.pageId,
        before: before as Record<string, unknown>,
        after: { revisionId, notes: input.notes ?? null },
        ipAddress,
        userAgent,
        clientType: "web-admin",
      });

      return { success: true, revisionId };
    }),

  rollback: permissionProcedure("content.rollback")
    .input(z.object({ pageId: z.number().int().positive(), revisionId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const revisionRows = await db
        .select()
        .from(pageRevisions)
        .where(and(eq(pageRevisions.id, input.revisionId), eq(pageRevisions.pageId, input.pageId)))
        .limit(1);
      if (revisionRows.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Revision not found" });

      const snapshot = revisionRows[0].snapshotJson as {
        page: { slug: string; title: string };
        sections: Array<{
          type: string;
          position: number;
          contentJson: Record<string, unknown>;
          settingsJson?: Record<string, unknown>;
          isVisible: boolean;
        }>;
      };
      if (!snapshot?.page || !Array.isArray(snapshot.sections)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Revision payload is invalid" });
      }

      const before = await makePageSnapshot(input.pageId);

      await db.update(pages).set({
        slug: snapshot.page.slug,
        title: snapshot.page.title,
        status: "published",
        currentRevisionId: input.revisionId,
        publishedRevisionId: input.revisionId,
        updatedBy: ctx.user.id,
        publishedAt: new Date(),
      }).where(eq(pages.id, input.pageId));

      await db.delete(pageSections).where(and(eq(pageSections.pageId, input.pageId), isNull(pageSections.variantId)));
      if (snapshot.sections.length > 0) {
        await db.insert(pageSections).values(
          snapshot.sections.map((s) => ({
            pageId: input.pageId,
            variantId: null,
            type: s.type,
            position: s.position,
            contentJson: s.contentJson,
            settingsJson: s.settingsJson ?? {},
            isVisible: s.isVisible,
          }))
        );
      }

      const { ipAddress, userAgent } = getClientMeta(ctx);
      await writeAuditLog({
        actorUserId: ctx.user.id,
        action: "content.rollback",
        resourceType: "page",
        resourceId: input.pageId,
        before: before as Record<string, unknown>,
        after: { rollbackToRevisionId: input.revisionId },
        ipAddress,
        userAgent,
        clientType: "web-admin",
      });

      return { success: true };
    }),

  getDiff: permissionProcedure("content.read")
    .input(z.object({
      leftRevisionId: z.number().int().positive(),
      rightRevisionId: z.number().int().positive(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const rows = await db
        .select()
        .from(pageRevisions)
        .where(inArray(pageRevisions.id, [input.leftRevisionId, input.rightRevisionId]));
      const left = rows.find((r) => r.id === input.leftRevisionId);
      const right = rows.find((r) => r.id === input.rightRevisionId);
      if (!left || !right) throw new TRPCError({ code: "NOT_FOUND", message: "One or both revisions were not found" });

      const leftJson = JSON.stringify(left.snapshotJson ?? {}, null, 2);
      const rightJson = JSON.stringify(right.snapshotJson ?? {}, null, 2);
      return { leftRevisionId: left.id, rightRevisionId: right.id, leftJson, rightJson };
    }),
});
