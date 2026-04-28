import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Compass,
  Cpu,
  FlaskConical,
  GitBranch,
  Layers,
  Network,
  Scale,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

type Relationship = {
  id: string;
  from: string;
  to: string;
  polarity: "positive" | "negative";
};

type SystemsQuizQuestion = {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
};

const modules = [
  "System Mapping & Boundaries",
  "Dynamics & Delay Simulation",
  "Intervention Portfolio Design",
  "Scenario & Strategy Synthesis",
];

const interventionSeeds = [
  { name: "Reduce onboarding friction", impact: 82, feasibility: 78, speed: 70 },
  { name: "Weekly feedback loop with users", impact: 72, feasibility: 86, speed: 76 },
  { name: "Pricing model redesign", impact: 85, feasibility: 45, speed: 38 },
  { name: "Cross-functional incident review", impact: 66, feasibility: 92, speed: 88 },
];

const quiz: SystemsQuizQuestion[] = [
  {
    question: "What is the strongest reason to model delays explicitly?",
    options: [
      "Delays make diagrams look more realistic",
      "Delays often create oscillation and policy resistance",
      "Delays eliminate uncertainty",
      "Delays remove need for measurement",
    ],
    correct: 1,
    explanation: "Unmodeled delays are a classic cause of over-correction and unstable behavior.",
  },
  {
    question: "A high-leverage intervention usually:",
    options: [
      "Optimizes the most visible symptom",
      "Targets structural feedback loops, not isolated events",
      "Has the lowest implementation cost",
      "Avoids any stakeholder tradeoff",
    ],
    correct: 1,
    explanation: "Leverage is structural: changing loop behavior beats patching symptoms.",
  },
  {
    question: "Which choice best defines a useful system boundary?",
    options: [
      "Include everything potentially relevant",
      "Exclude stakeholders to reduce complexity",
      "Include actors and flows that materially change policy decisions",
      "Only include variables with perfect data",
    ],
    correct: 2,
    explanation: "Boundaries should be decision-relevant, not maximal.",
  },
];

function simulateStock(
  initial: number,
  inflow: number,
  outflow: number,
  delay: number,
  steps: number
) {
  const series: number[] = [initial];
  const history: number[] = [initial];

  for (let i = 1; i < steps; i += 1) {
    const delayedIdx = Math.max(0, i - delay);
    const delayedSignal = history[delayedIdx] * 0.015;
    const next = Math.max(0, series[i - 1] + inflow - outflow - delayedSignal);
    series.push(next);
    history.push(next);
  }

  return series;
}

export default function SystemsThinkingDesignCourse() {
  const [activeModule, setActiveModule] = useState(0);

  const [variables, setVariables] = useState<string[]>([
    "Activation Rate",
    "User Confidence",
    "Support Load",
    "Feature Adoption",
    "Churn Risk",
  ]);
  const [newVariable, setNewVariable] = useState("");
  const [from, setFrom] = useState("Activation Rate");
  const [to, setTo] = useState("User Confidence");
  const [polarity, setPolarity] = useState<"positive" | "negative">("positive");
  const [relationships, setRelationships] = useState<Relationship[]>([]);

  const [initialStock, setInitialStock] = useState(100);
  const [inflow, setInflow] = useState(22);
  const [outflow, setOutflow] = useState(14);
  const [delay, setDelay] = useState(3);

  const [interventions, setInterventions] = useState(interventionSeeds);
  const [scenarioAxisA, setScenarioAxisA] = useState("Demand volatility");
  const [scenarioAxisB, setScenarioAxisB] = useState("Regulatory pressure");

  const [quizIndex, setQuizIndex] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const stockSeries = useMemo(
    () => simulateStock(initialStock, inflow, outflow, delay, 24),
    [delay, inflow, initialStock, outflow]
  );

  const maxSeries = Math.max(...stockSeries, 1);
  const trendDelta = stockSeries[stockSeries.length - 1] - stockSeries[0];

  const loopSignals = useMemo(() => {
    const positive = relationships.filter((r) => r.polarity === "positive").length;
    const negative = relationships.filter((r) => r.polarity === "negative").length;
    return { positive, negative };
  }, [relationships]);

  const prioritized = useMemo(() => {
    return interventions
      .map((item) => ({
        ...item,
        priority: Math.round((item.impact * 0.5) + (item.feasibility * 0.3) + (item.speed * 0.2)),
      }))
      .sort((a, b) => b.priority - a.priority);
  }, [interventions]);

  const scenarioCards = useMemo(() => {
    return [
      {
        title: `High ${scenarioAxisA} / High ${scenarioAxisB}`,
        recommendation: "Build rapid sensing loops, shorten decision cycles, and pre-negotiate fallback operating modes.",
      },
      {
        title: `High ${scenarioAxisA} / Low ${scenarioAxisB}`,
        recommendation: "Invest in adaptive capacity and experimentation infrastructure; prioritize speed over formal controls.",
      },
      {
        title: `Low ${scenarioAxisA} / High ${scenarioAxisB}`,
        recommendation: "Optimize compliance architecture and stable process handoffs; avoid over-rotating into tactical churn.",
      },
      {
        title: `Low ${scenarioAxisA} / Low ${scenarioAxisB}`,
        recommendation: "Drive efficiency, codify playbooks, and scale predictable growth channels.",
      },
    ];
  }, [scenarioAxisA, scenarioAxisB]);

  const addVariable = () => {
    const trimmed = newVariable.trim();
    if (!trimmed || variables.includes(trimmed)) return;
    setVariables((prev) => [...prev, trimmed]);
    setNewVariable("");
  };

  const addRelationship = () => {
    if (!from || !to || from === to) return;
    setRelationships((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, from, to, polarity },
    ]);
  };

  const updateIntervention = (name: string, key: "impact" | "feasibility" | "speed", value: number) => {
    setInterventions((prev) =>
      prev.map((item) => (item.name === name ? { ...item, [key]: value } : item))
    );
  };

  const answerQuiz = (idx: number) => {
    if (chosen !== null) return;
    setChosen(idx);
    if (idx === quiz[quizIndex].correct) setScore((v) => v + 1);
  };

  const nextQuiz = () => {
    if (quizIndex === quiz.length - 1) {
      setDone(true);
      return;
    }
    setQuizIndex((v) => v + 1);
    setChosen(null);
  };

  const quizPct = Math.round((score / quiz.length) * 100);

  return (
    <div className="space-y-6">
      <div className="card-nexus p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-[oklch(0.72_0.18_150_/_0.40)] bg-[oklch(0.72_0.18_150_/_0.14)] text-[oklch(0.82_0.18_150)] text-xs font-semibold mb-3">
              <Sparkles size={12} />
              Curated Expert Track
            </div>
            <h3 className="text-xl font-bold text-foreground">Systems Thinking & Design</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
              Diagnose complex behavior, model feedback dynamics, and design interventions that shift system structure rather than patch symptoms.
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-sm font-semibold text-foreground">4 modules</div>
            <div className="text-xs text-muted-foreground">~6 hours intensive</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        {modules.map((label, idx) => (
          <button
            key={label}
            onClick={() => setActiveModule(idx)}
            className={`text-left rounded-xl border px-3 py-3 transition-colors ${
              idx === activeModule
                ? "border-[oklch(0.72_0.18_150_/_0.45)] bg-[oklch(0.72_0.18_150_/_0.14)]"
                : "border-white/10 bg-white/3 hover:border-white/20"
            }`}
          >
            <div className="text-xs font-semibold text-[oklch(0.82_0.18_150)] mb-1">Module {idx + 1}</div>
            <div className="text-sm font-semibold text-foreground leading-snug">{label}</div>
          </button>
        ))}
      </div>

      {activeModule === 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card-nexus p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Network size={14} className="text-[oklch(0.72_0.18_150)]" />
            Causal Mapping Lab
          </div>
          <p className="text-sm text-muted-foreground">
            Define a tractable boundary, map causal relationships, and inspect whether your model is dominated by reinforcing or balancing forces.
          </p>
          <div className="rounded-xl border border-white/10 bg-white/3 p-3">
            <div className="text-xs font-semibold text-foreground mb-2">Add Variables</div>
            <div className="flex gap-2">
              <input
                value={newVariable}
                onChange={(e) => setNewVariable(e.target.value)}
                placeholder="e.g., Decision latency"
                className="flex-1 rounded-lg bg-white/4 border border-white/10 px-3 py-2 text-sm text-foreground"
              />
              <button onClick={addVariable} className="px-3 py-2 rounded-lg border border-white/10 text-sm text-foreground">Add</button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {variables.map((v) => (
                <span key={v} className="px-2 py-1 rounded-md text-xs border border-white/10 text-muted-foreground">{v}</span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <select value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg bg-white/4 border border-white/10 px-2 py-2 text-sm text-foreground">
              {variables.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
            <select value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg bg-white/4 border border-white/10 px-2 py-2 text-sm text-foreground">
              {variables.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
            <select value={polarity} onChange={(e) => setPolarity(e.target.value as "positive" | "negative")} className="rounded-lg bg-white/4 border border-white/10 px-2 py-2 text-sm text-foreground">
              <option value="positive">Positive (+)</option>
              <option value="negative">Negative (-)</option>
            </select>
            <button onClick={addRelationship} className="rounded-lg border border-[oklch(0.72_0.18_150_/_0.45)] bg-[oklch(0.72_0.18_150_/_0.12)] text-sm text-[oklch(0.82_0.18_150)]">Add Link</button>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/3 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-foreground">Relationship Table</div>
              <div className="text-xs text-muted-foreground">R loops: {loopSignals.positive} · B loops: {loopSignals.negative}</div>
            </div>
            {relationships.length === 0 ? (
              <div className="text-xs text-muted-foreground">No links yet. Add at least 5 links to see meaningful loop signatures.</div>
            ) : (
              <div className="space-y-1">
                {relationships.map((r) => (
                  <div key={r.id} className="text-xs text-muted-foreground border border-white/10 rounded-md px-2 py-1">{r.from} → {r.to} ({r.polarity})</div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {activeModule === 1 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card-nexus p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <BarChart3 size={14} className="text-[oklch(0.65_0.22_200)]" />
            Behavior Over Time Simulator
          </div>
          <p className="text-sm text-muted-foreground">
            Explore how inflow/outflow and delayed feedback create growth, stability, or collapse trajectories.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            {[
              { label: "Initial stock", value: initialStock, setter: setInitialStock, max: 250 },
              { label: "Inflow", value: inflow, setter: setInflow, max: 60 },
              { label: "Outflow", value: outflow, setter: setOutflow, max: 60 },
              { label: "Delay (months)", value: delay, setter: setDelay, max: 10 },
            ].map((s) => (
              <label key={s.label} className="rounded-xl border border-white/10 bg-white/3 p-3 block">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>{s.label}</span>
                  <span>{s.value}</span>
                </div>
                <input type="range" min={0} max={s.max} value={s.value} onChange={(e) => s.setter(Number(e.target.value))} className="w-full" />
              </label>
            ))}
          </div>
          <div className="rounded-xl border border-white/10 bg-white/3 p-4">
            <div className="text-xs font-semibold text-foreground mb-2">24-MONTH TRAJECTORY</div>
            <div className="h-36 flex items-end gap-1">
              {stockSeries.map((value, idx) => (
                <div key={idx} className="flex-1 rounded-t-sm bg-[oklch(0.65_0.22_200_/_0.65)]" style={{ height: `${Math.max(4, (value / maxSeries) * 100)}%` }} />
              ))}
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
              <span>Start: {stockSeries[0].toFixed(1)}</span>
              <span>End: {stockSeries[stockSeries.length - 1].toFixed(1)}</span>
              <span>Delta: {trendDelta.toFixed(1)}</span>
            </div>
          </div>
        </motion.div>
      )}

      {activeModule === 2 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card-nexus p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Scale size={14} className="text-[oklch(0.78_0.16_30)]" />
            Intervention Portfolio Optimizer
          </div>
          <p className="text-sm text-muted-foreground">
            Rank interventions by weighted leverage. Tune impact, feasibility, and speed to model realistic strategic tradeoffs.
          </p>
          <div className="space-y-3">
            {interventions.map((item) => (
              <div key={item.name} className="rounded-xl border border-white/10 bg-white/3 p-3">
                <div className="text-sm font-semibold text-foreground mb-2">{item.name}</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {[
                    { key: "impact" as const, label: "Impact", value: item.impact },
                    { key: "feasibility" as const, label: "Feasibility", value: item.feasibility },
                    { key: "speed" as const, label: "Speed", value: item.speed },
                  ].map((m) => (
                    <label key={m.key} className="text-xs text-muted-foreground">
                      <div className="flex justify-between mb-1"><span>{m.label}</span><span>{m.value}</span></div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={m.value}
                        onChange={(e) => updateIntervention(item.name, m.key, Number(e.target.value))}
                        className="w-full"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-[oklch(0.72_0.18_150_/_0.35)] bg-[oklch(0.72_0.18_150_/_0.10)] p-4">
            <div className="text-xs font-semibold text-[oklch(0.82_0.18_150)] mb-2">PRIORITIZED INTERVENTIONS</div>
            <div className="space-y-1">
              {prioritized.map((item, idx) => (
                <div key={item.name} className="text-xs text-foreground border border-white/10 rounded-md px-2 py-1 flex justify-between">
                  <span>{idx + 1}. {item.name}</span>
                  <span>{item.priority}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {activeModule === 3 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card-nexus p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Compass size={14} className="text-[oklch(0.75_0.18_55)]" />
            Scenario Strategy Studio
          </div>
          <p className="text-sm text-muted-foreground">
            Use two critical uncertainties to form robust strategic options instead of single-path planning.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={scenarioAxisA} onChange={(e) => setScenarioAxisA(e.target.value)} className="rounded-lg bg-white/4 border border-white/10 px-3 py-2 text-sm text-foreground" />
            <input value={scenarioAxisB} onChange={(e) => setScenarioAxisB(e.target.value)} className="rounded-lg bg-white/4 border border-white/10 px-3 py-2 text-sm text-foreground" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {scenarioCards.map((card) => (
              <div key={card.title} className="rounded-xl border border-white/10 bg-white/3 p-3">
                <div className="text-sm font-semibold text-foreground mb-1">{card.title}</div>
                <p className="text-xs text-muted-foreground leading-relaxed">{card.recommendation}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/3 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground mb-3">
              <FlaskConical size={12} />
              Mastery Check
            </div>
            {!done ? (
              <>
                <div className="text-xs text-muted-foreground mb-1">Question {quizIndex + 1} / {quiz.length}</div>
                <div className="text-sm font-semibold text-foreground mb-3">{quiz[quizIndex].question}</div>
                <div className="space-y-2">
                  {quiz[quizIndex].options.map((opt, idx) => {
                    const isChosen = idx === chosen;
                    const isCorrect = idx === quiz[quizIndex].correct;
                    return (
                      <button
                        key={opt}
                        onClick={() => answerQuiz(idx)}
                        className={`w-full text-left rounded-lg border px-3 py-2 text-sm ${
                          chosen === null
                            ? "border-white/10 text-muted-foreground hover:text-foreground"
                            : isCorrect
                              ? "border-[oklch(0.72_0.18_150_/_0.45)] text-[oklch(0.82_0.18_150)]"
                              : isChosen
                                ? "border-[oklch(0.68_0.22_10_/_0.45)] text-[oklch(0.78_0.22_10)]"
                                : "border-white/10 text-muted-foreground"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {chosen !== null && (
                  <div className="mt-3">
                    <div className="text-xs text-muted-foreground mb-2">{quiz[quizIndex].explanation}</div>
                    <button onClick={nextQuiz} className="px-3 py-1.5 rounded-lg text-xs border border-white/10 text-foreground inline-flex items-center gap-1">
                      Next <ArrowRight size={12} />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-lg border border-[oklch(0.72_0.18_150_/_0.45)] bg-[oklch(0.72_0.18_150_/_0.12)] p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <CheckCircle2 size={14} className="text-[oklch(0.82_0.18_150)]" />
                  Final Score: {quizPct}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">Target mastery for advanced strategy work: 80%+.</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/3 p-3">
          <div className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1"><Layers size={12} /> Boundary Design</div>
          <p className="text-xs text-muted-foreground">Separates actionable scope from distracting complexity.</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/3 p-3">
          <div className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1"><Clock3 size={12} /> Delay Awareness</div>
          <p className="text-xs text-muted-foreground">Models lag effects before making policy moves.</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/3 p-3">
          <div className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1"><GitBranch size={12} /> Leverage Focus</div>
          <p className="text-xs text-muted-foreground">Ranks interventions by structural impact and practicality.</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/3 p-3">
          <div className="text-xs font-semibold text-foreground mb-1 flex items-center gap-1"><Cpu size={12} /> Scenario Resilience</div>
          <p className="text-xs text-muted-foreground">Builds strategies that survive uncertainty shifts.</p>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/3 p-4">
        <div className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1"><SlidersHorizontal size={12} /> Expert Practice Rule</div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Every proposed intervention should include: causal hypothesis, expected time-to-effect, measurable leading indicators, failure signal, and rollback criteria.
        </p>
      </div>
    </div>
  );
}
