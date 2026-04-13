import { z } from "zod";
import { nanoid } from "nanoid";
import { publicProcedure, visitorProcedure, router } from "../_core/trpc";
import {
  getOrCreateVisitorProfile,
  recordPageVisit,
  addXP,
  updateVisitorProfile,
} from "../db";
import { VISITOR_COOKIE_NAME } from "@shared/const";

function getVisitorId(ctx: { visitorCookieId: string | null }): string {
  if (!ctx.visitorCookieId) {
    throw new Error("Visitor cookie not set");
  }
  return ctx.visitorCookieId;
}

export const visitorRouter = router({
  // Public endpoint to initialize/refresh visitor cookie
  init: publicProcedure
    .input(z.object({ cookieId: z.string().min(20).max(30).optional() }))
    .mutation(async ({ input, ctx }) => {
      // Use provided cookieId or generate new one
      const cookieId = input.cookieId || nanoid(24);

      // Set the visitor cookie server-side
      const cookieOptions = {
        httpOnly: true,
        path: "/",
        sameSite: "lax" as const,
        secure: ctx.req.protocol === "https",
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      };
      ctx.res.cookie(VISITOR_COOKIE_NAME, cookieId, cookieOptions);

      // Ensure visitor profile exists
      await getOrCreateVisitorProfile(cookieId);

      return { cookieId };
    }),

  getProfile: visitorProcedure.query(async ({ ctx }) =>
    getOrCreateVisitorProfile(getVisitorId(ctx))
  ),

  recordVisit: visitorProcedure
    .input(z.object({ page: z.string() }))
    .mutation(async ({ input, ctx }) =>
      recordPageVisit(getVisitorId(ctx), input.page)
    ),

  addXP: visitorProcedure
    .input(z.object({ amount: z.number().positive() }))
    .mutation(async ({ input, ctx }) => addXP(getVisitorId(ctx), input.amount)),

  updateInterests: visitorProcedure
    .input(z.object({ interests: z.array(z.string()) }))
    .mutation(async ({ input, ctx }) => {
      await updateVisitorProfile(getVisitorId(ctx), {
        interests: input.interests,
      });
      return { success: true };
    }),

  completeQuiz: visitorProcedure
    .input(
      z.object({
        results: z.record(z.string(), z.string()),
        preferredTopics: z.array(z.string()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await updateVisitorProfile(getVisitorId(ctx), {
        quizCompleted: true,
        quizResults: input.results,
        preferredTopics: input.preferredTopics,
      });
      const xpResult = await addXP(getVisitorId(ctx), 50);
      return { success: true, ...xpResult };
    }),
});
