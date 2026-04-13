import { z } from "zod";
import { publicProcedure, visitorProcedure, router } from "../_core/trpc";
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
  incrementLessonViewCount,
} from "../db";
import { callAI } from "./shared";
import { type InsertLesson } from "../../drizzle/schema";

function getVisitorId(ctx: { visitorCookieId: string | null }): string {
  if (!ctx.visitorCookieId) {
    throw new Error("Visitor cookie not set");
  }
  return ctx.visitorCookieId;
}

export const lessonRouter = router({
  rateLessonAndFeedback: visitorProcedure
    .input(
      z.object({
        lessonId: z.number(),
        rating: z.number().min(1).max(5),
        feedback: z.string().optional(),
        category: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const cookieId = getVisitorId(ctx);
      await rateLessonAndFeedback(
        input.lessonId,
        cookieId,
        input.rating,
        input.feedback || "",
        input.category || "other"
      );
      return { success: true };
    }),
  getLessonRating: visitorProcedure
    .input(z.object({ lessonId: z.number() }))
    .query(async ({ input, ctx }) =>
      getLessonRating(input.lessonId, getVisitorId(ctx))
    ),
  getLessonStats: publicProcedure
    .input(z.object({ lessonId: z.number() }))
    .query(async ({ input }) => getLessonStats(input.lessonId)),
  startLessonProgress: visitorProcedure
    .input(z.object({ lessonId: z.number() }))
    .mutation(async ({ input, ctx }) =>
      startLessonProgress(getVisitorId(ctx), input.lessonId)
    ),
  completeLessonProgress: visitorProcedure
    .input(z.object({ lessonId: z.number(), timeSpentSeconds: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const cookieId = getVisitorId(ctx);
      await completeLessonProgress(
        cookieId,
        input.lessonId,
        input.timeSpentSeconds
      );
      return { success: true };
    }),
  getUserProgress: visitorProcedure.query(async ({ ctx }) =>
    getUserProgress(getVisitorId(ctx))
  ),
  getStudyStats: visitorProcedure.query(async ({ ctx }) =>
    getStudyStats(getVisitorId(ctx))
  ),
  startCurriculumProgress: visitorProcedure
    .input(z.object({ curriculumId: z.string(), totalLessons: z.number() }))
    .mutation(async ({ input, ctx }) =>
      startCurriculumProgress(
        getVisitorId(ctx),
        input.curriculumId,
        input.totalLessons
      )
    ),
  getCurriculumProgress: visitorProcedure
    .input(z.object({ curriculumId: z.string() }))
    .query(async ({ input, ctx }) =>
      getCurriculumProgress(getVisitorId(ctx), input.curriculumId)
    ),

  getOrCreateLesson: publicProcedure
    .input(
      z.object({
        title: z.string(),
        topic: z.string(),
        curriculumId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const existing = await searchSharedLessons(input.title);
      if (existing.length > 0) {
        await incrementLessonViewCount(existing[0].id);
        return existing[0];
      }
      return null;
    }),

  createLessonWithResources: visitorProcedure
    .input(
      z.object({
        title: z.string(),
        topic: z.string(),
        objectives: z.array(z.string()),
        curriculumId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const cookieId = getVisitorId(ctx);
      const content = await callAI(
        cookieId,
        `Create a comprehensive lesson for: "${input.title}"\nObjectives: ${input.objectives.join(", ")}\n\nDetailed markdown content with examples.`,
        undefined,
        3000
      );
      let externalResources: Array<{
        title: string;
        url: string;
        source: string;
        description?: string;
      }> = [];
      try {
        const resourcesResponse = await callAI(
          cookieId,
          `For the topic "${input.topic}", suggest 5 relevant external resources including Wikipedia articles. Return ONLY JSON array: [{"title":"Title","url":"https://...","source":"Wikipedia","description":"Brief"}]`,
          undefined,
          1024
        );
        const m = resourcesResponse.match(/\[\s*\{[\s\S]*?\}\s*\]/);
        if (m) externalResources = JSON.parse(m[0]);
      } catch (_e) {
        externalResources = [
          {
            title: `${input.topic} — Wikipedia`,
            url: `https://en.wikipedia.org/wiki/${input.topic.replace(/\s+/g, "_")}`,
            source: "Wikipedia",
            description: "Wikipedia article on this topic",
          },
        ];
      }
      const lesson: InsertLesson = {
        cookieId,
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
      return (
        saved || {
          id: 0,
          ...lesson,
          completed: false,
          completedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          viewCount: 0,
        }
      );
    }),

  generateAudioOverview: visitorProcedure
    .input(z.object({ lessonId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const cookieId = getVisitorId(ctx);
      const lesson = await getLessonById(input.lessonId);
      if (!lesson) throw new Error("Lesson not found");
      const { generateAudioOverview } = await import("../audio");
      const result = await generateAudioOverview({
        cookieId,
        sourceType: "lesson",
        sourceId: input.lessonId,
        title: lesson.title,
        content: lesson.content.slice(0, 4000),
      });
      if (result.success) await addXP(cookieId, 20);
      return result;
    }),
});
