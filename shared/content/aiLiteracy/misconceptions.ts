/**
 * Common AI misconceptions held by adult learners — used to power the
 * Productive Failure opener and to weight which retrieval items are surfaced.
 * Each entry pairs the misconception with the corrective insight, sourced
 * from MIT Media Lab AI Literacy competencies and UNESCO AIC framework.
 */

export interface Misconception {
  id: string;
  misconception: string;
  reality: string;
  /** Lessons that explicitly address this misconception. */
  addressedIn: string[];
  /** Tags this misconception is associated with. */
  tags: string[];
}

export const MISCONCEPTIONS: Misconception[] = [
  {
    id: "ai-thinks",
    misconception: "AI thinks like a human brain.",
    reality:
      "AI systems are statistical pattern matchers. They produce outputs that look reasoned, but no understanding, intent, or experience underlies them.",
    addressedIn: ["lesson-1", "lesson-3"],
    tags: ["mind", "intelligence", "anthropomorphism"],
  },
  {
    id: "ai-is-objective",
    misconception: "AI decisions are unbiased and objective because they are mathematical.",
    reality:
      "Models inherit the biases of their training data and the choices of the people who built them. Math does not erase social bias — it scales it.",
    addressedIn: ["lesson-2", "lesson-4"],
    tags: ["bias", "ethics", "fairness"],
  },
  {
    id: "ai-knows-truth",
    misconception: "If an AI states something confidently, it is probably true.",
    reality:
      "LLMs generate plausible text, not verified truth. Confidence in tone is uncorrelated with factual accuracy. Hallucinations sound the same as facts.",
    addressedIn: ["lesson-2", "lesson-3"],
    tags: ["hallucination", "truth", "reliability"],
  },
  {
    id: "ai-replaces-experts",
    misconception: "AI will fully replace experts in most fields soon.",
    reality:
      "Today's AI excels at narrow tasks. Expert work involves judgment, accountability, and context that current systems cannot supply on their own.",
    addressedIn: ["lesson-2"],
    tags: ["jobs", "expertise", "narrow-vs-general"],
  },
  {
    id: "more-data-better",
    misconception: "More training data always makes an AI smarter.",
    reality:
      "Data quality, diversity, and curation matter more than raw volume. Bad data scales bad predictions.",
    addressedIn: ["lesson-1"],
    tags: ["training", "data-quality"],
  },
  {
    id: "prompts-are-magic",
    misconception: "There is one perfect prompt that unlocks the right answer.",
    reality:
      "Prompts are conversations with a probabilistic system. Iterating, providing context, and verifying outputs matter more than memorising magic phrases.",
    addressedIn: ["lesson-3"],
    tags: ["prompting", "iteration"],
  },
  {
    id: "ai-cannot-be-wrong",
    misconception: "If the AI is wrong, it is the user's fault for asking incorrectly.",
    reality:
      "Models fail in predictable ways: hallucination, stale knowledge, brittle reasoning. Critical use means verifying — not blaming yourself for the system's limits.",
    addressedIn: ["lesson-3", "lesson-4"],
    tags: ["limitations", "user-responsibility"],
  },
];
