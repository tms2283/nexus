/**
 * Lesson templates for the AI Literacy course. Each template is a partial
 * lesson definition consumed by lessonSeedFactory.composeLessonSeed —
 * the factory then specialises it for the active LearnerProfile.
 */

import type { LessonTemplate } from "../../types/lessonSeed";

const lesson1: LessonTemplate = {
  lessonId: "lesson-1",
  courseId: "ai-literacy",
  title: "What AI Actually Is",
  subtitle: "A working definition you can use this week",
  estimatedMinutes: 18,
  xpReward: 60,
  prerequisites: [],
  concepts: ["artificial-intelligence", "narrow-ai", "machine-learning"],
  retrieval: [
    {
      kind: "retrieval",
      id: "l1-r-narrow-vs-general",
      prompt: "Which of these is true of every AI system in production today?",
      requireConfidence: true,
      tier: "core",
      tags: ["narrow-ai", "scope"],
      choices: [
        {
          id: "a",
          text: "It can transfer what it learned to any new task.",
          correct: false,
          rationale:
            "That would be artificial general intelligence (AGI). No deployed system is general — every model has a narrow training distribution.",
        },
        {
          id: "b",
          text: "It excels at a specific task and degrades outside that scope.",
          correct: true,
          rationale:
            "Right — current AI is narrow AI. Performance falls off sharply outside the training distribution.",
        },
        {
          id: "c",
          text: "It understands the meaning of what it produces.",
          correct: false,
          rationale:
            "Models produce statistically plausible outputs without comprehension. Plausibility is not understanding.",
        },
      ],
    },
    {
      kind: "retrieval",
      id: "l1-r-training-data",
      prompt: "An AI's behaviour is most directly shaped by which of the following?",
      requireConfidence: true,
      tier: "core",
      tags: ["training", "data"],
      choices: [
        {
          id: "a",
          text: "The hardware it runs on.",
          correct: false,
          rationale:
            "Hardware affects speed, not what the model learns to predict. Training data and objective shape behaviour.",
        },
        {
          id: "b",
          text: "The data it was trained on and the objective it was optimised for.",
          correct: true,
          rationale:
            "Correct — model behaviour follows from training data + objective function. Both can encode the biases of the people who chose them.",
        },
        {
          id: "c",
          text: "The cleverness of the prompt at inference time.",
          correct: false,
          rationale:
            "Prompts steer behaviour within bounds, but the model can only do what training equipped it to do.",
        },
      ],
    },
    {
      kind: "retrieval",
      id: "l1-r-stretch-distribution",
      prompt:
        "A medical-imaging classifier trained on US adult patients is deployed in a paediatric clinic in another country. What is the most likely failure mode?",
      requireConfidence: true,
      tier: "stretch",
      tags: ["distribution-shift", "narrow-ai"],
      choices: [
        {
          id: "a",
          text: "It will refuse to make predictions outside its training distribution.",
          correct: false,
          rationale:
            "Models do not know what they don't know. They produce predictions even on out-of-distribution inputs — usually with miscalibrated confidence.",
        },
        {
          id: "b",
          text: "It will produce confident but systematically biased predictions.",
          correct: true,
          rationale:
            "Distribution shift breaks the assumption that train and deploy come from the same population. Outputs remain confident; accuracy falls silently.",
        },
        {
          id: "c",
          text: "It will retrain itself to match the new population.",
          correct: false,
          rationale:
            "Models do not retrain themselves at inference. A separate fine-tuning step on representative data would be required.",
        },
      ],
    },
  ],
};

const lesson2: LessonTemplate = {
  lessonId: "lesson-2",
  courseId: "ai-literacy",
  title: "Myths Worth Unlearning",
  subtitle: "What AI is not — and why it matters for the choices you make",
  estimatedMinutes: 16,
  xpReward: 65,
  prerequisites: ["lesson-1"],
  concepts: ["bias", "hallucination"],
  retrieval: [
    {
      kind: "retrieval",
      id: "l2-r-objectivity",
      prompt: "A bank deploys an AI loan approval model. Which statement is most accurate?",
      requireConfidence: true,
      tier: "core",
      tags: ["bias", "fairness"],
      choices: [
        {
          id: "a",
          text: "Because the model is mathematical, its decisions are inherently objective.",
          correct: false,
          rationale:
            "Math does not erase bias — it scales it. The model learned from past human decisions, which may have been biased.",
        },
        {
          id: "b",
          text: "The model can reproduce and amplify whatever biases existed in its training data.",
          correct: true,
          rationale:
            "Right — algorithmic decisions inherit the patterns of past data, including biased patterns. Fairness requires intentional intervention.",
        },
        {
          id: "c",
          text: "Bias only matters if the model uses race or gender as an input.",
          correct: false,
          rationale:
            "Proxies like ZIP code, name, or income history can encode the same disparities even when protected attributes are excluded.",
        },
      ],
    },
    {
      kind: "retrieval",
      id: "l2-r-confidence-vs-truth",
      prompt:
        "An LLM gives you a confident, well-written answer to a niche question. Which response is most appropriate?",
      requireConfidence: true,
      tier: "core",
      tags: ["hallucination", "verification"],
      choices: [
        {
          id: "a",
          text: "Trust it — confident tone usually correlates with correctness.",
          correct: false,
          rationale:
            "It does not. Hallucinations sound exactly as confident as facts. Tone is not a truth signal.",
        },
        {
          id: "b",
          text: "Verify the claim against an authoritative source before relying on it.",
          correct: true,
          rationale:
            "Correct — assume confident output means the model produced plausible-sounding text, not verified truth. Always cross-check.",
        },
        {
          id: "c",
          text: "Re-prompt with 'are you sure?' — if it stands by the answer, it is reliable.",
          correct: false,
          rationale:
            "Self-reported certainty from an LLM is not calibrated. It will often double down on a hallucinated claim.",
        },
      ],
    },
    {
      kind: "retrieval",
      id: "l2-r-stretch-replacement",
      prompt:
        "A consultancy claims their AI will 'replace junior analysts within a year.' What is the strongest evidence-based critique?",
      requireConfidence: true,
      tier: "stretch",
      tags: ["expertise", "automation"],
      choices: [
        {
          id: "a",
          text: "Junior analysts do narrow tasks the AI can handle, so the claim is reasonable.",
          correct: false,
          rationale:
            "Even narrow tasks involve context, accountability, and judgment that current systems do not supply on their own.",
        },
        {
          id: "b",
          text: "Expert work involves judgment and accountability that today's narrow AI cannot supply alone.",
          correct: true,
          rationale:
            "Right — automation tends to reshape jobs (eliminating some sub-tasks, elevating others), not vaporise roles wholesale.",
        },
        {
          id: "c",
          text: "AI will never improve enough to do analytical work.",
          correct: false,
          rationale:
            "Overconfident in the other direction. The right answer is 'narrow AI augments rather than replaces; future capability is uncertain.'",
        },
      ],
    },
  ],
  closingReflection: {
    kind: "reflection",
    id: "lesson-2-reflection",
    prompt:
      "Pick one place in your work or life where someone you know has put too much trust in an AI's output. What would a healthier verification habit look like?",
    cues: [
      "Be concrete: who, what tool, what kind of claim.",
      "Describe the verification step in one sentence — short enough to actually do.",
    ],
  },
};

const lesson3: LessonTemplate = {
  lessonId: "lesson-3",
  courseId: "ai-literacy",
  title: "Prompts as Conversations, Not Spells",
  subtitle: "Iteration, context, and verification beat 'magic phrases'",
  estimatedMinutes: 22,
  xpReward: 75,
  prerequisites: ["lesson-1", "lesson-2"],
  concepts: ["prompt", "llm", "hallucination"],
  retrieval: [
    {
      kind: "retrieval",
      id: "l3-r-prompt-iteration",
      prompt:
        "Your first prompt produced a vague answer. What is the most effective next step?",
      requireConfidence: true,
      tier: "core",
      tags: ["prompting", "iteration"],
      choices: [
        {
          id: "a",
          text: "Add a known 'magic phrase' like 'you are an expert.'",
          correct: false,
          rationale:
            "Persona prompts can help marginally but are not the lever. Specificity, context, and constraints do more.",
        },
        {
          id: "b",
          text: "Add concrete context, examples, and constraints; iterate on what was vague.",
          correct: true,
          rationale:
            "Right — treat the prompt as a conversation. Give the model what it needs: audience, format, examples, what to avoid.",
        },
        {
          id: "c",
          text: "Switch to a different model and try the exact same prompt.",
          correct: false,
          rationale:
            "Sometimes worth trying, but it skips the diagnostic step. The prompt itself is usually the variable you control best.",
        },
      ],
    },
    {
      kind: "retrieval",
      id: "l3-r-stretch-context-window",
      prompt:
        "When you paste a long document and ask the model to summarise it, what is a real risk to be aware of?",
      requireConfidence: true,
      tier: "stretch",
      tags: ["llm", "context"],
      choices: [
        {
          id: "a",
          text: "The model may pay disproportionate attention to the start and end and miss material in the middle.",
          correct: true,
          rationale:
            "Yes — 'lost in the middle' is a documented LLM failure. For critical material, chunk and summarise in passes, or ask targeted questions.",
        },
        {
          id: "b",
          text: "The model will refuse if the document is over 500 words.",
          correct: false,
          rationale:
            "Modern models accept long contexts. The risk is degraded attention across that context, not refusal.",
        },
        {
          id: "c",
          text: "The model will retrain on the document you pasted.",
          correct: false,
          rationale:
            "Inference does not retrain the model. (Some products may log inputs for future training — separate concern, check the policy.)",
        },
      ],
    },
  ],
  extraSections: [
    {
      kind: "productive-failure",
      id: "lesson-3-pf-prompt-attempt",
      scenario:
        "You need to ask an LLM to draft a polite, firm reply declining a meeting that someone has rescheduled three times. Before you read on, draft your prompt below — exactly as you would type it.",
      learnerPrompt:
        "Write the prompt you would actually send. Don't worry about getting it 'right' — the goal is to surface what feels natural to you so you can compare it to a stronger version.",
      canonicalInsight:
        "A high-leverage prompt usually contains: (1) the role/audience ('you are writing as me, a project manager'), (2) the goal ('decline politely without offering a new time'), (3) constraints ('under 80 words, no apologies, warm but firm'), and (4) one example of tone if you have it. Notice how much of that came from outside the immediate request — that context is what does the work.",
    },
    {
      kind: "span-select",
      id: "lesson-3-span-hallucination",
      instructions:
        "The paragraph below was generated by an LLM. One claim is a hallucination — a fabricated fact stated confidently. Highlight the hallucinated span.",
      paragraph:
        "Alan Turing proposed the idea of a universal computing machine in his 1936 paper 'On Computable Numbers'. He later led the team at Bletchley Park that broke the Enigma cipher. In 1953 he received the Nobel Prize in Physics for his contributions to computer science. He died in 1954.",
      hallucinatedSpans: [[160, 235]],
      explanation:
        "Turing never received a Nobel Prize — there is no Nobel in computer science, and he was not a Physics laureate. The rest of the paragraph is broadly accurate. This is exactly how hallucinations slip in: one false sentence between true ones, in a confident tone.",
    },
  ],
  closingReflection: {
    kind: "reflection",
    id: "lesson-3-reflection",
    prompt:
      "Think of a real prompt you wrote in the last week. Rewrite it now using what you learned about role, goal, and constraints. What changed?",
    cues: [
      "Paste your before-and-after if it helps you see the shift.",
      "Notice which addition made the biggest difference — that's the lever you'll reach for next time.",
    ],
  },
};

const lesson4: LessonTemplate = {
  lessonId: "lesson-4",
  courseId: "ai-literacy",
  title: "Ethics, Power, and Who Decides",
  subtitle: "Whose values are encoded — and what your role is in shaping that",
  estimatedMinutes: 20,
  xpReward: 80,
  prerequisites: ["lesson-2"],
  concepts: ["bias"],
  retrieval: [
    {
      kind: "retrieval",
      id: "l4-r-accountability",
      prompt:
        "An AI screening tool rejects a qualified candidate. Who is most appropriately accountable?",
      requireConfidence: true,
      tier: "core",
      tags: ["accountability", "ethics"],
      choices: [
        {
          id: "a",
          text: "The model — it made the decision.",
          correct: false,
          rationale:
            "Models cannot bear accountability. Accountability stays with the humans and organisations who deployed the model and shaped its decision boundary.",
        },
        {
          id: "b",
          text: "The organisation that deployed the tool, including those who chose, configured, and audited it.",
          correct: true,
          rationale:
            "Correct — accountability for automated decisions sits with the people and institutions that delegated the decision to the system.",
        },
        {
          id: "c",
          text: "The candidate, for not optimising their résumé for the AI.",
          correct: false,
          rationale:
            "Shifting accountability to the person harmed by the system is exactly the failure mode we're trying to avoid naming.",
        },
      ],
    },
    {
      kind: "retrieval",
      id: "l4-r-stretch-consent",
      prompt:
        "Your employer rolls out an AI tool that summarises every meeting you attend. Which question matters most to ask?",
      requireConfidence: true,
      tier: "stretch",
      tags: ["consent", "data", "power"],
      choices: [
        {
          id: "a",
          text: "Whether the AI's summaries are grammatically polished.",
          correct: false,
          rationale:
            "Polish is the least of the concerns when the data being captured is everyone's spoken contributions.",
        },
        {
          id: "b",
          text: "Who has access to the recordings and summaries, what they're used for, and how long they're retained.",
          correct: true,
          rationale:
            "Right — consent, access, purpose, and retention are the load-bearing questions. Opacity here is the harm vector.",
        },
        {
          id: "c",
          text: "Whether the AI accurately captures who said what.",
          correct: false,
          rationale:
            "Accuracy matters, but it's downstream of the more fundamental questions about access and purpose.",
        },
      ],
    },
  ],
  extraSections: [
    {
      kind: "productive-failure",
      id: "lesson-4-pf-tradeoff",
      scenario:
        "A city wants to use AI to allocate social services more efficiently. The model will direct resources to the neighbourhoods 'most likely to need them' based on historical service-call data.",
      learnerPrompt:
        "Before reading the analysis, write down: what could go wrong here? List the strongest objection you can think of.",
      canonicalInsight:
        "The historical service-call data reflects who has historically called for help — which depends on trust in institutions, immigration status, language access, and prior treatment. Optimising on that proxy can entrench under-service of communities that were already under-served. The technical fix isn't the model; it's choosing a different objective and consulting the affected communities.",
    },
  ],
  closingReflection: {
    kind: "reflection",
    id: "lesson-4-reflection",
    prompt:
      "Identify one AI system you encounter regularly (at work, in apps, in services). Who benefits from how it's set up, and who bears the costs of its mistakes? Is there a mismatch?",
    cues: [
      "Be specific about the system and the people on each side.",
      "Naming a mismatch isn't an accusation — it's the first step toward asking better questions of the people deploying it.",
    ],
  },
};

const lesson5: LessonTemplate = {
  lessonId: "lesson-5",
  courseId: "ai-literacy",
  title: "Capstone — Your AI Use Charter",
  subtitle: "Synthesise what you've learned into a personal practice",
  estimatedMinutes: 25,
  xpReward: 120,
  prerequisites: ["lesson-1", "lesson-2", "lesson-3", "lesson-4"],
  concepts: ["artificial-intelligence"],
  retrieval: [
    {
      kind: "retrieval",
      id: "l5-r-synthesis",
      prompt:
        "Across this course, what is the single most reliable habit for using AI well?",
      requireConfidence: true,
      tier: "core",
      tags: ["synthesis", "practice"],
      choices: [
        {
          id: "a",
          text: "Always pick the latest, largest model.",
          correct: false,
          rationale:
            "Tool choice matters less than how you use the tool. Habits beat hardware.",
        },
        {
          id: "b",
          text: "Treat AI output as a draft to verify, not a verdict to trust.",
          correct: true,
          rationale:
            "Right — this single habit absorbs hallucination, bias, and overconfidence in one stroke. Everything else flows from it.",
        },
        {
          id: "c",
          text: "Memorise prompt templates from popular guides.",
          correct: false,
          rationale:
            "Templates can be useful starts but they're not the lever. Iteration and context fit do more than memorisation.",
        },
      ],
    },
  ],
  extraSections: [
    {
      kind: "rubric",
      id: "lesson-5-charter",
      prompt:
        "Write a personal AI Use Charter (4–8 sentences). It should answer: (1) where you'll use AI, (2) where you won't, (3) how you'll verify, (4) one ethical line you won't cross. Be specific to your work and life.",
      rubricCriteria: [
        {
          label: "Specificity",
          description:
            "Does the charter name concrete situations and tools, not just generalities?",
          weight: 3,
        },
        {
          label: "Verification habit",
          description:
            "Is there a clear, doable verification step the learner can actually perform?",
          weight: 3,
        },
        {
          label: "Ethical clarity",
          description:
            "Does the charter name at least one clear line the learner won't cross, with reasoning?",
          weight: 2,
        },
        {
          label: "Honesty about limits",
          description:
            "Does the learner acknowledge their own uncertainty or areas they're still learning?",
          weight: 2,
        },
      ],
      gradingInstructions:
        "Grade strictly on the rubric. Reward specificity over polish. Penalise vague platitudes ('I will use AI responsibly') and reward concrete commitments ('When I use AI to draft client emails I will read every sentence aloud before sending').",
    },
  ],
  closingReflection: {
    kind: "reflection",
    id: "lesson-5-reflection",
    prompt:
      "Save your Charter somewhere you'll see it (Notes app, pinned tab, calendar). In one sentence, when will you re-read and revise it?",
    cues: [
      "A charter that lives in a closed file is a charter that doesn't shape behaviour.",
      "Pick a real cadence — quarterly, after every major project, monthly review.",
    ],
  },
};

export const AI_LITERACY_TEMPLATES: Record<string, LessonTemplate> = {
  "lesson-1": lesson1,
  "lesson-2": lesson2,
  "lesson-3": lesson3,
  "lesson-4": lesson4,
  "lesson-5": lesson5,
};
