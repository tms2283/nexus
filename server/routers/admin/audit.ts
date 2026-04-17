import { and, desc, eq, gte } from "drizzle-orm";
import { z } from "zod";
import { auditLogs } from "../../../drizzle/schema";
import { permissionProcedure, router } from "../../_core/trpc";
import { getDb } from "../../db";

export const adminAuditRouter = router({
  list: permissionProcedure("audit.read")
    .input(
      z.object({
        action: z.string().optional(),
        resourceType: z.string().optional(),
        sinceIso: z.string().datetime().optional(),
        limit: z.number().int().min(1).max(500).default(100),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const filters = [];
      if (input?.action) filters.push(eq(auditLogs.action, input.action));
      if (input?.resourceType) filters.push(eq(auditLogs.resourceType, input.resourceType));
      if (input?.sinceIso) filters.push(gte(auditLogs.createdAt, new Date(input.sinceIso)));

      const query = db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(input?.limit ?? 100);
      if (filters.length === 0) return query;
      if (filters.length === 1) return db.select().from(auditLogs).where(filters[0]).orderBy(desc(auditLogs.createdAt)).limit(input?.limit ?? 100);
      return db.select().from(auditLogs).where(and(...filters)).orderBy(desc(auditLogs.createdAt)).limit(input?.limit ?? 100);
    }),
});
