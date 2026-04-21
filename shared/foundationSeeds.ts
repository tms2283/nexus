// shared/foundationSeeds.ts
//
// AI Literacy Modules 1-3 revised with hook/mechanism/callback/realCase/retrievalCue
// fields for richer AI-generated lesson content. Modules 4-8 and logic modules
// preserved verbatim. See implementation-notes.md in the rewrite bundle.

export type FoundationLessonSeed = {
  title: string;
  // The cold-open that creates curiosity BEFORE definitions.
  hook?: string;
  scenario: string;
  visual: string;
  // The "why at a mechanistic level" — new field, core to the plan.
  mechanism?: string;
  // Explicit reference to an earlier lesson this one extends.
  callback?: string;
  // A real documented case (name, year, outcome where known).
  realCase?: string;
  challenge: string;
  trap: string;
  // Retrieval-practice warmup for the NEXT lesson to surface this one.
  retrievalCue?: string;
};

export type FoundationModuleSeed = {
  id: string;
  title: string;
  purpose: string;
  outcomes: string[];
  signatureInteractions: string[];
  capstone: string;
  estimatedMinutes: number;
  lessons: FoundationLessonSeed[];
};

export const aiModuleSeeds: FoundationModuleSeed[] = [
  // ───────────────────────────────────────────────────────────────────────────
  // MODULE 1 — Introduction to AI
  //
  // Arc: confusion → grounded mental model of what a model IS and what
  // "training" actually does. By the end, the learner can reason about
  // why LLMs behave as they do — not just describe behaviour.
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "ai-m1",
    title: "Module 1 — Introduction to AI",
    purpose:
      "Build a mechanistic mental model of what AI actually is so every later lesson compounds. The target is not vocabulary; it is the ability to reason about systems the learner has never seen before.",
    outcomes: [
      "Explain what a 'weight' is and why adjusting weights counts as 'learning'.",
      "Predict, for a new AI product, whether it is narrow AI, automation, or something else.",
      "Describe the cognitive model that explains why prompting works (document completion, not instruction-following).",
      "Identify three myths about AI and explain the specific mechanism that disconfirms each.",
      "Evaluate an AI-adjacent headline and rewrite it to match what current systems actually do.",
    ],
    signatureInteractions: [
      "Six-products hook: what do a spam filter, ChatGPT, Netflix, a Tesla, DALL-E, and Stockfish share?",
      "Token-prediction demo: guess the next word, then see the model's probability distribution.",
      "Build-a-prompt: drag persona/context/constraint blocks and see the assembled prompt scored against a rubric.",
      "Myth 3-part reveal: steelman → disconfirming mechanism → replacement truth.",
    ],
    capstone:
      "Given a novel AI product description the learner has never seen, produce a short brief: what it is, how it was likely trained, two failure modes to expect, and one ethical question it raises.",
    estimatedMinutes: 95,
    lessons: [
      {
        title: "What Is AI? — building the mental model",
        hook:
          "Here are six products all marketed as 'AI': your Gmail spam filter, ChatGPT, Netflix recommendations, a Tesla on autopilot, DALL-E, and a chess engine that beats every human alive. What do they actually have in common? (Spoiler: less than the word suggests.)",
        scenario:
          "A company labels a plain rules engine as 'AI-powered' in a sales deck. Another company uses an actual neural network but calls it 'automation'. A buyer confuses the two and chooses badly. The difference is not marketing — it is how each system was built.",
        visual:
          "A 4-zone map: rules-based software / workflow automation / machine learning / deep learning. Each zone shows the essential difference — who wrote the logic (human vs. fitted from data) — not surface features.",
        mechanism:
          "The core distinction is not 'how smart it looks' but whose decisions are in it: in traditional software, a human wrote every rule. In ML, a human specified the goal and the data, and the rules were SHAPED by feedback. A 'weight' in a neural network is literally a number on a dial. Training turns billions of dials until the model's guesses match reality. No rules were written — the pattern was fitted.",
        realCase:
          "Gmail's spam filter (2017 onward). It stopped being a rulebook of suspicious keywords and became a trained classifier that updates as spammers adapt. The user saw 'fewer false positives'. The underlying shift was a category change from software to ML.",
        challenge:
          "Find five products advertised as AI. For each, state what it actually is (rules engine, automation, ML, LLM) and the single piece of evidence that justifies your call.",
        trap:
          "Treating any adaptive or digital system as AI — and letting that vocabulary haze prevent clear thinking about what the product can and cannot do.",
        retrievalCue:
          "Before the next lesson: in one sentence, what is a 'weight'?",
      },
      {
        title: "Myths vs. reality — three-part correction",
        hook:
          "The most dangerous AI myths are not obviously wrong. They are ALMOST right — right enough that smart people hold them. This lesson attacks each myth by first explaining why it is intuitive, then showing the specific evidence that breaks it.",
        scenario:
          "A news headline reads: 'AI chatbot passes medical board exam — human doctors now obsolete.' The headline is not exactly false. But every load-bearing word in it is doing something misleading, and a reader without training misses the misdirection.",
        visual:
          "Myth → three-panel card: (1) why the myth feels true (the steelman), (2) the mechanism that disconfirms it, (3) the nuanced replacement belief. Applied to seven myths including sycophancy and 'AI is neutral because it is math.'",
        mechanism:
          "Myth correction fails when it stops at 'that's wrong.' Research on belief revision (Kendeou, Van Meter, Nguyen-Jahiel) shows that a wrong model only gets replaced when a specific, concrete, mechanistic alternative is provided. Every myth in this lesson is paired with WHY it is convincing, WHICH test fails for it, and WHAT to believe instead.",
        callback:
          "Uses the 'weight as a dial' concept from Lesson 1 to explain why the 'AI is neutral because math' myth is wrong: dials were set by data, and historical data encodes past decisions — which often encoded bias.",
        realCase:
          "Amazon's internal recruiting AI, scrapped in 2018 after it was found to downgrade resumes containing the word 'women's' (e.g., 'women's chess club'). The system was technically neutral; the data was not.",
        challenge:
          "Take one AI-related headline from this week. Identify the myth it is leaning on, the mechanism that disconfirms it, and rewrite it to match what the underlying system actually does.",
        trap:
          "Accepting a one-sentence myth correction as sufficient. Beliefs are not updated by brief contradiction; they are updated by mechanistic replacement.",
        retrievalCue:
          "Before the next lesson: why does a longer, more confident AI answer NOT imply a more correct AI answer?",
      },
      {
        title: "Prompt engineering — the cognitive model",
        hook:
          "Everyone teaches prompting as a checklist: persona, context, constraints, goal. The checklist works, but nobody explains WHY it works. Once you see the real reason, every 'prompt hack' becomes obvious, and the ones that don't work become equally obvious.",
        scenario:
          "Two people ask the same question to the same model and get wildly different answers. Not because one has a secret trick, but because one understands what the model is actually doing when it generates text.",
        visual:
          "Two side-by-side mental models. Left (wrong): prompt = order to an assistant. Right (right): prompt = opening of a document the model is completing. Every prompting principle falls out of the right-side model as a simple consequence.",
        mechanism:
          "An LLM is trained on one objective: given some text, predict what comes next. A prompt is not parsed as an instruction; it is read as a partial document the model is asked to continue. This is why: (a) persona framing works (it specifies the KIND of document), (b) examples outperform rules (they show the document's shape), (c) 'Think step by step' works (Wei et al. 2022 — it forces the model to generate intermediate tokens that carry reasoning, instead of jumping straight to an output where compounding errors are invisible).",
        callback:
          "Builds directly on Lesson 1: because the model's 'weights' were fitted to predict text, EVERYTHING the model does is next-token prediction. There is no other process running underneath.",
        challenge:
          "Take one vague prompt. Rewrite it twice: once using the cognitive model (frame it as the start of a specific KIND of document), once using chain-of-thought ('think step by step before answering'). Compare the three outputs and explain what changed and why.",
        trap:
          "Following the 5-principle checklist (persona/context/specifics/constraints/goal) as a ritual without understanding what the principles are proxies for. Learners who memorise the checklist fail when they meet a prompting situation it does not cover.",
        retrievalCue:
          "Before the next lesson: why is it that 'think step by step' reliably improves reasoning tasks? (Answer in terms of what tokens the model generates.)",
      },
      {
        title: "Ethics and alignment — the hard part",
        hook:
          "The surprising thing about AI ethics is that the engineers are not careless. The hardest problem in AI right now is not building capable systems — it is specifying what we actually want those systems to do, precisely enough that they do it without surprise. That is called the alignment problem.",
        scenario:
          "A hiring algorithm is designed to 'find the best candidates'. The data shows past best candidates were usually hired. The algorithm learns that pattern — and now filters out candidates who look different from past hires. Nobody asked for bias. Bias emerged from the combination of a seemingly-reasonable objective and a non-neutral history.",
        visual:
          "A four-quadrant ethics frame (Autonomy / Beneficence / Non-maleficence / Justice) applied to three real scenarios: hiring AI, medical triage chatbots, school AI tutors. Each scenario has at least three stakeholders whose interests are mapped onto the quadrants.",
        mechanism:
          "Three mechanisms that produce ethical failure even when engineers are well-intentioned: (1) Goodhart's Law — when a measure becomes a target, it stops being a good measure; (2) training-data encoding — the past gets baked in; (3) RLHF side-effects — 'train the model to say what raters reward' converges on sycophancy and confident reassurance, not truth.",
        callback:
          "Uses the weight-tuning picture from Lesson 1 (bias enters through the data the dials were tuned on) and the myth 'AI is neutral because math' from Lesson 2.",
        realCase:
          "The Amazon hiring tool (Reuters, 2018) — killed after internal audit. COMPAS recidivism scoring (ProPublica, 2016) — scored Black defendants as higher-risk at disproportionate rates. These are not edge cases; they are the central examples that shape the field today.",
        challenge:
          "Pick one AI system deployed in your city or workplace. Map three stakeholders onto the ethics quadrants. Identify one safeguard you would require before deployment, and state specifically what it protects against.",
        trap:
          "Reducing AI ethics to 'bias bad, transparency good.' Real ethical analysis requires identifying whose values, whose data, whose outcomes, and whose accountability — and where these come apart.",
        retrievalCue:
          "Before the next lesson: what is Goodhart's Law, and how does it connect to AI sycophancy?",
      },
      {
        title: "Capstone — a scaffolded transfer task",
        hook:
          "Here is the one capstone exercise that separates learners who memorised the vocabulary from learners who can actually reason about AI: apply what you know to a system you have never seen before.",
        scenario:
          "A fictional — but realistic — product description is presented: an 'AI-powered' scheduling assistant for small-business owners that 'learns your preferences'. The learner is given no more information than a real product page would provide, and asked to produce a professional brief.",
        visual:
          "Worked-example ladder: (1) a FULLY completed sample brief for a different product, with annotations explaining why each section is good; (2) a PARTIAL brief for a new product where scaffolding is removed; (3) a fully independent brief on a third product.",
        mechanism:
          "Worked-example → faded-example → independent-practice is the strongest known scaffold for transfer of learning (Sweller, van Merriënboer, Paas — 1998, and replicated across dozens of domains since). Jumping straight to independent practice skips the schema-building stage and produces shallower transfer.",
        callback:
          "Pulls on every prior lesson: Lesson 1 for the 'what kind of system is this?' analysis, Lesson 2 for myth-checking the marketing, Lesson 3 to design the prompts a user would need, Lesson 4 for the ethics review.",
        challenge:
          "Produce a one-page brief with sections: (a) likely architecture, (b) likely training data, (c) two predictable failure modes with mechanism, (d) one ethical question, (e) two prompts a user should try to stress-test the system. The AI evaluator scores each section on a specific rubric.",
        trap:
          "Producing surface content that uses the right words without demonstrating the reasoning. The rubric specifically checks for mechanism-level claims, not vocabulary matches.",
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // MODULE 2 — AI at Work
  //
  // Arc: the learner now has a model of what AI IS (M1). This module turns
  // that into practical skill: choosing tools, evaluating outputs, prompting
  // at work, reasoning about career impact.
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "ai-m2",
    title: "Module 2 — AI at Work",
    purpose:
      "Build the professional-grade skill of using AI well: choosing tools using a generalizable framework (not a catalogue), evaluating outputs using the 7-failure-modes taxonomy (not pattern recognition), and reasoning about career impact from evidence (not anxiety).",
    outcomes: [
      "Apply a 5-dimension tool-selection framework to any AI tool, including ones not on this list.",
      "Classify any AI output against the 7 Failure Modes and state which failure mode it exhibits.",
      "Execute a chain-of-thought + iterative-refinement prompt workflow for a complex work task.",
      "Cite one piece of primary research when discussing AI's impact on a specific occupation.",
      "Design a human-AI workflow that uses AI for leverage without surrendering professional judgment.",
    ],
    signatureInteractions: [
      "Tool scorecard: rate 3 tools on 5 dimensions (data sovereignty, hallucination risk, integration cost, human-in-loop design, update frequency).",
      "Failure-mode annotation: highlight problematic phrases in a long AI output before seeing the annotated version.",
      "Chain-of-thought side-by-side: same question, standard vs. CoT prompt, compare reasoning traces.",
    ],
    capstone:
      "Take a live AI output from the learner's own work context, classify every questionable claim against the 7 failure modes, and produce a revised prompt that reduces the most dangerous failure mode identified.",
    estimatedMinutes: 105,
    lessons: [
      {
        title: "The tool landscape — a selection framework, not a catalogue",
        hook:
          "Any list of 'top AI tools' is out of date by the time it's published. The skill worth learning is not the list; it is the 5 questions you ask about any new tool in 30 seconds.",
        scenario:
          "A team is choosing between three AI tools for customer research. Two have similar feature sets; one is visibly more polished. The wrong choice will create a data-sovereignty headache three quarters from now — but nothing in the sales demo reveals this.",
        visual:
          "A radar chart with five axes: data sovereignty, hallucination risk for the use case, integration cost, human-in-loop design, update frequency. Four named tools plotted against each other.",
        mechanism:
          "A decision framework outperforms a tool catalogue for the same reason a ruler outperforms a tape measure: the ruler works on objects you haven't met yet. The 5 dimensions are chosen to surface the properties that cause regret 6–12 months after adoption, not the ones that dominate the demo.",
        callback:
          "Connects to Module 1 Lesson 3 (cognitive model of prompting): some tools hide the prompt layer entirely, which changes the user's ability to recover from bad output. That tradeoff is invisible without M1's framing.",
        realCase:
          "Samsung engineers (2023) pasted proprietary source code into ChatGPT. OpenAI's then-policy allowed the prompts to be used in training. Samsung subsequently banned public LLMs for internal work. The failure was not the tool — it was skipping the data-sovereignty dimension.",
        challenge:
          "Pick any AI tool your organization uses or might adopt. Score it on the 5 dimensions with one specific piece of evidence per dimension. Identify which dimension, if it degraded, would cost the most.",
        trap:
          "Treating the five dimensions as a pass/fail checklist rather than a tradeoff map. Every real tool is strong on some and weak on others; the question is which weaknesses match which use cases.",
        retrievalCue: "Before the next lesson: which of the 5 dimensions is hardest to measure from a product demo?",
      },
      {
        title: "Evaluating AI output — the 7 failure modes",
        hook:
          "There are not a hundred ways an AI can be wrong. There are seven, and every real bad output is one or more of them. Once you can name them, you can catch them.",
        scenario:
          "An AI-generated report lands on a manager's desk. It reads well. It cites sources. Four of the seven claims in it are false in importantly different ways, and distinguishing them changes what the manager should do next.",
        visual:
          "The 7 Failure Modes taxonomy: (1) Hallucination, (2) Outdated information, (3) Sycophancy, (4) Scope drift, (5) False precision, (6) Context blindness, (7) Bias amplification. Each with: definition, mechanism, example phrase, detection heuristic, prompt-level mitigation.",
        mechanism:
          "Every failure mode traces to a single design fact: LLMs are optimised to produce outputs that LOOK right, not outputs that ARE right. Fluency and truth are separate properties. Each failure mode is a specific way that separation becomes visible — hallucination is plausibility without evidence, sycophancy is agreement without evidence, false precision is specificity without evidence, and so on.",
        callback:
          "Builds on M1 L1 (why the model generates plausible-sounding wrong answers at all) and M1 L2 (sycophancy was previewed as a myth; here it becomes a named failure mode the learner will spot in the wild).",
        realCase:
          "Air Canada chatbot case (ruled 2024): the airline's AI chatbot invented a bereavement-fare policy. A customer relied on it. The tribunal ruled the airline legally liable for the chatbot's statement. This is hallucination (category 1) producing real-world legal consequences.",
        challenge:
          "Given three AI outputs (one strong, one mixed, one weak), highlight each problematic phrase and label it with the correct failure mode. Then write one prompt-level mitigation for the most severe failure mode in each.",
        trap:
          "Treating 'hallucination' as a catch-all. Different failure modes need different mitigations: hallucination is reduced by grounding in sources, sycophancy by asking the model to argue the opposite case, false precision by asking for confidence ranges. The taxonomy matters.",
        retrievalCue:
          "Before the next lesson: when you ask a model to critique its own output, which failure mode goes UP, not down? (Sycophancy.)",
      },
      {
        title: "Prompting for work — chain-of-thought and iteration",
        hook:
          "At this point every learner has seen the 5-principle prompt checklist. Here is what separates people who get mediocre output from people who get excellent output: they never use a single-shot prompt. They use a three-turn pattern, and they explicitly ask the model to reason before answering.",
        scenario:
          "A business analyst has 20 minutes to produce a decision memo from a messy dataset. The naive approach — one prompt, get an answer — produces something that looks ready and is quietly wrong. The three-turn approach takes the same 20 minutes and produces something substantially more trustworthy.",
        visual:
          "The 3-turn pattern as a flow: (1) broad generation, (2) structured critique — 'find the three weakest claims above and explain why they are weak', (3) targeted revision. Plus the CoT toggle: same question with and without 'reason step by step first'.",
        mechanism:
          "Chain-of-thought works because LLM inference is token-by-token. When the model jumps straight to a conclusion, any error in the intermediate reasoning is invisible and gets baked into the output. When intermediate reasoning tokens are forced to appear, the model has more 'room to think' and errors become catchable (Wei et al. 2022; Kojima et al. 2022 demonstrated this works even with a literal 'Let's think step by step.').",
        callback:
          "Directly extends M1 L3's cognitive model: the prompt is a document opening, and asking for reasoning first changes what kind of document the model is continuing. Extends M2 L7 by using iteration to catch the 7 failure modes before they ship.",
        challenge:
          "Take one real work task. Produce three outputs: (a) single-shot prompt, (b) CoT prompt, (c) three-turn pattern. Score each against the 7 failure modes. Measure time spent vs. output quality.",
        trap:
          "Believing iteration is just 'asking for revisions'. The key step is TURN TWO — the structured critique. Without it, the model simply restates its original answer with more words.",
        retrievalCue:
          "Before the next lesson: what concrete research finding grounds 'think step by step' as a real technique and not superstition?",
      },
      {
        title: "AI and your career — evidence, not anxiety",
        hook:
          "Every career conversation about AI is poisoned by two things: doomer hot-takes and consultancy-report hype. The honest truth — what the primary research actually shows — is more interesting and more useful than either.",
        scenario:
          "A mid-career learner asks: 'Is my job at risk?' The honest answer requires distinguishing three different claims the literature makes: (1) specific task automation, (2) job transformation, (3) labour-market displacement. Most career advice conflates them.",
        visual:
          "The Human-AI Collaboration Spectrum: tasks plotted from 'fully automatable' (high volume, well-defined, low-stakes) to 'fully human' (novel, ambiguous, high relational stakes). The middle zone — augmented work — is where most interesting current work lives.",
        mechanism:
          "Acemoglu & Restrepo (2022) decomposed 'automation' into task displacement vs. task reinstatement — the claim that automation always destroys jobs is empirically false; the claim that it transforms the task mix is strongly supported. The distinction matters because the second produces winners and losers inside the same occupation.",
        callback:
          "Uses M2 L7's output-evaluation skill: 'you will increasingly be the person reviewing AI's work — so the skill from L7 is not just a literacy skill, it is a career skill.'",
        realCase:
          "The Noy & Zhang MIT study (2023, Science) on ChatGPT and professional writing showed an average 40% time reduction and 18% quality improvement — AND the largest gains went to the lowest-performing writers, which is different from the narrative that 'AI benefits the most skilled.' Primary research complicates the narrative.",
        challenge:
          "Take your own occupation (or one you care about). Identify: three tasks in the 'automate' zone, three in the 'augment' zone, three that will remain fully human for the foreseeable future. Cite one piece of primary research for the zone you're most uncertain about.",
        trap:
          "Citing a consultancy report (McKinsey GI, Goldman Sachs) as if it were primary research. These are secondary syntheses with known directional bias. Primary research is the BLS Occupational Outlook, MIT Work of the Future, Acemoglu's NBER papers, specific peer-reviewed studies.",
        retrievalCue:
          "Before the next lesson: which specific piece of research did you find most decision-relevant for your career?",
      },
      {
        title: "Capstone — a work-integrated AI workflow",
        hook:
          "This capstone is graded not on what you submit, but on whether you can defend your design choices using the concepts from this module.",
        scenario:
          "The learner picks a recurring task from their actual work. They design and document a human-AI workflow for it — which tool, which prompt pattern, which verification checkpoints, which failure modes they're explicitly designing around.",
        visual:
          "A workflow map with decision diamonds at each human-in-loop checkpoint. Each checkpoint labelled with the failure mode it catches.",
        mechanism:
          "Good workflow design is deliberate about where human judgment is inserted. The 7 failure modes provide a principled way to place checkpoints: a checkpoint exists BECAUSE a specific failure mode is predictable at that step.",
        callback:
          "Every lesson in the module is used: tool framework (L6), failure modes (L7), prompt pattern (L8), career context (L9).",
        challenge:
          "Submit the workflow as a one-page document: tool chosen + 5-dimension justification, prompt template with CoT, 2+ human checkpoints with the failure mode each catches, one measurable quality criterion. AI evaluator scores each dimension.",
        trap:
          "Designing a workflow that is AI-first instead of judgment-first. The best professional AI workflows leave more human judgment in place, not less — the AI is leverage, not substitute.",
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // MODULE 3 — AI in Your Everyday Life
  //
  // Arc: the learner can now reason about AI (M1) and use it professionally
  // (M2). This module is graduate-adjacent — it handles the places where AI
  // intersects with domains that already have their own stakes and norms:
  // health, money, creativity, privacy.
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "ai-m3",
    title: "Module 3 — AI in Your Everyday Life",
    purpose:
      "Take M1's mechanisms and M2's evaluation skill into the four high-stakes domains where AI meets ordinary life — health, money, creativity, and privacy. The ambition is graduate-adjacent: mechanism-level understanding of sycophancy, inference chains, latent space, and the current legal landscape.",
    outcomes: [
      "Explain why AI symptom checkers systematically under-refer, in terms of the training loop.",
      "Identify a generative-AI scam pattern from a single sentence and articulate the mechanism.",
      "Describe, non-mathematically, what 'latent space' is and why it predicts AI's creative capabilities.",
      "Map an inference chain from one piece of data you share to three downstream risks you did not consent to.",
      "Navigate the current legal landscape: GDPR, CCPA, FDA SaMD, and active cases (Getty v. Stability AI, NYT v. OpenAI).",
    ],
    signatureInteractions: [
      "Health decision tree: symptom → AI recommendation → your action (Trust / Verify / See doctor).",
      "Scam red-flag reveal: read a message, flag every problematic phrase, compare to annotated version.",
      "Style transfer demo: same prompt, three author personas, same underlying latent-space mechanics.",
      "Inference chain builder: pick a piece of data you share weekly, map three downstream inferences.",
    ],
    capstone:
      "Scenario-based assessment: the learner is given four real-seeming scenarios (one per domain) and must make a decision, cite the mechanism, and identify the risk they are consciously accepting.",
    estimatedMinutes: 110,
    lessons: [
      {
        title: "AI & health — sycophancy is the safety problem",
        hook:
          "AI symptom checkers are less likely to tell you to go to the ER than a human triage nurse would be. That is not a bug. It is the training objective, working as designed.",
        scenario:
          "A user describes chest pain to an AI symptom checker. It recommends rest. A human nurse with the same description would have said 'go to the ER now.' The AI is not worse at medicine — it is better at keeping users satisfied. Those are different goals.",
        visual:
          "Three-verdict frame: Trust AI / Verify before acting / See a clinician. Applied to 12 symptom scenarios with the mechanism-level reason behind each verdict.",
        mechanism:
          "AI health tools trained on user-satisfaction data converge on reassurance. Over-referral (sending people to the ER unnecessarily) hurts user ratings. Under-referral (missing a real emergency) is rare in training data, because people who actually went to the ER and had an emergency don't return to rate the chatbot. Training pressure is therefore asymmetric — and the model learns to reassure. This is sycophancy, the M2 L7 failure mode, showing up where it can kill someone.",
        callback:
          "Pulls on three earlier lessons: M1 L1 (the training loop), M1 L4 (Goodhart's Law: when user-satisfaction becomes the target, it stops being a good measure of medical accuracy), M2 L7 (sycophancy as a named failure mode).",
        realCase:
          "BabyCenter's symptom-checker audit (Semigran et al., 2015, BMJ) found that symptom checkers under-triaged — advised less urgent care than appropriate — in a majority of emergent cases tested. The FDA's Software as a Medical Device (SaMD) framework, published 2017 and revised since, exists specifically because this class of tool is high-risk and evolving.",
        challenge:
          "Given six symptom scenarios, produce the three-verdict classification for each. For each 'See a clinician' verdict, state the specific mechanism (why AI systematically fails this class of symptom).",
        trap:
          "Taking 'FDA-cleared' as equivalent to 'FDA-approved'. They are not the same regulatory category. FDA clearance (510(k)) is a lower bar than approval, and most AI health tools on the market are cleared, not approved.",
        retrievalCue:
          "Before the next lesson: what does 'voice cloning' actually require, technically, as of 2026?",
      },
      {
        title: "AI & money — the scams, the flash crashes, the algorithmic credit you don't see",
        hook:
          "Three seconds of your voice on a podcast is enough audio to clone you convincingly. A high-frequency AI trading system can move a market faster than a regulator can pick up a phone. Both are already deployed. Understanding how, not if, matters.",
        scenario:
          "A parent gets a call from their child's voice, in distress, asking for bail money. The voice is real — the call is not. A different learner notices that their credit-card application was declined in a decision that took 180 milliseconds. Both of these are AI. Both are invisible to most users.",
        visual:
          "Scam pattern accordion (voice cloning, deepfake video, spoofed-sender emails, authority impersonation) next to a timeline of AI-amplified market events (2010 Flash Crash, 2020 COVID-volatility amplification, 2023 deepfake-triggered trading spike).",
        mechanism:
          "Three mechanisms: (1) Voice cloning — modern models require as little as 3 seconds of audio (Microsoft VALL-E, ElevenLabs published thresholds). (2) Algorithmic trading — when hundreds of AI systems trained on similar data see the same signal, they react in microseconds and correlate; correlated selling cascades into flash crashes. (3) Algorithmic credit scoring — under FCRA, the factors used must be disclosable on request; most consumers do not know this right exists.",
        callback:
          "M1 L1 (what models can generate is directly determined by their training data — three seconds of audio is enough because voice models were trained on hours of varied speakers, not hours of YOU). M2 L7 (false precision: algorithmic credit scores often carry a false air of 3-decimal precision).",
        realCase:
          "The 2010 Flash Crash: the Dow dropped ~1000 points in minutes, recovering most of it within the half hour. SEC/CFTC joint report identified algorithmic-trading interaction as a key mechanism. This was not an AI attack; it was AI systems doing what they were designed to do, at scale, at the wrong moment.",
        challenge:
          "Audit your own financial AI exposure. Identify one algorithmic decision about you that you did not know was algorithmic. Describe, in one sentence, what right you have to contest it under existing law.",
        trap:
          "Thinking 'I wouldn't fall for a voice-cloning scam.' Current research on social-engineering attacks shows that the variable that predicts susceptibility is not intelligence or skepticism — it is situational load. A tired, stressed person in a hurry is vulnerable. Design defenses around that fact.",
        retrievalCue:
          "Before the next lesson: what is 'latent space' and why is it the concept that makes creative AI work?",
      },
      {
        title: "AI & creativity — latent space, style, and the copyright landscape",
        hook:
          "The single most illuminating concept in generative AI is one most coverage skips: latent space. Once you have it, you understand why you can ask for 'a Van Gogh painting of a jazz musician' and get something coherent. You also understand exactly what's at stake in the copyright lawsuits.",
        scenario:
          "A graphic designer uses a generative model to create a marketing image. The client asks: was this trained on copyrighted work? Whose? The honest answer — 'yes, almost certainly, and the legal question is active in court' — requires understanding both the technology and the live cases.",
        visual:
          "Latent space as a conceptual map: dense cloud of 'document regions' — one dense region for 'Van Gogh painting', one for 'jazz musician', one for 'Picasso portrait'. A generative model interpolates between regions. Cleaner, non-mathematical, but mechanistically honest.",
        mechanism:
          "Diffusion and transformer-based image/text models represent concepts as positions in a high-dimensional space. 'Style transfer' is not style being COPIED — it is the prompt specifying a region in latent space (the Van Gogh cluster, say) and a subject (the jazz musician). The model samples from the intersection. This is why style transfer works and also why it is legally contested: the latent space was built from training data, and regions correspond to — are composed of — real works.",
        callback:
          "M1 L1 (weights as dials) extends here to 'weights as coordinates in concept space.' M2 L7 (specific failure modes show up in creative use — bias amplification is visible when a prompt for 'a CEO' overwhelmingly generates male images).",
        realCase:
          "Getty Images v. Stability AI (filed 2023, UK and US — ongoing, live as of 2026). The New York Times v. OpenAI (filed December 2023, ongoing). The EU AI Act's training data transparency provisions (in force August 2025). These are not settled — which means professional use of creative AI is being conducted under genuine legal uncertainty.",
        challenge:
          "Pick a creative AI use case in your work. Identify: (a) what latent-space regions the prompt is pointing at, (b) one specific legal question the use case raises under current law, (c) one workflow modification that reduces legal exposure without losing the benefit.",
        trap:
          "Thinking 'the legal question is settled because the EU AI Act exists.' It is not settled. GDPR, CCPA, the EU AI Act, and pending US case law address different pieces and conflict in places. Professionals need the current state, not a textbook answer.",
        retrievalCue:
          "Before the next lesson: you just shared your location with an app. Name three pieces of information that location alone reveals about you.",
      },
      {
        title: "AI & privacy — the inference chain",
        hook:
          "The standard privacy conversation is about what data you share. The more important conversation is about what AI can INFER from what you share. You did not hand anyone your religion, your politics, your health conditions, or your income. The inference chain did.",
        scenario:
          "A user installs a weather app. It asks for 'precise location' — reasonable, for weather. They grant it. Six months later, a political campaign ad arrives that is uncannily targeted. The user did not share political views. The inference chain did.",
        visual:
          "The inference-chain diagram: one root data point (GPS location) branches into direct inferences (home, workplace, routine), which branch again into inferred attributes (income bracket, religious practice, medical conditions, political leaning), which feed downstream real-world consequences (insurance pricing, targeted ads, credit).",
        mechanism:
          "Modern AI systems do not require you to disclose a sensitive attribute to know it. Aggregated location data reveals religion (place-of-worship attendance patterns), politics (rally attendance), health (clinic visits), income (neighbourhood and retail patterns). Each of these is a probabilistic inference, but at data-broker scale the probabilities compound. 'Anonymised' data, in the sense the word is used in marketing materials, routinely re-identifies in published research (Sweeney, 2000; Narayanan & Shmatikov, 2008; countless replications since).",
        callback:
          "M2 L7 (evaluate the claims in a privacy policy the same way you evaluate AI output: what is the mechanism behind 'we anonymise your data'?). M1 L4 (the ethics quadrants — whose autonomy is violated when data you shared for one purpose is inferred-upon for another?).",
        realCase:
          "The Rite Aid FTC facial-recognition ban (December 2023): Rite Aid was banned from using facial recognition for five years after deploying a system that generated thousands of false positives, disproportionately affecting Black, Latino, Asian, and women customers. This is bias amplification (M2 L7) + privacy invasion + real consequences.",
        challenge:
          "Pick one piece of data you share weekly (location, purchases, search history, calendar). Map the inference chain: three direct inferences, three second-order inferences, three downstream risks you never explicitly consented to.",
        trap:
          "Relying on 'I'll just opt out.' Data broker ecosystems (Acxiom, LexisNexis, Equifax, CoreLogic, etc.) aggregate from thousands of sources; opting out of one leaves the inference intact. Meaningful privacy requires understanding the chain, not just the first link.",
      },
      {
        title: "Capstone — four scenarios, four decisions",
        hook:
          "Self-report checkboxes do not measure understanding. This capstone asks you to make real decisions in four scenarios and defend each decision using the mechanisms you've built up over three modules.",
        scenario:
          "Four realistic scenarios, one per domain, each requiring a specific decision and a specific mechanism-level justification: a health symptom + AI advice; a suspicious voice call from a family member; a client request to use AI for branded creative; an app requesting permissions.",
        visual:
          "A 2×2 decision matrix for each scenario: the four quadrants from Module 1 Lesson 4 (Autonomy / Beneficence / Non-maleficence / Justice) mapped against the specific facts of the scenario.",
        mechanism:
          "Performance assessment outperforms self-report across decades of education research (Nichols & Berliner, 2007 — multiple replications). What someone can DO in a scenario predicts transfer. What someone SAYS they understand does not.",
        callback:
          "Every prior lesson is touched. The scoring rubric explicitly checks that the decision is defended using the specific mechanism from the relevant lesson (sycophancy for health, inference chains for privacy, latent space for creativity, scam mechanisms for money).",
        challenge:
          "For each of the four scenarios: (a) the decision you make, (b) the specific mechanism your decision is responding to, (c) the risk you are consciously accepting. AI evaluator scores each response on a structured rubric: 25% decision-correctness, 50% mechanism-correctness, 25% risk-awareness.",
        trap:
          "Giving generic 'correct' decisions without mechanism. The rubric rewards specificity: 'I wouldn't trust the AI here because the user-satisfaction training loop produces under-referral in emergent symptoms' outscores 'I would see a doctor because AI can be wrong.'",
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // Modules 4–8 unchanged (awaiting same-depth revision in a follow-up pass).
  // The rest of the file continues with the existing ai-m4 through ai-m8 seeds
  // and the lr-* (Logic & Reason) seeds. See original foundationSeeds.ts for
  // those; they are preserved verbatim below this block.
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: "ai-m4",
    title: "Module 4 - Where AI Fails",
    purpose: "Build healthy skepticism and repeatable trust-calibration habits before learners scale their AI use.",
    outcomes: [
      "Spot hallucinations, fake sources, and brittle reasoning.",
      "Recognize bias and context failure.",
      "Use verification workflows before acting on output.",
    ],
    signatureInteractions: ["Spot the hallucination", "Source verification drill", "Trust signal audit"],
    capstone: "Audit one AI-generated answer and annotate every trust signal, warning sign, and missing check.",
    estimatedMinutes: 95,
    lessons: [
      {
        title: "Hallucinations explained",
        scenario: "A meeting memo includes a fabricated policy detail that sounds perfectly plausible and slips past everyone on first read.",
        visual: "Anatomy of a hallucination from ambiguous prompt to polished falsehood.",
        challenge: "Create a hallucination red-flag checklist for your domain.",
        trap: "Assuming polished wording implies grounded truth.",
      },
      {
        title: "Bias in, bias out",
        scenario: "A scoring system seems objective until you notice the data reflected historical exclusion and unequal representation.",
        visual: "Bias pipeline from data collection through deployment feedback loops.",
        challenge: "Run a mini impact assessment on one AI-assisted decision workflow.",
        trap: "Thinking bias only enters at the model layer.",
      },
      {
        title: "Fake sources and invented certainty",
        scenario: "A report includes realistic-looking references that collapse as soon as somebody checks whether the sources even exist.",
        visual: "Citation ladder from claim to source existence to claim-source match.",
        challenge: "Verify three citations from one AI answer and document your pass-fail method.",
        trap: "Treating formatting as proof.",
      },
      {
        title: "Context loss and brittle understanding",
        scenario: "The model handles the obvious case well, but breaks as soon as local rules, edge cases, or conflicting constraints appear.",
        visual: "Context stack showing hidden constraints, edge cases, and missing assumptions.",
        challenge: "Repair a failed AI answer by listing the context it needed but never received.",
        trap: "Assuming the model knows your local rules, values, or exceptions by default.",
      },
      {
        title: "The danger of overtrust",
        scenario: "A manager forwards AI analysis into a decision process without checking the chain of reasoning because the output looks ready to use.",
        visual: "Trust calibration curve from undertrust to calibrated trust to overtrust.",
        challenge: "Write a team norm for when AI outputs require explicit review before action.",
        trap: "Using convenience as a substitute for judgment.",
      },
      {
        title: "Verification workflows",
        scenario: "Two analysts use the same model, but only one catches a bad answer because they follow a simple verification routine every time.",
        visual: "Verification flowchart covering source checks, logic checks, domain checks, and human approval.",
        challenge: "Build your own pre-action verification checklist and test it on one live response.",
        trap: "Treating verification as optional cleanup instead of core workflow.",
      },
    ],
  },
  {
    id: "ai-m5",
    title: "Module 5 - Prompting and Working With AI Well",
    purpose: "Teach collaboration habits that outperform prompt magic and lead to more reliable work.",
    outcomes: [
      "Write stronger prompts with clear constraints and criteria.",
      "Iterate productively instead of relying on one-shot asks.",
      "Prompt for critique, alternatives, and checks rather than only output.",
    ],
    signatureInteractions: ["Rewrite weak prompts", "Prompt style comparison", "Critique-first prompting drill"],
    capstone: "Convert one vague ask into a robust prompt chain with evaluation criteria and review steps.",
    estimatedMinutes: 90,
    lessons: [
      {
        title: "Why bad prompts get bad results",
        scenario: "Two people use the same model, but one gets generic fluff because the request was underspecified.",
        visual: "Prompt quality ladder from vague demand to constrained task brief.",
        challenge: "Take one weak prompt and add task, context, constraints, and success criteria.",
        trap: "Expecting the model to infer goals you never stated.",
      },
      {
        title: "The anatomy of a strong prompt",
        scenario: "A structured request turns a mediocre answer into a usable draft because the model now knows the job and the bar.",
        visual: "Prompt canvas showing task, context, constraints, format, and evaluation criteria.",
        challenge: "Build a reusable prompt template for a task you repeat every week.",
        trap: "Stopping at instructions and forgetting the quality standard.",
      },
      {
        title: "Iteration beats one-shot prompting",
        scenario: "A second and third round produce much stronger reasoning than the original answer because the user asks for revision instead of settling.",
        visual: "Loop diagram of draft, critique, revise, and verify.",
        challenge: "Run a two-iteration prompt cycle and compare the before-and-after quality.",
        trap: "Treating the first draft as the final answer.",
      },
      {
        title: "Prompting for thinking, not just output",
        scenario: "A request for assumptions, counterarguments, and failure modes surfaces risks the first answer hid.",
        visual: "Reasoning prompt deck covering alternatives, assumptions, counterexamples, and checks.",
        challenge: "Refactor one output-only prompt into a reasoning-first prompt.",
        trap: "Optimizing for speed of output instead of depth of thought.",
      },
      {
        title: "Prompting for different tasks",
        scenario: "A writing prompt, planning prompt, and research prompt all need different scaffolds to produce useful work.",
        visual: "Task-to-prompt matrix for writing, planning, study, research, and analysis.",
        challenge: "Create two task-specific prompts and define what success looks like for each.",
        trap: "Using one universal prompt pattern for every kind of work.",
      },
      {
        title: "Prompting ethically and safely",
        scenario: "A user pastes sensitive information into a public tool without realizing the privacy, compliance, and reputation risks.",
        visual: "Safety boundary map separating safe prompting, caution zones, and prohibited use.",
        challenge: "Draft a privacy and safety checklist for prompts used at work.",
        trap: "Assuming speed matters more than privacy, consent, or compliance.",
      },
    ],
  },
  {
    id: "ai-m6",
    title: "Module 6 - AI in Work, Learning, and Everyday Life",
    purpose: "Ground AI literacy in the repeated decisions adults actually face every week.",
    outcomes: [
      "Choose high-value use cases instead of novelty use cases.",
      "Set clear judgment boundaries around AI help.",
      "Know when not to use AI at all.",
    ],
    signatureInteractions: ["Would you use AI here?", "Workflow redesign scenarios"],
    capstone: "Draft a personal AI use policy for work, learning, and home.",
    estimatedMinutes: 80,
    lessons: [
      {
        title: "AI in writing and communication",
        scenario: "A team speeds up drafting with AI, but still needs human ownership of tone, clarity, truth, and responsibility.",
        visual: "Writing workflow from brainstorm to draft to verify to publish.",
        challenge: "Create a communication SOP that separates AI drafting from human sign-off.",
        trap: "Using generated text as if it already reflects your intent and standards.",
      },
      {
        title: "AI in research and learning",
        scenario: "A learner consumes polished summaries but cannot transfer the ideas because the process never required retrieval or application.",
        visual: "Learning stack linking summarize, retrieve, apply, and teach-back.",
        challenge: "Turn one AI summary into a retrieval quiz and a teach-back exercise.",
        trap: "Confusing familiarity with durable understanding.",
      },
      {
        title: "AI at work",
        scenario: "One team redesigns workflows around AI and gains leverage, while another just adds a chatbot and creates rework.",
        visual: "Role redesign map by task repeatability, stakes, and oversight needed.",
        challenge: "Redesign three tasks in one role using AI plus explicit quality gates.",
        trap: "Adding AI without redesigning the surrounding workflow.",
      },
      {
        title: "AI in daily decisions",
        scenario: "An AI plan looks efficient on paper but ignores values, context, and the tradeoffs that matter most to the human deciding.",
        visual: "Decision frame separating objective constraints from personal values.",
        challenge: "Use AI to generate options for one decision, then annotate where your judgment overrides it.",
        trap: "Letting convenience overrule context and values.",
      },
      {
        title: "When not to use AI",
        scenario: "A confident answer in a high-stakes context creates false reassurance where expertise, empathy, or accountability are essential.",
        visual: "Risk map for low-stakes, medium-stakes, and high-stakes AI use.",
        challenge: "Write a red-list of tasks that always require expert review or human-first handling.",
        trap: "Using AI as if all domains have the same error tolerance.",
      },
    ],
  },
  {
    id: "ai-m7",
    title: "Module 7 - Ethics, Society, and Responsibility",
    purpose: "Move ethical discussion beyond slogans into real tradeoffs, incentives, harms, and safeguards.",
    outcomes: [
      "Discuss privacy, labor, bias, and accountability with clarity.",
      "Map stakeholder risks instead of debating only in slogans.",
      "Recommend practical safeguards for real deployments.",
    ],
    signatureInteractions: ["Stakeholder mapping", "Ethics triage", "Safeguard design sprint"],
    capstone: "Evaluate one deployment scenario and recommend governance safeguards that are actually workable.",
    estimatedMinutes: 95,
    lessons: [
      {
        title: "The ethics baseline",
        scenario: "A technically impressive feature creates harm because nobody stopped to ask whether it should exist or what good success even means.",
        visual: "Triangle of capability, consequences, and accountability.",
        challenge: "Build a one-page ethics checklist for an AI feature proposal.",
        trap: "Assuming technical feasibility equals moral permission.",
      },
      {
        title: "Privacy and surveillance",
        scenario: "A convenience feature quietly expands monitoring beyond what users expected or meaningfully consented to.",
        visual: "Data lifecycle map with consent, storage, access, and deletion checkpoints.",
        challenge: "Audit one workflow for unnecessary data collection and retention.",
        trap: "Treating data access as harmless because it is technically possible.",
      },
      {
        title: "Bias, inclusion, and power",
        scenario: "A system works well for majority users but fails the people with the least power to complain or appeal.",
        visual: "Stakeholder power map showing who benefits, who is harmed, and who decides.",
        challenge: "Make a stakeholder map for one AI system and identify who is missing from the room.",
        trap: "Thinking average performance means equitable performance.",
      },
      {
        title: "AI and misinformation",
        scenario: "Synthetic content spreads faster than corrections because fluency, scale, and speed all favor the first convincing story.",
        visual: "Misinformation cascade with intervention points for detection and response.",
        challenge: "Create a protocol for handling suspicious synthetic content in your team or household.",
        trap: "Believing faster content production does not change epistemic risk.",
      },
      {
        title: "Work and economic disruption",
        scenario: "A role does not disappear overnight, but its routine tasks shift and its human value changes faster than the job description does.",
        visual: "Task-shift board showing automate, augment, redesign, and retrain.",
        challenge: "Write a reskilling plan for one role affected by AI.",
        trap: "Thinking disruption is only replacement or only hype.",
      },
      {
        title: "Responsibility and accountability",
        scenario: "An AI-assisted decision goes wrong and everyone points at the model instead of the humans and institutions around it.",
        visual: "Accountability chain from data owners to deployers to decision makers.",
        challenge: "Draft a responsibility map for one AI workflow in your world.",
        trap: "Treating 'the AI did it' as a meaningful accountability answer.",
      },
    ],
  },
  {
    id: "ai-m8",
    title: "Module 8 - Becoming an AI-Native Thinker",
    purpose: "Synthesize the course into a long-term posture that preserves agency while using powerful tools.",
    outcomes: [
      "Build a mature posture toward AI rather than hype or fear.",
      "Turn verification into a durable habit.",
      "Design repeatable AI workflows you would trust in real life.",
    ],
    signatureInteractions: ["Decision framework builder", "Final AI trust checklist", "Workflow stress test"],
    capstone: "Redesign one AI-assisted workflow into a wiser version you would actually trust and defend.",
    estimatedMinutes: 80,
    lessons: [
      {
        title: "A mature posture toward AI",
        scenario: "One person drifts into hype, another into fear, and a third develops disciplined, calibrated competence.",
        visual: "Posture spectrum from fear to hype to grounded confidence.",
        challenge: "Write a three-principle statement that describes your posture toward AI.",
        trap: "Thinking wisdom means either maximal enthusiasm or maximal suspicion.",
      },
      {
        title: "Verification as a habit",
        scenario: "A tiny recurring check prevents a major downstream error because the user designed verification into the workflow instead of relying on memory.",
        visual: "Habit loop showing trigger, check, decision, and review.",
        challenge: "Embed one verification step directly into a task you already do every week.",
        trap: "Treating verification as something you do only when you feel nervous.",
      },
      {
        title: "Building an AI workflow",
        scenario: "A stable draft-critique-verify-refine workflow beats ad hoc prompting on quality, speed, and reliability.",
        visual: "Workflow blueprint linking input quality, iteration, checks, and final judgment.",
        challenge: "Design your default five-step AI workflow for one recurring task.",
        trap: "Using AI in isolated bursts instead of as part of a designed system.",
      },
      {
        title: "Your role in an AI world",
        scenario: "The highest-value person on the team is not the fastest prompter but the strongest judge of quality, truth, and tradeoffs.",
        visual: "Human advantage map covering judgment, values, taste, accountability, and domain expertise.",
        challenge: "Identify three human strengths you want to become known for in an AI-rich environment.",
        trap: "Assuming tool fluency matters more than judgment.",
      },
      {
        title: "Final synthesis",
        scenario: "A final case blends AI output, weak evidence, and real tradeoffs into one realistic workflow problem that requires both AI literacy and logic.",
        visual: "Operating model showing how all eight modules fit into one decision posture.",
        challenge: "Produce your personal AI operating playbook and stress test it on one realistic case.",
        trap: "Treating the course as information instead of a way of operating.",
      },
    ],
  },
];

export const logicModuleSeeds: FoundationModuleSeed[] = [
  {
    id: "lr-m1",
    title: "Module 1 - What Reasoning Is",
    purpose: "Give learners the grammar of arguments in ordinary language so logic feels practical from day one.",
    outcomes: [
      "Identify claims, premises, and conclusions.",
      "Distinguish assertion from support.",
      "Use fairness before criticism.",
    ],
    signatureInteractions: ["Identify the conclusion", "Argument highlighting"],
    capstone: "Convert a paragraph of persuasive writing into standard argument form.",
    estimatedMinutes: 80,
    lessons: [
      {
        title: "Why reasoning matters",
        scenario: "Two people see the same facts but reach opposite conclusions because their reasoning patterns differ.",
        visual: "Decision chain from assumptions to inferences to outcomes.",
        challenge: "Audit one recent decision and identify where reasoning quality mattered.",
        trap: "Treating reasoning as academic instead of practical.",
      },
      {
        title: "Claims, premises, and conclusions",
        scenario: "A persuasive post feels strong until its supporting reasons and its conclusion are separated and examined.",
        visual: "Argument anatomy showing a claim, supporting premises, and inferred conclusion.",
        challenge: "Take one opinionated paragraph and label every claim, premise, and conclusion.",
        trap: "Mistaking a strong conclusion for strong support.",
      },
      {
        title: "Inference and support",
        scenario: "Two arguments have similar claims, but one actually gives reasons that move us there and the other simply repeats itself.",
        visual: "Support bridge showing how premises are supposed to connect to a conclusion.",
        challenge: "Explain in one sentence how each reason is meant to support one conclusion.",
        trap: "Ignoring the move between reasons and conclusion.",
      },
      {
        title: "Arguments in ordinary language",
        scenario: "A casual conversation contains real reasoning even though nobody uses formal logic vocabulary.",
        visual: "Everyday argument gallery from meetings, texts, headlines, and family conversations.",
        challenge: "Find three arguments in ordinary life and rewrite them in cleaner form.",
        trap: "Thinking logic only appears in textbook examples.",
      },
      {
        title: "The principle of charity",
        scenario: "A disagreement cools down the moment one person reconstructs the other side fairly before responding.",
        visual: "Weak caricature vs fair reconstruction comparison panel.",
        challenge: "Take an argument you dislike and rewrite it in the strongest fair form you can manage.",
        trap: "Critiquing the weakest version of an opposing view.",
      },
    ],
  },
  {
    id: "lr-m2",
    title: "Module 2 - Thinking Errors and Cognitive Traps",
    purpose: "Show that reasoning problems are not just formal mistakes but deeply human mistakes tied to identity, emotion, and cognitive shortcuts.",
    outcomes: [
      "Recognize cognitive traps in yourself and others.",
      "Explain why smart people still reason badly.",
      "Practice humility without becoming indecisive.",
    ],
    signatureInteractions: ["Belief audit", "Bias self-diagnosis", "Would this change your mind?"],
    capstone: "Analyze one personal belief and state what evidence would genuinely change your mind.",
    estimatedMinutes: 80,
    lessons: [
      {
        title: "Why smart people reason badly",
        scenario: "A highly capable person defends a weak conclusion because identity and pressure matter more than raw intelligence.",
        visual: "Reasoning under pressure model linking emotion, identity, incentives, and cognitive load.",
        challenge: "Write down one context where being smart does not protect you from reasoning badly.",
        trap: "Assuming intelligence automatically produces good judgment.",
      },
      {
        title: "Confirmation bias",
        scenario: "A person notices every article that supports their view and forgets the ones that challenge it.",
        visual: "Attention funnel showing how we admit friendly evidence and filter out threatening evidence.",
        challenge: "Do a one-topic evidence audit where you must collect the strongest case against your own view.",
        trap: "Thinking confirmation bias only affects other people.",
      },
      {
        title: "Motivated reasoning",
        scenario: "A conclusion feels right first, and only then does the person go looking for reasons to justify it.",
        visual: "Desire-to-belief loop showing how preferences shape what counts as convincing.",
        challenge: "List one belief where identity, status, or comfort might be shaping your reasoning.",
        trap: "Mistaking a desired conclusion for a well-earned one.",
      },
      {
        title: "Heuristics and shortcuts",
        scenario: "A quick rule of thumb helps under time pressure, but it also pushes the thinker into a costly mistake.",
        visual: "Fast-vs-slow reasoning board showing when shortcuts help and when they mislead.",
        challenge: "Identify one shortcut you use often and name the condition under which it becomes risky.",
        trap: "Treating all quick judgments as irrational or all of them as good enough.",
      },
      {
        title: "Intellectual humility",
        scenario: "A person becomes far more persuasive once they can say what they do not know and what would update their view.",
        visual: "Confidence calibration dial from overconfidence to paralysis to measured uncertainty.",
        challenge: "Rewrite one strong claim you have made recently with a more honest confidence level and update rule.",
        trap: "Thinking humility means weakness or vagueness.",
      },
    ],
  },
  {
    id: "lr-m3",
    title: "Module 3 - Understanding Arguments Properly",
    purpose: "Strengthen analysis before evaluation so learners stop attacking messy impressions and start working with structure.",
    outcomes: [
      "Standardize arguments more clearly.",
      "Find hidden assumptions.",
      "Separate explanation from argument.",
    ],
    signatureInteractions: ["Argument map builder", "Missing-premise challenge"],
    capstone: "Repair one weak argument into its strongest fair version.",
    estimatedMinutes: 75,
    lessons: [
      {
        title: "Standardizing arguments",
        scenario: "A heated conversation becomes much clearer when translated into premise-conclusion form.",
        visual: "Before-and-after panel of messy speech turned into standard argument format.",
        challenge: "Standardize two messy real-world arguments into clean form.",
        trap: "Critiquing arguments before reconstructing them clearly.",
      },
      {
        title: "Hidden premises and assumptions",
        scenario: "An argument seems persuasive until the unstated assumption doing the real work is finally surfaced.",
        visual: "Iceberg model with explicit reasons above the water and hidden assumptions below.",
        challenge: "Find at least two hidden premises in one persuasive article or post.",
        trap: "Ignoring the assumptions that do most of the work.",
      },
      {
        title: "Ambiguity and vagueness",
        scenario: "A proposal sounds reasonable because vague terms hide the lack of precise standards and commitments.",
        visual: "Fog-to-clarity diagram showing how vague language distorts judgment.",
        challenge: "Rewrite one vague claim into a sharper, testable version.",
        trap: "Letting fuzzy language stand in for strong reasoning.",
      },
      {
        title: "Steelmanning vs strawmanning",
        scenario: "A conflict improves as soon as each side stops attacking caricatures and starts engaging the strongest real version.",
        visual: "Side-by-side comparison of strawman, fair summary, and steelman.",
        challenge: "Steelman one opposing argument before evaluating it.",
        trap: "Mistaking easy critique for accurate critique.",
      },
      {
        title: "Explanations vs arguments",
        scenario: "A because-statement gets treated like proof when it is really only describing why something happened.",
        visual: "Split flowchart of explanatory language versus justificatory argument language.",
        challenge: "Label five statements as explanations or arguments and defend each label.",
        trap: "Confusing narrative explanation with justification.",
      },
    ],
  },
  {
    id: "lr-m4",
    title: "Module 4 - Deductive Logic",
    purpose: "Introduce logical rigor in a way that stays practical and usable.",
    outcomes: [
      "Explain validity and soundness.",
      "Recognize common deductive forms.",
      "Spot contradictions and structural failures.",
    ],
    signatureInteractions: ["Valid or invalid drills", "Contradiction detector"],
    capstone: "Test everyday arguments for validity and soundness.",
    estimatedMinutes: 90,
    lessons: [
      {
        title: "What deductive arguments promise",
        scenario: "A compliance decision depends on whether the rule structure guarantees the conclusion if the premises hold.",
        visual: "Necessity chain showing why a conclusion must follow in a deductive argument.",
        challenge: "Find one workplace or policy argument that should be deductive rather than probabilistic.",
        trap: "Thinking deductive logic is only for mathematicians.",
      },
      {
        title: "Validity vs truth",
        scenario: "A formally valid argument reaches a false conclusion because one premise is false even though the structure is strong.",
        visual: "Grid separating structural validity from premise truth.",
        challenge: "Classify three arguments by validity and premise truth separately.",
        trap: "Assuming logical validity means the conclusion is true.",
      },
      {
        title: "Soundness",
        scenario: "A tidy argument collapses because one premise is unsupported even though the structure itself is valid.",
        visual: "Soundness checklist tying valid structure to true or well-supported premises.",
        challenge: "Evaluate one real argument for soundness and identify its weakest premise.",
        trap: "Stopping analysis once the structure looks neat.",
      },
      {
        title: "Common valid and invalid forms",
        scenario: "Two argument patterns sound similar, but one is reliable and the other is a classic trap.",
        visual: "Pattern cards for common valid and invalid forms in everyday language.",
        challenge: "Sort six arguments into valid and invalid forms and explain why.",
        trap: "Relying on surface similarity rather than actual structure.",
      },
      {
        title: "Contradiction, consistency, and logical tension",
        scenario: "A worldview sounds coherent until two of its commitments collide under pressure.",
        visual: "Consistency web highlighting contradiction nodes and unresolved tensions.",
        challenge: "Find and repair one contradiction in a real policy, workflow, or public position.",
        trap: "Treating isolated plausibility as overall consistency.",
      },
      {
        title: "Everyday deductive reasoning",
        scenario: "Rules, contracts, and procedures quietly rely on deductive logic all the time, even when nobody names it.",
        visual: "Rule tree translating conditions into actions and consequences.",
        challenge: "Turn one real-world rule into explicit if-then logic and test edge cases.",
        trap: "Assuming everyday reasoning never uses strict logical form.",
      },
    ],
  },
  {
    id: "lr-m5",
    title: "Module 5 - Inductive Reasoning and Uncertainty",
    purpose: "Teach better judgment in the real world, where certainty is rare and evidence comes in degrees.",
    outcomes: [
      "Assess inductive strength rather than demanding impossible certainty.",
      "Evaluate sample quality and generalization.",
      "Separate causation from correlation more carefully.",
    ],
    signatureInteractions: ["Sample-size game", "Causation diagnostic", "Analogy strength comparison"],
    capstone: "Evaluate real headlines for causal overreach and evidential weakness.",
    estimatedMinutes: 90,
    lessons: [
      {
        title: "What inductive reasoning does",
        scenario: "A forecast guides action even though nobody can know the future with certainty.",
        visual: "Likelihood ladder from weak support to strong support.",
        challenge: "Rewrite one claim so it reflects proper uncertainty instead of fake certainty.",
        trap: "Thinking all good reasoning must produce certainty.",
      },
      {
        title: "Strong vs weak arguments",
        scenario: "Two claims feel equally plausible until you compare the strength, relevance, and sufficiency of their support.",
        visual: "Support-strength rubric covering relevance, sufficiency, and alternative explanations.",
        challenge: "Rank three arguments by inductive strength and explain your ranking.",
        trap: "Letting rhetoric substitute for evidential strength.",
      },
      {
        title: "Generalization and sample quality",
        scenario: "A viral survey gets treated as representative even though the sample is tiny, skewed, or self-selected.",
        visual: "Sample quality dashboard showing size, selection, and representativeness.",
        challenge: "Audit one public claim by asking who was sampled, how, and why it matters.",
        trap: "Generalizing far beyond the evidence base.",
      },
      {
        title: "Causation vs correlation",
        scenario: "A headline turns an association into a causal story and readers barely notice the leap.",
        visual: "Causal funnel from correlation to controls to mechanism to replication.",
        challenge: "Rewrite three causal headlines into more accurate claims.",
        trap: "Treating correlation as if it proves cause.",
      },
      {
        title: "Analogy, prediction, and probability",
        scenario: "A vivid analogy feels persuasive until the missing differences become more important than the shared similarities.",
        visual: "Analogy quality checklist with relevant and irrelevant similarities.",
        challenge: "Create one strong analogy and one misleading analogy for the same claim.",
        trap: "Using surface similarity as if it were structural similarity.",
      },
      {
        title: "Living with uncertainty",
        scenario: "A team delays action waiting for certainty and ends up making a worse decision than if they had reasoned under uncertainty honestly.",
        visual: "Decision board showing reversible and irreversible choices under uncertainty.",
        challenge: "Design a reversible decision plan for one uncertain choice.",
        trap: "Pretending certainty is available when it is not.",
      },
    ],
  },
  {
    id: "lr-m6",
    title: "Module 6 - Fallacies in the Wild",
    purpose: "Make poor reasoning easy to recognize in media, debate, and persuasion without turning learners into shallow label hunters.",
    outcomes: [
      "Spot major informal fallacies in real examples.",
      "Explain why they fail rather than only naming them.",
      "Rewrite stronger alternatives.",
    ],
    signatureInteractions: ["Fallacy cards", "Rewrite challenge", "Media annotation"],
    capstone: "Annotate one persuasive piece for fallacies and stronger rewrites.",
    estimatedMinutes: 90,
    lessons: [
      {
        title: "What a fallacy is and is not",
        scenario: "A legitimate concern gets dismissed with a lazy fallacy accusation instead of real analysis.",
        visual: "Decision tree distinguishing fallacy, weakness, and simple disagreement.",
        challenge: "Review three weak arguments and classify them carefully instead of labeling loosely.",
        trap: "Using fallacy labels as debate weapons rather than diagnostic tools.",
      },
      {
        title: "Relevance fallacies",
        scenario: "A conversation shifts away from the issue and toward emotion, identity, or personality.",
        visual: "Relevance filter showing on-topic reasons and distraction tactics.",
        challenge: "Rewrite one emotionally manipulative argument into a more relevant one.",
        trap: "Following rhetorical heat away from the actual claim.",
      },
      {
        title: "Structural fallacies",
        scenario: "A speaker forces a false choice or predicts a runaway chain of disasters with little support.",
        visual: "Structure failure map showing false dilemma, slippery slope, and circularity.",
        challenge: "Repair one false dilemma by adding the missing alternatives.",
        trap: "Accepting an oversimplified structure because it feels decisive.",
      },
      {
        title: "Evidence fallacies",
        scenario: "Anecdotes, cherry-picked facts, and weak analogies get dressed up as solid support.",
        visual: "Evidence integrity meter from cherry-pick to representative evidence.",
        challenge: "Take one cherry-picked claim and rebuild it using fuller evidence.",
        trap: "Mistaking selected evidence for balanced evidence.",
      },
      {
        title: "Misrepresentation fallacies",
        scenario: "A nuanced claim gets reframed into something easier to attack and the audience never sees the swap.",
        visual: "Distortion spectrum from fair summary to loaded framing to strawman.",
        challenge: "Rewrite one loaded framing example into neutral language.",
        trap: "Attacking a distorted version of the real argument.",
      },
      {
        title: "Fallacy hunting in real media",
        scenario: "Ads, posts, and commentary clips layer multiple fallacies together to drive persuasion.",
        visual: "Media annotation board showing stacked reasoning errors in one piece.",
        challenge: "Annotate a real article, ad, or clip for at least five reasoning weaknesses.",
        trap: "Thinking fallacies only happen in obviously bad arguments.",
      },
    ],
  },
  {
    id: "lr-m7",
    title: "Module 7 - Evidence, Sources, and Credibility",
    purpose: "Turn learners into disciplined evaluators of proof quality, expertise, and trust signals.",
    outcomes: [
      "Rank evidence quality more carefully.",
      "Assess source credibility with explicit criteria.",
      "Detect statistical and media misdirection.",
    ],
    signatureInteractions: ["Source ladder", "Evidence ranking", "Misleading graph challenge"],
    capstone: "Build an evidence profile for one controversial claim using multiple source types.",
    estimatedMinutes: 90,
    lessons: [
      {
        title: "What counts as evidence",
        scenario: "A debate treats anecdotes, expertise, data, and experiments as if they all carried equal weight.",
        visual: "Evidence ladder ranking forms of support by reliability and context.",
        challenge: "Classify and rank the evidence in one argument from strongest to weakest.",
        trap: "Treating all support as equally probative.",
      },
      {
        title: "Source credibility",
        scenario: "A confident personality is mistaken for a qualified expert because delivery gets confused with authority.",
        visual: "Credibility scorecard covering expertise, incentives, transparency, and track record.",
        challenge: "Score three sources and explain why your trust differs across them.",
        trap: "Letting charisma or polish substitute for credibility.",
      },
      {
        title: "Statistics that mislead",
        scenario: "A chart uses real numbers but still misleads through framing, scaling, and omitted context.",
        visual: "Gallery of misleading graphs with corrected versions beside them.",
        challenge: "Repair one misleading graph so it communicates honestly.",
        trap: "Assuming numerical presentation guarantees honesty.",
      },
      {
        title: "Scientific reasoning for non-scientists",
        scenario: "A dramatic scientific claim sounds final until you ask about method, replication, uncertainty, and incentives.",
        visual: "Scientific reasoning cycle from hypothesis to test to replication to update.",
        challenge: "Evaluate one scientific claim using method, evidence, and replication criteria.",
        trap: "Treating one study like settled truth.",
      },
      {
        title: "Media literacy and claim evaluation",
        scenario: "A headline creates a strong impression that the article evidence does not fully support.",
        visual: "Headline-to-evidence parsing frame separating attention hook from actual support.",
        challenge: "Run a claim evaluation worksheet on one viral post or headline.",
        trap: "Letting urgency or outrage outrun evidence review.",
      },
      {
        title: "Evaluating AI output as evidence",
        scenario: "An AI answer sounds authoritative even though it is only another claim that still needs source and logic checks.",
        visual: "AI evidence protocol tying fluency to source, logic, and domain review.",
        challenge: "Take one AI answer and build an evidence profile for it like any other claim.",
        trap: "Treating fluent generated text as evidence by itself.",
      },
    ],
  },
  {
    id: "lr-m8",
    title: "Module 8 - Reasoning in Real Life",
    purpose: "Make logic transferable to relationships, work, media, ethics, and AI-assisted environments.",
    outcomes: [
      "Reason better in conversation and at work.",
      "Handle pressure with more discipline.",
      "Integrate logic into AI-assisted decisions.",
    ],
    signatureInteractions: ["Decision trees", "Argument clinic", "Final reasoning audit"],
    capstone: "Rank claims from news, work, and AI outputs by reasoning and evidence strength.",
    estimatedMinutes: 90,
    lessons: [
      {
        title: "Reasoning in relationships and conversation",
        scenario: "A tense disagreement improves when one person starts listening for claims and assumptions instead of rehearsing rebuttals.",
        visual: "Conversation loop showing listen, clarify, reconstruct, evaluate, and respond.",
        challenge: "Use a charity-first method in one real conversation this week.",
        trap: "Trying to win before you understand.",
      },
      {
        title: "Reasoning at work",
        scenario: "A proposal becomes much stronger once assumptions, evidence, tradeoffs, and risks are made explicit.",
        visual: "Decision memo template showing claim, evidence, tradeoff, uncertainty, and risk.",
        challenge: "Refactor one proposal using explicit reasoning sections.",
        trap: "Hiding weak reasoning behind presentation polish.",
      },
      {
        title: "Reasoning about moral and political claims",
        scenario: "A heated issue becomes clearer once value claims, factual claims, and tradeoffs are separated.",
        visual: "Matrix separating values, evidence, uncertainty, and tradeoffs.",
        challenge: "Analyze one public issue by separating empirical questions from value questions.",
        trap: "Treating every disagreement as purely factual or purely moral.",
      },
      {
        title: "Reasoning under pressure",
        scenario: "Stress, urgency, and identity threat shrink reasoning quality unless guardrails are prepared in advance.",
        visual: "Pressure-proofing checklist for urgent decisions.",
        challenge: "Create a rapid-decision checklist for one high-pressure context.",
        trap: "Believing pressure excuses bad process.",
      },
      {
        title: "Logic and AI together",
        scenario: "A human catches an AI mistake only because they know how to test claims, assumptions, evidence, and causal leaps.",
        visual: "Human-AI reasoning loop linking prompt, answer, critique, verification, and decision.",
        challenge: "Run one AI-generated answer through a full reasoning audit.",
        trap: "Using AI without bringing logic to the interaction.",
      },
      {
        title: "Final synthesis",
        scenario: "A realistic bundle of claims from work, media, and AI demands disciplined judgment across the whole course.",
        visual: "Reasoner operating system diagram connecting habits from all eight modules.",
        challenge: "Write your personal reasoning charter and test it against one live issue.",
        trap: "Treating logic as knowledge instead of a repeatable habit.",
      },
    ],
  },
];
