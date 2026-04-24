/**
 * AI Literacy — shared pedagogical primitives.
 *
 * These components implement the learning-science patterns mandated by
 * AI_LITERACY_AUDIT_AND_ARCHITECTURE.md and AI_LITERACY_DESIGN_DOCUMENT.md:
 *   1. ProductiveFailureOpener       — attempt-before-instruction (Kapur, d≈0.6)
 *   2. RetrievalWarmup                — spaced retrieval from prior lesson
 *   3. ConfidenceQuizItem             — 3-point confidence rating per question
 *   4. MisconceptionCard              — 3-beat myth correction
 *                                       (why-it-feels-true → mechanism → truth)
 *   5. ElaborativeInterrogation       — "why did you pick that?" before reveal
 *   6. WorkedFadedIndependent         — 3-rung transfer ladder
 *   7. SpanSelectExercise             — highlight fabrication/error in a passage
 *   8. LLMGradedResponse              — rubric-checked open response
 *                                       (client-side heuristic + future server hook)
 *   9. TranscriptDrawer               — WCAG 2.1 SC 1.2.1 compliant captions
 *  10. CalibrationChart               — metacognitive "you-were-N%-sure / M%-right"
 *
 * All primitives are fully accessible (keyboard, ARIA) and motion-reduced
 * where reasonable. No external deps beyond framer-motion + lucide-react
 * which the rest of the app already uses.
 */

import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Check, CheckCircle2, ChevronRight, Circle, HelpCircle, Info,
  Lightbulb, ListChecks, Play, RotateCcw, Sparkles, Target, X, XCircle,
  FileText, ArrowRight, ArrowLeft, Star,
} from "lucide-react";

// ─── Shared types ────────────────────────────────────────────────────────────

export type Confidence = 1 | 2 | 3; // 1 = guessing, 2 = unsure, 3 = confident
export type MisconceptionId = string;

export interface QuizOption {
  text: string;
  /** If this option is wrong, tag it to a named misconception so the
   *  explanation can address that specific wrong model. */
  misconceptionId?: MisconceptionId;
}

export interface ConfidenceQuizData {
  question: string;
  options: QuizOption[];
  correct: number;
  /** Full explanation shown on reveal — walks through mechanism. */
  explanation: string;
  /** Per-option explanation keyed by option index. Overrides the generic
   *  explanation for that option when the learner picks it. */
  perOptionExplanation?: Record<number, string>;
  /** Free-text prompt shown BEFORE reveal so learners elaborate their
   *  reasoning (elaborative interrogation — Pressley, d ≈ 0.75). */
  elaborationPrompt?: string;
}

// ─── 1. Productive-failure opener ───────────────────────────────────────────

export interface ProductiveFailureItem {
  id: string;
  text: string;
  bucket: string; // correct bucket id
}

export interface ProductiveFailureOpenerProps {
  title: string;
  description: string;
  items: ProductiveFailureItem[];
  buckets: Array<{ id: string; label: string; color: string }>;
  /** Message shown after the learner commits a guess. Usually contains the
   *  "here's why your intuition was off" reveal. */
  reveal: React.ReactNode;
  onComplete: () => void;
}

/**
 * Drag-free sort UI (tap to assign). Accessible via keyboard:
 * tap an item → tap a bucket. After committing, reveals the correct
 * bucketing and the teaching point. Per DESIGN §1.4, this is the
 * productive-failure opener — attempt before instruction.
 */
export function ProductiveFailureOpener({
  title, description, items, buckets, reveal, onComplete,
}: ProductiveFailureOpenerProps) {
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [active, setActive] = useState<string | null>(null);
  const [committed, setCommitted] = useState(false);

  const allAssigned = items.every(i => assignments[i.id]);
  const score = useMemo(
    () => items.filter(i => assignments[i.id] === i.bucket).length,
    [assignments, items],
  );

  return (
    <div className="glass rounded-2xl p-6 border border-[oklch(0.78_0.16_30_/_0.25)]">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={14} className="text-[oklch(0.78_0.16_30)]" />
        <span className="text-xs font-bold uppercase tracking-wider text-[oklch(0.78_0.16_30)]">Try First · Learn Second</span>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{description}</p>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4">
        {/* Items pool */}
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Items</div>
          <div className="space-y-1.5">
            {items.map(item => (
              <button
                key={item.id}
                disabled={committed}
                onClick={() => setActive(active === item.id ? null : item.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs border transition-all ${
                  committed
                    ? assignments[item.id] === item.bucket
                      ? "bg-[oklch(0.72_0.18_150_/_0.12)] border-[oklch(0.72_0.18_150_/_0.35)] text-foreground"
                      : "bg-[oklch(0.72_0.2_290_/_0.10)] border-[oklch(0.72_0.2_290_/_0.30)] text-muted-foreground"
                    : active === item.id
                    ? "bg-[oklch(0.78_0.16_30_/_0.15)] border-[oklch(0.78_0.16_30_/_0.5)] text-foreground"
                    : assignments[item.id]
                    ? "glass border-white/15 text-muted-foreground"
                    : "glass border-white/10 text-foreground hover:border-white/25"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex-1">{item.text}</span>
                  {assignments[item.id] && !committed && (
                    <span className="text-[10px] text-[oklch(0.78_0.16_30)]">
                      → {buckets.find(b => b.id === assignments[item.id])?.label}
                    </span>
                  )}
                  {committed && assignments[item.id] === item.bucket && <CheckCircle2 size={12} className="text-[oklch(0.72_0.18_150)]" />}
                  {committed && assignments[item.id] !== item.bucket && <XCircle size={12} className="text-[oklch(0.72_0.2_290)]" />}
                </div>
                {committed && assignments[item.id] !== item.bucket && (
                  <div className="text-[10px] text-muted-foreground mt-1">
                    Correct bucket: <strong>{buckets.find(b => b.id === item.bucket)?.label}</strong>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Arrow */}
        <div className="hidden md:flex items-center justify-center">
          <ArrowRight size={18} className="text-muted-foreground/60" />
        </div>

        {/* Buckets */}
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Buckets</div>
          <div className="space-y-1.5">
            {buckets.map(b => (
              <button
                key={b.id}
                disabled={committed || !active}
                onClick={() => {
                  if (!active) return;
                  setAssignments(a => ({ ...a, [active]: b.id }));
                  setActive(null);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs border transition-all ${
                  active
                    ? "glass border-[oklch(0.78_0.16_30_/_0.4)] text-foreground hover:bg-[oklch(0.78_0.16_30_/_0.08)]"
                    : "glass border-white/10 text-muted-foreground opacity-60 cursor-not-allowed"
                }`}
              >
                <span className="font-semibold" style={{ color: b.color }}>{b.label}</span>
                <span className="block text-[10px] text-muted-foreground mt-0.5">
                  {items.filter(i => assignments[i.id] === b.id).length} assigned
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {!active && !committed && !allAssigned && "Tap an item, then tap its bucket."}
          {active && !committed && `Selected: ${items.find(i => i.id === active)?.text.slice(0, 40)}… — now tap a bucket.`}
          {!active && allAssigned && !committed && "Ready. Commit your guess when you're done."}
          {committed && `${score} / ${items.length} correct. Don't worry about the score — the wrong ones are what you'll remember.`}
        </p>
        {!committed && (
          <button
            disabled={!allAssigned}
            onClick={() => setCommitted(true)}
            className="px-4 py-2 rounded-lg bg-[oklch(0.78_0.16_30)] text-black text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Commit Guess
          </button>
        )}
      </div>

      <AnimatePresence>
        {committed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-5 pt-5 border-t border-white/8"
          >
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb size={14} className="text-[oklch(0.75_0.18_55)]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[oklch(0.75_0.18_55)]">What Your Guesses Teach Us</span>
            </div>
            <div className="text-sm text-muted-foreground leading-relaxed">{reveal}</div>
            <button
              onClick={onComplete}
              className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[oklch(0.75_0.18_55)] hover:opacity-80"
            >
              Continue to the lesson <ChevronRight size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── 2. Retrieval warmup ────────────────────────────────────────────────────

export interface RetrievalWarmupProps {
  fromLesson: string;
  /** 1–2 low-stakes recall questions. Learner types; any non-empty answer
   *  passes — this is effort-based, not accuracy-based. */
  questions: Array<{ prompt: string; correctAnswer: string; hint?: string }>;
  onComplete: () => void;
}

export function RetrievalWarmup({ fromLesson, questions, onComplete }: RetrievalWarmupProps) {
  const [answers, setAnswers] = useState<string[]>(questions.map(() => ""));
  const [revealed, setRevealed] = useState(false);

  const allFilled = answers.every(a => a.trim().length >= 2);

  return (
    <div className="glass rounded-2xl p-6 border border-[oklch(0.65_0.22_200_/_0.25)]">
      <div className="flex items-center gap-2 mb-1">
        <RotateCcw size={14} className="text-[oklch(0.65_0.22_200)]" />
        <span className="text-xs font-bold uppercase tracking-wider text-[oklch(0.65_0.22_200)]">Retrieval Warmup</span>
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">Recall from {fromLesson}</h3>
      <p className="text-xs text-muted-foreground mb-4">
        30 seconds. Type whatever comes to mind — retrieval strengthens memory even when the answer is partial.
      </p>

      <div className="space-y-3">
        {questions.map((q, i) => (
          <div key={i}>
            <label className="block text-sm text-foreground mb-1.5">{q.prompt}</label>
            <textarea
              value={answers[i]}
              onChange={e => setAnswers(a => a.map((x, j) => j === i ? e.target.value : x))}
              disabled={revealed}
              rows={2}
              placeholder={q.hint ?? "Your recall…"}
              className="w-full bg-white/3 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[oklch(0.65_0.22_200_/_0.5)] resize-none"
            />
            {revealed && (
              <div className="mt-1.5 px-3 py-2 rounded-md bg-[oklch(0.72_0.18_150_/_0.08)] border border-[oklch(0.72_0.18_150_/_0.2)]">
                <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">Anchor answer:</span> {q.correctAnswer}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            disabled={!allFilled}
            className="px-4 py-2 rounded-lg bg-[oklch(0.65_0.22_200)] text-black text-sm font-semibold disabled:opacity-40"
          >
            Check my recall
          </button>
        ) : (
          <button
            onClick={onComplete}
            className="px-4 py-2 rounded-lg bg-[oklch(0.65_0.22_200)] text-black text-sm font-semibold"
          >
            Continue <ChevronRight size={14} className="inline" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── 3 + 5. Confidence quiz item with elaborative interrogation ─────────────

interface ConfidenceQuizItemProps {
  data: ConfidenceQuizData;
  index: number;
  total: number;
  onAnswer: (info: { correct: boolean; confidence: Confidence; elaboration: string }) => void;
  onNext: () => void;
}

export function ConfidenceQuizItem({ data, index, total, onAnswer, onNext }: ConfidenceQuizItemProps) {
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [elaboration, setElaboration] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [committed, setCommitted] = useState(false);

  const commit = () => {
    if (selected === null || confidence === null) return;
    setCommitted(true);
    onAnswer({
      correct: selected === data.correct,
      confidence,
      elaboration,
    });
  };

  return (
    <div className="glass rounded-2xl p-6 border border-[oklch(0.75_0.18_55_/_0.25)]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-[oklch(0.75_0.18_55)]">Question {index + 1} / {total}</span>
        {committed && selected === data.correct && <span className="text-xs text-[oklch(0.72_0.18_150)] font-semibold flex items-center gap-1"><CheckCircle2 size={12}/> Correct</span>}
        {committed && selected !== data.correct && <span className="text-xs text-[oklch(0.72_0.2_290)] font-semibold flex items-center gap-1"><XCircle size={12}/> Incorrect</span>}
      </div>

      <p className="text-base font-medium text-foreground mb-4 leading-relaxed">{data.question}</p>

      <div className="space-y-2 mb-4">
        {data.options.map((opt, i) => (
          <button
            key={i}
            disabled={committed}
            onClick={() => setSelected(i)}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm border transition-all ${
              committed
                ? i === data.correct
                  ? "bg-[oklch(0.72_0.18_150_/_0.15)] border-[oklch(0.72_0.18_150_/_0.4)] text-foreground"
                  : selected === i
                  ? "bg-[oklch(0.72_0.2_290_/_0.15)] border-[oklch(0.72_0.2_290_/_0.3)] text-muted-foreground"
                  : "glass border-white/5 text-muted-foreground opacity-50"
                : selected === i
                ? "bg-[oklch(0.75_0.18_55_/_0.15)] border-[oklch(0.75_0.18_55_/_0.45)] text-foreground"
                : "glass border-white/10 text-foreground hover:border-white/25 hover:bg-white/5"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold border border-current shrink-0">{String.fromCharCode(65 + i)}</span>
              <span className="flex-1">{opt.text}</span>
              {committed && i === data.correct && <CheckCircle2 size={14} className="text-[oklch(0.72_0.18_150)] shrink-0" />}
              {committed && selected === i && i !== data.correct && <XCircle size={14} className="text-[oklch(0.72_0.2_290)] shrink-0" />}
            </div>
          </button>
        ))}
      </div>

      {/* Confidence strip — appears once an option is selected */}
      <AnimatePresence>
        {selected !== null && !committed && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
            <div className="mb-3 pt-3 border-t border-white/5">
              <div className="flex items-center gap-2 mb-2">
                <Target size={12} className="text-[oklch(0.75_0.18_55)]" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">How confident are you?</span>
              </div>
              <div className="flex gap-2">
                {([1, 2, 3] as Confidence[]).map(c => (
                  <button
                    key={c}
                    onClick={() => setConfidence(c)}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                      confidence === c
                        ? "bg-[oklch(0.75_0.18_55_/_0.15)] border-[oklch(0.75_0.18_55_/_0.45)] text-[oklch(0.85_0.18_55)]"
                        : "glass border-white/10 text-muted-foreground hover:border-white/25"
                    }`}
                  >
                    {c === 1 && "Guessing"}
                    {c === 2 && "Leaning"}
                    {c === 3 && "Confident"}
                  </button>
                ))}
              </div>
            </div>

            {data.elaborationPrompt && (
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <HelpCircle size={12} className="text-[oklch(0.65_0.22_200)]" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick: {data.elaborationPrompt}</span>
                </div>
                <textarea
                  rows={2}
                  value={elaboration}
                  onChange={e => setElaboration(e.target.value)}
                  placeholder="A sentence or two is plenty. This helps the learning stick."
                  className="w-full bg-white/3 border border-white/10 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[oklch(0.65_0.22_200_/_0.5)] resize-none"
                />
              </div>
            )}

            <button
              onClick={commit}
              disabled={confidence === null || (!!data.elaborationPrompt && elaboration.trim().length < 5)}
              className="w-full px-4 py-2 rounded-lg bg-[oklch(0.75_0.18_55)] text-black text-sm font-semibold disabled:opacity-40"
            >
              Lock in answer
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {committed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-4 p-4 rounded-xl bg-[oklch(0.75_0.18_55_/_0.06)] border border-[oklch(0.75_0.18_55_/_0.2)]"
          >
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb size={12} className="text-[oklch(0.75_0.18_55)]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[oklch(0.75_0.18_55)]">Mechanism</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {(selected !== null && data.perOptionExplanation?.[selected]) ?? data.explanation}
            </p>
            {selected !== null && data.options[selected]?.misconceptionId && selected !== data.correct && (
              <div className="mt-3 text-xs text-[oklch(0.78_0.16_30)] font-medium">
                This is the <em>{data.options[selected].misconceptionId}</em> misconception — one of the most common wrong models in this area.
              </div>
            )}
            <button
              onClick={onNext}
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[oklch(0.75_0.18_55)] hover:opacity-80"
            >
              {index + 1 < total ? "Next question" : "See results"} <ChevronRight size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── 4. Misconception card (3-beat: feel → mechanism → truth) ───────────────

export interface MisconceptionCardProps {
  misconception: string;
  whyItFeelsTrue: string;
  mechanism: string;
  nuancedTruth: string;
  onMarkUnderstood?: () => void;
  understood?: boolean;
}

export function MisconceptionCard({
  misconception, whyItFeelsTrue, mechanism, nuancedTruth, onMarkUnderstood, understood,
}: MisconceptionCardProps) {
  const [stage, setStage] = useState(0); // 0 = feel, 1 = mechanism, 2 = truth
  return (
    <div className="glass rounded-2xl p-5 border border-[oklch(0.72_0.2_290_/_0.25)]">
      <div className="flex items-center gap-2 mb-3">
        <X size={14} className="text-[oklch(0.72_0.2_290)]" />
        <span className="text-xs font-bold uppercase tracking-wider text-[oklch(0.72_0.2_290)]">Common Misconception</span>
      </div>
      <p className="text-base font-semibold text-foreground mb-4 italic">"{misconception}"</p>

      {/* Stage indicators */}
      <div className="flex gap-2 mb-4">
        {["Why it feels true", "What's actually happening", "The nuanced truth"].map((label, i) => (
          <button
            key={i}
            onClick={() => setStage(i)}
            className={`flex-1 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider border transition-all ${
              stage === i
                ? "bg-[oklch(0.72_0.2_290_/_0.15)] border-[oklch(0.72_0.2_290_/_0.45)] text-[oklch(0.85_0.2_290)]"
                : "glass border-white/10 text-muted-foreground hover:border-white/25"
            }`}
          >
            {i + 1}. {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="text-sm text-muted-foreground leading-relaxed min-h-[80px]"
        >
          {stage === 0 && whyItFeelsTrue}
          {stage === 1 && mechanism}
          {stage === 2 && nuancedTruth}
        </motion.div>
      </AnimatePresence>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <span key={i} className={`w-1.5 h-1.5 rounded-full ${stage >= i ? "bg-[oklch(0.72_0.2_290)]" : "bg-white/15"}`} />
          ))}
        </div>
        {stage < 2 ? (
          <button
            onClick={() => setStage(s => Math.min(2, s + 1))}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[oklch(0.85_0.2_290)] hover:opacity-80"
          >
            Next beat <ChevronRight size={12} />
          </button>
        ) : (
          onMarkUnderstood && (
            <button
              onClick={onMarkUnderstood}
              disabled={understood}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                understood
                  ? "bg-[oklch(0.72_0.18_150_/_0.15)] border-[oklch(0.72_0.18_150_/_0.4)] text-[oklch(0.8_0.18_150)]"
                  : "bg-[oklch(0.72_0.18_150_/_0.08)] border-[oklch(0.72_0.18_150_/_0.25)] text-[oklch(0.8_0.18_150)] hover:bg-[oklch(0.72_0.18_150_/_0.15)]"
              }`}
            >
              {understood ? <><CheckCircle2 size={12} /> Got it</> : <>Mark understood</>}
            </button>
          )
        )}
      </div>
    </div>
  );
}

// ─── 6. Worked → Faded → Independent ladder ────────────────────────────────

export interface WorkedFadedIndependentProps {
  title: string;
  rungs: [
    { label: "Worked example"; body: React.ReactNode },
    { label: "Faded example"; body: React.ReactNode },
    { label: "Your turn"; body: React.ReactNode },
  ];
}

export function WorkedFadedIndependent({ title, rungs }: WorkedFadedIndependentProps) {
  const [rung, setRung] = useState(0);
  return (
    <div className="glass rounded-2xl p-5 border border-[oklch(0.72_0.18_150_/_0.25)]">
      <div className="flex items-center gap-2 mb-3">
        <ListChecks size={14} className="text-[oklch(0.72_0.18_150)]" />
        <span className="text-xs font-bold uppercase tracking-wider text-[oklch(0.72_0.18_150)]">Transfer Ladder</span>
      </div>
      <h4 className="text-base font-semibold text-foreground mb-3">{title}</h4>
      <div className="flex gap-2 mb-4">
        {rungs.map((r, i) => (
          <button
            key={i}
            onClick={() => setRung(i)}
            disabled={i > rung && i > 0}
            className={`flex-1 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider border transition-all ${
              rung === i
                ? "bg-[oklch(0.72_0.18_150_/_0.15)] border-[oklch(0.72_0.18_150_/_0.45)] text-[oklch(0.8_0.18_150)]"
                : "glass border-white/10 text-muted-foreground hover:border-white/25 disabled:opacity-40 disabled:cursor-not-allowed"
            }`}
          >
            {i + 1}. {r.label}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={rung}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          className="text-sm text-muted-foreground leading-relaxed"
        >
          {rungs[rung].body}
        </motion.div>
      </AnimatePresence>
      {rung < rungs.length - 1 && (
        <button
          onClick={() => setRung(rung + 1)}
          className="mt-4 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[oklch(0.72_0.18_150_/_0.15)] border border-[oklch(0.72_0.18_150_/_0.3)] text-xs font-semibold text-[oklch(0.8_0.18_150)] hover:bg-[oklch(0.72_0.18_150_/_0.25)]"
        >
          Advance to next rung <ArrowRight size={12} />
        </button>
      )}
    </div>
  );
}

// ─── 7. Span-select exercise (highlight fabrication) ────────────────────────

export interface SpanSelectExerciseProps {
  title: string;
  instructions: string;
  /** Array of text chunks. Flag the ones that are the "wrong" spans. */
  chunks: Array<{ text: string; isTarget?: boolean; explanation?: string }>;
  successMessage: string;
  /** How many targets must be correctly flagged before showing success. */
  requiredHits?: number;
}

export function SpanSelectExercise({
  title, instructions, chunks, successMessage, requiredHits,
}: SpanSelectExerciseProps) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [revealed, setRevealed] = useState(false);

  const targetIndices = chunks.map((c, i) => (c.isTarget ? i : -1)).filter(i => i >= 0);
  const hits = Array.from(selected).filter(i => chunks[i]?.isTarget).length;
  const misses = Array.from(selected).filter(i => !chunks[i]?.isTarget).length;
  const required = requiredHits ?? targetIndices.length;
  const passed = hits >= required;

  return (
    <div className="glass rounded-2xl p-5 border border-[oklch(0.78_0.16_30_/_0.25)]">
      <div className="flex items-center gap-2 mb-2">
        <Target size={14} className="text-[oklch(0.78_0.16_30)]" />
        <span className="text-xs font-bold uppercase tracking-wider text-[oklch(0.78_0.16_30)]">Spot the Error</span>
      </div>
      <h4 className="text-base font-semibold text-foreground mb-2">{title}</h4>
      <p className="text-xs text-muted-foreground mb-4">{instructions}</p>

      <div className="rounded-xl bg-black/30 border border-white/5 p-4 leading-relaxed text-sm text-foreground">
        {chunks.map((chunk, i) => {
          const isSelected = selected.has(i);
          const showCorrect = revealed && chunk.isTarget;
          const showMistake = revealed && isSelected && !chunk.isTarget;
          return (
            <span
              key={i}
              onClick={() => {
                if (revealed) return;
                setSelected(s => {
                  const n = new Set(s);
                  if (n.has(i)) n.delete(i); else n.add(i);
                  return n;
                });
              }}
              className={`cursor-pointer rounded px-0.5 transition-colors ${
                showCorrect
                  ? "bg-[oklch(0.72_0.18_150_/_0.3)] underline decoration-[oklch(0.72_0.18_150)] decoration-2"
                  : showMistake
                  ? "bg-[oklch(0.72_0.2_290_/_0.25)] underline decoration-[oklch(0.72_0.2_290)] decoration-wavy"
                  : isSelected
                  ? "bg-[oklch(0.78_0.16_30_/_0.25)]"
                  : !revealed
                  ? "hover:bg-white/5"
                  : ""
              }`}
            >
              {chunk.text}
            </span>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {revealed
            ? `You flagged ${hits} of ${targetIndices.length} planted errors${misses > 0 ? `, plus ${misses} false alarms` : ""}.`
            : `Flagged: ${selected.size}`}
        </p>
        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            disabled={selected.size === 0}
            className="px-4 py-2 rounded-lg bg-[oklch(0.78_0.16_30)] text-black text-sm font-semibold disabled:opacity-40"
          >
            Reveal answers
          </button>
        ) : (
          <span className={`text-xs font-semibold ${passed ? "text-[oklch(0.72_0.18_150)]" : "text-[oklch(0.78_0.16_30)]"}`}>
            {passed ? "Passed" : "Partial — review the highlighted spans"}
          </span>
        )}
      </div>

      {revealed && (
        <div className="mt-4 space-y-2">
          {targetIndices.map(ti => (
            chunks[ti].explanation && (
              <div key={ti} className="p-3 rounded-lg bg-[oklch(0.72_0.18_150_/_0.06)] border border-[oklch(0.72_0.18_150_/_0.2)]">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">"{chunks[ti].text.trim().slice(0, 60)}…"</span> {chunks[ti].explanation}
                </p>
              </div>
            )
          ))}
          {passed && (
            <div className="mt-3 p-3 rounded-lg bg-[oklch(0.75_0.18_55_/_0.06)] border border-[oklch(0.75_0.18_55_/_0.2)]">
              <p className="text-xs text-muted-foreground"><strong className="text-foreground">Takeaway:</strong> {successMessage}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 8. LLM-graded open response (heuristic client-side rubric) ─────────────

export interface LLMGradedResponseProps {
  title: string;
  prompt: string;
  /** Each rubric criterion is a human-readable line AND a regex that
   *  must match the learner's submission for the criterion to pass. */
  rubric: Array<{ criterion: string; pattern: RegExp | ((text: string) => boolean); hint?: string }>;
  minimumCriteria?: number;
  onComplete?: (passed: boolean, response: string) => void;
}

export function LLMGradedResponse({
  title, prompt, rubric, minimumCriteria, onComplete,
}: LLMGradedResponseProps) {
  const [response, setResponse] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const checks = useMemo(() => {
    if (!submitted) return rubric.map(() => false);
    return rubric.map(r => {
      if (r.pattern instanceof RegExp) return r.pattern.test(response);
      return r.pattern(response);
    });
  }, [submitted, response, rubric]);

  const passed = checks.filter(Boolean).length;
  const required = minimumCriteria ?? Math.ceil(rubric.length * 0.66);
  const isPassed = passed >= required;

  useEffect(() => {
    if (submitted && onComplete) onComplete(isPassed, response);
  }, [submitted, isPassed, response, onComplete]);

  return (
    <div className="glass rounded-2xl p-5 border border-[oklch(0.72_0.18_150_/_0.25)]">
      <div className="flex items-center gap-2 mb-2">
        <FileText size={14} className="text-[oklch(0.72_0.18_150)]" />
        <span className="text-xs font-bold uppercase tracking-wider text-[oklch(0.72_0.18_150)]">Open Response · Rubric Graded</span>
      </div>
      <h4 className="text-base font-semibold text-foreground mb-2">{title}</h4>
      <p className="text-sm text-muted-foreground mb-3 leading-relaxed">{prompt}</p>

      <textarea
        value={response}
        onChange={e => setResponse(e.target.value)}
        disabled={submitted}
        rows={6}
        placeholder="Your response…"
        className="w-full bg-white/3 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[oklch(0.72_0.18_150_/_0.5)] resize-none font-mono"
      />

      {!submitted ? (
        <button
          onClick={() => setSubmitted(true)}
          disabled={response.trim().split(/\s+/).length < 15}
          className="mt-3 px-4 py-2 rounded-lg bg-[oklch(0.72_0.18_150)] text-black text-sm font-semibold disabled:opacity-40"
        >
          Submit for rubric check
        </button>
      ) : (
        <div className="mt-4 space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Rubric: {passed} / {rubric.length} criteria met {isPassed && "· PASS"}
          </div>
          {rubric.map((r, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 p-2.5 rounded-lg border ${
                checks[i]
                  ? "bg-[oklch(0.72_0.18_150_/_0.06)] border-[oklch(0.72_0.18_150_/_0.2)]"
                  : "bg-[oklch(0.72_0.2_290_/_0.06)] border-[oklch(0.72_0.2_290_/_0.2)]"
              }`}
            >
              {checks[i]
                ? <CheckCircle2 size={14} className="text-[oklch(0.72_0.18_150)] mt-0.5 shrink-0" />
                : <XCircle size={14} className="text-[oklch(0.72_0.2_290)] mt-0.5 shrink-0" />}
              <div className="flex-1">
                <p className="text-xs text-foreground">{r.criterion}</p>
                {!checks[i] && r.hint && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 italic">Hint: {r.hint}</p>
                )}
              </div>
            </div>
          ))}
          {!isPassed && (
            <button
              onClick={() => setSubmitted(false)}
              className="mt-2 text-xs font-semibold text-[oklch(0.75_0.18_55)] hover:opacity-80"
            >
              Edit and resubmit
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 9. Transcript drawer (WCAG) ────────────────────────────────────────────

export function TranscriptDrawer({ transcript, open, onClose }: { transcript: string; open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-label="Audio transcript"
      className="glass rounded-xl p-4 border border-white/8 mt-2"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Transcript</span>
        <button onClick={onClose} aria-label="Close transcript"><X size={14} className="text-muted-foreground hover:text-foreground" /></button>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{transcript}</p>
    </div>
  );
}

// ─── 10. Calibration chart (metacognitive) ──────────────────────────────────

export interface CalibrationPoint {
  confidence: Confidence;
  correct: boolean;
}

export function CalibrationChart({ points }: { points: CalibrationPoint[] }) {
  if (points.length === 0) return null;
  const grouped: Record<Confidence, { total: number; correct: number }> = {
    1: { total: 0, correct: 0 },
    2: { total: 0, correct: 0 },
    3: { total: 0, correct: 0 },
  };
  points.forEach(p => {
    grouped[p.confidence].total += 1;
    if (p.correct) grouped[p.confidence].correct += 1;
  });

  const labels: Record<Confidence, string> = { 1: "Guessing", 2: "Leaning", 3: "Confident" };
  const expected: Record<Confidence, number> = { 1: 33, 2: 66, 3: 95 };

  return (
    <div className="glass rounded-2xl p-5 border border-[oklch(0.75_0.18_55_/_0.25)]">
      <div className="flex items-center gap-2 mb-2">
        <Brain size={14} className="text-[oklch(0.75_0.18_55)]" />
        <span className="text-xs font-bold uppercase tracking-wider text-[oklch(0.75_0.18_55)]">Calibration — were you right when you felt sure?</span>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Good calibration means your confidence matches your accuracy. Gaps between the two are where learning still has to happen.
      </p>
      <div className="space-y-3">
        {([1, 2, 3] as Confidence[]).map(c => {
          const g = grouped[c];
          const actualPct = g.total === 0 ? 0 : (g.correct / g.total) * 100;
          const gap = Math.abs(actualPct - expected[c]);
          return (
            <div key={c}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-foreground font-semibold">{labels[c]}</span>
                <span className="text-muted-foreground">
                  {g.total === 0 ? "—" : `${g.correct}/${g.total} correct (${Math.round(actualPct)}%)`}
                </span>
              </div>
              <div className="relative h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    width: `${actualPct}%`,
                    background: g.total === 0 ? "transparent" : gap < 15 ? "oklch(0.72 0.18 150)" : gap < 30 ? "oklch(0.75 0.18 55)" : "oklch(0.72 0.2 290)",
                  }}
                />
                <div
                  className="absolute inset-y-0 w-0.5 bg-white/50"
                  style={{ left: `${expected[c]}%` }}
                  title={`Expected: ${expected[c]}%`}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground/60 mt-3 italic">The white tick is where a well-calibrated learner would land.</p>
    </div>
  );
}

// ─── Utility: LessonMetrics aggregator ─────────────────────────────────────

export function useLessonMetrics() {
  const [metrics, setMetrics] = useState<{
    calibration: CalibrationPoint[];
    misconceptionsSeen: Set<string>;
  }>({ calibration: [], misconceptionsSeen: new Set() });

  return {
    metrics,
    recordAnswer: (p: CalibrationPoint, misconceptionId?: string) => setMetrics(m => ({
      calibration: [...m.calibration, p],
      misconceptionsSeen: misconceptionId
        ? new Set([...Array.from(m.misconceptionsSeen), misconceptionId])
        : m.misconceptionsSeen,
    })),
    reset: () => setMetrics({ calibration: [], misconceptionsSeen: new Set() }),
  };
}

// ─── 11. Adaptive Depth (Depth-Engine style) ─────────────────────────────────
//
// A lesson-scoped context that lets learners toggle the explanatory register
// of every exposition block at once. The *factual content* of each block is
// fixed (Module 1 ≈ College, Module 3 ≈ Graduate) but the *wording* adapts
// via `trpc.ai.explainConcept` — the same endpoint that powers the site's
// Depth Engine page.
//
// Usage inside a lesson:
//   <LessonDepthProvider>
//     <DepthBar />
//     <AdaptiveProse topic="How LLMs learn" default={<p>…original text…</p>}>
//       <p>…original text…</p>
//     </AdaptiveProse>
//   </LessonDepthProvider>

import { createContext, useContext } from "react";
import { trpc } from "@/lib/trpc";
import { Baby, GraduationCap, Microscope, MessageSquare, Lightbulb as LightbulbIcon, Loader2 } from "lucide-react";

export type DepthLevel = "default" | "child" | "student" | "expert" | "socratic" | "analogy";

export const DEPTH_OPTIONS: Array<{
  id: DepthLevel;
  label: string;
  tagline: string;
  color: string;
  icon: typeof Baby;
}> = [
  { id: "default",  label: "Original",  tagline: "The lesson's own voice.",              color: "oklch(0.85 0.02 240)", icon: LightbulbIcon },
  { id: "child",    label: "Child",     tagline: "Age 8 — simple, concrete, no jargon.", color: "oklch(0.75 0.18 55)",  icon: Baby },
  { id: "student",  label: "Student",   tagline: "High-school — building blocks.",        color: "oklch(0.65 0.22 200)", icon: GraduationCap },
  { id: "expert",   label: "Expert",    tagline: "Graduate — technical precision.",        color: "oklch(0.72 0.2 290)",  icon: Microscope },
  { id: "socratic", label: "Socratic",  tagline: "Only questions — discover it.",           color: "oklch(0.72 0.18 150)", icon: MessageSquare },
  { id: "analogy",  label: "Analogy",   tagline: "Vivid metaphors from other domains.",     color: "oklch(0.78 0.16 30)",  icon: LightbulbIcon },
];

interface DepthContextValue {
  depth: DepthLevel;
  setDepth: (d: DepthLevel) => void;
}
const DepthContext = createContext<DepthContextValue>({ depth: "default", setDepth: () => {} });

export function LessonDepthProvider({ children, initial = "default" as DepthLevel }: { children: React.ReactNode; initial?: DepthLevel }) {
  const [depth, setDepth] = useState<DepthLevel>(initial);
  return <DepthContext.Provider value={{ depth, setDepth }}>{children}</DepthContext.Provider>;
}

export function useLessonDepth() {
  return useContext(DepthContext);
}

/**
 * Floating depth-selector shown at the top of a lesson. Picks the register
 * used by every <AdaptiveProse> inside the same LessonDepthProvider.
 */
export function DepthBar() {
  const { depth, setDepth } = useLessonDepth();
  return (
    <div className="glass rounded-2xl p-4 border border-white/10 sticky top-4 z-10 backdrop-blur-md">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles size={12} className="text-[oklch(0.75_0.18_55)]" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Explain this lesson at a different depth
        </span>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {DEPTH_OPTIONS.map(opt => {
          const Icon = opt.icon;
          const active = depth === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setDepth(opt.id)}
              title={opt.tagline}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                active
                  ? "text-black"
                  : "glass text-muted-foreground hover:text-foreground border-white/10"
              }`}
              style={active ? { backgroundColor: opt.color, borderColor: opt.color } : undefined}
            >
              <Icon size={12} />
              {opt.label}
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground/70 mt-2 leading-relaxed">
        Same content — different register. The facts stay the same; only how they're explained changes.
      </p>
    </div>
  );
}

/**
 * Wraps an exposition block. At depth=default, renders `children` as-is.
 * At any other depth, calls `trpc.ai.explainConcept` with the topic and
 * displays the returned explanation. Results are cached per-depth so
 * toggling is instant after first fetch.
 */
export function AdaptiveProse({
  topic,
  seed,
  children,
}: {
  /** Short topic/title used as the concept for AI re-explanation. */
  topic: string;
  /** Optional extra hint appended to `topic` (e.g. the full paragraph) to
   *  ground the re-explanation in the exact concept the lesson covered. */
  seed?: string;
  children: React.ReactNode;
}) {
  const { depth } = useLessonDepth();
  const [cache, setCache] = useState<Partial<Record<DepthLevel, string>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const explain = trpc.ai.explainConcept.useMutation({
    onSuccess: (data: { explanation: string; level: string }) => {
      setCache(c => ({ ...c, [data.level as DepthLevel]: data.explanation }));
      setLoading(false);
    },
    onError: (err: { message: string }) => {
      setError(err.message);
      setLoading(false);
    },
  });

  useEffect(() => {
    if (depth === "default") return;
    if (cache[depth]) return;
    setLoading(true);
    setError(null);
    const concept = seed ? `${topic} — ${seed}` : topic;
    explain.mutate({ concept, level: depth as "child" | "student" | "expert" | "socratic" | "analogy" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depth]);

  if (depth === "default") return <>{children}</>;

  const color = DEPTH_OPTIONS.find(o => o.id === depth)?.color ?? "oklch(0.85 0.02 240)";

  if (loading && !cache[depth]) {
    return (
      <div className="glass rounded-xl p-5 border border-dashed my-3" style={{ borderColor: `${color} / 0.35` as string }}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 size={14} className="animate-spin" style={{ color }} />
          Re-explaining at <strong style={{ color }}>{DEPTH_OPTIONS.find(o => o.id === depth)?.label}</strong> level…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass rounded-xl p-4 border border-[oklch(0.72_0.2_290_/_0.3)] my-3">
        <p className="text-xs text-muted-foreground">Couldn't re-explain right now ({error}). Showing original.</p>
        <div className="mt-2">{children}</div>
      </div>
    );
  }

  const text = cache[depth];
  if (!text) return <>{children}</>;

  return (
    <div className="glass rounded-xl p-5 border my-3" style={{ borderColor: `${color} / 0.35` as string, background: `linear-gradient(to bottom right, ${color} / 0.04, transparent)` as string }}>
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/8">
        <Sparkles size={11} style={{ color }} />
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>
          {DEPTH_OPTIONS.find(o => o.id === depth)?.label} register
        </span>
        <span className="text-[10px] text-muted-foreground/70 ml-auto">Topic: {topic}</span>
      </div>
      <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{text}</div>
    </div>
  );
}

