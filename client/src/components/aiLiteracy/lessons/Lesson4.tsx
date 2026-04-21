/**
 * Lesson 4 — Ethics, Governance & Society
 *
 * Topic: algorithmic bias mechanisms, synthetic media / deepfakes, labor and
 * environmental costs, the EU AI Act risk tiers, and civic responsibility.
 * Pedagogy follows the primitives contract in ../primitives and the audit
 * standard in AI_LITERACY_AUDIT_AND_ARCHITECTURE.md §1.1 (civic literacy) and
 * AI_LITERACY_DESIGN_DOCUMENT.md §1.4.
 */

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertOctagon,
  CheckCircle2,
  Database,
  Eye,
  Gavel,
  Globe2,
  Image as ImageIcon,
  Layers,
  Leaf,
  Scale,
  ShieldAlert,
  Sparkles,
  Users,
  Video,
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

// ─── Data: productive-failure opener ─────────────────────────────────────────

const OPENER_ITEMS = [
  {
    id: "social-scoring",
    text: "A government-run system that scores every citizen on 'trustworthiness' and restricts travel for low scorers.",
    bucket: "unacceptable",
  },
  {
    id: "cv-screening",
    text: "An AI that ranks job applicants' CVs to decide who gets an interview.",
    bucket: "high",
  },
  {
    id: "product-chatbot",
    text: "A chatbot on a furniture store's website that answers questions about couches.",
    bucket: "limited",
  },
  {
    id: "spam-filter",
    text: "An email spam filter that sorts promotional mail out of your inbox.",
    bucket: "minimal",
  },
  {
    id: "public-biometric",
    text: "Real-time facial recognition cameras scanning every person walking through a public square.",
    bucket: "unacceptable",
  },
  {
    id: "exam-grading",
    text: "An AI that scores student exams and decides who passes a course.",
    bucket: "high",
  },
] as const;

const OPENER_BUCKETS = [
  { id: "unacceptable", label: "Unacceptable (banned)", color: "oklch(0.72 0.2 290)" },
  { id: "high", label: "High-Risk (regulated)", color: "oklch(0.78 0.16 30)" },
  { id: "limited", label: "Limited-Risk (transparency)", color: "oklch(0.75 0.18 55)" },
  { id: "minimal", label: "Minimal-Risk (free)", color: "oklch(0.72 0.18 150)" },
];

// ─── Data: confidence quiz ───────────────────────────────────────────────────

const QUIZ_ITEMS: ConfidenceQuizData[] = [
  {
    question:
      "A company builds an AI resume screener by training it on ten years of past hiring decisions. The workforce was 85% male. Where does the biggest bias risk come from?",
    options: [
      {
        text: "The algorithm itself is biased by design.",
        misconceptionId: "algorithm-is-evil",
      },
      {
        text: "The training data encodes past hiring patterns, so the model learns to reproduce them.",
      },
      {
        text: "The model is too small to represent women fairly.",
        misconceptionId: "model-size-fixes-bias",
      },
      {
        text: "Once you balance the gender mix in the training set, the model is fair.",
        misconceptionId: "balanced-data-equals-fair",
      },
    ],
    correct: 1,
    explanation:
      "Historical data carries historical patterns. If the past was biased, a model trained to predict 'who we hired' will learn 'who we used to hire'. Amazon famously scrapped a resume tool that penalized the word 'women's' (as in 'women's chess club') because that pattern appeared in rejected applications.",
    elaborationPrompt:
      "In one sentence, how does a 'neutral' algorithm end up producing biased output?",
  },
  {
    question:
      "You see a short video of a CEO announcing a surprise merger. It looks real. What is the most reliable way to tell if it's a deepfake?",
    options: [
      {
        text: "Zoom in and look for visual glitches around the mouth and eyes.",
        misconceptionId: "pixel-inspection",
      },
      {
        text: "Check whether reputable news outlets and the company's own verified channels are reporting the same announcement.",
      },
      {
        text: "Run the clip through a free online deepfake detector.",
        misconceptionId: "detector-is-truth",
      },
      {
        text: "Trust it if the audio sounds natural and the lip-sync is clean.",
        misconceptionId: "pixel-inspection",
      },
    ],
    correct: 1,
    explanation:
      "Detection tools lag behind generation tools — the best fakes already fool them. Your strongest defense is provenance: where did this file come from, and does anyone with a reputation to lose corroborate it? Source verification beats pixel inspection.",
    elaborationPrompt:
      "Why does 'check the source' scale better than 'inspect the pixels'?",
  },
  {
    question:
      "Under the EU AI Act, real-time remote biometric identification in public spaces is:",
    options: [
      {
        text: "Minimal risk — it's just a camera with software.",
        misconceptionId: "tier-by-capability",
      },
      {
        text: "Limited risk — users just need to be told a camera is there.",
      },
      {
        text: "Largely prohibited as 'unacceptable risk', with narrow law-enforcement exceptions.",
      },
      {
        text: "High risk — allowed with a conformity assessment.",
        misconceptionId: "high-risk-covers-all",
      },
    ],
    correct: 2,
    explanation:
      "The Act treats real-time public-space biometric ID as an unacceptable risk by default. Limited exceptions exist (e.g. targeted search for a missing child or an imminent terrorist threat) under strict authorization. It is not lumped in with general 'high-risk' AI.",
    elaborationPrompt:
      "What value is the EU protecting by pushing this into the banned tier?",
  },
  {
    question:
      "Where does most of an AI system's lifetime environmental cost usually come from?",
    options: [
      {
        text: "The one-time training run.",
        misconceptionId: "training-dominates",
      },
      {
        text: "Inference — the billions of queries users send after launch.",
      },
      {
        text: "The cost of printing user manuals.",
      },
      {
        text: "Shipping GPUs across the world.",
      },
    ],
    correct: 1,
    explanation:
      "Training is famously expensive — GPT-scale runs burn millions of dollars of electricity — but it happens once. Inference happens billions of times, every day, for years. Over a model's lifetime the serving cost typically dwarfs the training cost, which is why efficient inference and smaller specialized models matter for the climate footprint.",
    elaborationPrompt:
      "Why does a one-shot giant expense end up smaller than a tiny-per-call but constant expense?",
  },
];

// ─── Small visual helpers ────────────────────────────────────────────────────

function BiasFunnel() {
  const stages = [
    {
      label: "Training data",
      icon: Database,
      note: "Historical records carry historical patterns — whose resumes got hired, whose loans got approved, whose faces got photographed most.",
      color: "oklch(0.65 0.22 200)",
    },
    {
      label: "Labeling",
      icon: Users,
      note: "Human annotators decide what counts as 'toxic', 'attractive', 'professional'. Their demographics and judgments enter the model as ground truth.",
      color: "oklch(0.75 0.18 55)",
    },
    {
      label: "Model training",
      icon: Layers,
      note: "The model minimizes average error. Small subgroups can be wrong most of the time and still barely move the average — so the model learns to be wrong about them.",
      color: "oklch(0.78 0.16 30)",
    },
    {
      label: "Deployment",
      icon: Globe2,
      note: "A model trained on one population gets used on another. A U.S. hospital dataset powers triage in a clinic with a very different patient mix.",
      color: "oklch(0.72 0.2 290)",
    },
    {
      label: "Feedback loop",
      icon: ShieldAlert,
      note: "Biased outputs shape the next round of data. Over-policed neighborhoods get more arrests → more 'crime data' → more policing. The bias compounds.",
      color: "oklch(0.72 0.18 150)",
    },
  ];
  return (
    <div className="glass rounded-2xl p-5 border border-white/10 my-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertOctagon size={14} className="text-[oklch(0.78_0.16_30)]" />
        <span className="text-xs font-bold uppercase tracking-wider text-[oklch(0.78_0.16_30)]">
          The bias funnel · every stage adds distortion
        </span>
      </div>
      <div className="space-y-2">
        {stages.map((s, i) => {
          const Icon = s.icon;
          const width = 100 - i * 12;
          return (
            <div key={s.label} className="flex items-center gap-3">
              <div
                className="rounded-lg px-3 py-2 flex items-center gap-2 shrink-0 border"
                style={{
                  width: `${width}%`,
                  background: `color-mix(in oklab, ${s.color} 12%, transparent)`,
                  borderColor: `color-mix(in oklab, ${s.color} 35%, transparent)`,
                }}
              >
                <Icon size={14} style={{ color: s.color }} />
                <span
                  className="text-xs font-semibold"
                  style={{ color: s.color }}
                >
                  {s.label}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-snug flex-1">
                {s.note}
              </p>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground/70 mt-3 italic">
        Each stage is a filter. Debias one and the others still leak.
      </p>
    </div>
  );
}

function RiskTierTable() {
  const tiers = [
    {
      name: "Unacceptable",
      color: "oklch(0.72 0.2 290)",
      rule: "Banned outright",
      examples:
        "Social scoring by governments. Real-time public biometric ID. Manipulative systems that exploit children or vulnerable groups.",
    },
    {
      name: "High",
      color: "oklch(0.78 0.16 30)",
      rule: "Allowed with conformity assessment, logging, human oversight, data governance.",
      examples:
        "Hiring, credit scoring, essential public services, education assessment, medical devices, critical infrastructure.",
    },
    {
      name: "Limited",
      color: "oklch(0.75 0.18 55)",
      rule: "Transparency: users must know they are interacting with AI or seeing AI-generated media.",
      examples:
        "Customer-service chatbots, emotion recognition, deepfakes and synthetic media.",
    },
    {
      name: "Minimal",
      color: "oklch(0.72 0.18 150)",
      rule: "No additional obligations beyond existing law.",
      examples:
        "Spam filters, AI in video games, inventory prediction in retail.",
    },
  ];
  return (
    <div className="glass rounded-xl p-4 border border-white/10 my-4">
      <div className="flex items-center gap-2 mb-3">
        <Gavel size={14} className="text-[oklch(0.65_0.22_200)]" />
        <span className="text-xs font-bold uppercase tracking-wider text-[oklch(0.65_0.22_200)]">
          EU AI Act · risk tiers
        </span>
      </div>
      <div className="space-y-2">
        {tiers.map(t => (
          <div
            key={t.name}
            className="rounded-lg p-3 border"
            style={{
              background: `color-mix(in oklab, ${t.color} 8%, transparent)`,
              borderColor: `color-mix(in oklab, ${t.color} 30%, transparent)`,
            }}
          >
            <div className="flex items-center justify-between mb-1">
              <span
                className="text-sm font-semibold"
                style={{ color: t.color }}
              >
                {t.name}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {t.rule}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {t.examples}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Deepfake detection habit interactive ────────────────────────────────────

interface DeepfakeScenario {
  id: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  description: string;
  best: "verify";
  feedback: Record<"trust" | "verify" | "dismiss", string>;
}

const DEEPFAKE_SCENARIOS: DeepfakeScenario[] = [
  {
    id: "political-audio",
    icon: Video,
    label: "A political audio clip",
    description:
      "A 20-second audio clip appears on social media. A senator you don't like seems to admit to tax fraud. You saw it reposted by a stranger with no source link.",
    best: "verify",
    feedback: {
      trust:
        "Premature. Voice cloning is cheap and good. Reposters rarely link sources. Always look upstream before sharing an incriminating clip.",
      verify:
        "Right. Check the senator's verified channels, major news wires, and the original poster's account history. No corroboration in 24 hours is a strong signal it's synthetic.",
      dismiss:
        "Closer to safe, but 'dismiss' skips the habit. Say 'unverified' — not 'fake' — until you check.",
    },
  },
  {
    id: "ceo-merger",
    icon: Users,
    label: "A CEO announcing a merger",
    description:
      "A polished 45-second video of a Fortune-500 CEO announces an acquisition. A friend sent it to you before market open, asking if they should buy the stock.",
    best: "verify",
    feedback: {
      trust:
        "Very dangerous — this is exactly the scam pattern of recent voice/video-cloning fraud. Never act on a financial 'announcement' without the company's press room.",
      verify:
        "Correct. Major corporate news is always on the company's investor-relations page and the wire services within minutes. If it isn't there, treat the clip as fake until proven otherwise.",
      dismiss:
        "You may be right, but tell your friend why. 'Dismiss without checking' is a habit that also dismisses real news.",
    },
  },
  {
    id: "celebrity-photo",
    icon: ImageIcon,
    label: "A celebrity-at-an-event photo",
    description:
      "A photo shows a celebrity attending a controversial private gathering. A parody-news account posted it with a sensational caption.",
    best: "verify",
    feedback: {
      trust:
        "Photos are the cheapest synthetic medium right now. Parody accounts also post things as jokes that get screenshotted without context. Don't trust on first sight.",
      verify:
        "Yes. A reverse image search plus a check of the celebrity's verified channels usually settles it in under a minute.",
      dismiss:
        "Reasonable, but 'dismiss' is a shortcut. The discipline is to name *why* — 'no corroboration, single source' — so the habit transfers.",
    },
  },
  {
    id: "ai-news-image",
    icon: Eye,
    label: "A news article with an AI-generated image",
    description:
      "A breaking-news story about a fire carries a dramatic photo. The image has the slightly-too-smooth look of a generated composite. The story is on a news site you've never heard of.",
    best: "verify",
    feedback: {
      trust:
        "Pixel cues are unreliable — modern generators pass casual inspection. The unknown-publisher clue is the bigger red flag, and it alone warrants checking.",
      verify:
        "Right. Look for the same story on wire services (Reuters, AP, AFP). A real fire will be covered by many outlets with different photos.",
      dismiss:
        "Directionally safe, but articulate the reason: 'unknown publisher, no corroboration'. That's the habit, not the vibes.",
    },
  },
];

function DeepfakeHabit({ onDone }: { onDone: () => void }) {
  const [idx, setIdx] = useState(0);
  const [choices, setChoices] = useState<Record<string, "trust" | "verify" | "dismiss">>({});
  const current = DEEPFAKE_SCENARIOS[idx];
  const picked = choices[current.id];

  const options: Array<{ key: "trust" | "verify" | "dismiss"; label: string }> = [
    { key: "trust", label: "Trust and share" },
    { key: "verify", label: "Verify the source" },
    { key: "dismiss", label: "Dismiss outright" },
  ];

  return (
    <div className="glass rounded-2xl p-6 border border-[oklch(0.72_0.2_290_/_0.25)]">
      <div className="flex items-center gap-2 mb-1">
        <Eye size={14} className="text-[oklch(0.72_0.2_290)]" />
        <span className="text-xs font-bold uppercase tracking-wider text-[oklch(0.72_0.2_290)]">
          Deepfake Detection Habit · {idx + 1} / {DEEPFAKE_SCENARIOS.length}
        </span>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">
        {current.label}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        {current.description}
      </p>

      <div className="space-y-2 mb-3">
        {options.map(o => {
          const isPicked = picked === o.key;
          const isBest = current.best === o.key;
          return (
            <button
              key={o.key}
              disabled={!!picked}
              onClick={() =>
                setChoices(c => ({ ...c, [current.id]: o.key }))
              }
              className={`w-full text-left px-4 py-3 rounded-xl text-sm border transition-all ${
                picked
                  ? isPicked
                    ? isBest
                      ? "bg-[oklch(0.72_0.18_150_/_0.15)] border-[oklch(0.72_0.18_150_/_0.45)] text-foreground"
                      : "bg-[oklch(0.72_0.2_290_/_0.12)] border-[oklch(0.72_0.2_290_/_0.35)] text-muted-foreground"
                    : isBest
                    ? "glass border-[oklch(0.72_0.18_150_/_0.25)] text-muted-foreground"
                    : "glass border-white/5 text-muted-foreground opacity-50"
                  : "glass border-white/10 text-foreground hover:border-white/25"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {picked && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-3 p-3 rounded-xl bg-[oklch(0.72_0.2_290_/_0.06)] border border-[oklch(0.72_0.2_290_/_0.2)]"
          >
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Why:</strong>{" "}
              {current.feedback[picked]}
            </p>
            <div className="mt-3 flex justify-end">
              {idx + 1 < DEEPFAKE_SCENARIOS.length ? (
                <button
                  onClick={() => setIdx(i => i + 1)}
                  className="px-3 py-1.5 rounded-lg bg-[oklch(0.72_0.2_290)] text-black text-xs font-semibold"
                >
                  Next scenario
                </button>
              ) : (
                <button
                  onClick={onDone}
                  className="px-3 py-1.5 rounded-lg bg-[oklch(0.72_0.18_150)] text-black text-xs font-semibold"
                >
                  Lock in the habit
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="text-[11px] text-muted-foreground/70 mt-4 italic leading-relaxed">
        The habit the scenarios teach: check <strong>provenance and corroboration</strong>,
        not pixels. Ask <em>where did this come from</em> and <em>who else is
        reporting it</em> before you ask <em>does it look real</em>.
      </p>
    </div>
  );
}

// ─── Section heading helper ──────────────────────────────────────────────────

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
        <p className="text-sm text-muted-foreground leading-relaxed">
          {children}
        </p>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

interface Lesson4Props {
  onComplete: () => void;
}

export default function Lesson4({ onComplete }: Lesson4Props) {
  const { metrics, recordAnswer } = useLessonMetrics();
  const [stage, setStage] = useState<
    | "warmup"
    | "opener"
    | "bias"
    | "misconceptions"
    | "deepfake"
    | "span"
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
      "warmup",
      "opener",
      "bias",
      "misconceptions",
      "deepfake",
      "span",
      "ladder",
      "quiz",
      "response",
      "calibration",
      "done",
    ];
    return (s: typeof stage) => order.indexOf(stage) >= order.indexOf(s);
  }, [stage]);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Lesson banner */}
      <div className="glass rounded-2xl p-6 border border-[oklch(0.72_0.2_290_/_0.25)] relative overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <Scale size={16} className="text-[oklch(0.72_0.2_290)]" />
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-[oklch(0.72_0.2_290)]">
            Lesson 4 of 5
          </span>
        </div>
        <h1 className="text-3xl font-semibold text-foreground tracking-tight mb-2">
          Ethics, Governance & Society
        </h1>
        <AdaptiveProse topic="Ethics, Governance & Society lesson overview" seed="AI systems already decide who gets a loan, whose resume is read, and whose face is scanned on the sidewalk.">
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
            AI systems already decide who gets a loan, whose resume is read, and
            whose face is scanned on the sidewalk. This lesson covers how bias
            gets in, how synthetic media works, what the EU AI Act actually
            regulates, and what civic responsibility looks like when you're the
            user, the worker, or the voter on the receiving end.
          </p>
        </AdaptiveProse>
      </div>

      {/* 1. Retrieval warmup (from Lesson 3) */}
      {reachedOrPast("warmup") && (
        <RetrievalWarmup
          fromLesson="Lesson 3 — Prompting with RACE-F"
          questions={[
            {
              prompt:
                "What do the letters in RACE-F stand for, and which one is the most commonly skipped in practice?",
              correctAnswer:
                "Role, Audience, Context, Example, Format. 'Example' is most often skipped — people describe what they want instead of showing one, which leaves the model guessing.",
              hint: "Five letters. One is about showing, not telling…",
            },
            {
              prompt:
                "Name one situation where you should NOT use AI, even when it could technically do the task.",
              correctAnswer:
                "e.g. decisions with legal or medical stakes you'd need to own, original creative work that is about your own voice, or anything that needs verified privacy — anywhere accuracy, accountability, or confidentiality matters more than speed.",
              hint: "Think about stakes, accountability, or your own voice.",
            },
          ]}
          onComplete={advance("opener")}
        />
      )}

      {/* 2. Productive-failure opener */}
      {reachedOrPast("opener") && (
        <ProductiveFailureOpener
          title="Sort these AI uses into EU AI Act risk tiers"
          description="Six real-world AI applications, four tiers. Guess now — don't look up the Act first. The wrong ones will teach you how the law actually thinks."
          items={OPENER_ITEMS.map(({ id, text, bucket }) => ({
            id,
            text,
            bucket,
          }))}
          buckets={OPENER_BUCKETS}
          reveal={
            <div className="space-y-3">
              <p>
                <strong className="text-foreground">
                  Beat 1 — The tier tracks harm, not tech.
                </strong>{" "}
                A spam filter and a face-scanning camera use the same kind of
                model under the hood. One is minimal risk; the other is
                banned. The Act cares about <em>what could go wrong for a
                person</em>, not how clever the algorithm is.
              </p>
              <p>
                <strong className="text-foreground">
                  Beat 2 — "High-risk" is not a compliment.
                </strong>{" "}
                CV screeners and exam graders are high-risk because they
                gate-keep access to jobs and education. They aren't banned,
                but they come with real duties: documented data, human
                oversight, appeal paths, and a conformity assessment before
                launch.
              </p>
              <p>
                <strong className="text-foreground">
                  Beat 3 — Some uses are simply off-limits.
                </strong>{" "}
                Social scoring and real-time public biometric ID are
                'unacceptable risk' — prohibited regardless of accuracy.
                That's a values judgment, not an engineering one. A perfect
                social-score AI would still be illegal, because the point is
                what it would do to a free society.
              </p>
            </div>
          }
          onComplete={advance("bias")}
        />
      )}

      {/* 3. Core exposition — How bias gets in */}
      {reachedOrPast("bias") && (
        <div className="glass rounded-2xl p-6 border border-white/8">
          <SectionHeading eyebrow="Core idea" title="How bias gets in">
            "Biased AI" sounds like the machine decided to be unfair. It
            rarely does. Bias enters through a chain of ordinary engineering
            choices — each one reasonable on its own, each one leaking
            distortion into the final system.
          </SectionHeading>

          <div className="prose prose-invert prose-sm max-w-none text-muted-foreground leading-relaxed space-y-4">
            <AdaptiveProse topic="Training data as a source of algorithmic bias" seed="A model trained on past hiring decisions learns to reproduce the patterns of the past, including its biases.">
              <p>
                The first leak is the <strong className="text-foreground">
                training data</strong>. A model learns patterns from the records
                it is shown. If those records are a picture of the past, the
                model learns the past. Amazon built an experimental resume
                screener trained on a decade of its own hiring decisions. The
                model learned that resumes mentioning "women's chess club" or
                graduates of certain all-women's colleges had historically been
                rejected more often. It then reproduced that penalty on new
                applicants. Nobody coded "penalize women". The system just
                predicted what its own past behavior had been — which is what
                it was asked to do.
              </p>
            </AdaptiveProse>

            <AdaptiveProse topic="Human labeling as a source of algorithmic bias" seed="Annotators bring their own demographics and blind spots to labeling decisions, which become the ground truth the model chases.">
              <p>
                The second leak is <strong className="text-foreground">
                labeling</strong>. Most modern AI learns from examples humans
                have labeled: this image is "professional", that comment is
                "toxic", this face is "attractive". Annotators bring their own
                demographics, cultural backgrounds, and blind spots to those
                judgments. When a toxicity classifier is trained mostly on
                labels from one linguistic community, slang and dialect from
                other communities get flagged more often — not because the
                language is actually harmful, but because it looked unfamiliar
                to the labelers. The label <em>is</em> the ground truth the
                model chases. Whoever sets the labels sets the horizon.
              </p>
            </AdaptiveProse>

            <BiasFunnel />

            <AdaptiveProse topic="Deployment mismatch as a source of algorithmic bias" seed="A model trained on one population and deployed on another can systematically under-serve the new population, as seen in U.S. healthcare risk-prediction algorithms.">
              <p>
                The third leak is <strong className="text-foreground">
                deployment</strong>. A model trained on one population is used
                on another. A classic 2019 study by Obermeyer and colleagues
                looked at a widely deployed U.S. healthcare risk-prediction
                algorithm used on roughly 200 million people. It predicted
                "future healthcare need" by using past healthcare spending as a
                proxy. Black patients historically received less care for the
                same conditions, so they had lower past spending. The algorithm
                concluded they were healthier. The result: Black patients had
                to be significantly sicker than white patients before the
                system flagged them for extra help. The math worked exactly as
                designed. The design was the bias.
              </p>
            </AdaptiveProse>

            <AdaptiveProse topic="Feedback loops compounding algorithmic bias" seed="Biased outputs shape the next round of data, causing predictive-policing and recommender systems to amplify their own distortions over time.">
              <p>
                The fourth leak is the <strong className="text-foreground">
                feedback loop</strong>. A biased output shapes the next round
                of data. Predictive-policing systems send more patrols to
                neighborhoods the model flags as high-risk. More patrols find
                more minor offenses, which get logged, which feed the next
                training run, which flags the same neighborhoods harder. The
                model's original guess becomes a self-fulfilling prophecy, and
                the disparity widens every cycle. Social-media recommender
                systems work the same way: the more a user clicks on a kind of
                content, the more the system feeds it, which shapes what they
                click on next. The loop is the product.
              </p>
            </AdaptiveProse>

            <AdaptiveProse topic="Intersectional failure hiding subgroup harms" seed="Aggregate accuracy metrics can look strong while catastrophic failures are hidden for specific subgroups, as Gender Shades research demonstrated.">
              <p>
                The fifth leak is <strong className="text-foreground">
                intersectional failure</strong>. A model can look fair on
                average and still fail catastrophically for specific subgroups.
                Joy Buolamwini and Timnit Gebru's "Gender Shades" research
                tested commercial facial-analysis systems from IBM, Microsoft,
                and Face++. Overall accuracy looked strong. Broken out by
                gender, a small gap appeared. Broken out by skin tone, a bigger
                gap appeared. Broken out by both at once — dark-skinned women —
                error rates rose above 34% for some systems, while light-skinned
                men came in under 1%. The aggregate metric had hidden a
                specific, severe harm. If you only report overall accuracy, you
                cannot see the people the system is failing.
              </p>
            </AdaptiveProse>

            <AdaptiveProse topic="Fairness as a system property requiring multiple interventions" seed="No single fix — more data, better labels, a fairer objective — resolves all the bias leaks; fairness requires watching data, labels, objective, evaluation, deployment, and monitoring together.">
              <p>
                None of these leaks is fixed by "more data" alone. Balanced
                data doesn't help if the labels encode biased judgments.
                Perfect labels don't help if the objective function chases an
                unfair proxy (spending for healthcare need, past hires for
                future ones). A great objective doesn't help if the deployment
                context doesn't match training. Fairness is a <strong
                className="text-foreground">system property</strong> —
                data, labels, objective, evaluation, deployment, monitoring —
                not a single knob. That's why the EU AI Act doesn't require
                "unbiased AI"; it requires documented processes, risk
                assessments, human oversight, and appeal paths, because those
                are the levers that actually catch the leaks.
              </p>
            </AdaptiveProse>

            <AdaptiveProse topic="Environmental and labor costs of AI systems" seed="AI has a supply chain of energy and low-paid labeling labor; inference electricity over a model's lifetime typically exceeds the training footprint.">
              <p>
                This matters beyond fairness. Training a frontier model burns
                enormous electricity — a single large run can use as much power
                as hundreds of households use in a year. But a trained model is
                then queried billions of times a day, and over its lifetime
                the inference footprint typically exceeds the training
                footprint. Behind the models sit low-paid labeling workers,
                often in the Global South, who screen traumatic content for
                pennies per item. The shiny output in your browser has a
                supply chain. Civic literacy means knowing the shape of that
                chain, not just the capabilities of the demo.
              </p>
            </AdaptiveProse>
          </div>

          <button
            onClick={advance("misconceptions")}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[oklch(0.78_0.16_30)] text-black text-sm font-semibold"
          >
            Next — three myths to retire
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
            Each of these sounds reasonable. Each one quietly leaves users
            worse off when they act on it.
          </SectionHeading>

          <MisconceptionCard
            misconception="If the training data is balanced, the model is fair."
            whyItFeelsTrue="Bias-in, bias-out is the slogan everyone remembers. If you flip the slogan, 'balanced-in' ought to imply 'fair-out'. The intuition is tidy and comforting, and it gives product teams a clear-looking fix: collect more diverse data, ship."
            mechanism="Data balance is one input among many. Labels can still encode biased human judgments. The objective function can still chase an unfair proxy, like past spending as a stand-in for medical need. Evaluation can still hide subgroup failures behind a strong overall average. And deployment can still drop the model into a context it wasn't trained for. Each of those can produce unfair outcomes even on perfectly balanced data."
            nuancedTruth="Fairness is a system property — data, labels, objective, evaluation, oversight, and deployment all have to be watched. 'Balanced data' is a floor, not a ceiling. Demand to see how the model was evaluated on specific subgroups, not just the headline accuracy."
            onMarkUnderstood={() => setUnderstood(u => ({ ...u, 0: true }))}
            understood={understood[0]}
          />

          <MisconceptionCard
            misconception="Deepfakes are easy to spot."
            whyItFeelsTrue="Early deepfakes were clumsy. Blurry mouths, melting hands, off-beat audio. Every viral 'this is a deepfake' article reinforced the idea that careful inspection would save us. So the defensive habit became: squint at the pixels."
            mechanism="Generation quality improves faster than detection. Diffusion and transformer models fix the obvious artifacts year by year, and each new generation fools both human inspection and the previous generation of detectors. Meanwhile, most harm happens through <em>context</em>, not pixels — a real photo used with a fake caption, a real voice saying a fake quote. Inspecting the file doesn't catch the lie; checking the source does."
            nuancedTruth="Rely on source verification, provenance, and corroboration — not pixel inspection. Ask where the media came from, whether anyone with a reputation to lose is reporting it, and whether multiple independent sources show the same thing. C2PA content credentials and cryptographic provenance are slowly becoming the real defense."
            onMarkUnderstood={() => setUnderstood(u => ({ ...u, 1: true }))}
            understood={understood[1]}
          />

          <MisconceptionCard
            misconception="The EU AI Act only affects European companies."
            whyItFeelsTrue="It's a European law. European laws sound like they apply in Europe. And most U.S. tech coverage treats it as 'that thing Brussels did that our engineers can ignore'."
            mechanism="The Act applies to any AI system whose output is used in the EU — not just companies headquartered there. If your model serves European users, you are in scope. And because multinationals can't cheaply build two parallel products, one compliant and one wild, they tend to raise the global floor to meet the strictest market. Economists call this the <em>Brussels effect</em>. GDPR followed the same pattern: it reshaped privacy practices worldwide, not just in the EU."
            nuancedTruth="The EU AI Act is setting a de-facto global floor. Expect U.S. companies to adopt many of its obligations — transparency, documentation, risk assessment, human oversight — even where U.S. law doesn't require them yet. As a user or citizen, you can ask for the same protections wherever you are."
            onMarkUnderstood={() => setUnderstood(u => ({ ...u, 2: true }))}
            understood={understood[2]}
          />

          <button
            onClick={advance("deepfake")}
            disabled={!(understood[0] && understood[1] && understood[2])}
            className="px-4 py-2 rounded-lg bg-[oklch(0.78_0.16_30)] text-black text-sm font-semibold disabled:opacity-40"
          >
            Mark all three understood, then continue
          </button>
        </div>
      )}

      {/* 5. Deepfake habit interactive */}
      {reachedOrPast("deepfake") && (
        <DeepfakeHabit onDone={advance("span")} />
      )}

      {/* 6. Span-select exercise */}
      {reachedOrPast("span") && (
        <SpanSelectExercise
          title="Spot the bias red flags in this AI hiring press release"
          instructions={
            "A fictional company is announcing an AI resume-screening tool. Click at least 2 spans that hint at algorithmic bias risk. The language is deliberately confident — focus on the claims, not the tone."
          }
          requiredHits={2}
          successMessage="You're reading the way a regulator reads — hunting for the design choices that create disparate outcomes, not the marketing gloss."
          chunks={[
            {
              text: "NorthBay Logistics is proud to announce the launch of HireRight AI, our new applicant-screening platform, ",
            },
            {
              text: "trained on 10 years of our past hires ",
              isTarget: true,
              explanation:
                "This is the resume-screener trap. Training on past hires means the model learns whoever the company hired before — including the demographic skews in that history. The more 'accurate' the model, the more faithfully it reproduces the old pattern.",
            },
            {
              text: "to identify candidates most likely to succeed. ",
            },
            {
              text: "HireRight is optimized for cultural fit ",
              isTarget: true,
              explanation:
                "'Cultural fit' is a vague construct that, in practice, often penalizes candidates who don't match the current workforce — by age, class, communication style, or background. A model optimized for it will rank in-group candidates higher and call that merit.",
            },
            {
              text: "and delivers an average 96% accuracy ",
              isTarget: true,
              explanation:
                "Headline accuracy hides subgroup failures. A system can be 96% accurate overall and still be dramatically worse for specific groups. Gender Shades showed the same pattern in facial analysis — strong overall, severe gaps when broken out by skin tone and gender.",
            },
            {
              text: "across our internal benchmark. ",
            },
            {
              text: "The model automatically filters out the bottom 50% of applicants before a human recruiter sees them, ",
            },
            {
              text: "reducing our time-to-hire by 40%. ",
            },
            {
              text: "No personal demographic data is used in the algorithm, ",
              isTarget: true,
              explanation:
                "Removing demographic fields doesn't remove bias — proxies leak. ZIP codes, college names, gaps in work history, and even word choice can all correlate with protected attributes. A model blind to the labels can still act on the underlying pattern.",
            },
            {
              text: "and applicants may request a review of any decision by emailing HR.",
            },
          ]}
        />
      )}

      {reachedOrPast("span") && (
        <button
          onClick={advance("ladder")}
          className="w-full px-4 py-3 rounded-xl glass border border-white/10 text-sm font-semibold text-foreground hover:border-white/20"
        >
          Continue — classify an AI system under the Act
        </button>
      )}

      {/* 7. Worked → faded → independent */}
      {reachedOrPast("ladder") && (
        <WorkedFadedIndependent
          title="Classify an AI use-case under the EU AI Act and name required mitigations"
          rungs={[
            {
              label: "Worked example",
              body: (
                <div className="space-y-3">
                  <p>
                    <strong className="text-foreground">The system:</strong>{" "}
                    A municipal "smart" trash-sorting AI that uses a camera
                    to identify whether an item is recyclable and routes it
                    to the correct bin.
                  </p>
                  <p>
                    <strong className="text-foreground">Step 1 — Who could it harm, and how badly?</strong>{" "}
                    Worst-case: a plastic bottle goes in the compost. Annoying,
                    not life-altering. No one is denied a job, a loan, or a
                    liberty.
                  </p>
                  <p>
                    <strong className="text-foreground">Step 2 — Tier.</strong>{" "}
                    Minimal risk. No gate-keeping, no biometrics, no
                    manipulation. Falls outside the Act's prescriptive tiers.
                  </p>
                  <p>
                    <strong className="text-foreground">Step 3 — Mitigations required.</strong>{" "}
                    Mostly general product discipline: publish a note that AI
                    is in the loop (good practice even when not legally
                    required), log errors, and allow a manual override. No
                    conformity assessment needed.
                  </p>
                </div>
              ),
            },
            {
              label: "Faded example",
              body: (
                <div className="space-y-3">
                  <p>
                    <strong className="text-foreground">The system:</strong>{" "}
                    An AI that recommends loan approval or denial for retail
                    banking applicants. A human approves the final decision,
                    but almost always follows the recommendation.
                  </p>
                  <p>
                    <strong className="text-foreground">Step 1 — Who could it harm, and how badly?</strong>{" "}
                    People denied credit may be unable to buy a home, start a
                    business, or cover an emergency. Disparate impact by race
                    or neighborhood is well-documented for this class of
                    system.
                  </p>
                  <p>
                    <em>Your turn — pick the tier:</em>
                  </p>
                  <ul className="list-disc list-inside text-xs space-y-1">
                    <li>Unacceptable — banned outright.</li>
                    <li>
                      <strong className="text-foreground">
                        High-risk — regulated, with duties.
                      </strong>
                    </li>
                    <li>Limited — transparency only.</li>
                    <li>Minimal — no extra duties.</li>
                  </ul>
                  <p>
                    The Act explicitly lists credit-worthiness assessment as
                    high-risk. "Human in the loop" doesn't downgrade it if
                    the human is rubber-stamping. Required mitigations include
                    a documented risk assessment, training-data governance,
                    logging, explicit human oversight that isn't cosmetic, and
                    an appeal path for affected applicants.
                  </p>
                  <p className="text-[11px] italic text-muted-foreground/70">
                    Before advancing, say aloud why this is high-risk rather
                    than limited-risk. It's about who gets hurt and how much,
                    not the technical complexity of the model.
                  </p>
                </div>
              ),
            },
            {
              label: "Your turn",
              body: (
                <div className="space-y-3">
                  <p>
                    <strong className="text-foreground">The system:</strong>{" "}
                    An AI that analyzes classroom video to score students on
                    "engagement" — attention, posture, expression — and
                    reports the scores to teachers. The district is
                    considering using engagement scores in teacher evaluations
                    and student progress reviews.
                  </p>
                  <p>
                    In your head or a notebook:
                  </p>
                  <ol className="list-decimal list-inside text-xs space-y-1">
                    <li>
                      Decide the tier (unacceptable, high, limited, minimal)
                      and say why in one sentence.
                    </li>
                    <li>
                      Name at least <strong className="text-foreground">two mitigations</strong> you
                      would demand as a parent, teacher, or student before
                      this system goes live — concrete, specific, not
                      "make it fair".
                    </li>
                    <li>
                      Name one failure mode the system will still have even
                      if every mitigation is in place. (Hint: think subgroup
                      error rates, cultural variation in expression, and
                      feedback loops.)
                    </li>
                  </ol>
                  <p className="text-[11px] italic text-muted-foreground/70">
                    No auto-grader for this rung — the point is that you now
                    carry the reasoning. The open-response section will ask
                    you to do it in writing for a system that affects you.
                  </p>
                </div>
              ),
            },
          ]}
        />
      )}

      {reachedOrPast("ladder") && (
        <>
          <RiskTierTable />
          <button
            onClick={advance("quiz")}
            className="w-full px-4 py-3 rounded-xl glass border border-white/10 text-sm font-semibold text-foreground hover:border-white/20"
          >
            Continue to the confidence quiz
          </button>
        </>
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
          title="Reflection: an AI system that already affects you"
          prompt="Pick an AI system that already affects your life — hiring, insurance, credit scoring, a social-media feed, an education platform, a translation tool, a healthcare triage system. Which EU AI Act tier does it belong to (unacceptable, high, limited, minimal) and why? Name one specific bias risk it carries and one concrete mitigation you would demand as a user or citizen. Be specific — no 'make it fair'."
          minimumCriteria={3}
          rubric={[
            {
              criterion:
                "Names a specific AI system (hiring, credit, insurance, social feed, education, healthcare, translation, etc.).",
              pattern:
                /\b(hire|hiring|resume|cv|credit|loan|insurance|feed|recommend|social|tiktok|youtube|instagram|facebook|education|school|exam|grad|health|medical|triage|translat|chatgpt|gpt|claude|gemini|bot|assistant|face|biometric|police)/i,
              hint: "Name the system — 'the TikTok feed', 'my bank's loan model', 'the hospital's triage tool'.",
            },
            {
              criterion:
                "Identifies the EU AI Act tier (unacceptable, high, limited, minimal) with a reason.",
              pattern:
                /\b(unacceptable|banned|prohibit|high[\s-]?risk|limited[\s-]?risk|minimal[\s-]?risk|tier)/i,
              hint: "Use the Act's vocabulary — unacceptable, high-risk, limited-risk, or minimal-risk.",
            },
            {
              criterion:
                "Names a specific bias mechanism (training data, labeling, proxy, feedback loop, intersectional failure, deployment mismatch).",
              pattern:
                /\b(training|data|label|proxy|feedback|loop|subgroup|intersect|deploy|histor|skew|represent|over[-\s]?polic|annotat)/i,
              hint: "Be mechanism-level — 'trained on past hires', 'proxies for race', 'feedback loop from clicks'.",
            },
            {
              criterion:
                "Names a specific mitigation (appeal path, subgroup evaluation, human oversight, data audit, transparency label, right to explanation).",
              pattern:
                /\b(appeal|oversight|audit|transparen|explain|disclos|opt[-\s]?out|human[-\s]?in[-\s]?the[-\s]?loop|subgroup|evaluat|document|consent|provenance|label)/i,
              hint: "Name the mitigation by type — 'a right to appeal', 'published subgroup accuracy', 'an opt-out'.",
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

      {/* 11. Key takeaways */}
      {reachedOrPast("done") && (
        <div className="glass rounded-2xl p-6 border border-[oklch(0.72_0.18_150_/_0.3)]">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 size={16} className="text-[oklch(0.72_0.18_150)]" />
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[oklch(0.72_0.18_150)]">
              Lesson 4 · Key takeaways
            </span>
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-4">
            What to carry with you
          </h3>
          <ul className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <li className="flex gap-3">
              <span className="text-[oklch(0.72_0.18_150)] font-bold shrink-0">01</span>
              <span>
                Bias is a system property. Data, labels, objective, evaluation,
                oversight, and deployment all leak. Balanced data alone is a
                floor, not a fix.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-[oklch(0.72_0.18_150)] font-bold shrink-0">02</span>
              <span>
                Aggregate accuracy hides subgroup harms. Always ask how the
                system performs on the people most likely to be hurt by it,
                not just on the average user.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-[oklch(0.72_0.18_150)] font-bold shrink-0">03</span>
              <span>
                Deepfake defense is source verification, not pixel inspection.
                Ask where a file came from and who else is reporting it —
                provenance and corroboration beat squinting.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-[oklch(0.72_0.18_150)] font-bold shrink-0">04</span>
              <span>
                EU AI Act tiers track <strong className="text-foreground">
                harm potential</strong>, not model capability: unacceptable
                (banned), high (regulated), limited (transparency), minimal
                (free). The law is already reshaping products worldwide via
                the Brussels effect.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-[oklch(0.72_0.18_150)] font-bold shrink-0">05</span>
              <span>
                AI has a supply chain — labor, energy, data. Over a model's
                life, inference electricity usually outweighs training
                electricity. Civic literacy includes knowing those costs,
                not just the demo.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-[oklch(0.72_0.18_150)] font-bold shrink-0">06</span>
              <span>
                As a user and citizen, your leverage is concrete asks:
                published subgroup accuracy, a right to appeal, documented
                human oversight, transparent provenance labels. Demand them
                by name.
              </span>
            </li>
          </ul>

          <div className="mt-5 flex items-center gap-3 p-3 rounded-xl bg-[oklch(0.65_0.22_200_/_0.06)] border border-[oklch(0.65_0.22_200_/_0.2)]">
            <Leaf size={14} className="text-[oklch(0.65_0.22_200)] shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Next lesson:</strong>{" "}
              You'll synthesize the full course into a personal AI charter —
              what you'll use, what you won't, and the habits you'll keep
              using when the hype cycles on.
            </p>
          </div>

          <button
            onClick={onComplete}
            className="mt-6 w-full px-5 py-3 rounded-xl bg-[oklch(0.72_0.18_150)] text-black text-sm font-bold hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2"
          >
            <Sparkles size={14} />
            Complete Lesson 4
            {responsePassed && " — reflection passed"}
          </button>
        </div>
      )}
    </div>
  );
}
