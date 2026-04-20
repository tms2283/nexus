# AI Literacy Module — Pedagogical Audit & Adaptive Architecture Design

**Scope:** `client/src/pages/AILiteracy.tsx` (1495 lines) and the platform primitives it depends on.
**Status at audit:** Pedagogically thoughtful prototype with explicit Mayer references, genuine interactivity, and a coherent 5-lesson arc — but static, not-persisted, and partially corrupted at the byte level.
**Goal of this document:** Specify, with file-level precision, how to convert this module into the reference implementation that every future course on the platform will inherit from.

---

## 0. Executive Summary — The Seven Verdicts

1. **Curriculum scope is ~70% of what a world-class AI literacy module requires.** Solid foundation (definition, myths, prompting, ethics, synthesis); critical gaps in generative-AI specifics, hallucination mechanics, deepfakes/synthetic media, data privacy, AI-in-governance, and human–AI teaming.
2. **Pedagogy is genuinely grounded, not cosmetic.** Mayer principles are actually applied (segmenting in Lesson 1, modality via `Narrator`, testing in quizzes). But Cognitive Load Theory, spaced retrieval, desirable difficulties, and metacognitive scaffolding are missing.
3. **Assessment is shallow.** 10 total quiz questions across 5 lessons, most at Bloom levels 1–2. Distractors are obvious. Capstone gate is a character-count, not a rubric. Ethics scenarios are ungraded.
4. **Progress is ephemeral.** `lesson_progress` and `curriculum_progress` tables exist in `drizzle/schema.ts` but the course never writes to them. A page refresh destroys every quiz score, reflection, and capstone answer. Only `addXP()` persists.
5. **Personalization is imported but unused.** `usePersonalization()` is called three times, only ever to invoke `addXP()`. Content, difficulty, vocabulary, pacing, and examples are identical for every learner.
6. **Source file is byte-level corrupted.** `file(1)` reports "Non-ISO extended-ASCII text." Fifteen lines contain the literal ASCII string `"??"` as emoji placeholders, and em-dashes appear as `�`. This is a UTF-8/Windows-1252 encoding incident, not a rendering bug.
7. **A server-side behavioral agent already exists** (`server/services/personalityAnalyzer.ts` → `userPsychProfiles` table) but is *never surfaced to the lesson UI*. The personalization architecture does not need to be built from scratch — it needs to be wired up.

---

## PART 1 — Full Pedagogical Audit

### 1.1 Curriculum Coverage & Scope

#### What works
The arc — **define → debunk → do → deliberate → synthesize** — is pedagogically sound and mirrors the shape of high-end adult learning (e.g., AI for Everyone's bridging-to-application model). The five lessons progress from declarative knowledge (L1–L2) through procedural skill (L3) to evaluative reasoning (L4) and transfer (L5). Anchoring in concrete domains (healthcare / education / work in L1, Netflix in L5) is appropriate for a non-technical adult audience.

#### Gaps vs. world-class frameworks
Benchmarking against UNESCO's *AI Competency Framework for Students* (2024), MIT Media Lab's *AI Literacy* competencies (Long & Magerko, 2020), and Ng's *AI for Everyone*, these topics are **materially missing**:

| Missing topic | Why it's load-bearing for 2026 adult literacy | Where to add it |
|---|---|---|
| **Generative AI mechanics** — tokens, context windows, temperature, system prompts | L3 treats prompting as a black art; learners cannot diagnose failures without a token-level mental model | Insert as L3 Segment 1, before the principles |
| **Hallucination mechanics** (why it happens, not just that it happens) | L2 mentions hallucination; no learner leaves able to predict *when* an LLM will hallucinate | Expand L2 Myth 6 into a sub-lesson with "predict the hallucination" exercise |
| **Deepfakes & synthetic media** | Civic survival skill; absent entirely | New L4 scenario + L5 capstone prompt |
| **Data privacy & training data provenance** | Touched in L4 (school scenario) but not taught as a concept | Add L1 Segment 4: "Where does the data come from?" |
| **AI in governance** (EU AI Act, algorithmic decision-making in welfare/criminal justice) | L4's predictive-policing capstone presumes knowledge learners were never given | New L4 Segment 0: the regulatory landscape |
| **Model evaluation & verification literacy** | Learners are told to "verify critical AI claims" (Myth 6 explanation) but never taught *how* | New L3 Segment: "Verifying AI output — the three-check protocol" |
| **Human–AI teaming / cognitive offloading risks** | The most practically important 2026 skill: knowing what to keep in your own head | New L5 Segment: "What you should never outsource" |
| **Agents & tool-use** | Agentic AI is mainstream in 2026; course treats AI as a chatbot | Update L1 Segment 3 and add L3 exercise |
| **Environmental/energy cost** | Becoming civic literacy in 2026 | Brief inclusion in L4 ethical dimensions |
| **Explainability vs. interpretability** distinction | L4 mentions "transparency" but collapses the two | Clarify in L4 ethical-dimensions block |

#### Inaccuracies / oversimplifications flagged
- **L1 segment 2, lines 437–442:** "AI doesn't 'understand' the way humans do. It finds statistical patterns so strong that the outputs look like understanding." This is philosophically contested; state it as one of several interpretations rather than fact. Suggested rephrase: *"Whether today's AI 'understands' is a live scientific debate — but mechanically, its behavior is produced by statistical pattern-matching over tokens, not by the symbolic reasoning humans use."*
- **L2 Myth 1, lines 90–99:** "There is no subjective experience" overstates what is knowable; the honest answer is "there is no evidence of subjective experience, and the architecture gives no reason to expect it."
- **L2 Myth 3 (line 103):** Machine learning is defined as "statistics at scale, not a digital brain." Good debunk, but it erases reinforcement learning. Add a one-line note.
- **L3 Principle list (lines 827–833):** Five principles is a defensible simplification of the 6+ in the literature (e.g., Anthropic's guidance), but it omits **examples/few-shot prompting**, which is arguably the highest-leverage technique for novices. Add it as Principle 6.

#### Recommendation
Expand from 5 lessons to **7 lessons**, split as:
1. What Is AI? (expanded — add provenance segment)
2. How Generative AI Actually Works (new — tokens, context, temperature)
3. Myths, Hallucinations & Verification (expanded L2 + verification)
4. Prompting & Collaborating With AI (expanded L3 + few-shot + agents)
5. Synthetic Media & Information Integrity (new)
6. Ethics, Governance & Society (expanded L4 + AI Act)
7. Capstone: Your AI Literacy Compact (expanded L5 + human–AI teaming)

---

### 1.2 Scientific & Pedagogical Methodology

#### Honest assessment of Mayer implementation
**Genuine, not cosmetic.** Evidence:
- *Segmenting* is structurally implemented (L1 lines 495–537 renders three tabbed segments, not one wall of text).
- *Modality* is implemented via `Narrator` (lines 222–290) pairing audio with text.
- *Signaling* is implemented via principle-labeled lesson headers.
- *Personalization principle* (conversational tone) is consistently applied in narration.

This is a legitimate above-average starting point for a web course.

#### What's missing from evidence-based learning science

| Principle | Current state | Required change |
|---|---|---|
| **Cognitive Load Theory (Sweller)** | No load management. L1 Segment 1 introduces 4 technical terms in one card block (lines 390–399) — that's ~4 element interactivity units dumped simultaneously. | Stagger term introduction; one term at a time with a micro-check. Strip extraneous decoration from dense blocks. |
| **Retrieval practice (Roediger & Karpicke)** | Each quiz is a one-shot event. Concepts are never retrieved across lessons. | Add "Recall from Lesson N" micro-quizzes at the start of Lessons 2–5. 1–2 questions each, 30 seconds. |
| **Spaced repetition** | None within the course. The platform has a spaced-repetition flashcard system (`flashcard_reviews` uses SM-2) but the literacy module doesn't feed it. | Auto-generate SM-2 flashcards from L1 definitions and L2 myths on lesson completion. |
| **Desirable difficulties (Bjork)** | Quiz immediately reveals explanations (line 588). Learners don't have to commit and defend. | Force a confidence rating before showing feedback; delay reveal until after all answers in a block. |
| **Elaborative interrogation** | None. | Replace passive reveal in L1 quiz with "Before I show you the answer, explain *why* you chose B." Free-text box. |
| **Self-explanation** | Present in L3 rubric checklist but it's just self-attestation ("did I include this?"). | Add L2 post-quiz prompt: "In one sentence, why does an LLM hallucinate?" Store for review. |
| **Metacognitive scaffolding** | Absent. | Add a calibration meter — learner rates confidence before each quiz, sees accuracy vs. confidence at end ("You were 80% sure but 50% right — you were overconfident about hallucination"). |
| **Vygotsky ZPD** | None — content is fixed. | Addressed by Part 2 (adaptive seeds). |
| **Transfer-appropriate processing** | L5 capstone attempts this; earlier lessons don't. Quiz formats don't mirror real-world AI use. | Shift some assessment from MCQ to "paste this real LLM output — is it hallucinating? Mark the suspect spans." |

#### Highest-impact single addition
**A confidence-calibrated retrieval loop** at the start of Lessons 2–5. This single feature operationalizes retrieval practice, desirable difficulties, and metacognitive scaffolding in one UX. Roediger/Karpicke effect sizes for this pattern are routinely d > 0.7.

---

### 1.3 Assessment Architecture

#### Inventory
- **L1 DEFINITIONS_QUIZ** (lines 126–151): 4 items, all Bloom 1–2 (recall/comprehension).
- **L2 MYTH_QUIZ** (lines 87–124): 6 items, most Bloom 4 (analyze) — genuinely strong.
- **L3 PROMPT_EXERCISES** (lines 154–179): 3 scenarios, self-scored against rubric, Bloom 3 (apply).
- **L4 ETHICS_SCENARIOS** (lines 182–219): 3 scenarios, ungraded free-text, Bloom 5–6 (evaluate/create).
- **L5 CAPSTONE_PROMPTS** (lines 1122–1138): 3 prompts, gated on ≥20 characters per answer — that's it.

#### Problems

1. **Distractor quality is weak in L1.** Example (d3, line 140): "A 'neural network' in AI is inspired by: Internet networks / Electrical grids / The human brain's neuron structure / Social networks." Three distractors are obviously wrong. A learner with zero knowledge can guess from the option stems alone. The distractors should represent *actual misconceptions*: e.g., "A model of how electrons flow through silicon chips" (common conflation of hardware with the learning architecture) or "A database of neuron-like facts" (conflation of storage with computation).

2. **No adaptive assessment.** Every learner sees the same 4 questions in L1. A learner who already knows that AI is Artificial Intelligence is wasting cognitive budget on d1.

3. **The capstone gate is trivially gamed** (line 1228): `capstoneAnswers.filter(a => a.length > 20).length`. A learner can type "asdfasdfasdfasdfasdfasdf" and pass.

4. **Coverage holes — topics taught but never assessed:**
   - L1 Segment 3 impact matrix (healthcare/education/work) — taught, never assessed.
   - L3 five principles — principles are presented but not individually tested.
   - L4 stakeholder perspectives — presented as cards, no assessment confirms the learner absorbed them.
   - L4 "ethical dimensions" (fairness/accountability/transparency, lines 992–994) — taught, never assessed.

5. **No distinction between formative and summative.** Every quiz is both — learners get one shot, see the explanation, move on. No low-stakes practice before high-stakes retrieval.

#### Recommendations

**(a) Rewrite distractors as diagnosed misconceptions.** Each wrong answer should map to a named misconception flag (stored in the profile) so the adaptive system can reinforce it later.

```ts
// shared/schema.ts — proposed quiz item shape
interface QuizItem {
  id: string;
  stem: string;
  choices: { text: string; isCorrect: boolean; misconceptionId?: string }[];
  bloomLevel: 1 | 2 | 3 | 4 | 5 | 6;
  concepts: string[]; // concept tags for spaced retrieval
}
```

**(b) Add formative micro-checks inside each segment.** After each L1 segment, a single retrieval question (not a quiz) — just "type the word that fits" with immediate feedback. No XP, low stakes.

**(c) Replace the capstone character-count gate with an LLM-graded rubric** (we already have `ai.invokeAI`). Four criteria per question, produce a 0–4 score with inline feedback. Guardrail: stream the rubric judgment back as structured JSON, cap at ~200 tokens per question for cost.

**(d) Add a confidence rating to every quiz item.** 3-point scale (guessing / somewhat sure / confident). Show a calibration chart at the end.

**(e) Add terminal retention checks.** 24h and 7d after capstone completion, a 5-question spaced retrieval email/notification drawing from all five lessons. Infrastructure already exists (`flashcards` tables, `scheduled-tasks` MCP).

---

### 1.4 Interactivity & Active Learning

#### Active vs. passive time ratio (estimated)
- L1: ~60% passive (reading segments) / 40% active (quiz). Reading with narration is still passive.
- L2: ~30% passive / 70% active (quiz-dominant). Best ratio of the five.
- L3: ~25% passive / 75% active. Genuine cognitive effort.
- L4: ~40% passive / 60% active. Reflection boxes count as active but are un-graded.
- L5: ~20% passive / 80% active.

**Overall ~35% passive — above average, but the "active" time is dominated by MCQ clicks.** There are no drag-drops, sorts, label-the-diagram, timeline-ordering, or decision-tree simulations. The only non-text interaction is MCQ selection and textarea typing.

#### The prompt-engineering exercise (L3) can be gamed.
The user types a prompt, the system calls `trpc.ai.explainConcept.useMutation` with `level: "student"` (line 801), displays whatever comes back, and the user self-attests against a 4-item rubric to earn 15 XP. No one checks whether the prompt actually improved. A learner can type "help me" → tick all four boxes → collect the XP.

**Fix:** Use `ai.invokeAI` to *grade the prompt* rather than just execute it. Schema:

```ts
const promptRubric = await trpc.ai.invokeAI.mutate({
  task: "grade-prompt",
  input: { userPrompt, exerciseId: ex.id, rubric: ex.rubric },
  // returns: { criterionHits: boolean[4], suggestions: string[] }
});
```

The model judges presence/absence of each rubric criterion. Hand-scored evaluation of ~100 such grades on a dev sample will reveal calibration. XP becomes conditional on model-judged score ≥ 3/4.

#### The ethics discussion (L4) does not enforce reasoning.
Lines 1062–1090: a textarea, a "Save Reflection" button, and a success message that fires on **any** text length. A learner can type "idk" and pass.

**Fix (dual track):**
- *Low-lift:* Require ≥2 stakeholder names mentioned in the response (client-side regex against the scenario's stakeholder list). Respects the learner's freedom; forces them to engage with perspectives.
- *Higher-lift:* LLM-graded rubric. Four criteria: (1) identifies ≥2 stakeholders, (2) acknowledges a tension, (3) proposes a specific safeguard, (4) distinguishes short-term from long-term impact.

#### Missing: productive failure.
Kapur's *productive failure* design — let learners attempt a problem before instruction — is absent. Every segment teaches first, tests second. A world-class version:
- **L3 opener:** "Here's a vague prompt and the bad output it produced. Fix the prompt. We'll tell you the principles afterward." Learner struggles for 3 minutes; *then* the five principles are revealed as the framework that explains their own intuitions.
- **L4 opener:** Present the hiring-algorithm scenario cold. Let learner take a position. *Then* surface stakeholder perspectives and watch them reconsider.

Productive failure effects are robust (d ≈ 0.6 for conceptual transfer) and cost ~3 minutes per implementation.

#### Missing interaction modalities
- **Drag-and-drop** — sorting AI capabilities into "narrow / general / sci-fi"
- **Label-the-diagram** — the 4-step pipeline (L1 Segment 2, lines 418–435) is read-only; make the learner drop labels onto boxes.
- **Timeline ordering** — history of AI (invent in L1)
- **Span-selection** — "highlight the hallucinated claim in this LLM output" (tokenize output, click-to-select)
- **Sliders with consequences** — temperature, context-window, training-data-diversity sliders in a sandbox that shows downstream effect
- **Branching scenarios** — L4 stakeholder decisions that produce different scenario endings

---

### 1.5 Accessibility & Comprehensibility

#### Reading level
Flesch–Kincaid for the narration text is approximately grade 10–11. For a module intended to be civic-literacy material, target grade 8. Specific tough spots:
- "Excels at one specific task" (L1 Segment 1, line 394) → "Is really good at one thing"
- "Statistical pattern-matcher" (L2 Myth 1) → keep for intermediates, swap to "very fancy autocomplete" for novices (see §2.3 vocabulary substitution table).

#### WCAG 2.1 AA audit

| Criterion | Status | Evidence |
|---|---|---|
| 1.1.1 Non-text Content | **FAIL** | Lesson icons (L1 term cards, L4 ethical-dimension cards) render as `"??"`, no `alt` or `aria-label`. |
| 1.3.1 Info & Relationships | **PARTIAL** | Semantic `<button>` used for quiz options; but no `<fieldset>`/`<legend>` grouping or `role="radiogroup"`. |
| 1.4.3 Contrast (Minimum) | **LIKELY PASS** | `oklch` palette on dark background checks out visually; needs measured audit. |
| 2.1.1 Keyboard | **PARTIAL FAIL** | Quiz options accept Enter/Space only because they're `<button>`; segment navigation has no keyboard focus order tested; custom tabs in capstone (L5) lack `role="tablist"`. |
| 2.4.3 Focus Order | **FAIL** | No skip-to-content; narration controls aren't in logical order for SR users. |
| 2.4.7 Focus Visible | **UNKNOWN** | Tailwind defaults exist; no explicit `focus-visible:` classes verified. |
| 3.1.5 Reading Level | **FAIL** for novices | See reading-level notes above. |
| 4.1.2 Name, Role, Value | **PARTIAL FAIL** | `Narrator` mute button has `aria-label`; most interactive elements don't. |

#### Narrator robustness
`window.speechSynthesis` is not an accessibility substitute — it's a convenience layer. A screen reader user already has their own TTS; the narrator competes with it. The course also ships no transcript file. **Fix:** every narrated block needs a visible "Read transcript" toggle that shows the exact narration text (it's already a string — just expose it), and Narrator should pause/yield when a screen reader is detected (`navigator.userAgent` heuristic is unreliable; the cleaner approach is making Narrator opt-in per session).

#### Visual variety
The five lessons are visually monotonous — all use the same card/section pattern on a dark gradient. After 30 minutes learners hit visual fatigue. Recommendations:
- Each lesson gets a distinct accent color applied to a prominent element (already partially in `LESSONS` meta, line 58–84 implies this; verify it's rendered).
- Diagrams for L1 Segment 2 pipeline and L4 ethical-dimensions should use actual SVG diagrams, not three div boxes.

#### Specific UI confusion
The step-flow in L1 Segment 2 (lines 418–435) uses arrows between boxes but the arrows are `"→"` literal characters and the boxes wrap on narrow viewports, so the arrow points into nothing. Fix: SVG connector lines, or CSS arrows that hide on wrap.

---

### 1.6 Motivational & Engagement Architecture

#### Self-Determination Theory audit

| SDT need | Current state |
|---|---|
| **Autonomy** | Minimal. All learners see the same 5 lessons in order. No topic choice, no pace choice. |
| **Competence** | Moderate. Quiz feedback is immediate; progressive XP communicates mastery. But without adaptive difficulty, competence signal is noisy. |
| **Relatedness** | Near zero. No cohort feature, no instructor presence, no mention of other learners, no shared artifacts. |

#### Flow state conditions (Csikszentmihalyi)
- *Clear goals* — each lesson has an XP target ✓
- *Immediate feedback* — quiz reveals answer instantly ✓
- *Challenge–skill balance* — failed (no adaptation)
- *Deep concentration support* — narration helps; but component-local state means interruption = loss of progress, which is flow-destroying

#### Gamification assessment
The XP system is **cosmetic** — it sums to 360–405 points across the module with no threshold, level-up ceremony in-module, no unlocks, no social visibility. It earns a number. Compare to Duolingo's gems + streak + league + chest: every XP event is tied to an emotion-bearing affordance. This module's XP is arithmetic.

#### Narrative/journey
There's an implicit arc (understand → debunk → practice → judge → integrate) but no *explicit* narrative frame. A learner could finish and not realize they progressed. **Fix:** a "commitment" meta-narrative — at L1 start, the learner states why they're here ("I want to teach my kids" / "I'm retraining at work" / "I'm skeptical and want ammunition"). Each lesson ends by returning to that commitment: "Here's how what you just learned serves your reason for being here."

#### ARCS model (Attention, Relevance, Confidence, Satisfaction)
- **Attention:** strong intro hooks in L1 and L2; weaker in L3–L5.
- **Relevance:** strong in L5; moderate elsewhere; this is where the motivational personalization (§2.4) pays the highest dividend.
- **Confidence:** damaged by lack of early low-stakes wins — the first interaction is a 4-question quiz with permanent XP. Add a no-stakes pre-assessment.
- **Satisfaction:** the completion certificate (lines 1279–1294) is visual-only. Make it shareable (download PNG, LinkedIn deep-link).

#### Emotional engagement
The curriculum is cognitively engaging but emotionally flat. Every great adult course has at least one moment of *dissonance* — the fact that upends your assumptions. Candidates:
- A real example of Tay, or of a 2023/2024 hallucination with legal consequences.
- A live demonstration where the learner can make the model confidently wrong.
- A two-minute segment showing how a deepfake of themselves is generated.

---

### 1.7 Structural & Technical Issues

#### Hardcoded content that should be data-driven
All lesson, quiz, and scenario content is inline TS/JSX in `AILiteracy.tsx`. Specifically:
- `LESSONS` (58–84), `MYTH_QUIZ` (87–124), `DEFINITIONS_QUIZ` (126–151), `PROMPT_EXERCISES` (154–179), `ETHICS_SCENARIOS` (182–219), `PRINCIPLES` (827–833), `CAPSTONE_PROMPTS` (1122–1138).
- Every segment body is inline JSX (L1 segments 383–470, L2 intro 650–669, L3 intro 839–858, L4 scenario rendering 1025–1060, L5 body 1170–1294).

**Impact:** Editing a single quiz question requires a developer, a PR, a build, and a deploy. Platform cannot support 10 courses in this shape.

**Fix:** Move all content into the existing `lessons` / `lessonSections` tables (schema already supports it) plus a new `lessonAssessments` table for quiz items. Lesson components become render engines driven by data. See §2.5 Phase 2.

#### State persistence
- Component-local `useState` for everything (qIndex, selected, score, userPrompt, capstoneAnswers, personalPlan).
- `completedLessons` and `totalXP` live in the page component (lines 1303–1305), *not* in `PersonalizationContext`. Page unmount loses them.
- The `lesson_progress` and `curriculum_progress` tables (from `drizzle/schema.ts`) are never written to by this module.
- Only `addXP()` hits the DB — but XP is attributed without a lesson ID (`addXP` takes `{ cookieId, amount }`, no context).

**Fix:** wire `startLessonProgress` / `completeLessonProgress` tRPC mutations (they already exist in `server/routers/lesson.ts`) on lesson entry and completion. Persist quiz answers and capstone responses in new tables (§2.5).

#### Broken emoji rendering — ROOT CAUSE AND FIX

**Root cause:** the file is not UTF-8. `file(1)` reports "Non-ISO extended-ASCII text." Lines 394–397, 597, 748, 992–994 (and the `score` emoji ternaries at lines 1250, 1282, 1290) contain either:
1. The literal two-ASCII-character string `"??"` — these are placeholders a developer typed when they couldn't produce the emoji on their keyboard, OR
2. The Unicode replacement character `U+FFFD` that was downgraded to `??` by a text editor configured for Windows-1252 or similar.

Additional evidence: em-dashes in `desc` strings render as `�` (e.g., line 396: `"neural networks � the engine behind LLMs"`) — this is a UTF-8 multibyte sequence interpreted as Latin-1.

**Fix — two steps, both required:**

1. **Convert the file to UTF-8 with BOM removed.** In VS Code: "Save with Encoding → UTF-8" (no BOM). In CI, add a check: `git show :client/src/pages/AILiteracy.tsx | file -` should report `UTF-8 Unicode text`.
2. **Replace placeholders with intended emoji.** Proposed mapping (verify against design intent):

| Line | Context | Replace with |
|---|---|---|
| 394 | Narrow AI | 🎯 |
| 395 | Machine Learning | 📊 |
| 396 | Deep Learning | 🧠 |
| 397 | LLMs | 💬 |
| 597 | Perfect score celebration | 🎉 / ✨ / 💪 (tiered) |
| 748 | Myth quiz high score | 🏆 / 👍 / 📚 (tiered) |
| 992 | Fairness | ⚖️ |
| 993 | Accountability | 🛡️ |
| 994 | Transparency | 👁️ |
| 1250 / 1282 | Capstone complete | 🏆 |
| 1290 | Badge prefix | 🎖️ |

**Better fix — long-term:** stop using literal emoji in JSX for structural icons. Use `lucide-react` components (already a dependency) so the rendering is SVG-based and not font-dependent: `<Target />`, `<BarChart3 />`, `<Brain />`, `<MessagesSquare />`, `<Scale />`, `<Shield />`, `<Eye />`. Reserve literal emoji for user-facing celebratory moments where the visual character of emoji is the point.

**Add an encoding guard to CI:**

```bash
# .github/workflows/ci.yml — new step
- name: Verify UTF-8 encoding
  run: |
    for f in $(git ls-files '*.tsx' '*.ts' '*.md'); do
      file -b --mime-encoding "$f" | grep -qE '^(utf-8|us-ascii)$' || { echo "Non-UTF8: $f"; exit 1; }
    done
```

#### Performance
The file is 1495 lines / ~86 KB source. Each lesson component re-imports framer-motion's `AnimatePresence` and `motion` atoms. When content is externalized (§2.5 Phase 2), lesson bodies become thin and route-level code-splitting becomes effective. For now:

```tsx
// client/src/pages/AILeracy.tsx — each lesson becomes lazy
const Lesson1 = lazy(() => import("./ai-literacy/Lesson1"));
const Lesson2 = lazy(() => import("./ai-literacy/Lesson2"));
// ...
```

Target: initial bundle for the Learn page route should not include more than the active lesson.

---

## PART 2 — Adaptive Content Architecture Design

This is the load-bearing section. The platform's `userPsychProfiles` table and `personalityAnalyzer` service already exist (see `server/services/personalityAnalyzer.ts` — fields: `inferredBackground`, `inferredInterests`, `inferredGoal`, `inferredLearnStyle`). They are computed but never surfaced. The architecture below formalizes the contract between that profile and lesson rendering, and extends the profile schema to cover what lesson personalization actually needs.

### 2.1 Learner Profile Schema

The existing `userPsychProfiles` schema is thin (5 fields). The course needs richer structure. Proposed evolution — additive, so existing writes continue working:

```ts
// shared/types/learnerProfile.ts (new file)
export type ProficiencyLevel = "novice" | "developing" | "intermediate" | "advanced";
export type PacePreference = "deliberate" | "standard" | "accelerated";
export type EngagementPattern = "skim" | "standard" | "deep" | "variable";
export type MotivationArchetype = "career" | "civic" | "curiosity" | "creative" | "parent_educator" | "skeptic";
export type ModalityPreference = "visual" | "verbal" | "kinesthetic" | "mixed";

export interface LearnerProfile {
  // identity
  profileVersion: 1;
  cookieId: string;
  userId?: number;
  updatedAt: string;

  // proficiency — per domain, with confidence
  proficiency: {
    domain: "ai_literacy" | "generative_ai" | "ethics" | "data_privacy" | string;
    level: ProficiencyLevel;
    confidence: number; // 0–1; inference confidence
    evidence: string[]; // e.g., ["passed_L1_first_try", "high_vocab_usage"]
  }[];

  // priors — concept tags demonstrably known
  priorKnowledge: {
    concept: string;      // e.g., "gradient_descent", "hallucination", "supervised_learning"
    source: "pre_assessment" | "behavior" | "self_report" | "cross_course";
    confidence: number;
  }[];

  // misconceptions the system has detected
  misconceptionFlags: {
    id: string;           // e.g., "ai_is_conscious", "ai_is_objective"
    firstDetected: string;
    remediated: boolean;
    remediationCount: number;
  }[];

  // behavioral — inferred from typing, scroll, pause patterns
  pace: PacePreference;
  engagement: EngagementPattern;
  modality: ModalityPreference;

  // motivation — the "why are you here"
  motivation: {
    primary: MotivationArchetype;
    secondary?: MotivationArchetype;
    statedReason?: string;       // free-text self-declaration at onboarding
    careerContext?: string;      // e.g., "marketing", "teaching", "engineering"
  };

  // preferences the learner can override any inference
  preferences: {
    languageRegister: "plain" | "technical" | "auto";
    analogyPreference: "everyday" | "technical" | "historical" | "auto";
    contentDensity: "sparse" | "standard" | "dense";
    narrationEnabled: boolean;
    reducedMotion: boolean;
  };

  // platform context — what else they've done
  completedLessons: { lessonId: string; completedAt: string; score?: number }[];
  activeStreak: number;
  totalXp: number;
}
```

#### How fields are populated

| Field | Source |
|---|---|
| `proficiency` | Pre-assessment (5 questions at Learn-page entry) + running update from quiz performance |
| `priorKnowledge` | Pre-assessment + cross-course inference from `lesson_progress` + optional self-report |
| `misconceptionFlags` | Wrong-answer `misconceptionId` captures (§1.3 recommendation) |
| `pace` | Median segment dwell time vs. narration duration; scroll velocity |
| `engagement` | `psychProfileSignals` typing metrics (already collected via `psych.recordTypingSummary`) + segment-abandonment rate |
| `modality` | Narration toggle usage + segment-vs-quiz dwell ratio |
| `motivation.primary` | Onboarding question + behavioral reinforcement |
| `preferences.*` | Explicit user toggles in settings; defaults from inference |

Storage: extend `user_psych_profiles` with a `profileJson JSON` column that holds the `LearnerProfile` blob. Keep the existing legacy columns (`inferredBackground`, etc.) for backward compat — they become computed views derived from `profileJson`.

### 2.2 Lesson Seed System

A `LessonSeed` is the contract between the profile and the lesson component. It is generated server-side, cached per (profileVersion, lessonId), and passed to the component as a prop.

```ts
// shared/types/lessonSeed.ts (new file)
export interface LessonSeed {
  seedVersion: 1;
  lessonId: string;
  generatedAt: string;
  profileSnapshotHash: string; // so we can detect staleness

  // pacing & depth
  depthLevel: 1 | 2 | 3 | 4;          // 1=survey, 4=deep technical
  estimatedMinutes: number;
  segmentsToRender: string[];          // IDs of segments to include
  segmentsToCondense: string[];        // IDs to show as "fast-forward" 1-line summaries
  segmentsToExpand: string[];          // IDs to get extra detail blocks

  // assessment
  quizTier: "foundation" | "standard" | "challenge";
  quizItemIds: string[];               // content-bank item IDs to serve
  requireConfidenceRatings: boolean;

  // language & framing
  languageRegister: "plain" | "technical";
  analogyPool: ("everyday" | "technical" | "historical")[];
  motivationalFraming: MotivationArchetype;  // what lens to use for examples
  vocabularyMap: Record<string, string>;      // canonical -> learner-facing term

  // content selection
  examplesToFeature: string[];         // IDs from example bank
  scenariosToPrioritize: string[];     // for L4, which ethics cases to surface first

  // scaffolding
  showHints: boolean;
  showRubric: boolean;
  prefillPrompts: boolean;             // L3: provide scaffold starters
  productiveFailureEnabled: boolean;

  // spaced retrieval injection
  retrievalChecks: {
    fromLessonId: string;
    conceptTag: string;
    itemId: string;
  }[];
}
```

#### Seed generation function

```ts
// server/services/lessonSeedFactory.ts (new file)
export async function generateLessonSeed(
  profile: LearnerProfile,
  lessonId: string,
): Promise<LessonSeed> {
  const rules = SEED_RULES[lessonId]; // per-lesson rule module
  const hash = hashProfileForSeed(profile);

  // 1. depth from proficiency
  const domainProf = profile.proficiency.find(p => p.domain === "ai_literacy");
  const depthLevel = depthFromProficiency(domainProf?.level ?? "novice");

  // 2. segment selection — condense what prior knowledge covers
  const segments = rules.segments.map(s => classifySegment(s, profile));

  // 3. quiz tier + item selection from the question bank
  const quizTier = quizTierFromProficiency(domainProf);
  const quizItemIds = pickItems({
    lessonId, tier: quizTier, depth: depthLevel,
    avoidKnownConcepts: profile.priorKnowledge.filter(p => p.confidence > 0.8).map(p => p.concept),
    targetMisconceptions: profile.misconceptionFlags.filter(f => !f.remediated).map(f => f.id),
    count: rules.quizItemCount,
  });

  // 4. language + motivation
  const register = profile.preferences.languageRegister === "auto"
    ? (domainProf?.level === "novice" ? "plain" : "technical")
    : profile.preferences.languageRegister;

  // 5. retrieval injection — pull 1–2 concepts from earlier lessons
  const retrievalChecks = selectRetrievalChecks(profile, lessonId);

  return {
    seedVersion: 1,
    lessonId,
    generatedAt: new Date().toISOString(),
    profileSnapshotHash: hash,
    depthLevel,
    estimatedMinutes: estimateTime(segments, quizItemIds.length, profile.pace),
    segmentsToRender: segments.filter(s => s.mode === "render").map(s => s.id),
    segmentsToCondense: segments.filter(s => s.mode === "condense").map(s => s.id),
    segmentsToExpand: segments.filter(s => s.mode === "expand").map(s => s.id),
    quizTier,
    quizItemIds,
    requireConfidenceRatings: depthLevel >= 2,
    languageRegister: register,
    analogyPool: analogyPoolFor(profile),
    motivationalFraming: profile.motivation.primary,
    vocabularyMap: vocabForRegister(register),
    examplesToFeature: examplesFor(profile.motivation.primary, lessonId),
    scenariosToPrioritize: scenariosFor(profile, lessonId),
    showHints: domainProf?.level === "novice",
    showRubric: true,
    prefillPrompts: domainProf?.level === "novice",
    productiveFailureEnabled: domainProf?.level !== "novice" && profile.preferences.contentDensity !== "sparse",
    retrievalChecks,
  };
}
```

#### Delivery path

Server tRPC procedure (new): `lesson.getSeed({ lessonId })`. Returns a `LessonSeed`. React Query caches it keyed on `(cookieId, lessonId, profileVersion)`. Seed invalidation happens when the profile is rewritten by `recordPsychSignalAndRefresh`.

Lesson components take the seed as a prop:

```tsx
// client/src/pages/ai-literacy/Lesson1.tsx
export function Lesson1({ seed, onComplete }: { seed: LessonSeed; onComplete: () => void }) {
  const segments = useMemo(
    () => L1_SEGMENT_BANK.filter(s => seed.segmentsToRender.includes(s.id)),
    [seed],
  );
  // ...
}
```

### 2.3 Content Variant System

Per-lesson variant matrix. Novice (N), Intermediate (I), Advanced (A).

#### Lesson 1 — What Is AI?

| Aspect | Novice | Intermediate | Advanced |
|---|---|---|---|
| Segment count | 3 (current) + glossary sidebar | 3, with technical depth boxes | 2 — Segment 1 condensed to 90 seconds |
| Key terms | 4 with analogies | 4 with analogies + formal defs | Formal defs only + "assumed knowledge" callout |
| Pipeline diagram | Labeled, animated step-through | Labeled + loss-function footnote | Interactive — drag labels; introduce backprop |
| Impact matrix | Healthcare/Education/Work | Same + 1 "contested" row | Same + regulatory implications |
| Narration | On by default | User choice | Off by default |
| Quiz depth | 4 items, Bloom 1–2 | 4 items, Bloom 2–3, harder distractors | 3 items, Bloom 3–4, one transfer item |

**Example quiz variant — "What is a neural network?"**
- N: "A computer system loosely inspired by: cars / electrical grids / the brain / the internet"
- I: "Neural networks are best described as: a lookup table / layered math functions that learn weights / a rule-based expert system / a random-forest algorithm"
- A: "The 'deep' in deep learning refers to: data volume / number of parameters / number of stacked non-linear transformations / training runtime"

#### Lesson 2 — Myths vs. Reality

| Aspect | Novice | Intermediate | Advanced |
|---|---|---|---|
| Myth count | 6 (current) | 8 (+ "AI remembers prior chats" + "bigger model = smarter") | 6 harder items + open "hardest myth" debate |
| Framing | Quiz (T/F) | Quiz + one-sentence self-explanation | Myth + counter-example pair; learner classifies which is the myth |
| Hallucination depth | "Sometimes wrong" | "Predicts next token; optimizes plausibility" | Reference paper abstract; "when is retrieval insufficient?" |

#### Lesson 3 — Prompting

| Aspect | Novice | Intermediate | Advanced |
|---|---|---|---|
| Principles | 5 principles, one at a time | 5 principles, matrix view | 6 principles + examples/few-shot + chain-of-thought |
| Exercises | 3 with prefilled scaffolds | 3 free-form | 3 free-form + 1 debug-this-broken-prompt |
| Grading | Rubric self-check | LLM-graded rubric | LLM-graded rubric + "what would fail in production?" reflection |
| Productive failure | Off (scaffolded first) | On | On + "design your own exercise" |

#### Lesson 4 — Ethics & Society

| Aspect | Novice | Intermediate | Advanced |
|---|---|---|---|
| Scenarios | 3 (current) — hiring, medical, school | 3 + deepfake-in-election scenario | 3 harder ones — predictive policing, welfare algorithm, automated sentencing |
| Stakeholder surfacing | Pre-expanded cards | Click to expand | Write your own stakeholder before seeing ours |
| Reflection grading | Ungraded but requires ≥2 stakeholder names | LLM rubric | LLM rubric + counterfactual ("if the tech worked perfectly, would it still be ethical?") |
| Regulatory content | "Governments are debating rules" | Brief EU AI Act + US executive order mention | Compare EU AI Act risk tiers with scenario classification |

#### Lesson 5 — Capstone

| Aspect | Novice | Intermediate | Advanced |
|---|---|---|---|
| Prompts | 3 (current) with example answers as placeholders | 3 without example placeholders | 3 + "teach this to someone else" artifact |
| Gate | LLM rubric ≥ 2/4 per prompt | LLM rubric ≥ 3/4 per prompt | LLM rubric ≥ 3/4 + peer review queue |
| Action plan | 3 prompts (current) | 3 prompts + calendar invite option | 3 prompts + "my 30-day plan" goal tracker |

#### Vocabulary substitution map

```ts
export const VOCAB_MAP = {
  "statistical pattern-matcher": {
    plain: "really fancy autocomplete",
    technical: "statistical pattern-matcher",
  },
  "hallucination": {
    plain: "making stuff up that sounds right",
    technical: "hallucination",
  },
  "token": {
    plain: "small chunk of text (like a word or half a word)",
    technical: "token",
  },
  "parameters / weights": {
    plain: "internal knobs the AI adjusts while learning",
    technical: "parameters",
  },
  "fine-tuning": {
    plain: "extra training to specialize the AI",
    technical: "fine-tuning",
  },
  "gradient descent": {
    plain: "rolling downhill to find the best answer",
    technical: "gradient descent",
  },
  "embedding": {
    plain: "turning words into numbers that capture meaning",
    technical: "embedding",
  },
};
```

### 2.4 Motivational Personalization

Shift of *examples*, *framing*, and *stakes*, not content. The same concept is taught; the wrapper changes.

| Archetype | Framing lens | L1 example | L3 example prompt | L4 priority scenario | L5 action plan emphasis |
|---|---|---|---|---|---|
| **Career** | Workplace impact, competitive edge | "Your company is piloting AI for meeting notes — here's why it hallucinates" | "Write a prompt to help draft a status update for your team" | The hiring algorithm | "One AI skill to demo in my next 1:1" |
| **Civic** | Democracy, rights, policy | "Your city council is voting on facial recognition — here's what the vote means" | "Write a prompt to explain a proposed law to your neighbor" | Predictive policing | "One piece of AI policy I'll follow this quarter" |
| **Curiosity** | Wonder, depth, open questions | "Here's the strangest thing LLMs can do that surprised researchers in 2024" | "Write a prompt to explore something genuinely weird about LLMs" | The one with the most unresolved questions | "One AI question I want to understand more deeply" |
| **Creative** | Artistic use, craft, originality | "Here's how Radiohead used AI for visuals — and what they refused to do" | "Write a prompt to generate a story hook for your own project" | The school-privacy one (reframed as attribution/authorship) | "One creative project I'll prototype with AI" |
| **Parent/educator** | Children's exposure, media literacy | "Your 12-year-old just showed you ChatGPT homework — here's what matters" | "Write a prompt to help you explain AI to a 10-year-old" | The school tutor/privacy scenario | "One conversation I'll have with my kid/student" |
| **Skeptic** | Honest limits, failure modes | "Here's the best case against AI hype — told straight" | "Write a prompt designed to break an LLM — let's see what breaks" | The one with the weakest regulatory response | "One AI use I'm going to actively avoid — and why" |

**Implementation:** each lesson has a `motivationalLens` prop. A single `AnalogyBank` and `ExampleBank` (JSON files or DB tables) indexed by `(conceptId, archetype)` provide the swappable content. The lesson component reads the lens from the seed and picks accordingly.

```ts
// shared/content/exampleBank.ts
export const EXAMPLES = {
  "l1.hallucination.intro": {
    career:    { title: "The meeting-notes mishap", body: "..." },
    civic:     { title: "The court filing that wasn't", body: "..." },
    curiosity: { title: "The invented citation", body: "..." },
    creative:  { title: "The plot hole AI confidently filled", body: "..." },
    parent_educator: { title: "The homework helper that lied", body: "..." },
    skeptic:   { title: "The confident falsehood, benchmarked", body: "..." },
  },
  // ...
};
```

### 2.5 Implementation Roadmap

Three phases. Each phase is independently shippable.

#### Phase 1 — Persistence & Encoding Fix (MVP, ~1 sprint)

**Goal:** fix the byte-level bug, persist progress, prepare for adaptation. No user-visible adaptive behavior yet.

Files to change:
- `client/src/pages/AILiteracy.tsx` — convert to UTF-8, replace `"??"` placeholders with lucide-react icons or intended emoji.
- `client/src/pages/AILiteracy.tsx` — on lesson mount, call `trpc.lesson.startLessonProgress.mutate({ lessonId })`. On `handleComplete`, call `trpc.lesson.completeLessonProgress.mutate({ lessonId, score, timeSpentSeconds })`.
- `client/src/pages/AILiteracy.tsx` — on mount, hydrate `completedLessons` and `capstoneAnswers` from `trpc.lesson.getUserProgress.useQuery`.
- `drizzle/schema.ts` — new table `lesson_assessment_responses` storing (userId|cookieId, lessonId, itemId, response, isCorrect, confidence, answeredAt). New table `lesson_reflections` for free-text (capstone, ethics, action plan).
- `server/routers/lesson.ts` — extend `completeLessonProgress` to accept `{ assessmentResponses, reflections }` and persist.
- `.github/workflows/ci.yml` — add UTF-8 encoding guard (script in §1.7).
- Extract `LESSONS`, `MYTH_QUIZ`, `DEFINITIONS_QUIZ`, `PROMPT_EXERCISES`, `ETHICS_SCENARIOS`, `CAPSTONE_PROMPTS` into `client/src/content/ai-literacy/*.ts` modules. Code-split lessons via `React.lazy`.

**Acceptance:**
- Zero `"??"` in source.
- `file client/src/pages/*.tsx` reports UTF-8 for every file.
- Refreshing the page mid-lesson restores completion state.
- Every quiz answer and capstone response is in the DB, viewable via SQL.

#### Phase 2 — Profile Contract & Seed System (~2 sprints)

**Goal:** profile is exposed, seeds drive rendering, content variants are live at all three proficiency tiers.

Files to create:
- `shared/types/learnerProfile.ts` — `LearnerProfile` type.
- `shared/types/lessonSeed.ts` — `LessonSeed` type.
- `server/services/lessonSeedFactory.ts` — seed generation.
- `server/services/profileExtender.ts` — enriches `userPsychProfiles` into `LearnerProfile` (consumes signals, quiz history, lesson progress).
- `server/routers/lesson.ts` — new procedure `getSeed({ lessonId })`.
- `client/src/contexts/LearnerProfileContext.tsx` — hydrate from `profile.getMyProfile`; expose `useLearnerProfile()`.
- `client/src/pages/ai-literacy/content/` — three variant files per lesson: `lesson1.novice.ts`, `lesson1.intermediate.ts`, `lesson1.advanced.ts`, OR a single bank with variant fields.
- `client/src/pages/ai-literacy/Lesson1.tsx` etc. — split out of the monolith, accept `LessonSeed` prop, render accordingly.
- `drizzle/schema.ts` — add `profileJson JSON` column to `user_psych_profiles`.

Files to modify:
- `server/services/personalityAnalyzer.ts` — update to populate `profileJson`.
- `client/src/pages/AILiteracy.tsx` — becomes a thin orchestrator: fetch seed → render appropriate lazy lesson.
- `client/src/contexts/PersonalizationContext.tsx` — remains untouched; profile is in its own new context for separation. `addXP()` continues to work identically.

**Acceptance:**
- `trpc.lesson.getSeed.query({ lessonId: "ai-literacy-l1" })` returns a valid `LessonSeed` that visibly differs between a novice and an advanced profile.
- Swapping `profile.proficiency[0].level` from "novice" to "advanced" in the DB produces a materially different Lesson 1 (fewer segments, harder quiz).
- No existing `usePersonalization()` call sites break. `addXP` semantics unchanged.

#### Phase 3 — Adaptive Intelligence Layer (~2–3 sprints)

**Goal:** real-time adaptation, LLM-assisted grading, branching, cross-course personalization.

New capabilities:
- **Real-time difficulty adjustment:** if learner misses first 2 of 4 quiz items, next item comes from a lower-difficulty pool. If first 2 are right, next item is harder.
- **LLM-graded open responses:** `ai.gradeOpenResponse({ rubric, response })` returning structured score + feedback. Applied to L3 prompts, L4 reflections, L5 capstone.
- **Branching paths:** L4 scenario outcomes differ based on stakeholder chosen. L5 action plan branches based on motivation archetype.
- **Spaced retrieval scheduling:** on L1 completion, enqueue SM-2 flashcards for definitions. `scheduled-tasks` MCP fires notifications.
- **Cross-course transfer:** later courses consult `priorKnowledge` and skip concepts already demonstrated.
- **AI-generated content variations:** for the long tail — if no example bank entry exists for `(career, L1.hallucination)`, generate on-demand and cache.

Files to create:
- `server/services/adaptiveAssessment.ts` — real-time difficulty selection.
- `server/routers/ai.ts` — extend with `gradeOpenResponse`.
- `server/services/retrievalScheduler.ts` — SM-2 integration with existing flashcard tables.
- `server/services/contentGenerator.ts` — LLM-backed example generation with caching and human-review queue.

**Acceptance:**
- A novice who aces first two quiz items sees a harder third item in the same session.
- LLM-graded capstone returns per-criterion feedback, not just pass/fail.
- 24h after L1 completion, the learner receives a single spaced-retrieval flashcard.
- The "career" archetype learner in L1 sees the meeting-notes hallucination example; the "civic" archetype sees the court filing example.

---

## PART 3 — Top 10 World-Class Recommendations

Each ranked by expected impact × differentiation. Rated with complexity (C: L/M/H) and impact (I: L/M/H).

### 1. Confidence-calibrated retrieval loop
**Principle:** Retrieval practice + metacognitive calibration (Roediger, Karpicke; Dunlosky).
**What:** Before every quiz answer, learner rates confidence (3-point). At lesson end, a calibration chart shows "you were 80% sure, 50% right — you're overconfident about hallucination." Miscalibrations are flagged into `misconceptionFlags`.
**Where:** New `ConfidenceRating` component; extend quiz item schema with `confidenceCollected`. Calibration view as a new end-of-lesson screen.
**C: M / I: H.** Nobody in the consumer-AI-literacy space does this. It's straight out of the metacognition literature and produces visceral "oh — I thought I knew this" moments that drive deeper engagement.

### 2. Productive failure openers
**Principle:** Kapur (2008, 2015) — struggling before instruction dramatically improves conceptual transfer.
**What:** Each lesson opens with a hard task before teaching. L3 opens with "fix this bad prompt"; L4 opens with "what should this hospital do?" — then principles are introduced as the framework that names what the learner intuited.
**Where:** Add `productiveFailureOpener` field to each lesson's content module. Conditional on `seed.productiveFailureEnabled`.
**C: M / I: H.** Flip from "learn then apply" to "attempt then frame" — most adult courses don't do this because it feels uncomfortable. That's the point.

### 3. LLM-graded open-response rubrics with actionable feedback
**Principle:** Transfer-appropriate processing; specificity of feedback (Hattie).
**What:** Replace self-attestation with structured LLM grading. Return criterion-level judgments and one *specific* suggestion per criterion. Stream the feedback so the UI feels responsive.
**Where:** `server/routers/ai.ts → gradeOpenResponse`. Cache by `(rubricHash, responseHash)` for cost control.
**C: M / I: H.** Separates this from every free course online, where free-response questions are either trivially self-scored or not present.

### 4. Commitment framing + motivational return hooks
**Principle:** Self-Determination Theory (autonomy) + spaced reminder of why.
**What:** Pre-L1, learner states *why* they're taking the course (picks from archetype + free-text). Every lesson ends by tying what was just learned back to that commitment. The completion certificate quotes their stated reason verbatim.
**Where:** `LearnerProfile.motivation.statedReason`; `MotivationalReturn` component rendered at end of each lesson; certificate template reads from profile.
**C: L / I: H.** Cheap, emotionally resonant. Converts completion from a metric into a fulfilled promise to yourself.

### 5. Span-selection hallucination identification exercise
**Principle:** Transfer-appropriate processing — assessment modality mirrors real-world use.
**What:** Show a 200-word LLM-generated paragraph that contains 2 fabrications. Learner highlights the suspect spans. System reveals which were wrong and why. Use actual LLM outputs from curated cases, not synthetic examples.
**Where:** New `SpanSelector` component; content bank of labeled hallucination samples in `client/src/content/hallucination-samples/`.
**C: M / I: H.** No major course teaches hallucination detection as a motor skill. This is the single highest-transfer skill for 2026 life.

### 6. Live "break the model" sandbox
**Principle:** Emotional engagement + constructive failure + epistemic humility.
**What:** A controlled sandbox in L2 where learners submit prompts designed to make the model wrong. Shows them their prompt's output, next to a leaderboard of how badly they fooled the model. Uses existing `ai.invokeAI` with a low-temperature eval model to judge wrongness.
**Where:** New L2 segment. Cost-controlled via per-session budget.
**C: M / I: H.** Viscerally demonstrates AI fallibility in a way no reading can. Memorable.

### 7. Deepfake-of-yourself educational moment
**Principle:** Cognitive dissonance; relevance (ARCS).
**What:** In L5 or a new synthetic-media lesson, with explicit consent, show the learner a 5-second synthetic voice/face clip that *sounds like them* using a prompted base voice. Teach the pipeline. Then show them how to identify such content. This is a privacy-risky idea — implement with strong guardrails (client-side only, no upload, ephemeral) or fall back to a celebrity example they opt into.
**Where:** New lesson; new `SyntheticMediaSandbox` with local-only processing via browser `Whisper.wasm` + voice synthesis fallback.
**C: H / I: H.** The single most memorable moment a 2026 AI-literacy course can offer. It's also the demo that differentiates this from Coursera content.

### 8. Cross-lesson concept graph with dependency visualization
**Principle:** Constructivism + metacognition — learners need to see their own growing map.
**What:** Each concept taught is a node. As learner completes lessons, nodes light up. Prerequisite edges show what unlocks what. Misconception flags appear as red pulsing nodes. At any point the learner can see their own state of knowledge as a graph.
**Where:** Platform already has `mindmap` router and concept-graph infrastructure. Add `conceptTag` to every lesson section and quiz item. New `/learn/my-map` page.
**C: M / I: M.** Distinctive, motivating, extensible across courses. Fits the platform's stated strategy in `PLATFORM_STRATEGY.md`.

### 9. Peer-anonymous reasoning comparison
**Principle:** Social learning + Vygotsky ZPD without cohort logistics.
**What:** After L4 reflection and L5 capstone, show the learner 2 anonymized, human-written responses from other learners (same motivation archetype) side-by-side with their own. "How is this response different from yours? What did they consider that you didn't?" No chat, no friction — just comparison.
**Where:** `lesson_reflections` table already will exist from Phase 1. Add simple moderation queue (or LLM pre-screen) before responses enter the comparison pool.
**C: M / I: M-H.** Gets relatedness (SDT) without building a full social layer. Tradeoff: privacy and moderation must be airtight.

### 10. A visible, editable, learner-owned profile
**Principle:** Learner autonomy; the system is not an oracle but a collaborator.
**What:** `/learn/my-profile` page where the learner can see what the system inferred about them ("We think you're a novice at generative AI, intermediate at ethics, motivated by career reasons") and override any field. Makes the adaptive system transparent and contestable — the opposite of an opaque algorithm.
**Where:** Surface `LearnerProfile` with edit UI. Any override writes to `preferences` and flags related inferences as `overridden: true`.
**C: L-M / I: H.** Differentiator. Most adaptive systems are black boxes. This is in the spirit of the very literacy the course is teaching — it makes the course practice what it preaches.

---

## Appendix A — File-level Action List for Phase 1

Concrete edits, ordered by dependency.

1. **`client/src/pages/AILiteracy.tsx`** — Save as UTF-8; replace placeholders at lines 394–397, 597, 748, 992–994, 1250, 1282, 1290; fix em-dash artifacts in `desc` strings (search for `�`). Recommend switching the term-card and ethical-dimension icons to lucide-react components.
2. **`.github/workflows/ci.yml`** — Add the UTF-8 check step from §1.7.
3. **`drizzle/schema.ts`** — Add `lesson_assessment_responses` and `lesson_reflections` tables.
4. **`drizzle/` migration** — Generated from schema change.
5. **`server/routers/lesson.ts`** — Extend `completeLessonProgress` with assessment + reflection payloads; add `getAssessmentHistory`.
6. **`client/src/content/ai-literacy/`** (new dir) — Extract `LESSONS`, all quiz arrays, exercises, scenarios, capstone prompts, principles from `AILiteracy.tsx` into content modules.
7. **`client/src/pages/ai-literacy/`** (new dir) — Split `Lesson1`–`Lesson5` into their own files. Import content from step 6.
8. **`client/src/pages/AILiteracy.tsx`** — Becomes a thin shell: lazy-loads lessons, manages `activeLesson`, wires progress mutations, reads `getUserProgress` on mount to hydrate state.
9. **Code-splitting verification** — `vite build` size per lesson chunk ≤ 40KB gzipped.

---

## Appendix B — Definition of Done for "World-Class"

This module is a production-grade reference when:

- [ ] Source is byte-correct UTF-8 and CI enforces it.
- [ ] No lesson state is lost on refresh.
- [ ] Every quiz item, reflection, and capstone answer is persisted with learner identity.
- [ ] A newly registered novice sees materially different content from a returning advanced learner.
- [ ] Quiz distractors are diagnostic — each wrong answer maps to a named misconception.
- [ ] Every open-response item has rubric-based feedback (LLM-graded, human-reviewable).
- [ ] Learner sees a calibration view after each lesson (confidence vs. accuracy).
- [ ] Learner can view and edit their inferred profile.
- [ ] WCAG 2.1 AA audit passes for the lesson experience.
- [ ] At least one lesson contains a productive-failure opener.
- [ ] At least one lesson contains a transfer-appropriate open-ended task (span selection, live sandbox, or write-to-teach).
- [ ] 24-hour and 7-day spaced retrieval events fire automatically after completion.
- [ ] The same adaptive architecture (`LessonSeed`, `LearnerProfile`) is the contract that the next course inherits — no bespoke personalization code per course.

That last bullet is the real test. Every decision in Part 2 is shaped by the constraint that Lesson 6 of AI Literacy, and Lesson 1 of the future Ethics course, and Lesson 1 of the future Philosophy course, all render from the same seed shape and the same profile. If the AI Literacy module can be built without this discipline, it should be rebuilt until it cannot.
