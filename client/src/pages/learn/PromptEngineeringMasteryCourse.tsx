import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  ClipboardList,
  Copy,
  Gauge,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

type QuizQuestion = {
  question: string;
  options: string[];
  correct: number;
  rationale: string;
};

const modules = [
  {
    id: "m1",
    title: "Module 1: Precision Prompting",
    summary: "Move from vague requests to controlled, testable instructions.",
  },
  {
    id: "m2",
    title: "Module 2: Context Architecture",
    summary: "Design context windows, example blocks, and constraints that steer outputs reliably.",
  },
  {
    id: "m3",
    title: "Module 3: Evaluation & Iteration",
    summary: "Build prompt scorecards and improve quality through measurable iteration loops.",
  },
  {
    id: "m4",
    title: "Module 4: Robustness & Safety",
    summary: "Harden prompts against failure modes, policy leakage, and adversarial inputs.",
  },
];

const evaluationSamples = [
  {
    id: "sample-a",
    label: "Output A",
    text: "The recommendation is to improve retention by making UX cleaner and communicating value more clearly.",
  },
  {
    id: "sample-b",
    label: "Output B",
    text: "Retention is down 12% among new users. Prioritize: 1) reduce time-to-first-value below 90 seconds, 2) trigger a 24-hour activation email with one-click return, 3) instrument cohort-level churn by onboarding branch. Report KPI deltas weekly.",
  },
  {
    id: "sample-c",
    label: "Output C",
    text: "You should maybe focus on onboarding, support, and maybe a loyalty thing. Different customers are different, so try a few experiments.",
  },
];

const quizQuestions: QuizQuestion[] = [
  {
    question: "Which element most directly improves reproducibility?",
    options: [
      "Adding more adjectives",
      "Explicit output schema + acceptance criteria",
      "Asking for creativity",
      "Using a longer prompt by default",
    ],
    correct: 1,
    rationale: "Reproducibility improves when output structure and quality thresholds are unambiguous.",
  },
  {
    question: "What is the best first move when a prompt fails inconsistently?",
    options: [
      "Increase temperature immediately",
      "Add more system instructions only",
      "Create a failure taxonomy and isolate one variable per revision",
      "Switch models without measuring baselines",
    ],
    correct: 2,
    rationale: "Controlled iteration requires isolating variables and classifying failures before random changes.",
  },
  {
    question: "Few-shot examples are most useful when they:",
    options: [
      "Contain diverse but inconsistent formats",
      "Demonstrate the exact style and decision boundary you need",
      "Are as short as possible",
      "Replace all task instructions",
    ],
    correct: 1,
    rationale: "High-signal examples define desired behavior and edge-case handling patterns.",
  },
  {
    question: "A strong anti-hallucination strategy includes:",
    options: [
      "Telling the model to never be wrong",
      "Forcing citations from provided context and explicit uncertainty policy",
      "Removing all constraints for fluency",
      "Only asking yes/no questions",
    ],
    correct: 1,
    rationale: "Grounding plus an uncertainty protocol directly reduces fabricated claims.",
  },
];

function scoreDraftPrompt(prompt: string) {
  const checks = {
    objective: /(objective|goal|task)/i.test(prompt),
    audience: /(audience|for|target user|reader)/i.test(prompt),
    constraints: /(must|cannot|constraints?|limit)/i.test(prompt),
    format: /(json|table|bullets?|markdown|schema|format)/i.test(prompt),
    qualityBar: /(acceptance|quality|criteria|rubric|evaluate)/i.test(prompt),
  };
  const passed = Object.values(checks).filter(Boolean).length;
  const score = Math.round((passed / 5) * 100);
  return { checks, score };
}

function scoreOutput(weights: { accuracy: number; specificity: number; actionability: number; compliance: number }) {
  const weighted = (weights.accuracy * 0.35) + (weights.specificity * 0.25) + (weights.actionability * 0.25) + (weights.compliance * 0.15);
  return Math.round(weighted);
}

export default function PromptEngineeringMasteryCourse() {
  const [activeModule, setActiveModule] = useState(0);
  const [task, setTask] = useState("Design a go-to-market plan for a B2B analytics feature launch.");
  const [audience, setAudience] = useState("Senior product marketer");
  const [constraints, setConstraints] = useState("Budget <= $100k, timeline 8 weeks, include measurable KPI targets.");
  const [format, setFormat] = useState("Return a 3-phase plan in markdown table format.");
  const [draftPrompt, setDraftPrompt] = useState("");

  const [selectedSample, setSelectedSample] = useState(evaluationSamples[1].id);
  const [accuracy, setAccuracy] = useState(82);
  const [specificity, setSpecificity] = useState(75);
  const [actionability, setActionability] = useState(80);
  const [compliance, setCompliance] = useState(85);

  const [threats, setThreats] = useState<string[]>([]);
  const [mitigations, setMitigations] = useState<string[]>([]);

  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);

  const assembledPrompt = useMemo(() => {
    return [
      `You are an expert assistant helping with this task: ${task}`,
      `Primary audience: ${audience}`,
      `Constraints: ${constraints}`,
      `Output contract: ${format}`,
      "Quality bar: be specific, cite assumptions, and include measurable success criteria.",
    ].join("\n");
  }, [task, audience, constraints, format]);

  const promptDraftScore = useMemo(() => scoreDraftPrompt(draftPrompt), [draftPrompt]);

  const outputScore = useMemo(
    () => scoreOutput({ accuracy, specificity, actionability, compliance }),
    [accuracy, specificity, actionability, compliance]
  );

  const guardrailPolicy = useMemo(() => {
    return [
      `Threat model: ${threats.length ? threats.join(", ") : "Not selected"}`,
      `Mitigations: ${mitigations.length ? mitigations.join(", ") : "Not selected"}`,
      "Response policy: refuse unsafe requests, request clarifications for ambiguous scope, and mark uncertain claims explicitly.",
    ].join("\n");
  }, [mitigations, threats]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success(`${label} copied`))
      .catch(() => toast.error("Copy failed"));
  };

  const handleQuizAnswer = (idx: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(idx);
    if (idx === quizQuestions[quizIndex].correct) {
      setQuizScore(v => v + 1);
    }
  };

  const handleQuizNext = () => {
    if (quizIndex === quizQuestions.length - 1) {
      setQuizDone(true);
      return;
    }
    setQuizIndex(v => v + 1);
    setSelectedAnswer(null);
  };

  const quizPercent = Math.round((quizScore / quizQuestions.length) * 100);

  const toggleTag = (value: string, collection: string[], setter: (next: string[]) => void) => {
    setter(collection.includes(value) ? collection.filter(v => v !== value) : [...collection, value]);
  };

  return (
    <div className="space-y-6">
      <div className="card-nexus p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-[oklch(0.75_0.18_55_/_0.35)] bg-[oklch(0.75_0.18_55_/_0.14)] text-[oklch(0.85_0.18_55)] text-xs font-semibold mb-3">
              <Sparkles size={12} />
              Curated Expert Track
            </div>
            <h3 className="text-xl font-bold text-foreground">Prompt Engineering Mastery</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
              A rigor-first course for practitioners shipping real systems: prompt architecture, context strategy, evaluation harnesses, and robustness controls.
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-sm font-semibold text-foreground">4 modules</div>
            <div className="text-xs text-muted-foreground">~6 hours intensive</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        {modules.map((m, idx) => (
          <button
            key={m.id}
            onClick={() => setActiveModule(idx)}
            className={`text-left rounded-xl border px-3 py-3 transition-colors ${
              idx === activeModule
                ? "border-[oklch(0.75_0.18_55_/_0.45)] bg-[oklch(0.75_0.18_55_/_0.14)]"
                : "border-white/10 bg-white/3 hover:border-white/20"
            }`}
          >
            <div className="text-xs font-semibold text-[oklch(0.85_0.18_55)] mb-1">Module {idx + 1}</div>
            <div className="text-sm font-semibold text-foreground leading-snug">{m.title.replace(/^Module \d+: /, "")}</div>
          </button>
        ))}
      </div>

      {activeModule === 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card-nexus p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Target size={14} className="text-[oklch(0.75_0.18_55)]" />
            Prompt Architecture Studio
          </div>
          <p className="text-sm text-muted-foreground">
            Build a production-grade prompt by defining objective, audience, constraints, and output contract. This is the minimum bar for reliable prompt behavior.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <textarea value={task} onChange={(e) => setTask(e.target.value)} rows={3} className="w-full rounded-xl bg-white/4 border border-white/10 p-3 text-sm text-foreground" />
            <textarea value={audience} onChange={(e) => setAudience(e.target.value)} rows={3} className="w-full rounded-xl bg-white/4 border border-white/10 p-3 text-sm text-foreground" />
            <textarea value={constraints} onChange={(e) => setConstraints(e.target.value)} rows={3} className="w-full rounded-xl bg-white/4 border border-white/10 p-3 text-sm text-foreground" />
            <textarea value={format} onChange={(e) => setFormat(e.target.value)} rows={3} className="w-full rounded-xl bg-white/4 border border-white/10 p-3 text-sm text-foreground" />
          </div>
          <div className="rounded-xl border border-[oklch(0.75_0.18_55_/_0.25)] bg-[oklch(0.75_0.18_55_/_0.08)] p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-[oklch(0.85_0.18_55)]">ASSEMBLED BASE PROMPT</div>
              <button onClick={() => handleCopy(assembledPrompt, "Prompt")} className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground"><Copy size={12} /> Copy</button>
            </div>
            <pre className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{assembledPrompt}</pre>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/3 p-4">
            <div className="text-xs font-semibold text-foreground mb-2">DRAFT CHECKER</div>
            <textarea
              value={draftPrompt}
              onChange={(e) => setDraftPrompt(e.target.value)}
              rows={6}
              placeholder="Paste your own draft prompt here for rubric scoring..."
              className="w-full rounded-lg bg-white/4 border border-white/10 p-3 text-sm text-foreground"
            />
            <div className="mt-3 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Coverage score</div>
              <div className="text-lg font-bold text-foreground">{promptDraftScore.score}%</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 mt-2">
              {Object.entries(promptDraftScore.checks).map(([k, ok]) => (
                <div key={k} className={`rounded-lg border px-2 py-1.5 text-xs ${ok ? "border-[oklch(0.72_0.18_150_/_0.45)] text-[oklch(0.82_0.18_150)]" : "border-white/10 text-muted-foreground"}`}>
                  {k}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {activeModule === 1 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card-nexus p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <BookOpen size={14} className="text-[oklch(0.65_0.22_200)]" />
            Context Stack Workshop
          </div>
          <p className="text-sm text-muted-foreground">
            Expert prompting is mostly context design. Use layered instructions: task contract, domain assumptions, exemplars, boundaries, and escalation behavior.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { title: "Instruction Layer", body: "Define role, objective, decision authority, and constraints." },
              { title: "Evidence Layer", body: "Inject only trusted source context and cite provenance." },
              { title: "Format Layer", body: "Enforce schema, confidence signaling, and exception flow." },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-white/10 bg-white/3 p-3">
                <div className="text-sm font-semibold text-foreground">{item.title}</div>
                <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.body}</div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-white/10 bg-white/3 p-4">
            <div className="text-xs font-semibold text-foreground mb-2">TEMPLATE: CONTEXT-AWARE SYSTEM PROMPT</div>
            <pre className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{`You are an expert assistant for [domain].
Your task: [explicit objective].
You must follow: [policy constraints + forbidden actions].
Use only: [provided context / cited sources].
If confidence < threshold: ask clarifying question before answering.
Output schema: [fields + types + validation checks].`}</pre>
          </div>
        </motion.div>
      )}

      {activeModule === 2 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card-nexus p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Gauge size={14} className="text-[oklch(0.72_0.18_150)]" />
            Evaluation Harness
          </div>
          <p className="text-sm text-muted-foreground">
            Rate outputs explicitly. A prompt without an evaluation rubric is guesswork disguised as iteration.
          </p>
          <div className="flex flex-wrap gap-2">
            {evaluationSamples.map((sample) => (
              <button
                key={sample.id}
                onClick={() => setSelectedSample(sample.id)}
                className={`px-3 py-1.5 rounded-lg text-xs border ${
                  sample.id === selectedSample
                    ? "border-[oklch(0.72_0.18_150_/_0.45)] text-[oklch(0.82_0.18_150)] bg-[oklch(0.72_0.18_150_/_0.14)]"
                    : "border-white/10 text-muted-foreground"
                }`}
              >
                {sample.label}
              </button>
            ))}
          </div>
          <div className="rounded-xl border border-white/10 bg-white/3 p-4">
            <p className="text-sm text-foreground leading-relaxed">
              {evaluationSamples.find((s) => s.id === selectedSample)?.text}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { label: "Accuracy", value: accuracy, setter: setAccuracy },
              { label: "Specificity", value: specificity, setter: setSpecificity },
              { label: "Actionability", value: actionability, setter: setActionability },
              { label: "Constraint Compliance", value: compliance, setter: setCompliance },
            ].map((item) => (
              <label key={item.label} className="rounded-xl border border-white/10 bg-white/3 p-3 block">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>{item.label}</span>
                  <span>{item.value}</span>
                </div>
                <input type="range" min={0} max={100} value={item.value} onChange={(e) => item.setter(Number(e.target.value))} className="w-full" />
              </label>
            ))}
          </div>
          <div className="rounded-xl border border-[oklch(0.72_0.18_150_/_0.35)] bg-[oklch(0.72_0.18_150_/_0.10)] p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-[oklch(0.82_0.18_150)]">WEIGHTED OUTPUT SCORE</div>
              <div className="text-xs text-muted-foreground">Target production threshold: 85+</div>
            </div>
            <div className="text-2xl font-black text-foreground">{outputScore}</div>
          </div>
        </motion.div>
      )}

      {activeModule === 3 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card-nexus p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Shield size={14} className="text-[oklch(0.68_0.22_10)]" />
            Robustness Lab
          </div>
          <p className="text-sm text-muted-foreground">
            Build threat-aware prompts. Choose likely failure vectors and pair each with explicit mitigation controls.
          </p>
          <div className="rounded-xl border border-white/10 bg-white/3 p-3">
            <div className="text-xs font-semibold text-foreground mb-2">Threat Selection</div>
            <div className="flex flex-wrap gap-2">
              {["Prompt injection", "Policy evasion", "Hallucinated citations", "Spec drift", "Data leakage"].map((t) => (
                <button key={t} onClick={() => toggleTag(t, threats, setThreats)} className={`px-2.5 py-1 rounded-md text-xs border ${threats.includes(t) ? "border-[oklch(0.68_0.22_10_/_0.5)] text-[oklch(0.78_0.22_10)]" : "border-white/10 text-muted-foreground"}`}>{t}</button>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/3 p-3">
            <div className="text-xs font-semibold text-foreground mb-2">Mitigation Controls</div>
            <div className="flex flex-wrap gap-2">
              {["Input sanitization", "Instruction hierarchy lock", "Citation enforcement", "Confidence threshold", "Refusal templates"].map((m) => (
                <button key={m} onClick={() => toggleTag(m, mitigations, setMitigations)} className={`px-2.5 py-1 rounded-md text-xs border ${mitigations.includes(m) ? "border-[oklch(0.72_0.18_150_/_0.45)] text-[oklch(0.82_0.18_150)]" : "border-white/10 text-muted-foreground"}`}>{m}</button>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-[oklch(0.68_0.22_10_/_0.35)] bg-[oklch(0.68_0.22_10_/_0.08)] p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-[oklch(0.78_0.22_10)]">GUARDRAIL POLICY DRAFT</div>
              <button onClick={() => handleCopy(guardrailPolicy, "Guardrail policy")} className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground"><Copy size={12} /> Copy</button>
            </div>
            <pre className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{guardrailPolicy}</pre>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/3 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground mb-3">
              <ClipboardList size={12} />
              Mastery Check
            </div>
            {!quizDone ? (
              <>
                <div className="text-xs text-muted-foreground mb-1">Question {quizIndex + 1} / {quizQuestions.length}</div>
                <div className="text-sm font-semibold text-foreground mb-3">{quizQuestions[quizIndex].question}</div>
                <div className="space-y-2">
                  {quizQuestions[quizIndex].options.map((option, idx) => {
                    const isSelected = selectedAnswer === idx;
                    const isCorrect = idx === quizQuestions[quizIndex].correct;
                    return (
                      <button
                        key={option}
                        onClick={() => handleQuizAnswer(idx)}
                        className={`w-full text-left rounded-lg border px-3 py-2 text-sm ${
                          selectedAnswer === null
                            ? "border-white/10 text-muted-foreground hover:text-foreground"
                            : isCorrect
                              ? "border-[oklch(0.72_0.18_150_/_0.45)] text-[oklch(0.82_0.18_150)]"
                              : isSelected
                                ? "border-[oklch(0.68_0.22_10_/_0.45)] text-[oklch(0.78_0.22_10)]"
                                : "border-white/10 text-muted-foreground"
                        }`}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
                {selectedAnswer !== null && (
                  <div className="mt-3">
                    <div className="text-xs text-muted-foreground mb-2">{quizQuestions[quizIndex].rationale}</div>
                    <button onClick={handleQuizNext} className="px-3 py-1.5 rounded-lg text-xs border border-white/10 text-foreground inline-flex items-center gap-1">
                      Next <ArrowRight size={12} />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-lg border border-[oklch(0.72_0.18_150_/_0.45)] bg-[oklch(0.72_0.18_150_/_0.12)] p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <CheckCircle2 size={14} className="text-[oklch(0.82_0.18_150)]" />
                  Final Score: {quizPercent}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Mastery standard: 80%+. Revisit Module 3 and 4 if your score is below target for production readiness.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/3 p-3">
          <div className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1"><SlidersHorizontal size={12} /> Skill Signal</div>
          <p className="text-xs text-muted-foreground">Designs prompts with measurable contracts and explicit failure handling.</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/3 p-3">
          <div className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1"><Zap size={12} /> Production Outcome</div>
          <p className="text-xs text-muted-foreground">Higher consistency, lower rework, and faster iteration cycles.</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/3 p-3">
          <div className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1"><AlertTriangle size={12} /> Common Risk</div>
          <p className="text-xs text-muted-foreground">Overfitting prompts to one benchmark case without broad failure testing.</p>
        </div>
      </div>
    </div>
  );
}
