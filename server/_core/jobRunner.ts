/**
 * jobRunner.ts — Background job processor for Nexus.
 *
 * Polls the `backgroundJobs` table every 5 minutes and processes pending jobs.
 * Handles: GENERATE_LESSON, BUILD_GOAL_PATH, GENERATE_ADAPTIVE_LESSON
 *
 * Called once from server/_core/index.ts at startup.
 */
import { getDb, saveLesson, searchSharedLessons } from "../db";
import {
  backgroundJobs, concepts, conceptAssets, learningAssets,
  goalPaths, goalPathNodes, adaptiveLessonTemplates,
  type InsertLesson,
} from "../../drizzle/schema";
import { eq, and, lt, sql, inArray, like, or } from "drizzle-orm";
import { callAI } from "../routers/shared";
import { topoSort, dropCycles } from "../../shared/utils/graphSort";
import { assertGagneConformance } from "../../shared/utils/gagneValidator";
import { computeProfileBucket } from "../routers/curriculum";
import type { LearnerProfile } from "../../shared/types/learnerProfile";
import type { LessonTemplate } from "../../shared/types/lessonSeed";

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

    // ── Check shared lesson cache before generating ────────────────────────────
    const existing = await searchSharedLessons(p.phase.title);
    const exactMatch = existing.find(l => l.title.toLowerCase() === p.phase.title.toLowerCase());
    if (exactMatch) {
      console.log(`[jobRunner] Lesson cache hit — skipping generation for: "${p.phase.title}"`);
      return;
    }

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

  // ── BUILD_GOAL_PATH ────────────────────────────────────────────────────────
  if (job.type === "BUILD_GOAL_PATH") {
    const p = job.payload as {
      pathId: string;
      goalText: string;
      timeCommitment: "light" | "moderate" | "intense";
      userId: number | null;
      cookieId: string;
      profileSnapshot: LearnerProfile;
    };
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    const DECOMPOSE_SYSTEM = `You are a pedagogical planner for Nexus, an adaptive learning platform. A learner stated a goal. Produce a decomposition that a curriculum engine can execute. Output JSON only. Schema:
{"goalSummary":"<title-case, ≤80 chars>","pitch":"<2-3 sentences speaking TO the learner; concrete, non-marketing>","estimatedWeeks":<int 1-12>,"outcomes":["<verb-led, measurable outcome>","..."]}
Rules:
- 4-8 outcomes. Each uses a Bloom verb (understand, apply, analyze, compare, build, design).
- Outcomes must be sequential: later outcomes depend on earlier ones.
- If the goal is too broad, narrow it in goalSummary and explain in pitch.
- If the goal is harmful, set goalSummary="refused" and return empty outcomes array.`;

    const profile = p.profileSnapshot;
    const decomposePrompt = `Goal: ${p.goalText}
Time commitment: ${p.timeCommitment} (light=1-3h/wk, moderate=4-7h/wk, intense=8+h/wk)
Learner profile:
  - background: ${profile.inferredBackground}
  - interests: ${(profile.inferredInterests ?? []).join(", ")}
  - learn style: ${profile.inferredLearnStyle}
  - reading level: ${profile.readingLevel}
  - prior exposure: ${profile.priorExposure}`;

    let decomposition: { goalSummary: string; pitch: string; estimatedWeeks: number; outcomes: string[] };
    try {
      const raw = await callAI(p.cookieId, decomposePrompt, DECOMPOSE_SYSTEM, 1024);
      const m = raw.match(/\{[\s\S]*\}/);
      decomposition = m ? JSON.parse(m[0]) : { goalSummary: p.goalText, pitch: "", estimatedWeeks: 4, outcomes: [] };
    } catch {
      decomposition = { goalSummary: p.goalText, pitch: "", estimatedWeeks: 4, outcomes: [] };
    }

    if (decomposition.goalSummary === "refused" || !decomposition.outcomes.length) {
      await db.update(goalPaths).set({
        status: "abandoned",
        goalSummary: "We couldn't build a path for this goal",
        pitch: decomposition.pitch || "Try rephrasing your goal to be more specific.",
      }).where(eq(goalPaths.id, p.pathId));
      return;
    }

    // Fetch published concepts as candidates
    const allPublished = await db.select({
      id: concepts.id, title: concepts.title, summary: concepts.summary
    }).from(concepts).where(eq(concepts.reviewStatus, "published")).limit(200);

    const MAP_SYSTEM = `You are matching learning outcomes to an existing concept catalog. Output JSON only. Schema:
{"concepts":[{"conceptId":"<existing-or-new-slug>","title":"<Title Case>","isNew":<bool>,"rationale":"<1 sentence>","prerequisiteIds":["<conceptId from this list>"],"sourceOutcomeIndex":<int>,"estimatedMinutes":<int 5-45>}]}
Rules:
- Use existing conceptIds exactly as given when they match. Do not rename.
- For new concepts, generate a kebab-case slug that won't collide with existing ids.
- Prerequisites reference other items IN YOUR OUTPUT. Produce a DAG.
- Skip outcomes that are ungrounded fluff.`;

    const catalogList = allPublished.slice(0, 100)
      .map(c => `- ${c.id}: ${c.title} — ${c.summary.slice(0, 80)}`).join("\n");
    const mapPrompt = `Outcomes:\n${decomposition.outcomes.map((o, i) => `[${i}] ${o}`).join("\n")}\n\nExisting concepts (up to 100):\n${catalogList}`;

    let conceptPlan: Array<{ conceptId: string; title: string; isNew: boolean; rationale: string; prerequisiteIds: string[]; sourceOutcomeIndex: number; estimatedMinutes?: number }> = [];
    try {
      const raw = await callAI(p.cookieId, mapPrompt, MAP_SYSTEM, 2048);
      const m = raw.match(/\{[\s\S]*\}/);
      const parsed = m ? JSON.parse(m[0]) : { concepts: [] };
      conceptPlan = parsed.concepts ?? [];
    } catch {
      conceptPlan = [];
    }

    if (!conceptPlan.length) {
      // Fall back to one concept stub per outcome
      conceptPlan = decomposition.outcomes.map((o, i) => ({
        conceptId: `goal-${p.pathId}-${i}`,
        title: o.slice(0, 100),
        isNew: true,
        rationale: "Directly maps to this learning outcome.",
        prerequisiteIds: i > 0 ? [`goal-${p.pathId}-${i - 1}`] : [],
        sourceOutcomeIndex: i,
        estimatedMinutes: 20,
      }));
    }

    // Insert new concept stubs
    for (const cp of conceptPlan.filter(c => c.isNew)) {
      try {
        await db.insert(concepts).values({
          id: cp.conceptId,
          title: cp.title.slice(0, 255),
          summary: cp.rationale || `Learn about ${cp.title}.`,
          domain: "other",
          bloomLevel: "understand",
          estimatedMinutes: cp.estimatedMinutes ?? 20,
          source: "llm-extracted",
          reviewStatus: "draft",
        }).onDuplicateKeyUpdate({ set: { title: cp.title } });
      } catch { /* skip if exists */ }
    }

    // Topological sort
    const conceptIds = conceptPlan.map(c => c.conceptId);
    const edges = conceptPlan.flatMap(c =>
      c.prerequisiteIds.map(pid => ({ from: pid, to: c.conceptId }))
    );
    const validEdges = dropCycles(edges, conceptIds);
    let sorted: string[];
    try {
      sorted = topoSort(conceptIds, validEdges);
    } catch {
      sorted = conceptIds; // best effort
    }

    // Insert nodes in topological order
    for (let i = 0; i < sorted.length; i++) {
      const cp = conceptPlan.find(c => c.conceptId === sorted[i]);
      if (!cp) continue;
      await db.insert(goalPathNodes).values({
        pathId: p.pathId,
        conceptId: cp.conceptId,
        sequenceNumber: i,
        lessonStatus: "queued",
      });
    }

    const totalMins = conceptPlan.reduce((s, c) => s + (c.estimatedMinutes ?? 20), 0);

    await db.update(goalPaths).set({
      status: "ready",
      goalSummary: decomposition.goalSummary.slice(0, 255),
      pitch: decomposition.pitch,
      estimatedTotalMinutes: totalMins,
    }).where(eq(goalPaths.id, p.pathId));

    // Pre-generate all lessons eagerly so they're ready when the user opens the path
    const profileBucket = computeProfileBucket(p.profileSnapshot);
    for (const conceptId of sorted) {
      const lessonKey = `path-${p.pathId}-concept-${conceptId}`;
      // Check cache first — skip if already generated for this profile bucket
      const existing = await db.select({ lessonKey: adaptiveLessonTemplates.lessonKey })
        .from(adaptiveLessonTemplates)
        .where(and(
          eq(adaptiveLessonTemplates.conceptId, conceptId),
          eq(adaptiveLessonTemplates.profileBucket, profileBucket)
        )).limit(1);
      if (existing[0]) {
        // Already cached — point the node directly to it
        await db.update(goalPathNodes)
          .set({ lessonKey: existing[0].lessonKey, lessonStatus: "ready" })
          .where(and(eq(goalPathNodes.pathId, p.pathId), eq(goalPathNodes.conceptId, conceptId)));
        continue;
      }
      // Mark node as generating and enqueue
      await db.update(goalPathNodes)
        .set({ lessonKey, lessonStatus: "generating" })
        .where(and(eq(goalPathNodes.pathId, p.pathId), eq(goalPathNodes.conceptId, conceptId)));
      await db.insert(backgroundJobs).values({
        type: "GENERATE_ADAPTIVE_LESSON",
        payload: { pathId: p.pathId, conceptId, lessonKey, profileBucket, profileSnapshot: p.profileSnapshot, cookieId: p.cookieId },
        status: "pending",
      });
    }
  }

  // ── GENERATE_ADAPTIVE_LESSON ───────────────────────────────────────────────
  if (job.type === "GENERATE_ADAPTIVE_LESSON") {
    const p = job.payload as {
      pathId: string;
      conceptId: string;
      lessonKey: string;
      profileBucket: string;
      profileSnapshot: LearnerProfile;
      cookieId: string;
    };
    const db = await getDb();
    if (!db) throw new Error("DB unavailable");

    // Load concept + assets
    const [concept] = await db.select().from(concepts)
      .where(eq(concepts.id, p.conceptId)).limit(1);
    if (!concept) throw new Error(`Concept ${p.conceptId} not found`);

    const assetRows = await db.select({
      title: learningAssets.title,
      url: learningAssets.url,
      sourcePlatform: learningAssets.sourcePlatform,
      contentType: learningAssets.contentType,
      licenseCategory: learningAssets.licenseCategory,
      estimatedMinutes: learningAssets.estimatedMinutes,
      embeddable: learningAssets.embeddable,
    }).from(learningAssets)
      .innerJoin(conceptAssets, eq(conceptAssets.assetId, learningAssets.id))
      .where(eq(conceptAssets.conceptId, p.conceptId))
      .limit(6);

    const profile = p.profileSnapshot;
    const tailoring = [
      profile.inferredLearnStyle === "visual" ? "Include at least one diagram OR embed of a simulation/video." : "",
      profile.inferredLearnStyle === "hands-on" ? "Include a computation block OR a concrete mini-project in a rubric." : "",
      profile.inferredLearnStyle === "socratic" ? "Productive-failure probe must lead; retrieval phrased as questions." : "",
      profile.inferredLearnStyle === "deep-technical" ? "Retrieval tier:stretch must include at least 2 items." : "",
      profile.readingLevel === "plain" ? "Narrative body ≤150 words per section; no jargon without gloss." : "",
      profile.readingLevel === "technical" ? "Use domain terms freely; expect one-shot understanding." : "",
    ].filter(Boolean).join(" ");

    const LESSON_GEN_SYSTEM = `You are composing a LessonTemplate JSON for an adaptive learning platform. Output valid JSON only.

Schema (TypeScript interfaces — match exactly):
interface RetrievalChoice { id:string; text:string; correct:boolean; rationale:string; misconceptionTag?:string; remediationConceptId?:string; }
interface RetrievalBlock { kind:"retrieval"; id:string; prompt:string; choices:RetrievalChoice[]; requireConfidence:boolean; tier:"intro"|"core"|"stretch"; tags:string[]; }
interface LessonTemplate { lessonId:string; courseId:"adaptive"; title:string; subtitle?:string; estimatedMinutes:number; xpReward:number; prerequisites:string[]; concepts:string[]; retrieval:RetrievalBlock[]; extraSections?:any[]; closingReflection?:{kind:"reflection";id:string;prompt:string;cues?:string[]}; }

Pedagogical requirements (Gagné's 9 events):
1. Gain attention — embed or diagram at top of extraSections
2. State objectives — phrased in subtitle as "By the end, you'll be able to…"
3. Activate prior knowledge — retrieval item at tier "intro"
4. Present content — via concepts[] + extraSections
5. Provide guidance — analogies + worked examples (add as narrative extraSections)
6. Elicit performance — retrieval items at tier "core"
7. Feedback — every RetrievalChoice.rationale ≥1 sentence
8. Assess — retrieval tier "stretch" + optional span-select
9. Enhance retention — closingReflection asks for application AND a specific confusion

Rules:
- At least 4 retrieval items total across tiers intro/core/stretch.
- estimatedMinutes = 10–45. xpReward = estimatedMinutes * 3.
- Embed URLs MUST come from the provided asset list only. Do not hallucinate URLs.
- Diagrams: valid Mermaid "flowchart LR" or "graph TD" syntax only.
- Computation blocks: plain-English Wolfram queries.
- closingReflection is REQUIRED.`;

    const lessonGenPrompt = `Concept:
  id: ${concept.id}
  title: ${concept.title}
  summary: ${concept.summary}
  domain: ${concept.domain}
  bloomLevel: ${concept.bloomLevel}
  misconceptions: ${JSON.stringify(concept.misconceptions ?? [])}

Curated assets (use any, none, or several — pick pedagogically):
${assetRows.map((a, i) => `[${i}] ${a.title} (${a.sourcePlatform}, ${a.contentType}, ${a.licenseCategory}, ${a.estimatedMinutes}min)\n    URL: ${a.url}\n    Embeddable: ${a.embeddable}`).join("\n")}

Learner profile:
  readingLevel: ${profile.readingLevel}
  learnStyle: ${profile.inferredLearnStyle}
  priorExposure: ${profile.priorExposure}
  suggestedTier: ${profile.suggestedTier}

Tailoring: ${tailoring || "Balance theory and practice."}

lessonId to use: ${p.lessonKey}`;

    let templateJson: LessonTemplate | null = null;
    let lastError = "";

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const raw = await callAI(p.cookieId, lessonGenPrompt, LESSON_GEN_SYSTEM, 4096);
        const m = raw.match(/\{[\s\S]*\}/);
        if (!m) throw new Error("No JSON in response");
        const parsed = JSON.parse(m[0]) as LessonTemplate;
        assertGagneConformance(parsed);
        templateJson = parsed;
        break;
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
        if (attempt === 0) {
          // Retry with error context
          console.warn(`[jobRunner] Lesson gen attempt 1 failed (${p.lessonKey}): ${lastError}`);
        }
      }
    }

    if (!templateJson) {
      throw new Error(`Lesson generation failed after 2 attempts: ${lastError}`);
    }

    // Persist template — unique constraint on lessonKey guards against races
    try {
      await db.insert(adaptiveLessonTemplates).values({
        lessonKey: p.lessonKey,
        conceptId: p.conceptId,
        profileBucket: p.profileBucket,
        templateJson: templateJson as unknown as Record<string, unknown>,
        generatorModel: "claude-sonnet-4-6",
      });
    } catch {
      // Already inserted by a concurrent job — that's fine
    }

    // Mark node ready
    await db.update(goalPathNodes)
      .set({ lessonStatus: "ready" })
      .where(and(
        eq(goalPathNodes.pathId, p.pathId),
        eq(goalPathNodes.conceptId, p.conceptId)
      ));
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
