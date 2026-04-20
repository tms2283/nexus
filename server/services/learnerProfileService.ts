/**
 * Bridges the existing user_psych_profiles table to the canonical
 * LearnerProfile shape consumed by clients and the lesson seed factory.
 * Computes additional fields (readingLevel, priorExposure, motivationMode,
 * recentAccuracy) that the older personalityAnalyzer didn't compute.
 */

import {
  DEFAULT_LEARNER_PROFILE,
  type LearnerProfile,
  type LearnStyle,
  type ReadingLevel,
  type PriorExposure,
  type MotivationMode,
  type DifficultyTier,
} from "../../shared/types/learnerProfile";
import { getPsychProfile, getPsychProfileSignals } from "../db";

function normalizeStyle(value: string | null | undefined): LearnStyle {
  switch (value) {
    case "visual":
    case "socratic":
    case "hands-on":
    case "deep-technical":
      return value;
    default:
      return DEFAULT_LEARNER_PROFILE.inferredLearnStyle;
  }
}

function inferReadingLevel(profile: {
  inferredBackground?: string | null;
  inferredInterests?: string[] | null;
}): ReadingLevel {
  const bg = profile.inferredBackground ?? "";
  if (/(developer|engineer|researcher|scientist)/i.test(bg)) return "technical";
  const interests = profile.inferredInterests ?? [];
  const technicalHits = interests.filter(i =>
    /(technical|coding|research|engineering|model|architecture)/i.test(i)
  ).length;
  if (technicalHits >= 2) return "technical";
  if (/(curious|learner|new)/i.test(bg)) return "plain";
  return "standard";
}

function inferPriorExposure(profile: {
  inferredBackground?: string | null;
  inferredInterests?: string[] | null;
}): PriorExposure {
  const bg = (profile.inferredBackground ?? "").toLowerCase();
  if (bg.includes("developer") || bg.includes("engineer")) return "builder";
  if (bg.includes("researcher") || bg.includes("scientist")) return "expert";
  const interests = profile.inferredInterests ?? [];
  if (interests.some(i => /AI|model|prompt|LLM/i.test(i))) return "consumer";
  return "none";
}

function inferMotivationMode(profile: {
  inferredGoal?: string | null;
}): MotivationMode {
  const goal = (profile.inferredGoal ?? "").toLowerCase();
  if (goal.includes("master")) return "mastery";
  if (goal.includes("current") || goal.includes("trend")) return "performance";
  if (goal.includes("understand") || goal.includes("deeply")) return "mastery";
  if (goal.includes("explore") || goal.includes("broadly")) return "curiosity";
  return "utility";
}

function computeAccuracyAndCalibration(
  signals: Array<{ signalType: string; metrics: Record<string, unknown> | null }>
): { accuracy: number | null; calibrationGap: number | null } {
  const grades = signals.filter(s => s.signalType === "retrieval.attempt");
  if (grades.length === 0) return { accuracy: null, calibrationGap: null };

  let correctSum = 0;
  let confSum = 0;
  let confCount = 0;
  for (const s of grades) {
    const correct = s.metrics?.correct === true ? 1 : 0;
    correctSum += correct;
    const conf = typeof s.metrics?.confidence === "number" ? s.metrics.confidence : null;
    if (conf != null) {
      confSum += conf / 5; // normalize 1-5 -> 0-1
      confCount += 1;
    }
  }
  const accuracy = correctSum / grades.length;
  const calibrationGap =
    confCount > 0 ? confSum / confCount - accuracy : null;
  return { accuracy, calibrationGap };
}

function suggestTier(accuracy: number | null): DifficultyTier {
  if (accuracy == null) return "core";
  if (accuracy >= 0.85) return "stretch";
  if (accuracy < 0.55) return "intro";
  return "core";
}

export async function getLearnerProfile(userId: number): Promise<LearnerProfile> {
  const [psych, signals] = await Promise.all([
    getPsychProfile(userId),
    getPsychProfileSignals(userId, 250),
  ]);

  if (!psych) {
    return { ...DEFAULT_LEARNER_PROFILE, userId };
  }

  const inferredLearnStyle = normalizeStyle(psych.inferredLearnStyle);
  const readingLevel = inferReadingLevel(psych);
  const priorExposure = inferPriorExposure(psych);
  const motivationMode = inferMotivationMode(psych);
  const { accuracy, calibrationGap } = computeAccuracyAndCalibration(signals);
  const suggestedTier = suggestTier(accuracy);

  return {
    userId,
    cookieId: null,
    quizAnswers: psych.quizAnswers ?? null,
    inferredBackground:
      psych.inferredBackground ?? DEFAULT_LEARNER_PROFILE.inferredBackground,
    inferredInterests:
      psych.inferredInterests ?? DEFAULT_LEARNER_PROFILE.inferredInterests,
    inferredGoal: psych.inferredGoal ?? DEFAULT_LEARNER_PROFILE.inferredGoal,
    inferredLearnStyle,
    readingLevel,
    priorExposure,
    motivationMode,
    recentAccuracy: accuracy,
    calibrationGap,
    suggestedTier,
  };
}

export function getDefaultProfile(userId?: number | null, cookieId?: string | null): LearnerProfile {
  return { ...DEFAULT_LEARNER_PROFILE, userId: userId ?? null, cookieId: cookieId ?? null };
}
