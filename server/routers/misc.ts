import { z } from "zod";
import { publicProcedure, visitorProcedure, router } from "../_core/trpc";
import {
  addXP,
  getDb,
  saveContactSubmission,
  getCodexEntries,
  seedCodexEntries,
  getAIProviderSettings,
  upsertAIProviderSettings,
} from "../db";
import { notifyOwner } from "../_core/notification";
import {
  testProviderConnection,
  DEFAULT_MODELS,
  type AIProvider,
} from "../aiProvider";
import { callAI } from "./shared";

// ─── In-memory cache for daily challenge (keyed by date seed) ─────────────────
const dailyChallengeCache = new Map<
  number,
  ReturnType<typeof buildChallenge>
>();
type ChallengeData = {
  title: string;
  category: string;
  description: string;
  difficulty: string;
  estimatedMinutes: number;
  tasks: string[];
  tip: string;
  xpReward: number;
  date: string;
  seed: number;
};
function buildChallenge(
  data: Record<string, unknown>,
  category: string,
  today: Date,
  seed: number
): ChallengeData {
  return {
    title: (data.title as string) ?? "Daily AI Challenge",
    category: (data.category as string) ?? category,
    description: (data.description as string) ?? "Explore today's AI concept.",
    difficulty: (data.difficulty as string) ?? "intermediate",
    estimatedMinutes: (data.estimatedMinutes as number) ?? 15,
    tasks: Array.isArray(data.tasks) ? (data.tasks as string[]) : [],
    tip: (data.tip as string) ?? "",
    xpReward: (data.xpReward as number) ?? 50,
    date: today.toISOString().split("T")[0],
    seed,
  };
}

export const contactRouter = router({
  submit: visitorProcedure
    .input(
      z.object({
        name: z.string().min(1).max(256),
        email: z.string().email(),
        subject: z.string().max(512).optional(),
        message: z.string().min(10).max(5000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await saveContactSubmission(input);
      await notifyOwner({
        title: `New Contact: ${input.name}`,
        content: `From: ${input.name} <${input.email}>\nSubject: ${input.subject ?? "No subject"}\n\n${input.message}`,
      });
      if (ctx.visitorCookieId) await addXP(ctx.visitorCookieId, 25);
      return { success: true };
    }),
});

// ─── Codex ─────────────────────────────────────────────────────────────────────
// Seed guard: only runs DB seed once per process lifetime
let codexSeeded = false;

export const codexRouter = router({
  list: publicProcedure
    .input(z.object({ category: z.string().optional() }))
    .query(async ({ input }) => {
      if (!codexSeeded) {
        await seedCodexEntries();
        codexSeeded = true;
      }
      return getCodexEntries(input.category);
    }),
});

export const aiProviderRouter = router({
  get: visitorProcedure.query(async ({ ctx }) => {
    const cookieId = ctx.visitorCookieId!;
    const s = await getAIProviderSettings(cookieId);
    return {
      provider: s?.provider ?? "gemini",
      model: s?.model ?? null,
      hasCustomKey: !!s?.apiKey,
      defaultModels: DEFAULT_MODELS,
    };
  }),

  set: visitorProcedure
    .input(
      z.object({
        provider: z.enum(["gemini", "perplexity", "openai"]),
        apiKey: z.string().optional(),
        model: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const cookieId = ctx.visitorCookieId!;
      await upsertAIProviderSettings(cookieId, {
        provider: input.provider,
        apiKey: input.apiKey,
        model: input.model,
      });
      return { success: true };
    }),

  test: publicProcedure
    .input(
      z.object({
        provider: z.enum(["gemini", "perplexity", "openai"]),
        apiKey: z.string().optional(),
        model: z.string().optional(),
      })
    )
    .mutation(async ({ input }) =>
      testProviderConnection({
        provider: input.provider as AIProvider,
        apiKey: input.apiKey ?? null,
        model: input.model ?? null,
      })
    ),

  clearKey: visitorProcedure.mutation(async ({ ctx }) => {
    const cookieId = ctx.visitorCookieId!;
    const s = await getAIProviderSettings(cookieId);
    if (s)
      await upsertAIProviderSettings(cookieId, {
        provider: s.provider,
        apiKey: undefined,
        model: s.model ?? undefined,
      });
    return { success: true };
  }),
});

export const dailyRouter = router({
  getChallenge: visitorProcedure.query(async ({ ctx }) => {
    const cookieId = ctx.visitorCookieId ?? "anonymous";
    const today = new Date();
    const seed =
      today.getFullYear() * 10000 +
      (today.getMonth() + 1) * 100 +
      today.getDate();

    if (dailyChallengeCache.has(seed)) return dailyChallengeCache.get(seed)!;

    const categories = [
      "AI Theory",
      "Prompt Engineering",
      "Machine Learning",
      "AI Ethics",
      "Practical AI",
      "Neural Networks",
      "NLP",
      "Computer Vision",
    ];
    const category = categories[seed % categories.length];
    const prompt = `Generate a daily AI learning challenge for "${category}". Return ONLY valid JSON:
{"title":"short title (max 8 words)","category":"${category}","description":"2-3 sentence description","difficulty":"beginner|intermediate|advanced","estimatedMinutes":15,"tasks":["task 1","task 2","task 3"],"tip":"one actionable pro tip","xpReward":50}
Seed: ${seed}`;

    try {
      const raw = await callAI(
        cookieId,
        prompt,
        "You are a learning challenge designer. Respond with valid JSON only — no markdown fences.",
        500
      );
      const text = raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}";
      const data = JSON.parse(text) as Record<string, unknown>;
      const result = buildChallenge(data, category, today, seed);
      dailyChallengeCache.set(seed, result);
      for (const k of dailyChallengeCache.keys()) {
        if (k !== seed) dailyChallengeCache.delete(k);
      }
      return result;
    } catch {
      const fallback = buildChallenge({}, category, today, seed);
      dailyChallengeCache.set(seed, fallback);
      return fallback;
    }
  }),

  complete: visitorProcedure
    .input(z.object({ challengeDate: z.string() }))
    .mutation(async ({ ctx }) => {
      const cookieId = ctx.visitorCookieId!;
      const result = await addXP(cookieId, 75);
      return { success: true, xpGained: 75, ...result };
    }),
});
