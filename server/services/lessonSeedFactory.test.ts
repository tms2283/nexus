/**
 * lessonSeedFactory.test.ts — lock in the personalization branching.
 *
 * composeLessonSeed is pure: given a LessonTemplate and a LearnerProfile,
 * the ordering and selection of sections must stay deterministic so that
 * curriculum authors can reason about what a given learner will see.
 */
import { describe, it, expect } from "vitest";
import { composeLessonSeed } from "./lessonSeedFactory";
import { AI_LITERACY_TEMPLATES } from "../../shared/content/aiLiteracy/lessonTemplates";
import {
  DEFAULT_LEARNER_PROFILE,
  type LearnerProfile,
} from "../../shared/types/learnerProfile";

const lesson1 = AI_LITERACY_TEMPLATES["lesson-1"];
const lesson3 = AI_LITERACY_TEMPLATES["lesson-3"];
const lesson5 = AI_LITERACY_TEMPLATES["lesson-5"];

function profileWith(overrides: Partial<LearnerProfile>): LearnerProfile {
  return { ...DEFAULT_LEARNER_PROFILE, ...overrides };
}

describe("composeLessonSeed", () => {
  it("emits sections in the canonical order: pf → (narrative + example)* → retrieval → reflection", () => {
    const seed = composeLessonSeed(lesson1, DEFAULT_LEARNER_PROFILE);
    const kinds = seed.sections.map(s => s.kind);
    // Default profile has priorExposure="consumer" → includes PF opener
    expect(kinds[0]).toBe("productive-failure");
    expect(kinds[kinds.length - 1]).toBe("reflection");
    // Retrieval blocks come after narratives, before reflection
    const firstRetrieval = kinds.indexOf("retrieval");
    const firstNarrative = kinds.indexOf("narrative");
    expect(firstNarrative).toBeGreaterThan(-1);
    expect(firstRetrieval).toBeGreaterThan(firstNarrative);
  });

  it("skips the productive-failure opener when priorExposure is 'none'", () => {
    const seed = composeLessonSeed(lesson1, profileWith({ priorExposure: "none" }));
    expect(seed.sections[0].kind).not.toBe("productive-failure");
  });

  it("includes an analogy block for visual learners, omits it for others", () => {
    // lesson-3 concepts include 'llm', which has an analogy defined in vocabulary.ts
    const visualSeed = composeLessonSeed(
      lesson3,
      profileWith({ inferredLearnStyle: "visual" })
    );
    const deepSeed = composeLessonSeed(
      lesson3,
      profileWith({ inferredLearnStyle: "deep-technical" })
    );
    expect(visualSeed.sections.some(s => s.kind === "analogy")).toBe(true);
    expect(deepSeed.sections.some(s => s.kind === "analogy")).toBe(false);
  });

  it("picks a reading-level gloss matching profile.readingLevel", () => {
    const plainSeed = composeLessonSeed(lesson1, profileWith({ readingLevel: "plain" }));
    const techSeed = composeLessonSeed(lesson1, profileWith({ readingLevel: "technical" }));
    const plainNarrative = plainSeed.sections.find(
      s => s.kind === "narrative" && s.heading === "Artificial Intelligence"
    );
    const techNarrative = techSeed.sections.find(
      s => s.kind === "narrative" && s.heading === "Artificial Intelligence"
    );
    expect(plainNarrative).toBeDefined();
    expect(techNarrative).toBeDefined();
    // Different reading levels produce different body text
    if (plainNarrative?.kind === "narrative" && techNarrative?.kind === "narrative") {
      expect(plainNarrative.body).not.toBe(techNarrative.body);
    }
  });

  it("prefers domain-matched examples based on inferredBackground", () => {
    const devSeed = composeLessonSeed(
      lesson1,
      profileWith({ inferredBackground: "senior software engineer" })
    );
    const bizSeed = composeLessonSeed(
      lesson1,
      profileWith({ inferredBackground: "business operations lead" })
    );
    const devExample = devSeed.sections.find(
      s => s.kind === "example" && s.id.includes("narrow-ai")
    );
    const bizExample = bizSeed.sections.find(
      s => s.kind === "example" && s.id.includes("narrow-ai")
    );
    expect(devExample?.kind === "example" && devExample.domain).toBe("developer");
    expect(bizExample?.kind === "example" && bizExample.domain).toBe("business");
  });

  it("filters retrieval to the learner's suggestedTier, falling back to core", () => {
    const stretchSeed = composeLessonSeed(
      lesson1,
      profileWith({ suggestedTier: "stretch" })
    );
    const coreSeed = composeLessonSeed(
      lesson1,
      profileWith({ suggestedTier: "core" })
    );
    const stretchRetrievals = stretchSeed.sections.filter(s => s.kind === "retrieval");
    const coreRetrievals = coreSeed.sections.filter(s => s.kind === "retrieval");
    expect(stretchRetrievals.every(r => r.kind === "retrieval" && r.tier === "stretch")).toBe(true);
    expect(coreRetrievals.every(r => r.kind === "retrieval" && r.tier === "core")).toBe(true);
    // An 'intro' tier has no items in lesson-1; factory should fall back to core
    const introSeed = composeLessonSeed(
      lesson1,
      profileWith({ suggestedTier: "intro" })
    );
    const introRetrievals = introSeed.sections.filter(s => s.kind === "retrieval");
    expect(introRetrievals.length).toBeGreaterThan(0);
    expect(introRetrievals.every(r => r.kind === "retrieval" && r.tier === "core")).toBe(true);
  });

  it("appends template.extraSections between retrieval and closing reflection", () => {
    // lesson-3 defines extraSections (productive-failure + span-select)
    const seed = composeLessonSeed(lesson3, DEFAULT_LEARNER_PROFILE);
    const kinds = seed.sections.map(s => s.kind);
    const lastRetrievalIdx = kinds.lastIndexOf("retrieval");
    const reflectionIdx = kinds.lastIndexOf("reflection");
    const spanIdx = kinds.indexOf("span-select");
    expect(spanIdx).toBeGreaterThan(lastRetrievalIdx);
    expect(spanIdx).toBeLessThan(reflectionIdx);
  });

  it("uses template.closingReflection when provided, default otherwise", () => {
    const lesson1Seed = composeLessonSeed(lesson1, DEFAULT_LEARNER_PROFILE);
    const lesson5Seed = composeLessonSeed(lesson5, DEFAULT_LEARNER_PROFILE);
    const lesson1Closing = lesson1Seed.sections[lesson1Seed.sections.length - 1];
    const lesson5Closing = lesson5Seed.sections[lesson5Seed.sections.length - 1];
    expect(lesson1Closing.kind).toBe("reflection");
    expect(lesson5Closing.kind).toBe("reflection");
    // lesson-5 has a custom closing prompt; lesson-1 uses the default
    if (lesson1Closing.kind === "reflection" && lesson5Closing.kind === "reflection") {
      expect(lesson1Closing.prompt).not.toBe(lesson5Closing.prompt);
      expect(lesson5Closing.id).toBe("lesson-5-reflection");
    }
  });

  it("surfaces profile-derived rendering metadata on the seed", () => {
    const profile = profileWith({
      inferredLearnStyle: "visual",
      readingLevel: "technical",
      suggestedTier: "stretch",
    });
    const seed = composeLessonSeed(lesson1, profile);
    expect(seed.forProfile).toEqual({
      inferredLearnStyle: "visual",
      readingLevel: "technical",
      suggestedTier: "stretch",
    });
  });

  it("preserves template-level fields on the seed", () => {
    const seed = composeLessonSeed(lesson1, DEFAULT_LEARNER_PROFILE);
    expect(seed.lessonId).toBe(lesson1.lessonId);
    expect(seed.courseId).toBe(lesson1.courseId);
    expect(seed.title).toBe(lesson1.title);
    expect(seed.xpReward).toBe(lesson1.xpReward);
    expect(seed.prerequisites).toEqual(lesson1.prerequisites);
    expect(seed.estimatedMinutes).toBe(lesson1.estimatedMinutes);
  });
});
