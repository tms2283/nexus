import type { LessonTemplate } from "../types/lessonSeed";

export function assertGagneConformance(tpl: LessonTemplate): void {
  const hasIntroRetrieval = (tpl.retrieval ?? []).some(r => r.tier === "intro");
  const hasCoreRetrieval  = (tpl.retrieval ?? []).some(r => r.tier === "core");
  const hasClosing        = !!tpl.closingReflection;
  const everyChoiceHasRationale = (tpl.retrieval ?? []).every(r =>
    r.choices.every(c => (c.rationale ?? "").trim().length > 0)
  );

  const errors: string[] = [];
  if (!hasIntroRetrieval)
    errors.push("Missing intro-tier retrieval (Gagné 3: activate prior knowledge).");
  if (!hasCoreRetrieval)
    errors.push("Missing core-tier retrieval (Gagné 6: elicit performance).");
  if (!hasClosing)
    errors.push("Missing closing reflection (Gagné 9: enhance retention).");
  if (!everyChoiceHasRationale)
    errors.push("Every RetrievalChoice must have a non-empty rationale (Gagné 7: feedback).");
  if ((tpl.retrieval ?? []).length < 3)
    errors.push("At least 3 retrieval items required.");
  if (tpl.estimatedMinutes < 10 || tpl.estimatedMinutes > 45)
    errors.push(`estimatedMinutes ${tpl.estimatedMinutes} out of valid range [10, 45].`);

  if (errors.length) {
    throw new Error(`Pedagogical validation failed:\n  - ${errors.join("\n  - ")}`);
  }
}
