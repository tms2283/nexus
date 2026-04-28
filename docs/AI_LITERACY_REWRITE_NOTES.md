# AI Literacy Modules 1–3 — Evaluation, Rewrite, and Implementation Notes

**Reviewer role:** AI expert and educator, applying cognitive-science principles of learning
**Scope:** Modules 1, 2, 3 of the AI Literacy track (`ai-m1`, `ai-m2`, `ai-m3` in `shared/foundationSeeds.ts`, and the standalone `AILiteracy.tsx.bak` file representing Module 1's rich lesson content)
**Date:** 17 April 2026
**Deliverable status:** Revised seeds + 5 SVG graphics + this notes document. Follow-ups identified inline.

---

## 1. What I actually found when I opened the repo

The evaluation plan you attached described three modules of 5 lessons each (15 lessons total). When I examined the repository, here is what I found:

- **`shared/foundationSeeds.ts`** — This is the active, canonical source of AI module content. It defines 8 AI modules and 8 Logic & Reason modules as *seeds*: 5 short strings per lesson (title, scenario, visual, challenge, trap). These seeds are fed through `buildLesson()` in `foundationCurriculum.ts` and used as prompts for an AI content generator at runtime. The seeds are thin — by design — but that thinness is exactly the problem the plan diagnoses: the AI-generated content that grows from them is only as deep as the seed.

- **`client/src/pages/AILiteracy.tsx.bak`** — A backed-up React file containing hardcoded, rich content for Module 1's five lessons (What Is AI?, Myths, Prompt Engineering, Ethics, Capstone). The `.tsx.bak` extension and the absence of an active `AILiteracy.tsx` mean this file is currently offline — the `/ai-literacy` route in `App.tsx` points to a file that no longer exists. This matches the plan's Module 1 description almost exactly.

- **Modules 2 and 3 as described in the plan do not yet exist as dedicated files.** They exist only as thin seeds in `foundationSeeds.ts`.

- **No embedded `[INSERT]` / `TODO` / instruction markers.** I searched comprehensively (JSX comments, JS comments, string regexes across all relevant files). The "instructions embedded in lessons" you mentioned in your first message are not present as literal markers in the current code. The *evaluation plan itself* IS the set of instructions.

**Net:** Modules 2 and 3 are aspirational. The plan is internally consistent with a *future* state of the modules. My work has to do two things at once: reconstruct Module 1 with improvements, and build out Modules 2 and 3 from seeds upward.

---

## 2. My honest evaluation (separate from the plan)

Read independently, before the plan shaped my thinking, here is what I believe about the three modules as they stand:

### Module 1 (as reflected in `AILiteracy.tsx.bak`)
**Grade: B / B−.** Conceptually correct, technically competent, visually polished. The interactive elements (segmented reading, Narrator component, quiz with explanations, rubric-based prompt exercises, stakeholder accordion) are above average for EdTech.

But: the lesson opens cold with "Artificial Intelligence is the ability of a computer system to perform tasks that typically require human intelligence" — a definition a learner could read anywhere. There is no moment of curiosity, no attempt to validate the confusion the learner walked in with. The 4-step training loop is named but not *explained*: what is a weight, at a mechanistic level, such that adjusting one counts as learning? That question is the difference between a learner who can name the loop and a learner who can reason with it. The myth quiz explains each myth in one or two sentences, which research on belief revision (Kendeou, Van Meter, Nguyen-Jahiel) shows is insufficient for durable correction. The prompt engineering lesson teaches a five-principle checklist without explaining why the principles work — producing learners who can follow the checklist but cannot adapt it. The capstone jumps straight to independent practice, skipping the worked-example scaffolding that transfer-of-learning research consistently requires.

### Module 2 (as reflected in the thin seeds + plan's description)
**Grade: C+ / B−.** The *concepts* selected for the module are genuinely good — tool landscape, output evaluation, prompting for work, career. The output-evaluation concept, in particular, is the single most valuable skill in the entire curriculum.

But in the seeds as they stand, evaluation is taught by showing three examples. That trains pattern-matching, not a generalizable framework. The plan's **7 Failure Modes taxonomy** is the right fix: it replaces "I've seen this before" with "I can name what is wrong." Without it, learners leave the module with workplace vocabulary and no transferable evaluation skill.

### Module 3 (as reflected in the thin seeds + plan's description)
**Grade: B− / C+.** The four-domain choice (health, money, creativity, privacy) is excellent. Real lives intersect AI in these four places more than any other. The seeds' tone is appropriate and practical.

But: each of the four domains has a *technical mechanism* that would raise the lesson from "useful awareness" to "graduate-adjacent understanding," and the current seeds skip it. Health has **sycophancy** (the training-loop-level reason symptom checkers under-refer). Money has the **accessibility thresholds for voice cloning** (3 seconds of audio, not 3 hours) and the **algorithmic-trading flash crash** mechanism. Creativity has **latent space** (which is non-mathematical to convey once you have the right metaphor). Privacy has the **inference chain** (data you gave vs. data that was inferred). Without these, Module 3 is an AI literacy module; with them, it is one of the strongest pieces of adult AI education I have seen.

---

## 3. Where my evaluation matched the plan, and where I varied

**I agreed with the plan on everything substantive.** The plan is accurate, pedagogically sound, and grounded in the right literature. I would not have written it materially differently.

**Minor things I added beyond the plan:**

1. **The `retrievalCue` field.** The plan correctly calls for spaced retrieval between modules. I pushed this one level further: each lesson now carries a `retrievalCue` — a single question that the *next* lesson's opening warmup should ask. This makes the spaced retrieval automatic and grounded in the forgetting curve (Ebbinghaus, retested many times since) rather than bolted on as a separate feature. **If you dislike this, easy to remove.**

2. **Explicit mechanism → callback → real case structure.** The plan asked for these things but did not insist on the same structure across lessons. I standardized them: every revised lesson has a `mechanism` field (the "why"), a `callback` field (how it builds on a specific prior lesson), and a `realCase` field (a named, dated, documented incident). This is more prescriptive than the plan, and I did it because consistency is itself a pedagogical property — learners know where to look for each kind of content and build more efficient mental schemas for the course.

3. **I chose the Acemoglu-Restrepo and Noy-Zhang studies as the primary-research anchors for M2 L9** (career). The plan suggested McKinsey and others as evidence; I flagged McKinsey and Goldman Sachs as *secondary* sources because they are consultancy syntheses with known directional bias, and substituted primary research. **I flagged this choice inline in the seed's `trap` field so the teaching is explicit.**

**Things I did NOT add that I considered and am flagging for your call:**

1. **A "Why this matters to YOU" personalization layer per lesson.** The plan's Mayer-principle Personalization nod is present in the existing Module 1. I considered a user-preference-aware paragraph at the top of each lesson ("because you work in finance, here is how this lesson lands…"). **I did not add it.** It risks false specificity — we'd need learner-domain data we don't have. Flagging for your call.

2. **An explicit pre-module diagnostic.** A 5-question pre-test before Module 1 opens would let the system skip known-mastered content. Strong pedagogy. Not in the plan. Would require significant UI work. **Flagged for your call.**

3. **Module 3 L12 on AI & money** could cover **synthetic-voice CEO-impersonation fraud** (the 2019 UK case, the 2024 Arup $25M case) in addition to the consumer voice-clone scams. I kept it to consumer cases for learner-relevance reasons. **Your call on adding the corporate cases.**

---

## 4. What I delivered

Four files in the outputs directory:

1. **`foundationSeeds.revised.ts`** — A full rewrite of the `ai-m1`, `ai-m2`, `ai-m3` entries in `shared/foundationSeeds.ts`, implementing every depth addition the plan specifies. Extends `FoundationLessonSeed` with optional `hook`, `mechanism`, `callback`, `realCase`, `retrievalCue` fields. The file is a drop-in replacement for the first three module seeds; the remaining 13 module seeds (ai-m4–ai-m8 and lr-m1–lr-m8) are preserved by reference and should be kept verbatim from the original.

2. **Five SVG graphics** for the concepts that most needed visual support:
   - `training-loop.svg` — The 4-step loop with the "weight as a dial" insight panel. Used in M1 L1.
   - `token-prediction.svg` — The probability distribution visualization. Used in M1 L1 and M1 L3.
   - `narrow-vs-general.svg` — The objective-function answer to "why isn't current AI AGI?" Used in M1 L1 and M1 L4.
   - `prompt-cognitive-model.svg` — Wrong mental model vs. right mental model. Used in M1 L3 and M2 L8.
   - `seven-failure-modes.svg` — The 7 Failure Modes taxonomy. Used in M2 L7 (the highest-ROI lesson in the curriculum, per the plan).
   - `inference-chain.svg` — The root-data-to-downstream-consequence chain. Used in M3 L14.

3. **This document** — evaluation, implementation notes, follow-up plan.

---

## 5. What still needs to be done (your call, in priority order)

I have implemented the seeds and the graphics — which is the foundation. To complete the plan there are three remaining work streams:

### A. Restore and rewrite `AILiteracy.tsx`
The file is `.tsx.bak` and the route is broken. The plan's improvements to Module 1 (hook, weights/gradients, token prediction demo, 3-part myth structure, cognitive model, capstone scaffolding) need to be implemented in a restored `AILiteracy.tsx`. I have the architecture in my head but the file is ~86KB and would take a full dedicated rewrite pass. **Estimate: one full session.**

### B. Extend `buildLesson()` in `foundationCurriculum.ts`
The new seed fields (`hook`, `mechanism`, `callback`, `realCase`, `retrievalCue`) need to be read by `buildLesson()` and passed into the `beats` structure so the AI content generator uses them. A ~40-line change. **Estimate: quick, but should be done before the new seeds ship, otherwise the new fields are silently ignored.**

### C. Build dedicated `AIAtWork.tsx` and `AIEverydayLife.tsx` pages
If Modules 2 and 3 deserve the same hardcoded rich-content treatment as Module 1, they need their own React files with interactive elements (drag-and-drop for failure mode classification, decision trees for health, annotation tools for scam messages, scenario-based capstones). This is substantial net-new work. **Estimate: one full session per module.** Alternatively, the improved seeds can drive the AI-generated content path, which is lower effort but lower quality ceiling.

### D. Cross-module spaced retrieval widget
The `retrievalCue` fields I added are ready; they need a lightweight UI that surfaces the prior lesson's retrieval cue at the start of the next lesson. **Estimate: ~2 hours.**

### E. Real-case hyperlinks
Every `realCase` in the revised seeds has a specific citation (name, year, outcome). Each should link to a primary source. **Estimate: ~1 hour per module.**

---

## 6. A note on quality

You asked for these to "stand above the rest." Two principles I applied throughout:

**Mechanism over vocabulary.** Every place the original said "AI can be wrong," the revised seed says "here is the specific mechanism that produces this kind of wrong, here is the specific mitigation that targets that mechanism, here is the named real-world case where this mechanism produced a documented harm." This is the single largest change. It is the difference between students who can recognize and students who can reason.

**Cumulative architecture over parallel lessons.** Each revised lesson explicitly references a prior lesson by ID (the `callback` field). By M3, the concepts from M1 are being used, not re-taught. This is what makes a course a course rather than a playlist, and it is what the plan most correctly insists on.

If the rest of the work (A–E above) is completed, these modules will be — honestly and non-rhetorically — among the strongest AI literacy courses publicly available for adult learners. The concepts are chosen well. The mechanisms are available. What remains is disciplined execution.

---

*— Review and revision completed 17 April 2026.*
