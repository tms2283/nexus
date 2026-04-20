/**
 * LearnerProfile — the canonical shape the client consumes to render any
 * adaptive lesson. Built server-side from three sources, in ascending trust:
 *   1. Quiz answers (self-report)
 *   2. Behavioral signals (typing, navigation)
 *   3. Assessment outcomes (quiz correctness, rubric scores, confidence calibration)
 *
 * This shape must remain backward-compatible with the existing
 * PersonalizationContext.VisitorProfile — callers merge both.
 */

export type LearnStyle = "deep-technical" | "visual" | "socratic" | "hands-on";

export type ReadingLevel = "plain" | "standard" | "technical";

export type PriorExposure = "none" | "consumer" | "builder" | "expert";

export type MotivationMode = "mastery" | "performance" | "curiosity" | "utility";

export type DifficultyTier = "intro" | "core" | "stretch";

export interface LearnerProfile {
  userId?: number | null;
  cookieId?: string | null;

  /** Raw quiz answers keyed by question id. */
  quizAnswers?: Record<string, string> | null;

  /** Self-reported + inferred identity. */
  inferredBackground: string;
  inferredInterests: string[];
  inferredGoal: string;
  inferredLearnStyle: LearnStyle;

  /** Derived signals. */
  readingLevel: ReadingLevel;
  priorExposure: PriorExposure;
  motivationMode: MotivationMode;

  /** Running accuracy band, 0-1. Null until first retrieval attempt. */
  recentAccuracy: number | null;

  /** Calibration gap: avg(confidence) - avg(correct). Positive = overconfident. */
  calibrationGap: number | null;

  /** Suggested tier for the next section. */
  suggestedTier: DifficultyTier;

  /** Freeform notes the seed factory writes — never shown to the learner. */
  notes?: string[];
}

export const DEFAULT_LEARNER_PROFILE: LearnerProfile = {
  userId: null,
  cookieId: null,
  quizAnswers: null,
  inferredBackground: "curious learner",
  inferredInterests: ["learning"],
  inferredGoal: "explore broadly",
  inferredLearnStyle: "deep-technical",
  readingLevel: "standard",
  priorExposure: "consumer",
  motivationMode: "curiosity",
  recentAccuracy: null,
  calibrationGap: null,
  suggestedTier: "core",
};
