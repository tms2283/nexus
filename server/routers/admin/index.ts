import { router } from "../../_core/trpc";
import { adminAiRouter } from "./ai";
import { adminAnalyticsRouter } from "./analytics";
import { adminAuditRouter } from "./audit";
import { adminDashboardRouter } from "./dashboard";
import { adminPagesRouter } from "./pages";
import { adminResearchRouter } from "./research";
import { adminSystemRouter } from "./system";
import { adminUsersRouter } from "./users";
import { adminVariantsRouter } from "./variants";

export const adminRouter = router({
  dashboard: adminDashboardRouter,
  pages: adminPagesRouter,
  variants: adminVariantsRouter,
  users: adminUsersRouter,
  research: adminResearchRouter,
  ai: adminAiRouter,
  analytics: adminAnalyticsRouter,
  audit: adminAuditRouter,
  system: adminSystemRouter,
});
