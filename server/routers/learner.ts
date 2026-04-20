import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getLearnerProfile, getDefaultProfile } from "../services/learnerProfileService";

export const learnerRouter = router({
  /**
   * Returns the canonical LearnerProfile for the caller. Public — guests get
   * the default profile keyed by cookieId; authenticated users get their
   * full inferred profile.
   */
  getProfile: publicProcedure
    .input(z.object({ cookieId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const userId = ctx.user?.id;
      if (userId) return getLearnerProfile(userId);
      return getDefaultProfile(null, input?.cookieId ?? null);
    }),

  /**
   * Records a confidence-calibrated retrieval attempt. Used by the
   * calibration loop to refine recentAccuracy and calibrationGap.
   */
  recordRetrievalAttempt: protectedProcedure
    .input(
      z.object({
        lessonId: z.string().max(64),
        itemId: z.string().max(128),
        correct: z.boolean(),
        confidence: z.number().int().min(1).max(5),
        tags: z.array(z.string().max(64)).max(20).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { recordPsychSignalAndRefresh } = await import(
        "../services/personalityAnalyzer"
      );
      await recordPsychSignalAndRefresh(ctx.user.id, {
        source: "lesson",
        signalType: "retrieval.attempt",
        topic: input.lessonId,
        metrics: {
          itemId: input.itemId,
          correct: input.correct,
          confidence: input.confidence,
          tags: input.tags ?? [],
        },
      });
      return { success: true };
    }),
});
