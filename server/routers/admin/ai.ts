import { desc, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { aiRequests } from "../../../drizzle/schema";
import { invokeAI } from "../../aiProvider";
import { permissionProcedure, router } from "../../_core/trpc";
import { getDb } from "../../db";
import { logAiRequest, logProviderHealthCheck } from "../../services/aiObservability";
import { TRPCError } from "@trpc/server";

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

function estimateCostUsd(provider: string, inputTokens: number, outputTokens: number): number {
  // Conservative placeholder for dashboard trend visibility
  const perThousand = provider === "perplexity" ? 0.008 : 0.004;
  return Number((((inputTokens + outputTokens) / 1000) * perThousand).toFixed(6));
}

export const adminAiRouter = router({
  getRequestMetrics: permissionProcedure("ai.read").query(async () => {
    const db = await getDb();
    if (!db) return { total24h: 0, successRate24h: 0, avgLatencyMs24h: 0, totalEstimatedCostUsd24h: 0 };

    const [row] = (await db.execute(sql<{
      total24h: number;
      success24h: number;
      avgLatencyMs24h: number;
      totalEstimatedCostUsd24h: number;
    }[]>`
      select
        count(*) as total24h,
        sum(case when status = 'success' then 1 else 0 end) as success24h,
        ifnull(cast(avg(latencyMs) as signed), 0) as avgLatencyMs24h,
        ifnull(sum(estimatedCostUsd), 0) as totalEstimatedCostUsd24h
      from ai_requests
      where finishedAt >= now() - interval 1 day
    `)) as unknown as Array<{ total24h: number; success24h: number; avgLatencyMs24h: number; totalEstimatedCostUsd24h: number }>;

    const total = Number(row?.total24h ?? 0);
    const success = Number(row?.success24h ?? 0);
    return {
      total24h: total,
      successRate24h: total > 0 ? Number(((success / total) * 100).toFixed(2)) : 0,
      avgLatencyMs24h: Number(row?.avgLatencyMs24h ?? 0),
      totalEstimatedCostUsd24h: Number(row?.totalEstimatedCostUsd24h ?? 0),
    };
  }),

  listRecentRequests: permissionProcedure("ai.read")
    .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(aiRequests).orderBy(desc(aiRequests.finishedAt)).limit(input?.limit ?? 50);
    }),

  runProviderTest: permissionProcedure("ai.providers.test")
    .input(z.object({
      provider: z.enum(["builtin", "gemini", "perplexity"]),
      model: z.string().min(1).max(128),
      apiKey: z.string().optional(),
      prompt: z.string().min(1).max(2000).default("Return a short one-line health response."),
    }))
    .mutation(async ({ ctx, input }) => {
      const start = new Date();
      const requestId = `ai-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const inputTokens = estimateTokens(input.prompt);
      try {
        const text = await invokeAI(
          { provider: input.provider, model: input.model, apiKey: input.apiKey },
          { messages: [{ role: "user", content: input.prompt }], maxTokens: 500 }
        );
        const end = new Date();
        const outputTokens = estimateTokens(text);
        const latencyMs = end.getTime() - start.getTime();
        const estimatedCostUsd = estimateCostUsd(input.provider, inputTokens, outputTokens);

        await logAiRequest({
          requestId,
          userId: ctx.user.id,
          feature: "admin.ai.runProviderTest",
          provider: input.provider,
          model: input.model,
          status: "success",
          latencyMs,
          inputTokens,
          outputTokens,
          estimatedCostUsd,
          startedAt: start,
          finishedAt: end,
        });
        await logProviderHealthCheck({
          provider: input.provider,
          model: input.model,
          status: "healthy",
          latencyMs,
        });
        return { ok: true, requestId, response: text, latencyMs, estimatedCostUsd };
      } catch (error) {
        const end = new Date();
        const latencyMs = end.getTime() - start.getTime();
        const message = error instanceof Error ? error.message : String(error);
        await logAiRequest({
          requestId,
          userId: ctx.user.id,
          feature: "admin.ai.runProviderTest",
          provider: input.provider,
          model: input.model,
          status: "error",
          latencyMs,
          inputTokens,
          outputTokens: 0,
          estimatedCostUsd: 0,
          errorType: "provider_test_error",
          errorMessage: message,
          startedAt: start,
          finishedAt: end,
        });
        await logProviderHealthCheck({
          provider: input.provider,
          model: input.model,
          status: "down",
          latencyMs,
          errorMessage: message,
        });
        throw new TRPCError({ code: "BAD_REQUEST", message });
      }
    }),
});
