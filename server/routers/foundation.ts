import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { type InsertLesson, type InsertLessonBlueprint, type InsertLessonSection } from "../../drizzle/schema";
import {
  getFoundationProgress,
  getLessonsByCurriculum,
  replaceLessonSections,
  saveLesson,
  saveLessonBlueprint,
} from "../db";
import { publicProcedure, router } from "../_core/trpc";
import {
  foundationTrack,
  getFoundationCourse,
  getFoundationLesson,
  getFoundationModule,
} from "../../shared/foundationCurriculum";

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildLessonMarkdown(args: {
  courseTitle: string;
  moduleTitle: string;
  lessonTitle: string;
  focus: string;
  beats: {
    hook: string;
    explain: string;
    visualize: string;
    check: string;
    apply: string;
    reflect: string;
  };
}): string {
  return [
    `# ${args.lessonTitle}`,
    "",
    `**Course:** ${args.courseTitle}`,
    `**Module:** ${args.moduleTitle}`,
    "",
    `## Hero Concept`,
    args.focus,
    "",
    "## Hook",
    args.beats.hook,
    "",
    "## Explain",
    args.beats.explain,
    "",
    "## Visualize",
    args.beats.visualize,
    "",
    "## Check",
    args.beats.check,
    "",
    "## Apply",
    args.beats.apply,
    "",
    "## Reflect",
    args.beats.reflect,
  ].join("\n");
}

export const foundationRouter = router({
  getTrack: publicProcedure.query(async () => foundationTrack),

  getProgress: publicProcedure
    .input(z.object({ cookieId: z.string() }))
    .query(async ({ input }) => getFoundationProgress(input.cookieId)),

  getCourse: publicProcedure
    .input(z.object({ courseId: z.enum(["ai-clarity", "reason-well"]) }))
    .query(async ({ input }) => {
      const course = getFoundationCourse(input.courseId);
      if (!course) throw new TRPCError({ code: "NOT_FOUND", message: "Course not found." });
      return course;
    }),

  createTemplateLesson: publicProcedure
    .input(
      z.object({
        cookieId: z.string(),
        courseId: z.enum(["ai-clarity", "reason-well"]),
        moduleId: z.string(),
        lessonId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const course = getFoundationCourse(input.courseId);
      const module = getFoundationModule(input.courseId, input.moduleId);
      const lesson = getFoundationLesson(input.courseId, input.moduleId, input.lessonId);

      if (!course || !module || !lesson) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Foundation lesson template not found." });
      }

      const curriculumId = `foundation-${input.courseId}-${input.moduleId}`;
      const existingLessons = await getLessonsByCurriculum(input.cookieId, curriculumId);
      const existing = existingLessons.find((item) => item.title === lesson.title);
      if (existing) {
        return { lessonId: existing.id, created: false };
      }

      const markdown = buildLessonMarkdown({
        courseTitle: course.title,
        moduleTitle: module.title,
        lessonTitle: lesson.title,
        focus: lesson.focus,
        beats: lesson.beats,
      });

      const lessonInsert: InsertLesson = {
        cookieId: input.cookieId,
        curriculumId,
        title: lesson.title,
        description: lesson.focus,
        content: markdown,
        objectives: module.outcomes,
        keyPoints: [lesson.focus, lesson.whyThisWins, lesson.misconceptions[0] ?? lesson.beats.reflect],
        resources: [],
        externalResources: [],
        difficulty: "intermediate",
        estimatedMinutes: lesson.durationMinutes,
        order: module.lessons.findIndex((item) => item.id === lesson.id),
        isShared: true,
        relatedTopics: [course.badge, module.title, `foundation-key:${lesson.id}`],
      };

      const savedLesson = await saveLesson(lessonInsert);
      if (!savedLesson) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to save foundation lesson." });
      }

      const blueprintId = makeId("foundation-blueprint");
      const blueprint: InsertLessonBlueprint = {
        id: blueprintId,
        lessonId: savedLesson.id,
        blueprintJson: {
          title: lesson.title,
          learnerLevel: "beginner",
          sections: [
            {
              id: "hook",
              title: "Hook",
              type: "hook",
              visualAsset: "none",
              videoUseful: false,
              estimatedMinutes: 3,
              learningPrinciple: "concrete_example",
              retrievalQuestion: "",
            },
            {
              id: "explain",
              title: "Explain",
              type: "concept",
              visualAsset: "none",
              videoUseful: false,
              estimatedMinutes: 4,
              learningPrinciple: "elaboration",
              retrievalQuestion: "",
            },
            {
              id: "visualize",
              title: "Visualize",
              type: "visual_explainer",
              visualAsset: "illustration",
              videoUseful: false,
              estimatedMinutes: 4,
              learningPrinciple: "dual_coding",
              retrievalQuestion: "",
            },
            {
              id: "check",
              title: "Check",
              type: "check",
              visualAsset: "none",
              videoUseful: false,
              estimatedMinutes: 2,
              learningPrinciple: "spaced_retrieval",
              retrievalQuestion: lesson.checkpoint.question,
            },
            {
              id: "apply-reflect",
              title: "Apply + Reflect",
              type: "activity",
              visualAsset: "none",
              videoUseful: false,
              estimatedMinutes: 5,
              learningPrinciple: "concrete_example",
              retrievalQuestion: "",
            },
          ],
          heroImagePrompt: lesson.diagram.title,
          videoConceptPrompt: lesson.motionStoryboard.join(" | "),
          flashcardSeeds: lesson.flashcards,
          interactiveElements: ["quiz"],
          totalEstimatedMinutes: lesson.durationMinutes,
        },
        totalEstimatedMinutes: lesson.durationMinutes,
        heroImagePrompt: lesson.diagram.title,
        videoConceptPrompt: lesson.motionStoryboard.join(" | "),
      };
      await saveLessonBlueprint(blueprint);

      const sections: InsertLessonSection[] = [
        {
          id: makeId("foundation-section-1"),
          lessonId: savedLesson.id,
          sequenceNumber: 1,
          type: "hook",
          title: "Hook",
          content: `## Hook\n${lesson.beats.hook}\n\n## Real Scenario\n${lesson.scenario}`,
          retrievalQuestion: null,
          questionType: null,
          visualAsset: "none",
          learningPrinciple: "concrete_example",
        },
        {
          id: makeId("foundation-section-2"),
          lessonId: savedLesson.id,
          sequenceNumber: 2,
          type: "concept",
          title: "Explain",
          content: `## Explain\n${lesson.beats.explain}\n\n## Why This Lesson Beats Generic Intro Content\n${lesson.whyThisWins}\n\n## Common Trap\n${lesson.misconceptions[0] ?? ""}`,
          retrievalQuestion: null,
          questionType: null,
          visualAsset: "none",
          learningPrinciple: "elaboration",
        },
        {
          id: makeId("foundation-section-3"),
          lessonId: savedLesson.id,
          sequenceNumber: 3,
          type: "visual_explainer",
          title: "Visualize",
          content: `## Visualize\n${lesson.beats.visualize}\n\n## Diagram Focus\n${lesson.diagram.title}\n\n- ${lesson.diagram.bullets.join("\n- ")}\n\n## Motion Storyboard\n- ${lesson.motionStoryboard.join("\n- ")}`,
          retrievalQuestion: null,
          questionType: null,
          imageUrl: lesson.posterPath,
          visualAsset: "illustration",
          learningPrinciple: "dual_coding",
        },
        {
          id: makeId("foundation-section-4"),
          lessonId: savedLesson.id,
          sequenceNumber: 4,
          type: "check",
          title: "Check",
          content: `## Check\nUse the scenario and the diagram to answer the retrieval prompt.\n\n## Guardrail\nAvoid this trap while answering: ${lesson.trap}`,
          retrievalQuestion: lesson.checkpoint.question,
          questionType: lesson.checkpoint.questionType,
          questionOptions: lesson.checkpoint.options ?? null,
          correctAnswer: lesson.checkpoint.correctAnswer ?? null,
          visualAsset: "none",
          learningPrinciple: "spaced_retrieval",
        },
        {
          id: makeId("foundation-section-5"),
          lessonId: savedLesson.id,
          sequenceNumber: 5,
          type: "activity",
          title: "Apply + Reflect",
          content: `## Apply\n${lesson.beats.apply}\n\n## Reflect\n${lesson.beats.reflect}`,
          retrievalQuestion: null,
          questionType: null,
          visualAsset: "none",
          learningPrinciple: "concrete_example",
        },
      ];

      await replaceLessonSections(savedLesson.id, sections);

      return { lessonId: savedLesson.id, created: true };
    }),
});
