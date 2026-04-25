import type { LearnerProfile } from "./learnerProfile";

export interface GoalPathDecomposition {
  goalSummary: string;
  pitch: string;
  estimatedWeeks: number;
  outcomes: string[];
}

export interface GoalPathConceptPlan {
  conceptId: string;
  title: string;
  isNew: boolean;
  rationale: string;
  prerequisiteIds: string[];
  sourceOutcomeIndex: number;
  estimatedMinutes?: number;
}

export interface GoalPathPlan {
  decomposition: GoalPathDecomposition;
  concepts: GoalPathConceptPlan[];
}

export interface GoalPathNodeView {
  sequenceNumber: number;
  conceptId: string;
  conceptTitle: string;
  conceptSummary: string;
  estimatedMinutes: number;
  lessonStatus: "queued" | "generating" | "ready" | "failed";
  lessonKey?: string;
  masteryPKnown: number;
  mastered: boolean;
}

export interface GoalPathView {
  pathId: string;
  goalText: string;
  goalSummary: string;
  pitch: string;
  status: "building" | "ready" | "in_progress" | "completed" | "abandoned";
  estimatedTotalMinutes: number;
  nodes: GoalPathNodeView[];
  profileSnapshot: Pick<LearnerProfile, "readingLevel" | "inferredLearnStyle" | "suggestedTier">;
}

export interface GoalPathCard {
  pathId: string;
  goalText: string;
  goalSummary: string;
  status: "building" | "ready" | "in_progress" | "completed" | "abandoned";
  nodeCount: number;
  masteredCount: number;
  estimatedTotalMinutes: number;
  createdAt: Date;
}
