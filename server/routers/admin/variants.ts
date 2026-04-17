import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import { pageSections, pageVariants } from "../../../drizzle/schema";
import { permissionProcedure, router } from "../../_core/trpc";
import { getDb } from "../../db";
import { writeAuditLog } from "../../services/auditing";
import { TRPCError } from "@trpc/server";

export const adminVariantsRouter = router({
  listByPage: permissionProcedure("content.read")
    .input(z.object({ pageId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(pageVariants).where(eq(pageVariants.pageId, input.pageId)).orderBy(desc(pageVariants.updatedAt));
    }),

  createFromPage: permissionProcedure("content.write")
    .input(z.object({
      pageId: z.number().int().positive(),
      name: z.string().min(1).max(255),
      hypothesis: z.string().max(1000).optional(),
      commentary: z.string().max(3000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const inserted = await db.insert(pageVariants).values({
        pageId: input.pageId,
        name: input.name,
        status: "candidate",
        hypothesis: input.hypothesis ?? null,
        commentary: input.commentary ?? null,
        createdBy: ctx.user.id,
      });
      const variantId = Number(inserted[0].insertId);

      const baseSections = await db
        .select()
        .from(pageSections)
        .where(and(eq(pageSections.pageId, input.pageId), isNull(pageSections.variantId)))
        .orderBy(asc(pageSections.position));

      if (baseSections.length > 0) {
        await db.insert(pageSections).values(
          baseSections.map((s) => ({
            pageId: s.pageId,
            variantId,
            type: s.type,
            position: s.position,
            contentJson: s.contentJson ?? {},
            settingsJson: s.settingsJson ?? {},
            isVisible: s.isVisible,
          }))
        );
      }

      await writeAuditLog({
        actorUserId: ctx.user.id,
        action: "variants.createFromPage",
        resourceType: "page_variant",
        resourceId: variantId,
        after: { pageId: input.pageId, name: input.name },
        ipAddress: ctx.req.ip ?? null,
        userAgent: typeof ctx.req.headers["user-agent"] === "string" ? ctx.req.headers["user-agent"] : null,
        clientType: "web-admin",
      });

      return { variantId };
    }),

  compare: permissionProcedure("content.read")
    .input(z.object({
      leftVariantId: z.number().int().positive(),
      rightVariantId: z.number().int().positive(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const [leftVariant, rightVariant] = await db
        .select()
        .from(pageVariants)
        .where(inArray(pageVariants.id, [input.leftVariantId, input.rightVariantId]));

      const leftSections = await db
        .select()
        .from(pageSections)
        .where(eq(pageSections.variantId, input.leftVariantId))
        .orderBy(asc(pageSections.position));

      const rightSections = await db
        .select()
        .from(pageSections)
        .where(eq(pageSections.variantId, input.rightVariantId))
        .orderBy(asc(pageSections.position));

      return {
        left: { variant: leftVariant ?? null, sections: leftSections },
        right: { variant: rightVariant ?? null, sections: rightSections },
      };
    }),
});
