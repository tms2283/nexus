/**
 * aiProvider.ts — Unified AI provider layer for Nexus.
 *
 * DEFAULT: uses the platform's built-in invokeLLM (no quota/rate-limit issues).
 * OVERRIDE: when a user supplies their own API key in Settings, routes to
 *   Gemini, Perplexity, or OpenAI directly.
 *
 * Includes exponential-backoff retry for transient 429/5xx errors.
 */

import { invokeLLM } from "./_core/llm";
import { ENV } from "./_core/env";
import { getAIProviderSettings } from "./db";

// "builtin" = platform-managed LLM, no quota issues
export type AIProvider = "builtin" | "gemini" | "perplexity" | "openai";

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey?: string | null;
  model?: string | null;
}

export const DEFAULT_MODELS: Record<AIProvider, string> = {
  builtin: "gemini-2.5-flash",
  gemini: "gemini-2.0-flash-lite",
  perplexity: "llama-3.1-sonar-large-128k-online",
  openai: "gpt-4o-mini",
};

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMOptions {
  messages: LLMMessage[];
  maxTokens?: number;
  temperature?: number;
  responseFormat?: "text" | "json";
}

// ─── Retry helper ─────────────────────────────────────────────────────────────

async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 800
): Promise<T> {
  let lastError: Error = new Error("Unknown error");
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const isRateLimit =
        lastError.message.includes("429") ||
        lastError.message.includes("RESOURCE_EXHAUSTED");
      const isServerError =
        lastError.message.includes("500") ||
        lastError.message.includes("503");
      if ((!isRateLimit && !isServerError) || attempt === maxAttempts) break;
      const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 400;
      await new Promise(r => setTimeout(r, delay));
    }
  }
  // Humanise rate-limit errors before re-throwing
  if (
    lastError.message.includes("429") ||
    lastError.message.includes("RESOURCE_EXHAUSTED")
  ) {
    throw new Error(
      "The AI service is temporarily busy. Please wait a moment and try again, or switch to a different AI provider in Settings."
    );
  }
  throw lastError;
}

// ─── Provider resolution ──────────────────────────────────────────────────────

/**
 * Resolve the provider config for a given cookieId.
 * If the user has a stored custom provider+key, use that.
 * Otherwise fall back to the built-in platform LLM.
 */
export async function resolveProviderConfig(cookieId?: string): Promise<AIProviderConfig> {
  if (cookieId) {
    try {
      const stored = await getAIProviderSettings(cookieId);
      if (stored?.provider && stored?.apiKey) {
        return {
          provider: stored.provider as AIProvider,
          apiKey: stored.apiKey,
          model: stored.model ?? DEFAULT_MODELS[stored.provider as AIProvider],
        };
      }
    } catch {
      // DB unavailable — fall through to built-in
    }
  }
  return { provider: "builtin" };
}

// ─── Main invoke ──────────────────────────────────────────────────────────────

/**
 * Invoke AI with the given provider config and options.
 * Uses the built-in platform LLM by default (no quota issues).
 */
export async function invokeAI(
  config: AIProviderConfig,
  options: LLMOptions
): Promise<string> {
  const provider = config.provider || "builtin";

  switch (provider) {
    case "perplexity":
      if (!config.apiKey)
        throw new Error("Perplexity requires a user-supplied API key. Add it in Settings → AI Provider.");
      return withRetry(() =>
        invokePerplexity(config.apiKey!, config.model || DEFAULT_MODELS.perplexity, options)
      );

    case "openai":
      if (!config.apiKey)
        throw new Error("OpenAI requires a user-supplied API key. Add it in Settings → AI Provider.");
      return withRetry(() =>
        invokeOpenAI(config.apiKey!, config.model || DEFAULT_MODELS.openai, options)
      );

    case "gemini":
      // If user supplied their own Gemini key, use it directly
      if (config.apiKey) {
        return withRetry(() =>
          invokeGeminiDirect(config.apiKey!, config.model || DEFAULT_MODELS.gemini, options)
        );
      }
      // No user key — fall through to built-in (avoids free-tier quota issues)
      return withRetry(() => invokeBuiltin(options));

    case "builtin":
    default:
      // If a platform Forge key is configured, use it
      if (ENV.forgeApiKey) {
        return withRetry(() => invokeBuiltin(options));
      }
      // Fall back to Gemini if a GEMINI_API_KEY is set in the environment
      if (ENV.geminiApiKey) {
        return withRetry(() =>
          invokeGeminiDirect(ENV.geminiApiKey, DEFAULT_MODELS.gemini, options)
        );
      }
      throw new Error(
        "No AI provider configured. Please add a GEMINI_API_KEY to your environment, or set up a provider in Settings → AI Provider."
      );
  }
}

/**
 * Invoke AI for chat (multi-turn) with the given provider config.
 */
export async function invokeAIChat(
  config: AIProviderConfig,
  messages: LLMMessage[]
): Promise<string> {
  return invokeAI(config, { messages, maxTokens: 1024, temperature: 0.8 });
}

// ─── Built-in platform LLM (no quota issues) ─────────────────────────────────

async function invokeBuiltin(options: LLMOptions): Promise<string> {
  const result = await invokeLLM({
    messages: options.messages.map(m => ({
      role: m.role as "system" | "user" | "assistant",
      content: m.content as string,
    })),
  });
  const raw = result.choices?.[0]?.message?.content;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) {
    return (raw as Array<{ type: string; text?: string }>)
      .filter(c => c.type === "text")
      .map(c => c.text ?? "")
      .join("");
  }
  return "";
}

// ─── Direct Gemini REST (user-supplied key only) ──────────────────────────────

async function invokeGeminiDirect(
  apiKey: string,
  model: string,
  options: LLMOptions
): Promise<string> {
  const systemMsg = options.messages.find(m => m.role === "system")?.content || "";
  const userMessages = options.messages.filter(m => m.role !== "system");
  const contents = userMessages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 2048,
    },
  };
  if (systemMsg) body.systemInstruction = { parts: [{ text: systemMsg }] };
  if (options.responseFormat === "json") {
    (body.generationConfig as Record<string, unknown>).responseMimeType = "application/json";
  }
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );
  if (!response.ok) {
    const err = await response.text();
    let errData: any;
    try { errData = JSON.parse(err); } catch { /* ignore */ }
    const status = response.status;
    if (status === 429) {
      throw new Error("The AI service is over its quota. Please add billing to your Google Cloud project at console.cloud.google.com, or configure a different AI provider in Settings.");
    }
    throw new Error(`Gemini API error ${status}: ${err}`);
  }
  const data = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// ─── Perplexity ───────────────────────────────────────────────────────────────

async function invokePerplexity(
  apiKey: string,
  model: string,
  options: LLMOptions
): Promise<string> {
  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: options.messages,
      max_tokens: options.maxTokens ?? 2048,
      temperature: options.temperature ?? 0.7,
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Perplexity API error ${response.status}: ${err}`);
  }
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content || "";
}

// ─── OpenAI ───────────────────────────────────────────────────────────────────

async function invokeOpenAI(
  apiKey: string,
  model: string,
  options: LLMOptions
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: options.messages,
      max_tokens: options.maxTokens ?? 2048,
      temperature: options.temperature ?? 0.7,
      ...(options.responseFormat === "json" ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${err}`);
  }
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content || "";
}

// ─── Test connection ──────────────────────────────────────────────────────────

export async function testProviderConnection(
  config: AIProviderConfig
): Promise<{ ok: boolean; model: string; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    await invokeAI(config, {
      messages: [{ role: "user", content: "Reply with only: OK" }],
      maxTokens: 10,
      temperature: 0,
    });
    return {
      ok: true,
      model: config.model || DEFAULT_MODELS[config.provider],
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      ok: false,
      model: config.model || DEFAULT_MODELS[config.provider],
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
