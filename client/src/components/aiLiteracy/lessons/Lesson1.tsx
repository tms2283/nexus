/**
 * Lesson 1 — What Is AI? From Patterns to Predictions
 *
 * Topic: what an LLM actually is, how training and inference work at a high
 * level, narrow vs general AI, tokens and probabilities, why scale matters.
 * This is the first lesson of the course, so it opens directly with a
 * ProductiveFailureOpener (no RetrievalWarmup — there is no prior lesson).
 *
 * Pedagogy follows the primitives contract in ../primitives and the audit
 * standard in AI_LITERACY_AUDIT_AND_ARCHITECTURE.md §1.1 and
 * AI_LITERACY_DESIGN_DOCUMENT.md §1.4.
 */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Binary,
  CheckCircle2,
  Compass,
  Cpu,
  Dumbbell,
  Network,
  Sparkles,
  Target,
  Telescope,
} from "lucide-react";

import {
  AdaptiveProse,
  CalibrationChart,
  ConfidenceQuizItem,
  LLMGradedResponse,
  MisconceptionCard,
  ProductiveFailureOpener,
  WorkedFadedIndependent,
  useLessonMetrics,
  type ConfidenceQuizData,
} from "../primitives";

// ─── Data: productive-failure opener items ────────────────────────────────────

const OPENER_ITEMS = [
  {
    id: "spam-filter",
    text: "Your email's spam filter that silently flags phishing messages.",
    bucket: "narrow",
  },
  {
    id: "gps-nav",
    text: "Turn-by-turn GPS navigation recalculating when you miss an exit.",
    bucket: "rules",
  },
  {
    id: "chatgpt-poem",
    text: "ChatGPT writing a short birthday poem in the style of Dr. Seuss.",
    bucket: "general",
  },
  {
    id: "sum-formula",
    text: "A spreadsheet =SUM(A1:A50) formula adding up a column of numbers.",
    bucket: "rules",
  },
  {
    id: "image-gen",
    text: "An image generator that paints 'a fox drinking coffee in Tokyo at night'.",
    bucket: "general",
  },
  {
    id: "chess-engine",
    text: "A chess engine that crushes grandmasters but cannot do anything else.",
    bucket: "narrow",
  },
] as const;

const OPENER_BUCKETS = [
  { id: "narrow", label: "Narrow AI (pattern matcher)", color: "oklch(0.72 0.18 150)" },
  { id: "general", label: "General-purpose LLM", color: "oklch(0.78 0.16 30)" },
  { id: "rules", label: "Not AI — hand-coded rules", color: "oklch(0.72 0.2 290)" },
];

// ─── Data: confidence quiz items ──────────────────────────────────────────────

const QUIZ_ITEMS: ConfidenceQuizData[] = [
  {
    question:
      "At each step while generating an answer, what is a large language model actually doing?",
    options: [
      {
        text: "Searching a database of memorized facts and copying the best match.",
        misconceptionId: "lookup-not-generation",
      },
      {
        text: "Scoring every possible next token and sampling one based on those probabilities.",
      },
      {
        text: "Reasoning through the problem the way a person thinks, then writing the answer.",
        misconceptionId: "understands-like-human",
      },
      {
        text: "Running a hand-written rule for each topic it knows about.",
        misconceptionId: "ai-is-one-thing",
      },
    ],
    correct: 1,
    explanation:
      "Inference in an LLM is a loop of one-token-at-a-time prediction. Given the prompt so far, the model produces a probability distribution over tens of thousands of possible next tokens and samples one. There is no lookup step, no hand-coded rule, and no internal reasoning monologue we can inspect — just a very large pile of math turning context into next-token odds.",
    elaborationPrompt:
      "In one sentence, what does 'sample from a distribution' mean in plain English?",
  },
  {
    question:
      "After training, where does a language model's 'knowledge' of the world actually live?",
    options: [
      {
        text: "In a connected encyclopedia that the model queries when you ask a question.",
        misconceptionId: "lookup-not-generation",
      },
      {
        text: "In billions of numerical weights (parameters) that were tuned during training.",
      },
      {
        text: "In a hidden scratchpad of facts the model quietly writes to itself.",
        misconceptionId: "understands-like-human",
      },
      {
        text: "In the prompt you type — the model has no memory between sessions.",
        misconceptionId: "ai-is-one-thing",
      },
    ],
    correct: 1,
    explanation:
      "Training distills patterns from trillions of tokens into billions of parameter values. Those numbers are the model's 'knowledge' — compressed, distributed, and tangled together. There is no neat row of facts to look up, which is why a model can be confidently wrong and why interpretability is still an open research problem.",
    elaborationPrompt:
      "If knowledge lives in the weights, why can two different prompts give different 'facts'?",
  },
  {
    question:
      "What does it mean to call something 'narrow AI'?",
    options: [
      {
        text: "It has a small number of parameters compared to a big model.",
        misconceptionId: "bigger-is-smarter",
      },
      {
        text: "It was trained to do one specific task well and does poorly outside that task.",
      },
      {
        text: "It is an early version that will grow into a general AI over time.",
        misconceptionId: "ai-is-one-thing",
      },
      {
        text: "It is the same thing as an LLM, just with a different marketing name.",
        misconceptionId: "ai-is-one-thing",
      },
    ],
    correct: 1,
    explanation:
      "A narrow AI is defined by the task it was built to optimize — a spam filter, a chess engine, a face tagger. Parameter count is unrelated. A narrow system can be enormous (a protein-folding model) or tiny (a credit-card fraud classifier). What makes it narrow is that it is excellent at one thing and blind outside it.",
    elaborationPrompt:
      "Pick any narrow AI you use — what is it optimized for, and what would it fail at?",
  },
  {
    question:
      "You send the exact same prompt to ChatGPT twice and get two different answers. Why?",
    options: [
      {
        text: "The model is broken or you hit a glitch.",
        misconceptionId: "ai-is-one-thing",
      },
      {
        text: "The model is secretly learning from your prompt between the two messages.",
        misconceptionId: "understands-like-human",
      },
      {
        text: "Sampling introduces randomness — the model picks from a distribution, not the single top word.",
      },
      {
        text: "The company silently switches you to a smaller model on the second try.",
        misconceptionId: "bigger-is-smarter",
      },
    ],
    correct: 2,
    explanation:
      "Most chat models sample from their next-token distribution using a 'temperature' setting that adds variety. Two runs will walk slightly different paths through the distribution and end up with different wording. That is also why the same prompt can be right once and wrong once — the model's answer isn't a single deterministic lookup.",
    elaborationPrompt:
      "Why is non-determinism sometimes useful and sometimes dangerous?",
  },
];

// ─── Small visual helper components ──────────────────────────────────────────

function NextTokenPredictor() {
  const tokens = [
    { word: "mat", p: 0.41 },
    { word: "floor", p: 0.18 },
    { word: "couch", p: 0.14 },
    { word: "roof", p: 0.09 },
    { word: "windowsill", p: 0.07 },
    { word: "other", p: 0.11 },
  ];
  return (
    <div className="glass rounded-xl p-4 border border-white/10 my-4">
      <div className="flex items-center gap-2 mb-2">
        <Binary size={14} className="text-[oklch(0.65_0.22_200)]" />
        <span className="text-xs font-semibold uppercase tracking-wider text-[oklch(0.65_0.22_200)]">
          Next-token distribution · prompt: "The cat sat on the ___"
        </span>
      </div>
      <div className="space-y-1.5">
        {tokens.map(t => (
          <div key={t.word} className="flex items-center gap-2">
            <span className="w-20 text-xs text-foreground font-mono">{t.word}</span>
            <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${t.p * 100}%`,
                  background:
                    t.word === "mat"
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
        These are made-up numbers, but the shape is real. The top guess wins
        most of the time, yet the model often samples a less common word — which
        is why the same prompt can produce "the mat" today and "the couch"
        tomorrow. Nothing here tells the model whether the cat actually exists.
      </p>
    </div>
  );
}

function TrainVsInference() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-4">
      <div className="glass rounded-xl p-4 border border-[oklch(0.72_0.18_150_/_0.25)]">
        <div className="flex items-center gap-2 mb-2">
          <Dumbbell size={14} className="text-[oklch(0.72_0.18_150)]" />
          <span className="text-xs font-bold uppercase tracking-wider text-[oklch(0.72_0.18_150)]">
            Training (once, expensive)
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          A giant pile of text passes through the network over and over. Each
          time the model's next-token guess is wrong, tiny adjustments are made
          to billions of parameters. Months of compute, millions of dollars,
          one frozen set of weights at the end.
        </p>
      </div>
      <div className="glass rounded-xl p-4 border border-[oklch(0.65_0.22_200_/_0.25)]">
        <div className="flex items-center gap-2 mb-2">
          <Cpu size={14} className="text-[oklch(0.65_0.22_200)]" />
          <span className="text-xs font-bold uppercase tracking-wider text-[oklch(0.65_0.22_200)]">
            Inference (every time you chat)
          </span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Those frozen weights run forward on your prompt. For each token the
          model produces a probability distribution, samples one word, appends
          it, and repeats. No learning happens. Your message does not change
          the weights — it just walks through them.
        </p>
      </div>
    </div>
  );
}

function ScaleLadder() {
  const rows = [
    { era: "2018 · BERT", params: "0.3B", flavor: "Embeddings, classification." },
    { era: "2020 · GPT-3", params: "175B", flavor: "First broad few-shot chat." },
    { era: "2023 · GPT-4 class", params: "~1T (mixture)", flavor: "Reliable coding, long context." },
    { era: "2025 · frontier", params: "multi-T", flavor: "Agentic tool use, reasoning." },
  ];
  return (
    <div className="glass rounded-2xl p-5 border border-[oklch(0.75_0.18_55_/_0.25)] my-4">
      <div className="flex items-center gap-2 mb-3">
        <Telescope size={14} className="text-[oklch(0.75_0.18_55)]" />
        <span className="text-xs font-bold uppercase tracking-wider text-[oklch(0.75_0.18_55)]">
          Seven years of scaling
        </span>
      </div>
      <div className="space-y-2">
        {rows.map(r => (
          <div
            key={r.era}
            className="flex items-start gap-3 p-3 rounded-lg bg-white/3 border border-white/5"
          >
            <div className="w-28 shrink-0">
              <div className="text-xs font-semibold text-foreground">{r.era}</div>
              <div className="text-[11px] text-[oklch(0.85_0.18_55)] font-mono">{r.params}</div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed flex-1">{r.flavor}</p>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground/70 mt-3 italic">
        Parameter counts are rough. The curve is what matters: roughly 10,000×
        more parameters in seven years, with data and compute scaling alongside.
      </p>
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

interface Lesson1Props {
  onComplete: () => void;
}

export default function Lesson1({ onComplete }: Lesson1Props) {
  const { metrics, recordAnswer } = useLessonMetrics();
  const [stage, setStage] = useState<
    | "opener"
    | "how-llms-learn"
    | "misconceptions"
    | "token-predictor"
    | "ladder"
    | "quiz"
    | "narrow-general"
    | "response"
    | "calibration"
    | "done"
  >("opener");

  const [quizIndex, setQuizIndex] = useState(0);
  const [understood, setUnderstood] = useState<Record<number, boolean>>({});
  const [responsePassed, setResponsePassed] = useState(false);

  const advance = (next: typeof stage) => () => setStage(next);

  const reachedOrPast = useMemo(() => {
    const order: typeof stage[] = [
      "opener",
      "how-llms-learn",
      "misconceptions",
      "token-predictor",
      "ladder",
      "quiz",
      "narrow-general",
      "response",
      "calibration",
      "done",
    ];
    return (s: typeof stage) => order.indexOf(stage) >= order.indexOf(s);
  }, [stage]);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Lesson banner */}
      <div className="glass rounded-2xl p-6 border border-[oklch(0.78_0.16_30_/_0.25)] relative overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={16} className="text-[oklch(0.78_0.16_30)]" />
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-[oklch(0.78_0.16_30)]">
            Lesson 1 of 5
          </span>
        </div>
        <h1 className="text-3xl font-semibold text-foreground tracking-tight mb-2">
          What Is AI? From Patterns to Predictions
        </h1>
        <AdaptiveProse
          topic="What this lesson covers"
          seed="AI is a fuzzy marketing word; this lesson builds a concrete mental model of what LLMs actually do."
        >
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
            "AI" is a fuzzy word used for everything from spam filters to chatbots
            to self-driving cars. By the end of this lesson, you will have a
            concrete mental model of what a large language model actually does at
            each step, how it learned to do that, and where the word "AI" stops
            being useful and starts being marketing.
          </p>
        </AdaptiveProse>
      </div>

      {/* 1. Productive-failure opener — NO retrieval warmup on lesson 1 */}
      {reachedOrPast("opener") && (
        <ProductiveFailureOpener
          title="Which of these are 'AI'?"
          description="Six everyday tools. Three buckets. Sort them first — don't look anything up. The pattern in your mistakes is the lesson."
          items={OPENER_ITEMS.map(({ id, text, bucket }) => ({ id, text, bucket }))}
          buckets={OPENER_BUCKETS}
          reveal={
            <div className="space-y-3">
              <p>
                <strong className="text-foreground">Beat 1 — "AI" is a marketing word.</strong>{" "}
                The word gets applied to everything, so it stopped meaning
                anything specific. A chess engine, a chatbot, a spam filter,
                and a face-tagger are all called "AI" — but they use almost
                nothing in common under the hood.
              </p>
              <p>
                <strong className="text-foreground">Beat 2 — The real axis is how the thing was built.</strong>{" "}
                GPS nav and spreadsheet SUM are hand-coded rules: a programmer
                wrote every branch. The spam filter and chess engine are
                narrow AI: they learned their behavior from data, but only for
                one task. ChatGPT and the image generator are general-purpose
                models: one system that can be pointed at many tasks through
                language.
              </p>
              <p>
                <strong className="text-foreground">Beat 3 — "Is it AI?" is the wrong question.</strong>{" "}
                A more useful question is <em>what is it optimizing, and what
                data did it learn from?</em> That tells you what it will be
                good at and where it will fail. We spend the rest of the
                lesson building that habit.
              </p>
            </div>
          }
          onComplete={advance("how-llms-learn")}
        />
      )}

      {/* 2. How LLMs actually learn — core exposition */}
      {reachedOrPast("how-llms-learn") && (
        <div className="glass rounded-2xl p-6 border border-white/8">
          <SectionHeading eyebrow="Core idea" title="How LLMs actually learn">
            A large language model is, underneath all the product polish, a
            very large function that turns text into probabilities over the
            next piece of text. Everything else is built on top of that one
            move.
          </SectionHeading>

          <AdaptiveProse
            topic="How LLMs learn from data"
            seed="LLMs are trained on trillions of tokens via next-token prediction, compressing world knowledge into billions of numerical parameters."
          >
            <div className="prose prose-invert prose-sm max-w-none text-muted-foreground leading-relaxed space-y-4">
              <p>
                The raw ingredient is text — a lot of it. A frontier model today
                is trained on something like ten to fifteen trillion tokens,
                where a token is roughly three-quarters of a word. That pile
                includes most of the public web that anyone would bother
                scraping: Wikipedia, books scanned into digital form, Stack
                Overflow, news archives, code repositories, forums, transcripts,
                and more. No single human could read even a thousandth of it in
                a lifetime. The model, crudely, reads all of it — many times.
              </p>

              <p>
                Inside the model is a network of interconnected numerical
                weights called <strong className="text-foreground">parameters</strong>.
                Think of each parameter as a dial on a massive mixing board.
                A small model might have a billion dials; a frontier model has
                hundreds of billions or more. At the start of training every
                dial is set to a random value and the network is useless — ask
                it the capital of France and it will produce gibberish.
              </p>

              <TrainVsInference />

              <p>
                Training is the slow process of nudging every dial toward
                settings that make the network better at one specific game:
                given a chunk of text with the last word hidden, predict that
                word. This is called <strong className="text-foreground">next-token prediction</strong>,
                and it is the single objective used to build the foundation
                model. Show the network "The capital of France is ___" and
                whatever it guesses, compare that to the real continuation
                ("Paris"), and use the error to push every dial a tiny bit in
                the direction that would have produced a better guess. This
                nudge is called <strong className="text-foreground">gradient descent</strong>.
                Run it trillions of times. The dials slowly settle into
                configurations where the network gets good at the game.
              </p>

              <p>
                The strange, beautiful result is that to get good at guessing
                the next word in almost any text, the network is forced to
                absorb an enormous amount of structure about the world. Grammar,
                of course — but also who the President of the United States was
                in 1992, how to balance a chemical equation, what Python syntax
                looks like, how a Shakespearean sonnet scans, what legal
                citations tend to look like, how doctors phrase a diagnosis.
                None of this is stored as a fact in a database the model can
                look up. It is compressed and smeared across the billions of
                parameters as patterns. When we say a model "knows" something,
                we mean the weights have been shaped so that the right tokens
                come out when the right prompt goes in.
              </p>

              <p>
                After the foundation training comes a second stage, usually
                called <strong className="text-foreground">post-training</strong>.
                The raw model can predict text, but it will happily continue
                any prompt — including a request like "tell me how to build a
                bomb." Post-training uses a much smaller but much more curated
                dataset of human preferences to shape the model's behavior:
                how to follow instructions, when to refuse, how to be helpful,
                how to stay on topic. Techniques like <strong className="text-foreground">
                RLHF</strong> (reinforcement learning from human feedback) and
                instruction tuning live in this stage. The base model is the
                raw brain; post-training is the training that turns it into an
                assistant you can actually talk to.
              </p>

              <p>
                When you chat with a model, none of this training is happening
                any more. That phase is called <strong className="text-foreground">inference</strong>,
                and the weights are frozen. Your prompt is chopped into tokens,
                the model runs forward once per token of its reply, produces a
                probability distribution over all possible next tokens, and
                samples one. That token becomes part of the context for the
                next step, and the loop repeats until the model decides to
                stop. There is no lookup into a knowledge base. There is no
                hidden reasoning monologue. There is no fact-checker. There is
                just a very large amount of math compressing patterns into
                next-token odds.
              </p>

              <p>
                One honest consequence: we can build these systems without
                fully understanding them. Nobody can point to a single
                parameter and say "this is where the model stores the boiling
                point of water." The knowledge is distributed across billions
                of dials that all fire together. The field trying to crack
                this open is called <strong className="text-foreground">interpretability</strong>,
                and it is making real progress — but for now, a modern LLM is
                largely a black box. We know how to train it. We are still
                learning how to explain what it does.
              </p>
            </div>
          </AdaptiveProse>

          <button
            onClick={advance("misconceptions")}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[oklch(0.78_0.16_30)] text-black text-sm font-semibold"
          >
            Next: three myths to unlearn
          </button>
        </div>
      )}

      {/* 3. Misconception cards */}
      {reachedOrPast("misconceptions") && (
        <div className="space-y-4">
          <SectionHeading
            eyebrow="Wrong models to uninstall"
            title="Three myths worth unlearning"
          >
            Each of these feels right for a reason. We will walk through the
            feeling, the mechanism underneath, and the more useful model to
            replace it with.
          </SectionHeading>

          <MisconceptionCard
            misconception="AI understands what it's saying the way I do."
            whyItFeelsTrue="The output is fluent, coherent, and often lands a joke or a metaphor. In a human, that kind of writing is strong evidence of understanding — nobody gets sarcasm right by accident. It feels rude to say the machine doesn't understand its own sentences when the sentences are so well-formed."
            mechanism="The model was trained to produce text that looks like what a thoughtful answer would look like. It has modeled the statistical shape of explanations, jokes, metaphors, and conclusions. What it has not modeled is the world those sentences are about. It does not have the visual memory of a cat to check against when it writes 'the cat sat on the mat.' It has the patterns of sentences about cats. Understanding in the human sense requires grounding — a link between the symbol and the thing. The model has symbols and their co-occurrence patterns, not the things themselves."
            nuancedTruth="A fluent answer is evidence the model has modeled the shape of answers, not evidence that it has modeled the world. Treat fluency as a style signal, not a correctness signal — and keep a separate question in mind: is this sentence about something real?"
            onMarkUnderstood={() => setUnderstood(u => ({ ...u, 0: true }))}
            understood={understood[0]}
          />

          <MisconceptionCard
            misconception="AI is one thing."
            whyItFeelsTrue="Every tech company slaps the word 'AI' on everything, so 'AI' starts to feel like one big brand — the same way 'cloud' once did. If a spam filter, a chess engine, a chatbot, and a self-driving car are all 'AI', it is natural to assume they share a core technology that just gets bigger and better each year."
            mechanism="These systems have almost nothing in common under the hood. A spam filter might be a simple classifier trained on a few million emails. A chess engine is a specialized search algorithm tuned with self-play. A chatbot is a transformer-based LLM trained on trillions of tokens. A self-driving car stitches together camera models, lidar fusion, and a planning system. Different architectures, different data, different training objectives, different failure modes. Lumping them together is like calling a microwave, a treadmill, and a jet engine 'machines' and expecting useful predictions from that."
            nuancedTruth="Whenever you hear 'AI', push one level deeper. What kind of system is it? What is it optimizing? What data did it learn from? Those three questions tell you far more than the word 'AI' ever will."
            onMarkUnderstood={() => setUnderstood(u => ({ ...u, 1: true }))}
            understood={understood[1]}
          />

          <MisconceptionCard
            misconception="Bigger models are always smarter."
            whyItFeelsTrue="The headline story of the last five years really has been scaling — bigger models, bigger datasets, bigger compute, bigger capabilities. 'Scaling laws' became a thing because they were genuinely predictive. So it feels reasonable to extrapolate: if 175 billion parameters beat 10 billion, then surely a trillion will smoke them both."
            mechanism="Scale helps on many axes, but it is not the only axis. Data quality matters — a smaller model trained on cleaner, better-targeted data often beats a bigger one trained on the open web. Post-training matters — a well-instruction-tuned medium model can feel sharper than a weakly tuned giant. Grounding and tool use matter — a small model that can search the web is often more accurate than a big one guessing from its weights. Cost and latency matter — a model that is too slow or too expensive to deploy is a model nobody uses. And benchmarks saturate: once a test is easy, bigger models stop pulling ahead on it."
            nuancedTruth="Size is one ingredient among several. On some tasks scale still dominates; on others, data curation, post-training, and grounding decide the winner. 'Bigger is smarter' is a shortcut that stopped being reliable around the time every lab noticed the same trick."
            onMarkUnderstood={() => setUnderstood(u => ({ ...u, 2: true }))}
            understood={understood[2]}
          />

          <button
            onClick={advance("token-predictor")}
            disabled={!(understood[0] && understood[1] && understood[2])}
            className="px-4 py-2 rounded-lg bg-[oklch(0.78_0.16_30)] text-black text-sm font-semibold disabled:opacity-40"
          >
            Mark all three understood, then continue
          </button>
        </div>
      )}

      {/* 4. Token predictor visualization + supporting exposition */}
      {reachedOrPast("token-predictor") && (
        <div className="glass rounded-2xl p-6 border border-white/8">
          <SectionHeading
            eyebrow="Inside one step"
            title="What 'predict the next token' actually looks like"
          >
            This is the single move an LLM makes, over and over, until it
            decides to stop. Watch one step in slow motion.
          </SectionHeading>

          <NextTokenPredictor />

          <AdaptiveProse
            topic="Tokens, probabilities, and temperature"
            seed="Next-token percentages express statistical likelihood from training data, not factual confidence, and temperature controls how much randomness is injected."
          >
            <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
              <p>
                A few things are worth noticing. First, the words above are
                spelled the way a human would spell them, but that is only
                because the example is nice. Under the hood, a token is not
                always a word. Common words like <em>the</em> are their own
                token. Rare words get split — "unbelievable" might become
                <em> un</em>, <em>believ</em>, <em>able</em>. Names, code,
                emojis, and non-English scripts often split differently. The
                model does not see letters; it sees token IDs, which are just
                integers pointing into its vocabulary of maybe 50,000 to
                200,000 possibilities.
              </p>
              <p>
                Second, the percentages are not confidence in <em>truth</em>.
                They are confidence in <em>what comes next in text of this
                shape</em>. "The cat sat on the ___" has a statistical answer
                because the sentence is a cliche. The model is not telling you
                "I am 41% sure a real cat exists and is currently on a real
                mat." It is telling you "41% of the training data's
                continuations of this exact phrase were the word 'mat'." That
                is a very different claim, and the slippage between them is
                where a lot of AI misuse lives.
              </p>
              <p>
                Third, the model almost never picks the top option every time.
                A setting called <strong className="text-foreground">temperature</strong>{" "}
                controls how much randomness is injected into the sampling.
                At temperature zero, the model always picks the highest-probability
                token and two runs of the same prompt produce identical output.
                At a more typical temperature (around 0.7), the model samples
                from the distribution, so less-likely words sometimes win.
                That is why the same prompt gives different answers on Monday
                and Tuesday — not a glitch, but a deliberate dial the product
                team tuned to make replies feel creative instead of robotic.
              </p>
            </div>
          </AdaptiveProse>

          <button
            onClick={advance("ladder")}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[oklch(0.65_0.22_200)] text-black text-sm font-semibold"
          >
            Try applying this to a real product claim
          </button>
        </div>
      )}

      {/* 5. Worked / faded / independent */}
      {reachedOrPast("ladder") && (
        <WorkedFadedIndependent
          title="Given a product claim, figure out what kind of AI it uses and where it will fail"
          rungs={[
            {
              label: "Worked example",
              body: (
                <div className="space-y-3">
                  <p>
                    <strong className="text-foreground">The claim:</strong>{" "}
                    "Our photo app automatically tags your friends in every
                    picture you upload."
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-xs">
                    <li>
                      <strong className="text-foreground">What kind of AI?</strong>{" "}
                      This is narrow AI — a face-recognition model. One task,
                      one optimization target: given a face crop, is this the
                      same person as one of your tagged friends?
                    </li>
                    <li>
                      <strong className="text-foreground">What is it optimizing?</strong>{" "}
                      Accuracy on "is face A the same identity as face B?" on
                      whatever dataset the team trained it on. Likely public
                      face datasets plus in-house photo collections.
                    </li>
                    <li>
                      <strong className="text-foreground">Where will it fail?</strong>{" "}
                      Low light, heavy occlusion (sunglasses, masks), extreme
                      angles, children (faces change fast), and — notoriously —
                      on demographic groups underrepresented in the training
                      data. There is a long research record of higher error
                      rates for darker skin tones and for women in older
                      face-tagging systems.
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
                    "Our customer-service chatbot knows everything about our
                    company and can answer any question."
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-xs">
                    <li>
                      <strong className="text-foreground">What kind of AI?</strong>{" "}
                      Almost certainly a general-purpose LLM wrapped with
                      some retrieval over the company's help-center
                      documents. Not a purpose-built model.
                    </li>
                    <li>
                      <strong className="text-foreground">What is it optimizing?</strong>{" "}
                      <em>Your turn:</em> name the actual objective. Hint —
                      it is not "be correct about the company's policies." It
                      is closer to "produce a reply that sounds like a helpful
                      support agent."
                    </li>
                    <li>
                      <strong className="text-foreground">Where will it fail?</strong>{" "}
                      Anything the retrieval layer does not surface — new
                      policies, edge-case refunds, anything not written down
                      clearly. It will still <em>answer</em>, because that is
                      what LLMs do. The answer will sound authoritative
                      whether or not it is correct.
                    </li>
                  </ol>
                  <p className="text-[11px] italic text-muted-foreground/70">
                    Fill in step 2 in your head before advancing.
                  </p>
                </div>
              ),
            },
            {
              label: "Your turn",
              body: (
                <div className="space-y-3">
                  <p>
                    <strong className="text-foreground">The claim:</strong>{" "}
                    "Our AI lawyer drafts your entire contract in minutes —
                    just describe your deal in plain English."
                  </p>
                  <p className="text-xs">
                    In your notebook or head, answer the three questions for
                    this product before you click anything to buy it. What
                    kind of AI is almost certainly underneath this? What is
                    it actually optimizing (hint: it is not "legal
                    correctness")? Name three specific ways it will fail that
                    a real junior lawyer would not. The habit — ask those
                    three questions every time someone says "our AI does X" —
                    is the whole point of this lesson.
                  </p>
                  <p className="text-[11px] italic text-muted-foreground/70">
                    There is no auto-grader for this rung. The reflection
                    section later in the lesson will ask you to write one up.
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

      {/* 6. Confidence quiz */}
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
                setStage("narrow-general");
              }
            }}
          />
        </motion.div>
      )}

      {/* 7. Narrow vs general exposition */}
      {reachedOrPast("narrow-general") && (
        <div className="glass rounded-2xl p-6 border border-white/8">
          <SectionHeading
            eyebrow="A useful frame"
            title="Narrow vs general"
          >
            Every conversation about AI eventually hits this distinction, and
            most of the confusion in the news comes from blurring it. Here is
            the cleanest version.
          </SectionHeading>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div className="glass rounded-xl p-4 border border-[oklch(0.72_0.18_150_/_0.25)]">
              <div className="flex items-center gap-2 mb-2">
                <Target size={14} className="text-[oklch(0.72_0.18_150)]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[oklch(0.72_0.18_150)]">
                  Narrow AI
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Built and trained for one task. Superhuman inside the task,
                helpless outside it. A chess engine, a translation model, a
                fraud detector, a face tagger.
              </p>
            </div>
            <div className="glass rounded-xl p-4 border border-[oklch(0.78_0.16_30_/_0.25)]">
              <div className="flex items-center gap-2 mb-2">
                <Network size={14} className="text-[oklch(0.78_0.16_30)]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[oklch(0.78_0.16_30)]">
                  General-ish (LLMs)
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                One model, many tasks, all routed through language. Good at a
                wide band of tasks. Rarely the best at any one task against a
                dedicated narrow system.
              </p>
            </div>
          </div>

          <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
            <p>
              The oldest AI systems are narrow. A chess engine like Stockfish
              will beat any human on Earth, but it cannot play Go, cannot
              describe a photograph, and cannot tell you what year it is. It
              was optimized — from its search heuristics to its evaluation
              function — for exactly one game. That narrowness is a feature,
              not a bug. It is what lets the system be superhuman on the
              task: every bit of capacity goes into the one thing it was
              built to do.
            </p>
            <p>
              Modern LLMs are different. One set of weights can write code,
              draft an email, translate between languages, summarize a
              document, plan a trip, and explain your tax situation — all by
              being pointed at different prompts. That breadth is genuinely
              new in AI history, and it is the reason LLMs feel magical.
              But it comes at a cost: the same model that beats most humans
              at everyday writing will still lose to a dedicated code model
              at competitive programming, to a dedicated protein model at
              protein folding, and to a dedicated medical model at triage.
              Breadth trades off against peak depth.
            </p>
            <p>
              A careful phrasing many researchers use is that today's
              frontier systems are <strong className="text-foreground">generalist
              but narrow at expert-level tasks</strong>. They can attempt
              anything you describe in words. They are reliably expert at
              almost nothing. Lawyers still beat LLM-generated contracts on
              edge cases. Senior engineers still beat LLM-written code on
              unfamiliar codebases. The useful framing is not "is this AGI
              yet?" but "what is this system optimized for, and where is its
              skill profile strongest?"
            </p>
            <p>
              That word — <strong className="text-foreground">optimized</strong> —
              is the piece to hang on to. Every AI system was built by
              choosing an objective function, the mathematical quantity the
              training process pushes up. A chess engine optimizes for
              winning games. A spam filter optimizes for correctly labeling
              spam while rarely catching good email. A base LLM optimizes for
              predicting the next token. A post-trained chatbot optimizes for
              a blend of "humans preferred this reply" and "this reply
              follows the system's rules." Whatever you optimize is what
              you get — and critically, what you do <em>not</em> optimize is
              often what you lose. That is why LLMs, optimized for pleasing
              text, produce pleasing text whether or not it is true. The
              objective did not say "and also be right."
            </p>
            <p>
              <strong className="text-foreground">Artificial General Intelligence</strong>, or AGI,
              is a hypothetical system that would match or exceed humans
              across essentially all cognitive work. Nothing we have today
              qualifies. There is loud debate about how close we are; we are
              skipping it here because it distracts from the more useful
              question. The systems you will use this year are not AGI.
              Treating them like AGI — like a coworker who knows everything
              — is the source of most bad outcomes with AI. Treating them
              like a skilled but unreliable generalist assistant, whose
              claims you verify, is where the leverage is.
            </p>
          </div>

          <ScaleLadder />

          <button
            onClick={advance("response")}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[oklch(0.75_0.18_55)] text-black text-sm font-semibold"
          >
            Continue to reflection
          </button>
        </div>
      )}

      {/* 8. LLM-graded open response */}
      {reachedOrPast("response") && (
        <LLMGradedResponse
          title="Reflection: audit an AI product you actually use"
          prompt="Pick any AI-powered product you use at least weekly — a chatbot, an autocomplete, a smart speaker, a recommender, a photo app, anything. In your own words, describe: (1) the specific product, (2) what it is likely optimizing for, (3) what its training data probably looks like, and (4) at least one concrete situation where it would fail."
          minimumCriteria={3}
          rubric={[
            {
              criterion:
                "Names a specific product, app, or tool (not just 'AI' or 'ChatGPT-like things').",
              pattern: (text: string) =>
                /\b(chatgpt|claude|gemini|copilot|gmail|spotify|netflix|tiktok|youtube|instagram|alexa|siri|photos|waze|maps|tesla|autopilot|duolingo|grammarly|notion|midjourney|dall[- ]?e|stable[- ]?diffusion|perplexity)\b/i.test(
                  text,
                ) || /my\s+(phone|email|music|feed|photo|car|watch|bank|app)/i.test(text),
              hint: "Name the product by name, e.g. 'Gmail's spam filter' or 'Spotify's Discover Weekly'.",
            },
            {
              criterion:
                "States the objective the product is optimizing for (what it gets rewarded for).",
              pattern:
                /\b(optimi[sz]|reward|goal|trained (?:to|for)|maximi[sz]|objective|predict|classif|rank|engagement|accuracy|retention|click|watch ?time|relevance)\b/i,
              hint: "Say what the system gets 'rewarded' for — clicks? watch time? correct translations? predicted next word?",
            },
            {
              criterion:
                "Describes the likely training data (what it learned from).",
              pattern:
                /\b(train(?:ing|ed)?|data|dataset|example|email|photo|listen|watch|history|corpus|document|user|log|click|interaction|text)\b/i,
              hint: "What examples did the system learn from? Your past clicks? Millions of labeled photos? A pile of text?",
            },
            {
              criterion:
                "Names at least one concrete failure mode or edge case.",
              pattern:
                /\b(fail|wrong|mistake|hallucin|miss|confus|bias|edge|rare|unusual|new|unknown|accent|dialect|low.?light|spam|false|inaccur|misclass)\b/i,
              hint: "Be specific: 'fails on accents', 'gets confused by sarcasm', 'recommends things you've already seen'.",
            },
          ]}
          onComplete={passed => {
            setResponsePassed(passed);
            setStage("calibration");
          }}
        />
      )}

      {/* 9. Calibration chart */}
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

      {/* 10. Key takeaways + complete */}
      {reachedOrPast("done") && (
        <div className="glass rounded-2xl p-6 border border-[oklch(0.72_0.18_150_/_0.3)]">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={16} className="text-[oklch(0.72_0.18_150)]" />
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[oklch(0.72_0.18_150)]">
              Lesson 1 · Key takeaways
            </span>
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-4">
            What to carry with you
          </h3>
          <ul className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <li className="flex gap-3">
              <span className="text-[oklch(0.72_0.18_150)] font-bold shrink-0">01</span>
              <span>
                An LLM is a next-token predictor. Every reply is a loop of
                "score all possible next tokens, sample one, repeat". There
                is no database lookup, no reasoning monologue, no fact-checker.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-[oklch(0.72_0.18_150)] font-bold shrink-0">02</span>
              <span>
                Knowledge lives in the weights — billions of tuned parameters,
                not a searchable table of facts. That is why the model can be
                confidently wrong and why interpretability is still hard.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-[oklch(0.72_0.18_150)] font-bold shrink-0">03</span>
              <span>
                "AI" is a fuzzy marketing word. The useful questions are
                <em> what kind of system is this, what is it optimizing,</em>
                and <em>what data did it learn from?</em> Those three tell
                you where it will work and where it will break.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-[oklch(0.72_0.18_150)] font-bold shrink-0">04</span>
              <span>
                Narrow AI is superhuman at one task and helpless outside it.
                Today's LLMs are generalist-but-narrow-at-expert-tasks — broad
                competence, rarely peak depth. AGI is not what you are using
                today.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-[oklch(0.72_0.18_150)] font-bold shrink-0">05</span>
              <span>
                You get what you optimize. A model trained to produce
                pleasing text produces pleasing text — whether or not it is
                true. That is the bridge to Lesson 2.
              </span>
            </li>
          </ul>

          <button
            onClick={onComplete}
            className="mt-6 w-full px-5 py-3 rounded-xl bg-[oklch(0.72_0.18_150)] text-black text-sm font-bold hover:opacity-90 transition-opacity"
          >
            Complete Lesson 1
            {responsePassed && " — reflection passed"}
          </button>

          <div className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground/70">
            <Compass size={12} />
            <span>
              Up next, Lesson 2: why these systems hallucinate, and the TRACE
              habit for verifying what they say.
            </span>
          </div>
        </div>
      )}

    </div>
  );
}
