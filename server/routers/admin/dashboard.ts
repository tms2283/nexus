import { sql } from "drizzle-orm";
import { router } from "../../_core/trpc";
import { permissionProcedure } from "../../_core/trpc";
import { getDb } from "../../db";
import { aiRequests, auditLogs, pageRevisions, pages } from "../../../drizzle/schema";

export const adminDashboardRouter = router({
  summary: permissionProcedure("analytics.read").query(async () => {
    const db = await getDb();
    if (!db) {
      return {
        pages: { total: 0, published: 0, drafts: 0 },
        revisions: 0,
        ai: { requests24h: 0, errorRate24h: 0, p95LatencyMs24h: 0 },
        auditEvents24h: 0,
      };
    }

    const [{ totalPages = 0, publishedPages = 0, draftPages = 0 }] = await db
      .select({
        totalPages: sql<number>`count(*)`,
        publishedPages: sql<number>`sum(case when ${pages.status} = 'published' then 1 else 0 end)`,
        draftPages: sql<number>`sum(case when ${pages.status} in ('draft','staged') then 1 else 0 end)`,
      })
      .from(pages);

    const [{ count = 0 }] = await db.select({ count: sql<number>`count(*)` }).from(pageRevisions);

    const [aiRow] = (await db.execute(sql<{
      requests24h: number;
      errors24h: number;
      avgLatencyMs24h: number;
    }[]>`
      select
        count(*) as requests24h,
        sum(case when status = 'error' then 1 else 0 end) as errors24h,
        ifnull(cast(avg(latencyMs) as signed), 0) as avgLatencyMs24h
      from ai_requests
      where finishedAt >= now() - interval 1 day
    `)) as unknown as Array<{ requests24h: number; errors24h: number; avgLatencyMs24h: number }>;

    const [{ count: auditEvents24h = 0 }] = (await db.execute(sql<{ count: number }[]>`
      select count(*) as count
      from audit_logs
      where createdAt >= now() - interval 1 day
    `)) as unknown as Array<{ count: number }>;

    const requests24h = Number(aiRow?.requests24h ?? 0);
    const errors24h = Number(aiRow?.errors24h ?? 0);
    const p95LatencyMs24h = Number(aiRow?.avgLatencyMs24h ?? 0);

    return {
      pages: { total: Number(totalPages), published: Number(publishedPages), drafts: Number(draftPages) },
      revisions: Number(count),
      ai: {
        requests24h,
        errorRate24h: requests24h > 0 ? Number(((errors24h / requests24h) * 100).toFixed(2)) : 0,
        p95LatencyMs24h,
      },
      auditEvents24h: Number(auditEvents24h),
    };
  }),

  health: permissionProcedure("system.health.read").query(async () => {
    const db = await getDb();
    let dbOk = false;
    try {
      if (db) {
        await db.select({ one: sql<number>`1` });
        dbOk = true;
      }
    } catch {
      dbOk = false;
    }

    return {
      database: dbOk ? "healthy" : "down",
      api: "healthy",
      generatedAt: new Date(),
    };
  }),
});
