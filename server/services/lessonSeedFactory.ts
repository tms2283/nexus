/**
 * lessonSeedFactory — composes a LessonSeed from a lesson template and a
 * LearnerProfile. Picks vocabulary glosses, examples, and difficulty tier
 * based on the learner's profile. The output is the canonical contract that
 * every adaptive lesson UI on the platform consumes.
 */

import type { LearnerProfile, DifficultyTier } from "../../shared/types/learnerProfile";
import type {
  LessonSeed,
  LessonSection,
  LessonTemplate,
  NarrativeBlock,
  AnalogyBlock,
  ExampleBlock,
  RetrievalBlock,
} from "../../shared/types/lessonSeed";
import { VOCABULARY } from "../../shared/content/aiLiteracy/vocabulary";
import { EXAMPLES, type DomainExample } from "../../shared/content/aiLiteracy/examples";
import { MISCONCEPTIONS } from "../../shared/content/aiLiteracy/misconceptions";

export type { LessonTemplate };

function pickExampleForTopic(topic: string, profile: LearnerProfile): DomainExample | undefined {
  const bg = profile.inferredBackground.toLowerCase();
  let preferredDomain: DomainExample["domain"] = "general";
  if (bg.includes("developer") || bg.includes("engineer")) preferredDomain = "developer";
  else if (bg.includes("designer")) preferredDomain = "designer";
  else if (bg.includes("business")) preferredDomain = "business";

  const matches = EXAMPLES.filter(e => e.topic === topic);
  return matches.find(e => e.domain === preferredDomain) ?? matches[0];
}

function scaleRetrievalToTier(items: RetrievalBlock[], tier: DifficultyTier): RetrievalBlock[] {
  const filtered = items.filter(it => it.tier === tier);
  if (filtered.length > 0) return filtered;
  return items.filter(it => it.tier === "core");
}

export function composeLessonSeed(
  template: LessonTemplate,
  profile: LearnerProfile
): LessonSeed {
  const sections: LessonSection[] = [];

  // 1. Open with a productive-failure-style misconception probe if relevant
  const lessonMisconceptions = MISCONCEPTIONS.filter(m =>
    m.addressedIn.includes(template.lessonId)
  );
  if (lessonMisconceptions.length > 0 && profile.priorExposure !== "none") {
    const m = lessonMisconceptions[0];
    sections.push({
      kind: "productive-failure",
      id: `${template.lessonId}-pf-${m.id}`,
      scenario: `Many learners arrive believing: "${m.misconception}"`,
      learnerPrompt: "Before reading on, write what you currently think is true about this. Don't worry about being right.",
      canonicalInsight: m.reality,
    });
  }

  // 2. Narrative + analogy + example for each concept
  for (const conceptKey of template.concepts) {
    const vocab = VOCABULARY[conceptKey];
    if (!vocab) continue;

    const narrative: NarrativeBlock = {
      kind: "narrative",
      id: `${template.lessonId}-narr-${conceptKey}`,
      heading: vocab.term,
      body: vocab.glosses[profile.readingLevel],
      audio: { srcVariant: "default", text: vocab.glosses[profile.readingLevel] },
    };
    sections.push(narrative);

    if (vocab.analogy && profile.inferredLearnStyle === "visual") {
      const analogy: AnalogyBlock = {
        kind: "analogy",
        id: `${template.lessonId}-analogy-${conceptKey}`,
        title: `Think of it like…`,
        body: vocab.analogy,
        matchedBy: ["learnStyle:visual"],
      };
      sections.push(analogy);
    }

    const example = pickExampleForTopic(conceptKey, profile);
    if (example) {
      const ex: ExampleBlock = {
        kind: "example",
        id: `${template.lessonId}-ex-${example.id}`,
        title: example.title,
        body: example.body,
        domain: example.domain,
      };
      sections.push(ex);
    }
  }

  // 3. Retrieval at suggested tier
  const retrieval = scaleRetrievalToTier(template.retrieval, profile.suggestedTier);
  for (const r of retrieval) {
    sections.push(r);
  }

  // 4. Template-supplied extra sections (productive-failure, span-select, rubric)
  if (template.extraSections) {
    for (const s of template.extraSections) {
      sections.push(s);
    }
  }

  // 5. Closing reflection — template override or default
  if (template.closingReflection) {
    sections.push(template.closingReflection);
  } else {
    sections.push({
      kind: "reflection",
      id: `${template.lessonId}-reflection`,
      prompt:
        "In your own words, what is one thing from this lesson you'll apply this week — and what is one thing you still find confusing?",
      cues: [
        "Name a concrete situation where you'll use this idea.",
        "Be specific about what is unclear — that targeted confusion is where the next lesson will help.",
      ],
    });
  }

  return {
    lessonId: template.lessonId,
    courseId: template.courseId,
    title: template.title,
    subtitle: template.subtitle,
    estimatedMinutes: template.estimatedMinutes,
    forProfile: {
      inferredLearnStyle: profile.inferredLearnStyle,
      readingLevel: profile.readingLevel,
      suggestedTier: profile.suggestedTier,
    },
    sections,
    xpReward: template.xpReward,
    prerequisites: template.prerequisites,
  };
}
