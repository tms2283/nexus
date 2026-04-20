/**
 * Example bank — concrete worked examples organized by domain. The seed
 * factory selects examples whose `domain` matches the learner's
 * inferredBackground or interests.
 */

export interface DomainExample {
  id: string;
  title: string;
  /** Domain tag used for matching against learner profile. */
  domain: "developer" | "designer" | "business" | "healthcare" | "education" | "general";
  topic: string;
  body: string;
}

export const EXAMPLES: DomainExample[] = [
  {
    id: "narrow-ai-developer",
    title: "Narrow AI in code",
    domain: "developer",
    topic: "narrow-ai",
    body: "GitHub Copilot suggests the next line of code by predicting the most likely token sequence given your file context. It is brilliant at completing syntax it has seen — and can confidently invent function names that do not exist.",
  },
  {
    id: "narrow-ai-designer",
    title: "Narrow AI in design",
    domain: "designer",
    topic: "narrow-ai",
    body: "Figma's auto-layout suggestions and Photoshop's content-aware fill are narrow AI: they excel at one perceptual task (layout, infill) and have no idea what the design is for.",
  },
  {
    id: "narrow-ai-business",
    title: "Narrow AI in business",
    domain: "business",
    topic: "narrow-ai",
    body: "A spam classifier in Gmail is narrow AI: it sorts incoming mail with high accuracy but has no model of why a message matters to you. The same model would fail at scoring sales leads.",
  },
  {
    id: "hallucination-developer",
    title: "Hallucinated APIs",
    domain: "developer",
    topic: "hallucination",
    body: "Ask an LLM to use a niche library and it may cite functions that read like real API but never shipped. The signature looks idiomatic; the function is invented. Verify against the docs every time.",
  },
  {
    id: "hallucination-business",
    title: "Hallucinated citations",
    domain: "business",
    topic: "hallucination",
    body: "An LLM asked for sources on a market trend can produce convincing-looking journal citations — author, year, journal name — that simply do not exist. Real risk to anyone copy-pasting AI output into a report.",
  },
  {
    id: "bias-healthcare",
    title: "Diagnostic bias",
    domain: "healthcare",
    topic: "bias",
    body: "A skin-lesion classifier trained mostly on light-skinned patients underperforms on darker skin tones. The model is not malicious; it learned what it was shown.",
  },
  {
    id: "bias-business",
    title: "Hiring bias",
    domain: "business",
    topic: "bias",
    body: "An automated résumé screener trained on a decade of past hires will reproduce that decade's preferences — including the unspoken ones. Fairness requires intentional intervention, not just data volume.",
  },
  {
    id: "prompt-design",
    title: "Sharp vs vague prompts",
    domain: "designer",
    topic: "prompt",
    body: "'Make this better' produces a generic mood-board. 'Increase the contrast on the call-to-action button while preserving the brand palette and ensuring 4.5:1 WCAG contrast' produces something usable.",
  },
];
