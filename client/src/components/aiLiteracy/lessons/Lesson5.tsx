/**
 * Lesson 5 — The AI Literacy Compact
 *
 * Capstone of the 5-lesson AI Literacy course. Synthesizes L1 (what AI is),
 * L2 (hallucination + TRACE), L3 (RACE-F prompting), and L4 (bias + EU AI
 * Act + civic voice) into a personal decision framework: when do I trust,
 * when do I verify, when do I refuse, when do I advocate?
 *
 * Pedagogy leans hardest on transfer and synthesis. See
 * AI_LITERACY_DESIGN_DOCUMENT.md (capstone section) and
 * AI_LITERACY_AUDIT_AND_ARCHITECTURE.md §1.1.
 */

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Compass,
  Eye,
  GraduationCap,
  Handshake,
  Landmark,
  Lightbulb,
  MessageSquare,
  RotateCcw,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";

import {
  AdaptiveProse,
  CalibrationChart,
  ConfidenceQuizItem,
  LLMGradedResponse,
  MisconceptionCard,
  ProductiveFailureOpener,
  RetrievalWarmup,
  WorkedFadedIndependent,
  useLessonMetrics,
  type ConfidenceQuizData,
} from "../primitives";

// ─── Data: productive-failure opener ─────────────────────────────────────────

const OPENER_ITEMS = [
  {
    id: "party-themes",
    text: "Using AI to brainstorm birthday party themes for your niece.",
    bucket: "trust-light",
  },
  {
    id: "contract",
    text: "Using AI to summarize a 40-page legal contract you're about to sign.",
    bucket: "verify",
  },
  {
    id: "eulogy",
    text: "Using AI to write a funeral eulogy for your grandmother.",
    bucket: "refuse",
  },
  {
    id: "municipal-911",
    text: "A municipal government using AI to triage incoming 911 calls by urgency.",
    bucket: "advocate",
  },
  {
    id: "dinner",
    text: "Using AI to plan a weeknight dinner from what's in your fridge.",
    bucket: "trust-light",
  },
  {
    id: "rash",
    text: "Using AI to diagnose a rash on your forearm before deciding whether to see a doctor.",
    bucket: "verify",
  },
] as const;

const OPENER_BUCKETS = [
  { id: "trust-light", label: "Trust (with a light check)", color: "oklch(0.72 0.18 150)" },
  { id: "verify", label: "Verify rigorously", color: "oklch(0.65 0.22 200)" },
  { id: "refuse", label: "Refuse — do it yourself", color: "oklch(0.78 0.16 30)" },
  { id: "advocate", label: "Advocate / demand regulation", color: "oklch(0.72 0.2 290)" },
];

// ─── Data: confidence quiz items ─────────────────────────────────────────────

const QUIZ_ITEMS: ConfidenceQuizData[] = [
  {
    question:
      "You ask a chatbot a question and it answers in a confident, fluent paragraph. What is the model actually optimizing for, token by token?",
    options: [
      {
        text: "Picking the token that is most likely to be true given what it knows.",
        misconceptionId: "confidence-equals-truth",
      },
      {
        text: "Picking the token with the highest probability given the prompt and everything generated so far.",
      },
      {
        text: "Picking the token its designers pre-labeled as 'safe and accurate' for this topic.",
        misconceptionId: "self-check-works",
      },
      {
        text: "Picking the token a human expert would most likely use in this exact situation.",
        misconceptionId: "confidence-equals-truth",
      },
    ],
    correct: 1,
    explanation:
      "The model samples from a probability distribution over next tokens. 'Likely' is not 'true' — it is 'what pattern most often follows this pattern in training data.' That gap is why every specific factual claim still needs verification.",
    elaborationPrompt:
      "In one line: why does 'likely' not equal 'true' here?",
  },
  {
    question:
      "You're about to share an AI-generated stat with your team. Which TRACE step is the best single protection against repeating a fabricated number?",
    options: [
      {
        text: "Ask the same model 'are you sure?' and note the answer.",
        misconceptionId: "self-check-works",
      },
      {
        text: "T — Trace the number to its original source on the publisher's own site.",
      },
      {
        text: "Paste it into another chatbot for a second opinion.",
        misconceptionId: "self-check-works",
      },
      {
        text: "Trust it if the publisher name (Pew, Gallup, BLS) sounds legitimate.",
        misconceptionId: "confidence-equals-truth",
      },
    ],
    correct: 1,
    explanation:
      "Tracing catches the most common failure: the AI invented the report, the year, or the number while keeping the publisher name plausible. Open the real source before you repeat the claim.",
    elaborationPrompt:
      "Why is the publisher's name not enough on its own?",
  },
  {
    question:
      "Under the EU AI Act's risk-based tiers, which of the following would most clearly be classified as 'high-risk' and therefore subject to strict governance?",
    options: [
      { text: "A chatbot that recommends party playlists." },
      { text: "An AI tutor that adjusts math problem difficulty for elementary students." },
      {
        text: "An AI system that scores job applicants' resumes to decide who advances in a hiring process.",
      },
      { text: "An image generator that makes cartoon avatars." },
    ],
    correct: 2,
    explanation:
      "Hiring, credit, benefits eligibility, education access, critical infrastructure, and law enforcement are named 'high-risk' domains in the EU AI Act — they require transparency, human oversight, risk management, and documentation. Low-stakes consumer tools are not.",
    elaborationPrompt:
      "What's the common thread across the Act's 'high-risk' categories?",
  },
  {
    question:
      "You're writing a sensitive cover letter and you want better output from a chatbot. Which RACE-F move has the biggest single effect on quality?",
    options: [
      { text: "Make the prompt shorter so the model doesn't get confused." },
      {
        text: "Give a clear Role, Audience, Context, and Example — and tell it what Format you want back.",
      },
      {
        text: "Repeat the word 'important' several times so the model takes it seriously.",
        misconceptionId: "magic-words",
      },
      {
        text: "Ask the model to be creative and then accept whatever it produces.",
        misconceptionId: "magic-words",
      },
    ],
    correct: 1,
    explanation:
      "RACE-F (Role, Audience, Context, Example, Format) concentrates your specific situation into the prompt so the model's probability distribution narrows onto useful continuations. Magic-word tricks do little; structure does a lot.",
    elaborationPrompt:
      "Which element of RACE-F would you have skipped on a bad prompt from memory?",
  },
];

// ─── Visual: pentagon / radial 5-axis compact diagram ────────────────────────

interface CompactAxis {
  id: string;
  letter: string;
  label: string;
  blurb: string;
  color: string;
  icon: React.ElementType;
  lesson: string;
}

const AXES: CompactAxis[] = [
  {
    id: "understand",
    letter: "U",
    label: "Understand",
    blurb:
      "Know what kind of AI you're using and what it optimizes for. Generation is not retrieval. Prediction is not reasoning.",
    color: "oklch(0.65 0.22 200)",
    icon: Lightbulb,
    lesson: "Lesson 1 — What AI Actually Is",
  },
  {
    id: "verify",
    letter: "V",
    label: "Verify",
    blurb:
      "Run TRACE on specific claims — numbers, dates, names, citations, rules. Tone is generated; truth is not.",
    color: "oklch(0.72 0.18 150)",
    icon: ShieldCheck,
    lesson: "Lesson 2 — Myths, Hallucinations & Verification",
  },
  {
    id: "collaborate",
    letter: "C",
    label: "Collaborate",
    blurb:
      "Use RACE-F (Role, Audience, Context, Example, Format) when AI helps. Know when to close the tab and do it yourself.",
    color: "oklch(0.75 0.18 55)",
    icon: Handshake,
    lesson: "Lesson 3 — Collaborating With AI",
  },
  {
    id: "govern",
    letter: "G",
    label: "Govern",
    blurb:
      "Notice bias, know the EU AI Act tiers, and use your civic voice. High-stakes systems need human accountability.",
    color: "oklch(0.72 0.2 290)",
    icon: Landmark,
    lesson: "Lesson 4 — Bias, Governance & Civic Voice",
  },
  {
    id: "reflect",
    letter: "R",
    label: "Reflect",
    blurb:
      "Stay calibrated. Know what you don't know. Update when evidence changes — literacy is a practice, not a badge.",
    color: "oklch(0.78 0.16 30)",
    icon: Eye,
    lesson: "Metacognition — across all lessons",
  },
];

function CompactPentagon() {
  const size = 300;
  const cx = size / 2;
  const cy = size / 2;
  const r = 110;
  const points = AXES.map((_, i) => {
    const angle = (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  });
  const polygon = points.map(p => `${p.x},${p.y}`).join(" ");
  return (
    <div className="glass rounded-2xl p-5 border border-white/10 my-5">
      <div className="flex items-center gap-2 mb-3">
        <Compass size={14} className="text-[oklch(0.78_0.16_30)]" />
        <span className="text-xs font-bold uppercase tracking-wider text-[oklch(0.78_0.16_30)]">
          The five axes, at a glance
        </span>
      </div>
      <div className="flex flex-col md:flex-row items-center gap-5">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="shrink-0"
          aria-label="Pentagon diagram of the five AI literacy axes"
        >
          <defs>
            <radialGradient id="pent-bg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="oklch(0.78 0.16 30 / 0.15)" />
              <stop offset="100%" stopColor="oklch(0.78 0.16 30 / 0)" />
            </radialGradient>
          </defs>
          <circle cx={cx} cy={cy} r={r + 10} fill="url(#pent-bg)" />
          {[0.33, 0.66, 1].map(scale => (
            <polygon
              key={scale}
              points={points
                .map(p => `${cx + (p.x - cx) * scale},${cy + (p.y - cy) * scale}`)
                .join(" ")}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={1}
            />
          ))}
          <polygon
            points={polygon}
            fill="oklch(0.78 0.16 30 / 0.08)"
            stroke="oklch(0.78 0.16 30 / 0.5)"
            strokeWidth={1.5}
          />
          {points.map((p, i) => {
            const axis = AXES[i];
            const labelOffset = 22;
            const angle = (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
            const lx = cx + (r + labelOffset) * Math.cos(angle);
            const ly = cy + (r + labelOffset) * Math.sin(angle);
            return (
              <g key={axis.id}>
                <circle cx={p.x} cy={p.y} r={10} fill={axis.color} />
                <text
                  x={p.x}
                  y={p.y + 4}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={700}
                  fill="black"
                >
                  {axis.letter}
                </text>
                <text
                  x={lx}
                  y={ly + 4}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={600}
                  fill="white"
                >
                  {axis.label}
                </text>
              </g>
            );
          })}
        </svg>
        <ul className="flex-1 space-y-2 w-full">
          {AXES.map(axis => {
            const Icon = axis.icon;
            return (
              <li
                key={axis.id}
                className="flex items-start gap-3 p-2.5 rounded-lg bg-white/3 border border-white/5"
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: `${axis.color.replace(")", " / 0.15)")}`,
                    border: `1px solid ${axis.color.replace(")", " / 0.3)")}`,
                  }}
                >
                  <Icon size={12} style={{ color: axis.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-foreground">
                    <span style={{ color: axis.color }}>{axis.letter}</span> — {axis.label}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {axis.blurb}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

// ─── Decision Matrix: Stakes × Reversibility ─────────────────────────────────

interface MatrixScenario {
  id: string;
  text: string;
  correct: QuadrantId;
}

type QuadrantId = "hi-hi" | "hi-lo" | "lo-hi" | "lo-lo";

const MATRIX_SCENARIOS: MatrixScenario[] = [
  {
    id: "s1",
    text: "Letting AI pick a playlist for tonight's dinner.",
    correct: "lo-hi",
  },
  {
    id: "s2",
    text: "Letting AI draft the wording of a will you'll sign on Friday.",
    correct: "hi-lo",
  },
  {
    id: "s3",
    text: "Asking AI to suggest edits to a team email you'll still re-read.",
    correct: "lo-hi",
  },
  {
    id: "s4",
    text: "Letting AI screen nursing-home applications without human review.",
    correct: "hi-lo",
  },
];

const QUADRANTS: Array<{ id: QuadrantId; label: string; posture: string; color: string }> = [
  {
    id: "hi-lo",
    label: "High stakes · Low reversibility",
    posture: "Refuse to automate. Use AI only as a draft. Humans decide and sign.",
    color: "oklch(0.72 0.2 290)",
  },
  {
    id: "hi-hi",
    label: "High stakes · High reversibility",
    posture: "Verify rigorously with TRACE. Keep a clear undo path.",
    color: "oklch(0.65 0.22 200)",
  },
  {
    id: "lo-lo",
    label: "Low stakes · Low reversibility",
    posture: "Slow down anyway. A small public mistake can still stick.",
    color: "oklch(0.75 0.18 55)",
  },
  {
    id: "lo-hi",
    label: "Low stakes · High reversibility",
    posture: "Trust with a light check. This is where AI shines.",
    color: "oklch(0.72 0.18 150)",
  },
];

function DecisionMatrix({ onComplete }: { onComplete: () => void }) {
  const [assigned, setAssigned] = useState<Record<string, QuadrantId>>({});
  const [active, setActive] = useState<string | null>(null);
  const [committed, setCommitted] = useState(false);

  const allAssigned = MATRIX_SCENARIOS.every(s => assigned[s.id]);
  const correctCount = useMemo(
    () => MATRIX_SCENARIOS.filter(s => assigned[s.id] === s.correct).length,
    [assigned],
  );

  return (
    <div className="glass rounded-2xl p-6 border border-[oklch(0.65_0.22_200_/_0.25)]">
      <div className="flex items-center gap-2 mb-2">
        <Scale size={14} className="text-[oklch(0.65_0.22_200)]" />
        <span className="text-xs font-bold uppercase tracking-wider text-[oklch(0.65_0.22_200)]">
          Decision matrix · Stakes × Reversibility
        </span>
      </div>
      <h4 className="text-base font-semibold text-foreground mb-1">
        Place each scenario in the right quadrant
      </h4>
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
        Tap a scenario, then tap the quadrant where it belongs. The posture you
        should take isn't about the tool — it's about what happens if the tool
        is wrong, and whether you can undo it.
      </p>

      {/* Scenarios */}
      <div className="mb-5">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Scenarios
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {MATRIX_SCENARIOS.map(s => {
            const placed = assigned[s.id];
            const ok = committed && placed === s.correct;
            const bad = committed && placed && placed !== s.correct;
            return (
              <button
                key={s.id}
                disabled={committed}
                onClick={() => setActive(active === s.id ? null : s.id)}
                className={`text-left px-3 py-2 rounded-lg text-xs border transition-all ${
                  ok
                    ? "bg-[oklch(0.72_0.18_150_/_0.12)] border-[oklch(0.72_0.18_150_/_0.35)] text-foreground"
                    : bad
                    ? "bg-[oklch(0.72_0.2_290_/_0.10)] border-[oklch(0.72_0.2_290_/_0.30)] text-muted-foreground"
                    : active === s.id
                    ? "bg-[oklch(0.65_0.22_200_/_0.15)] border-[oklch(0.65_0.22_200_/_0.5)] text-foreground"
                    : placed
                    ? "glass border-white/15 text-muted-foreground"
                    : "glass border-white/10 text-foreground hover:border-white/25"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex-1">{s.text}</span>
                  {placed && !committed && (
                    <span className="text-[10px] text-[oklch(0.65_0.22_200)] shrink-0">
                      → {QUADRANTS.find(q => q.id === placed)?.label.split(" · ")[0]}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2x2 grid */}
      <div className="relative">
        <div className="absolute -left-5 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap hidden md:block">
          Stakes →
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(["hi-lo", "hi-hi", "lo-lo", "lo-hi"] as QuadrantId[]).map(qid => {
            const q = QUADRANTS.find(x => x.id === qid)!;
            const placedHere = MATRIX_SCENARIOS.filter(s => assigned[s.id] === qid);
            return (
              <button
                key={qid}
                disabled={committed || !active}
                onClick={() => {
                  if (!active) return;
                  setAssigned(a => ({ ...a, [active]: qid }));
                  setActive(null);
                }}
                className={`text-left p-3 rounded-xl border min-h-[110px] transition-all ${
                  active
                    ? "glass border-[oklch(0.65_0.22_200_/_0.4)] hover:bg-[oklch(0.65_0.22_200_/_0.08)]"
                    : "glass border-white/10 opacity-90"
                }`}
                style={{ borderLeftWidth: 3, borderLeftColor: q.color }}
              >
                <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: q.color }}>
                  {q.label}
                </div>
                {committed ? (
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">Posture: </strong>
                    {q.posture}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {placedHere.length === 0 && (
                      <span className="text-[10px] italic text-muted-foreground/60">
                        empty
                      </span>
                    )}
                    {placedHere.map(s => (
                      <div
                        key={s.id}
                        className="text-[10px] px-2 py-1 rounded bg-white/5 border border-white/10 text-foreground"
                      >
                        {s.text.slice(0, 48)}…
                      </div>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <div className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-2">
          ← Reversibility →
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {committed
            ? `${correctCount} / ${MATRIX_SCENARIOS.length} placed in the intended quadrant. The posture for each quadrant is shown above.`
            : active
            ? `Selected: "${MATRIX_SCENARIOS.find(s => s.id === active)?.text.slice(0, 36)}…" — now tap a quadrant.`
            : allAssigned
            ? "All placed. Commit when you're ready."
            : "Tap a scenario, then tap a quadrant."}
        </p>
        {!committed ? (
          <button
            disabled={!allAssigned}
            onClick={() => setCommitted(true)}
            className="px-4 py-2 rounded-lg bg-[oklch(0.65_0.22_200)] text-black text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Commit
          </button>
        ) : (
          <button
            onClick={onComplete}
            className="px-4 py-2 rounded-lg bg-[oklch(0.65_0.22_200)] text-black text-sm font-semibold"
          >
            Continue
          </button>
        )}
      </div>
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
        <p className="text-sm text-muted-foreground leading-relaxed">{children}</p>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

interface Lesson5Props {
  onComplete: () => void;
}

type Stage =
  | "warmup"
  | "opener"
  | "compact"
  | "misconceptions"
  | "matrix"
  | "ladder"
  | "quiz"
  | "response"
  | "calibration"
  | "graduation";

export default function Lesson5({ onComplete }: Lesson5Props) {
  const { metrics, recordAnswer } = useLessonMetrics();
  const [stage, setStage] = useState<Stage>("warmup");
  const [quizIndex, setQuizIndex] = useState(0);
  const [understood, setUnderstood] = useState<Record<number, boolean>>({});
  const [compactPassed, setCompactPassed] = useState(false);

  const advance = (next: Stage) => () => setStage(next);

  const reachedOrPast = useMemo(() => {
    const order: Stage[] = [
      "warmup",
      "opener",
      "compact",
      "misconceptions",
      "matrix",
      "ladder",
      "quiz",
      "response",
      "calibration",
      "graduation",
    ];
    return (s: Stage) => order.indexOf(stage) >= order.indexOf(s);
  }, [stage]);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      {/* Lesson banner */}
      <div className="glass rounded-2xl p-6 border border-[oklch(0.78_0.16_30_/_0.3)] relative overflow-hidden">
        <div className="flex items-center gap-2 mb-2">
          <GraduationCap size={16} className="text-[oklch(0.78_0.16_30)]" />
          <span className="text-xs font-bold uppercase tracking-[0.18em] text-[oklch(0.78_0.16_30)]">
            Lesson 5 of 5 · Capstone
          </span>
        </div>
        <h1 className="text-3xl font-semibold text-foreground tracking-tight mb-2">
          The AI Literacy Compact
        </h1>
        <AdaptiveProse topic="AI Literacy Compact overview" seed="Synthesizes four lessons into a personal framework for when to trust, verify, refuse, or advocate.">
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
            Four lessons gave you tools. This one ties them into a single
            framework you can use the rest of your life: when to trust, when to
            verify, when to refuse, and when to advocate. No single rule covers
            every case. A small compact does.
          </p>
        </AdaptiveProse>
      </div>

      {/* 1. Retrieval warmup — pulls from L1, L2, L3/L4 */}
      {reachedOrPast("warmup") && (
        <RetrievalWarmup
          fromLesson="Lessons 1–4"
          questions={[
            {
              prompt:
                "From Lesson 1: what does a large language model actually optimize at each step — and what does it NOT optimize?",
              correctAnswer:
                "It optimizes the probability of the next token given the prompt so far. It does NOT optimize for truth, for safety, or for your best interest — those come in later, imperfectly, through training feedback.",
              hint: "Next-token probability vs. what's absent from the objective.",
            },
            {
              prompt:
                "From Lesson 2: name the five TRACE steps (or describe the hallucination mechanism in one sentence).",
              correctAnswer:
                "TRACE = Trace the source, Reproduce independently, Ask a real expert source, Check incentives, Edit before sharing. Hallucination comes from picking the most plausible-sounding next token, even when no true answer exists.",
              hint: "T, R, A, C, E — or: why does fluency not imply truth?",
            },
            {
              prompt:
                "From Lesson 3 or 4: name one RACE-F prompt element, OR one EU AI Act risk tier and an example domain.",
              correctAnswer:
                "RACE-F: Role, Audience, Context, Example, Format. EU AI Act tiers: Unacceptable (banned, e.g. social scoring), High-risk (hiring, credit, education, law enforcement), Limited (transparency-required), Minimal (most consumer AI).",
              hint: "Either a prompting piece or a governance tier is fine.",
            },
          ]}
          onComplete={advance("opener")}
        />
      )}

      {/* 2. Productive-failure opener */}
      {reachedOrPast("opener") && (
        <ProductiveFailureOpener
          title="Four real situations. What's the right AI posture for each?"
          description="Six everyday and public situations. Four possible postures. Your gut will be right a lot — and the wrong ones show you which axis of the compact you lean on least. Guess first."
          items={OPENER_ITEMS.map(({ id, text, bucket }) => ({ id, text, bucket }))}
          buckets={OPENER_BUCKETS}
          reveal={
            <div className="space-y-3">
              <p>
                <strong className="text-foreground">Beat 1 — It's not the tool, it's the stakes.</strong>{" "}
                Party themes and weeknight dinners are low-stakes and easily
                reversed if the AI misses — trust with a light check is fine.
                A contract summary or a rash check is personal and medium-stakes
                — verify rigorously against the actual document or a clinician.
              </p>
              <p>
                <strong className="text-foreground">Beat 2 — Refuse when meaning is the point.</strong>{" "}
                A eulogy is not an efficiency problem. The value is the act of
                writing it. Outsourcing it to a pattern-matcher costs more than
                it saves, even if the output looks good. Some tasks deserve
                your hands on them.
              </p>
              <p>
                <strong className="text-foreground">Beat 3 — Advocate when the system touches many lives.</strong>{" "}
                911 triage isn't your personal tool choice. It's a public
                system that could mis-route emergencies. Your posture there is
                civic: ask who audited it, how errors are caught, and whether
                a human dispatcher stays in the loop. That's governance work,
                not user work.
              </p>
              <p>
                <strong className="text-foreground">The triad:</strong>{" "}
                <em>stakes</em> (what happens if it's wrong) ×{" "}
                <em>reversibility</em> (can you undo it) ×{" "}
                <em>verifiability</em> (can you actually check) —
                not the model's capability — tells you the posture.
              </p>
            </div>
          }
          onComplete={advance("compact")}
        />
      )}

      {/* 3. Core exposition — The AI Literacy Compact */}
      {reachedOrPast("compact") && (
        <div className="glass rounded-2xl p-6 border border-white/8">
          <SectionHeading eyebrow="Core synthesis" title="The AI Literacy Compact">
            One framework. Five axes. Small enough to carry around in your head,
            big enough to keep you honest when the tools change underneath you.
          </SectionHeading>

          <div className="prose prose-invert prose-sm max-w-none text-muted-foreground leading-relaxed space-y-4">
            <AdaptiveProse topic="Five habits of AI literacy" seed="Four lessons are really five interconnected habits forming the AI Literacy Compact: Understand, Verify, Collaborate, Govern, Reflect.">
              <p>
                The last four lessons looked like four separate topics — how
                the machine works, why it makes things up, how to prompt it
                well, and who gets to govern it. They're not really separate.
                They're five habits that together let you meet AI on your own
                terms instead of on the tool's terms. We'll call it the{" "}
                <strong className="text-foreground">AI Literacy Compact</strong>:
                a short agreement you make with yourself before you open a
                chatbot, sign up for an AI feature, or hear a news story about
                a new model. Five axes: <strong className="text-foreground">Understand,
                Verify, Collaborate, Govern, Reflect.</strong>
              </p>
            </AdaptiveProse>

            <CompactPentagon />

            <AdaptiveProse topic="Understand axis — knowing what AI optimizes" seed="Different AI types have different failure modes; asking what a system optimizes for filters most hype.">
              <p>
                <strong className="text-foreground">Understand</strong> is the
                L1 axis. Before you decide how much weight to give an AI answer,
                know what you're looking at. A generative chatbot picks likely
                next tokens — it doesn't look facts up. A recommender ranks
                content you're likely to click. A classifier assigns labels
                based on training examples. A self-driving system fuses sensors
                and rules. These are different kinds of AI, with different
                failure modes. When you read a headline that says "AI did X",
                your first move is to ask which kind, and what it was actually
                optimizing for. That question alone filters out most hype.
              </p>
            </AdaptiveProse>

            <AdaptiveProse topic="Verify axis — TRACE method for AI claims" seed="TRACE is cheap insurance against fabricated specifics: numbers, dates, citations, rules, names, and quotes.">
              <p>
                <strong className="text-foreground">Verify</strong> is the L2
                axis. Once you know what the tool is optimizing, you know where
                it will lie to you: any specific claim — a number, a date, a
                citation, a rule, a name, a quote. TRACE is the cheap insurance
                policy: Trace the source, Reproduce independently, Ask a real
                expert source, Check incentives, Edit before sharing. You won't
                run it for "what rhymes with orange." You will run it before
                you send the email, cite the stat in the meeting, or tell
                someone their medication is fine. Verification is not pessimism.
                It's what lets you use AI confidently without getting burned.
              </p>
            </AdaptiveProse>

            <p>
              <strong className="text-foreground">Collaborate</strong> is the
              L3 axis. When you decide to use AI, use it well. RACE-F — Role,
              Audience, Context, Example, Format — concentrates your specific
              situation into the prompt so the model's distribution narrows
              onto something useful. Short prompts get generic outputs; the
              generic output is the default for a reason. But collaboration
              also means knowing when to close the tab. If the task's value
              is in the doing — a condolence note, a journal entry, a
              reflection on a hard conversation — the model's polish can
              actually subtract from the result. Collaboration includes the
              option to not collaborate.
            </p>

            <p>
              <strong className="text-foreground">Govern</strong> is the L4
              axis. Most of what AI will do to your life in the next ten
              years won't happen through a chatbot you opened. It will happen
              through systems deployed around you — by your employer, your
              school, your city, your insurer, your landlord. That's where
              bias compounds and where the EU AI Act and similar frameworks
              matter. The governance move is small and steady: notice when
              a system is making a consequential decision, ask whether a
              human is accountable, ask what data it was trained on, ask
              whether there's an appeal path. Write the council member. Show
              up to the school board meeting. You don't have to be a lawyer.
              You have to be a citizen who's paying attention.
            </p>

            <p>
              <strong className="text-foreground">Reflect</strong> is the
              metacognitive axis that runs across all of them. It's the
              habit of asking, honestly: how sure am I, and why? The
              calibration chart at the end of each lesson is one form of
              this. The broader form is: what belief did I hold at the start
              of the month that I no longer hold? What evidence would change
              my mind on AI tomorrow? Reflection is what keeps literacy
              alive when the specifics change — and the specifics will
              change, constantly. Models that were state of the art when
              this course was written will be legacy in a year. The habits
              won't be.
            </p>

            <p>
              The compact works because each axis blocks a different failure.
              Skip Understand and you believe marketing. Skip Verify and you
              repeat fabrications. Skip Collaborate and you get bland, wrong
              outputs you half-trust. Skip Govern and you live inside systems
              you can't contest. Skip Reflect and you stop learning. Held
              together, they let you keep your judgment intact while the
              tools around you evolve. You don't need to be an AI expert.
              You need to be an adult with a short, honest framework. That's
              what the rest of this lesson will help you build — for you,
              specifically.
            </p>
          </div>

          <button
            onClick={advance("misconceptions")}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[oklch(0.78_0.16_30)] text-black text-sm font-semibold"
          >
            Next: two myths about AI literacy itself
          </button>
        </div>
      )}

      {/* 4. Misconception cards (2) */}
      {reachedOrPast("misconceptions") && (
        <div className="space-y-4">
          <SectionHeading
            eyebrow="Myths about the course itself"
            title="Two beliefs about AI literacy worth rewriting"
          >
            Before we close, two framings that quietly sabotage learners even
            after a good course. Call them out now and they lose their grip.
          </SectionHeading>

          <MisconceptionCard
            misconception="AI literacy is mostly about using AI well."
            whyItFeelsTrue="Almost every course you'll see advertised is a productivity tutorial — 'ten prompts that save you five hours a week', 'build an AI agent in a weekend.' The industry has enormous reason to frame literacy as user-skill, because every user becomes a customer. So the default mental model is: literacy = competent usage."
            mechanism="Usage is one axis of five — the Collaborate axis. The higher-leverage skills are the ones that don't sell tools: Verify (slow down), Govern (push back), Reflect (know what you don't know), and sometimes Refuse (don't use it at all). Those are civic and metacognitive skills, not product skills. A course that only teaches usage prepares you to be a better customer — not a better citizen of an AI-shaped society."
            nuancedTruth="Using AI well is useful. It's also the narrowest slice of what literacy covers. The highest-leverage moves you'll make in the next decade are the ones where you demand transparency, refuse a deployment, or change your mind on evidence — not the ones where you wrote a clever prompt."
            onMarkUnderstood={() => setUnderstood(u => ({ ...u, 0: true }))}
            understood={understood[0]}
          />

          <MisconceptionCard
            misconception="Once I'm literate, I'm done."
            whyItFeelsTrue="Courses have endings. Certificates have dates. The whole shape of formal learning trains us to think of knowledge as a thing you finish. And after five lessons, the temptation is to close the tab, feel accomplished, and move on with your life."
            mechanism="The specifics of this field change every six to twelve months. A model's capabilities, a company's policies, a country's regulations, the price of inference, what counts as 'state of the art' — all of these will be different a year from now. The heuristics you built in this course — the compact, TRACE, RACE-F, the stakes × reversibility matrix — are durable. The facts attached to them are not. If you treat literacy as a status you achieved, the status decays with the specifics. If you treat it as a practice, the practice keeps you current."
            nuancedTruth="AI literacy is a habit, not a credential. Check your priors every few months. Re-run TRACE on your own recent opinions. Ask whether any axis of your compact has atrophied. The people who stay literate don't have more knowledge than you — they just keep asking the five questions."
            onMarkUnderstood={() => setUnderstood(u => ({ ...u, 1: true }))}
            understood={understood[1]}
          />

          <button
            onClick={advance("matrix")}
            disabled={!(understood[0] && understood[1])}
            className="px-4 py-2 rounded-lg bg-[oklch(0.78_0.16_30)] text-black text-sm font-semibold disabled:opacity-40"
          >
            Mark both understood, then continue
          </button>
        </div>
      )}

      {/* 5. Decision matrix */}
      {reachedOrPast("matrix") && (
        <DecisionMatrix onComplete={advance("ladder")} />
      )}

      {/* 6. Worked / Faded / Independent — full compact applied */}
      {reachedOrPast("ladder") && (
        <WorkedFadedIndependent
          title="Apply the full compact to a real situation"
          rungs={[
            {
              label: "Worked example",
              body: (
                <div className="space-y-3 text-xs">
                  <p>
                    <strong className="text-foreground">Scenario:</strong>{" "}
                    You're writing an email to your manager requesting an
                    exception to a company travel policy. You're tempted to
                    draft it with a chatbot.
                  </p>
                  <ul className="space-y-2">
                    <li>
                      <strong className="text-foreground">U — Understand:</strong>{" "}
                      A chatbot will produce a polished, plausible email that
                      pattern-matches past "exception request" language. It
                      doesn't know your actual relationship with your manager
                      or your company's unwritten norms. It's a drafting
                      tool, not a negotiator.
                    </li>
                    <li>
                      <strong className="text-foreground">V — Verify:</strong>{" "}
                      If the draft cites policy section numbers, precedent,
                      or HR rules, Trace them — those are the kinds of
                      claims it most often fabricates. Confirm the exact
                      policy text in your HR handbook before sending.
                    </li>
                    <li>
                      <strong className="text-foreground">C — Collaborate:</strong>{" "}
                      Prompt with RACE-F: Role (me, a senior engineer),
                      Audience (my direct manager, time-pressed, prefers
                      brevity), Context (the specific reason for the
                      request), Example (past short emails I've sent), Format
                      (under 120 words, plain text). Then rewrite the
                      output in your own voice.
                    </li>
                    <li>
                      <strong className="text-foreground">G — Govern:</strong>{" "}
                      Low-risk at the individual level. But note whether
                      your employer runs AI-written text through monitoring
                      tools; if so, understand that before you paste company
                      context into a public chatbot.
                    </li>
                    <li>
                      <strong className="text-foreground">R — Reflect:</strong>{" "}
                      Ask: did using AI here make the email better, or just
                      faster? If the answer is "just faster," is that
                      actually what I wanted for a message where my voice
                      matters?
                    </li>
                  </ul>
                </div>
              ),
            },
            {
              label: "Faded example",
              body: (
                <div className="space-y-3 text-xs">
                  <p>
                    <strong className="text-foreground">Scenario:</strong>{" "}
                    Your HOA wants to adopt an AI tool that screens
                    prospective tenant applications and recommends approve
                    or deny.
                  </p>
                  <ul className="space-y-2">
                    <li>
                      <strong className="text-foreground">U — Understand:</strong>{" "}
                      This is a classifier trained on past application data.
                      Its job is to predict "good tenant" from inputs. The
                      inputs likely include credit, income, address history,
                      maybe more.
                    </li>
                    <li>
                      <strong className="text-foreground">V — Verify:</strong>{" "}
                      <em>Your turn.</em> What specific claims would you
                      ask the vendor to substantiate before this tool is
                      adopted? Name at least two.
                    </li>
                    <li>
                      <strong className="text-foreground">C — Collaborate:</strong>{" "}
                      Not really a collaboration scenario — no one is
                      prompting the tool. It runs on applicants.
                    </li>
                    <li>
                      <strong className="text-foreground">G — Govern:</strong>{" "}
                      <em>Your turn.</em> Which EU AI Act tier would this
                      land in? Name one specific question to raise at the
                      HOA meeting — about bias, audits, human review, or
                      appeal.
                    </li>
                    <li>
                      <strong className="text-foreground">R — Reflect:</strong>{" "}
                      What belief about tenant screening would have to
                      change for you to accept this tool, and what would
                      have to change for you to reject it? Knowing both is
                      the calibrated position.
                    </li>
                  </ul>
                  <p className="text-[11px] italic text-muted-foreground/70">
                    Fill in V and G in your head before advancing. There's
                    no single right answer — the point is that you're
                    running the axes, not that you match ours.
                  </p>
                </div>
              ),
            },
            {
              label: "Your turn",
              body: (
                <div className="space-y-3 text-xs">
                  <p>
                    <strong className="text-foreground">Scenario:</strong>{" "}
                    Your child's school is piloting an AI tutoring system
                    that monitors student engagement via webcam — scoring
                    attention, posture, and facial expression during class —
                    and reports "engagement scores" to teachers.
                  </p>
                  <p>
                    Write a full five-axis response. For each letter of the
                    compact — <strong className="text-foreground">U, V, C, G, R</strong> —
                    say what you would actually do, think, or ask. Aim for
                    one or two concrete sentences per axis. Pay special
                    attention to Govern — this is a high-risk deployment
                    in a school, which the EU AI Act flags explicitly.
                  </p>
                  <p className="text-[11px] italic text-muted-foreground/70">
                    There's no auto-grader for this rung. The next step — the
                    personal compact — is where you put this habit into
                    your own words.
                  </p>
                </div>
              ),
            },
          ]}
        />
      )}

      {reachedOrPast("ladder") && stage === "ladder" && (
        <button
          onClick={advance("quiz")}
          className="w-full px-4 py-3 rounded-xl glass border border-white/10 text-sm font-semibold text-foreground hover:border-white/20"
        >
          Continue to the final confidence quiz
        </button>
      )}

      {/* 7. Confidence quiz */}
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

      {/* 8. LLM-graded Compact response */}
      {reachedOrPast("response") && (
        <LLMGradedResponse
          title="Write your personal AI Literacy Compact"
          prompt={
            "In 150+ words, describe your own compact. Include: (1) one principle you'll practice weekly; (2) one class of decision you will REFUSE to use AI for; (3) one specific verification habit you'll install; (4) one civic action — even a small one — you will take; (5) one signal or piece of evidence that would make you update a position. Be specific to your actual life — your job, your household, your community."
          }
          minimumCriteria={4}
          rubric={[
            {
              criterion:
                "Touches all five axes (Understand, Verify, Collaborate, Govern, Reflect — or clear paraphrases).",
              pattern: (text: string) => {
                const t = text.toLowerCase();
                const hits = [
                  /understand|what.*ai|optim|token|model/.test(t),
                  /verif|trace|source|check|confirm/.test(t),
                  /collab|prompt|race|use.*ai|draft/.test(t),
                  /govern|bias|regulat|civic|council|school board|policy/.test(t),
                  /reflect|calibrat|update|change.*mind|don'?t know/.test(t),
                ].filter(Boolean).length;
                return hits >= 4;
              },
              hint: "Cover Understand, Verify, Collaborate, Govern, Reflect — at least four of the five.",
            },
            {
              criterion:
                "Names a specific weekly or recurring practice (e.g. 'every Sunday I…').",
              pattern:
                /\b(weekly|every\s+(week|sunday|monday|morning|night|day)|each\s+week|daily|once\s+a\s+week|routine|habit|ritual)\b/i,
              hint: "Say when you'll do the thing — weekly, every Sunday, each morning, etc.",
            },
            {
              criterion:
                "Names a specific class of decision you will REFUSE to use AI for.",
              pattern:
                /\b(refus|won'?t use|will not use|never use|avoid|without ai|do.*myself|by hand|on my own)\b/i,
              hint: "Name one kind of decision you'll keep off-limits — eulogies, medical, parenting, firing decisions, etc.",
            },
            {
              criterion:
                "Mentions a verification habit (TRACE, sources, double-check, etc.).",
              pattern:
                /\b(trace|verif|source|cite|double[-\s]?check|fact[-\s]?check|confirm|original)\b/i,
              hint: "Say how you'll check specific claims before repeating them.",
            },
            {
              criterion:
                "Mentions a civic or community action (council, board, regulation, vote, letter, advocate).",
              pattern:
                /\b(council|board|regulat|vote|letter|advocat|petition|school|community|public comment|hoa|union|representative|legislator|civic)\b/i,
              hint: "Even 'write my school board one email this year' counts — pick something real.",
            },
            {
              criterion:
                "Names a falsification condition — one signal that would make you update a position.",
              pattern:
                /\b(if\s+i\s+(saw|learned|found|read|heard)|evidence|update|change\s+my\s+mind|would\s+(rethink|reconsider)|falsif|if.*turned out|wrong if|revise)\b/i,
              hint: "What would make you change your mind? 'If I found evidence that…' is the shape.",
            },
          ]}
          onComplete={passed => {
            setCompactPassed(passed);
            setStage("calibration");
          }}
        />
      )}

      {/* 9. Calibration chart + metacognition */}
      {reachedOrPast("calibration") && (
        <div className="space-y-4">
          <CalibrationChart points={metrics.calibration} />
          <div className="glass rounded-2xl p-5 border border-white/8">
            <div className="flex items-center gap-2 mb-2">
              <Target size={14} className="text-[oklch(0.75_0.18_55)]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[oklch(0.75_0.18_55)]">
                On being well-calibrated
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A well-calibrated learner is right about as often as they feel
              sure. If your "confident" bar sits far below the white tick,
              you're overconfident — the exact profile that gets burned by
              fluent-sounding AI answers. If your "guessing" bar is much
              higher than the tick, you know more than you think, and your
              job is to trust your instincts a bit more. Either way, the gap
              is the most useful thing on the chart. It shows you where to
              keep practicing after this course ends.
            </p>
          </div>
          <button
            onClick={advance("graduation")}
            className="w-full px-4 py-3 rounded-xl glass border border-white/10 text-sm font-semibold text-foreground hover:border-white/20"
          >
            See your graduation summary
          </button>
        </div>
      )}

      {/* 10. Graduation card */}
      {reachedOrPast("graduation") && (
        <GraduationCard
          compactPassed={compactPassed}
          onComplete={onComplete}
        />
      )}
    </div>
  );
}

// ─── Graduation card ─────────────────────────────────────────────────────────

function GraduationCard({
  compactPassed,
  onComplete,
}: {
  compactPassed: boolean;
  onComplete: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <div className="glass rounded-2xl p-6 border border-[oklch(0.72_0.18_150_/_0.35)]">
      <div className="flex items-center gap-2 mb-2">
        <Award size={16} className="text-[oklch(0.72_0.18_150)]" />
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-[oklch(0.72_0.18_150)]">
          Graduation · The AI Literacy Compact
        </span>
      </div>
      <h3 className="text-2xl font-semibold text-foreground mb-2 tracking-tight">
        You've earned a short, durable framework.
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-5">
        The models will change. The framework won't. Keep it somewhere you'll
        see it — a sticky note, a pinned document, a phone wallpaper. The
        people who stay clear-eyed about AI are the ones who keep asking the
        same five questions, not the ones who chase every new release.
      </p>

      <div className="space-y-2 mb-5">
        {AXES.map(axis => {
          const Icon = axis.icon;
          const open = expanded === axis.id;
          return (
            <div
              key={axis.id}
              className="rounded-xl border overflow-hidden transition-all"
              style={{
                background: `${axis.color.replace(")", " / 0.05)")}`,
                borderColor: axis.color.replace(")", " / 0.25)"),
              }}
            >
              <button
                onClick={() => setExpanded(open ? null : axis.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{
                    background: axis.color.replace(")", " / 0.15)"),
                    border: `1px solid ${axis.color.replace(")", " / 0.35)")}`,
                  }}
                >
                  <Icon size={14} style={{ color: axis.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground">
                    <span style={{ color: axis.color }}>{axis.letter}</span> —{" "}
                    {axis.label}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {axis.lesson}
                  </div>
                </div>
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md border"
                  style={{
                    color: axis.color,
                    borderColor: axis.color.replace(")", " / 0.35)"),
                  }}
                >
                  Review
                </span>
              </button>
              <AnimatePresence>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-4 pb-3"
                  >
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {axis.blurb}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl bg-[oklch(0.75_0.18_55_/_0.08)] border border-[oklch(0.75_0.18_55_/_0.25)] mb-5">
        <MessageSquare size={14} className="text-[oklch(0.75_0.18_55)] shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground">A parting ask:</strong> one
          concrete civic move in the next thirty days — an email, a comment
          at a school board or council meeting, a question to your employer
          about how AI is used where you work. Small moves compound. This is
          how literacy becomes more than personal.
        </p>
      </div>

      {compactPassed && (
        <div className="flex items-center gap-2 mb-4 text-xs text-[oklch(0.72_0.18_150)] font-semibold">
          <CheckCircle2 size={14} />
          Your personal compact passed the rubric — nice work.
        </div>
      )}

      <button
        onClick={onComplete}
        className="w-full px-5 py-3 rounded-xl bg-[oklch(0.72_0.18_150)] text-black text-sm font-bold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
      >
        <Sparkles size={14} />
        Complete the AI Literacy Course
        <BookOpen size={14} />
      </button>
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="mt-2 w-full inline-flex items-center justify-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
      >
        <RotateCcw size={11} /> Scroll back to the top of Lesson 5
      </button>
    </div>
  );
}
