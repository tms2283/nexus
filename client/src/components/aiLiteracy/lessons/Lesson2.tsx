/**
 * Lesson 2 — Myths, Hallucinations & Verification
 *
 * Topic: why LLMs fabricate information, how to spot it, and how to build a
 * repeatable verification habit (TRACE). Pedagogy follows the primitives
 * contract in ../primitives and the audit standard in
 * AI_LITERACY_AUDIT_AND_ARCHITECTURE.md §1.1 and AI_LITERACY_DESIGN_DOCUMENT.md §1.4.
 */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Compass,
  Database,
  Layers,
  Microscope,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import {
  AdaptiveProse,
  CalibrationChart,
  ConfidenceQuizItem,
  LLMGradedResponse,
  MisconceptionCard,
  ProductiveFailureOpener,
  RetrievalWarmup,
  SpanSelectExercise,
  WorkedFadedIndependent,
  useLessonMetrics,
  type ConfidenceQuizData,
} from "../primitives";

// ─── Data: productive-failure opener items ────────────────────────────────────

const OPENER_ITEMS = [
  {
    id: "fake-court",
    text: "Smith v. Department of Energy, 564 F.3d 211 (9th Cir. 2012) — ruled federal rebates on solar panels extend to commercial leases.",
    bucket: "fabricated",
  },
  {
    id: "real-textbook",
    text: "Water at standard atmospheric pressure boils at 100 degrees Celsius.",
    bucket: "real",
  },
  {
    id: "fake-book",
    text: "Stephen King's 1994 novel The Black Depot tells the story of a cursed freight yard in rural Maine.",
    bucket: "fabricated",
  },
  {
    id: "real-science",
    text: "Human DNA is packaged into 23 pairs of chromosomes inside almost every cell.",
    bucket: "real",
  },
  {
    id: "wrong-date",
    text: "The Berlin Wall fell on November 9, 1987, ending the Cold War overnight.",
    bucket: "fabricated",
  },
] as const;

const OPENER_BUCKETS = [
  { id: "fabricated", label: "Likely Fabricated", color: "oklch(0.72 0.2 290)" },
  { id: "real", label: "Likely Real", color: "oklch(0.72 0.18 150)" },
];

// ─── Data: confidence quiz items ──────────────────────────────────────────────

const QUIZ_ITEMS: ConfidenceQuizData[] = [
  {
    question:
      "An AI assistant answers a legal question in a smooth, professional tone and cites a case by name and number. What is the most reliable conclusion you can draw?",
    options: [
      {
        text: "The fluency of the answer is strong evidence the case is real.",
        misconceptionId: "confidence-equals-truth",
      },
      {
        text: "Because it cited a specific case number, the citation is probably correct.",
        misconceptionId: "confidence-equals-truth",
      },
      {
        text: "Fluency and specificity are optimized by training; neither tells you the citation is real.",
      },
      {
        text: "You can trust legal answers if the AI does not say 'I am not sure'.",
        misconceptionId: "self-check-works",
      },
    ],
    correct: 2,
    explanation:
      "Language models are rewarded during training for sounding coherent, not for being accurate. A convincing citation is perfectly consistent with a completely invented case. Always verify legal citations in an official reporter or database like PACER or Westlaw.",
    elaborationPrompt:
      "In one sentence, why does a confident tone not imply a correct fact?",
  },
  {
    question:
      "Which situation is MOST likely to produce a hallucinated answer?",
    options: [
      {
        text: "You ask a well-documented question about a niche 1970s band.",
        misconceptionId: "obscure-only",
      },
      {
        text: "You ask about a very famous person, but frame the question in a way that presupposes a false fact.",
      },
      {
        text: "You ask the model to summarize a passage you pasted into the prompt.",
      },
      {
        text: "You ask the model to translate a common French proverb into English.",
      },
    ],
    correct: 1,
    explanation:
      "Hallucination risk tracks ambiguity and prompt pressure, not how famous the topic is. A loaded question ('When did Einstein invent the telephone?') pressures the model to produce a date for an event that did not happen. Obscurity is a factor, but pressure-to-answer is the bigger one.",
    elaborationPrompt:
      "What does the wrong-sounding premise in option B do to the model's next-token distribution?",
  },
  {
    question:
      "You get an answer you suspect is wrong. You ask the same model, 'Are you sure?' What should you expect?",
    options: [
      {
        text: "It will reliably catch its own mistakes because self-reflection is a special mode.",
        misconceptionId: "self-check-works",
      },
      {
        text: "It will probably either double down or flip its answer based on your tone, not on new evidence.",
      },
      {
        text: "It will always apologize and give you the correct answer on the second try.",
        misconceptionId: "self-check-works",
      },
      {
        text: "Its self-check has access to a separate fact database that the first answer did not use.",
        misconceptionId: "self-check-works",
      },
    ],
    correct: 1,
    explanation:
      "Asking a model to self-check runs the same weights over a slightly different prompt. There is no fresh source of truth behind the curtain. Research consistently shows self-correction is unreliable and biased toward whatever the user seems to want. External verification beats internal.",
    elaborationPrompt:
      "Why can't a second pass of the same model catch its own fabrication?",
  },
  {
    question:
      "You are verifying a statistic the AI gave you ('38% of U.S. teachers report using AI tools weekly, per Pew Research, 2024'). What is the SINGLE best first step?",
    options: [
      {
        text: "Ask a different AI model to confirm the number.",
        misconceptionId: "self-check-works",
      },
      {
        text: "Search for 'Pew Research 2024 teachers AI' and find the original report.",
      },
      {
        text: "Paste the claim into a fact-check website and trust the top result.",
      },
      {
        text: "Accept it — Pew Research is a reputable source, so the quote is safe.",
        misconceptionId: "confidence-equals-truth",
      },
    ],
    correct: 1,
    explanation:
      "TRACE step one is Trace to source. The claim is only as strong as the document it came from — and the AI may have invented the report, the year, or the number while keeping the publisher plausible. Pull up Pew's own page before citing it.",
    elaborationPrompt:
      "What fails if you trust the publisher name without opening the actual report?",
  },
];

// ─── Small visual helper components ──────────────────────────────────────────

function TokenProbabilityBar() {
  const tokens = [
    { word: "Paris", p: 0.62 },
    { word: "London", p: 0.14 },
    { word: "Berlin", p: 0.09 },
    { word: "Madrid", p: 0.07 },
    { word: "Rome", p: 0.05 },
    { word: "other", p: 0.03 },
  ];
  return (
    <div className="glass rounded-xl p-4 border border-white/10 my-4">
      <div className="flex items-center gap-2 mb-2">
        <Layers size={14} className="text-[oklch(0.65_0.22_200)]" />
        <span className="text-xs font-semibold uppercase tracking-wider text-[oklch(0.65_0.22_200)]">
          Next-token distribution · prompt: "The capital of France is…"
        </span>
      </div>
      <div className="space-y-1.5">
        {tokens.map(t => (
          <div key={t.word} className="flex items-center gap-2">
            <span className="w-16 text-xs text-foreground font-mono">{t.word}</span>
            <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${t.p * 100}%`,
                  background:
                    t.word === "Paris"
                      ? "oklch(0.72 0.18 150)"
                      : "oklch(0.65 0.22 200 / 0.7)",
                }}
              />
            </div>
            <span className="w-12 text-right text-xs text-muted-foreground font-mono">
              {(t.p * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
        The model doesn't "know" Paris is correct. It knows that in its training data,
        after that exact phrase, the token <em>Paris</em> is the likeliest continuation.
        Change the prompt to something ambiguous and the distribution flattens —
        and the model still picks a word with confidence.
      </p>
    </div>
  );
}

function RetrievalVsGeneration() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-4">
      <div className="glass rounded-xl p-4 border border-[oklch(0.72_0.18_150_/_0.25)]">
        <div className="flex items-center gap-2 mb-2">
          <Database size={14} className="text-[oklch(0.72_0.18_150)]" />
          <span className="text-xs font-bold uppercase tracking-wider text-[oklch(0.72_0.18_150)]">
            Retrieval
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          A search engine looks up a document that <em>exists</em> and shows you
          text that was actually written. If nothing matches, you get zero
          results. The worst case is a blank page.
        </p>
      </div>
      <div className="glass rounded-xl p-4 border border-[oklch(0.72_0.2_290_/_0.25)]">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={14} className="text-[oklch(0.72_0.2_290)]" />
          <span className="text-xs font-bold uppercase tracking-wider text-[oklch(0.72_0.2_290)]">
            Generation
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          A language model generates text that <em>sounds like</em> what a
          correct answer would look like — even when no such answer exists. The
          worst case is a polished, confident lie.
        </p>
      </div>
    </div>
  );
}

function TraceMnemonic() {
  const steps = [
    { letter: "T", word: "Trace", icon: Search, detail: "Find the original source the claim points to. If the AI cites a study, open the study." },
    { letter: "R", word: "Reproduce", icon: Compass, detail: "Can you reproduce the number or quote somewhere independent? Two sources that both trace to the same origin still count as one." },
    { letter: "A", word: "Ask a real expert source", icon: BookOpen, detail: "A textbook, a government database, a peer-reviewed paper, or a human who does this for a living." },
    { letter: "C", word: "Check incentives", icon: Microscope, detail: "Who benefits if this claim is believed? That doesn't make it false — but it tells you how carefully to read." },
    { letter: "E", word: "Edit before sharing", icon: ShieldCheck, detail: "Rewrite the claim in your own words with the verified specifics. If you can't, you don't understand it well enough to share." },
  ];
  return (
    <div className="glass rounded-2xl p-5 border border-[oklch(0.65_0.22_200_/_0.25)] my-4">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck size={14} className="text-[oklch(0.65_0.22_200)]" />
        <span className="text-xs font-bold uppercase tracking-wider text-[oklch(0.65_0.22_200)]">
          The TRACE verification habit
        </span>
      </div>
      <div className="space-y-2">
        {steps.map(s => {
          const Icon = s.icon;
          return (
            <div
              key={s.letter}
              className="flex items-start gap-3 p-3 rounded-lg bg-white/3 border border-white/5"
            >
              <div className="w-8 h-8 rounded-lg bg-[oklch(0.65_0.22_200_/_0.15)] border border-[oklch(0.65_0.22_200_/_0.3)] flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-[oklch(0.85_0.22_200)]">{s.letter}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <Icon size={12} className="text-[oklch(0.65_0.22_200)]" />
                  <span className="text-sm font-semibold text-foreground">{s.word}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Section header helper ────────────────────────────────────────────────────

function SectionHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[oklch(0.78_0.16_30)] mb-1">
        {eyebrow}
      </div>
      <h2 className="text-2xl font-semibold text-foreground mb-2 tracking-tight">
        {title}
      </h2>
      {children && (
        <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Lesson2Props {
  onComplete: () => void;
}

export default function Lesson2({ onComplete }: Lesson2Props) {
  const { metrics, recordAnswer } = useLessonMetrics();
  const [stage, setStage] = useState<
    | "warmup"
    | "opener"
    | "why"
    | "misconceptions"
    | "span"
    | "trace"
    | "ladder"
    | "quiz"
    | "response"
    | "calibration"
    | "done"
  >("warmup");

  const [quizIndex, setQuizIndex] = useState(0);
  const [understood, setUnderstood] = useState<Record<number, boolean>>({});
  const [responsePassed, setResponsePassed] = useState(false);

  const advance = (next: typeof stage) => () => setStage(next);

  const reachedOrPast = useMemo(() => {
    const order: typeof stage[] = [
      "warmup", "opener", "why", "misconceptions", "span", "trace",
      "ladder", "quiz", "response", "calibration", "done",
    ];
    return (s: typeof stage) => order.indexOf(stage) >= order.indexOf(s);
  }, [stage]);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Lesson banner */}
      <div className="glass rounded-2xl p-6 border border-[oklch(0.72_0.2_290_/_0.25)] relative overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={16} className="text-[oklch(0.72_0.2_290)]" />
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-[oklch(0.72_0.2_290)]">
            Lesson 2 of 5
          </span>
        </div>
        <h1 className="text-3xl font-semibold text-foreground tracking-tight mb-2">
          Myths, Hallucinations & Verification
        </h1>
        <AdaptiveProse topic="Lesson 2 overview: hallucination and verification" seed="LLMs fill in blanks rather than lie; this lesson explains why and teaches the TRACE habit.">
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Language models don't lie on purpose — they fill in the blanks.
            By the end of this lesson, you'll know why that happens, how to spot
            it, and a five-step habit (TRACE) that turns any AI answer into
            something you can actually stand behind.
          </p>
        </AdaptiveProse>
      </div>

      {/* 1. Retrieval warmup */}
      {reachedOrPast("warmup") && (
        <RetrievalWarmup
          fromLesson="Lesson 1 — What AI Actually Is"
          questions={[
            {
              prompt:
                "In your own words, what does it mean that a large language model predicts the next token?",
              correctAnswer:
                "It scores every possible next word/piece given the prompt so far, picks one using those probabilities, and repeats — there is no lookup into a fact database.",
              hint: "Focus on what the model is doing one step at a time…",
            },
            {
              prompt:
                "Name one task today's AI is narrow-good at, and one way that narrow skill can mislead people.",
              correctAnswer:
                "e.g. summarizing a pasted passage — strong. But people extrapolate that fluency to mean the model is a general research assistant, which it is not.",
              hint: "A skill + the wrong conclusion people draw from it.",
            },
          ]}
          onComplete={advance("opener")}
        />
      )}

      {/* 2. Productive-failure opener */}
      {reachedOrPast("opener") && (
        <ProductiveFailureOpener
          title="Which of these answers did the AI make up?"
          description="Five short answers that sound like they came from a confident chatbot. Two buckets. Guess first — the pattern in your mistakes is the lesson."
          items={OPENER_ITEMS.map(({ id, text, bucket }) => ({ id, text, bucket }))}
          buckets={OPENER_BUCKETS}
          reveal={
            <div className="space-y-3">
              <p>
                <strong className="text-foreground">Beat 1 — Fluency is the trick.</strong>{" "}
                The fake court case, the invented Stephen King novel, and the wrong
                Berlin Wall date all <em>read</em> like real facts because the
                model is trained to produce text that reads like real facts.
                That polish is generated, not earned.
              </p>
              <p>
                <strong className="text-foreground">Beat 2 — Pattern, not memory.</strong>{" "}
                The model doesn't look a fact up. It picks words that
                statistically fit. "Stephen King wrote ___" will produce a
                plausible King-sounding title whether or not that book exists.
                The template is right; the specific fact is a guess.
              </p>
              <p>
                <strong className="text-foreground">Beat 3 — Confidence is orthogonal to correctness.</strong>{" "}
                Nothing in the system flags the fakes. The false Berlin Wall
                date sounds identical to the true chromosome count. That's
                exactly why we need an external habit (coming up) to verify.
              </p>
            </div>
          }
          onComplete={advance("why")}
        />
      )}

      {/* 3. Why LLMs hallucinate — core exposition */}
      {reachedOrPast("why") && (
        <div className="glass rounded-2xl p-6 border border-white/8">
          <SectionHeading eyebrow="Core idea" title="Why LLMs hallucinate">
            The word "hallucination" is misleading — it makes it sound like a
            glitch, something the model will grow out of. It isn't a glitch.
            It's how the machine works when it works normally.
          </SectionHeading>

          <AdaptiveProse topic="Why LLMs hallucinate: the token prediction mechanism" seed="LLMs generate text token by token from a probability distribution with no built-in truth check, making confident fabrication a normal output.">
            <div className="prose prose-invert prose-sm max-w-none text-muted-foreground leading-relaxed space-y-4">
              <p>
                A language model generates one token (roughly, one piece of a
                word) at a time. For every token, it produces a probability
                distribution over tens of thousands of options and samples one.
                Then it repeats. That's the entire mechanism. There is no
                separate step where the model asks, "Wait — is this actually
                true?" There is no pause to check a database. Every token that
                comes out is the token the math said was most plausible to
                come next, given everything that came before.
              </p>

              <TokenProbabilityBar />

              <p>
                When the prompt has a clear, well-represented answer in the
                training data — "The capital of France is ___" — the
                distribution is sharp and the right token wins by a landslide.
                When the prompt is ambiguous, obscure, or loaded, the
                distribution flattens out. The model still has to pick. Whatever
                it picks, it will then commit to and build on, because that
                word is now part of the context for the <em>next</em> word.
                A small slip at token 12 becomes a wrong citation by token 40
                and a completely fictional conclusion by token 100.
              </p>

              <p>
                There is usually no internal "I don't know" signal. The model
                was trained on an enormous pile of text — Wikipedia, books,
                forums, fan fiction, satire sites, outdated pages, contradictory
                sources — and was rewarded for producing text that sounds right.
                It was not rewarded for saying <em>I'm not sure</em>, because
                its training data rarely contained that response and because
                fluent answers score better on the human-preference benchmarks
                the builders use. So the model learned to fill the space.
                Silence, in a language model's world, is failure.
              </p>

              <p>
                This is sometimes called the <strong className="text-foreground">plausibility gradient</strong>:
                the model optimizes toward text that looks like what a correct
                answer would look like. A correct legal answer has a case name
                and a reporter number, so the model produces a case name and a
                reporter number. Whether that case actually exists is a
                separate question the model was never trained to answer. A
                correct medical answer cites a study, so the model cites a
                study — real or not. The <em>shape</em> of truth is what the
                training pressure rewards. The truth itself is a happy
                coincidence, most of the time.
              </p>

              <RetrievalVsGeneration />

              <p>
                Newer systems try to fight this with <strong className="text-foreground">
                retrieval-augmented generation (RAG)</strong> — they search a
                real database first, then feed the results into the prompt so
                the model has actual source text to lean on. Others use
                <strong className="text-foreground"> tool use</strong> (the
                model calls a calculator, a code runner, or a live search) or
                <strong className="text-foreground"> grounding</strong> (the
                model is forced to quote from an attached document). These
                help a lot. They don't cure the problem. The model can still
                misread the retrieved text, cite a passage that isn't there,
                or confidently summarize a page it didn't actually open.
                Verification stays your job.
              </p>

              <p>
                The takeaway isn't that AI is useless. It's that{" "}
                <strong className="text-foreground">
                  every specific factual claim — a number, a date, a case
                  citation, a book title, a person's credential — is
                  unverified until you verify it
                </strong>
                . Treat a chatbot's answer the way a good editor treats a
                first-draft pitch: promising, probably directionally right,
                and absolutely not publishable as is.
              </p>
            </div>
          </AdaptiveProse>

          <button
            onClick={advance("misconceptions")}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[oklch(0.78_0.16_30)] text-black text-sm font-semibold"
          >
            I've got this — next: common misconceptions
          </button>
        </div>
      )}

      {/* 4. Misconception cards */}
      {reachedOrPast("misconceptions") && (
        <div className="space-y-4">
          <SectionHeading
            eyebrow="Wrong models to uninstall"
            title="Three myths worth unlearning"
          >
            Each of these feels true for a reason. We'll walk through the
            feeling, the mechanism underneath, and the more useful model to
            replace it with.
          </SectionHeading>

          <MisconceptionCard
            misconception="If the AI sounds confident, it's probably right."
            whyItFeelsTrue="We're socialized from kindergarten onward to trust fluent speakers. Confident people in meetings get believed; hedging people get overruled. A chatbot that writes in full paragraphs, with no ums or hedges, borrows that cultural trust reflex. It feels like expertise because it sounds like expertise."
            mechanism="Fluency is directly optimized during training — models get better scores when their answers sound smooth and complete. Truth is only indirectly optimized, through imperfect human raters who themselves can't always tell. So the training pressure on tone is enormous, and the training pressure on accuracy is weaker. A confident-sounding wrong answer is exactly the kind of thing the training process produces."
            nuancedTruth="Treat every specific factual claim — names, numbers, dates, quotes, citations — as unverified by default, no matter how confident the wrapper sounds. Tone tells you how the sentence was written, not whether it's true."
            onMarkUnderstood={() => setUnderstood(u => ({ ...u, 0: true }))}
            understood={understood[0]}
          />

          <MisconceptionCard
            misconception="Hallucinations only happen for obscure topics."
            whyItFeelsTrue="The hallucination examples that go viral are usually obscure — a made-up court case, a fake research paper by a real scientist, a niche technical spec. So the pattern you see is 'AI hallucinates in the dark corners.' Mainstream facts like 'water boils at 100°C' come out right."
            mechanism="Obscurity matters, but it's not the real lever. The real lever is ambiguity or pressure in the prompt. Even well-known topics hallucinate when the question forces the model to answer something specific that the training data doesn't clearly contain. Ask 'What did Einstein say about AI?' and the model will invent a plausible Einstein quote, because there has to be one for the answer to exist. The topic is famous; the specific fact is made up."
            nuancedTruth="Hallucination risk scales with ambiguity and specificity, not fame. A famous person + a specific hypothetical quote is very dangerous. An obscure topic + a well-known answer is safer. Learn to feel the difference."
            onMarkUnderstood={() => setUnderstood(u => ({ ...u, 1: true }))}
            understood={understood[1]}
          />

          <MisconceptionCard
            misconception="If I ask the AI to check its own answer, it can tell me if it's wrong."
            whyItFeelsTrue="Self-correction feels meta-smart — like asking someone 'are you sure?' and watching them stop and think. Sometimes the model does flip its answer when pressed, which reinforces the feeling that it's catching itself. It seems responsive, careful, even humble."
            mechanism="A second forward pass through the model uses the same weights on a slightly longer prompt. There is no separate fact-checking module, no new information, no access to a ground-truth database. What <em>does</em> change is social pressure: 'Are you sure?' tells the model you expect a different answer, and it often obliges. You're not getting a fact check — you're getting a more agreeable guess."
            nuancedTruth="External verification beats internal verification, always. A different model, a source document, or a human expert is a real second opinion. The same model politely re-reading itself is not."
            onMarkUnderstood={() => setUnderstood(u => ({ ...u, 2: true }))}
            understood={understood[2]}
          />

          <button
            onClick={advance("span")}
            disabled={!(understood[0] && understood[1] && understood[2])}
            className="px-4 py-2 rounded-lg bg-[oklch(0.78_0.16_30)] text-black text-sm font-semibold disabled:opacity-40"
          >
            Mark all three understood, then continue
          </button>
        </div>
      )}

      {/* 5. Span-select exercise */}
      {reachedOrPast("span") && (
        <SpanSelectExercise
          title="Spot the fabrications in this AI-generated answer"
          instructions={
            "A learner asked: 'What were the key provisions of the 1973 Endangered Species Act?' The paragraph below is what the chatbot returned. Click the spans you think the AI made up. You need to catch at least 2."
          }
          requiredHits={2}
          successMessage="You're already doing the work: hunting for specific claims — numbers, section labels, named bodies — instead of reacting to the vibe of the paragraph."
          chunks={[
            {
              text: "The Endangered Species Act of 1973 was signed into law by President Richard Nixon ",
            },
            {
              text: "on December 28, 1973. ",
            },
            {
              text: "It authorized the Secretary of the Interior to list species as 'endangered' or 'threatened', ",
            },
            {
              text: "and directed federal agencies to avoid actions likely to jeopardize listed species. ",
            },
            {
              text: "Under Section 11-B, ",
              isTarget: true,
              explanation:
                "The actual civil penalties section is Section 11, not '11-B'. The AI invented a sub-section label that sounds precise and official. Always look up section numbers in the real U.S. Code.",
            },
            {
              text: "enforcement was delegated to the Federal Wildlife Protection Bureau, ",
              isTarget: true,
              explanation:
                "There is no agency with that name. Enforcement actually falls to the U.S. Fish and Wildlife Service (for most species) and NOAA Fisheries (for marine species). The fabricated bureau sounds plausible because it follows a familiar federal-agency naming pattern.",
            },
            {
              text: "which can impose fines and, in serious cases, criminal penalties. ",
            },
            {
              text: "The law also created the process for designating 'critical habitat' ",
            },
            {
              text: "and was amended significantly in 1978 and 1982. ",
            },
            {
              text: "It remains one of the most far-reaching environmental statutes ever passed in the United States, ",
            },
            {
              text: "and was upheld as constitutional by the Supreme Court in Babbitt v. Sweet Home Chapter (1997).",
              isTarget: true,
              explanation:
                "The case Babbitt v. Sweet Home Chapter of Communities for a Great Oregon is real — but it was decided in 1995, not 1997, and it specifically upheld the broad definition of 'harm' under the ESA, not the whole statute's constitutionality. The date is wrong and the summary is subtly wrong; both are classic AI-in-the-weeds errors.",
            },
          ]}
        />
      )}

      {reachedOrPast("span") && (
        <button
          onClick={advance("trace")}
          className="w-full px-4 py-3 rounded-xl glass border border-white/10 text-sm font-semibold text-foreground hover:border-white/20"
        >
          Continue — learn the TRACE habit
        </button>
      )}

      {/* 6. Verification framework */}
      {reachedOrPast("trace") && (
        <div className="glass rounded-2xl p-6 border border-white/8">
          <SectionHeading
            eyebrow="Build the habit"
            title="TRACE: five steps from claim to trust"
          >
            Spotting fabrications is necessary but not sufficient. You need a
            repeatable routine you apply every time an AI hands you a
            specific claim you might repeat. Here is a mnemonic short enough
            to use in the moment.
          </SectionHeading>

          <TraceMnemonic />

          <AdaptiveProse topic="TRACE verification framework explained" seed="Each letter of TRACE blocks a distinct hallucination failure mode, from fake sources to unchecked incentives to unrewritten claims.">
            <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
              <p>
                TRACE works because each letter blocks a different failure mode.{" "}
                <strong className="text-foreground">Trace</strong> catches the
                fake-source problem: if the AI invented the paper, you'll find
                out the moment you search for it and nothing comes up.{" "}
                <strong className="text-foreground">Reproduce</strong> catches
                the echo-chamber problem: three blog posts that all quote the
                same mystery statistic are one source, not three. Find the
                original.
              </p>
              <p>
                <strong className="text-foreground">Ask an expert source</strong>{" "}
                catches the confident-but-shallow problem. A textbook, a
                government data portal, a peer-reviewed paper, or a human who
                does this work for a living sees things a generalist model
                can't.{" "}
                <strong className="text-foreground">Check incentives</strong>{" "}
                doesn't mean dismissing motivated sources — it means reading
                them with the right level of care. A pharmaceutical company's
                safety study isn't worthless, but it isn't neutral either.
              </p>
              <p>
                <strong className="text-foreground">Edit before sharing</strong>{" "}
                is the step most people skip. If you can't restate the claim in
                your own words with the verified specifics, you don't actually
                understand it. Copy-pasting an AI answer into an email, a
                memo, or a social post is how fabrications enter the record as
                if they were facts. Rewriting forces you to slow down enough
                to notice the gaps.
              </p>
              <p>
                You won't run all five steps for every trivial question —
                nobody needs a peer-reviewed source for "what's a synonym for
                delighted." Use TRACE when the claim has a specific shape:
                a number, a date, a name, a citation, a quote, a rule, a
                credential. Anything that would be embarrassing or harmful
                if it turned out to be invented.
              </p>
            </div>
          </AdaptiveProse>

          <button
            onClick={advance("ladder")}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[oklch(0.65_0.22_200)] text-black text-sm font-semibold"
          >
            Try it on a real claim
          </button>
        </div>
      )}

      {/* 7. Worked / faded / independent */}
      {reachedOrPast("ladder") && (
        <WorkedFadedIndependent
          title="Verify a statistic the AI just gave you"
          rungs={[
            {
              label: "Worked example",
              body: (
                <div className="space-y-3">
                  <p>
                    <strong className="text-foreground">The claim:</strong>{" "}
                    "A 2023 Stanford study found that 46% of undergraduates
                    have used an AI tool to draft an essay (Stanford HAI, 2023)."
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-xs">
                    <li>
                      <strong className="text-foreground">T — Trace.</strong>{" "}
                      I search "Stanford HAI 2023 undergraduates essay AI" on
                      Stanford HAI's own site. I find a 2023 report but the
                      number is 20%, not 46%, and it's about "used AI for
                      any coursework", not specifically essays.
                    </li>
                    <li>
                      <strong className="text-foreground">R — Reproduce.</strong>{" "}
                      I look for the 46% number in Google Scholar. The only
                      hit is a blog that doesn't link to a source. This is a
                      red flag — nothing independent reproduces the figure.
                    </li>
                    <li>
                      <strong className="text-foreground">A — Ask.</strong>{" "}
                      Pew Research's 2024 survey of teens is close to the
                      topic and puts weekly AI use for schoolwork at about
                      26%. The HAI 20% number is the one I can actually defend.
                    </li>
                    <li>
                      <strong className="text-foreground">C — Incentives.</strong>{" "}
                      HAI is a research institute, not a vendor. Low conflict
                      of interest on this specific stat.
                    </li>
                    <li>
                      <strong className="text-foreground">E — Edit.</strong>{" "}
                      I rewrite the sentence I was going to share as:
                      "Stanford HAI's 2023 report found roughly 20% of
                      undergraduates had used AI tools for any coursework."
                      The original 46% goes in the trash.
                    </li>
                  </ol>
                </div>
              ),
            },
            {
              label: "Faded example",
              body: (
                <div className="space-y-3">
                  <p>
                    <strong className="text-foreground">The claim:</strong>{" "}
                    "According to a 2024 McKinsey report, 62% of small businesses
                    have deployed a generative AI tool in at least one workflow."
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-xs">
                    <li>
                      <strong className="text-foreground">T — Trace.</strong>{" "}
                      I go to mckinsey.com and search "small business
                      generative AI 2024". I find the State of AI report;
                      the small-business breakdown doesn't use the number 62%.
                    </li>
                    <li>
                      <strong className="text-foreground">R — Reproduce.</strong>{" "}
                      <em>Your turn:</em> describe what you would do for this step.
                      Where else could this number appear, and what would a
                      clean reproduction look like?
                    </li>
                    <li>
                      <strong className="text-foreground">A — Ask.</strong>{" "}
                      I check the U.S. Census Bureau's Business Trends and
                      Outlook Survey, which reports AI adoption much lower
                      (under 10% for very small firms as of late 2024).
                    </li>
                    <li>
                      <strong className="text-foreground">C — Incentives.</strong>{" "}
                      McKinsey sells AI advisory services. Not disqualifying,
                      but worth noting.
                    </li>
                    <li>
                      <strong className="text-foreground">E — Edit.</strong>{" "}
                      Rewrite to something like: "Estimates of small-business
                      generative AI adoption vary widely; the U.S. Census
                      BTOS puts it under 10% for the smallest firms, while
                      McKinsey's 2024 survey of larger respondents reports
                      higher numbers."
                    </li>
                  </ol>
                  <p className="text-[11px] italic text-muted-foreground/70">
                    Fill in step R in your head before advancing.
                  </p>
                </div>
              ),
            },
            {
              label: "Your turn",
              body: (
                <div className="space-y-3">
                  <p>
                    <strong className="text-foreground">The claim the AI just gave you:</strong>{" "}
                    "Dr. Lisa Han's 2022 MIT study showed that daily meditation
                    reduced reported anxiety scores by 31% in adults over 65
                    (published in the Journal of Behavioral Geriatrics)."
                  </p>
                  <p className="text-xs">
                    Plan a full TRACE for this claim before you repeat it to
                    your mother-in-law. In your notebook or head, write one
                    concrete action for each letter — T, R, A, C, E — including
                    the exact search or source you would check first. Watch
                    especially for: does Dr. Lisa Han at MIT exist? Does that
                    journal exist? Is 31% reproducible anywhere?
                  </p>
                  <p className="text-[11px] italic text-muted-foreground/70">
                    There's no auto-grader for this rung on purpose — the
                    point is that you now own the habit. The next section
                    will ask you to reflect in writing.
                  </p>
                </div>
              ),
            },
          ]}
        />
      )}

      {reachedOrPast("ladder") && (
        <button
          onClick={advance("quiz")}
          className="w-full px-4 py-3 rounded-xl glass border border-white/10 text-sm font-semibold text-foreground hover:border-white/20"
        >
          Continue to the confidence quiz
        </button>
      )}

      {/* 8. Confidence quiz */}
      {reachedOrPast("quiz") && quizIndex < QUIZ_ITEMS.length && (
        <motion.div
          key={quizIndex}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <ConfidenceQuizItem
            data={QUIZ_ITEMS[quizIndex]}
            index={quizIndex}
            total={QUIZ_ITEMS.length}
            onAnswer={info => {
              const chosen = QUIZ_ITEMS[quizIndex];
              const selected = info.correct ? chosen.correct : -1;
              const mis =
                !info.correct && selected !== -1
                  ? chosen.options[selected]?.misconceptionId
                  : undefined;
              recordAnswer(
                { confidence: info.confidence, correct: info.correct },
                mis,
              );
            }}
            onNext={() => {
              if (quizIndex + 1 < QUIZ_ITEMS.length) {
                setQuizIndex(i => i + 1);
              } else {
                setStage("response");
              }
            }}
          />
        </motion.div>
      )}

      {/* 9. LLM-graded open response */}
      {reachedOrPast("response") && (
        <LLMGradedResponse
          title="Reflection: a claim you might have repeated"
          prompt="Describe a time — real or hypothetical — where you might have acted on an AI-generated claim without verifying it. Be specific about what the claim was. Then name at least one TRACE step that would have caught the problem, and say what could have gone wrong if nobody ran it."
          minimumCriteria={2}
          rubric={[
            {
              criterion:
                "Names a specific claim (a number, a date, a name, a quote, a citation, or a rule).",
              pattern: (text: string) =>
                /\d|\b(quote|cited?|case|study|report|section|act|law|rule|claim|statistic)\b/i.test(
                  text,
                ),
              hint: "Point at the exact sentence the AI gave you. 'Something about medicine' is too vague.",
            },
            {
              criterion:
                "Names at least one TRACE step by letter, name, or clear paraphrase (Trace, Reproduce, Ask, Check incentives, Edit).",
              pattern:
                /\b(trace|reproduc|ask|expert|source|incentive|edit|rewr|check)/i,
              hint: "Call out which step would have caught it — e.g. 'I would have Traced it to the original study…'",
            },
            {
              criterion:
                "Identifies a specific thing that could have gone wrong (embarrassment, wrong decision, spreading misinformation, harm).",
              pattern:
                /\b(wrong|mistake|misinform|embarrass|harm|hurt|bad|damage|misle|fool|confus|inaccur|false)/i,
              hint: "What's the cost of repeating a fabrication? Be concrete.",
            },
          ]}
          onComplete={passed => {
            setResponsePassed(passed);
            setStage("calibration");
          }}
        />
      )}

      {/* 10. Calibration chart */}
      {reachedOrPast("calibration") && (
        <>
          <CalibrationChart points={metrics.calibration} />
          <button
            onClick={advance("done")}
            className="w-full px-4 py-3 rounded-xl glass border border-white/10 text-sm font-semibold text-foreground hover:border-white/20"
          >
            See key takeaways
          </button>
        </>
      )}

      {/* 11. Key takeaways + complete */}
      {reachedOrPast("done") && (
        <div className="glass rounded-2xl p-6 border border-[oklch(0.72_0.18_150_/_0.3)]">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={16} className="text-[oklch(0.72_0.18_150)]" />
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[oklch(0.72_0.18_150)]">
              Lesson 2 · Key takeaways
            </span>
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-4">
            What to carry with you
          </h3>
          <ul className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <li className="flex gap-3">
              <span className="text-[oklch(0.72_0.18_150)] font-bold shrink-0">01</span>
              <span>
                Hallucination is not a bug — it's what happens every time the
                model runs. The fix isn't a better model, it's a better
                reader.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-[oklch(0.72_0.18_150)] font-bold shrink-0">02</span>
              <span>
                Tone is generated; truth is not. Every specific claim — a
                number, a date, a citation, a quote — is unverified by
                default.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-[oklch(0.72_0.18_150)] font-bold shrink-0">03</span>
              <span>
                Asking the same model "are you sure?" is not a fact check.
                External verification beats internal, every time.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-[oklch(0.72_0.18_150)] font-bold shrink-0">04</span>
              <span>
                Use TRACE on any claim with a specific shape: <strong className="text-foreground">T</strong>race the source,
                <strong className="text-foreground"> R</strong>eproduce independently,
                <strong className="text-foreground"> A</strong>sk a real expert source,
                <strong className="text-foreground"> C</strong>heck incentives,
                <strong className="text-foreground"> E</strong>dit before sharing.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-[oklch(0.72_0.18_150)] font-bold shrink-0">05</span>
              <span>
                Calibration is a skill. If the chart above showed big gaps
                between your confidence and your accuracy, that's not a
                failure — that's the signal for what to practice next.
              </span>
            </li>
          </ul>

          <button
            onClick={onComplete}
            className="mt-6 w-full px-5 py-3 rounded-xl bg-[oklch(0.72_0.18_150)] text-black text-sm font-bold hover:opacity-90 transition-opacity"
          >
            Complete Lesson 2
            {responsePassed && " — reflection passed"}
          </button>
        </div>
      )}
    </div>
  );
}
