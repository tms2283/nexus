/**
 * LessonSeed — the portable contract every adaptive lesson renders from.
 * The server composes a seed by combining a lesson template with the
 * learner's LearnerProfile, picks variants, and serializes the result.
 * Every future course on the platform must consume this same shape.
 */

import type { DifficultyTier, LearnStyle, ReadingLevel } from "./learnerProfile";

export type LessonSectionKind =
  | "narrative"
  | "analogy"
  | "example"
  | "retrieval"
  | "productive-failure"
  | "span-select"
  | "reflection"
  | "rubric";

export interface NarrativeBlock {
  kind: "narrative";
  id: string;
  heading?: string;
  body: string;
  audio?: { srcVariant: "default" | "slow"; text: string };
}

export interface AnalogyBlock {
  kind: "analogy";
  id: string;
  title: string;
  body: string;
  /** Tags the profile used to pick this analogy — used for instrumentation. */
  matchedBy: string[];
}

export interface ExampleBlock {
  kind: "example";
  id: string;
  title: string;
  body: string;
  domain: string;
}

export interface RetrievalChoice {
  id: string;
  text: string;
  correct: boolean;
  rationale: string;
}

export interface RetrievalBlock {
  kind: "retrieval";
  id: string;
  prompt: string;
  choices: RetrievalChoice[];
  /** Ask learner to rate confidence 1-5 before revealing correctness. */
  requireConfidence: boolean;
  tier: DifficultyTier;
  tags: string[];
}

export interface ProductiveFailureBlock {
  kind: "productive-failure";
  id: string;
  scenario: string;
  learnerPrompt: string;
  /** Canonical answer revealed only after the learner commits their attempt. */
  canonicalInsight: string;
}

export interface SpanSelectBlock {
  kind: "span-select";
  id: string;
  instructions: string;
  paragraph: string;
  /** 0-indexed [start, end) character offsets of the hallucinated span(s). */
  hallucinatedSpans: Array<[number, number]>;
  explanation: string;
}

export interface ReflectionBlock {
  kind: "reflection";
  id: string;
  prompt: string;
  /** Optional rubric cues shown after submission. */
  cues?: string[];
}

export interface RubricBlock {
  kind: "rubric";
  id: string;
  prompt: string;
  rubricCriteria: Array<{ label: string; description: string; weight: number }>;
  /** Server calls callAI with these to grade. */
  gradingInstructions: string;
}

export type LessonSection =
  | NarrativeBlock
  | AnalogyBlock
  | ExampleBlock
  | RetrievalBlock
  | ProductiveFailureBlock
  | SpanSelectBlock
  | ReflectionBlock
  | RubricBlock;

export interface LessonSeed {
  lessonId: string;
  courseId: string;
  title: string;
  subtitle?: string;
  estimatedMinutes: number;

  /** Composition metadata — supports client-side personalization UI. */
  forProfile: {
    inferredLearnStyle: LearnStyle;
    readingLevel: ReadingLevel;
    suggestedTier: DifficultyTier;
  };

  /** Ordered sections. The shell component renders in order. */
  sections: LessonSection[];

  /** Optional closing XP reward; server awards on completion. */
  xpReward: number;

  /** Prerequisite lessonIds that must be completed first. */
  prerequisites: string[];
}

export type { DifficultyTier, LearnStyle, ReadingLevel };

/**
 * LessonTemplate — the static, profile-independent definition of a lesson.
 * The server's lessonSeedFactory takes a template + a LearnerProfile and
 * produces a personalised LessonSeed.
 */
export interface LessonTemplate {
  lessonId: string;
  courseId: string;
  title: string;
  subtitle?: string;
  estimatedMinutes: number;
  xpReward: number;
  prerequisites: string[];
  /** Concept keys to surface from the vocab/example banks. */
  concepts: string[];
  /** Pre-authored retrieval items, by tier. */
  retrieval: RetrievalBlock[];
  /**
   * Additional sections appended after retrieval and before the closing
   * reflection — used for productive-failure, span-select, or rubric blocks
   * that go beyond the auto-composed narrative + retrieval skeleton.
   */
  extraSections?: LessonSection[];
  /**
   * Optional override for the closing reflection. If omitted, the factory
   * appends a generic "what will you apply / what's still confusing" prompt.
   */
  closingReflection?: ReflectionBlock;
}
