import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { callAI } from "./shared";
import {
  clarityMoodCheckins,
  clarityAssessmentResults,
  clarityCogTrainingSessions,
  clarityThoughtRecords,
} from "../../drizzle/schema";

// ─── Input schemas ────────────────────────────────────────────────────────────

const moodCheckinInput = z.object({
  cookieId: z.string(),
  mood: z.number().int().min(1).max(5),
  note: z.string().optional(),
});

const assessmentResultInput = z.object({
  cookieId: z.string(),
  instrumentId: z.string(),
  instrumentVersion: z.string(),
  totalScore: z.number().optional(),
  severity: z.string().optional(),
  subscales: z.record(z.string(), z.number()).optional(),
  durationSeconds: z.number(),
});

const cogTrainingSessionInput = z.object({
  cookieId: z.string(),
  exerciseId: z.string(),
  accuracyPct: z.number(),
  reactionMs: z.number().optional(),
  difficultyLevel: z.number(),
  durationSeconds: z.number(),
});

const thoughtRecordInput = z.object({
  cookieId: z.string(),
  situation: z.string(),
  automaticThought: z.string(),
  emotions: z.array(z.object({ name: z.string(), intensity: z.number() })),
  distortions: z.array(z.string()),
  evidenceFor: z.string(),
  evidenceAgainst: z.string(),
  balancedThought: z.string(),
});

const narrateResultInput = z.object({
  cookieId: z.string(),
  instrumentTitle: z.string(),
  totalScore: z.number().optional(),
  severity: z.string().optional(),
  subscales: z.record(z.string(), z.number()).optional(),
});

// ─── Router ───────────────────────────────────────────────────────────────────

export const clarityRouter = router({
  // ── Mood check-in ──────────────────────────────────────────────────────────
  saveMoodCheckin: publicProcedure
    .input(moodCheckinInput)
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) return { ok: false };
        await db.insert(clarityMoodCheckins).values({
          cookieId: input.cookieId,
          mood: input.mood,
          note: input.note ?? null,
        });
        return { ok: true };
      } catch (err) {
        console.error("[clarity] saveMoodCheckin error:", err);
        return { ok: false };
      }
    }),

  getMoodHistory: publicProcedure
    .input(z.object({ cookieId: z.string() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) return [];
        const rows = await db
          .select()
          .from(clarityMoodCheckins)
          .where(eq(clarityMoodCheckins.cookieId, input.cookieId))
          .orderBy(desc(clarityMoodCheckins.createdAt))
          .limit(14);
        return rows;
      } catch (err) {
        console.error("[clarity] getMoodHistory error:", err);
        return [];
      }
    }),

  // ── Assessment results ──────────────────────────────────────────────────────
  saveAssessmentResult: publicProcedure
    .input(assessmentResultInput)
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) return { ok: false };
        await db.insert(clarityAssessmentResults).values({
          cookieId: input.cookieId,
          instrumentId: input.instrumentId,
          instrumentVersion: input.instrumentVersion,
          totalScore: input.totalScore ?? null,
          severity: input.severity ?? null,
          subscalesJson: input.subscales ? JSON.stringify(input.subscales) : null,
          durationSeconds: input.durationSeconds,
        });
        return { ok: true };
      } catch (err) {
        console.error("[clarity] saveAssessmentResult error:", err);
        return { ok: false };
      }
    }),

  getAssessmentHistory: publicProcedure
    .input(z.object({ cookieId: z.string(), limit: z.number().int().min(1).max(200).optional() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) return [];
        const rows = await db
          .select()
          .from(clarityAssessmentResults)
          .where(eq(clarityAssessmentResults.cookieId, input.cookieId))
          .orderBy(desc(clarityAssessmentResults.createdAt))
          .limit(input.limit ?? 50);
        return rows.map((r) => ({
          ...r,
          subscales: r.subscalesJson
            ? (JSON.parse(r.subscalesJson) as Record<string, number>)
            : undefined,
        }));
      } catch (err) {
        console.error("[clarity] getAssessmentHistory error:", err);
        return [];
      }
    }),

  getCogTrainingHistory: publicProcedure
    .input(z.object({ cookieId: z.string(), limit: z.number().int().min(1).max(500).optional() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) return [];
        const rows = await db
          .select()
          .from(clarityCogTrainingSessions)
          .where(eq(clarityCogTrainingSessions.cookieId, input.cookieId))
          .orderBy(desc(clarityCogTrainingSessions.createdAt))
          .limit(input.limit ?? 100);
        return rows;
      } catch (err) {
        console.error("[clarity] getCogTrainingHistory error:", err);
        return [];
      }
    }),

  // ── Cognitive training sessions ─────────────────────────────────────────────
  saveCogTrainingSession: publicProcedure
    .input(cogTrainingSessionInput)
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) return { ok: false };
        await db.insert(clarityCogTrainingSessions).values({
          cookieId: input.cookieId,
          exerciseId: input.exerciseId,
          accuracyPct: input.accuracyPct,
          reactionMs: input.reactionMs ?? null,
          difficultyLevel: input.difficultyLevel,
          durationSeconds: input.durationSeconds,
        });
        return { ok: true };
      } catch (err) {
        console.error("[clarity] saveCogTrainingSession error:", err);
        return { ok: false };
      }
    }),

  // ── Thought records ─────────────────────────────────────────────────────────
  saveThoughtRecord: publicProcedure
    .input(thoughtRecordInput)
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) return { ok: false };
        await db.insert(clarityThoughtRecords).values({
          cookieId: input.cookieId,
          situation: input.situation,
          automaticThought: input.automaticThought,
          emotionsJson: JSON.stringify(input.emotions),
          distortions: JSON.stringify(input.distortions),
          evidenceFor: input.evidenceFor,
          evidenceAgainst: input.evidenceAgainst,
          balancedThought: input.balancedThought,
        });
        return { ok: true };
      } catch (err) {
        console.error("[clarity] saveThoughtRecord error:", err);
        return { ok: false };
      }
    }),

  // ── AI narration of assessment result ───────────────────────────────────────
  narrateResult: publicProcedure
    .input(narrateResultInput)
    .mutation(async ({ input }) => {
      const subscaleLines = input.subscales
        ? Object.entries(input.subscales)
            .map(([k, v]) => `  - ${k}: ${v}`)
            .join("\n")
        : null;

      const prompt = [
        `You are a compassionate, scientifically literate mental health interpreter. A user just completed the "${input.instrumentTitle}" assessment.`,
        "",
        input.totalScore !== undefined ? `Total score: ${input.totalScore}` : "",
        input.severity ? `Severity band: ${input.severity}` : "",
        subscaleLines ? `Subscales:\n${subscaleLines}` : "",
        "",
        "Please provide a warm, psychoeducational 2-3 paragraph interpretation of these results. Emphasize that this is a screening tool, not a clinical diagnosis. Suggest constructive next steps (e.g., speaking with a professional, self-care strategies). Use clear, empathetic language. Avoid jargon.",
      ]
        .filter(Boolean)
        .join("\n");

      try {
        const narration = await callAI(
          input.cookieId,
          prompt,
          "You are a compassionate mental health educator interpreting psychometric assessment results for a user.",
          600,
        );
        return { narration };
      } catch (err) {
        console.error("[clarity] narrateResult error:", err);
        return {
          narration:
            "Unable to generate an AI interpretation at this time. Please review your score in the context of the instrument's official scoring guide, and consider speaking with a qualified mental health professional.",
        };
      }
    }),

  diveDeeperScience: publicProcedure
    .input(z.object({
      cookieId: z.string(),
      exerciseId: z.string(),
      exerciseLabel: z.string(),
      scienceSummary: z.string(),
      citation: z.string(),
    }))
    .mutation(async ({ input }) => {
      const prompt = `A user is reading about the "${input.exerciseLabel}" cognitive training exercise. Here is the brief science summary they already saw:

"${input.scienceSummary}"

Citation: ${input.citation}

Please write a rich, deeper explanation (3-4 paragraphs) covering:
1. The specific brain regions and neural circuits involved, and how repeated practice changes them
2. The cognitive mechanisms in plain language — what exactly the brain is "doing" during this task
3. Key research findings and what the evidence says about real-world transfer effects
4. Practical tips for maximizing benefit from this exercise

Write in an engaging, scientifically accurate but accessible tone. Use clear language. Do not repeat the brief summary verbatim.`;

      try {
        const explanation = await callAI(
          input.cookieId,
          prompt,
          "You are a neuroscience educator writing accessible, evidence-based explanations of cognitive training research.",
          800,
        );
        return { explanation };
      } catch (err) {
        console.error("[clarity] diveDeeperScience error:", err);
        return { explanation: "Unable to generate a deeper explanation right now. Please try again shortly." };
      }
    }),
});
