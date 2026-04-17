import {
  getPsychProfile,
  getPsychProfileSignals,
  recordPsychProfileSignal,
  savePsychProfile,
  upsertPsychProfile,
} from "../db";

type LearnStyle = "deep-technical" | "visual" | "socratic" | "hands-on";

type QuizAnswers = Record<string, string>;

type AnalyzerSignalInput = {
  source: string;
  signalType: string;
  path?: string | null;
  topic?: string | null;
  metrics?: Record<string, unknown>;
};

const DEFAULT_PROFILE = {
  inferredBackground: "curious learner",
  inferredInterests: ["learning"],
  inferredGoal: "explore broadly",
  inferredLearnStyle: "deep-technical" as LearnStyle,
};

function normalizeStyle(style: string | null | undefined): LearnStyle {
  switch (style) {
    case "visual":
    case "socratic":
    case "hands-on":
    case "deep-technical":
      return style;
    case "deep dives":
      return "deep-technical";
    default:
      return "deep-technical";
  }
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function asNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function titleCase(value: string): string {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function sanitizeTopic(value: string): string | null {
  const cleaned = value.trim().replace(/\s+/g, " ");
  if (!cleaned) return null;
  if (cleaned.length <= 64) return cleaned;
  return `${cleaned.slice(0, 61)}...`;
}

export function inferProfileFromQuiz(answers: QuizAnswers) {
  const bg = answers.q1 ?? "";
  const interest = answers.q2 ?? "";
  const goal = answers.q3 ?? "";
  const style = answers.q4 ?? "";

  const backgroundMap: Record<string, string> = {
    A: "developer",
    B: "designer",
    C: "business",
    D: "curious learner",
  };
  const interestMap: Record<string, string> = {
    A: "personalized learning",
    B: "AI research",
    C: "coding challenges",
    D: "knowledge exploration",
  };
  const goalMap: Record<string, string> = {
    A: "master a technical skill",
    B: "understand a topic deeply",
    C: "stay current with AI trends",
    D: "explore broadly",
  };
  const styleMap: Record<string, LearnStyle> = {
    A: "deep-technical",
    B: "visual",
    C: "socratic",
    D: "hands-on",
  };

  return {
    inferredBackground:
      backgroundMap[bg.charAt(0).toUpperCase()] ?? DEFAULT_PROFILE.inferredBackground,
    inferredInterests: [
      interestMap[interest.charAt(0).toUpperCase()] ?? DEFAULT_PROFILE.inferredInterests[0],
    ],
    inferredGoal:
      goalMap[goal.charAt(0).toUpperCase()] ?? DEFAULT_PROFILE.inferredGoal,
    inferredLearnStyle:
      styleMap[style.charAt(0).toUpperCase()] ?? DEFAULT_PROFILE.inferredLearnStyle,
  };
}

function extractTopicsFromSignal(signal: {
  topic: string | null;
  signalType: string;
  path: string | null;
  metrics: Record<string, unknown> | null;
}) {
  const topics = new Set<string>();

  const add = (value: string | null | undefined) => {
    if (!value) return;
    const clean = sanitizeTopic(value);
    if (clean) topics.add(clean);
  };

  add(signal.topic);

  for (const tag of asStringArray(signal.metrics?.tags)) add(tag);
  for (const tag of asStringArray(signal.metrics?.topics)) add(tag);

  const testId = typeof signal.metrics?.testId === "string" ? signal.metrics.testId : null;
  if (testId) add(titleCase(testId));

  if (signal.path?.includes("/research")) add("Research");
  if (signal.path?.includes("/testing")) add("Testing");
  if (signal.path?.includes("/mindmap")) add("Mind Mapping");

  return Array.from(topics);
}

function buildProfileFromSignals(currentProfile: {
  quizAnswers?: Record<string, string> | null;
  inferredBackground?: string | null;
  inferredInterests?: string[] | null;
  inferredGoal?: string | null;
  inferredLearnStyle?: string | null;
} | null, signals: Array<{
  source: string;
  signalType: string;
  path: string | null;
  topic: string | null;
  metrics: Record<string, unknown> | null;
}>) {
  const baseQuiz = currentProfile?.quizAnswers ?? undefined;
  const baseline = baseQuiz ? inferProfileFromQuiz(baseQuiz) : DEFAULT_PROFILE;

  const interestSet = new Set<string>([
    ...baseline.inferredInterests,
    ...asStringArray(currentProfile?.inferredInterests),
  ]);

  const styleScores: Record<LearnStyle, number> = {
    "deep-technical": 0,
    visual: 0,
    socratic: 0,
    "hands-on": 0,
  };
  styleScores[normalizeStyle(currentProfile?.inferredLearnStyle)] += 3;
  styleScores[baseline.inferredLearnStyle] += 4;

  let researchCount = 0;
  let testingCount = 0;
  let mindMapCount = 0;

  for (const signal of signals) {
    extractTopicsFromSignal(signal).forEach(topic => {
      interestSet.add(topic);
    });

    if (signal.source === "research") {
      researchCount += 1;
      styleScores["deep-technical"] += 2;
      styleScores.socratic += 1;
    }

    if (signal.source === "testing") {
      testingCount += 1;
      styleScores["deep-technical"] += 2;
    }

    if (signal.source === "mindmap") {
      mindMapCount += 1;
      styleScores.visual += 3;
    }

    if (signal.source === "behavior" && signal.signalType === "typing.summary") {
      const backspaceRate = asNumber(signal.metrics?.backspaceRate);
      const pauseCount = asNumber(signal.metrics?.pauseCount);
      const averageBurstLength = asNumber(signal.metrics?.averageBurstLength);
      const focusSeconds = asNumber(signal.metrics?.focusSeconds);

      if (backspaceRate >= 0.18) styleScores.socratic += 2;
      if (pauseCount >= 3) styleScores.socratic += 1;
      if (averageBurstLength >= 12) styleScores["deep-technical"] += 1;
      if (focusSeconds >= 180) styleScores["deep-technical"] += 1;
    }
  }

  const inferredLearnStyle = (Object.entries(styleScores).sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0] ?? DEFAULT_PROFILE.inferredLearnStyle) as LearnStyle;

  let inferredGoal = currentProfile?.inferredGoal || baseline.inferredGoal;
  if (researchCount >= testingCount + 2) inferredGoal = "understand a topic deeply";
  if (testingCount >= researchCount + 2) inferredGoal = "master a technical skill";

  let inferredBackground = currentProfile?.inferredBackground || baseline.inferredBackground;
  if (
    inferredBackground === DEFAULT_PROFILE.inferredBackground &&
    (testingCount > 0 || Array.from(interestSet).some(topic => /AI|coding|technical|developer/i.test(topic)))
  ) {
    inferredBackground = "developer";
  }

  return {
    quizAnswers: baseQuiz,
    inferredBackground,
    inferredInterests: Array.from(interestSet).slice(0, 20),
    inferredGoal,
    inferredLearnStyle,
  };
}

export async function savePsychProfileFromQuiz(userId: number, quizAnswers: QuizAnswers) {
  const inferred = inferProfileFromQuiz(quizAnswers);
  await savePsychProfile(userId, { quizAnswers, ...inferred });
  await recordPsychProfileSignal({
    userId,
    source: "onboarding",
    signalType: "quiz.completed",
    metrics: {
      answers: quizAnswers,
      inferredLearnStyle: inferred.inferredLearnStyle,
    },
  });
}

export async function recordPsychSignalAndRefresh(
  userId: number,
  signal: AnalyzerSignalInput
) {
  await recordPsychProfileSignal({
    userId,
    source: signal.source,
    signalType: signal.signalType,
    path: signal.path,
    topic: signal.topic,
    metrics: signal.metrics,
  });

  const [profile, signals] = await Promise.all([
    getPsychProfile(userId),
    getPsychProfileSignals(userId, 250),
  ]);

  const nextProfile = buildProfileFromSignals(profile, signals);
  await upsertPsychProfile(userId, nextProfile);
  return nextProfile;
}
