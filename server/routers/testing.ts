import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { addXP, getDb } from "../db";
import { callAI } from "./shared";
import { testResults, iqResults } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export const testingRouter = router({
  saveResult: publicProcedure
    .input(z.object({ cookieId: z.string().min(1), testId: z.string().min(1), score: z.number(), totalQuestions: z.number(), answers: z.record(z.string(), z.number()), timeTakenSeconds: z.number().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.insert(testResults).values({ cookieId: input.cookieId, testId: input.testId, score: input.score, totalQuestions: input.totalQuestions, answers: input.answers, timeTakenSeconds: input.timeTakenSeconds ?? null });
      const pct = input.score / input.totalQuestions;
      const xp = pct >= 0.9 ? 100 : pct >= 0.7 ? 60 : pct >= 0.5 ? 30 : 15;
      const xpResult = await addXP(input.cookieId, xp);
      return { success: true, xpAwarded: xp, ...xpResult };
    }),

  saveIQResult: publicProcedure
    .input(z.object({ cookieId: z.string().min(1), iqScore: z.number().min(40).max(200), percentile: z.number(), rawScore: z.number(), categoryScores: z.record(z.string(), z.number()), timeTakenSeconds: z.number().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
      await db.insert(iqResults).values({ cookieId: input.cookieId, iqScore: input.iqScore, percentile: input.percentile, rawScore: input.rawScore, categoryScores: input.categoryScores, timeTakenSeconds: input.timeTakenSeconds ?? null });
      const xpResult = await addXP(input.cookieId, 75);
      return { success: true, xpAwarded: 75, ...xpResult };
    }),

  getResults: publicProcedure
    .input(z.object({ cookieId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { testResults: [], iqResults: [] };
      const [tests, iqs] = await Promise.all([
        db.select().from(testResults).where(eq(testResults.cookieId, input.cookieId)).orderBy(desc(testResults.completedAt)).limit(50),
        db.select().from(iqResults).where(eq(iqResults.cookieId, input.cookieId)).orderBy(desc(iqResults.completedAt)).limit(10),
      ]);
      return { testResults: tests, iqResults: iqs };
    }),

  getScoreHistory: publicProcedure
    .input(z.object({ cookieId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { subjects: {} as Record<string, Array<{ attempt: number; score: number; totalQuestions: number; pct: number; completedAt: Date; timeTakenSeconds: number | null }>>, iqHistory: [] as Array<{ attempt: number; iqScore: number; percentile: number; rawScore: number; categoryScores: Record<string, number>; completedAt: Date; timeTakenSeconds: number | null }> };
      const [tests, iqs] = await Promise.all([
        db.select({ id: testResults.id, testId: testResults.testId, score: testResults.score, totalQuestions: testResults.totalQuestions, timeTakenSeconds: testResults.timeTakenSeconds, completedAt: testResults.completedAt }).from(testResults).where(eq(testResults.cookieId, input.cookieId)).orderBy(testResults.completedAt),
        db.select({ id: iqResults.id, iqScore: iqResults.iqScore, percentile: iqResults.percentile, rawScore: iqResults.rawScore, categoryScores: iqResults.categoryScores, timeTakenSeconds: iqResults.timeTakenSeconds, completedAt: iqResults.completedAt }).from(iqResults).where(eq(iqResults.cookieId, input.cookieId)).orderBy(iqResults.completedAt),
      ]);
      const subjects: Record<string, Array<{ attempt: number; score: number; totalQuestions: number; pct: number; completedAt: Date; timeTakenSeconds: number | null }>> = {};
      for (const t of tests) {
        if (!subjects[t.testId]) subjects[t.testId] = [];
        subjects[t.testId].push({ attempt: subjects[t.testId].length + 1, score: t.score, totalQuestions: t.totalQuestions, pct: Math.round((t.score / t.totalQuestions) * 100), completedAt: t.completedAt, timeTakenSeconds: t.timeTakenSeconds ?? null });
      }
      const iqHistory = iqs.map((r, i) => ({ attempt: i + 1, iqScore: r.iqScore, percentile: r.percentile, rawScore: r.rawScore, categoryScores: r.categoryScores as Record<string, number>, completedAt: r.completedAt, timeTakenSeconds: r.timeTakenSeconds ?? null }));
      return { subjects, iqHistory };
    }),

  generateAdaptiveQuestions: publicProcedure
    .input(z.object({ cookieId: z.string(), subject: z.string(), difficulty: z.enum(["beginner", "intermediate", "advanced"]), count: z.number().min(3).max(15).default(10) }))
    .mutation(async ({ input }) => {
      const prompt = `Generate ${input.count} multiple-choice questions for: "${input.subject}" at ${input.difficulty} difficulty. Return ONLY a JSON array:\n[{"id":"q1","question":"...","options":["A) ...","B) ...","C) ...","D) ..."],"correct":0,"explanation":"..."}]`;
      const raw = await callAI(input.cookieId, prompt, "You are an expert educator. Return only valid JSON.", 2000);
      try {
        const m = raw.match(/\[[\s\S]*\]/);
        if (!m) throw new Error("No JSON array");
        return { questions: JSON.parse(m[0]) as any[] };
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate questions. Please try again." });
      }
    }),
});
