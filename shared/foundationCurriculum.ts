import {
  aiModuleSeeds,
  logicModuleSeeds,
  type FoundationLessonSeed,
  type FoundationModuleSeed,
} from "./foundationSeeds";

export type FoundationCourseId = "ai-clarity" | "reason-well";

export type LessonCheckpoint = {
  questionType: "multiple_choice" | "open_ended";
  question: string;
  options?: string[];
  correctAnswer?: string;
};

export type FoundationLesson = {
  id: string;
  title: string;
  focus: string;
  durationMinutes: number;
  heroStatement: string;
  scenario: string;
  trap: string;
  whyThisWins: string;
  misconceptions: string[];
  diagram: {
    title: string;
    bullets: string[];
  };
  motionStoryboard: string[];
  posterPath: string;
  beats: {
    hook: string;
    explain: string;
    visualize: string;
    check: string;
    apply: string;
    reflect: string;
  };
  checkpoint: LessonCheckpoint;
  flashcards: Array<{ front: string; back: string }>;
};

export type FoundationModule = {
  id: string;
  title: string;
  purpose: string;
  outcomes: string[];
  signatureInteractions: string[];
  capstone: string;
  estimatedMinutes: number;
  modulePosterPath: string;
  lessons: FoundationLesson[];
};

export type FoundationCourse = {
  id: FoundationCourseId;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  level: "beginner" | "intermediate";
  totalHours: number;
  posterPath: string;
  outcomes: string[];
  visualMotif: string[];
  premiumExpansionTracks: string[];
  differentiationEdge: string[];
  modules: FoundationModule[];
};

export type FoundationTrack = {
  id: "nexus-foundation";
  label: string;
  completionReward: string;
  positioning: string;
  differentiation: string[];
  rollout: string[];
  integrationPoints: string[];
  researchBasis: string[];
  courses: FoundationCourse[];
};

function toLessonId(moduleId: string, index: number): string {
  return `${moduleId}-l${index + 1}`;
}

function assetPath(kind: "courses" | "modules" | "lessons", id: string): string {
  return `/foundation/${kind}/${id}.svg`;
}

function coursePalette(courseId: FoundationCourseId) {
  return courseId === "ai-clarity"
    ? {
        accent: "AI trust calibration, real-world workflows, and verification discipline",
        motifs: ["signal", "systems", "patterns", "tools"],
        lens: "Before you trust the output, ask what the system is actually doing, what it might miss, and what must be checked by a human.",
      }
    : {
        accent: "argument mapping, evidence discipline, and fair-minded judgment",
        motifs: ["structure", "argument maps", "evidence", "clarity"],
        lens: "Before you accept the claim, separate the conclusion from the reasons, surface the assumptions, and judge the evidence fairly.",
      };
}

function makeCheckpoint(courseId: FoundationCourseId, lesson: FoundationLessonSeed, index: number): LessonCheckpoint {
  if (index % 2 === 0) {
    return {
      questionType: "open_ended",
      question: `In one clear paragraph, explain why ${lesson.title.toLowerCase()} matters in the real scenario from this lesson.`,
    };
  }

  return {
    questionType: "multiple_choice",
    question: `Which habit best reflects the lesson on "${lesson.title}"?`,
    options:
      courseId === "ai-clarity"
        ? [
            "Trust confident output by default",
            "Use the tool, then verify claims and constraints before acting",
            "Avoid all AI use forever",
            "Treat prompting as a magic trick",
          ]
        : [
            "Accept arguments that sound polished",
            "Separate claims, reasons, evidence, and assumptions before judging",
            "Name a fallacy immediately and stop there",
            "Trust sources with the strongest tone",
          ],
    correctAnswer:
      courseId === "ai-clarity"
        ? "Use the tool, then verify claims and constraints before acting"
        : "Separate claims, reasons, evidence, and assumptions before judging",
  };
}

function buildLesson(
  courseId: FoundationCourseId,
  module: FoundationModuleSeed,
  lesson: FoundationLessonSeed,
  index: number
): FoundationLesson {
  const checkpoint = makeCheckpoint(courseId, lesson, index);
  const lessonId = toLessonId(module.id, index);
  const palette = coursePalette(courseId);
  const explainLead =
    courseId === "ai-clarity"
      ? `${lesson.title} gives learners a better mental model for using AI without outsourcing judgment.`
      : `${lesson.title} gives learners a cleaner way to evaluate claims before confidence, rhetoric, or familiarity take over.`;
  const visualizeLead =
    courseId === "ai-clarity"
      ? "Use the diagram as a trust-calibration tool, not as decoration."
      : "Use the diagram to make reasoning structure visible before evaluating it.";
  const applyLead =
    courseId === "ai-clarity"
      ? "The goal is not to memorize the idea, but to build a repeatable habit for AI-assisted work."
      : "The goal is not to memorize the label, but to practice a repeatable move in real judgment.";

  return {
    id: lessonId,
    title: lesson.title,
    focus: `${lesson.title} trains a durable judgment habit learners can apply in work, media, and AI-assisted decisions.`,
    durationMinutes: 14,
    heroStatement: `${lesson.title} is about seeing the hidden structure inside a decision before the stakes rise.`,
    scenario: lesson.scenario,
    trap: lesson.trap,
    whyThisWins: `Unlike broad intro courses, this lesson turns ${lesson.title.toLowerCase()} into a practical operating skill through a real scenario, a visual model, a retrieval gate, and a transfer task built around ${palette.accent}.`,
    misconceptions: [
      lesson.trap,
      courseId === "ai-clarity"
        ? "Fluent AI output is the same thing as verified knowledge."
        : "A confident or familiar claim is probably a well-reasoned claim.",
    ],
    diagram: {
      title: lesson.visual,
      bullets: [
        `Start with the concrete case: ${lesson.scenario}`,
        `Name the hidden structure: ${lesson.visual}`,
        `Watch for the trap: ${lesson.trap}`,
        `Transfer the habit immediately: ${lesson.challenge}`,
      ],
    },
    motionStoryboard: [
      `Cold open on the core tension in this scenario: ${lesson.scenario}`,
      `Reveal the hidden pattern with an annotated visual: ${lesson.visual}`,
      `Pause on the most common error: ${lesson.trap}`,
      `End on the transfer move learners should try next: ${lesson.challenge}`,
    ],
    posterPath: assetPath("lessons", lessonId),
    beats: {
      hook: lesson.hook
        ? `Hook: ${lesson.hook}\n\nScenario: ${lesson.scenario}\n\nWhy this matters: the mistake in this scenario feels reasonable in the moment, which is exactly why learners need a durable habit instead of a definition. ${palette.lens}`
        : `Hook: ${lesson.scenario}\n\nWhy this matters: the mistake in this scenario feels reasonable in the moment, which is exactly why learners need a durable habit instead of a definition. ${palette.lens}`,
      explain: [
        `Explain: ${explainLead} Start in plain language, connect it to ${module.purpose.toLowerCase()}, then make the boundary conditions explicit.`,
        lesson.callback ? `Connect back: ${lesson.callback}` : null,
        lesson.mechanism ? `Mechanism (the 'why' layer): ${lesson.mechanism}` : null,
        `Key clarification: ${lesson.title} is useful because it helps learners notice what is usually invisible before a bad decision feels obvious. Common trap to surface directly: ${lesson.trap}`,
      ].filter(Boolean).join("\n\n"),
      visualize: [
        `Visualize: ${lesson.visual}`,
        `${visualizeLead} Walk left to right through the model, label each step, and show exactly where the reasoning or trust mistake tends to enter.`,
        lesson.realCase ? `Documented case to anchor the diagram: ${lesson.realCase}` : null,
      ].filter(Boolean).join("\n\n"),
      check: checkpoint.question,
      apply: `Apply: ${lesson.challenge}\n\n${applyLead} Ask the learner to produce a concrete artifact, not just an opinion.`,
      reflect: [
        `Reflect: where in your work, media diet, relationships, or AI use would avoiding "${lesson.trap}" improve judgment this week?`,
        `Write one sentence that starts with: "The next time I notice this pattern, I will..."`,
        lesson.retrievalCue ? `Retrieval warmup for the next lesson: ${lesson.retrievalCue}` : null,
      ].filter(Boolean).join("\n\n"),
    },
    checkpoint,
    flashcards: [
      { front: `Core idea in ${lesson.title}?`, back: lesson.mechanism ?? `${lesson.title} helps learners recognize and act on the hidden structure inside a practical decision.` },
      { front: `Most common trap in ${lesson.title}?`, back: lesson.trap },
      { front: `What question should you ask during ${lesson.title}?`, back: palette.lens },
      { front: `How do you apply ${lesson.title}?`, back: lesson.challenge },
      ...(lesson.realCase ? [{ front: `Real-world case for ${lesson.title}?`, back: lesson.realCase }] : []),
    ],
  };
}

function buildCourse(seed: {
  id: FoundationCourseId;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  outcomes: string[];
  premiumExpansionTracks: string[];
  differentiationEdge: string[];
  modules: FoundationModuleSeed[];
}): FoundationCourse {
  const palette = coursePalette(seed.id);
  const totalHours = Math.round((seed.modules.reduce((sum, module) => sum + module.estimatedMinutes, 0) / 60) * 10) / 10;
  return {
    id: seed.id,
    badge: seed.badge,
    title: seed.title,
    subtitle: seed.subtitle,
    description: seed.description,
    level: "beginner",
    totalHours,
    posterPath: assetPath("courses", seed.id),
    outcomes: seed.outcomes,
    visualMotif: palette.motifs,
    premiumExpansionTracks: seed.premiumExpansionTracks,
    differentiationEdge: seed.differentiationEdge,
    modules: seed.modules.map((module) => ({
      id: module.id,
      title: module.title,
      purpose: module.purpose,
      outcomes: module.outcomes,
      signatureInteractions: module.signatureInteractions,
      capstone: module.capstone,
      estimatedMinutes: module.estimatedMinutes,
      modulePosterPath: assetPath("modules", module.id),
      lessons: module.lessons.map((lesson, index) => buildLesson(seed.id, module, lesson, index)),
    })),
  };
}

const aiCourse = buildCourse({
  id: "ai-clarity",
  badge: "AI Literacy",
  title: "AI Clarity: Understand, Use, and Judge Artificial Intelligence",
  subtitle: "Use AI powerfully without surrendering judgment",
  description:
    "A practical AI literacy course for non-specialists who need better instincts for how AI works, where it fails, and how to use it responsibly.",
  outcomes: [
    "Explain AI in plain language.",
    "Choose the right AI tool for the job.",
    "Detect hallucinations, bias, and false confidence.",
    "Use prompting as a collaboration skill rather than a trick.",
    "Apply verification before acting on AI output.",
    "Evaluate ethical and workplace tradeoffs with nuance.",
  ],
  premiumExpansionTracks: [
    "Prompt Mastery",
    "AI for Business and Productivity",
    "AI for Research and Writing",
    "AI Ethics and Governance",
    "Building With AI Tools",
  ],
  differentiationEdge: [
    "Practical trust calibration instead of hype or fear.",
    "Workflow and verification habits instead of prompt gimmicks.",
    "Real-world transfer tasks in every lesson.",
  ],
  modules: aiModuleSeeds,
});

const logicCourse = buildCourse({
  id: "reason-well",
  badge: "Logic & Reason",
  title: "Reason Well: Logic, Evidence, and Better Judgment",
  subtitle: "Think clearly, evaluate better, decide wiser",
  description:
    "A practical critical-thinking curriculum that makes logic usable in conversation, work, media, and AI-assisted contexts.",
  outcomes: [
    "Identify claims, premises, assumptions, and conclusions.",
    "Distinguish deductive validity from inductive strength.",
    "Recognize fallacies without turning reasoning into label-hunting.",
    "Evaluate evidence quality and source credibility.",
    "Separate causal claims from correlation and noise.",
    "Apply logic to real conversations, work decisions, and AI outputs.",
  ],
  premiumExpansionTracks: [
    "Fallacies in Media and Politics",
    "Decision-Making Under Uncertainty",
    "Evidence and Scientific Thinking",
    "Negotiation, Persuasion, and Rational Dialogue",
    "Reasoning for Leaders and Builders",
  ],
  differentiationEdge: [
    "Argument analysis in ordinary language rather than textbook abstraction.",
    "Evidence and media literacy tied directly to modern information overload.",
    "Deliberate crossover with AI literacy so reasoning improves machine-assisted work.",
  ],
  modules: logicModuleSeeds,
});

export const foundationTrack: FoundationTrack = {
  id: "nexus-foundation",
  label: "The Nexus Foundation",
  completionReward: "Foundation Thinker badge",
  positioning:
    "AI teaches how machines generate outputs; Logic & Reason teaches how humans should evaluate and decide around those outputs.",
  differentiation: [
    "Every lesson follows Hook, Explain, Visualize, Check, Apply, Reflect.",
    "Each lesson is organized into short segments with one core visual and one retrieval gate.",
    "Lessons are built around everyday decision quality, not abstract inspiration.",
    "Cross-course integration makes AI literacy and critical reasoning reinforce each other.",
  ],
  rollout: [
    "8 modules per course",
    "4-6 lessons per module",
    "One visual concept per lesson",
    "One retrieval gate per lesson",
    "One end-of-module challenge per module",
    "One final capstone per course",
  ],
  integrationPoints: [
    "AI Module 4 connects directly to Logic Module 7 on evidence and credibility.",
    "AI Module 8 pulls argument and evidence tools from Logic Modules 3, 5, and 7.",
    "Logic Module 7 treats AI output as a live credibility case study.",
    "Logic Module 8 closes with a human reasoning loop for AI-assisted work.",
  ],
  researchBasis: [
    "Short, segmented lessons reduce overload and improve attention.",
    "Annotated visuals and signaling improve recall in online learning.",
    "Frequent low-stakes retrieval improves retention and transfer.",
    "Adult learners respond best when the material is organized around real use cases and decisions.",
  ],
  courses: [aiCourse, logicCourse],
};

export function foundationCoursePosterPath(courseId: FoundationCourseId): string {
  return assetPath("courses", courseId);
}

export function getFoundationCourse(courseId: FoundationCourseId): FoundationCourse | undefined {
  return foundationTrack.courses.find((course) => course.id === courseId);
}

export function getFoundationModule(courseId: FoundationCourseId, moduleId: string): FoundationModule | undefined {
  return getFoundationCourse(courseId)?.modules.find((module) => module.id === moduleId);
}

export function getFoundationLesson(courseId: FoundationCourseId, moduleId: string, lessonId: string): FoundationLesson | undefined {
  return getFoundationModule(courseId, moduleId)?.lessons.find((lesson) => lesson.id === lessonId);
}
