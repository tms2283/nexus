import { getAIProviderSettings } from "../db";
import { invokeAI, type AIProvider } from "../aiProvider";
import { TRPCError } from "@trpc/server";

// ─── Rate limiting (in-memory, per cookieId) ─────────────────────────────────
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 120; // 120 individual LLM invocations per cookieId per hour

export function checkRateLimit(cookieId: string): void {
  const now = Date.now();
  const entry = rateLimitMap.get(cookieId);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(cookieId, { count: 1, windowStart: now });
    return;
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "You've sent a lot of AI requests this hour. Please wait a few minutes before trying again.",
    });
  }
  entry.count++;
}

// Clean up old entries every hour to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of rateLimitMap.entries()) {
    if (now - val.windowStart > RATE_LIMIT_WINDOW_MS) rateLimitMap.delete(key);
  }
}, RATE_LIMIT_WINDOW_MS);

// ─── Provider config ──────────────────────────────────────────────────────────
export async function getProviderConfig(cookieId?: string) {
  if (cookieId) {
    const s = await getAIProviderSettings(cookieId);
    if (s) return { provider: s.provider as AIProvider, apiKey: s.apiKey ?? null, model: s.model ?? null };
  }
  return { provider: "builtin" as AIProvider, apiKey: null, model: null };
}

// ─── AI call helpers ──────────────────────────────────────────────────────────
export async function callAI(
  cookieId: string | undefined,
  prompt: string,
  systemPrompt?: string,
  maxTokens = 1024
): Promise<string> {
  if (cookieId) checkRateLimit(cookieId);
  const config = await getProviderConfig(cookieId);
  return invokeAI(config, {
    messages: [
      ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
      { role: "user" as const, content: prompt },
    ],
    maxTokens,
  });
}

export async function callAIChat(
  cookieId: string | undefined,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  systemPrompt: string
): Promise<string> {
  if (cookieId) checkRateLimit(cookieId);
  const config = await getProviderConfig(cookieId);
  return invokeAI(config, {
    messages: [{ role: "system" as const, content: systemPrompt }, ...messages],
    maxTokens: 1024,
  });
}

export const NEXUS_SYSTEM_PROMPT = `You are the AI assistant for Nexus — an AI-powered learning and research platform built by Tim Schmoyer (Fredericksburg, VA). You are knowledgeable, articulate, and intellectually engaging.

About Nexus: Adaptive Curriculum Generator, Research Forge, Depth Engine (5-level explainer), Lab, Library, Mind Maps, Flashcards.
Built with React, TypeScript, tRPC, multi-provider AI (Gemini, Perplexity, OpenAI).
Philosophy: Learning should be adaptive, Socratic, and deeply personalized.

Your role: Help users navigate the platform, answer learning questions, suggest features, keep responses concise but substantive.`;
