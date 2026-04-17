import { sql } from "drizzle-orm";
import { permissionProcedure, router } from "../../_core/trpc";
import { getDb } from "../../db";

export const adminSystemRouter = router({
  health: permissionProcedure("system.health.read").query(async () => {
    const db = await getDb();
    let database = "down";
    try {
      if (db) {
        await db.execute(sql`select 1`);
        database = "healthy";
      }
    } catch {
      database = "down";
    }
    return {
      database,
      api: "healthy",
      generatedAt: new Date(),
    };
  }),
});
