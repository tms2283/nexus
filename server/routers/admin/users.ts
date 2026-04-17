import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { roleAssignments, userPsychProfiles, users } from "../../../drizzle/schema";
import { adminProcedure, permissionProcedure, router } from "../../_core/trpc";
import { getDb } from "../../db";
import { setSinglePrimaryRole } from "../../permissions/rbac";
import { writeAuditLog } from "../../services/auditing";
import { TRPCError } from "@trpc/server";

export const adminUsersRouter = router({
  list: adminProcedure
    .input(z.object({ search: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const search = input?.search?.trim();
      const rows = search
        ? await db
            .select()
            .from(users)
            .where(sql`${users.email} like ${`%${search}%`} or ${users.name} like ${`%${search}%`}`)
            .orderBy(desc(users.updatedAt))
        : await db.select().from(users).orderBy(desc(users.updatedAt));

      if (rows.length === 0) return [];

      const userIds = rows.map(row => row.id);
      const psychRows = await db
        .select()
        .from(userPsychProfiles)
        .where(inArray(userPsychProfiles.userId, userIds));

      const psychByUserId = new Map(psychRows.map(row => [row.userId, row]));

      return rows.map(({ passwordHash: _passwordHash, ...safe }) => ({
        user: safe,
        psychProfile: psychByUserId.get(safe.id) ?? null,
      }));
    }),

  getById: adminProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const userRows = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (userRows.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      const psychRows = await db.select().from(userPsychProfiles).where(eq(userPsychProfiles.userId, input.userId)).limit(1);
      const assignments = await db.select().from(roleAssignments).where(eq(roleAssignments.userId, input.userId)).orderBy(asc(roleAssignments.createdAt));
      const { passwordHash: _passwordHash, ...safe } = userRows[0];
      return { user: safe, psychProfile: psychRows[0] ?? null, roleAssignments: assignments };
    }),

  setRole: permissionProcedure("users.roles.manage")
    .input(z.object({
      userId: z.number().int().positive(),
      role: z.enum(["owner", "admin", "editor", "analyst", "support"]),
    }))
    .mutation(async ({ ctx, input }) => {
      await setSinglePrimaryRole(input.userId, input.role, ctx.user.id);
      await writeAuditLog({
        actorUserId: ctx.user.id,
        action: "users.roles.set",
        resourceType: "user",
        resourceId: input.userId,
        after: { role: input.role },
        ipAddress: ctx.req.ip ?? null,
        userAgent: typeof ctx.req.headers["user-agent"] === "string" ? ctx.req.headers["user-agent"] : null,
        clientType: "web-admin",
      });
      return { success: true };
    }),
});
