import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { systemRouter } from "../_core/systemRouter";
import { publicProcedure, router } from "../_core/trpc";

import { visitorRouter } from "./visitor";
import { aiRouter } from "./ai";
import { researchRouter } from "./research";
import { flashcardsRouter } from "./flashcards";
import { mindmapRouter } from "./mindmap";
import { labRouter } from "./lab";
import { libraryRouter } from "./library";
import { testingRouter } from "./testing";
import { lessonRouter } from "./lesson";
import { leaderboardRouter, dashboardRouter } from "./dashboard";
import { contactRouter, codexRouter, aiProviderRouter, dailyRouter } from "./misc";
import { skillsRouter } from "./skills";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  visitor: visitorRouter,
  ai: aiRouter,
  research: researchRouter,
  flashcards: flashcardsRouter,
  mindmap: mindmapRouter,
  lab: labRouter,
  library: libraryRouter,
  testing: testingRouter,
  lesson: lessonRouter,
  leaderboard: leaderboardRouter,
  dashboard: dashboardRouter,
  contact: contactRouter,
  codex: codexRouter,
  aiProvider: aiProviderRouter,
  daily: dailyRouter,
  skills: skillsRouter,
});

export type AppRouter = typeof appRouter;
