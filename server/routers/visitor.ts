import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getOrCreateVisitorProfile, recordPageVisit, addXP, updateVisitorProfile } from "../db";

export const visitorRouter = router({
  getProfile: publicProcedure
    .input(z.object({ cookieId: z.string() }))
    .query(async ({ input }) => getOrCreateVisitorProfile(input.cookieId)),

  recordVisit: publicProcedure
    .input(z.object({ cookieId: z.string(), page: z.string() }))
    .mutation(async ({ input }) => recordPageVisit(input.cookieId, input.page)),

  addXP: publicProcedure
    .input(z.object({ cookieId: z.string(), amount: z.number().positive() }))
    .mutation(async ({ input }) => addXP(input.cookieId, input.amount)),

  updateInterests: publicProcedure
    .input(z.object({ cookieId: z.string(), interests: z.array(z.string()) }))
    .mutation(async ({ input }) => {
      await updateVisitorProfile(input.cookieId, { interests: input.interests });
      return { success: true };
    }),

  completeQuiz: publicProcedure
    .input(z.object({
      cookieId: z.string(),
      results: z.record(z.string(), z.string()),
      preferredTopics: z.array(z.string()),
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
