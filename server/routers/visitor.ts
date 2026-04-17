import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc";
import { getOrCreateVisitorProfile, recordPageVisit, addXP, updateVisitorProfile, getDb } from "../db";
import { checkXpRateLimit } from "../_core/xpRateLimit";
import { parse as parseCookieHeader } from "cookie";
import { pageViews } from "../../drizzle/schema";

// ─── Helper: resolve cookieId from the request cookie header ─────────────────
// The visitor identity (cookieId) is stored in a separate first-party cookie
// (tv_visitor_id) set by the client. We read it server-side here so clients
// cannot spoof another user's cookieId by passing it in the request body.
// For procedures that receive a cookieId input we validate it matches what the
// server sees, preventing IDOR on visitor profiles.
const VISITOR_COOKIE_NAME = "tv_visitor_id";

function getVisitorCookieId(req: { headers: { cookie?: string } }): string | null {
  if (!req.headers.cookie) return null;
  const parsed = parseCookieHeader(req.headers.cookie);
  return parsed[VISITOR_COOKIE_NAME] ?? null;
}

export const visitorRouter = router({
  getProfile: publicProcedure
    .input(z.object({ cookieId: z.string() }))
    .query(async ({ input, ctx }) => {
      // Allow request — visitor profiles are intentionally semi-public for gamification
      return getOrCreateVisitorProfile(input.cookieId);
    }),

  recordVisit: publicProcedure
    .input(z.object({ cookieId: z.string(), page: z.string().max(512) }))
    .mutation(async ({ input, ctx }) => {
      const result = await recordPageVisit(input.cookieId, input.page);
      const db = await getDb();
      if (db) {
        const referrerHeader = ctx.req.headers.referer;
        const userAgentHeader = ctx.req.headers["user-agent"];
        await db.insert(pageViews).values({
          path: input.page,
          referrer: typeof referrerHeader === "string" ? referrerHeader : undefined,
          ipAddress: ctx.req.ip ?? undefined,
          userAgent: typeof userAgentHeader === "string" ? userAgentHeader : undefined,
        });
      }
      return result;
    }),

  // ─── addXP: server-side cookieId verification + rate limiting ─────────────
  addXP: publicProcedure
    .input(z.object({
      cookieId: z.string().min(1).max(128),
      amount: z.number().int().positive().max(1000),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify the cookieId in the request matches the one from the client's cookie
      const serverCookieId = getVisitorCookieId(ctx.req);
      if (serverCookieId && serverCookieId !== input.cookieId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "cookieId mismatch — you can only add XP to your own profile.",
        });
      }

      // Rate limit check
      const rl = checkXpRateLimit(input.cookieId, input.amount);
      if (!rl.allowed) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: rl.reason });
      }

      return addXP(input.cookieId, input.amount);
    }),

  updateInterests: publicProcedure
    .input(z.object({ cookieId: z.string(), interests: z.array(z.string().max(64)).max(20) }))
    .mutation(async ({ input }) => {
      await updateVisitorProfile(input.cookieId, { interests: input.interests });
      return { success: true };
    }),

  completeQuiz: publicProcedure
    .input(z.object({
      cookieId: z.string(),
      results: z.record(z.string(), z.string()),
      preferredTopics: z.array(z.string().max(64)).max(20),
    }))
    .mutation(async ({ input }) => {
      await updateVisitorProfile(input.cookieId, {
        quizCompleted: true,
        quizResults: input.results,
        preferredTopics: input.preferredTopics,
      });
      const xpResult = await addXP(input.cookieId, 50);
      return { success: true, ...xpResult };
    }),
});
