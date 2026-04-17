import { aiRequests, providerHealthChecks } from "../../drizzle/schema";
import { getDb } from "../db";

export interface AiRequestWriteInput {
  requestId: string;
  userId?: number | null;
  feature: string;
  provider: string;
  model: string;
  status: "success" | "error";
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd?: number;
  errorType?: string | null;
  errorMessage?: string | null;
  startedAt: Date;
  finishedAt: Date;
}

export async function logAiRequest(input: AiRequestWriteInput): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(aiRequests).values({
    requestId: input.requestId,
    userId: input.userId ?? undefined,
    feature: input.feature,
    provider: input.provider,
    model: input.model,
    status: input.status,
    latencyMs: Math.max(0, Math.round(input.latencyMs)),
    inputTokens: input.inputTokens ?? 0,
    outputTokens: input.outputTokens ?? 0,
    estimatedCostUsd: input.estimatedCostUsd ?? 0,
    errorType: input.errorType ?? undefined,
    errorMessage: input.errorMessage ?? undefined,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
  });
}

export async function logProviderHealthCheck(input: {
  provider: string;
  model: string;
  status: "healthy" | "degraded" | "down";
  latencyMs?: number;
  errorMessage?: string | null;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(providerHealthChecks).values({
    provider: input.provider,
    model: input.model,
    status: input.status,
    latencyMs: input.latencyMs ?? undefined,
    errorMessage: input.errorMessage ?? undefined,
  });
}
