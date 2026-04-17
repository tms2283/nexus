import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { pageRevisions, pages } from "../../../drizzle/schema";
import { permissionProcedure, router } from "../../_core/trpc";
import { getDb } from "../../db";
import { writeAuditLog } from "../../services/auditing";
import { TRPCError } from "@trpc/server";

export const studioSyncRouter = router({
  pullWorkspace: permissionProcedure("desktop.sync")
    .input(z.object({ pageId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const pageRows = await db.select().from(pages).where(eq(pages.id, input.pageId)).limit(1);
      if (pageRows.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      const revisions = await db
        .select()
        .from(pageRevisions)
        .where(eq(pageRevisions.pageId, input.pageId))
        .orderBy(desc(pageRevisions.createdAt))
        .limit(20);
      return { page: pageRows[0], revisions };
    }),

  pushSnapshot: permissionProcedure("desktop.sync")
    .input(
      z.object({
        pageId: z.number().int().positive(),
        baseRevisionId: z.number().int().positive().optional(),
        snapshotJson: z.record(z.string(), z.unknown()),
        label: z.string().max(255).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const pageRows = await db.select().from(pages).where(eq(pages.id, input.pageId)).limit(1);
      if (pageRows.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Page not found" });
      const page = pageRows[0];

      if (input.baseRevisionId && page.currentRevisionId && input.baseRevisionId !== page.currentRevisionId) {
        return {
          success: false,
          conflict: true,
          currentRevisionId: page.currentRevisionId,
        };
      }

      const revision = await db.insert(pageRevisions).values({
        pageId: input.pageId,
        snapshotJson: input.snapshotJson,
        createdBy: ctx.user.id,
        revisionLabel: input.label ?? `studio-sync-${new Date().toISOString()}`,
      });
      const newRevisionId = Number(revision[0].insertId);
      await db.update(pages).set({
        currentRevisionId: newRevisionId,
        status: "draft",
        updatedBy: ctx.user.id,
      }).where(eq(pages.id, input.pageId));

      await writeAuditLog({
        actorUserId: ctx.user.id,
        action: "studio.sync.pushSnapshot",
        resourceType: "page",
        resourceId: input.pageId,
        after: { revisionId: newRevisionId, label: input.label ?? null },
        ipAddress: ctx.req.ip ?? null,
        userAgent: typeof ctx.req.headers["user-agent"] === "string" ? ctx.req.headers["user-agent"] : null,
        clientType: "desktop-studio",
      });

      return {
        success: true,
        conflict: false,
        revisionId: newRevisionId,
      };
    }),
});
