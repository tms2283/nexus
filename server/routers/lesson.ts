import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  addXP, saveLesson, getLessonById, markLessonComplete, searchSharedLessons,
  rateLessonAndFeedback, getLessonRating, getLessonStats,
  startLessonProgress, completeLessonProgress, getUserProgress, getStudyStats,
  startCurriculumProgress, getCurriculumProgress, incrementLessonViewCount,
} from "../db";
import { callAI } from "./shared";
import { type InsertLesson } from "../../drizzle/schema";

export const lessonRouter = router({
  rateLessonAndFeedback: protectedProcedure.input(z.object({ lessonId: z.number(), cookieId: z.string(), rating: z.number().min(1).max(5), feedback: z.string().optional(), category: z.string().optional() })).mutation(async ({ input }) => { await rateLessonAndFeedback(input.lessonId, input.cookieId, input.rating, input.feedback || "", input.category || "other"); return { success: true }; }),
  getLessonRating: protectedProcedure.input(z.object({ lessonId: z.number(), cookieId: z.string() })).query(async ({ input }) => getLessonRating(input.lessonId, input.cookieId)),
  getLessonStats: publicProcedure.input(z.object({ lessonId: z.number() })).query(async ({ input }) => getLessonStats(input.lessonId)),
  startLessonProgress: protectedProcedure.input(z.object({ cookieId: z.string(), lessonId: z.number() })).mutation(async ({ input }) => startLessonProgress(input.cookieId, input.lessonId)),
  completeLessonProgress: protectedProcedure.input(z.object({ cookieId: z.string(), lessonId: z.number(), timeSpentSeconds: z.number() })).mutation(async ({ input }) => { await completeLessonProgress(input.cookieId, input.lessonId, input.timeSpentSeconds); return { success: true }; }),
  getUserProgress: protectedProcedure.input(z.object({ cookieId: z.string() })).query(async ({ input }) => getUserProgress(input.cookieId)),
  getStudyStats: protectedProcedure.input(z.object({ cookieId: z.string() })).query(async ({ input }) => getStudyStats(input.cookieId)),
  startCurriculumProgress: protectedProcedure.input(z.object({ cookieId: z.string(), curriculumId: z.string(), totalLessons: z.number() })).mutation(async ({ input }) => startCurriculumProgress(input.cookieId, input.curriculumId, input.totalLessons)),
  getCurriculumProgress: protectedProcedure.input(z.object({ cookieId: z.string(), curriculumId: z.string() })).query(async ({ input }) => getCurriculumProgress(input.cookieId, input.curriculumId)),

  getOrCreateLesson: protectedProcedure
    .input(z.object({ cookieId: z.string(), title: z.string(), topic: z.string(), curriculumId: z.string() }))
    .query(async ({ input }) => {
      const existing = await searchSharedLessons(input.title);
      if (existing.length > 0) { await incrementLessonViewCount(existing[0].id); return existing[0]; }
      return null;
    }),

  createLessonWithResources: protectedProcedure
    .input(z.object({ cookieId: z.string(), title: z.string(), topic: z.string(), objectives: z.array(z.string()), curriculumId: z.string() }))
    .mutation(async ({ input }) => {
      const content = await callAI(input.cookieId, `Create a comprehensive lesson for: "${input.title}"\nObjectives: ${input.objectives.join(", ")}\n\nDetailed markdown content with examples.`, undefined, 3000);
      let externalResources: Array<{ title: string; url: string; source: string; description?: string }> = [];
      try {
        const resourcesResponse = await callAI(input.cookieId, `For the topic "${input.topic}", suggest 5 relevant external resources including Wikipedia articles. Return ONLY JSON array: [{"title":"Title","url":"https://...","source":"Wikipedia","description":"Brief"}]`, undefined, 1024);
        const m = resourcesResponse.match(/\[\s*\{[\s\S]*?\}\s*\]/);
        if (m) externalResources = JSON.parse(m[0]);
      } catch (_e) {
        externalResources = [{ title: `${input.topic} — Wikipedia`, url: `https://en.wikipedia.org/wiki/${input.topic.replace(/\s+/g, "_")}`, source: "Wikipedia", description: "Wikipedia article on this topic" }];
      }
      const lesson: InsertLesson = { cookieId: input.cookieId, curriculumId: input.curriculumId, title: input.title, description: input.objectives.join(", "), content, objectives: input.objectives, keyPoints: input.objectives, resources: [], externalResources, order: 0, difficulty: "intermediate", estimatedMinutes: 30, isShared: true, relatedTopics: [input.topic] };
      const saved = await saveLesson(lesson);
      return saved || { id: 0, ...lesson, completed: false, completedAt: null, createdAt: new Date(), updatedAt: new Date(), viewCount: 0 };
    }),

  // ─── Audio overview for lessons ───────────────────────────────────────────
  generateAudioOverview: protectedProcedure
    .input(z.object({ cookieId: z.string(), lessonId: z.number() }))
    .mutation(async ({ input }) => {
      const lesson = await getLessonById(input.lessonId);
      if (!lesson) throw new Error("Lesson not found");
      const { generateAudioOverview } = await import("../audio");
      const result = await generateAudioOverview({ cookieId: input.cookieId, sourceType: "lesson", sourceId: input.lessonId, title: lesson.title, content: lesson.content.slice(0, 4000) });
      if (result.success) await addXP(input.cookieId, 20);
      return result;
    }),
});
