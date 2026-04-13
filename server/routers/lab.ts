import { z } from "zod";
import { visitorProcedure, router } from "../_core/trpc";
import { callAI } from "./shared";

export const labRouter = router({
  promptExperiment: visitorProcedure
    .input(
      z.object({
        task: z.string(),
        technique: z.enum([
          "zero-shot",
          "few-shot",
          "chain-of-thought",
          "role",
        ]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const cookieId = ctx.visitorCookieId!;
      const prompts: Record<string, string> = {
        "zero-shot": input.task,
        "few-shot": `Examples:\nExplain gravity → Gravity pulls objects toward each other.\nExplain photosynthesis → Plants convert sunlight into food.\nNow:\n${input.task}`,
        "chain-of-thought": `Let's think step by step.\n\n${input.task}\n\nReason carefully, showing each step before the final answer.`,
        role: `You are a world-class educator with 30 years at MIT and 12 bestselling books on science communication.\n\n${input.task}`,
      };
      const response = await callAI(
        cookieId,
        prompts[input.technique],
        `You are demonstrating the "${input.technique}" prompting technique. Be thorough and educational.`
      );
      return { response, technique: input.technique };
    }),

  chainOfThought: visitorProcedure
    .input(z.object({ problem: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const cookieId = ctx.visitorCookieId!;
      const prompt = `Break down into numbered reasoning steps. End with final answer.\nProblem: ${input.problem}\nReturn ONLY a JSON array: ["Step 1: ...","Step 2: ...","Final Answer: ..."]`;
      const response = await callAI(
        cookieId,
        prompt,
        "You are a logical reasoning expert. Always return valid JSON arrays.",
        1200
      );
      let steps: string[] = [];
      try {
        const m = response.match(/\[[\s\S]*\]/);
        if (m) steps = JSON.parse(m[0]) as string[];
      } catch (_e) {
        steps = response
          .split("\n")
          .filter((l: string) => l.trim().length > 0)
          .slice(0, 8);
      }
      return { steps: steps.length ? steps : [response] };
    }),

  classifyText: visitorProcedure
    .input(z.object({ text: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const cookieId = ctx.visitorCookieId!;
      const prompt = `Classify this text. Return ONLY valid JSON:\n{"sentiment":"positive|negative|neutral|mixed","topic":"<2-3 words>","intent":"<2-3 words>","tone":"<1-2 words>","confidence":<integer 60-98>}\n\nText: ${input.text.slice(0, 2000)}`;
      const response = await callAI(
        cookieId,
        prompt,
        "You are an NLP classification expert. Always return valid JSON.",
        300
      );
      try {
        const m = response.match(/\{[\s\S]*\}/);
        if (m)
          return JSON.parse(m[0]) as {
            sentiment: string;
            topic: string;
            intent: string;
            tone: string;
            confidence: number;
          };
      } catch (_e) {
        /* fallback */
      }
      return {
        sentiment: "neutral",
        topic: "General",
        intent: "Informational",
        tone: "Neutral",
        confidence: 75,
      };
    }),

  debate: visitorProcedure
    .input(z.object({ topic: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const cookieId = ctx.visitorCookieId!;
      const [pro, con] = await Promise.all([
        callAI(
          cookieId,
          `You are a passionate advocate FOR: "${input.topic}". Make the strongest argument in 3-4 paragraphs.`,
          "You argue FOR the position. Be persuasive.",
          600
        ),
        callAI(
          cookieId,
          `You are a passionate advocate AGAINST: "${input.topic}". Make the strongest counter-argument in 3-4 paragraphs.`,
          "You argue AGAINST the position. Be persuasive.",
          600
        ),
      ]);
      return { pro, con };
    }),

  debugCode: visitorProcedure
    .input(z.object({ code: z.string(), error: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const cookieId = ctx.visitorCookieId!;
      const prompt = `A student has code that produced an error.\n\nCode:\n\`\`\`javascript\n${input.code.slice(0, 3000)}\n\`\`\`\n\nError: ${input.error.slice(0, 500)}\n\nProvide: 1) What caused the error, 2) The fix, 3) A brief explanation of the concept.`;
      const explanation = await callAI(
        cookieId,
        prompt,
        "You are a patient coding tutor. Be clear and educational.",
        600
      );
      return { explanation };
    }),

  tokenCount: visitorProcedure
    .input(
      z.object({
        text: z.string(),
        model: z.enum([
          "gpt-4o",
          "gpt-3.5-turbo",
          "claude-3-opus",
          "gemini-1.5-pro",
          "llama-3-70b",
        ]),
      })
    )
    .mutation(async ({ input }) => {
      const approxTokens = Math.round(input.text.length / 4);
      const pricing: Record<
        string,
        { input: number; output: number; contextWindow: number }
      > = {
        "gpt-4o": { input: 2.5, output: 10.0, contextWindow: 128000 },
        "gpt-3.5-turbo": { input: 0.5, output: 1.5, contextWindow: 16385 },
        "claude-3-opus": { input: 15.0, output: 75.0, contextWindow: 200000 },
        "gemini-1.5-pro": { input: 1.25, output: 5.0, contextWindow: 1000000 },
        "llama-3-70b": { input: 0.59, output: 0.79, contextWindow: 8192 },
      };
      const m = pricing[input.model];
      return {
        tokens: approxTokens,
        characters: input.text.length,
        words: input.text.split(/\s+/).filter(Boolean).length,
        model: input.model,
        inputCostUSD: parseFloat(
          ((approxTokens / 1_000_000) * m.input).toFixed(6)
        ),
        outputCostUSD: parseFloat(
          ((approxTokens / 1_000_000) * m.output).toFixed(6)
        ),
        contextWindowTokens: m.contextWindow,
        contextUsedPercent: Math.min(
          100,
          Math.round((approxTokens / m.contextWindow) * 100)
        ),
        fitsInContext: approxTokens <= m.contextWindow,
      };
    }),

  socraticTutor: visitorProcedure
    .input(
      z.object({
        topic: z.string(),
        userAnswer: z.string().optional(),
        questionNumber: z.number().default(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const cookieId = ctx.visitorCookieId!;
      const isFirst = !input.userAnswer;
      const prompt = isFirst
        ? `You are a Socratic tutor. Topic: "${input.topic}". Ask the FIRST probing question. Open-ended, thought-provoking. Do NOT explain — only ask. 1-2 sentences.`
        : `Socratic tutor on "${input.topic}". Question ${input.questionNumber} of 6. Student answered: "${input.userAnswer}". Acknowledge briefly (1 sentence), ask the NEXT probing question. Never give the answer directly.`;
      const question = await callAI(
        cookieId,
        prompt,
        "You are a Socratic tutor. Never explain — only ask questions that guide discovery.",
        300
      );
      const isComplete = input.questionNumber >= 6;
      let insight = "";
      if (isComplete && input.userAnswer) {
        insight = await callAI(
          cookieId,
          `The student explored "${input.topic}". Last answer: "${input.userAnswer}". Provide a concise synthesis (3-4 sentences) revealing the core insight. Make it an 'aha moment'.`,
          "You are a Socratic tutor delivering the final insight.",
          400
        );
      }
      return { question, isComplete, insight };
    }),

  storyGen: visitorProcedure
    .input(
      z.object({
        genre: z.string(),
        premise: z.string(),
        choice: z.string().optional(),
        storyHistory: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const cookieId = ctx.visitorCookieId!;
      const prompt = !input.choice
        ? `Collaborative storyteller. Genre: ${input.genre}. Premise: "${input.premise}". Write opening scene (3-4 vivid paragraphs). End with EXACTLY 3 choices:\nCHOICE_A: [action]\nCHOICE_B: [action]\nCHOICE_C: [action]`
        : `Collaborative storyteller. Genre: ${input.genre}. Story:\n${input.storyHistory}\n\nReader chose: "${input.choice}". Continue (3-4 paragraphs). End with EXACTLY 3 new choices:\nCHOICE_A: [action]\nCHOICE_B: [action]\nCHOICE_C: [action]`;
      const response = await callAI(
        cookieId,
        prompt,
        "You are a master storyteller. Write vivid, engaging prose.",
        800
      );
      const choiceMatches = response.match(/CHOICE_[ABC]: (.+)/g) ?? [];
      const choices = choiceMatches.map((c: string) =>
        c.replace(/CHOICE_[ABC]: /, "").trim()
      );
      return {
        story: response.replace(/CHOICE_[ABC]: .+/g, "").trim(),
        choices:
          choices.length === 3
            ? choices
            : [
                "Continue the adventure",
                "Take a different path",
                "Seek help from an ally",
              ],
      };
    }),

  biasDetect: visitorProcedure
    .input(z.object({ text: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const cookieId = ctx.visitorCookieId!;
      const prompt = `Analyze for cognitive biases and logical fallacies. Return ONLY valid JSON:\n{"biases":[{"name":"...","quote":"<max 60 chars>","explanation":"...","severity":"low|medium|high"}],"overallScore":<0-100>,"summary":"2-3 sentence assessment"}\n\nText:\n${input.text.slice(0, 3000)}`;
      const response = await callAI(
        cookieId,
        prompt,
        "You are a critical thinking expert. Always return valid JSON.",
        800
      );
      try {
        const m = response.match(/\{[\s\S]*\}/);
        if (m)
          return JSON.parse(m[0]) as {
            biases: Array<{
              name: string;
              quote: string;
              explanation: string;
              severity: string;
            }>;
            overallScore: number;
            summary: string;
          };
      } catch (_e) {
        /* fallback */
      }
      return {
        biases: [],
        overallScore: 75,
        summary: "Unable to analyze. Please try again.",
      };
    }),
});
