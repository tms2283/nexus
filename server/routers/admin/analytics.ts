import { desc, sql } from "drizzle-orm";
import { eventMetrics, pageViews } from "../../../drizzle/schema";
import { permissionProcedure, router } from "../../_core/trpc";
import { getDb } from "../../db";

export const adminAnalyticsRouter = router({
  trafficSummary: permissionProcedure("analytics.read").query(async () => {
    const db = await getDb();
    if (!db) return { views24h: 0, topPaths: [], latestMetrics: [] };

    const [viewsRow] = (await db.execute(sql<{ views24h: number }[]>`
      select count(*) as views24h
      from page_views
      where viewedAt >= now() - interval 1 day
    `)) as unknown as Array<{ views24h: number }>;

    const topPaths = (await db.execute(sql<{ path: string; hits: number }[]>`
      select path, count(*) as hits
      from page_views
      where viewedAt >= now() - interval 1 day
      group by path
      order by hits desc
      limit 10
    `)) as unknown as Array<{ path: string; hits: number }>;

    const latestMetrics = await db.select().from(eventMetrics).orderBy(desc(eventMetrics.measuredAt)).limit(50);
    return {
      views24h: Number(viewsRow?.views24h ?? 0),
      topPaths,
      latestMetrics,
    };
  }),
});
