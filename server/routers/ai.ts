import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc";
import {
  getChatHistory, saveChatMessage, addXP,
  saveLesson, getLessonById, getLessonsByCurriculum, markLessonComplete,
  askLessonQuestion, saveLessonAnswer, getLessonQuestions, getQuestionAnswer,
  markAnswerHelpful, incrementLessonViewCount, searchSharedLessons,
  getDb, getPsychProfile,
} from "../db";
import { type InsertLesson, backgroundJobs, generatedCurricula } from "../../drizzle/schema";
import { callAI, callAIChat, NEXUS_SYSTEM_PROMPT } from "./shared";
import { createHash } from "crypto";
import { eq } from "drizzle-orm";

// ─── Named constants (avoid 200-char lines) ───────────────────────────────────
const CURRICULUM_FALLBACK = (goal: string) => ({
  title: `Learning Path: ${goal}`,
  description: "A personalized learning curriculum.",
  estimatedWeeks: 4,
  phases: [{
    phase: 1,
    title: "Foundation",
    duration: "Week 1",
    objectives: ["Understand core concepts"],
    resources: [],
    milestone: "Complete first project",
  }],
});

const LEVEL_PROMPTS: Record<string, (concept: string) => string> = {
  child:    (c) => `Explain "${c}" to a curious 8-year-old. Simple words, concrete examples, fun analogy. No jargon. Make it a story.`,
  student:  (c) => `Explain "${c}" to a high school student. Introduce terminology with definitions. 2-3 concrete examples. Build from fundamentals.`,
  expert:   (c) => `Explain "${c}" at a graduate level. Assume domain knowledge. Precise technical language. Cover edge cases and adjacent concepts.`,
  socratic: (c) => `Use the Socratic method for "${c}". Ask 5-7 probing questions that lead to discovery. Don't explain — only ask.`,
  analogy:  (c) => `Explain "${c}" using 3 vivid analogies from completely different domains. Each illuminates a different aspect. Make them memorable.`,
};

export const aiRouter = router({
  generateGreeting: publicProcedure
    .input(z.object({
      cookieId: z.string(), visitCount: z.number(),
      pagesVisited: z.array(z.string()), preferredTopics: z.array(z.string()),
      timeOfDay: z.string(), xp: z.number(),
    }))
    .mutation(async ({ input }) => {
      try {
        const isReturning = input.visitCount > 1;
        const prompt = isReturning
          ? `Generate a short (2-3 sentences), sophisticated, personalized welcome-back message for a returning visitor to Nexus — an AI-powered learning platform. Visit count: ${input.visitCount}. Pages: ${input.pagesVisited.join(", ")}. Interests: ${input.preferredTopics.join(", ") || "not yet determined"}. XP: ${input.xp}. Time: ${input.timeOfDay}. Be warm but intellectually engaging. No generic phrases.`
          : `Generate a short (2-3 sentences), sophisticated, compelling first-time greeting for a new visitor to Nexus — an AI-powered learning and research platform. Time: ${input.timeOfDay}. Feel like entering a place for serious, curious minds. Intriguing, not cheesy.`;
        const greeting = await callAI(input.cookieId, prompt);
        return { greeting };
      } catch (_e) {
        return { greeting: "Welcome to Nexus — your AI-powered learning platform. Start exploring." };
      }
    }),

  generateQuiz: publicProcedure
    .input(z.object({ cookieId: z.string() }))
    .mutation(async ({ input }) => {
      const prompt = `Generate 4 adaptive quiz questions to personalize a learning platform. Return ONLY valid JSON:
{"questions":[{"id":"q1","question":"...","options":["A: ...","B: ...","C: ...","D: ..."],"category":"background|interests|goals|style"}]}
Topics: technical background, creative interests, learning goals, work style. Exactly 4 options per question labeled A,B,C,D.`;
      try {
        const response = await callAI(input.cookieId, prompt);
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as { questions: Array<{ id: string; question: string; options: string[]; category: string }> };
          if (parsed.questions?.length) return { questions: parsed.questions };
        }
      } catch (_e) { /* fallback to hardcoded questions */ }
      return {
        questions: [
          { id: "q1", question: "What best describes your relationship with technology?", options: ["A: I build it — developer", "B: I design it — UX/product", "C: I strategize it — business", "D: I'm curious about it"], category: "background" },
          { id: "q2", question: "What draws you to Nexus most?", options: ["A: Personalized learning paths", "B: Researching with AI", "C: Coding challenges", "D: The knowledge library"], category: "interests" },
          { id: "q3", question: "What's your primary learning goal right now?", options: ["A: Master a technical skill", "B: Understand a topic deeply", "C: Stay current with AI trends", "D: Explore broadly"], category: "goals" },
          { id: "q4", question: "How do you prefer to learn?", options: ["A: Deep dives — technical details", "B: Visual — show me", "C: Socratic — guide me to discover", "D: Interactive — let me build"], category: "style" },
        ],
      };
    }),

  explainConcept: publicProcedure
    .input(z.object({
      cookieId: z.string().optional(), concept: z.string().max(500),
      level: z.enum(["child", "student", "expert", "socratic", "analogy"]),
    }))
    .mutation(async ({ input }) => {
      try {
        const promptFn = LEVEL_PROMPTS[input.level];
        const explanation = await callAI(input.cookieId, promptFn(input.concept), undefined, 1500);
        return { explanation, level: input.level };
      } catch (_e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI is unavailable. Please try again or configure an API key in Settings." });
      }
    }),

  generateCurriculum: publicProcedure
    .input(z.object({
      cookieId: z.string().optional(), goal: z.string().max(500),
      currentLevel: z.enum(["beginner", "intermediate", "advanced"]),
      timeAvailable: z.string(), interests: z.array(z.string()),
    }))
    .mutation(async ({ input, ctx }) => {
      // Fetch psych profile for registered users to personalize the curriculum
      let profileContext = "";
      let learnStyle = "adaptive";
      let background = "";
      const userId = ctx.user?.id;
      if (userId) {
        const profile = await getPsychProfile(userId);
        if (profile) {
          const allInterests = Array.from(new Set([...input.interests, ...((profile.inferredInterests as string[]) ?? [])])).join(", ") || "general";
          learnStyle = profile.inferredLearnStyle ?? "adaptive";
          background = profile.inferredBackground ?? "";
          const styleDirective =
            learnStyle === "visual"        ? "Use diagrams, visual metaphors, and step-by-step walkthroughs." :
            learnStyle === "socratic"      ? "Structure phases as guided discovery — pose questions before answers." :
            learnStyle === "hands-on"      ? "Prioritize project-based phases with build-something milestones." :
            learnStyle === "deep-technical"? "Include low-level details, edge cases, and architecture trade-offs." :
            "Balance theory and practice across phases.";
          profileContext = `\n\nLearner profile — Background: ${profile.inferredBackground || "general"}. Goal: ${profile.inferredGoal || input.goal}. Interests: ${allInterests}. Learning style: ${learnStyle}. ${styleDirective}`;
        }
      }
      const allInterestsFallback = input.interests.join(", ") || "general";
      const curriculumId = `curriculum-${Date.now()}`;
      const cookieId = input.cookieId || "anonymous";
      const db = await getDb();

      // ── Cache lookup: same goal+level+time never generates twice ──────────────
      const goalHash = createHash("sha256")
        .update(`${input.goal.toLowerCase().trim()}|${input.currentLevel}|${input.timeAvailable}`)
        .digest("hex").slice(0, 32);

      if (db) {
        const cached = await db.select().from(generatedCurricula)
          .where(eq(generatedCurricula.goalHash, goalHash))
          .limit(1);
        if (cached[0]) {
          // Update hit stats
          await db.update(generatedCurricula)
            .set({ hitCount: cached[0].hitCount + 1, lastHitAt: new Date() })
            .where(eq(generatedCurricula.id, cached[0].id));
          const curriculum = cached[0].curriculumJson as any;
          // Still enqueue lessons so this user's lessons are generated (they may not exist)
          for (let i = 0; i < curriculum.phases.length; i++) {
            await db.insert(backgroundJobs).values({
              type: "GENERATE_LESSON",
              payload: { cookieId, curriculumId, phase: curriculum.phases[i], index: i, difficulty: input.currentLevel, interests: input.interests, learnStyle, background },
              status: "pending",
            });
          }
          return { ...curriculum, curriculumId, cached: true };
        }
      }

      // ── Not cached — generate fresh ────────────────────────────────────────────
      const prompt = `Create a personalized learning curriculum for: "${input.goal}". Level: ${input.currentLevel}. Time: ${input.timeAvailable}. Interests: ${allInterestsFallback}.${profileContext}
Return ONLY valid JSON: {"title":"...","description":"...","estimatedWeeks":4,"phases":[{"phase":1,"title":"...","duration":"Week 1-2","objectives":["..."],"resources":[{"title":"...","type":"article|video|book|practice","url":"...","description":"..."}],"milestone":"..."}]}
Create 3-4 phases with real resources and actual URLs.`;
      const response = await callAI(input.cookieId, prompt, undefined, 2048);
      let curriculum: any = null;
      try {
        const m = response.match(/\{[\s\S]*\}/);
        if (m) curriculum = JSON.parse(m[0]);
      } catch (_e) { /* fallback */ }
      if (!curriculum) curriculum = CURRICULUM_FALLBACK(input.goal);

      // ── Save to cache ──────────────────────────────────────────────────────────
      if (db) {
        try {
          await db.insert(generatedCurricula).values({
            goalHash,
            goal: input.goal.slice(0, 500),
            level: input.currentLevel,
            timeAvailable: input.timeAvailable,
            curriculumJson: curriculum,
          });
        } catch { /* concurrent insert race — already saved, fine */ }

        // Enqueue lesson generation as background jobs so the response is immediate
        for (let i = 0; i < curriculum.phases.length; i++) {
          const phase = curriculum.phases[i];
          await db.insert(backgroundJobs).values({
            type: "GENERATE_LESSON",
            payload: { cookieId, curriculumId, phase, index: i, difficulty: input.currentLevel, interests: input.interests, learnStyle, background },
            status: "pending",
          });
        }
      }
      return { ...curriculum, curriculumId };
    }),

  generateLesson: publicProcedure
    .input(z.object({ cookieId: z.string(), curriculumId: z.string(), title: z.string(), objectives: z.array(z.string()), duration: z.string(), order: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // ── Check shared lesson cache first ────────────────────────────────────────
      const existingLessons = await searchSharedLessons(input.title);
      const exactMatch = existingLessons.find(l => l.title.toLowerCase() === input.title.toLowerCase());
      if (exactMatch) {
        await incrementLessonViewCount(exactMatch.id);
        return exactMatch;
      }

      try {
        let profileContext = "";
        const userId = ctx.user?.id;
        if (userId) {
          const profile = await getPsychProfile(userId);
          if (profile) {
            const styleDirective =
              profile.inferredLearnStyle === "visual"         ? "Use diagrams, numbered steps, and visual metaphors." :
              profile.inferredLearnStyle === "socratic"       ? "Pose guiding questions before revealing answers." :
              profile.inferredLearnStyle === "hands-on"       ? "Include a hands-on exercise or mini-project in every section." :
              profile.inferredLearnStyle === "deep-technical" ? "Cover internals, edge cases, and performance trade-offs." :
              "Balance theory, examples, and practice exercises.";
            profileContext = ` Learner background: ${profile.inferredBackground || "general"}. Style: ${profile.inferredLearnStyle || "adaptive"}. ${styleDirective}`;
          }
        }
        const response = await callAI(input.cookieId, `Create a comprehensive lesson on: "${input.title}". Objectives: ${input.objectives.join(", ")}. Duration: ${input.duration}.${profileContext} Detailed, practical, engaging markdown content with examples.`, undefined, 12000);
        const lesson: InsertLesson = { cookieId: input.cookieId, curriculumId: input.curriculumId, title: input.title, description: input.objectives.join(", "), content: response, objectives: input.objectives, keyPoints: input.objectives, resources: [], order: input.order, difficulty: "intermediate", estimatedMinutes: 15 };
        const saved = await saveLesson(lesson);
        return saved || { id: 0, ...lesson, completed: false, completedAt: null, createdAt: new Date(), updatedAt: new Date() };
      } catch (_e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate lesson. The AI service may be unavailable." });
      }
    }),

  getLesson: publicProcedure.input(z.object({ lessonId: z.number() })).query(async ({ input }) => getLessonById(input.lessonId)),
  getLessonsByCurriculum: publicProcedure.input(z.object({ cookieId: z.string(), curriculumId: z.string() })).query(async ({ input }) => getLessonsByCurriculum(input.cookieId, input.curriculumId)),

  completeLesson: publicProcedure
    .input(z.object({ lessonId: z.number(), cookieId: z.string() }))
    .mutation(async ({ input }) => {
      await markLessonComplete(input.lessonId);
      await addXP(input.cookieId, 25);
      return { success: true };
    }),

  askLessonQuestion: publicProcedure
    .input(z.object({ lessonId: z.number(), cookieId: z.string(), question: z.string().max(1000) }))
    .mutation(async ({ input }) => {
      try {
        const q = await askLessonQuestion(input.lessonId, input.cookieId, input.question);
        if (!q) return { error: "Failed to save question" };
        const lesson = await getLessonById(input.lessonId);
        if (!lesson) return { error: "Lesson not found" };
        const prompt = `You are helping a student with the lesson: "${lesson.title}"\n\nLesson content:\n${lesson.content}\n\nStudent question: ${input.question}\n\nProvide a clear, concise answer based on the lesson content.`;
        const answer = await callAI(input.cookieId, prompt, undefined, 1024);
        const saved = await saveLessonAnswer(q.id, answer);
        return { question: q, answer: saved };
      } catch (_e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to answer question. Please try again." });
      }
    }),

  getLessonQA: publicProcedure.input(z.object({ lessonId: z.number() })).query(async ({ input }) => {
    const questions = await getLessonQuestions(input.lessonId);
    return Promise.all(questions.map(async (q) => ({ question: q, answer: await getQuestionAnswer(q.id) })));
  }),
  markAnswerHelpful: publicProcedure.input(z.object({ answerId: z.number() })).mutation(async ({ input }) => { await markAnswerHelpful(input.answerId); return { success: true }; }),

  exploreOffTopic: publicProcedure
    .input(z.object({ cookieId: z.string(), currentTopic: z.string(), relatedTopic: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const content = await callAI(input.cookieId, `Create a comprehensive lesson on: "${input.relatedTopic}" related to "${input.currentTopic}".`, undefined, 12000);
        const lesson: InsertLesson = { cookieId: input.cookieId, curriculumId: `exploration-${Date.now()}`, title: input.relatedTopic, description: `Related exploration from: ${input.currentTopic}`, content, objectives: [`Understand ${input.relatedTopic}`], keyPoints: [], resources: [], order: 0, difficulty: "intermediate", estimatedMinutes: 20, isShared: true, relatedTopics: [input.currentTopic] };
        return saveLesson(lesson);
      } catch (_e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to explore topic. Please try again." });
      }
    }),

  searchSharedLessons: publicProcedure.input(z.object({ query: z.string().max(200) })).query(async ({ input }) => searchSharedLessons(input.query)),

  startSocraticSession: publicProcedure
    .input(z.object({ cookieId: z.string().optional(), topic: z.string().max(500), userLevel: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const question = await callAI(input.cookieId, `You are a Socratic tutor. The student wants to learn about: "${input.topic}". Level: ${input.userLevel}. Start with ONE opening question to reveal what they know. Don't explain — only ask.`, undefined, 256);
        return { question, sessionId: Date.now().toString() };
      } catch (_e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to start session. Please try again." });
      }
    }),

  continueSocraticSession: publicProcedure
    .input(z.object({ cookieId: z.string().optional(), topic: z.string().max(500), history: z.array(z.object({ role: z.enum(["tutor", "student"]), content: z.string() })), userResponse: z.string().max(2000) }))
    .mutation(async ({ input }) => {
      try {
        const historyText = input.history.map((h) => `${h.role === "tutor" ? "Tutor" : "Student"}: ${h.content}`).join("\n");
        const response = await callAI(input.cookieId, `Socratic tutor on "${input.topic}".\n${historyText}\nStudent: ${input.userResponse}\nAcknowledge briefly, redirect misconceptions with a question, ask the next probing question. 2-3 sentences max.`, undefined, 512);
        return { response };
      } catch (_e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to continue session. Please try again." });
      }
    }),

  chat: publicProcedure
    .input(z.object({ cookieId: z.string(), message: z.string().max(2000), profile: z.object({ visitCount: z.number(), pagesVisited: z.array(z.string()), preferredTopics: z.array(z.string()), xp: z.number(), level: z.number() }).optional() }))
    .mutation(async ({ input }) => {
      try {
        const history = await getChatHistory(input.cookieId, 10);
        const chatMessages: Array<{ role: "user" | "assistant"; content: string }> = history.map(msg => ({ role: msg.role === "user" ? "user" as const : "assistant" as const, content: msg.content }));
        const contextNote = input.profile ? `\n\n[Visitor: Visit #${input.profile.visitCount}, explored: ${input.profile.pagesVisited.join(", ")}, XP: ${input.profile.xp}, Level: ${input.profile.level}, interests: ${input.profile.preferredTopics.join(", ")}]` : "";
        chatMessages.push({ role: "user", content: input.message + contextNote });
        const response = await callAIChat(input.cookieId, chatMessages, NEXUS_SYSTEM_PROMPT);
        await saveChatMessage(input.cookieId, "user", input.message);
        await saveChatMessage(input.cookieId, "assistant", response);
        const xpResult = await addXP(input.cookieId, 15);
        return { response, ...xpResult };
      } catch (_e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI chat is unavailable. Please try again or configure an API key in Settings." });
      }
    }),

  composeMessage: publicProcedure
    .input(z.object({ cookieId: z.string().optional(), intent: z.string(), context: z.string().optional() }))
    .mutation(async ({ input }) => {
      try {
        const draft = await callAI(input.cookieId, `Help compose a professional message for someone reaching out to the creator of Nexus. Intent: "${input.intent}". Context: "${input.context || "none"}". Write a polished, concise message (3-4 sentences).`);
        return { draft };
      } catch (_e) {
        return { draft: "" };
      }
    }),
});
