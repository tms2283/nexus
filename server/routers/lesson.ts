import { z } from "zod";
import { TRPCError } from "@trpc/server";
import path from "node:path";
import { promises as fs } from "node:fs";
import { publicProcedure, router } from "../_core/trpc";
import { composeLessonSeed } from "../services/lessonSeedFactory";
import { getLearnerProfile, getDefaultProfile } from "../services/learnerProfileService";
import { AI_LITERACY_TEMPLATES } from "../../shared/content/aiLiteracy/lessonTemplates";
import { AI_BY_AI_TEMPLATES } from "../../shared/content/aiByAI/lessonTemplates";
import { callAI } from "./shared";
import {
  addXP,
  saveLesson,
  getLessonById,
  markLessonComplete,
  searchSharedLessons,
  rateLessonAndFeedback,
  getLessonRating,
  getLessonStats,
  startLessonProgress,
  completeLessonProgress,
  getUserProgress,
  getStudyStats,
  startCurriculumProgress,
  getCurriculumProgress,
  getFoundationProgress,
  recordAssessmentResponse,
  getAssessmentHistory,
  recordReflection,
  updateReflectionRubric,
  getReflectionsForLesson,
  incrementLessonViewCount,
  getOrCreateVisitorProfile,
  ensureVisitorBadge,
  saveLessonBlueprint,
  getLessonBlueprintByLessonId,
  replaceLessonSections,
  getLessonSections,
  getLessonSectionById,
  updateLessonSectionById,
  upsertSectionCompletion,
  getSectionCompletionsForLesson,
  createFlashcardDeck,
  addScheduledFlashcardsToDeck,
} from "../db";
import { type InsertLesson, type InsertLessonSection, adaptiveLessonTemplates } from "../../drizzle/schema";
import { getDb } from "../db";
import { eq } from "drizzle-orm";
import type { LessonTemplate } from "../../shared/types/lessonSeed";
import { ENV } from "../_core/env";

const sectionTypeSchema = z.enum([
  "hook",
  "concept",
  "example",
  "visual_explainer",
  "analogy",
  "activity",
  "recap",
]);

const learningPrincipleSchema = z.enum([
  "dual_coding",
  "spaced_retrieval",
  "elaboration",
  "concrete_example",
  "feynman",
]);

const visualAssetSchema = z.enum(["diagram", "illustration", "chart", "none"]);

const lessonBlueprintSchema = z.object({
  title: z.string(),
  learnerLevel: z.enum(["beginner", "intermediate", "advanced"]),
  sections: z.array(z.object({
    id: z.string(),
    title: z.string(),
    type: sectionTypeSchema,
    visualAsset: visualAssetSchema,
    videoUseful: z.boolean(),
    estimatedMinutes: z.number(),
    learningPrinciple: learningPrincipleSchema,
    retrievalQuestion: z.string(),
  })),
  heroImagePrompt: z.string(),
  videoConceptPrompt: z.string().nullable().optional(),
  flashcardSeeds: z.array(z.object({ front: z.string(), back: z.string() })),
  interactiveElements: z.array(z.enum(["quiz", "drag_and_drop", "fill_in_blank", "matching"])),
  totalEstimatedMinutes: z.number(),
});

type LessonBlueprint = z.infer<typeof lessonBlueprintSchema>;

type RetrievalQuestionPack = {
  questionType: "multiple_choice" | "open_ended" | "label_diagram";
  retrievalQuestion: string;
  options?: string[];
  correctAnswer?: string;
};

function parseJsonFromAI<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    const objMatch = raw.match(/\{[\s\S]*\}/);
    if (objMatch) {
      try {
        return JSON.parse(objMatch[0]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getMediaPublicDir(kind: "images" | "videos"): string {
  return path.resolve(process.cwd(), "client", "public", "generated", kind);
}

function getMediaPublicUrl(kind: "images" | "videos", filename: string): string {
  return `/generated/${kind}/${filename}`;
}

async function saveBase64Media(
  kind: "images" | "videos",
  basename: string,
  ext: "png" | "mp4",
  b64Data: string
): Promise<string> {
  const dir = getMediaPublicDir(kind);
  await fs.mkdir(dir, { recursive: true });
  const filename = `${basename}-${Date.now()}.${ext}`;
  const absPath = path.join(dir, filename);
  await fs.writeFile(absPath, Buffer.from(b64Data, "base64"));
  return getMediaPublicUrl(kind, filename);
}

async function saveBinaryMedia(
  kind: "images" | "videos",
  basename: string,
  ext: "png" | "mp4",
  bytes: ArrayBuffer
): Promise<string> {
  const dir = getMediaPublicDir(kind);
  await fs.mkdir(dir, { recursive: true });
  const filename = `${basename}-${Date.now()}.${ext}`;
  const absPath = path.join(dir, filename);
  await fs.writeFile(absPath, Buffer.from(bytes));
  return getMediaPublicUrl(kind, filename);
}

function sanitizeBaseName(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || "asset";
}

async function generateGeminiImage(prompt: string, basename: string): Promise<string> {
  if (!ENV.geminiApiKey) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GEMINI_API_KEY is required for image generation." });
  }
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": ENV.geminiApiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { imageConfig: { aspectRatio: "16:9" } },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new TRPCError({ code: "BAD_REQUEST", message: `Gemini image generation failed: ${response.status} ${err}` });
  }

  const data = await response.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string }; inline_data?: { data?: string } }> } }>;
  };
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.data || p.inline_data?.data);
  const b64 = imagePart?.inlineData?.data ?? imagePart?.inline_data?.data;
  if (!b64) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Gemini image generation returned no image data." });
  }

  return saveBase64Media("images", sanitizeBaseName(basename), "png", b64);
}

async function pollVeoOperation(operationName: string, maxAttempts = 18): Promise<any> {
  const opUrl = `https://generativelanguage.googleapis.com/v1beta/${operationName}`;
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(opUrl, {
      headers: { "x-goog-api-key": ENV.geminiApiKey },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new TRPCError({ code: "BAD_REQUEST", message: `Veo status polling failed: ${res.status} ${err}` });
    }
    const data = await res.json() as { done?: boolean };
    if (data.done) return data;
    await new Promise((r) => setTimeout(r, 10000));
  }
  throw new TRPCError({ code: "TIMEOUT", message: "Timed out waiting for Veo video generation." });
}

async function generateVeoVideo(prompt: string, basename: string): Promise<string> {
  if (!ENV.geminiApiKey) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "GEMINI_API_KEY is required for Veo generation." });
  }

  const startUrl = "https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-preview:predictLongRunning";
  const start = await fetch(startUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": ENV.geminiApiKey,
    },
    body: JSON.stringify({ instances: [{ prompt }] }),
  });

  if (!start.ok) {
    const err = await start.text();
    throw new TRPCError({ code: "BAD_REQUEST", message: `Veo generation request failed: ${start.status} ${err}` });
  }

  const op = await start.json() as { name?: string };
  if (!op.name) throw new TRPCError({ code: "BAD_REQUEST", message: "Veo did not return an operation id." });

  const doneData = await pollVeoOperation(op.name);
  const generatedVideo =
    doneData?.response?.generatedVideos?.[0]?.video ??
    doneData?.response?.generated_videos?.[0]?.video ??
    null;
  const videoUri: string | undefined =
    generatedVideo?.uri ??
    generatedVideo?.videoUri ??
    generatedVideo?.video_uri;

  if (!videoUri) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Veo completed but returned no video URI." });
  }

  if (videoUri.startsWith("http://") || videoUri.startsWith("https://")) {
    const videoRes = await fetch(videoUri, {
      headers: { "x-goog-api-key": ENV.geminiApiKey },
    });
    if (videoRes.ok) {
      const bytes = await videoRes.arrayBuffer();
      return saveBinaryMedia("videos", sanitizeBaseName(basename), "mp4", bytes);
    }
  }

  return videoUri;
}

function toLearnerLevel(depth: number): "beginner" | "intermediate" | "advanced" {
  if (depth <= 2) return "beginner";
  if (depth <= 4) return "intermediate";
  return "advanced";
}

function defaultBlueprint(topic: string, depth: number): LessonBlueprint {
  const learnerLevel = toLearnerLevel(depth);
  return {
    title: `The Living System of ${topic}`,
    learnerLevel,
    sections: [
      {
        id: "hook",
        title: `Why ${topic} matters`,
        type: "hook",
        visualAsset: "illustration",
        videoUseful: false,
        estimatedMinutes: 4,
        learningPrinciple: "concrete_example",
        retrievalQuestion: `What real-world problem makes ${topic} worth learning?`,
      },
      {
        id: "core-concept",
        title: `Core mechanics of ${topic}`,
        type: "concept",
        visualAsset: "diagram",
        videoUseful: true,
        estimatedMinutes: 8,
        learningPrinciple: "dual_coding",
        retrievalQuestion: `In one sentence, what is the core mechanism behind ${topic}?`,
      },
      {
        id: "example",
        title: `${topic} in practice`,
        type: "example",
        visualAsset: "chart",
        videoUseful: false,
        estimatedMinutes: 6,
        learningPrinciple: "concrete_example",
        retrievalQuestion: `How would this concept change your approach to a real task?`,
      },
      {
        id: "activity",
        title: `Try it yourself`,
        type: "activity",
        visualAsset: "none",
        videoUseful: false,
        estimatedMinutes: 6,
        learningPrinciple: "elaboration",
        retrievalQuestion: `What would break if one key assumption changed?`,
      },
      {
        id: "recap",
        title: `Recap and transfer`,
        type: "recap",
        visualAsset: "diagram",
        videoUseful: false,
        estimatedMinutes: 4,
        learningPrinciple: "spaced_retrieval",
        retrievalQuestion: `What are the 3 ideas you should remember a week from now?`,
      },
    ],
    heroImagePrompt: `A cinematic educational hero illustration for ${topic}, dark background, high contrast, elegant and modern.`,
    videoConceptPrompt: `Animate the core mechanism of ${topic} with a clear metaphor.`,
    flashcardSeeds: [
      { front: `What is ${topic}?`, back: `${topic} is a framework for understanding and applying a core set of ideas.` },
      { front: `Why does ${topic} matter?`, back: `It improves decision quality by making hidden structure visible.` },
      { front: `What is a common mistake in ${topic}?`, back: `Confusing memorized definitions with applied understanding.` },
      { front: `How do you practice ${topic}?`, back: `Use retrieval, examples, and deliberate application with feedback.` },
      { front: `How do you know you've learned ${topic}?`, back: `You can explain it simply and transfer it to a new context.` },
    ],
    interactiveElements: ["quiz", "fill_in_blank"],
    totalEstimatedMinutes: 28,
  };
}

async function buildBlueprint(input: {
  cookieId: string;
  topic: string;
  depth: number;
  profile: {
    preferredTopics: string[];
    quizResults: Record<string, string>;
    xp: number;
  };
}): Promise<LessonBlueprint> {
  const prompt = `You are an expert instructional designer.
Create a lesson blueprint for "${input.topic}".
Learner profile:
- Preferred topics: ${(input.profile.preferredTopics || []).join(", ") || "general"}
- Quiz results: ${JSON.stringify(input.profile.quizResults || {})}
- XP: ${input.profile.xp}
- Depth level: ${input.depth}/5

Return ONLY valid JSON matching:
{
  "title": "string",
  "learnerLevel": "beginner|intermediate|advanced",
  "sections": [{
    "id":"string",
    "title":"string",
    "type":"hook|concept|example|visual_explainer|analogy|activity|recap",
    "visualAsset":"diagram|illustration|chart|none",
    "videoUseful":true,
    "estimatedMinutes":6,
    "learningPrinciple":"dual_coding|spaced_retrieval|elaboration|concrete_example|feynman",
    "retrievalQuestion":"string"
  }],
  "heroImagePrompt":"string",
  "videoConceptPrompt":"string|null",
  "flashcardSeeds":[{"front":"string","back":"string"}],
  "interactiveElements":["quiz"],
  "totalEstimatedMinutes":35
}`;

  const raw = await callAI(input.cookieId, prompt, undefined, 4000);
  const parsed = parseJsonFromAI<unknown>(raw);
  const validated = lessonBlueprintSchema.safeParse(parsed);
  if (validated.success) return validated.data;
  return defaultBlueprint(input.topic, input.depth);
}

async function buildRetrievalQuestion(
  cookieId: string,
  section: { type: string; title: string; retrievalQuestion: string; content: string }
): Promise<RetrievalQuestionPack> {
  const questionPrompt = `Return JSON only.
Generate a retrieval checkpoint for this lesson section.
Section type: ${section.type}
Section title: ${section.title}
Section content: ${section.content.slice(0, 1500)}
Initial retrieval question: ${section.retrievalQuestion}

Rules:
- concept => questionType multiple_choice, include 4 options, and correctAnswer must match one option exactly.
- visual_explainer => questionType label_diagram OR multiple_choice.
- analogy/example/activity/recap => questionType open_ended unless clearly multiple choice is superior.

JSON schema:
{
  "questionType": "multiple_choice|open_ended|label_diagram",
  "retrievalQuestion": "string",
  "options": ["string"],
  "correctAnswer": "string"
}`;

  const raw = await callAI(cookieId, questionPrompt, undefined, 900);
  const parsed = parseJsonFromAI<Partial<RetrievalQuestionPack>>(raw);
  if (!parsed || !parsed.retrievalQuestion) {
    return {
      questionType: section.type === "concept" ? "multiple_choice" : "open_ended",
      retrievalQuestion: section.retrievalQuestion,
    };
  }
  const questionType = parsed.questionType ?? (section.type === "concept" ? "multiple_choice" : "open_ended");
  return {
    questionType,
    retrievalQuestion: parsed.retrievalQuestion,
    options: parsed.options,
    correctAnswer: parsed.correctAnswer,
  };
}

export const lessonRouter = router({
  rateLessonAndFeedback: publicProcedure.input(z.object({ lessonId: z.number(), cookieId: z.string(), rating: z.number().min(1).max(5), feedback: z.string().optional(), category: z.string().optional() })).mutation(async ({ input }) => {
    await rateLessonAndFeedback(input.lessonId, input.cookieId, input.rating, input.feedback || "", input.category || "other");
    return { success: true };
  }),

  getLessonRating: publicProcedure.input(z.object({ lessonId: z.number(), cookieId: z.string() })).query(async ({ input }) => getLessonRating(input.lessonId, input.cookieId)),
  getLessonStats: publicProcedure.input(z.object({ lessonId: z.number() })).query(async ({ input }) => getLessonStats(input.lessonId)),
  startLessonProgress: publicProcedure.input(z.object({ cookieId: z.string(), lessonId: z.number() })).mutation(async ({ input }) => startLessonProgress(input.cookieId, input.lessonId)),
  completeLessonProgress: publicProcedure.input(z.object({ cookieId: z.string(), lessonId: z.number(), timeSpentSeconds: z.number() })).mutation(async ({ input }) => {
    await completeLessonProgress(input.cookieId, input.lessonId, input.timeSpentSeconds);
    return { success: true };
  }),
  getUserProgress: publicProcedure.input(z.object({ cookieId: z.string() })).query(async ({ input }) => getUserProgress(input.cookieId)),
  getStudyStats: publicProcedure.input(z.object({ cookieId: z.string() })).query(async ({ input }) => getStudyStats(input.cookieId)),
  startCurriculumProgress: publicProcedure.input(z.object({ cookieId: z.string(), curriculumId: z.string(), totalLessons: z.number() })).mutation(async ({ input }) => startCurriculumProgress(input.cookieId, input.curriculumId, input.totalLessons)),
  getCurriculumProgress: publicProcedure.input(z.object({ cookieId: z.string(), curriculumId: z.string() })).query(async ({ input }) => getCurriculumProgress(input.cookieId, input.curriculumId)),

  /**
   * Returns a personalised LessonSeed by composing a lesson template with
   * the caller's LearnerProfile. Used by the new adaptive lesson UI.
   */
  getSeededLesson: publicProcedure
    .input(z.object({ lessonId: z.string().max(64), cookieId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      let template = AI_LITERACY_TEMPLATES[input.lessonId] ?? AI_BY_AI_TEMPLATES[input.lessonId] ?? null;
      if (!template) {
        // Fall back to adaptive template cache (for on-demand generated lessons)
        const db = await getDb();
        if (db) {
          const cached = await db.select().from(adaptiveLessonTemplates)
            .where(eq(adaptiveLessonTemplates.lessonKey, input.lessonId))
            .limit(1);
          if (cached[0]) template = cached[0].templateJson as unknown as LessonTemplate;
        }
      }
      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: `No lesson template: ${input.lessonId}` });
      }
      const profile = ctx.user?.id
        ? await getLearnerProfile(ctx.user.id)
        : getDefaultProfile(null, input.cookieId ?? null);
      return composeLessonSeed(template, profile);
    }),

  // ── Adaptive lesson persistence (for any course on the platform) ──────────

  recordAssessment: publicProcedure
    .input(
      z.object({
        cookieId: z.string().min(1).max(128),
        lessonId: z.string().max(64),
        itemId: z.string().max(128),
        itemKind: z.string().max(32),
        correct: z.boolean().optional(),
        confidence: z.number().int().min(1).max(5).optional(),
        responsePayload: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await recordAssessmentResponse({
        userId: ctx.user?.id ?? null,
        cookieId: input.cookieId,
        lessonId: input.lessonId,
        itemId: input.itemId,
        itemKind: input.itemKind,
        correct: input.correct,
        confidence: input.confidence,
        responsePayload: input.responsePayload,
      });
      return { success: true };
    }),

  getAssessmentHistory: publicProcedure
    .input(z.object({ cookieId: z.string(), lessonId: z.string().max(64).optional() }))
    .query(async ({ input }) => getAssessmentHistory(input.cookieId, input.lessonId)),

  recordReflection: publicProcedure
    .input(
      z.object({
        cookieId: z.string().min(1).max(128),
        lessonId: z.string().max(64),
        itemId: z.string().max(128),
        prompt: z.string().max(2000),
        response: z.string().max(8000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const id = await recordReflection({
        userId: ctx.user?.id ?? null,
        cookieId: input.cookieId,
        lessonId: input.lessonId,
        itemId: input.itemId,
        prompt: input.prompt,
        response: input.response,
      });
      return { success: true, reflectionId: id };
    }),

  getReflections: publicProcedure
    .input(z.object({ cookieId: z.string(), lessonId: z.string().max(64) }))
    .query(async ({ input }) => getReflectionsForLesson(input.cookieId, input.lessonId)),

  /**
   * LLM-graded rubric. Caller passes the prompt, the learner's response,
   * and the rubric criteria. Returns structured per-criterion feedback.
   * Persists the grade against the original reflection if reflectionId given.
   */
  gradeRubric: publicProcedure
    .input(
      z.object({
        cookieId: z.string().min(1).max(128),
        prompt: z.string().max(2000),
        response: z.string().max(8000),
        rubricCriteria: z
          .array(
            z.object({
              label: z.string().max(64),
              description: z.string().max(500),
              weight: z.number().min(0).max(10),
            })
          )
          .min(1)
          .max(8),
        reflectionId: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const rubricText = input.rubricCriteria
        .map(
          (c, i) =>
            `${i + 1}. ${c.label} (weight ${c.weight}) — ${c.description}`
        )
        .join("\n");

      const system =
        "You are an expert pedagogical grader. You return ONLY a single JSON object — no prose, no markdown fences. Be specific, name what is missing, and give actionable next steps. Score each criterion 0–5.";

      const userPrompt = `Grade the following learner response against the rubric.

PROMPT TO LEARNER:
${input.prompt}

LEARNER RESPONSE:
${input.response}

RUBRIC CRITERIA:
${rubricText}

Respond with this exact JSON shape:
{
  "overall": "<2-3 sentence summary, plain language>",
  "perCriterion": [
    { "label": "<criterion label>", "score": <0-5 integer>, "comment": "<one specific sentence>" }
  ]
}`;

      const raw = await callAI(input.cookieId, userPrompt, system, 800);
      let parsed: { overall: string; perCriterion: Array<{ label: string; score: number; comment: string }> };
      try {
        const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
        parsed = JSON.parse(cleaned);
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Grader returned malformed JSON. Please retry.",
        });
      }

      if (input.reflectionId) {
        await updateReflectionRubric(input.reflectionId, parsed);
      }
      return parsed;
    }),

  getOrCreateLesson: publicProcedure
    .input(z.object({ cookieId: z.string(), title: z.string(), topic: z.string(), curriculumId: z.string() }))
    .query(async ({ input }) => {
      const existing = await searchSharedLessons(input.title);
      if (existing.length > 0) {
        await incrementLessonViewCount(existing[0].id);
        return existing[0];
      }
      return null;
    }),

  createLessonWithResources: publicProcedure
    .input(z.object({ cookieId: z.string(), title: z.string(), topic: z.string(), objectives: z.array(z.string()), curriculumId: z.string() }))
    .mutation(async ({ input }) => {
      const content = await callAI(
        input.cookieId,
        `Create a comprehensive lesson for: "${input.title}"\nObjectives: ${input.objectives.join(", ")}\n\nDetailed markdown content with examples.`,
        undefined,
        12000
      );

      let externalResources: Array<{ title: string; url: string; source: string; description?: string }> = [];
      try {
        const resourcesResponse = await callAI(
          input.cookieId,
          `For the topic "${input.topic}", suggest 5 relevant external resources including Wikipedia articles. Return ONLY JSON array: [{"title":"Title","url":"https://...","source":"Wikipedia","description":"Brief"}]`,
          undefined,
          1200
        );
        const m = resourcesResponse.match(/\[\s*\{[\s\S]*?\}\s*\]/);
        if (m) externalResources = JSON.parse(m[0]);
      } catch {
        externalResources = [{
          title: `${input.topic} - Wikipedia`,
          url: `https://en.wikipedia.org/wiki/${input.topic.replace(/\s+/g, "_")}`,
          source: "Wikipedia",
          description: "Wikipedia article on this topic",
        }];
      }

      const lesson: InsertLesson = {
        cookieId: input.cookieId,
        curriculumId: input.curriculumId,
        title: input.title,
        description: input.objectives.join(", "),
        content,
        objectives: input.objectives,
        keyPoints: input.objectives,
        resources: [],
        externalResources,
        order: 0,
        difficulty: "intermediate",
        estimatedMinutes: 30,
        isShared: true,
        relatedTopics: [input.topic],
      };

      const saved = await saveLesson(lesson);
      if (!saved) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create lesson." });
      }
      return saved;
    }),

  blueprintLesson: publicProcedure
    .input(z.object({
      lessonId: z.number(),
      cookieId: z.string(),
      topic: z.string(),
      depth: z.number().min(1).max(5),
    }))
    .mutation(async ({ input }) => {
      const lesson = await getLessonById(input.lessonId);
      if (!lesson) throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found." });

      const profile = await getOrCreateVisitorProfile(input.cookieId);
      const blueprint = await buildBlueprint({
        cookieId: input.cookieId,
        topic: input.topic,
        depth: input.depth,
        profile: {
          preferredTopics: profile?.preferredTopics ?? [],
          quizResults: profile?.quizResults ?? {},
          xp: profile?.xp ?? 0,
        },
      });

      const blueprintId = makeId("blueprint");
      const saved = await saveLessonBlueprint({
        id: blueprintId,
        lessonId: input.lessonId,
        blueprintJson: blueprint as unknown as Record<string, unknown>,
        totalEstimatedMinutes: blueprint.totalEstimatedMinutes,
        heroImagePrompt: blueprint.heroImagePrompt,
        videoConceptPrompt: blueprint.videoConceptPrompt ?? null,
      });

      return { blueprintId, blueprint: saved?.blueprintJson ?? blueprint };
    }),

  generateLessonSections: publicProcedure
    .input(z.object({ lessonId: z.number(), blueprintId: z.string(), cookieId: z.string() }))
    .mutation(async ({ input }) => {
      const lesson = await getLessonById(input.lessonId);
      if (!lesson) throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found." });

      const bp = await getLessonBlueprintByLessonId(input.lessonId);
      if (!bp || bp.id !== input.blueprintId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lesson blueprint not found." });
      }

      const parsedBlueprint = lessonBlueprintSchema.safeParse(bp.blueprintJson);
      if (!parsedBlueprint.success) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid lesson blueprint data." });
      }

      const blueprint = parsedBlueprint.data;
      const sections: InsertLessonSection[] = [];
      let priorSummary = "";

      for (let i = 0; i < blueprint.sections.length; i++) {
        const s = blueprint.sections[i];
        const sectionPrompt = `You are writing section ${i + 1} of ${blueprint.sections.length} of lesson "${blueprint.title}".
Section type: ${s.type}
Learning principle: ${s.learningPrinciple}
Learner level: ${blueprint.learnerLevel}
Prior section summary: ${priorSummary || "N/A"}

Rules:
- 400 to 800 words
- Apply the section's pedagogical role
- Use concrete examples and clarity
- Do not include the retrieval question in the content
- Use markdown headings and concise structure`;

        const content = await callAI(input.cookieId, sectionPrompt, undefined, 4000);
        priorSummary = content.slice(0, 350);

        const retrieval = await buildRetrievalQuestion(input.cookieId, {
          type: s.type,
          title: s.title,
          retrievalQuestion: s.retrievalQuestion,
          content,
        });

        sections.push({
          id: makeId(`section-${input.lessonId}-${i + 1}`),
          lessonId: input.lessonId,
          sequenceNumber: i + 1,
          type: s.type,
          title: s.title,
          content,
          retrievalQuestion: retrieval.retrievalQuestion,
          questionType: retrieval.questionType,
          questionOptions: retrieval.options ?? null,
          correctAnswer: retrieval.correctAnswer ?? null,
          visualAsset: s.visualAsset,
          learningPrinciple: s.learningPrinciple,
        });
      }

      await replaceLessonSections(input.lessonId, sections);
      return { success: true, count: sections.length };
    }),

  getLessonWithSections: publicProcedure
    .input(z.object({ lessonId: z.number(), cookieId: z.string().optional() }))
    .query(async ({ input }) => {
      const lesson = await getLessonById(input.lessonId);
      if (!lesson) return null;
      const [blueprint, sections] = await Promise.all([
        getLessonBlueprintByLessonId(input.lessonId),
        getLessonSections(input.lessonId),
      ]);
      const completions = input.cookieId
        ? await getSectionCompletionsForLesson(input.cookieId, input.lessonId)
        : [];
      return { lesson, blueprint, sections, completions };
    }),

  generateSectionImage: publicProcedure
    .input(z.object({
      sectionId: z.string(),
      lessonTitle: z.string(),
      sectionTitle: z.string(),
      sectionContent: z.string(),
      assetType: visualAssetSchema,
      cookieId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const section = await getLessonSectionById(input.sectionId);
      if (!section) throw new TRPCError({ code: "NOT_FOUND", message: "Section not found." });

      const promptEnhancer = `Enhance this educational image prompt for precision.
Lesson: ${input.lessonTitle}
Section: ${input.sectionTitle}
Asset type: ${input.assetType}
Context: ${input.sectionContent.slice(0, 900)}
Return only one concise image prompt.`;
      const enhancedPrompt = await callAI(input.cookieId, promptEnhancer, undefined, 400);

      let svgContent: string | null = null;
      if (input.assetType === "diagram" || section.type === "visual_explainer") {
        const svgPrompt = `Generate a complete SVG only, no markdown fences.
viewBox="0 0 800 500".
Use these colors: oklch(0.75 0.18 55), oklch(0.65 0.22 200), oklch(0.72 0.20 290).
Topic: ${input.sectionTitle}
Context: ${input.sectionContent.slice(0, 800)}`;
        const rawSvg = await callAI(input.cookieId, svgPrompt, undefined, 1200);
        const match = rawSvg.match(/<svg[\s\S]*<\/svg>/i);
        svgContent = match ? match[0] : null;
      }

      const imagePrompt = `${enhancedPrompt.trim()}\n\nStyle: educational, high-clarity, dark-friendly, no text artifacts.`;
      let imageUrl: string;
      try {
        imageUrl = await generateGeminiImage(imagePrompt, `${input.lessonTitle}-${input.sectionTitle}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Gemini image generation failed.";
        // Keep UI resilient even when generation fails.
        imageUrl = `https://placehold.co/1280x720/10141f/e6edf7.png?text=${encodeURIComponent(input.sectionTitle)}`;
        console.warn("[lesson.generateSectionImage] fallback placeholder:", msg);
      }

      await updateLessonSectionById(input.sectionId, {
        imageUrl,
        svgContent,
        imageGeneratedAt: new Date(),
      });

      return { imageUrl, svgContent, prompt: imagePrompt };
    }),

  generateSectionVideo: publicProcedure
    .input(z.object({ sectionId: z.string(), conceptPrompt: z.string(), cookieId: z.string() }))
    .mutation(async ({ input }) => {
      const section = await getLessonSectionById(input.sectionId);
      if (!section) throw new TRPCError({ code: "NOT_FOUND", message: "Section not found." });
      const videoPrompt = `Create a clean educational explainer video with a dark background and high-contrast visuals.\n${input.conceptPrompt}\n\nSection context:\n${section.content.slice(0, 1200)}`;
      const videoUrl = await generateVeoVideo(videoPrompt, `${section.title}-explainer`);
      await updateLessonSectionById(input.sectionId, { videoUrl, videoGeneratedAt: new Date() });
      return { queued: false, sectionId: input.sectionId, videoUrl, status: "Video ready" };
    }),

  submitRetrievalAnswer: publicProcedure
    .input(z.object({
      lessonId: z.number(),
      sectionId: z.string(),
      cookieId: z.string(),
      answer: z.string(),
      questionType: z.enum(["multiple_choice", "open_ended", "label_diagram"]).optional(),
      timeSpentSeconds: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const section = await getLessonSectionById(input.sectionId);
      if (!section) throw new TRPCError({ code: "NOT_FOUND", message: "Section not found." });

      const questionType = (input.questionType ?? section.questionType ?? "open_ended") as "multiple_choice" | "open_ended" | "label_diagram";
      let correct = false;
      let feedback = "";

      if (questionType === "multiple_choice") {
        const expected = (section.correctAnswer ?? "").trim().toLowerCase();
        correct = expected.length > 0 && input.answer.trim().toLowerCase() === expected;
        feedback = correct ? "Correct. Nice recall." : "Close, but not quite. Re-read the core mechanism and try again.";
      } else {
        const gradingPrompt = `Grade this learner answer for understanding.
Question: ${section.retrievalQuestion}
Reference section content: ${section.content.slice(0, 1800)}
Learner answer: ${input.answer}
Return JSON only: {"correct": true|false, "feedback":"one concise sentence"}`;
        try {
          const raw = await callAI(input.cookieId, gradingPrompt, undefined, 500);
          const parsed = parseJsonFromAI<{ correct?: boolean; feedback?: string }>(raw);
          correct = parsed?.correct ?? input.answer.trim().length > 40;
          feedback = parsed?.feedback ?? (correct ? "Good explanation." : "Needs a bit more specificity.");
        } catch {
          correct = input.answer.trim().length >= 40;
          feedback = correct
            ? "Saved. Your answer is detailed enough to count; AI grading was unavailable, so a length-based fallback was used."
            : "Add a bit more detail so the idea is clear even without AI-assisted grading.";
        }
      }

      await upsertSectionCompletion({
        id: makeId("section-completion"),
        lessonId: input.lessonId,
        sectionId: input.sectionId,
        cookieId: input.cookieId,
        retrievalAnswer: input.answer,
        answerCorrect: correct,
        timeSpentSeconds: input.timeSpentSeconds ?? null,
      });

      await addXP(input.cookieId, correct ? 12 : 4);
      return { success: true, correct, feedback };
    }),

  completeLesson: publicProcedure
    .input(z.object({ lessonId: z.number(), cookieId: z.string() }))
    .mutation(async ({ input }) => {
      const [lesson, sections, completions, blueprint, profile] = await Promise.all([
        getLessonById(input.lessonId),
        getLessonSections(input.lessonId),
        getSectionCompletionsForLesson(input.cookieId, input.lessonId),
        getLessonBlueprintByLessonId(input.lessonId),
        getOrCreateVisitorProfile(input.cookieId),
      ]);

      if (!lesson) throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found." });
      const requiredSections = sections.filter((section) => !!section.retrievalQuestion?.trim());
      if (requiredSections.length > 0 && completions.length < requiredSections.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Complete all section checkpoints before finishing this lesson." });
      }

      const completionMap = new Map(completions.map((c) => [c.sectionId, c]));
      const synthesisInput = sections.map((s, i) => {
        const c = completionMap.get(s.id);
        return `${i + 1}. ${s.title}\n- Key content: ${s.content.slice(0, 300)}\n- Learner answer: ${c?.retrievalAnswer ?? "N/A"}`;
      }).join("\n\n");

      const synthesisPrompt = `Write a 3-paragraph personalized synthesis.
Lesson title: ${lesson.title}
Learner preferred topics: ${(profile?.preferredTopics ?? []).join(", ") || "general"}
Learner quiz categories: ${JSON.stringify(profile?.quizResults ?? {})}
Learner XP: ${profile?.xp ?? 0}
Sections and answers:\n${synthesisInput}`;

      const synthesis = await (async () => {
        try {
          return await callAI(input.cookieId, synthesisPrompt, undefined, 1200);
        } catch {
          return [
            `${lesson.title} centers on a practical judgment habit rather than a memorized definition. The learner moved through concrete scenarios, structured sections, and at least one retrieval checkpoint, which means the lesson can still close with a durable takeaway even when AI synthesis is unavailable.`,
            `The strongest next step is to reuse the lesson in a live context: repeat the key move, watch for the core trap, and apply the concept to one real decision this week. The flashcards scheduled from this lesson should reinforce the language and the transfer habit over time.`,
            `To keep momentum, the learner should revisit the diagram, restate the lesson in plain language, and practice the apply task with a real example from work, media, or AI-assisted problem solving.`,
          ].join("\n\n");
        }
      })();

      let flashcardSeeds: Array<{ front: string; back: string }> = [];
      const parsedBlueprint = blueprint?.blueprintJson ? lessonBlueprintSchema.safeParse(blueprint.blueprintJson) : null;
      if (parsedBlueprint?.success) {
        flashcardSeeds = parsedBlueprint.data.flashcardSeeds.slice(0, 10);
      }
      if (flashcardSeeds.length === 0) {
        flashcardSeeds = [
          { front: `What is the central idea of ${lesson.title}?`, back: "It is the smallest explanation that predicts how the concept behaves in practice." },
          { front: `How do you apply ${lesson.title} in real work?`, back: "Start with a concrete scenario, pick one principle, then test and iterate." },
          { front: `What mistake should you avoid in ${lesson.title}?`, back: "Memorizing definitions without retrieval practice or application." },
        ];
      }

      let flashcardDeckId = 0;
      if (flashcardSeeds.length > 0) {
        flashcardDeckId = await createFlashcardDeck({
          cookieId: input.cookieId,
          title: `${lesson.title} - Lesson Flashcards`,
          description: "Auto-generated from lesson completion",
          sourceType: "ai_generated",
          sourceId: input.lessonId,
        });
        if (flashcardDeckId) {
          await addScheduledFlashcardsToDeck(flashcardDeckId, flashcardSeeds, [1, 3, 7, 14, 30]);
        }
      }

      const recommendations = await (async () => {
        try {
          const recommendationsPrompt = `Return JSON array of 3 lesson ideas related to "${lesson.title}". Format: ["...","...","..."]`;
          const recRaw = await callAI(input.cookieId, recommendationsPrompt, undefined, 300);
          const arr = JSON.parse(recRaw);
          return Array.isArray(arr) ? arr.slice(0, 3).map((x) => String(x)) : [];
        } catch {
          return [
            `Advanced applications of ${lesson.title}`,
            `${lesson.title} through real case studies`,
            `${lesson.title}: common pitfalls and fixes`,
          ];
        }
      })();

      await markLessonComplete(input.lessonId);
      await addXP(input.cookieId, 50);

      let unlockedFoundationBadge = false;
      if (lesson.curriculumId?.startsWith("foundation-")) {
        const foundationProgress = await getFoundationProgress(input.cookieId);
        if (foundationProgress.completedLessons >= foundationProgress.totalLessons) {
          unlockedFoundationBadge = await ensureVisitorBadge(input.cookieId, "foundation-thinker");
        }
      }

      return {
        success: true,
        synthesis,
        recommendations,
        flashcardDeckId,
        flashcardsScheduled: flashcardSeeds.length,
        unlockedFoundationBadge,
      };
    }),

  // Audio overview now prefers section-based content when available.
  generateAudioOverview: publicProcedure
    .input(z.object({ cookieId: z.string(), lessonId: z.number() }))
    .mutation(async ({ input }) => {
      const lesson = await getLessonById(input.lessonId);
      if (!lesson) throw new TRPCError({ code: "NOT_FOUND", message: "Lesson not found." });

      const sections = await getLessonSections(input.lessonId);
      const sectionContent = sections.map((s) => `## ${s.title}\n${s.content}`).join("\n\n");
      const contentForAudio = sectionContent.length > 0 ? sectionContent.slice(0, 8000) : lesson.content.slice(0, 4000);

      const { generateAudioOverview } = await import("../audio");
      const result = await generateAudioOverview({
        cookieId: input.cookieId,
        sourceType: "lesson",
        sourceId: input.lessonId,
        title: lesson.title,
        content: contentForAudio,
      });
      if (result.success) await addXP(input.cookieId, 20);
      return result;
    }),
});
