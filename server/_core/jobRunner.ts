/**
 * jobRunner.ts — Background job processor for Nexus.
 *
 * Polls the `backgroundJobs` table every 5 minutes and processes pending jobs.
 * Currently handles: GENERATE_LESSON
 *
 * Called once from server/_core/index.ts at startup.
 */
import { getDb, saveLesson } from "../db";
import { backgroundJobs, type InsertLesson } from "../../drizzle/schema";
import { eq, and, lt, sql } from "drizzle-orm";
import { callAI } from "../routers/shared";

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 3;

interface GenerateLessonPayload {
  cookieId: string;
  curriculumId: string;
  phase: {
    title: string;
    objectives: string[];
    resources: Array<{ title: string; type: string; url: string; description: string }>;
  };
  index: number;
  difficulty: string;
  interests: string[];
  learnStyle?: string;
  background?: string;
}

async function processJob(job: { id: number; type: string; payload: unknown }): Promise<void> {
  if (job.type === "GENERATE_LESSON") {
    const p = job.payload as GenerateLessonPayload;
    const styleDirective =
      p.learnStyle === "visual"         ? "Use diagrams, numbered steps, and visual metaphors throughout." :
      p.learnStyle === "socratic"       ? "Pose guiding questions before each answer to encourage discovery." :
      p.learnStyle === "hands-on"       ? "Include a hands-on exercise or mini-project in every section." :
      p.learnStyle === "deep-technical" ? "Cover internals, edge cases, and performance trade-offs in depth." :
      "Balance theory, examples, and practice exercises.";
    const interestLine = p.interests?.length ? `Learner interests: ${p.interests.join(", ")}. ` : "";
    const backgroundLine = p.background ? `Learner background: ${p.background}. ` : "";
    const difficultyLine = `Level: ${p.difficulty}. `;
    const content = await callAI(
      p.cookieId,
      `Create a comprehensive lesson on: "${p.phase.title}"\nObjectives: ${p.phase.objectives.join(", ")}\n\n${difficultyLine}${backgroundLine}${interestLine}${styleDirective}\n\nWrite detailed markdown content with examples and explanations tailored to this learner.`,
      undefined,
      3000
    );
    const lesson: InsertLesson = {
      cookieId: p.cookieId,
      curriculumId: p.curriculumId,
      title: p.phase.title,
      description: p.phase.objectives.join(", "),
      content,
      objectives: p.phase.objectives,
      keyPoints: p.phase.objectives,
      resources: p.phase.resources ?? [],
      externalResources: [],
      order: p.index,
      difficulty: p.difficulty as "beginner" | "intermediate" | "advanced",
      estimatedMinutes: 30,
      isShared: true,
      relatedTopics: p.interests ?? [],
    };
    await saveLesson(lesson);
  }
}

async function runPendingJobs(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const pending = await db
    .select()
    .from(backgroundJobs)
    .where(
      and(
        eq(backgroundJobs.status, "pending"),
        lt(backgroundJobs.attempts, MAX_ATTEMPTS)
      )
    )
    .limit(10);

  if (pending.length === 0) return;
  console.log(`[jobRunner] Processing ${pending.length} pending job(s)`);

  for (const job of pending) {
    // Mark as processing
    await db.update(backgroundJobs)
      .set({ status: "processing", attempts: sql`attempts + 1` })
      .where(eq(backgroundJobs.id, job.id));

    try {
      await processJob(job);
      await db.update(backgroundJobs)
        .set({ status: "done", processedAt: new Date() })
        .where(eq(backgroundJobs.id, job.id));
      console.log(`[jobRunner] ✓ Job ${job.id} (${job.type}) completed`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[jobRunner] ✗ Job ${job.id} (${job.type}) failed:`, msg);
      // If max attempts reached, mark failed; otherwise reset to pending for retry
      const newStatus = (job.attempts + 1) >= MAX_ATTEMPTS ? "failed" : "pending";
      await db.update(backgroundJobs)
        .set({ status: newStatus, error: msg.slice(0, 500) })
        .where(eq(backgroundJobs.id, job.id));
    }
  }
}

export function startJobRunner(): void {
  // Run immediately on startup, then every POLL_INTERVAL_MS
  runPendingJobs().catch(err => console.error("[jobRunner] Initial run error:", err));
  setInterval(() => {
    runPendingJobs().catch(err => console.error("[jobRunner] Poll error:", err));
  }, POLL_INTERVAL_MS);
  console.log(`[jobRunner] Started — polling every ${POLL_INTERVAL_MS / 60000} minutes`);
}
