import { systemRouter } from "../_core/systemRouter";
import { router } from "../_core/trpc";

import { authRouter } from "./auth";
import { visitorRouter } from "./visitor";
import { aiRouter } from "./ai";
import { researchRouter } from "./research";
import { flashcardsRouter } from "./flashcards";
import { mindmapRouter } from "./mindmap";
import { labRouter } from "./lab";
import { libraryRouter } from "./library";
import { testingRouter } from "./testing";
import { lessonRouter } from "./lesson";
import { foundationRouter } from "./foundation";
import { leaderboardRouter, dashboardRouter } from "./dashboard";
import { contactRouter, codexRouter, aiProviderRouter, dailyRouter } from "./misc";
import { skillsRouter } from "./skills";
import { adminRouter } from "./admin";
import { studioRouter } from "./studio";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  visitor: visitorRouter,
  ai: aiRouter,
  research: researchRouter,
  flashcards: flashcardsRouter,
  mindmap: mindmapRouter,
  lab: labRouter,
  library: libraryRouter,
  testing: testingRouter,
  lesson: lessonRouter,
  foundation: foundationRouter,
  leaderboard: leaderboardRouter,
  dashboard: dashboardRouter,
  contact: contactRouter,
  codex: codexRouter,
  aiProvider: aiProviderRouter,
  daily: dailyRouter,
  skills: skillsRouter,
  admin: adminRouter,
  studio: studioRouter,
});

export type AppRouter = typeof appRouter;
