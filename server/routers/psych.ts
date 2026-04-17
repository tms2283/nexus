import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { recordPsychSignalAndRefresh } from "../services/personalityAnalyzer";

export const psychRouter = router({
  recordTypingSummary: protectedProcedure
    .input(z.object({
      path: z.string().max(512),
      focusSeconds: z.number().min(0).max(3600),
      keystrokes: z.number().min(0).max(10000),
      backspaces: z.number().min(0).max(5000),
      pauseCount: z.number().min(0).max(1000),
      averageBurstLength: z.number().min(0).max(500),
      activeFieldCount: z.number().min(0).max(250),
    }))
    .mutation(async ({ ctx, input }) => {
      const backspaceRate =
        input.keystrokes > 0 ? input.backspaces / input.keystrokes : 0;

      await recordPsychSignalAndRefresh(ctx.user.id, {
        source: "behavior",
        signalType: "typing.summary",
        path: input.path,
        metrics: {
          focusSeconds: input.focusSeconds,
          keystrokes: input.keystrokes,
          backspaces: input.backspaces,
          backspaceRate,
          pauseCount: input.pauseCount,
          averageBurstLength: input.averageBurstLength,
          activeFieldCount: input.activeFieldCount,
        },
      });

      return { success: true };
    }),
});
