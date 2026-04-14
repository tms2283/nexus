import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getLibraryResources, getDb, addXP } from "../db";
import { callAI } from "./shared";
import { libraryResources, readingList } from "../../drizzle/schema";
import { eq, desc, isNotNull, sql, and } from "drizzle-orm";

export const libraryRouter = router({
  list: publicProcedure
    .input(z.object({ category: z.string().optional(), search: z.string().optional() }))
    .query(async ({ input }) => getLibraryResources(input.category, input.search)),

  searchLibrary: publicProcedure
    .input(z.object({ cookieId: z.string().optional(), query: z.string().max(500) }))
    .mutation(async ({ input }) => {
      const resources = await getLibraryResources(undefined, input.query);
      if (resources.length === 0) return { results: [], aiSummary: null };
      const resourceList = resources.slice(0, 5).map(r => `- ${r.title}: ${r.description}`).join("\n");
      let aiSummary: string | null = null;
      try {
        aiSummary = await callAI(input.cookieId, `A user searched for "${input.query}". Resources found:\n${resourceList}\n\nWrite a 2-3 sentence synthesis explaining how these relate to the query.`);
      } catch (_e) { /* AI unavailable, return results without summary */ }
      return { results: resources, aiSummary };
    }),

  contribute: publicProcedure
    .input(z.object({
      cookieId: z.string(), title: z.string().min(3).max(200), url: z.string().url(),
      description: z.string().min(10).max(1000), category: z.string(),
      tags: z.array(z.string()).max(8), type: z.enum(["article", "video", "course", "tool", "paper", "book", "repo"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      const existing = await db.select().from(libraryResources).where(eq(libraryResources.url, input.url)).limit(1);
      if (existing.length > 0) throw new TRPCError({ code: "CONFLICT", message: "This resource is already in the Library." });
      await db.insert(libraryResources).values({ title: input.title, url: input.url, description: input.description, category: input.category, tags: input.tags, type: input.type, featured: false, contributedBy: input.cookieId });
      const xpResult = await addXP(input.cookieId, 50);
      return { success: true, message: "Resource added to the Library! +50 XP", ...xpResult };
    }),

  rateResource: publicProcedure
    .input(z.object({ resourceId: z.number().int().positive(), rating: z.number().int().min(1).max(5) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.update(libraryResources).set({ ratingSum: sql`ratingSum + ${input.rating}`, ratingCount: sql`ratingCount + 1` }).where(eq(libraryResources.id, input.resourceId));
      return { success: true };
    }),

  trackView: publicProcedure
    .input(z.object({ resourceId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.update(libraryResources).set({ viewCount: sql`viewCount + 1` }).where(eq(libraryResources.id, input.resourceId));
      return { success: true };
    }),

  listCommunity: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(20), offset: z.number().int().min(0).default(0) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [] as (typeof libraryResources.$inferSelect)[], total: 0 };
      const items = await db.select().from(libraryResources).where(isNotNull(libraryResources.contributedBy)).orderBy(desc(libraryResources.addedAt)).limit(input.limit).offset(input.offset);
      const countResult = await db.select({ count: sql<number>`count(*)` }).from(libraryResources).where(isNotNull(libraryResources.contributedBy));
      return { items, total: Number(countResult[0]?.count ?? 0) };
    }),

  // ─── Reading list ────────────────────────────────────────────────────────
  getReadingList: publicProcedure
    .input(z.object({ cookieId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [] };
      const items = await db.select().from(readingList).where(eq(readingList.cookieId, input.cookieId)).orderBy(desc(readingList.addedAt));
      return { items };
    }),

  addToReadingList: publicProcedure
    .input(z.object({ cookieId: z.string(), resourceId: z.number().optional(), url: z.string().optional(), title: z.string(), description: z.string().optional(), category: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      // Prevent duplicates: check by resourceId if provided, otherwise by url+cookieId
      if (input.resourceId) {
        const existing = await db.select({ id: readingList.id }).from(readingList)
          .where(and(eq(readingList.cookieId, input.cookieId), eq(readingList.resourceId, input.resourceId))).limit(1);
        if (existing.length > 0) return { success: true, alreadyExists: true };
      } else if (input.url) {
        const existing = await db.select({ id: readingList.id }).from(readingList)
          .where(and(eq(readingList.cookieId, input.cookieId), eq(readingList.url, input.url))).limit(1);
        if (existing.length > 0) return { success: true, alreadyExists: true };
      }
      await db.insert(readingList).values({ cookieId: input.cookieId, resourceId: input.resourceId, url: input.url, title: input.title, description: input.description, category: input.category });
      return { success: true };
    }),

  markRead: publicProcedure
    .input(z.object({ id: z.number(), cookieId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      await db.update(readingList)
        .set({ isRead: true, status: "finished" })
        .where(and(eq(readingList.id, input.id), eq(readingList.cookieId, input.cookieId)));
      await addXP(input.cookieId, 5);
      return { success: true };
    }),

  moveToStatus: publicProcedure
    .input(z.object({
      id: z.number(),
      cookieId: z.string(),
      status: z.enum(["want", "reading", "finished"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      const isRead = input.status === "finished";
      await db.update(readingList)
        .set({ status: input.status, isRead })
        .where(and(eq(readingList.id, input.id), eq(readingList.cookieId, input.cookieId)));
      if (isRead) await addXP(input.cookieId, 5);
      return { success: true };
    }),

  removeFromReadingList: publicProcedure
    .input(z.object({ id: z.number(), cookieId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) return { success: false };
      // Ownership check: only delete items belonging to this cookieId
      await db.delete(readingList)
        .where(and(eq(readingList.id, input.id), eq(readingList.cookieId, input.cookieId)));
      return { success: true };
    }),
});
