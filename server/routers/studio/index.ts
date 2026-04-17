import { router } from "../../_core/trpc";
import { studioSyncRouter } from "./sync";

export const studioRouter = router({
  sync: studioSyncRouter,
});
