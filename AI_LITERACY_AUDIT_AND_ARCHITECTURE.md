# AI Literacy Course — Full Audit, Personalization Architecture, and Roadmap

**Target:** `client/src/pages/AILiteracy.tsx` (86 KB, mounted at `/ai-literacy`) and the duplicated `AILiteracyTab` inside `client/src/pages/Learn.tsx` (507 KB, Modules 1–3).
**Standard:** This course is the pedagogical gold standard for every future Nexus lesson. Evaluated against UNESCO AI Competency Frameworks, MIT Media Lab AI Literacy, Ng's *AI for Everyone*, Mayer's Multimedia Learning, Sweller's Cognitive Load Theory, Roediger/Karpicke retrieval practice, Bjork's desirable difficulties, Bloom's Taxonomy, Self-Determination Theory, and Csikszentmihalyi's Flow.

---

## PART 1 — Pedagogical Audit

### 1.1 Curriculum Coverage & Scope

**Strengths**
- Module 1 covers the essential mental-model foundation: definition, training mechanics, myth-busting, prompt engineering, ethics, capstone. The sequence is well-chosen.
- The three-module arc (Intro → Workplace → Everyday Life) mirrors UNESCO's three-tier structure (understand → apply → critically engage).

**Gaps**
- **Generative AI specifics are thin.** Diffusion models, multimodality, context windows, tokenization, temperature, and system prompts are never named. An adult learner cannot read news about "128k context" or "system prompts leaked" with understanding.
- **Synthetic media / deepfakes are absent.** This is the single biggest AI literacy gap in the general public (UNESCO flags it as Tier 1). No detection heuristics, no provenance discussion (C2PA, watermarking).
- **AI governance is missing.** No EU AI Act, no NIST AI Risk Management Framework, no Executive Order 14110 references, no mention of sector regulators (FDA for medical AI, EEOC for hiring AI).
- **Hallucination is named but the mechanism is not taught.** Learners should understand *why* LLMs hallucinate (next-token objective optimizes plausibility, not truth) not just *that* they do.
- **Human-AI teaming frameworks are absent.** No mention of Centaur/Cyborg, no task decomposition heuristics, no "AI as colleague" protocol beyond a single aphorism.
- **Data privacy is surface-level.** Mentioned in Lesson 4 scenario, not taught as a literacy domain: training data vs. inference data, inference-time leakage, vector store retention, data residency.
- **Model evaluation literacy is missing.** Learners never encounter benchmarks, capability vs. alignment, or the difference between "the model is wrong" and "I prompted it wrong."

**Recommendations**
- Add a "How LLMs Actually Work" segment to Lesson 1 covering tokens, context windows, temperature, and the next-token objective in plain language.
- Add a dedicated synthetic-media micro-lesson in Lesson 2 with detection heuristics (inconsistent hands/ears/shadows in images, prosodic flatness in audio, C2PA/content credentials check).
- Fold governance into Lesson 4 with a single framework card (EU AI Act risk tiers: minimal / limited / high / unacceptable) — concrete enough for a citizen, simple enough for a novice.
- Rewrite the "AI hallucinates" explanation in Lesson 2 to teach the mechanism, not just the phenomenon.

### 1.2 Scientific & Pedagogical Methodology

**Current status**: The course claims Mayer adherence prominently in the UI. Audit finding: the claim is **partially genuine, partially decorative.**

| Principle | Implementation | Verdict |
|---|---|---|
| **Coherence** (no extraneous content) | Clean; well-scoped segments | ✓ Genuine |
| **Segmenting** (chunk + learner-paced) | Lesson 1 splits into 3 segments with user-advanced navigation | ✓ Genuine |
| **Modality** (audio + visual) | `Narrator` component uses Web Speech API | ✓ Present, but degraded (see §1.5) |
| **Personalization** (conversational tone) | Labels in UI; tone IS conversational | ~ Partial — tone is right, but nothing adapts per user |
| **Signaling** (cues highlight structure) | Headers, color-coded callouts | ✓ Genuine |
| **Interactivity** (generative activity) | Quizzes, rubric checks, reflection boxes | ~ Partial — see §1.4 |

**What is missing that Mayer also requires**
- **Pre-training / worked examples** — learners are never shown a completed reference prompt before being asked to produce one. Bjork's "desirable difficulty" must be calibrated: expert-level without scaffolding is demoralizing.
- **Embodied effect** — no pointing, gesturing, or first-person framing in the narrator voice.
- **Multimedia principle proper** — the course is text-heavy with decorative icons. True multimedia requires *generative* pairing: a diagram that *explains* the concept, not a lucide icon that decorates the title.

**Beyond Mayer — other frameworks**

- **Cognitive Load Theory (Sweller)**: Intrinsic load is appropriate. **Extraneous load is elevated** — 5-dimension prompt principles grid in Lesson 3 presents all five at once with no scaffolding; novices will split attention. **Germane load is underutilized** — no self-explanation prompts, no schema-construction exercises.
- **Retrieval Practice (Roediger/Karpicke)**: Quizzes exist but are **massed, not spaced**. Concepts from Lesson 1 are never retrieved in Lessons 2, 3, 4. This is the single biggest learning-science failure in the current design. The capstone retests, but 2 hours later is not optimal spacing.
- **Desirable Difficulties (Bjork)**: Prompt-engineering rubric is self-graded — zero difficulty. Learners can simply check all four boxes. No productive failure is designed in.
- **Elaborative Interrogation**: No "why?" prompts. Ethics reflections are the only free-response moments.
- **Metacognitive Scaffolding**: Some — the self-rubric in Lesson 3 nods at this but stops at checkbox level. No "rate your confidence before answering" mechanism.
- **Constructivism / ZPD (Vygotsky)**: Completely static. Every learner receives identical content. No zone of proximal development can be targeted without a profile signal.
- **Transfer-Appropriate Processing**: Weak. Quiz questions are recognition-based (Bloom 1–2). Real AI use requires production (Bloom 3–6). Mismatch.

### 1.3 Assessment Architecture

**Strengths**
- Every quiz has an explanation shown on answer — this is genuine testing-effect practice.
- The capstone has three distinct reasoning tasks (application, critical analysis, ethical reasoning).

**Gaps**
- **Formative assessment is clumped at lesson ends.** Retrieval should occur mid-segment, not as a separate quiz phase.
- **Bloom coverage is lopsided**: Definitions quiz = Level 1 (recall). Myth quiz = Level 2 (comprehension). Prompt self-rubric = Level 3 but self-scored. Ethics reflection = Level 4–5 but ungraded. The capstone is the only Level 5–6 task.
- **Distractors are weak.** Example (Lesson 1, Q1): options for "AI stands for" include *Automated Intelligence*, *Advanced Integration*, *Algorithmic Interface*. None of these are real misconceptions people hold; they are filler. Contrast with Lesson 2 Q1 distractors, which DO represent common myths — that's the right pattern.
- **No adaptive branching.** Wrong answers produce the same explanation every learner sees. No targeted remediation.
- **Capstone has no rubric.** A learner writes a three-paragraph response and it is accepted if length > 20 chars. This is the single most important summative assessment in the course and it has no quality gate.
- **Untested topics taught in Lesson 1**: training / loss / weights mechanics — never assessed anywhere.
- **Untested topics taught in Lesson 4**: stakeholder analysis — never assessed.

**Recommendations**
- Rebuild all distractors to represent documented misconceptions (see Kocak et al. 2024 AI misconceptions inventory).
- Add an AI-graded capstone rubric (the existing `trpc.ai.explainConcept` endpoint can be leveraged; the new version should use a dedicated `gradeResponse` endpoint — see §2.5 Phase 2).
- Add mid-segment retrieval (2-question micro-quizzes between segments) to distribute practice.
- Add adaptive branching: wrong answer → unlock a remedial micro-segment before proceeding.

### 1.4 Interactivity & Active Learning

**Current active/passive ratio (estimated from component inspection):**
- Lesson 1: ~20% active (4-question quiz, segment-advance clicks). 80% passive (read + listen).
- Lesson 2: ~35% active (6-question myth quiz is the main activity).
- Lesson 3: ~55% active (prompt writing + self-rubric + AI test).
- Lesson 4: ~40% active (stakeholder expansion + one reflection per scenario).
- Lesson 5: ~70% active (capstone is pure production).

**Average ~44% active.** Industry benchmark for effective adult e-learning is 60%+ (based on OECD 2023 digital learning effectiveness meta-analysis).

**Specific issues**
- Lesson 3's "Test My Prompt" is **gameable**: the user's prompt is sent as a `concept` to `ai.explainConcept` with `level: "student"`. The AI then *explains* the user's prompt rather than *executing* it. Learners get a response regardless of prompt quality — the feedback signal is nearly zero. **This is the single highest-impact UX bug in the current course.**
- Lesson 4 ethics reflections are accepted on any non-empty string. No feedback loop.
- No drag-and-drop, no sorting, no labeling, no simulation. All interactions reduce to either multiple-choice or free-text.
- No productive-failure design: learners are never given a problem they are expected to fail at before learning the concept.

**Recommendations**
- **Fix Lesson 3's prompt grading**: send a grading prompt to the AI (not the user's prompt as-content). The AI returns (a) what output the user's prompt would plausibly produce and (b) a critique against the rubric. This creates genuine signal.
- Add at least one sort/drag interaction per module. Classic example: "sort these 6 statements into Myth / Reality" as the opener to Lesson 2 (productive failure: make them commit before teaching).
- Add confidence ratings to quiz answers (Level 2 of metacognitive scaffolding).

### 1.5 Accessibility & Comprehensibility

**Strengths**
- Language is generally at a grade 10–11 reading level — appropriate for a non-technical adult audience.
- Color palette uses sufficient contrast; focus states are visible.

**Gaps — the severe ones**
- **Broken character encoding is live in production.** Multiple instances:
  - `AILiteracy.tsx` line 43: `"Speak AI fluently � craft prompts that work"` — U+FFFD replacement char.
  - `AILiteracy.tsx` lines 357–360: `icon: "??"` for all four concept cards (Narrow AI, Machine Learning, Deep Learning, LLMs). These should be emoji; a prior author clearly pasted emoji that didn't survive a round-trip through a non-UTF-8 editor.
  - `AILiteracy.tsx` lines 380–384: `{ step: "?", label: "", desc: "", color: "transparent" }` — the arrow connectors between pipeline steps. Should be `→`.
  - `AILiteracy.tsx` line 498: emoji score indicator `{score === DEFINITIONS_QUIZ.length ? "??" : score >= DEFINITIONS_QUIZ.length / 2 ? "?" : "??"}` — all three broken.
  - Multiple further instances in Lessons 2, 3, 4, 5 completion screens.
  - **Root cause**: file was saved in Windows-1252 or CP437 at some point in history. Git then preserved the mojibake. **Immediate fix**: save as UTF-8 and replace all `?` and `�` sentinels with intended glyphs.
- **Narrator component is not WCAG 2.1 AA compliant**: no visible transcript alongside playback (Success Criterion 1.2.1); no captions option; rate/pitch/voice are not learner-configurable (Success Criterion 1.4.2 — Audio Control).
- **Step-flow diagram in Lesson 1** uses sibling flex items with arrow separators; screen readers will read each number, each label, and each transparent "?" arrow as separate list items with no semantic flow. Should be a proper `<ol>` with `aria-label="AI training pipeline"` and visually-hidden transitional text.
- **Color is the only signal for myth vs. reality indicators** (Lesson 2 quiz) — fails SC 1.4.1 for colorblind users. Pair with icon or text label.
- **No skip-nav or landmark regions.** `<PageWrapper>` renders the hero + sections with no `role="main"` — this is platform-wide but surfaces here.
- **Autoplay narrator** on Lesson 1 segment change violates SC 1.4.2 if it exceeded 3 seconds (it does not, but remains discourteous). `autoPlay={false}` is correct in current code; `useEffect` dependency on `[autoPlay]` is correct.

### 1.6 Motivational & Engagement Architecture

**Strengths**
- XP system is integrated with the global `usePersonalization` context — progress compounds across the platform.
- Lesson completion UI has genuine reward feedback (toast, color, badge).

**Gaps against Self-Determination Theory**
- **Autonomy**: near zero. No lesson order choice, no difficulty selection, no topic emphasis preference. Every learner does Lesson 1 segment 1 first or they can't access the capstone intelligibly.
- **Competence**: XP is awarded for completion, not mastery. A learner who guesses 0/4 on the definitions quiz gets the same +50 XP as a learner who scores 4/4.
- **Relatedness**: completely absent. No cohort display, no leaderboard in this course (the platform has one elsewhere), no "other learners also thought…" social proof. This is a deliberate choice that may be right for adult learners, but SDT suggests even a minimal social signal (e.g., "73% of learners got this right") would help.

**Against Flow Theory**: the course has no difficulty/skill calibration. A novice and an expert experience identical challenge, so neither hits flow. This is the core argument for the personalization system in Part 2.

**Against ARCS (Keller)**:
- Attention: fine — opening narrations create curiosity.
- Relevance: weak — no motivation-profile shaping of examples (see §2.4).
- Confidence: harmed by the quiz distractor weakness and by the capstone having no pass/fail signal.
- Satisfaction: XP helps; no external recognition (shareable certificate, LinkedIn export).

### 1.7 Structural & Technical Issues

**Hardcoded content that should be data-driven**
- `LESSONS`, `MYTH_QUIZ`, `DEFINITIONS_QUIZ`, `PROMPT_EXERCISES`, `ETHICS_SCENARIOS` are all inline const arrays in `AILiteracy.tsx`. This prevents A/B testing, content hotfixing, and — critically — personalization variant swapping.
- Same data is duplicated in `Learn.tsx` (`LESSON_META`, `MYTH_QUIZ`, `DEF_QUIZ`, `PROMPT_EXERCISES`, `ETHICS_SCENARIOS`). **Two sources of truth** for Module 1 content. Edits to one will silently diverge from the other.

**State management**
- All lesson state is component-local `useState`. A page refresh discards: completed segments, quiz scores, prompt responses, ethics reflections, capstone draft.
- `usePersonalization` exposes `updateProfile` — unused for course state. Easy fix; see Phase 1 below.

**Progress persistence**
- `visitor.addXP` persists XP only. Lesson completion status is never written server-side. A user who finishes Lesson 3 and closes the tab returns to the course reset to zero progress.
- The `visitor` tRPC router already has `recordVisit`, `addXP`, `getProfile`. A lightweight `updateCourseProgress` mutation is the surgical addition needed.

**UX/UI inconsistencies**
- `LessonShell` renders an inline-style `background` from `meta.color.replace("oklch(", "oklch(")` — a no-op. Should use `color-mix(in oklch, ${color} 15%, transparent)` (the pattern used correctly elsewhere in the file).
- Mayer principle badges are shown per-lesson but the principles don't actually drive behavior — decorative labels.
- The 86 KB file size is borderline for a single route chunk. React lazy-load already covers it (App.tsx uses `lazy(() => import(...))`) so not urgent — but if we split per-lesson we'd open up Phase 3 adaptive branching without the whole module re-rendering.

**Where graphics would add genuine value**
- Lesson 1, segment 2 (training pipeline): a real diagram of forward pass → loss → backprop would replace the broken arrow row.
- Lesson 1, segment 1 (Narrow/ML/DL/LLMs relationship): a proper concentric-circles Venn showing LLMs ⊂ DL ⊂ ML ⊂ AI.
- Lesson 2 (hallucination mechanism): a token-prediction animation showing the model picking the highest-probability next word regardless of truth.
- Lesson 4 (stakeholder map): a radial diagram with the AI system at center and stakeholders arrayed around it, weighted by harm exposure.

---

## PART 2 — Personalization Architecture

### 2.1 Learner Profile Schema

The behavioral agent must produce a `LearnerProfile` document that the lesson engine consumes. Proposed contract:

```ts
// shared/types/learner-profile.ts
export interface LearnerProfile {
  // Identity
  userId: string;              // null for guests (use cookieId fallback)
  cookieId: string;
  generatedAt: string;         // ISO timestamp — profile is regenerated periodically
  confidence: number;          // 0–1, how much the agent trusts this profile

  // Proficiency (primary axis for content adaptation)
  proficiencyLevel: "novice" | "intermediate" | "advanced";
  proficiencyScore: number;    // 0–100, continuous underlying value
  domainProficiency: Partial<Record<AIDomain, number>>; // per-topic granular score

  // Learning style (secondary axis — for modality emphasis)
  learningStyle: {
    dominant: "visual" | "auditory" | "kinesthetic" | "reading";
    secondary?: "visual" | "auditory" | "kinesthetic" | "reading";
    // Inferred from: narrator playback time, time on diagrams, time in text blocks,
    // interaction-to-read ratio. Used lightly — the VAK-model has weak empirical support,
    // so only shift presentation emphasis, never gate content.
  };

  // Prior knowledge (what we can assume they already know)
  priorKnowledgeDomains: AIDomain[];
  // e.g. ["prompt-engineering-basics", "llm-mechanics"] — the agent infers these from
  // onboarding quiz, prior lesson performance, and explicit self-tags.

  // Pace
  pacePreference: "accelerated" | "standard" | "deliberate";
  // Signal: avg seconds per segment vs. cohort median.

  // Motivation (drives framing and example selection — see §2.4)
  motivationProfile: {
    primary: MotivationDriver;
    secondary?: MotivationDriver;
  };
  // MotivationDriver = "career" | "civic" | "curiosity" | "parent_educator" | "creativity" | "caution"

  // Engagement shape
  engagementPatterns: {
    tendency: "skimmer" | "steady" | "deep_diver";
    avgSessionMinutes: number;
    completionRate: number;    // % of started lessons finished
    quizRetakeRate: number;    // willingness to retry — signal for fixed-mindset vs. growth
  };

  // Misconception flags (agent writes, course engine reads to trigger targeted remediation)
  misconceptionFlags: MisconceptionFlag[];
  // e.g. [{ id: "ai_is_conscious", strength: 0.7, firstDetectedAt: "..." }]

  // Accessibility needs (explicit — never inferred silently)
  accessibility: {
    reducedMotion: boolean;
    highContrast: boolean;
    textSizePreference: "default" | "large" | "xl";
    preferTranscript: boolean;
    preferCaptions: boolean;
  };

  // Recommended — additional fields I'd add:
  contextualHooks: {
    industry?: string;         // "healthcare" | "education" | "finance" | ...
    role?: string;             // "manager" | "individual_contributor" | "student" | ...
    aiUsageFrequency: "never" | "rare" | "weekly" | "daily";
  };
}

export type AIDomain =
  | "ai-fundamentals" | "llm-mechanics" | "prompt-engineering"
  | "ai-ethics" | "ai-bias" | "ai-governance"
  | "generative-ai" | "synthetic-media" | "ai-evaluation"
  | "ai-privacy" | "ai-workplace" | "ai-creativity";

export type MotivationDriver =
  | "career" | "civic" | "curiosity" | "parent_educator" | "creativity" | "caution";
```

**Storage**: one row per user in a `learner_profiles` table, JSON column for the nested fields, regenerated by the behavioral agent on a schedule (nightly) or on explicit trigger events (quiz completed, 10 new page visits, capstone submitted).

**Fallback**: when no profile exists, serve `DEFAULT_PROFILE` = `{ proficiencyLevel: "intermediate", motivationProfile: { primary: "curiosity" }, pacePreference: "standard" }`. Intermediate-curiosity is the safe median that avoids alienating novices AND experts.

### 2.2 Lesson Seed System

Each lesson receives a `LessonSeed` — a pre-computed configuration derived from the profile. Generated server-side, cached per (userId × lessonId), invalidated when profile is regenerated.

```ts
// shared/types/lesson-seed.ts
export interface LessonSeed {
  lessonId: string;
  generatedFor: string;        // userId or cookieId
  profileVersion: string;      // ties seed to a profile generation

  // Content depth
  depthTier: 1 | 2 | 3;        // 1=essentials, 2=standard, 3=deep
  segmentOrder: string[];      // allows reordering or omission
  skipSegments: string[];      // segments to hide (user already mastered)
  expandSegments: string[];    // segments to show deep-dive content for

  // Language shaping
  vocabularyTier: "plain" | "standard" | "technical";
  analogyBank: AnalogyKey[];   // which metaphor set to draw from
  // e.g. for motivationProfile.primary === "career", analogyBank includes
  //   ["workplace-parallel", "colleague-metaphor"]
  //   for "civic": ["policy-parallel", "democracy-metaphor"]

  // Example selection
  exampleDomain: "general" | "workplace" | "healthcare" | "education" | "creative" | "civic";
  examplesPerConcept: 1 | 2 | 3;

  // Assessment shaping
  quizTier: 1 | 2 | 3;         // 1 easier / more scaffolded, 3 harder / more abstract
  quizLength: number;          // 3–8 questions depending on pace profile
  requireCapstoneAIGrading: boolean;
  enableProductiveFailure: boolean; // shows problem before teaching

  // Ethics scenario emphasis
  ethicsScenarioIds: string[]; // prioritize scenarios that match motivation profile

  // Interaction density
  narratorEnabled: boolean;
  autoplayNarrator: boolean;
  showTranscriptDefault: boolean;
  useDragInteractions: boolean;

  // Motivational framing
  framingTheme: "career-advantage" | "civic-agency" | "personal-curiosity" | "family-safety" | "creative-partnership";
  openingHookId: string;       // pointer to a bank of hook variants
  closingCtaId: string;

  // Remediation slots (driven by misconceptionFlags)
  injectRemediation: string[]; // micro-lesson ids to insert
}
```

**Generation function (server-side pseudocode):**

```ts
// server/lib/seed-generator.ts
export function generateLessonSeed(profile: LearnerProfile, lessonId: string): LessonSeed {
  const base = BASE_SEEDS[lessonId]; // canonical seed defined by curriculum
  const seed: LessonSeed = { ...base, generatedFor: profile.userId, profileVersion: profile.generatedAt, lessonId };

  // Proficiency → depth
  if (profile.proficiencyLevel === "novice") {
    seed.depthTier = 1;
    seed.vocabularyTier = "plain";
    seed.examplesPerConcept = 3;
    seed.quizTier = 1;
    seed.enableProductiveFailure = false; // novices need scaffolding, not failure
  } else if (profile.proficiencyLevel === "advanced") {
    seed.depthTier = 3;
    seed.vocabularyTier = "technical";
    seed.examplesPerConcept = 1;
    seed.quizTier = 3;
    seed.enableProductiveFailure = true;
    seed.skipSegments = identifyMastered(profile, lessonId);
  }

  // Pace
  if (profile.pacePreference === "accelerated") {
    seed.quizLength = Math.max(3, base.quizLength - 2);
    seed.examplesPerConcept = Math.max(1, seed.examplesPerConcept - 1);
  } else if (profile.pacePreference === "deliberate") {
    seed.quizLength = base.quizLength + 2;
    seed.examplesPerConcept = Math.min(3, seed.examplesPerConcept + 1);
  }

  // Motivation → framing + ethics scenarios
  seed.framingTheme = FRAMING_BY_MOTIVATION[profile.motivationProfile.primary];
  seed.analogyBank = ANALOGIES_BY_MOTIVATION[profile.motivationProfile.primary];
  seed.ethicsScenarioIds = rankEthicsByMotivation(profile.motivationProfile, base.ethicsScenarioIds);
  seed.exampleDomain = DOMAIN_BY_MOTIVATION[profile.motivationProfile.primary];

  // Misconceptions → remediation
  seed.injectRemediation = profile.misconceptionFlags
    .filter(f => f.strength > 0.5 && REMEDIATION_FOR_LESSON[lessonId]?.[f.id])
    .map(f => REMEDIATION_FOR_LESSON[lessonId][f.id]);

  // Accessibility
  seed.showTranscriptDefault = profile.accessibility.preferTranscript;
  seed.autoplayNarrator = false; // never override this — WCAG concern

  return seed;
}
```

**How the seed reaches the component**: new `LessonSeedContext` provider wraps `<PageWrapper>`. It calls `trpc.learner.getLessonSeeds.useQuery({ courseId })` on mount and caches the result. Lesson components read `useLessonSeed(lessonId)` — a single hook, no prop drilling. Falls back to `DEFAULT_SEED` if query hasn't resolved (avoid loading-spinner flash).

### 2.3 Content Variant System

For each lesson, three tiers. The content bank lives in `shared/content/ai-literacy/` as JSON so it's editable without a redeploy.

**Lesson 1 — What Is AI?**

| Aspect | Novice (depth 1) | Standard (depth 2) | Advanced (depth 3) |
|---|---|---|---|
| Segment 1 framing | "AI is like a very smart autocomplete that learned from millions of examples" | "AI systems perform tasks requiring pattern recognition, language, and decision-making" | "AI = statistical function approximators that learn weighted transformations over high-dimensional inputs" |
| Concepts shown | Narrow AI, LLMs (2 cards) | All 4 (Narrow, ML, DL, LLMs) | All 4 + Transformer, Attention, Foundation Models (7 cards) |
| Segment 2 (training) | Dog-training analogy, 4-step pipeline, no math | Current implementation | Add: loss function shape (convex vs. non-convex), gradient descent one-paragraph, overfitting |
| Segment 3 (landscape) | 3 domains with one risk each | 3 domains, current | 5 domains + regulatory landscape (EU AI Act tiers) |
| Sample novice question | "Which is AI?" ☐ A calculator ☐ Netflix recommendations ☐ A cookbook | "Which best describes ML?" (current) | "Why does gradient descent converge faster with Adam than SGD?" (stretch — optional) |

**Lesson 2 — Myths vs. Reality**

| Aspect | Novice | Standard | Advanced |
|---|---|---|---|
| Opening | Productive-failure sorter disabled — just narrator + 3 callouts | Productive-failure sorter: drag 8 statements into Myth/Reality columns, then teach | Same sorter but with adversarial statements (e.g., *"LLMs are compressed representations of their training data" — true or false?*) |
| Quiz question count | 4 | 6 | 8 |
| Distractor sophistication | Obviously wrong options | Common misconceptions | Partially-true statements requiring nuance |
| Example variant (Q1) | "AI like ChatGPT has feelings. T/F" | Current wording | "Reports of 'emergent deception' in LLMs prove they have goals. T/F" (with explanation of Anthropic/Apollo evaluation context) |

**Lesson 3 — Prompt Engineering**

| Aspect | Novice | Standard | Advanced |
|---|---|---|---|
| Framework | "3 things every prompt needs: Who, What, How" | Current 5 principles (Persona/Context/Specifics/Constraints/Goal) | 5 principles + CoT, few-shot, role-priming, negative constraints |
| Exercises | 2 exercises with starter templates (fill-in-the-blank) | 3 exercises, blank textarea | 3 exercises + 1 adversarial ("this prompt is over-constrained — fix it") |
| Grading | Self-rubric checkboxes + AI rephrasing | **AI-graded rubric** (Phase 2 fix — see §2.5) | Peer-comparable score: "your prompt scored 87/100 — top 30% of learners" |

**Lesson 4 — Ethics & Society**

| Aspect | Novice | Standard | Advanced |
|---|---|---|---|
| Framework | 3 concepts: Fairness, Accountability, Transparency | Add: Consent, Harm Distribution | Add: EU AI Act risk tiers, auditable-AI criteria |
| Scenarios shown | 2 (prioritized by motivation profile) | 3 | 3 + 1 advanced dilemma |
| Reflection grading | Accepted on length | **AI feedback: "your argument considers fairness and accountability; you haven't addressed transparency"** | Counter-argument generator: AI writes the opposing view and the learner responds |

**Lesson 5 — Capstone**

| Aspect | Novice | Standard | Advanced |
|---|---|---|---|
| Prompt structure | Guided scaffold: "The AI system I chose is ___. It uses ___ data. The people who benefit are ___." | Current open-ended prompts | "Write a 500-word op-ed applying Module 1 concepts to [current AI news item fetched server-side]" |
| Grading | AI checks presence of key concepts | AI returns rubric score + targeted revision suggestions | AI-graded + auto-generated certificate + LinkedIn export (Phase 3) |

### 2.4 Motivational Personalization

The framing shift is not mere language swap — it changes *which examples* lead and *which stakes* are emphasized.

**Career-motivated**
- Lesson 1 opener: *"Your manager just asked if the team should adopt Copilot. In 25 minutes, you'll have a mental model sharp enough to answer with evidence."*
- Prompt examples: cover letter, performance review, data summary.
- Ethics scenarios prioritized: hiring algorithm (first), workplace surveillance.
- Closing CTA: "Next — Module 2: AI in the Workplace."

**Civically-motivated**
- Lesson 1 opener: *"AI is already making decisions about bail, benefits, and elections. Your vote in the next five years will include questions about systems you need to understand now."*
- Examples emphasize algorithmic decision-making in public services.
- Ethics scenarios prioritized: predictive policing, algorithmic welfare decisions.
- Closing CTA: "Explore Nexus's AI Governance primer."

**Curiosity-driven**
- Lesson 1 opener: *"There's a decent chance that in the next decade we will build systems that think — or very convincingly seem to. Here's how the ones we have now actually work."*
- Leans into wonder-provoking facts, surprising research, open questions.
- Ethics scenarios prioritized: consciousness & moral status, emergent behaviors.
- Closing CTA: "Next — deep dive on transformers."

**Parent / educator**
- Lesson 1 opener: *"Your kid is using AI for homework whether you know it or not. This course will get you ahead of them in 2 hours."*
- Examples: AI tutors, essay-grading, age-appropriate explanations.
- Ethics scenarios prioritized: AI tutor data collection (first), children's media diet.
- Closing CTA: "AI for Families workshop."

**Implementation**: `shared/content/ai-literacy/framing/{motivation}.json` — one file per motivation driver, containing `{ openingHook, closingCta, examplePreference, analogyBank, ethicsPriorityOrder }`. The seed generator selects the file; lesson components read via hook.

### 2.5 Implementation Roadmap

**Phase 1 — MVP (2–4 days, no backend changes)**

Goal: every existing learner gets a personalization-ready version of the course. Personalization is *wired* but driven by a minimal client-side profile until Phase 2 provides a real one.

Files to change:
1. `client/src/pages/AILiteracy.tsx` — full rewrite (this Phase is the artifact I'm shipping with this audit).
2. `client/src/pages/Learn.tsx` — `AILiteracyTab()` body replaced with `<AILiteracy embedded />` delegation, deleting ~400 lines of duplicate code.
3. `client/src/contexts/PersonalizationContext.tsx` — extend `VisitorProfile` with `coursePreferences: { proficiencyLevel, motivationProfile, pacePreference }` (client-set via a lightweight onboarding gate).
4. New `client/src/lib/lesson-seed.ts` — client-side seed generator that reads profile and returns a `LessonSeed`. This is the same function that will move server-side in Phase 2.
5. New `shared/content/ai-literacy/` — content bank (variants, analogies, framing).

**Phase 2 — Server-side seeds + persistence (1 week)**

Files to create/change:
1. `drizzle/schema.ts` — add `learner_profiles` and `course_progress` tables.
2. `server/routers/learner.ts` — new tRPC router: `getProfile`, `getLessonSeeds(courseId)`, `updateCourseProgress`, `gradePromptExercise`, `gradeCapstoneResponse`.
3. `server/lib/seed-generator.ts` — server version of the Phase 1 client function.
4. `server/lib/behavioral-agent-bridge.ts` — consumes whatever the behavioral agent produces and writes `learner_profiles` rows.
5. `client/src/pages/AILiteracy.tsx` — swap client seed generator for `trpc.learner.getLessonSeeds`.
6. Migration: `scripts/migrate-2026-05-profiles.ts` — backfill default profiles for existing users.

**Phase 3 — Adaptive + generative (2–4 weeks)**

1. Real-time difficulty adjustment: quiz difficulty shifts within a session based on rolling accuracy.
2. Branching paths: wrong answer → remediation micro-lesson → retry.
3. AI-generated variations: for advanced learners, capstone prompts are generated from current AI news (fetched via a scheduled job, not at request time — avoid per-user latency).
4. Certificate generation + LinkedIn export.
5. Cohort signals: "73% of learners also got this wrong first time — here's why."

Each phase is gated by the previous. Phase 1 is shipped with this audit.

---

## PART 3 — Ten World-Class Recommendations

### 1. Productive-failure openers (Kapur)
**Principle**: Learners who attempt and fail at a problem *before* instruction encode the subsequent teaching more deeply (Kapur 2016 meta-analysis, d = 0.40).
**Implementation**: Lesson 2 opens with a drag-sort of 8 statements into Myth / Reality columns. Only after the learner commits are the answers revealed with teaching. Same pattern for Lesson 4 stakeholder-ranking.
**Complexity**: Medium (dnd-kit is already in the platform for the Library drag-drop UI).
**Impact**: High — directly attacks the recall-vs-application gap.

### 2. Spaced retrieval across lessons
**Principle**: Spacing effect (Ebbinghaus / Cepeda): retrieval at increasing intervals doubles long-term retention vs. massed practice.
**Implementation**: 2-question "quick check" at the start of Lessons 2–5 that retrieves a concept from a *prior* lesson. Lesson 3 opens by re-quizzing the LLM mechanism from Lesson 1. No new UI — reuse `QuizBlock`.
**Complexity**: Low.
**Impact**: High — single biggest gap in current design.

### 3. Confidence calibration on every quiz
**Principle**: Metacognition research (Dunlosky, Rawson): asking "how confident are you?" before grading trains self-awareness of knowledge gaps.
**Implementation**: Add a 1–5 confidence slider to each quiz question. Visualize calibration on the results page: "you were 90% confident on Q3 and got it wrong — review that concept."
**Complexity**: Low.
**Impact**: Medium-high.

### 4. AI-graded capstone with rubric scoring
**Principle**: Formative assessment with actionable feedback (Black & Wiliam) shows effect sizes of 0.4–0.7 on achievement.
**Implementation**: New `gradeCapstoneResponse` tRPC mutation. Send user's response + rubric (JSON) + question. AI returns `{ scorePerCriterion, overallBand, strengthNote, growthNote, suggestedRevision }`. Show in-line.
**Complexity**: Medium (need a new server endpoint + prompt engineering on the grading prompt).
**Impact**: High — turns the capstone from vanity credential into genuine learning event.

### 5. Fix the gameable prompt grading (Lesson 3)
**Principle**: Transfer-appropriate processing — practice must match use.
**Implementation**: Two AI calls per prompt submission:
  (a) Execution: "Given this prompt, produce what the AI would likely produce."
  (b) Critique: "Given this prompt and this rubric, score each criterion 0/1 and justify."
Display both. Learner sees both "your prompt would likely produce: ..." and "rubric: persona ✓, context ✗ — you didn't specify audience."
**Complexity**: Low-medium (tRPC endpoint addition, prompt design).
**Impact**: High — removes the single most gameable element in the course.

### 6. Token-prediction visualization for "how LLMs work"
**Principle**: Multimedia principle proper — a diagram that *explains* rather than decorates.
**Implementation**: A small interactive component in Lesson 1 segment 2 where the learner types a half-sentence and sees a mock top-5 next-token distribution (hardcoded plausible distributions for 6 example sentences — no AI call needed). Demystifies autocomplete framing.
**Complexity**: Medium.
**Impact**: High — this is the conceptual linchpin of the whole course.

### 7. Motivation-profile onboarding gate
**Principle**: Self-Determination Theory — a one-question autonomy moment massively increases subsequent engagement.
**Implementation**: Before Lesson 1, show a single question: *"What's bringing you here today?"* with 4 options (career / civic / curiosity / parent-educator). Answer writes to profile, seeds all 5 lessons' framing.
**Complexity**: Low.
**Impact**: High — cheapest large-impact change on the list.

### 8. Inline glossary with hover + long-press
**Principle**: Germane load reduction (Sweller): terminology defined in-context reduces working-memory spillover.
**Implementation**: Wrap defined terms in `<Term>` component that shows a tooltip on hover / long-press on mobile. Novice tier shows tooltip on first appearance automatically; advanced tier suppresses them.
**Complexity**: Low (new component + wrap existing text).
**Impact**: Medium.

### 9. Transcript drawer for narrator
**Principle**: WCAG 2.1 AA compliance (SC 1.2.1) + multi-modal access.
**Implementation**: Each `<Narrator>` gets a ghost "Show transcript" toggle that reveals the `text` prop in a styled block with synchronized highlighting during playback.
**Complexity**: Low.
**Impact**: Medium (regulatory + real accessibility benefit).

### 10. Certificate generation at capstone submission
**Principle**: ARCS Satisfaction — extrinsic recognition sustains motivation through subsequent modules.
**Implementation**: On capstone AI-grade ≥ 70, generate a PDF certificate with user name + date + badge list. Use `@react-pdf/renderer` (lightweight). One-click "Add to LinkedIn" via the LinkedIn Add-to-Profile URL spec.
**Complexity**: Medium (PDF generation, design).
**Impact**: Medium — but high perceived value, drives completion of remaining modules.

---

## Summary

The course is solid B+ work — genuinely above most adult AI literacy offerings online. To reach world-class:
1. Fix the three immediate bugs (emoji mojibake, gameable prompt grading, no persistence).
2. Ship Phase 1 personalization (content variants driven by proficiency × motivation).
3. Add the three learning-science levers with the best evidence base: productive failure, spaced retrieval, AI-graded capstone.

Phase 1 is shipping with this document, as a rewrite of `AILiteracy.tsx`.
