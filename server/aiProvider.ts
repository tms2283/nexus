/**
 * aiProvider.ts - Unified AI provider layer for Nexus.
 *
 * DEFAULT: uses the platform's built-in invokeLLM.
 * OVERRIDE: when a user supplies their own API key in Settings, routes to
 *   Gemini or Perplexity directly.
 *
 * Includes exponential-backoff retry for transient 429/5xx errors.
 */

import { invokeLLM } from "./_core/llm";
import { ENV } from "./_core/env";
import { getAIProviderSettings } from "./db";

export type AIProvider = "builtin" | "gemini" | "perplexity";

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey?: string | null;
  model?: string | null;
}

export const DEFAULT_MODELS: Record<AIProvider, string> = {
  builtin: "gemini-2.5-flash",
  gemini: "gemini-2.5-pro",
  perplexity: "llama-3.1-sonar-large-128k-online",
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

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

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
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

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

export async function resolveProviderConfig(cookieId?: string): Promise<AIProviderConfig> {
  if (cookieId) {
    try {
      const stored = await getAIProviderSettings(cookieId);
      if (stored?.provider && stored?.apiKey) {
        const provider = stored.provider === "openai" ? "gemini" : (stored.provider as AIProvider);
        return {
          provider,
          apiKey: stored.apiKey,
          model: stored.model ?? DEFAULT_MODELS[provider],
        };
      }
    } catch {
      // DB unavailable - fall through to built-in
    }
  }
  return { provider: "builtin" };
}

export async function invokeAI(
  config: AIProviderConfig,
  options: LLMOptions
): Promise<string> {
  const provider = config.provider || "builtin";
  let output = "";

  switch (provider) {
    case "perplexity":
      if (!config.apiKey) {
        throw new Error("Perplexity requires a user-supplied API key. Add it in Settings -> AI Provider.");
      }
      output = await withRetry(() =>
        invokePerplexity(config.apiKey!, config.model || DEFAULT_MODELS.perplexity, options)
      );
      break;

    case "gemini":
      if (config.apiKey) {
        output = await withRetry(() =>
          invokeGeminiDirect(config.apiKey!, config.model || DEFAULT_MODELS.gemini, options)
        );
        break;
      }
      output = await withRetry(() => invokeBuiltin(options));
      break;

    case "builtin":
    default:
      if (ENV.forgeApiKey) {
        output = await withRetry(() => invokeBuiltin(options));
        break;
      }
      if (ENV.geminiApiKey) {
        output = await withRetry(() =>
          invokeGeminiDirect(ENV.geminiApiKey, DEFAULT_MODELS.gemini, options)
        );
        break;
      }
      throw new Error(
        "No AI provider configured. Please add a GEMINI_API_KEY to your environment, or set up a provider in Settings -> AI Provider."
      );
  }

  if (!output.trim()) {
    throw new Error("The AI returned an empty response. Please try again.");
  }

  return output;
}

export async function invokeAIChat(
  config: AIProviderConfig,
  messages: LLMMessage[]
): Promise<string> {
  return invokeAI(config, { messages, maxTokens: 1024, temperature: 0.8 });
}

async function invokeBuiltin(options: LLMOptions): Promise<string> {
  const result = await invokeLLM({
    messages: options.messages.map((message) => ({
      role: message.role as "system" | "user" | "assistant",
      content: message.content,
    })),
  });
  const raw = result.choices?.[0]?.message?.content;
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) {
    return (raw as Array<{ type: string; text?: string }>)
      .filter((chunk) => chunk.type === "text")
      .map((chunk) => chunk.text ?? "")
      .join("");
  }
  return "";
}

async function callGeminiEndpoint(
  apiKey: string,
  model: string,
  body: Record<string, unknown>
): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  if (!response.ok) {
    const err = await response.text();
    const status = response.status;
    const error = new Error(`Gemini API error ${status}: ${err}`) as Error & { status: number };
    error.status = status;
    throw error;
  }
  const data = await response.json() as GeminiGenerateContentResponse;
  return extractGeminiText(data);
}

export function extractGeminiText(data: GeminiGenerateContentResponse): string {
  return (data.candidates ?? [])
    .flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text ?? "")
    .join("")
    .trim();
}

export function getGeminiThinkingBudget(model: string): number | undefined {
  if (/gemini-2\.5-pro/i.test(model)) return 128;
  if (/gemini-2\.5-(flash|flash-lite)/i.test(model)) return 0;
  return undefined;
}

async function invokeGeminiDirect(
  apiKey: string,
  model: string,
  options: LLMOptions
): Promise<string> {
  const systemMsg = options.messages.find((message) => message.role === "system")?.content || "";
  const userMessages = options.messages.filter((message) => message.role !== "system");
  const contents = userMessages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 2048,
    },
  };

  if (systemMsg) body.systemInstruction = { parts: [{ text: systemMsg }] };
  const thinkingBudget = getGeminiThinkingBudget(model);
  if (typeof thinkingBudget === "number") {
    (body.generationConfig as Record<string, unknown>).thinkingConfig = {
      thinkingBudget,
    };
  }
  if (options.responseFormat === "json") {
    (body.generationConfig as Record<string, unknown>).responseMimeType = "application/json";
  }

  try {
    return await callGeminiEndpoint(apiKey, model, body);
  } catch (err: any) {
    if (err.status === 429 && ENV.geminiApiKeyBackup) {
      console.warn("[AI] Primary Gemini key quota exceeded - falling back to backup key");
      try {
        return await callGeminiEndpoint(ENV.geminiApiKeyBackup, model, body);
      } catch (backupErr: any) {
        if (backupErr.status === 429) {
          throw new Error(
            "The AI service is over its quota. Please add billing to your Google Cloud project at console.cloud.google.com, or configure a different AI provider in Settings."
          );
        }
        throw backupErr;
      }
    }
    if (err.status === 429) {
      throw new Error(
        "The AI service is over its quota. Please add billing to your Google Cloud project at console.cloud.google.com, or configure a different AI provider in Settings."
      );
    }
    throw err;
  }
}

async function invokePerplexity(
  apiKey: string,
  model: string,
  options: LLMOptions
): Promise<string> {
  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
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
