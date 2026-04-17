import { and, desc, eq, gte, like, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { researchSessions } from "../../../drizzle/schema";
import { permissionProcedure, router } from "../../_core/trpc";
import { getDb } from "../../db";

export const adminResearchRouter = router({
  list: permissionProcedure("research.read")
    .input(
      z.object({
        userId: z.number().int().positive().optional(),
        status: z.string().optional(),
        query: z.string().optional(),
        dateFrom: z.string().datetime().optional(),
        dateTo: z.string().datetime().optional(),
        limit: z.number().int().min(1).max(200).default(100),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const filters = [];
      if (input?.userId) filters.push(eq(researchSessions.userId, input.userId));
      if (input?.query) filters.push(like(researchSessions.title, `%${input.query}%`));
      if (input?.dateFrom) filters.push(gte(researchSessions.createdAt, new Date(input.dateFrom)));
      if (input?.dateTo) filters.push(lte(researchSessions.createdAt, new Date(input.dateTo)));

      if (filters.length === 0) {
        return db.select().from(researchSessions).orderBy(desc(researchSessions.createdAt)).limit(input?.limit ?? 100);
      }
      return db.select().from(researchSessions).where(and(...filters)).orderBy(desc(researchSessions.createdAt)).limit(input?.limit ?? 100);
    }),
});
