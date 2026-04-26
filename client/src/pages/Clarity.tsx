/**
 * Clarity — Know Your Mind
 * Mental health assessments, cognitive training, CBT tools, mood tracking, and breathing exercises.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import { instrumentRegistry } from "@shared/clarity/instruments/registry";
import type {
  InstrumentPlugin,
  InstrumentSession,
  InstrumentResponse,
  InstrumentResponseValue,
  ScoreResult,
  CrisisTrigger,
} from "@shared/clarity/core/instrumentTypes";

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab =
  | "assessments"
  | "training"
  | "mood"
  | "cbt"
  | "breathe"
  | "progress";

type TrainingExercise =
  | "nback"
  | "stroop"
  | "processing-speed"
  | "attention-cpt"
  | "pattern"
  | "dual-task"
  | "flanker"
  | "gonogo"
  | "task-switching"
  | "corsi"
  | "mental-rotation"
  | "sustained-attention";

type BreathingPattern = "box" | "478" | "grounding";

// ─── Constants ────────────────────────────────────────────────────────────────

const LIKERT_0_3_LABELS = ["Not at all", "Several days", "More than half the days", "Nearly every day"];

const COGNITIVE_DISTORTIONS = [
  "All-or-nothing thinking",
  "Overgeneralization",
  "Mental filter",
  "Disqualifying the positive",
  "Mind reading",
  "Fortune telling",
  "Magnification / Minimization",
  "Emotional reasoning",
  "Should statements",
  "Labeling",
  "Personalization",
  "Jumping to conclusions",
  "Catastrophizing",
  "Blame",
];

const TRAINING_EXERCISES: Array<{
  id: TrainingExercise;
  label: string;
  icon: string;
  ref: string;
  desc: string;
  science: string;
}> = [
  {
    id: "nback", label: "N-Back", icon: "🧠", ref: "Jaeggi et al. (2008); Shipstead et al. (2012)",
    desc: "Working memory training",
    science: "Repeatedly updating items in short-term memory strengthens the dorsolateral prefrontal and parietal networks—the neural substrate of working memory capacity. Each increase in N raises demands on the brain's ability to simultaneously maintain and manipulate multiple representations.",
  },
  {
    id: "stroop", label: "Stroop Test", icon: "🎨", ref: "Stroop (1935); MacLeod, Psych. Bull. (1991)",
    desc: "Cognitive control & interference",
    science: "Naming ink color while suppressing the impulse to read the word forces the anterior cingulate cortex to detect response conflict and the prefrontal cortex to inhibit the faster, automatic reading response. Repeated conflict resolution directly strengthens the executive control circuits underlying attention and impulse regulation.",
  },
  {
    id: "processing-speed", label: "Processing Speed", icon: "⚡", ref: "Wechsler WAIS (1981); Joy et al. (2004)",
    desc: "Digit-symbol substitution",
    science: "Rapidly encoding symbols and retrieving memorized digit-symbol pairings requires coordinated activity across occipital, prefrontal, and motor cortices. Processing speed is among the most sensitive markers of overall neural health and predicts real-world functional ability across the lifespan.",
  },
  {
    id: "attention-cpt", label: "Attention CPT", icon: "👁", ref: "Rosvold et al. (1956); Braver et al. (2001)",
    desc: "Sustained attention & context processing",
    science: "Maintaining a prior stimulus (A) across a delay and using it to decide whether to respond to the next stimulus taxes both working memory and sustained attention simultaneously. The anterior cingulate monitors for expectation violations while the prefrontal cortex implements context-dependent response rules.",
  },
  {
    id: "pattern", label: "Pattern Recognition", icon: "🔷", ref: "Raven (1938); Carpenter et al. (1990)",
    desc: "Fluid intelligence & sequences",
    science: "Identifying rules in visual matrix sequences requires inductive reasoning, spatial representation, and working memory to hold multiple hypotheses at once. This taps fluid intelligence—the brain's capacity to reason in novel situations—rooted in prefrontal-parietal networks.",
  },
  {
    id: "dual-task", label: "Dual Task", icon: "⚖️", ref: "Pashler (1994); Salvucci & Taatgen (2008)",
    desc: "Divided attention training",
    science: "Running two simultaneous categorization tasks taxes the central processing bottleneck in the prefrontal cortex. With practice the brain automatizes one task, reducing prefrontal demand, while optimizing attentional allocation between both tasks—directly training multitasking efficiency.",
  },
  {
    id: "flanker", label: "Flanker Task", icon: "🎯", ref: "Eriksen & Eriksen, Percept. Psychophys. (1974)",
    desc: "Inhibitory control & conflict resolution",
    science: "Responding to a center arrow while ignoring flanking arrows that often point the opposite way forces the anterior cingulate to detect stimulus-response conflict and the prefrontal cortex to filter irrelevant information. This repeated conflict resolution strengthens the inhibitory control circuits that underlie attention and impulse regulation.",
  },
  {
    id: "gonogo", label: "Go / No-Go", icon: "🛑", ref: "Garavan et al., NeuroImage (1999)",
    desc: "Response inhibition & impulse control",
    science: "Responding quickly to frequent stimuli but withholding when a rare stop signal appears trains the right inferior frontal gyrus to actively brake prepotent motor responses—the primary neural substrate of impulse control. Transfer studies show training-induced gains extend to other stop-signal and Stroop interference tasks.",
  },
  {
    id: "task-switching", label: "Task Switching", icon: "🔀", ref: "Monsell, Trends Cogn. Sci. (2003); Rogers & Monsell (1995)",
    desc: "Cognitive flexibility",
    science: "Rules alternate unpredictably between trials, forcing rapid disengagement from the current task set and activation of a new one. The prefrontal cortex must quickly reconfigure attentional priorities, directly exercising cognitive flexibility—the capacity to adapt behavior to shifting demands.",
  },
  {
    id: "corsi", label: "Corsi Blocks", icon: "📦", ref: "Corsi (1972); Piccardi & Guaraglia (2015)",
    desc: "Spatial working memory",
    science: "Blocks light up in a sequence that must be reproduced from memory, engaging the visuospatial sketchpad maintained by parietal-prefrontal networks—a distinct system from verbal working memory. Training gains transfer to mental rotation and mathematical reasoning, reflecting shared spatial processing circuits.",
  },
  {
    id: "mental-rotation", label: "Mental Rotation", icon: "🔄", ref: "Shepard & Metzler, Science (1971); Zacks (2008)",
    desc: "Spatial reasoning & visualization",
    science: "Mentally rotating an asymmetric shape to find its match engages the intraparietal sulcus for coordinate transformation and prefrontal working memory to hold the rotated image. Of all cognitive training types, spatial training shows the broadest transfer—gains predict improvements in geometry, mathematics, and science problem-solving.",
  },
  {
    id: "sustained-attention", label: "Vigilance", icon: "⏱️", ref: "Mackworth (1948); Nuechterlein et al. (1983)",
    desc: "Sustained attention over time",
    science: "Detecting infrequent targets in a stream of stimuli over several minutes strengthens the right-lateralized vigilance network spanning prefrontal cortex, anterior insula, and intraparietal sulcus. Regular practice reduces the vigilance decrement—the natural drop in detection accuracy over time—and builds resistance to mind-wandering.",
  },
];

const INSTRUMENT_CATEGORIES: Record<string, string[]> = {
  "Depression / Anxiety": ["phq-9", "gad-7"],
  "Trauma / PTSD": ["pcl-5", "ace-q"],
  "ADHD": ["asrs-6q", "asrs-part-b-12q", "adhd-symptom-checklist"],
  "OCD": ["ocd-symptom-checklist", "oci-r"],
  "Autism Spectrum": ["aq-10-gateway", "raads-r", "cat-q"],
  "Crisis Screening": ["cssrs-screener"],
  "Personality": ["ipip-50", "ipip-neo-120"],
  "Strengths": ["ipip-via-core"],
  "Cognitive": ["viqt"],
  "Career & Values": ["riasec", "values-clarification", "skills-inventory", "ikigai"],
  "Self-Understanding": [
    "emotional-intelligence",
    "attachment-style",
    "cognitive-style",
    "social-behavior",
    "stress-coping",
    "self-perception",
    "philosophical-views",
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function genSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function severityColor(severity: string | undefined): string {
  if (!severity) return "var(--nexus-purple)";
  const s = severity.toLowerCase();
  if (s.includes("minimal") || s.includes("none") || s.includes("low")) return "#22c55e";
  if (s.includes("mild") || s.includes("moderate")) return "#f59e0b";
  if (s.includes("severe") || s.includes("high") || s.includes("moderately severe")) return "#ef4444";
  return "var(--nexus-purple)";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// Crisis Alert
function CrisisAlert({ triggers }: { triggers: CrisisTrigger[] }) {
  if (triggers.length === 0) return null;
  return (
    <div style={{
      border: "2px solid #ef4444",
      borderRadius: 12,
      padding: "16px 20px",
      background: "rgba(239,68,68,0.08)",
      marginBottom: 24,
    }}>
      <p style={{ color: "#ef4444", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
        ⚠ Important: Crisis Resources
      </p>
      <p style={{ color: "var(--foreground)", fontSize: 14, lineHeight: 1.6 }}>
        Your responses suggest you may be experiencing thoughts of self-harm or crisis.
        You are not alone. Please reach out immediately:
      </p>
      <ul style={{ marginTop: 10, color: "var(--foreground)", fontSize: 14, paddingLeft: 20 }}>
        <li><strong>988 Suicide &amp; Crisis Lifeline:</strong> Call or text <strong>988</strong></li>
        <li><strong>Crisis Text Line:</strong> Text HOME to <strong>741741</strong></li>
        <li><strong>Emergency:</strong> Call <strong>911</strong> or go to your nearest ER</li>
      </ul>
    </div>
  );
}

// Mood Sparkline (SVG)
function MoodSparkline({ data }: { data: Array<{ mood: number; createdAt: Date | string }> }) {
  if (data.length < 2) return null;
  const w = 240, h = 48;
  const pts = [...data].reverse();
  const xs = pts.map((_, i) => (i / (pts.length - 1)) * w);
  const ys = pts.map((d) => h - ((d.mood - 1) / 4) * h);
  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x},${ys[i]}`).join(" ");
  return (
    <svg width={w} height={h} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--nexus-purple)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="var(--nexus-purple)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L${w},${h} L0,${h} Z`} fill="url(#spark-grad)" />
      <path d={path} fill="none" stroke="var(--nexus-purple)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((d, i) => (
        <circle key={i} cx={xs[i]} cy={ys[i]} r={3} fill="var(--nexus-purple)" />
      ))}
    </svg>
  );
}

// ─── Assessment Runner ────────────────────────────────────────────────────────

function AssessmentRunner({
  plugin,
  onComplete,
  onClose,
}: {
  plugin: InstrumentPlugin;
  onComplete: (session: InstrumentSession, result: ScoreResult) => void;
  onClose: () => void;
}) {
  const { definition } = plugin;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<InstrumentResponse[]>([]);
  const [currentValue, setCurrentValue] = useState<InstrumentResponseValue>(null);
  const startedAt = useRef(new Date().toISOString());

  const currentItem = definition.items[currentIndex];
  const isLast = currentIndex === definition.items.length - 1;

  const handleNext = () => {
    if (currentValue === null && currentItem.required !== false) return;

    const updated: InstrumentResponse[] = [
      ...responses.filter((r) => r.itemId !== currentItem.id),
      { itemId: currentItem.id, value: currentValue },
    ];
    setResponses(updated);

    if (isLast) {
      const session: InstrumentSession = {
        sessionId: genSessionId(),
        instrumentId: definition.id,
        instrumentVersion: definition.version,
        startedAt: startedAt.current,
        completedAt: new Date().toISOString(),
        responses: updated,
      };
      const result = plugin.score(session);
      onComplete(session, result);
    } else {
      setCurrentIndex((i) => i + 1);
      setCurrentValue(null);
    }
  };

  const handleBack = () => {
    if (currentIndex === 0) return;
    const prevItem = definition.items[currentIndex - 1];
    const prev = responses.find((r) => r.itemId === prevItem.id);
    setCurrentValue(prev?.value ?? null);
    setCurrentIndex((i) => i - 1);
  };

  const progress = ((currentIndex + 1) / definition.items.length) * 100;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <p style={{ color: "var(--nexus-purple)", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {definition.title}
          </p>
          <p style={{ color: "var(--muted-foreground)", fontSize: 12 }}>
            Question {currentIndex + 1} of {definition.items.length}
          </p>
        </div>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", fontSize: 18 }}
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: "var(--surface-2)", borderRadius: 2, marginBottom: 20 }}>
        <div style={{ height: "100%", width: `${progress}%`, background: "var(--nexus-purple)", borderRadius: 2, transition: "width 0.3s" }} />
      </div>

      {/* Intro (first question only) */}
      {currentIndex === 0 && definition.intro && (
        <p style={{ color: "var(--muted-foreground)", fontSize: 13, fontStyle: "italic", marginBottom: 16, lineHeight: 1.6 }}>
          {definition.intro}
        </p>
      )}

      {/* Question */}
      <p style={{ color: "var(--foreground)", fontSize: 16, lineHeight: 1.6, marginBottom: 24, fontWeight: 500 }}>
        {currentItem.prompt}
      </p>

      {/* Input */}
      {(currentItem.type === "likert-0-3") && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {LIKERT_0_3_LABELS.map((label, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentValue(idx as 0 | 1 | 2 | 3)}
              style={{
                textAlign: "left",
                padding: "12px 16px",
                borderRadius: 10,
                border: `1px solid ${currentValue === idx ? "var(--nexus-purple)" : "var(--surface-3)"}`,
                background: currentValue === idx ? "rgba(var(--nexus-purple-rgb,124,58,237),0.12)" : "var(--surface-1)",
                color: currentValue === idx ? "var(--nexus-purple)" : "var(--foreground)",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: currentValue === idx ? 600 : 400,
                transition: "all 0.15s",
              }}
            >
              <span style={{ color: "var(--muted-foreground)", marginRight: 10, fontSize: 12 }}>{idx}</span>
              {label}
            </button>
          ))}
        </div>
      )}

      {currentItem.type === "likert-1-5" && (
        <div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {([1, 2, 3, 4, 5] as const).map((val) => (
              <button
                key={val}
                onClick={() => setCurrentValue(val)}
                style={{
                  flex: 1, minWidth: 44, height: 44, borderRadius: 8,
                  border: `1px solid ${currentValue === val ? "var(--nexus-purple)" : "var(--surface-3)"}`,
                  background: currentValue === val ? "var(--nexus-purple)" : "var(--surface-1)",
                  color: currentValue === val ? "#fff" : "var(--foreground)",
                  cursor: "pointer", fontSize: 14, fontWeight: 600,
                }}
              >
                {val}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Strongly Disagree</span>
            <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Strongly Agree</span>
          </div>
        </div>
      )}

      {currentItem.type === "likert" && currentItem.scale && (
        <div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {Array.from({ length: currentItem.scale.max - currentItem.scale.min + 1 }, (_, i) => i + currentItem.scale!.min).map((val) => (
              <button
                key={val}
                onClick={() => setCurrentValue(val)}
                style={{
                  width: 44, height: 44, borderRadius: 8,
                  border: `1px solid ${currentValue === val ? "var(--nexus-purple)" : "var(--surface-3)"}`,
                  background: currentValue === val ? "var(--nexus-purple)" : "var(--surface-1)",
                  color: currentValue === val ? "#fff" : "var(--foreground)",
                  cursor: "pointer", fontSize: 14, fontWeight: 600,
                }}
              >
                {val}
              </button>
            ))}
          </div>
          {currentItem.scale.labels.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{currentItem.scale.labels[0]}</span>
              <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{currentItem.scale.labels[currentItem.scale.labels.length - 1]}</span>
            </div>
          )}
        </div>
      )}

      {currentItem.type === "yes-no" && (
        <div style={{ display: "flex", gap: 12 }}>
          {[true, false].map((val) => (
            <button
              key={String(val)}
              onClick={() => setCurrentValue(val)}
              style={{
                flex: 1, padding: "14px 0", borderRadius: 10, fontWeight: 600, fontSize: 15,
                border: `1px solid ${currentValue === val ? "var(--nexus-purple)" : "var(--surface-3)"}`,
                background: currentValue === val ? "rgba(var(--nexus-purple-rgb,124,58,237),0.12)" : "var(--surface-1)",
                color: currentValue === val ? "var(--nexus-purple)" : "var(--foreground)",
                cursor: "pointer",
              }}
            >
              {val ? "Yes" : "No"}
            </button>
          ))}
        </div>
      )}

      {currentItem.type === "multiple-choice" && currentItem.options && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {currentItem.options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setCurrentValue(opt.id)}
              style={{
                textAlign: "left", padding: "12px 16px", borderRadius: 10, fontSize: 14,
                border: `1px solid ${currentValue === opt.id ? "var(--nexus-purple)" : "var(--surface-3)"}`,
                background: currentValue === opt.id ? "rgba(var(--nexus-purple-rgb,124,58,237),0.12)" : "var(--surface-1)",
                color: currentValue === opt.id ? "var(--nexus-purple)" : "var(--foreground)",
                cursor: "pointer", fontWeight: currentValue === opt.id ? 600 : 400,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {currentItem.type === "text" && (
        <textarea
          value={typeof currentValue === "string" ? currentValue : ""}
          onChange={(e) => setCurrentValue(e.target.value)}
          rows={4}
          placeholder="Type your response..."
          style={{
            width: "100%", boxSizing: "border-box", padding: "12px 14px",
            borderRadius: 10, border: "1px solid var(--surface-3)",
            background: "var(--surface-1)", color: "var(--foreground)",
            fontSize: 14, lineHeight: 1.6, resize: "vertical",
          }}
        />
      )}

      {/* Nav buttons */}
      <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
        {currentIndex > 0 && (
          <button onClick={handleBack} className="btn-ghost" style={{ flex: 1 }}>
            ← Back
          </button>
        )}
        <button
          onClick={handleNext}
          disabled={currentValue === null && currentItem.required !== false}
          className="btn-primary"
          style={{ flex: 2, opacity: (currentValue === null && currentItem.required !== false) ? 0.45 : 1 }}
        >
          {isLast ? "Submit" : "Next →"}
        </button>
      </div>
    </div>
  );
}

// ─── Assessment Result Display ────────────────────────────────────────────────

function AssessmentResult({
  plugin,
  result,
  onNarrate,
  narration,
  narrating,
  onRetake,
  onBack,
}: {
  plugin: InstrumentPlugin;
  result: ScoreResult;
  onNarrate: () => void;
  narration: string | null;
  narrating: boolean;
  onRetake: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <CrisisAlert triggers={result.triggers} />

      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginBottom: 4 }}>{plugin.definition.title}</p>
        {result.totalScore !== undefined && (
          <p style={{ fontSize: 48, fontWeight: 700, color: severityColor(result.severity), lineHeight: 1 }}>
            {result.totalScore}
          </p>
        )}
        {result.severity && (
          <p style={{ fontSize: 18, fontWeight: 600, color: severityColor(result.severity), marginTop: 4 }}>
            {result.severity}
          </p>
        )}

        {/* Bands */}
        {result.bands && result.bands.length > 0 && (
          <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap", marginTop: 12 }}>
            {result.bands.map((b) => (
              <span
                key={b.label}
                style={{
                  padding: "2px 10px", borderRadius: 20, fontSize: 11,
                  background: result.severity === b.label ? severityColor(b.label) : "var(--surface-2)",
                  color: result.severity === b.label ? "#fff" : "var(--muted-foreground)",
                  fontWeight: result.severity === b.label ? 700 : 400,
                }}
              >
                {b.label} ({b.min}–{b.max})
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Subscales */}
      {result.subscales && Object.keys(result.subscales).length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontWeight: 600, fontSize: 13, color: "var(--muted-foreground)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Subscales
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {Object.entries(result.subscales).map(([key, val]) => (
              <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 8, background: "var(--surface-1)" }}>
                <span style={{ fontSize: 13, color: "var(--foreground)" }}>{key}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--nexus-purple)" }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Narration */}
      {narration ? (
        <div style={{ padding: "14px 16px", borderRadius: 10, background: "var(--surface-1)", border: "1px solid var(--surface-3)", marginBottom: 16, fontSize: 14, lineHeight: 1.7, color: "var(--foreground)" }}>
          <p style={{ fontWeight: 600, color: "var(--nexus-purple)", marginBottom: 8, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>AI Interpretation</p>
          {narration}
        </div>
      ) : (
        <button
          onClick={onNarrate}
          disabled={narrating}
          className="btn-ghost"
          style={{ width: "100%", marginBottom: 12, opacity: narrating ? 0.6 : 1 }}
        >
          {narrating ? "Generating interpretation..." : "✦ Get AI Interpretation"}
        </button>
      )}

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onBack} className="btn-ghost" style={{ flex: 1 }}>← All Assessments</button>
        <button onClick={onRetake} className="btn-primary" style={{ flex: 1 }}>Retake</button>
      </div>

      <p style={{ fontSize: 11, color: "var(--muted-foreground)", textAlign: "center", marginTop: 14, lineHeight: 1.5 }}>
        This is a screening tool, not a clinical diagnosis. For concerns about your mental health, please consult a qualified professional.
      </p>
    </div>
  );
}

// ─── Assessments Section ──────────────────────────────────────────────────────

function AssessmentsSection({ cookieId }: { cookieId: string }) {
  const [activePlugin, setActivePlugin] = useState<InstrumentPlugin | null>(null);
  const [session, setSession] = useState<InstrumentSession | null>(null);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [startTime, setStartTime] = useState<number>(0);
  const [narration, setNarration] = useState<string | null>(null);
  const [narrating, setNarrating] = useState(false);

  const saveResult = trpc.clarity.saveAssessmentResult.useMutation();
  const narrateMut = trpc.clarity.narrateResult.useMutation();

  const handleStart = (plugin: InstrumentPlugin) => {
    setActivePlugin(plugin);
    setSession(null);
    setResult(null);
    setNarration(null);
    setStartTime(Date.now());
  };

  const handleComplete = (sess: InstrumentSession, res: ScoreResult) => {
    setSession(sess);
    setResult(res);
    const durationSeconds = Math.round((Date.now() - startTime) / 1000);
    saveResult.mutate({
      cookieId,
      instrumentId: res.instrumentId,
      instrumentVersion: res.instrumentVersion,
      totalScore: res.totalScore,
      severity: res.severity,
      subscales: res.subscales,
      durationSeconds,
    });
  };

  const handleNarrate = async () => {
    if (!activePlugin || !result) return;
    setNarrating(true);
    try {
      const res = await narrateMut.mutateAsync({
        cookieId,
        instrumentTitle: activePlugin.definition.title,
        totalScore: result.totalScore,
        severity: result.severity,
        subscales: result.subscales,
      });
      setNarration(res.narration);
    } finally {
      setNarrating(false);
    }
  };

  // Grid view
  if (!activePlugin) {
    return (
      <div>
        <p style={{ color: "var(--muted-foreground)", fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
          Choose from {instrumentRegistry.length} clinically-validated instruments. Results are stored locally and never shared without your consent.
        </p>
        {Object.entries(INSTRUMENT_CATEGORIES).map(([category, ids]) => {
          const plugins = ids.flatMap((id) => {
            const p = instrumentRegistry.find((ins) => ins.definition.id === id);
            return p ? [p] : [];
          });
          if (plugins.length === 0) return null;
          return (
            <div key={category} style={{ marginBottom: 28 }}>
              <p style={{ fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--muted-foreground)", marginBottom: 10 }}>
                {category}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                {plugins.map((p) => (
                  <div
                    key={p.definition.id}
                    className="card-nexus"
                    style={{ padding: "14px 16px", cursor: "pointer" }}
                    onClick={() => handleStart(p)}
                  >
                    <p style={{ fontWeight: 600, fontSize: 13, color: "var(--foreground)", marginBottom: 4 }}>
                      {p.definition.title}
                    </p>
                    <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 10 }}>
                      {p.definition.items.length} items · v{p.definition.version}
                    </p>
                    <button className="btn-primary" style={{ padding: "6px 14px", fontSize: 12 }}>
                      Take Assessment
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Runner view
  return (
    <div className="card-nexus" style={{ maxWidth: 580, margin: "0 auto", padding: 28 }}>
      {!result ? (
        <AssessmentRunner
          plugin={activePlugin}
          onComplete={handleComplete}
          onClose={() => setActivePlugin(null)}
        />
      ) : (
        <AssessmentResult
          plugin={activePlugin}
          result={result}
          onNarrate={handleNarrate}
          narration={narration}
          narrating={narrating}
          onRetake={() => { setResult(null); setSession(null); setNarration(null); setStartTime(Date.now()); }}
          onBack={() => setActivePlugin(null)}
        />
      )}
    </div>
  );
}

// ─── Cognitive Training Exercises ─────────────────────────────────────────────

// ── N-Back Task ────────────────────────────────────────────────────────────────
function NBackExercise({ onFinish }: { onFinish: (acc: number, rt: number, level: number) => void }) {
  const N = 2;
  const SEQUENCE_LENGTH = 20;
  const DISPLAY_MS = 500;
  const GAP_MS = 1500;

  const LETTERS = "BCDFGHJKLMNPQRSTVWXZ".split("");

  const [phase, setPhase] = useState<"intro" | "running" | "done">("intro");
  const [sequence, setSequence] = useState<string[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showStimulus, setShowStimulus] = useState(false);
  const [userResponses, setUserResponses] = useState<boolean[]>([]);
  const [waiting, setWaiting] = useState(false);
  const reactionStart = useRef(0);
  const totalRT = useRef(0);
  const rtCount = useRef(0);

  const generateSequence = () => {
    const seq: string[] = [];
    for (let i = 0; i < SEQUENCE_LENGTH; i++) {
      if (i >= N && Math.random() < 0.33) {
        seq.push(seq[i - N]);
      } else {
        let l;
        do { l = LETTERS[Math.floor(Math.random() * LETTERS.length)]; } while (i >= N && l === seq[i - N]);
        seq.push(l);
      }
    }
    return seq;
  };

  const start = () => {
    const seq = generateSequence();
    setSequence(seq);
    setCurrentIdx(0);
    setUserResponses([]);
    setPhase("running");
    setShowStimulus(false);
    setWaiting(false);
    totalRT.current = 0;
    rtCount.current = 0;
  };

  useEffect(() => {
    if (phase !== "running") return;
    if (currentIdx >= sequence.length) {
      setPhase("done");
      return;
    }

    // show stimulus
    const showTimer = setTimeout(() => {
      setShowStimulus(true);
      reactionStart.current = Date.now();
      setWaiting(true);

      const hideTimer = setTimeout(() => {
        setShowStimulus(false);
        // auto-advance (user didn't respond → false)
        setUserResponses((prev) => {
          if (prev.length <= currentIdx) return [...prev, false];
          return prev;
        });
        setWaiting(false);
        setCurrentIdx((i) => i + 1);
      }, DISPLAY_MS);

      return () => clearTimeout(hideTimer);
    }, GAP_MS - DISPLAY_MS);

    return () => clearTimeout(showTimer);
  }, [phase, currentIdx, sequence]);

  const handleMatch = () => {
    if (!waiting || currentIdx < N) return;
    const rt = Date.now() - reactionStart.current;
    totalRT.current += rt;
    rtCount.current++;
    setUserResponses((prev) => {
      const updated = [...prev];
      updated[currentIdx] = true;
      return updated;
    });
    setWaiting(false);
    setShowStimulus(false);
    setCurrentIdx((i) => i + 1);
  };

  useEffect(() => {
    if (phase === "done" && sequence.length > 0) {
      let correct = 0;
      let total = 0;
      for (let i = N; i < sequence.length; i++) {
        const isMatch = sequence[i] === sequence[i - N];
        const responded = userResponses[i] ?? false;
        if (isMatch) { total++; if (responded) correct++; }
        else { total++; if (!responded) correct++; }
      }
      const acc = total > 0 ? Math.round((correct / total) * 100) : 0;
      const avgRT = rtCount.current > 0 ? Math.round(totalRT.current / rtCount.current) : 0;
      onFinish(acc, avgRT, N);
    }
  }, [phase]);

  if (phase === "intro") {
    return (
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: 20 }}>
          You will see a sequence of letters appear one at a time. Press <strong>Match</strong> whenever the current letter matches the letter from <strong>{N} steps ago</strong>.
        </p>
        <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 24 }}>
          {SEQUENCE_LENGTH} trials · ~45 seconds
        </p>
        <button className="btn-primary" onClick={start}>Start N-Back</button>
      </div>
    );
  }

  if (phase === "done") {
    return <p style={{ textAlign: "center", color: "var(--muted-foreground)" }}>Calculating results...</p>;
  }

  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 8 }}>
        Trial {currentIdx + 1} / {sequence.length}
      </p>
      <div style={{
        width: 120, height: 120, borderRadius: 16, margin: "0 auto 24px",
        background: showStimulus ? "var(--nexus-purple)" : "var(--surface-2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "background 0.1s",
      }}>
        <span style={{ fontSize: 48, fontWeight: 700, color: showStimulus ? "#fff" : "transparent" }}>
          {sequence[currentIdx]}
        </span>
      </div>
      <button
        className="btn-primary"
        onClick={handleMatch}
        disabled={!waiting || currentIdx < N}
        style={{ padding: "14px 40px", fontSize: 16, opacity: (!waiting || currentIdx < N) ? 0.4 : 1 }}
      >
        Match
      </button>
      <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 12 }}>
        Press "Match" if this letter matches {N} back
      </p>
    </div>
  );
}

// ── Stroop Test ────────────────────────────────────────────────────────────────
const STROOP_COLORS: Array<{ name: string; hex: string }> = [
  { name: "RED", hex: "#ef4444" },
  { name: "BLUE", hex: "#3b82f6" },
  { name: "GREEN", hex: "#22c55e" },
  { name: "YELLOW", hex: "#eab308" },
];

function StroopExercise({ onFinish }: { onFinish: (acc: number, rt: number, level: number) => void }) {
  const TRIALS = 20;
  const [phase, setPhase] = useState<"intro" | "running" | "done">("intro");
  const [trial, setTrial] = useState(0);
  const [wordText, setWordText] = useState("");
  const [wordColor, setWordColor] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
  const [correct, setCorrect] = useState(0);
  const [totalRT, setTotalRT] = useState(0);
  const rtRef = useRef(0);

  const nextTrial = useCallback(() => {
    const word = STROOP_COLORS[Math.floor(Math.random() * STROOP_COLORS.length)];
    let color;
    do { color = STROOP_COLORS[Math.floor(Math.random() * STROOP_COLORS.length)]; } while (color.name === word.name);
    setWordText(word.name);
    setWordColor(color.hex);
    setFeedback(null);
    rtRef.current = Date.now();
  }, []);

  const start = () => {
    setTrial(0);
    setCorrect(0);
    setTotalRT(0);
    setPhase("running");
    nextTrial();
  };

  const handleAnswer = (colorName: string) => {
    const rt = Date.now() - rtRef.current;
    const isCorrect = colorName === wordColor;

    setFeedback(isCorrect ? "correct" : "wrong");
    setTotalRT((t) => t + rt);
    if (isCorrect) setCorrect((c) => c + 1);

    setTimeout(() => {
      if (trial + 1 >= TRIALS) {
        setPhase("done");
        const finalCorrect = correct + (isCorrect ? 1 : 0);
        const finalRT = totalRT + rt;
        const acc = Math.round((finalCorrect / TRIALS) * 100);
        const avgRT = Math.round(finalRT / TRIALS);
        onFinish(acc, avgRT, 1);
      } else {
        setTrial((t) => t + 1);
        nextTrial();
      }
    }, 400);
  };

  if (phase === "intro") {
    return (
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: 20 }}>
          A color word will appear. Click the button matching the <strong>ink color</strong>, not the word itself.
        </p>
        <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 24 }}>{TRIALS} trials · ~1 minute</p>
        <button className="btn-primary" onClick={start}>Start Stroop</button>
      </div>
    );
  }

  if (phase === "done") {
    return <p style={{ textAlign: "center", color: "var(--muted-foreground)" }}>Calculating results...</p>;
  }

  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 16 }}>
        Trial {trial + 1} / {TRIALS}
        {feedback && (
          <span style={{ marginLeft: 10, color: feedback === "correct" ? "#22c55e" : "#ef4444", fontWeight: 700 }}>
            {feedback === "correct" ? "✓" : "✗"}
          </span>
        )}
      </p>
      <div style={{ fontSize: 52, fontWeight: 800, color: wordColor, marginBottom: 32, letterSpacing: "0.05em" }}>
        {wordText}
      </div>
      <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 16 }}>Click the ink color:</p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        {STROOP_COLORS.map((c) => (
          <button
            key={c.name}
            onClick={() => handleAnswer(c.hex)}
            style={{
              width: 64, height: 64, borderRadius: 12, border: "none",
              background: c.hex, cursor: "pointer", fontWeight: 700,
              color: "#fff", fontSize: 11, boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Processing Speed (Digit Symbol) ───────────────────────────────────────────
const DIGIT_SYMBOLS: Record<number, string> = { 1: "▲", 2: "●", 3: "■", 4: "◆", 5: "★", 6: "✚", 7: "◯", 8: "▼", 9: "✖" };

function ProcessingSpeedExercise({ onFinish }: { onFinish: (acc: number, rt: number, level: number) => void }) {
  const DURATION_S = 60;
  const [phase, setPhase] = useState<"intro" | "running" | "done">("intro");
  const [digit, setDigit] = useState(1);
  const [options, setOptions] = useState<string[]>([]);
  const [correct, setCorrect] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION_S);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  const nextQuestion = () => {
    const d = Math.ceil(Math.random() * 9);
    setDigit(d);
    const correctSym = DIGIT_SYMBOLS[d];
    const others = Object.values(DIGIT_SYMBOLS).filter((s) => s !== correctSym);
    const shuffled = [correctSym, ...others.sort(() => Math.random() - 0.5).slice(0, 3)].sort(() => Math.random() - 0.5);
    setOptions(shuffled);
    setFeedback(null);
  };

  const start = () => {
    setCorrect(0);
    setAttempts(0);
    setTimeLeft(DURATION_S);
    setPhase("running");
    nextQuestion();
  };

  useEffect(() => {
    if (phase !== "running") return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          setPhase("done");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase === "done") {
      const acc = attempts > 0 ? Math.round((correct / attempts) * 100) : 0;
      onFinish(acc, 0, 1);
    }
  }, [phase]);

  const handleAnswer = (sym: string) => {
    const isCorrect = sym === DIGIT_SYMBOLS[digit];
    setFeedback(isCorrect ? "correct" : "wrong");
    setAttempts((a) => a + 1);
    if (isCorrect) setCorrect((c) => c + 1);
    setTimeout(nextQuestion, 250);
  };

  if (phase === "intro") {
    return (
      <div style={{ textAlign: "center" }}>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 16, flexWrap: "wrap" }}>
          {Object.entries(DIGIT_SYMBOLS).map(([d, s]) => (
            <div key={d} style={{ padding: "4px 10px", borderRadius: 6, background: "var(--surface-1)", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{d}</div>
              <div style={{ fontSize: 18 }}>{s}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: 20 }}>
          Match each digit to its symbol as fast as possible. 60 seconds.
        </p>
        <button className="btn-primary" onClick={start}>Start</button>
      </div>
    );
  }

  if (phase === "done") {
    return <p style={{ textAlign: "center", color: "var(--muted-foreground)" }}>Calculating results...</p>;
  }

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, fontSize: 13, color: "var(--muted-foreground)" }}>
        <span>⏱ {timeLeft}s</span>
        <span>✓ {correct}</span>
      </div>
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 16, flexWrap: "wrap" }}>
          {Object.entries(DIGIT_SYMBOLS).map(([d, s]) => (
            <div key={d} style={{ padding: "3px 8px", borderRadius: 6, background: "var(--surface-1)", textAlign: "center", border: digit === Number(d) ? "2px solid var(--nexus-purple)" : "2px solid transparent" }}>
              <div style={{ fontSize: 10, color: "var(--muted-foreground)" }}>{d}</div>
              <div style={{ fontSize: 14 }}>{s}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 32, fontWeight: 800, color: "var(--nexus-purple)", marginBottom: 8 }}>{digit}</p>
        {feedback && <p style={{ fontSize: 12, color: feedback === "correct" ? "#22c55e" : "#ef4444", marginBottom: 8 }}>{feedback === "correct" ? "✓" : "✗"}</p>}
      </div>
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        {options.map((s) => (
          <button
            key={s}
            onClick={() => handleAnswer(s)}
            style={{ fontSize: 28, width: 60, height: 60, borderRadius: 12, border: "1px solid var(--surface-3)", background: "var(--surface-1)", cursor: "pointer", color: "var(--foreground)" }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Attention CPT (AX Variant) ─────────────────────────────────────────────────
function AttentionCPTExercise({ onFinish }: { onFinish: (acc: number, rt: number, level: number) => void }) {
  const TRIALS = 40;
  const DISPLAY_MS = 400;
  const ISI_MS = 1200;

  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const [phase, setPhase] = useState<"intro" | "running" | "done">("intro");
  const [sequence, setSequence] = useState<string[]>([]);
  const [idx, setIdx] = useState(0);
  const [show, setShow] = useState(false);
  const [hits, setHits] = useState(0);
  const [falseAlarms, setFalseAlarms] = useState(0);
  const [totalTargets, setTotalTargets] = useState(0);
  const [responded, setResponded] = useState(false);
  const totalRT = useRef(0);
  const rtCount = useRef(0);
  const stimulusTime = useRef(0);

  const generateSequence = () => {
    const seq: string[] = [];
    for (let i = 0; i < TRIALS; i++) {
      if (i > 0 && seq[i - 1] === "A" && Math.random() < 0.35) {
        seq.push("X");
      } else {
        let l;
        do { l = LETTERS[Math.floor(Math.random() * LETTERS.length)]; } while (l === "X" && (i === 0 || seq[i - 1] !== "A"));
        seq.push(l === "X" && (i === 0 || seq[i - 1] !== "A") ? "B" : l);
      }
    }
    return seq;
  };

  const start = () => {
    const seq = generateSequence();
    setSequence(seq);
    setIdx(0);
    setHits(0);
    setFalseAlarms(0);
    setTotalTargets(0);
    setResponded(false);
    totalRT.current = 0;
    rtCount.current = 0;
    setPhase("running");
  };

  useEffect(() => {
    if (phase !== "running" || sequence.length === 0) return;
    if (idx >= sequence.length) { setPhase("done"); return; }

    setShow(true);
    setResponded(false);
    stimulusTime.current = Date.now();

    if (idx > 0 && sequence[idx] === "X" && sequence[idx - 1] === "A") {
      setTotalTargets((t) => t + 1);
    }

    const hide = setTimeout(() => {
      setShow(false);
      const advance = setTimeout(() => setIdx((i) => i + 1), ISI_MS - DISPLAY_MS);
      return () => clearTimeout(advance);
    }, DISPLAY_MS);

    return () => clearTimeout(hide);
  }, [phase, idx, sequence]);

  const handlePress = () => {
    if (phase !== "running" || !show || responded) return;
    setResponded(true);
    const rt = Date.now() - stimulusTime.current;
    const isTarget = idx > 0 && sequence[idx] === "X" && sequence[idx - 1] === "A";
    if (isTarget) {
      setHits((h) => h + 1);
      totalRT.current += rt;
      rtCount.current++;
    } else {
      setFalseAlarms((f) => f + 1);
    }
  };

  useEffect(() => {
    if (phase === "done") {
      const acc = totalTargets > 0 ? Math.round((hits / totalTargets) * 100) : 0;
      const avgRT = rtCount.current > 0 ? Math.round(totalRT.current / rtCount.current) : 0;
      onFinish(acc, avgRT, 1);
    }
  }, [phase]);

  if (phase === "intro") {
    return (
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: 20 }}>
          Letters will flash one at a time. Press <strong>Respond</strong> only when you see <strong>X</strong> immediately after <strong>A</strong>. Don't press for anything else.
        </p>
        <button className="btn-primary" onClick={start}>Start CPT</button>
      </div>
    );
  }

  if (phase === "done") {
    return <p style={{ textAlign: "center", color: "var(--muted-foreground)" }}>Calculating results...</p>;
  }

  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 16 }}>
        Trial {idx + 1} / {sequence.length} · Press only for X after A
      </p>
      <div style={{ width: 100, height: 100, margin: "0 auto 28px", borderRadius: 12, background: show ? "var(--surface-2)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.1s" }}>
        <span style={{ fontSize: 56, fontWeight: 800, color: "var(--foreground)", opacity: show ? 1 : 0 }}>
          {sequence[idx]}
        </span>
      </div>
      <button className="btn-primary" onClick={handlePress} style={{ padding: "16px 48px", fontSize: 16 }}>
        Respond
      </button>
    </div>
  );
}

// ── Pattern Recognition ────────────────────────────────────────────────────────
type PatternItem = number | string;

const PATTERNS: Array<{ sequence: PatternItem[]; answer: PatternItem; explanation: string }> = [
  { sequence: [2, 4, 6, 8, "?"], answer: 10, explanation: "+2 each step" },
  { sequence: [1, 4, 9, 16, "?"], answer: 25, explanation: "Square numbers" },
  { sequence: [3, 6, 12, 24, "?"], answer: 48, explanation: "×2 each step" },
  { sequence: [1, 1, 2, 3, 5, "?"], answer: 8, explanation: "Fibonacci sequence" },
  { sequence: [100, 50, 25, "?"], answer: 12.5, explanation: "÷2 each step" },
  { sequence: [2, 3, 5, 7, 11, "?"], answer: 13, explanation: "Prime numbers" },
  { sequence: [1, 8, 27, 64, "?"], answer: 125, explanation: "Cube numbers" },
  { sequence: [5, 10, 20, 40, "?"], answer: 80, explanation: "×2 each step" },
];

function PatternExercise({ onFinish }: { onFinish: (acc: number, rt: number, level: number) => void }) {
  const [phase, setPhase] = useState<"intro" | "running" | "done">("intro");
  const [qIdx, setQIdx] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [correct, setCorrect] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const shuffled = useRef<typeof PATTERNS>([]);

  const start = () => {
    shuffled.current = [...PATTERNS].sort(() => Math.random() - 0.5).slice(0, 6);
    setQIdx(0);
    setCorrect(0);
    setUserInput("");
    setFeedback(null);
    setPhase("running");
  };

  const currentPattern = shuffled.current[qIdx];

  const submit = () => {
    if (!currentPattern) return;
    const parsed = parseFloat(userInput);
    const isCorrect = Math.abs(parsed - Number(currentPattern.answer)) < 0.01;
    setFeedback(isCorrect ? `Correct! ${currentPattern.explanation}` : `Incorrect. Answer: ${currentPattern.answer} (${currentPattern.explanation})`);
    if (isCorrect) setCorrect((c) => c + 1);
    setTimeout(() => {
      setFeedback(null);
      setUserInput("");
      if (qIdx + 1 >= shuffled.current.length) {
        setPhase("done");
        onFinish(Math.round((correct + (isCorrect ? 1 : 0)) / shuffled.current.length * 100), 0, 1);
      } else {
        setQIdx((i) => i + 1);
      }
    }, 1600);
  };

  if (phase === "intro") {
    return (
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: 20 }}>
          Complete the number sequence by finding the pattern. Type the missing number.
        </p>
        <button className="btn-primary" onClick={start}>Start Patterns</button>
      </div>
    );
  }

  if (phase === "done") {
    return <p style={{ textAlign: "center", color: "var(--muted-foreground)" }}>Calculating results...</p>;
  }

  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 16 }}>
        Pattern {qIdx + 1} / {shuffled.current.length}
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", alignItems: "center", marginBottom: 24, flexWrap: "wrap" }}>
        {currentPattern?.sequence.map((item, i) => (
          <div key={i} style={{ width: 52, height: 52, borderRadius: 10, background: item === "?" ? "var(--nexus-purple)" : "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, color: item === "?" ? "#fff" : "var(--foreground)" }}>
            {item}
          </div>
        ))}
      </div>
      {feedback ? (
        <p style={{ fontSize: 14, color: feedback.startsWith("Correct") ? "#22c55e" : "#ef4444", fontWeight: 600, marginBottom: 16 }}>{feedback}</p>
      ) : (
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 16 }}>
          <input
            type="number"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="?"
            style={{ width: 100, padding: "10px 14px", borderRadius: 10, border: "1px solid var(--surface-3)", background: "var(--surface-1)", color: "var(--foreground)", fontSize: 18, textAlign: "center" }}
          />
          <button className="btn-primary" onClick={submit} disabled={!userInput}>Submit</button>
        </div>
      )}
    </div>
  );
}

// ── Dual Task ──────────────────────────────────────────────────────────────────
function DualTaskExercise({ onFinish }: { onFinish: (acc: number, rt: number, level: number) => void }) {
  const TRIALS = 16;
  const DIGIT_INTERVAL_MS = 2000;
  const [phase, setPhase] = useState<"intro" | "running" | "done">("intro");
  const [digit, setDigit] = useState<number | null>(null);
  const [letter, setLetter] = useState<string | null>(null);
  const [digitOdd, setDigitOdd] = useState<boolean | null>(null);
  const [letterVowel, setLetterVowel] = useState<boolean | null>(null);
  const [trial, setTrial] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [attempted, setAttempted] = useState(0);
  const VOWELS = new Set("AEIOU");

  const nextTrial = () => {
    const d = Math.ceil(Math.random() * 9);
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const l = letters[Math.floor(Math.random() * letters.length)];
    setDigit(d);
    setLetter(l);
    setDigitOdd(null);
    setLetterVowel(null);
  };

  const start = () => {
    setTrial(0);
    setCorrect(0);
    setAttempted(0);
    setPhase("running");
    nextTrial();
  };

  const handleDigit = (isOdd: boolean) => {
    if (digitOdd !== null || !digit) return;
    setDigitOdd(isOdd);
    const correctDigit = digit % 2 !== 0;
    if (isOdd === correctDigit) setCorrect((c) => c + 1);
    setAttempted((a) => a + 1);
    checkAdvance(isOdd, letterVowel);
  };

  const handleLetter = (isVowel: boolean) => {
    if (letterVowel !== null || !letter) return;
    setLetterVowel(isVowel);
    const correctVowel = VOWELS.has(letter);
    if (isVowel === correctVowel) setCorrect((c) => c + 1);
    setAttempted((a) => a + 1);
    checkAdvance(digitOdd, isVowel);
  };

  const checkAdvance = (dOdd: boolean | null, lVowel: boolean | null) => {
    if (dOdd !== null && lVowel !== null) {
      setTimeout(() => {
        if (trial + 1 >= TRIALS) {
          setPhase("done");
          onFinish(attempted > 0 ? Math.round((correct / attempted) * 100) : 0, 0, 1);
        } else {
          setTrial((t) => t + 1);
          nextTrial();
        }
      }, 600);
    }
  };

  if (phase === "intro") {
    return (
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: 20 }}>
          You'll see a <strong>digit</strong> and a <strong>letter</strong> simultaneously. Classify each independently:
          digit as Odd/Even, letter as Vowel/Consonant.
        </p>
        <button className="btn-primary" onClick={start}>Start Dual Task</button>
      </div>
    );
  }

  if (phase === "done") {
    return <p style={{ textAlign: "center", color: "var(--muted-foreground)" }}>Calculating results...</p>;
  }

  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 16 }}>Trial {trial + 1} / {TRIALS}</p>
      <div style={{ display: "flex", gap: 24, justifyContent: "center", marginBottom: 28 }}>
        <div style={{ width: 80, height: 80, borderRadius: 12, background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, fontWeight: 800, color: "var(--nexus-purple)" }}>
          {digit}
        </div>
        <div style={{ width: 80, height: 80, borderRadius: 12, background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, fontWeight: 800, color: "var(--foreground)" }}>
          {letter}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 10 }}>
        <button onClick={() => handleDigit(true)} disabled={digitOdd !== null} className="btn-ghost" style={{ padding: "8px 20px", opacity: digitOdd !== null ? 0.5 : 1 }}>Odd</button>
        <button onClick={() => handleDigit(false)} disabled={digitOdd !== null} className="btn-ghost" style={{ padding: "8px 20px", opacity: digitOdd !== null ? 0.5 : 1 }}>Even</button>
        <span style={{ color: "var(--muted-foreground)", alignSelf: "center", fontSize: 12 }}>(digit)</span>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <button onClick={() => handleLetter(true)} disabled={letterVowel !== null} className="btn-ghost" style={{ padding: "8px 20px", opacity: letterVowel !== null ? 0.5 : 1 }}>Vowel</button>
        <button onClick={() => handleLetter(false)} disabled={letterVowel !== null} className="btn-ghost" style={{ padding: "8px 20px", opacity: letterVowel !== null ? 0.5 : 1 }}>Consonant</button>
        <span style={{ color: "var(--muted-foreground)", alignSelf: "center", fontSize: 12 }}>(letter)</span>
      </div>
    </div>
  );
}

// ── Flanker Task ───────────────────────────────────────────────────────────────
function FlankerExercise({ onFinish }: { onFinish: (acc: number, rt: number, level: number) => void }) {
  const TRIALS = 24;
  const [phase, setPhase] = useState<"intro" | "running" | "done">("intro");
  const [trialNum, setTrialNum] = useState(0);
  const [arrows, setArrows] = useState<string[]>([]);
  const [responded, setResponded] = useState(false);
  const correctRef = useRef(0);
  const totalRTRef = useRef(0);
  const trialNumRef = useRef(0);
  const arrowsRef = useRef<string[]>([]);
  const trialStart = useRef(0);

  const nextTrial = useCallback((num: number) => {
    const congruent = Math.random() > 0.4;
    const dir = Math.random() > 0.5 ? "→" : "←";
    const opp = dir === "→" ? "←" : "→";
    const arr = congruent ? [dir, dir, dir, dir, dir] : [opp, opp, dir, opp, opp];
    arrowsRef.current = arr;
    trialNumRef.current = num;
    setArrows(arr);
    setTrialNum(num);
    setResponded(false);
    trialStart.current = Date.now();
  }, []);

  const start = () => {
    correctRef.current = 0;
    totalRTRef.current = 0;
    setPhase("running");
    nextTrial(0);
  };

  const handle = (goRight: boolean) => {
    if (responded) return;
    const rt = Date.now() - trialStart.current;
    const center = arrowsRef.current[2];
    const isCorrect = (center === "→") === goRight;
    if (isCorrect) correctRef.current++;
    totalRTRef.current += rt;
    setResponded(true);
    const next = trialNumRef.current + 1;
    setTimeout(() => {
      if (next >= TRIALS) {
        setPhase("done");
        onFinish(Math.round((correctRef.current / TRIALS) * 100), Math.round(totalRTRef.current / TRIALS), 2);
      } else {
        nextTrial(next);
      }
    }, 350);
  };

  if (phase === "intro") return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: 12 }}>
        Five arrows appear in a row. Press <strong>← Left</strong> or <strong>Right →</strong> based on which way the <strong>center arrow</strong> points — ignore the flankers.
      </p>
      <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 24 }}>{TRIALS} trials · ~1 min</p>
      <button className="btn-primary" onClick={start}>Start Flanker</button>
    </div>
  );

  if (phase === "done") return <p style={{ textAlign: "center", color: "var(--muted-foreground)" }}>Calculating results...</p>;

  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 20 }}>Trial {trialNum + 1} / {TRIALS}</p>
      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginBottom: 36, fontSize: 40, letterSpacing: 2 }}>
        {arrows.map((a, i) => (
          <span key={i} style={{ color: i === 2 ? "var(--nexus-purple)" : "var(--muted-foreground)", fontWeight: i === 2 ? 900 : 400 }}>{a}</span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
        <button onClick={() => handle(false)} disabled={responded} className="btn-ghost" style={{ padding: "10px 32px", fontSize: 18, opacity: responded ? 0.4 : 1 }}>← Left</button>
        <button onClick={() => handle(true)} disabled={responded} className="btn-ghost" style={{ padding: "10px 32px", fontSize: 18, opacity: responded ? 0.4 : 1 }}>Right →</button>
      </div>
    </div>
  );
}

// ── Go / No-Go ─────────────────────────────────────────────────────────────────
function GoNoGoExercise({ onFinish }: { onFinish: (acc: number, rt: number, level: number) => void }) {
  const TRIALS = 32;
  const DISPLAY_MS = 700;
  const ISI_MS = 500;
  const NOGO = "X";
  const LETTERS = "BCDFGHJKLMNPQRSTVWYZ".split("");

  const [phase, setPhase] = useState<"intro" | "running" | "done">("intro");
  const [idx, setIdx] = useState(0);
  const [stimulus, setStimulus] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"hit" | "miss" | "fa" | null>(null);

  const seqRef = useRef<string[]>([]);
  const respondedRef = useRef(false);
  const correctRef = useRef(0);
  const rtSumRef = useRef(0);
  const rtCountRef = useRef(0);
  const trialStartRef = useRef(0);

  const buildSeq = () => {
    const s: string[] = [];
    for (let i = 0; i < TRIALS; i++) {
      s.push(Math.random() < 0.25 ? NOGO : LETTERS[Math.floor(Math.random() * LETTERS.length)]);
    }
    return s;
  };

  useEffect(() => {
    if (phase !== "running") return;
    if (idx >= TRIALS) {
      setPhase("done");
      onFinish(Math.round((correctRef.current / TRIALS) * 100), rtCountRef.current > 0 ? Math.round(rtSumRef.current / rtCountRef.current) : 0, 1);
      return;
    }
    const stim = seqRef.current[idx];
    respondedRef.current = false;
    setStimulus(stim);
    setFeedback(null);
    trialStartRef.current = Date.now();

    const hideTimer = setTimeout(() => {
      if (!respondedRef.current) {
        if (stim === NOGO) { correctRef.current++; } // correct withhold
        else { setFeedback("miss"); }
      }
      setStimulus(null);
      const advTimer = setTimeout(() => setIdx((i) => i + 1), ISI_MS);
      return () => clearTimeout(advTimer);
    }, DISPLAY_MS);
    return () => clearTimeout(hideTimer);
  }, [phase, idx, onFinish]);

  const start = () => {
    correctRef.current = 0; rtSumRef.current = 0; rtCountRef.current = 0;
    seqRef.current = buildSeq();
    setIdx(0); setStimulus(null); setFeedback(null);
    setPhase("running");
  };

  const handleGo = () => {
    if (respondedRef.current || phase !== "running") return;
    respondedRef.current = true;
    const stim = seqRef.current[idx];
    if (stim && stim !== NOGO) {
      correctRef.current++;
      rtSumRef.current += Date.now() - trialStartRef.current;
      rtCountRef.current++;
      setFeedback("hit");
    } else {
      setFeedback("fa");
    }
  };

  if (phase === "intro") return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: 12 }}>
        Letters flash one at a time. Press <strong>GO!</strong> for any letter — but <strong>do NOT press</strong> when you see <strong style={{ color: "var(--nexus-purple)" }}>X</strong>.
      </p>
      <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 24 }}>{TRIALS} trials · ~45 sec</p>
      <button className="btn-primary" onClick={start}>Start Go/No-Go</button>
    </div>
  );

  if (phase === "done") return <p style={{ textAlign: "center", color: "var(--muted-foreground)" }}>Calculating results...</p>;

  const fbColor = feedback === "hit" ? "#22c55e" : feedback === "fa" ? "#ef4444" : feedback === "miss" ? "#f59e0b" : "var(--foreground)";

  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 24 }}>Trial {idx + 1} / {TRIALS}</p>
      <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
        {stimulus ? (
          <span style={{ fontSize: 72, fontWeight: 900, color: stimulus === NOGO ? "#ef4444" : "var(--foreground)" }}>{stimulus}</span>
        ) : (
          <span style={{ fontSize: 14, color: fbColor }}>{feedback === "hit" ? "✓ Hit!" : feedback === "miss" ? "Miss" : feedback === "fa" ? "False alarm!" : ""}</span>
        )}
      </div>
      <button onClick={handleGo} className="btn-primary" style={{ padding: "14px 48px", fontSize: 18 }}>GO!</button>
    </div>
  );
}

// ── Task Switching ─────────────────────────────────────────────────────────────
function TaskSwitchingExercise({ onFinish }: { onFinish: (acc: number, rt: number, level: number) => void }) {
  const TRIALS = 24;
  const SWITCH_EVERY = 6;
  type Rule = "odd" | "gt5";

  const [phase, setPhase] = useState<"intro" | "running" | "done">("intro");
  const [trialNum, setTrialNum] = useState(0);
  const [digit, setDigit] = useState(0);
  const [rule, setRule] = useState<Rule>("odd");
  const [ruleJustSwitched, setRuleJustSwitched] = useState(false);
  const [responded, setResponded] = useState(false);

  const correctRef = useRef(0);
  const rtSumRef = useRef(0);
  const trialNumRef = useRef(0);
  const ruleRef = useRef<Rule>("odd");
  const digitRef = useRef(0);
  const trialStart = useRef(0);

  const nextTrial = useCallback((num: number) => {
    const newRule: Rule = Math.floor(num / SWITCH_EVERY) % 2 === 0 ? "odd" : "gt5";
    const switched = num > 0 && newRule !== ruleRef.current;
    ruleRef.current = newRule;
    const d = Math.ceil(Math.random() * 9);
    digitRef.current = d;
    trialNumRef.current = num;
    setDigit(d);
    setRule(newRule);
    setTrialNum(num);
    setRuleJustSwitched(switched);
    setResponded(false);
    trialStart.current = Date.now();
  }, []);

  const start = () => {
    correctRef.current = 0; rtSumRef.current = 0;
    ruleRef.current = "odd";
    setPhase("running");
    nextTrial(0);
  };

  const handle = (yes: boolean) => {
    if (responded) return;
    const rt = Date.now() - trialStart.current;
    const d = digitRef.current;
    const r = ruleRef.current;
    const correct = r === "odd" ? (d % 2 !== 0) === yes : (d > 5) === yes;
    if (correct) correctRef.current++;
    rtSumRef.current += rt;
    setResponded(true);
    const next = trialNumRef.current + 1;
    setTimeout(() => {
      if (next >= TRIALS) {
        setPhase("done");
        onFinish(Math.round((correctRef.current / TRIALS) * 100), Math.round(rtSumRef.current / TRIALS), 2);
      } else {
        nextTrial(next);
      }
    }, 350);
  };

  if (phase === "intro") return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: 12 }}>
        A digit (1–9) appears. Answer <strong>Yes</strong> or <strong>No</strong> based on the current rule. The rule switches every {SWITCH_EVERY} trials — watch for the highlight!
      </p>
      <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 24 }}>Rules: "Is it odd?" · "Is it greater than 5?" · {TRIALS} trials</p>
      <button className="btn-primary" onClick={start}>Start Task Switching</button>
    </div>
  );

  if (phase === "done") return <p style={{ textAlign: "center", color: "var(--muted-foreground)" }}>Calculating results...</p>;

  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ marginBottom: 16, padding: "8px 20px", borderRadius: 8, background: ruleJustSwitched ? "var(--nexus-purple)" : "var(--surface-2)", display: "inline-block", transition: "background 0.3s" }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: ruleJustSwitched ? "#fff" : "var(--foreground)" }}>
          {ruleJustSwitched ? "⚡ RULE SWITCH! " : ""}Rule: {rule === "odd" ? "Is it ODD?" : "Is it GREATER THAN 5?"}
        </p>
      </div>
      <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 16 }}>Trial {trialNum + 1} / {TRIALS}</p>
      <div style={{ fontSize: 80, fontWeight: 900, color: "var(--nexus-purple)", marginBottom: 32, lineHeight: 1 }}>{digit}</div>
      <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
        <button onClick={() => handle(true)} disabled={responded} className="btn-primary" style={{ padding: "12px 40px", fontSize: 16, opacity: responded ? 0.4 : 1 }}>Yes</button>
        <button onClick={() => handle(false)} disabled={responded} className="btn-ghost" style={{ padding: "12px 40px", fontSize: 16, opacity: responded ? 0.4 : 1 }}>No</button>
      </div>
    </div>
  );
}

// ── Corsi Blocks ───────────────────────────────────────────────────────────────
function CorsiExercise({ onFinish }: { onFinish: (acc: number, rt: number, level: number) => void }) {
  const POSITIONS = [
    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
    { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 },
    { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 },
  ];
  const BLOCK_SIZE = 60;
  const GAP = 14;

  type SubPhase = "intro" | "showing" | "recall" | "feedback" | "done";
  const [phase, setPhase] = useState<SubPhase>("intro");
  const [span, setSpan] = useState(3);
  const [litIdx, setLitIdx] = useState<number | null>(null);
  const [sequence, setSequence] = useState<number[]>([]);
  const [userSeq, setUserSeq] = useState<number[]>([]);
  const [correct, setCorrect] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [fbOk, setFbOk] = useState(false);

  const genSeq = (length: number) =>
    Array.from({ length }, () => Math.floor(Math.random() * 9));

  const showSequence = useCallback((seq: number[]) => {
    setPhase("showing");
    setUserSeq([]);
    let i = 0;
    const step = () => {
      if (i >= seq.length) {
        setTimeout(() => { setLitIdx(null); setPhase("recall"); }, 500);
        return;
      }
      setLitIdx(seq[i]);
      i++;
      setTimeout(() => { setLitIdx(null); setTimeout(step, 300); }, 600);
    };
    setTimeout(step, 500);
  }, []);

  const startRound = useCallback((s: number) => {
    const seq = genSeq(s);
    setSequence(seq);
    showSequence(seq);
  }, [showSequence]);

  const start = () => {
    setSpan(3); setCorrect(0); setRounds(0);
    startRound(3);
  };

  const handleBlock = (blockIdx: number) => {
    if (phase !== "recall") return;
    const next = [...userSeq, blockIdx];
    setUserSeq(next);
    if (next.length === sequence.length) {
      const ok = next.every((v, i) => v === sequence[i]);
      setFbOk(ok);
      setPhase("feedback");
      const newRounds = rounds + 1;
      setRounds(newRounds);
      if (newRounds >= 8) {
        const finalSpan = ok ? span + 1 : span;
        setTimeout(() => { setPhase("done"); onFinish(Math.round((correct + (ok ? 1 : 0)) / newRounds * 100), 0, finalSpan); }, 900);
      } else {
        const newSpan = ok ? Math.min(span + 1, 8) : Math.max(span - 1, 2);
        if (ok) setCorrect((c) => c + 1);
        setSpan(newSpan);
        setTimeout(() => startRound(newSpan), 1000);
      }
    }
  };

  if (phase === "intro") return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: 12 }}>
        Watch blocks light up in sequence, then click them in the <strong>same order</strong> from memory. The sequence gets longer as you improve.
      </p>
      <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 24 }}>Starts at span 3 · 8 rounds</p>
      <button className="btn-primary" onClick={start}>Start Corsi</button>
    </div>
  );

  if (phase === "done") return <p style={{ textAlign: "center", color: "var(--muted-foreground)" }}>Calculating results...</p>;

  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 6 }}>Round {rounds + 1} / 8 · Span {span}</p>
      <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 16, minHeight: 18 }}>
        {phase === "showing" ? "Watch the sequence..." : phase === "recall" ? `Click the blocks in order (${userSeq.length}/${sequence.length})` : phase === "feedback" ? (fbOk ? "✓ Correct!" : "✗ Incorrect") : ""}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: GAP, width: BLOCK_SIZE * 3 + GAP * 2, margin: "0 auto" }}>
        {POSITIONS.map((_, i) => (
          <div
            key={i}
            onClick={() => handleBlock(i)}
            style={{
              width: BLOCK_SIZE, height: BLOCK_SIZE, borderRadius: 10,
              background: litIdx === i ? "var(--nexus-purple)" : userSeq.includes(i) ? "var(--nexus-purple-muted, #6d28d9aa)" : "var(--surface-2)",
              cursor: phase === "recall" ? "pointer" : "default",
              transition: "background 0.15s",
              border: phase === "recall" ? "2px solid var(--border)" : "2px solid transparent",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Mental Rotation ────────────────────────────────────────────────────────────
function MentalRotationExercise({ onFinish }: { onFinish: (acc: number, rt: number, level: number) => void }) {
  const ROUNDS = 10;
  const SIZE = 4;

  const BASE_SHAPES: number[][][] = [
    [[1,1,0,0],[1,0,0,0],[1,0,0,0],[0,0,0,0]],
    [[1,0,0,0],[1,1,0,0],[0,1,0,0],[0,0,0,0]],
    [[1,1,1,0],[1,0,0,0],[0,0,0,0],[0,0,0,0]],
    [[1,1,0,0],[0,1,0,0],[0,1,1,0],[0,0,0,0]],
    [[1,0,0,0],[1,1,0,0],[1,0,0,0],[0,0,0,0]],
    [[0,1,0,0],[1,1,0,0],[0,1,0,0],[0,1,0,0]],
    [[1,1,1,0],[0,1,0,0],[0,1,0,0],[0,0,0,0]],
    [[1,0,1,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
    [[1,1,0,0],[1,0,0,0],[1,1,0,0],[0,0,0,0]],
    [[0,1,1,0],[0,1,0,0],[1,1,0,0],[0,0,0,0]],
  ];

  const rot90CW = (g: number[][]) => {
    const r = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    for (let row = 0; row < SIZE; row++)
      for (let col = 0; col < SIZE; col++)
        r[col][SIZE - 1 - row] = g[row][col];
    return r;
  };
  const mirrorH = (g: number[][]) => g.map((row) => [...row].reverse());

  const [phase, setPhase] = useState<"intro" | "running" | "done">("intro");
  const [roundNum, setRoundNum] = useState(0);
  const [reference, setReference] = useState<number[][]>([]);
  const [candidates, setCandidates] = useState<number[][][]>([]);
  const [correctIdx, setCorrectIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const correctRef = useRef(0);
  const rtSumRef = useRef(0);
  const roundStart = useRef(0);

  const buildRound = useCallback((num: number) => {
    const shape = BASE_SHAPES[num % BASE_SHAPES.length];
    const rotations = [rot90CW, (g: number[][]) => rot90CW(rot90CW(g)), (g: number[][]) => rot90CW(rot90CW(rot90CW(g)))];
    const correct = rot90CW(shape);
    const wrongs = [rotations[1](shape), rotations[2](shape), mirrorH(shape)];
    const pool = [...wrongs.slice(0, 3)];
    const ci = Math.floor(Math.random() * 4);
    pool.splice(ci, 0, correct);
    setReference(shape);
    setCandidates(pool);
    setCorrectIdx(ci);
    setRoundNum(num);
    setSelected(null);
    roundStart.current = Date.now();
  }, []);

  const start = () => {
    correctRef.current = 0; rtSumRef.current = 0;
    setPhase("running");
    buildRound(0);
  };

  const handleSelect = (i: number) => {
    if (selected !== null) return;
    const rt = Date.now() - roundStart.current;
    rtSumRef.current += rt;
    if (i === correctIdx) correctRef.current++;
    setSelected(i);
    const next = roundNum + 1;
    setTimeout(() => {
      if (next >= ROUNDS) {
        setPhase("done");
        onFinish(Math.round((correctRef.current / ROUNDS) * 100), Math.round(rtSumRef.current / ROUNDS), 2);
      } else {
        buildRound(next);
      }
    }, 700);
  };

  const ShapeGrid = ({ grid, highlight }: { grid: number[][]; highlight?: "correct" | "wrong" }) => (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 3, width: 76 }}>
      {grid.map((row, r) => row.map((cell, c) => (
        <div key={`${r}-${c}`} style={{ width: 16, height: 16, borderRadius: 3, background: cell ? (highlight === "correct" ? "#22c55e" : highlight === "wrong" ? "#ef4444" : "var(--nexus-purple)") : "var(--surface-2)" }} />
      )))}
    </div>
  );

  if (phase === "intro") return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: 12 }}>
        A shape is shown on the left. Pick the candidate on the right that is the <strong>90° clockwise rotation</strong> of that shape.
      </p>
      <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 24 }}>{ROUNDS} rounds · no time limit</p>
      <button className="btn-primary" onClick={start}>Start Mental Rotation</button>
    </div>
  );

  if (phase === "done") return <p style={{ textAlign: "center", color: "var(--muted-foreground)" }}>Calculating results...</p>;

  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 20 }}>Round {roundNum + 1} / {ROUNDS} · Which is 90° clockwise?</p>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 32, flexWrap: "wrap" }}>
        <div>
          <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 8 }}>Reference</p>
          <ShapeGrid grid={reference} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {candidates.map((cand, i) => (
            <div key={i} onClick={() => handleSelect(i)} style={{ cursor: selected !== null ? "default" : "pointer", padding: 10, borderRadius: 10, border: `2px solid ${selected === i ? (i === correctIdx ? "#22c55e" : "#ef4444") : "var(--border)"}`, background: "var(--surface-2)", transition: "border 0.2s" }}>
              <ShapeGrid grid={cand} highlight={selected !== null ? (i === correctIdx ? "correct" : undefined) : undefined} />
              <p style={{ fontSize: 11, marginTop: 6, color: "var(--muted-foreground)" }}>{["A","B","C","D"][i]}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Sustained Attention (Vigilance) ───────────────────────────────────────────
function SustainedAttentionExercise({ onFinish }: { onFinish: (acc: number, rt: number, level: number) => void }) {
  const TRIALS = 40;
  const DISPLAY_MS = 600;
  const ISI_MS = 400;
  // Target: current digit is LESS than the previous digit
  const [phase, setPhase] = useState<"intro" | "running" | "done">("intro");
  const [idx, setIdx] = useState(0);
  const [currentDigit, setCurrentDigit] = useState<number | null>(null);
  const [prevDigit, setPrevDigit] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const seqRef = useRef<number[]>([]);
  const respondedRef = useRef(false);
  const hitsRef = useRef(0);
  const falseAlarmsRef = useRef(0);
  const totalTargetsRef = useRef(0);
  const rtSumRef = useRef(0);
  const rtCountRef = useRef(0);
  const trialStartRef = useRef(0);

  const buildSeq = () => Array.from({ length: TRIALS }, () => Math.ceil(Math.random() * 9));

  useEffect(() => {
    if (phase !== "running") return;
    if (idx >= TRIALS) {
      setPhase("done");
      const totalCorrect = hitsRef.current + (totalTargetsRef.current - hitsRef.current > 0 ? 0 : 0);
      const accuracy = totalTargetsRef.current > 0
        ? Math.round((hitsRef.current / (hitsRef.current + falseAlarmsRef.current + (totalTargetsRef.current - hitsRef.current))) * 100)
        : Math.round(((TRIALS - falseAlarmsRef.current) / TRIALS) * 100);
      const avgRT = rtCountRef.current > 0 ? Math.round(rtSumRef.current / rtCountRef.current) : 0;
      onFinish(accuracy, avgRT, 1);
      return;
    }
    const digit = seqRef.current[idx];
    const prev = idx > 0 ? seqRef.current[idx - 1] : null;
    respondedRef.current = false;
    setCurrentDigit(digit);
    setPrevDigit(prev);
    setFeedback(null);
    trialStartRef.current = Date.now();
    if (prev !== null && digit < prev) totalTargetsRef.current++;

    const hideTimer = setTimeout(() => {
      if (!respondedRef.current && prev !== null && digit < prev) {
        setFeedback("miss");
      }
      setCurrentDigit(null);
      const adv = setTimeout(() => setIdx((i) => i + 1), ISI_MS);
      return () => clearTimeout(adv);
    }, DISPLAY_MS);
    return () => clearTimeout(hideTimer);
  }, [phase, idx, onFinish]);

  const start = () => {
    hitsRef.current = 0; falseAlarmsRef.current = 0;
    totalTargetsRef.current = 0; rtSumRef.current = 0; rtCountRef.current = 0;
    seqRef.current = buildSeq();
    setIdx(0); setCurrentDigit(null); setFeedback(null);
    setPhase("running");
  };

  const handleTarget = () => {
    if (respondedRef.current || phase !== "running") return;
    respondedRef.current = true;
    const digit = seqRef.current[idx];
    const prev = idx > 0 ? seqRef.current[idx - 1] : null;
    const isTarget = prev !== null && digit < prev;
    if (isTarget) {
      hitsRef.current++;
      rtSumRef.current += Date.now() - trialStartRef.current;
      rtCountRef.current++;
      setFeedback("✓");
    } else {
      falseAlarmsRef.current++;
      setFeedback("✗");
    }
  };

  if (phase === "intro") return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.6, marginBottom: 12 }}>
        Digits flash one at a time. Press <strong>TARGET!</strong> whenever the current number is <strong>lower</strong> than the previous number. Ignore all other digits.
      </p>
      <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 24 }}>{TRIALS} trials · ~45 sec · tests vigilance over time</p>
      <button className="btn-primary" onClick={start}>Start Vigilance</button>
    </div>
  );

  if (phase === "done") return <p style={{ textAlign: "center", color: "var(--muted-foreground)" }}>Calculating results...</p>;

  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 8 }}>Trial {idx + 1} / {TRIALS}</p>
      {prevDigit !== null && (
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 4 }}>Previous: <strong>{prevDigit}</strong></p>
      )}
      <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
        {currentDigit !== null ? (
          <span style={{ fontSize: 80, fontWeight: 900, color: "var(--nexus-purple)" }}>{currentDigit}</span>
        ) : (
          <span style={{ fontSize: 16, color: feedback === "✓" ? "#22c55e" : feedback === "✗" ? "#ef4444" : feedback === "miss" ? "#f59e0b" : "var(--muted-foreground)" }}>
            {feedback === "✓" ? "✓ Hit!" : feedback === "✗" ? "✗ False alarm" : feedback === "miss" ? "Missed target" : "·"}
          </span>
        )}
      </div>
      <button onClick={handleTarget} className="btn-primary" style={{ padding: "14px 48px", fontSize: 18 }}>TARGET!</button>
    </div>
  );
}

// ── Training Results ────────────────────────────────────────────────────────────
function TrainingResult({
  exerciseMeta,
  accuracy,
  reactionMs,
  level,
  onRetry,
  onBack,
}: {
  exerciseMeta: (typeof TRAINING_EXERCISES)[number];
  accuracy: number;
  reactionMs: number;
  level: number;
  onRetry: () => void;
  onBack: () => void;
}) {
  const percentile = Math.min(99, Math.max(1, Math.round((accuracy / 100) * 85 + 5)));
  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontSize: 36, fontWeight: 800, color: accuracy >= 70 ? "#22c55e" : accuracy >= 50 ? "#f59e0b" : "#ef4444", marginBottom: 4 }}>
        {accuracy}%
      </p>
      <p style={{ color: "var(--muted-foreground)", fontSize: 14, marginBottom: 16 }}>Accuracy</p>
      {reactionMs > 0 && (
        <p style={{ color: "var(--foreground)", fontSize: 13, marginBottom: 8 }}>Avg reaction time: <strong>{reactionMs}ms</strong></p>
      )}
      <p style={{ color: "var(--muted-foreground)", fontSize: 13, marginBottom: 24 }}>
        Estimated percentile: ~{percentile}th
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        <button onClick={onBack} className="btn-ghost">← Back</button>
        <button onClick={onRetry} className="btn-primary">Try Again</button>
      </div>
    </div>
  );
}

// ─── Cognitive Training Section ────────────────────────────────────────────────
function TrainingSection({ cookieId }: { cookieId: string }) {
  const [activeEx, setActiveEx] = useState<TrainingExercise | null>(null);
  const [phase, setPhase] = useState<"menu" | "running" | "result">("menu");
  const [lastResult, setLastResult] = useState<{ acc: number; rt: number; level: number } | null>(null);

  const saveMut = trpc.clarity.saveCogTrainingSession.useMutation();

  const handleFinish = (acc: number, rt: number, level: number) => {
    setLastResult({ acc, rt, level });
    setPhase("result");
    if (activeEx) {
      saveMut.mutate({
        cookieId,
        exerciseId: activeEx,
        accuracyPct: acc,
        reactionMs: rt,
        difficultyLevel: level,
        durationSeconds: 60,
      });
    }
  };

  if (phase === "menu" || !activeEx) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {TRAINING_EXERCISES.map((ex) => (
          <div
            key={ex.id}
            className="card-nexus"
            style={{ padding: "18px 20px", cursor: "pointer" }}
            onClick={() => { setActiveEx(ex.id); setPhase("running"); setLastResult(null); }}
          >
            <p style={{ fontSize: 28, marginBottom: 8 }}>{ex.icon}</p>
            <p style={{ fontWeight: 700, fontSize: 15, color: "var(--foreground)", marginBottom: 4 }}>{ex.label}</p>
            <p style={{ fontSize: 12, color: "var(--nexus-purple)", marginBottom: 6 }}>{ex.desc}</p>
            <p style={{ fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.5, marginBottom: 8 }}>{ex.science}</p>
            <p style={{ fontSize: 10, color: "var(--muted-foreground)", fontStyle: "italic" }}>📚 {ex.ref}</p>
          </div>
        ))}
      </div>
    );
  }

  const exMeta = TRAINING_EXERCISES.find((e) => e.id === activeEx)!;

  return (
    <div className="card-nexus" style={{ maxWidth: 520, margin: "0 auto", padding: 28 }}>
      {phase === "running" ? (
        <div>
          <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: "1px solid var(--border)" }}>
            <p style={{ fontWeight: 700, fontSize: 16, color: "var(--nexus-purple)", marginBottom: 4 }}>{exMeta.icon} {exMeta.label}</p>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 6 }}>{exMeta.desc}</p>
            <p style={{ fontSize: 11, color: "var(--muted-foreground)", lineHeight: 1.5, marginBottom: 4 }}>{exMeta.science}</p>
            <p style={{ fontSize: 10, color: "var(--muted-foreground)", fontStyle: "italic" }}>📚 {exMeta.ref}</p>
          </div>
          {activeEx === "nback" && <NBackExercise onFinish={handleFinish} />}
          {activeEx === "stroop" && <StroopExercise onFinish={handleFinish} />}
          {activeEx === "processing-speed" && <ProcessingSpeedExercise onFinish={handleFinish} />}
          {activeEx === "attention-cpt" && <AttentionCPTExercise onFinish={handleFinish} />}
          {activeEx === "pattern" && <PatternExercise onFinish={handleFinish} />}
          {activeEx === "dual-task" && <DualTaskExercise onFinish={handleFinish} />}
          {activeEx === "flanker" && <FlankerExercise onFinish={handleFinish} />}
          {activeEx === "gonogo" && <GoNoGoExercise onFinish={handleFinish} />}
          {activeEx === "task-switching" && <TaskSwitchingExercise onFinish={handleFinish} />}
          {activeEx === "corsi" && <CorsiExercise onFinish={handleFinish} />}
          {activeEx === "mental-rotation" && <MentalRotationExercise onFinish={handleFinish} />}
          {activeEx === "sustained-attention" && <SustainedAttentionExercise onFinish={handleFinish} />}
        </div>
      ) : phase === "result" && lastResult ? (
        <TrainingResult
          exerciseMeta={exMeta}
          accuracy={lastResult.acc}
          reactionMs={lastResult.rt}
          level={lastResult.level}
          onRetry={() => { setPhase("running"); setLastResult(null); }}
          onBack={() => { setActiveEx(null); setPhase("menu"); }}
        />
      ) : null}
    </div>
  );
}

// ─── Mood Section ─────────────────────────────────────────────────────────────
const MOOD_EMOJIS = ["😞", "😟", "😐", "🙂", "😄"];

function MoodSection({ cookieId }: { cookieId: string }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  const saveMut = trpc.clarity.saveMoodCheckin.useMutation();
  const historyQ = trpc.clarity.getMoodHistory.useQuery({ cookieId });

  const handleSave = async () => {
    if (!selected) return;
    await saveMut.mutateAsync({ cookieId, mood: selected, note: note.trim() || undefined });
    setSaved(true);
    setSelected(null);
    setNote("");
    historyQ.refetch();
    setTimeout(() => setSaved(false), 2500);
  };

  const history = historyQ.data ?? [];

  return (
    <div style={{ maxWidth: 520, margin: "0 auto" }}>
      <div className="card-nexus" style={{ padding: 24, marginBottom: 20 }}>
        <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, color: "var(--foreground)" }}>How are you feeling?</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 20 }}>
          {MOOD_EMOJIS.map((emoji, i) => {
            const val = i + 1;
            return (
              <button
                key={val}
                onClick={() => setSelected(val)}
                style={{
                  fontSize: 32, width: 56, height: 56, borderRadius: 14, border: `2px solid ${selected === val ? "var(--nexus-purple)" : "var(--surface-3)"}`,
                  background: selected === val ? "rgba(var(--nexus-purple-rgb,124,58,237),0.12)" : "var(--surface-1)",
                  cursor: "pointer", transition: "all 0.15s",
                  transform: selected === val ? "scale(1.15)" : "scale(1)",
                }}
                aria-label={`Mood ${val}`}
              >
                {emoji}
              </button>
            );
          })}
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note..."
          rows={2}
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--surface-3)", background: "var(--surface-1)", color: "var(--foreground)", fontSize: 13, resize: "none", marginBottom: 12 }}
        />
        {saved ? (
          <p style={{ textAlign: "center", color: "#22c55e", fontWeight: 600 }}>✓ Saved!</p>
        ) : (
          <button className="btn-primary" onClick={handleSave} disabled={!selected} style={{ width: "100%", opacity: selected ? 1 : 0.5 }}>
            Log Mood
          </button>
        )}
      </div>

      {history.length > 0 && (
        <div className="card-nexus" style={{ padding: 20 }}>
          <p style={{ fontWeight: 600, fontSize: 13, color: "var(--muted-foreground)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Last {history.length} check-ins
          </p>
          <MoodSparkline data={history} />
          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
            {history.slice(0, 5).map((entry) => (
              <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 10px", borderRadius: 8, background: "var(--surface-1)" }}>
                <span style={{ fontSize: 20 }}>{MOOD_EMOJIS[entry.mood - 1]}</span>
                <div style={{ flex: 1 }}>
                  {entry.note && <p style={{ fontSize: 13, color: "var(--foreground)" }}>{entry.note}</p>}
                  <p style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                    {new Date(entry.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CBT Thought Record ───────────────────────────────────────────────────────
type Emotion = { name: string; intensity: number };

function CBTSection({ cookieId }: { cookieId: string }) {
  const [situation, setSituation] = useState("");
  const [automaticThought, setAutomaticThought] = useState("");
  const [emotions, setEmotions] = useState<Emotion[]>([{ name: "", intensity: 50 }]);
  const [selectedDistortions, setSelectedDistortions] = useState<string[]>([]);
  const [evidenceFor, setEvidenceFor] = useState("");
  const [evidenceAgainst, setEvidenceAgainst] = useState("");
  const [balancedThought, setBalancedThought] = useState("");
  const [saved, setSaved] = useState(false);

  const saveMut = trpc.clarity.saveThoughtRecord.useMutation();

  const addEmotion = () => setEmotions((prev) => [...prev, { name: "", intensity: 50 }]);
  const updateEmotion = (i: number, field: keyof Emotion, val: string | number) => {
    setEmotions((prev) => prev.map((e, idx) => idx === i ? { ...e, [field]: val } : e));
  };
  const removeEmotion = (i: number) => setEmotions((prev) => prev.filter((_, idx) => idx !== i));

  const toggleDistortion = (d: string) => {
    setSelectedDistortions((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  };

  const handleSave = async () => {
    const validEmotions = emotions.filter((e) => e.name.trim());
    await saveMut.mutateAsync({
      cookieId, situation, automaticThought,
      emotions: validEmotions,
      distortions: selectedDistortions,
      evidenceFor, evidenceAgainst, balancedThought,
    });
    setSaved(true);
    setSituation(""); setAutomaticThought(""); setEmotions([{ name: "", intensity: 50 }]);
    setSelectedDistortions([]); setEvidenceFor(""); setEvidenceAgainst(""); setBalancedThought("");
    setTimeout(() => setSaved(false), 2500);
  };

  const canSave = situation.trim() && automaticThought.trim() && balancedThought.trim();

  const fieldStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 8, border: "1px solid var(--surface-3)", background: "var(--surface-1)", color: "var(--foreground)", fontSize: 13, lineHeight: 1.6, resize: "vertical" };
  const labelStyle: React.CSSProperties = { fontWeight: 600, fontSize: 12, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, display: "block" };

  return (
    <div style={{ maxWidth: 620, margin: "0 auto" }}>
      <div className="card-nexus" style={{ padding: 24 }}>
        <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 4, color: "var(--foreground)" }}>CBT Thought Record</p>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 20 }}>Identify and reframe unhelpful thought patterns.</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>1. Situation</label>
            <textarea rows={2} value={situation} onChange={(e) => setSituation(e.target.value)} placeholder="What happened? Where were you? Who was there?" style={fieldStyle} />
          </div>

          <div>
            <label style={labelStyle}>2. Automatic Thought</label>
            <textarea rows={2} value={automaticThought} onChange={(e) => setAutomaticThought(e.target.value)} placeholder="What went through your mind?" style={fieldStyle} />
          </div>

          <div>
            <label style={labelStyle}>3. Emotions</label>
            {emotions.map((em, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <input
                  value={em.name} onChange={(e) => updateEmotion(i, "name", e.target.value)}
                  placeholder="Emotion (e.g. Anxious)"
                  style={{ ...fieldStyle, resize: undefined, flex: 1 }}
                />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 80 }}>
                  <input type="range" min={0} max={100} value={em.intensity} onChange={(e) => updateEmotion(i, "intensity", Number(e.target.value))} style={{ width: 80 }} />
                  <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{em.intensity}%</span>
                </div>
                {emotions.length > 1 && (
                  <button onClick={() => removeEmotion(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", fontSize: 16 }}>✕</button>
                )}
              </div>
            ))}
            <button onClick={addEmotion} className="btn-ghost" style={{ fontSize: 12, padding: "4px 12px" }}>+ Add emotion</button>
          </div>

          <div>
            <label style={labelStyle}>4. Cognitive Distortions (check all that apply)</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {COGNITIVE_DISTORTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => toggleDistortion(d)}
                  style={{
                    padding: "4px 10px", borderRadius: 20, fontSize: 11, cursor: "pointer",
                    border: `1px solid ${selectedDistortions.includes(d) ? "var(--nexus-purple)" : "var(--surface-3)"}`,
                    background: selectedDistortions.includes(d) ? "rgba(var(--nexus-purple-rgb,124,58,237),0.12)" : "var(--surface-1)",
                    color: selectedDistortions.includes(d) ? "var(--nexus-purple)" : "var(--muted-foreground)",
                    fontWeight: selectedDistortions.includes(d) ? 600 : 400,
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>5. Evidence For the Thought</label>
            <textarea rows={2} value={evidenceFor} onChange={(e) => setEvidenceFor(e.target.value)} placeholder="Facts that support this thought..." style={fieldStyle} />
          </div>

          <div>
            <label style={labelStyle}>6. Evidence Against the Thought</label>
            <textarea rows={2} value={evidenceAgainst} onChange={(e) => setEvidenceAgainst(e.target.value)} placeholder="Facts that challenge this thought..." style={fieldStyle} />
          </div>

          <div>
            <label style={labelStyle}>7. Balanced Thought</label>
            <textarea rows={3} value={balancedThought} onChange={(e) => setBalancedThought(e.target.value)} placeholder="A more balanced perspective..." style={fieldStyle} />
          </div>

          {saved ? (
            <p style={{ textAlign: "center", color: "#22c55e", fontWeight: 600 }}>✓ Record saved!</p>
          ) : (
            <button className="btn-primary" onClick={handleSave} disabled={!canSave} style={{ opacity: canSave ? 1 : 0.5 }}>
              Save Thought Record
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Breathing Exercises ──────────────────────────────────────────────────────

function BreathingAnimation({ phase, progress }: { phase: string; progress: number }) {
  const size = 120 + progress * 60;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 220 }}>
      <div style={{
        width: size, height: size, borderRadius: "50%",
        background: "rgba(var(--nexus-purple-rgb,124,58,237),0.12)",
        border: "3px solid var(--nexus-purple)",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "width 0.3s, height 0.3s",
        boxShadow: `0 0 ${20 + progress * 30}px rgba(var(--nexus-purple-rgb,124,58,237),${0.1 + progress * 0.3})`,
      }}>
        <span style={{ fontSize: 14, color: "var(--nexus-purple)", fontWeight: 600 }}>{phase}</span>
      </div>
    </div>
  );
}

type BoxPhase = "inhale" | "hold-in" | "exhale" | "hold-out";
type Phase478 = "inhale" | "hold" | "exhale";
type Grounding = { count: number; sense: string; example: string };

const GROUNDING_STEPS: Grounding[] = [
  { count: 5, sense: "SEE", example: "Name 5 things you can see" },
  { count: 4, sense: "TOUCH", example: "Name 4 things you can touch" },
  { count: 3, sense: "HEAR", example: "Name 3 things you can hear" },
  { count: 2, sense: "SMELL", example: "Name 2 things you can smell" },
  { count: 1, sense: "TASTE", example: "Name 1 thing you can taste" },
];

function BreathingSection() {
  const [pattern, setPattern] = useState<BreathingPattern | null>(null);

  // Box breathing state
  const [boxRunning, setBoxRunning] = useState(false);
  const [boxPhase, setBoxPhase] = useState<BoxPhase>("inhale");
  const [boxTick, setBoxTick] = useState(0);
  const [boxCycles, setBoxCycles] = useState(0);
  const BOX_DURATION = 4;
  const BOX_PHASES: BoxPhase[] = ["inhale", "hold-in", "exhale", "hold-out"];

  // 4-7-8 state
  const [f478Running, setF478Running] = useState(false);
  const [f478Phase, setF478Phase] = useState<Phase478>("inhale");
  const [f478Tick, setF478Tick] = useState(0);
  const [f478Cycles, setF478Cycles] = useState(0);
  const F478_DURATIONS: Record<Phase478, number> = { inhale: 4, hold: 7, exhale: 8 };
  const F478_ORDER: Phase478[] = ["inhale", "hold", "exhale"];

  // Grounding state
  const [groundingStep, setGroundingStep] = useState(0);
  const [groundingInputs, setGroundingInputs] = useState<string[]>(Array(15).fill(""));

  // Box breathing tick
  useEffect(() => {
    if (!boxRunning || pattern !== "box") return;
    const interval = setInterval(() => {
      setBoxTick((t) => {
        if (t + 1 >= BOX_DURATION) {
          setBoxPhase((p) => {
            const nextIdx = (BOX_PHASES.indexOf(p) + 1) % BOX_PHASES.length;
            if (nextIdx === 0) setBoxCycles((c) => c + 1);
            return BOX_PHASES[nextIdx];
          });
          return 0;
        }
        return t + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [boxRunning, pattern]);

  // 4-7-8 tick
  useEffect(() => {
    if (!f478Running || pattern !== "478") return;
    const currentDuration = F478_DURATIONS[f478Phase];
    const interval = setInterval(() => {
      setF478Tick((t) => {
        if (t + 1 >= currentDuration) {
          setF478Phase((p) => {
            const nextIdx = (F478_ORDER.indexOf(p) + 1) % F478_ORDER.length;
            if (nextIdx === 0) setF478Cycles((c) => c + 1);
            return F478_ORDER[nextIdx];
          });
          return 0;
        }
        return t + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [f478Running, f478Phase, pattern]);

  const boxProgress = boxPhase === "inhale" ? boxTick / BOX_DURATION :
    boxPhase === "hold-in" ? 1 :
    boxPhase === "exhale" ? 1 - boxTick / BOX_DURATION : 0;

  const f478Progress = f478Phase === "inhale" ? f478Tick / F478_DURATIONS.inhale :
    f478Phase === "hold" ? 1 :
    f478Phase === "exhale" ? 1 - f478Tick / F478_DURATIONS.exhale : 0;

  const groundingInfo = GROUNDING_STEPS[Math.min(groundingStep, GROUNDING_STEPS.length - 1)];
  const groundingItemsForStep = (step: number) => GROUNDING_STEPS.slice(0, step).reduce((a, g) => a + g.count, 0);

  if (!pattern) {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto" }}>
        <p style={{ color: "var(--muted-foreground)", fontSize: 14, marginBottom: 24, textAlign: "center" }}>
          Choose a breathing or grounding exercise.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { id: "box" as const, icon: "⬜", label: "Box Breathing", sub: "4-4-4-4 · Stress relief, focus" },
            { id: "478" as const, icon: "🌙", label: "4-7-8 Breathing", sub: "Inhale 4, Hold 7, Exhale 8 · Sleep & anxiety" },
            { id: "grounding" as const, icon: "🌿", label: "5-4-3-2-1 Grounding", sub: "Sensory anchoring · Panic & dissociation" },
          ].map((p) => (
            <div key={p.id} className="card-nexus" style={{ padding: "18px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 16 }} onClick={() => setPattern(p.id)}>
              <span style={{ fontSize: 28 }}>{p.icon}</span>
              <div>
                <p style={{ fontWeight: 700, fontSize: 15, color: "var(--foreground)" }}>{p.label}</p>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{p.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 440, margin: "0 auto" }}>
      <button onClick={() => { setPattern(null); setBoxRunning(false); setF478Running(false); }} className="btn-ghost" style={{ marginBottom: 20, fontSize: 13 }}>
        ← All Exercises
      </button>

      {pattern === "box" && (
        <div className="card-nexus" style={{ padding: 28, textAlign: "center" }}>
          <p style={{ fontWeight: 700, fontSize: 18, color: "var(--foreground)", marginBottom: 4 }}>Box Breathing</p>
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 20 }}>4 counts each phase · Cycle {boxCycles + 1}</p>
          <BreathingAnimation phase={`${boxPhase.replace("-", "\n")} ${boxTick + 1}/${BOX_DURATION}`} progress={boxProgress} />
          <button
            className={boxRunning ? "btn-ghost" : "btn-primary"}
            onClick={() => setBoxRunning((r) => !r)}
            style={{ marginTop: 16, padding: "12px 32px" }}
          >
            {boxRunning ? "Pause" : "Start"}
          </button>
        </div>
      )}

      {pattern === "478" && (
        <div className="card-nexus" style={{ padding: 28, textAlign: "center" }}>
          <p style={{ fontWeight: 700, fontSize: 18, color: "var(--foreground)", marginBottom: 4 }}>4-7-8 Breathing</p>
          <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginBottom: 20 }}>Inhale 4 · Hold 7 · Exhale 8 · Cycle {f478Cycles + 1}</p>
          <BreathingAnimation phase={`${f478Phase} ${f478Tick + 1}/${F478_DURATIONS[f478Phase]}`} progress={f478Progress} />
          <button
            className={f478Running ? "btn-ghost" : "btn-primary"}
            onClick={() => setF478Running((r) => !r)}
            style={{ marginTop: 16, padding: "12px 32px" }}
          >
            {f478Running ? "Pause" : "Start"}
          </button>
        </div>
      )}

      {pattern === "grounding" && (
        <div className="card-nexus" style={{ padding: 24 }}>
          <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 4, color: "var(--foreground)" }}>5-4-3-2-1 Grounding</p>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 20 }}>
            Use your senses to anchor yourself in the present moment.
          </p>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
              {GROUNDING_STEPS.map((g, i) => (
                <div key={g.sense} style={{
                  flex: 1, height: 4, borderRadius: 2,
                  background: i <= groundingStep ? "var(--nexus-purple)" : "var(--surface-2)",
                  transition: "background 0.3s",
                }} />
              ))}
            </div>
            {groundingStep < GROUNDING_STEPS.length ? (
              <div>
                <p style={{ fontWeight: 700, fontSize: 20, color: "var(--nexus-purple)", marginBottom: 4 }}>
                  {groundingInfo.count} things you can {groundingInfo.sense.toLowerCase()}
                </p>
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 16 }}>{groundingInfo.example}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {Array.from({ length: groundingInfo.count }, (_, i) => {
                    const globalIdx = groundingItemsForStep(groundingStep) + i;
                    return (
                      <input
                        key={i}
                        value={groundingInputs[globalIdx]}
                        onChange={(e) => setGroundingInputs((prev) => { const next = [...prev]; next[globalIdx] = e.target.value; return next; })}
                        placeholder={`${groundingInfo.sense.toLowerCase()} #${i + 1}...`}
                        style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--surface-3)", background: "var(--surface-1)", color: "var(--foreground)", fontSize: 13 }}
                      />
                    );
                  })}
                </div>
                <button
                  className="btn-primary"
                  onClick={() => setGroundingStep((s) => s + 1)}
                  style={{ width: "100%", marginTop: 16 }}
                >
                  {groundingStep < GROUNDING_STEPS.length - 1 ? "Next Sense →" : "Finish"}
                </button>
              </div>
            ) : (
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 24, marginBottom: 8 }}>✓</p>
                <p style={{ fontWeight: 600, color: "var(--foreground)", marginBottom: 8 }}>Grounding complete</p>
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 20 }}>Take a moment to notice how you feel now.</p>
                <button className="btn-ghost" onClick={() => { setGroundingStep(0); setGroundingInputs(Array(15).fill("")); }}>
                  Repeat
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Progress Section ─────────────────────────────────────────────────────────
function ProgressSection({ cookieId }: { cookieId: string }) {
  const assessmentQ = trpc.clarity.getAssessmentHistory.useQuery({ cookieId });
  const moodQ = trpc.clarity.getMoodHistory.useQuery({ cookieId });

  const assessments = assessmentQ.data ?? [];
  const moods = moodQ.data ?? [];

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="card-nexus" style={{ padding: 20 }}>
        <p style={{ fontWeight: 700, fontSize: 15, color: "var(--foreground)", marginBottom: 4 }}>Mood History</p>
        {moods.length > 0 ? (
          <>
            <MoodSparkline data={moods} />
            <div style={{ marginTop: 12, display: "flex", gap: 16, fontSize: 13, color: "var(--muted-foreground)" }}>
              <span>Avg: {(moods.reduce((a, m) => a + m.mood, 0) / moods.length).toFixed(1)} / 5</span>
              <span>{moods.length} entries</span>
            </div>
          </>
        ) : (
          <p style={{ color: "var(--muted-foreground)", fontSize: 13 }}>No mood data yet. Log your first check-in in the Mood tab.</p>
        )}
      </div>

      <div className="card-nexus" style={{ padding: 20 }}>
        <p style={{ fontWeight: 700, fontSize: 15, color: "var(--foreground)", marginBottom: 12 }}>Assessment History</p>
        {assessments.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {assessments.slice(0, 10).map((a) => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 8, background: "var(--surface-1)" }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{a.instrumentId}</p>
                  <p style={{ fontSize: 11, color: "var(--muted-foreground)" }}>
                    {new Date(a.createdAt).toLocaleDateString()} · {a.durationSeconds}s
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  {a.severity && <p style={{ fontSize: 12, fontWeight: 600, color: severityColor(a.severity) }}>{a.severity}</p>}
                  {a.totalScore !== null && a.totalScore !== undefined && (
                    <p style={{ fontSize: 20, fontWeight: 800, color: "var(--nexus-purple)" }}>{a.totalScore}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "var(--muted-foreground)", fontSize: 13 }}>No assessments completed yet. Try one in the Assessments tab.</p>
        )}
      </div>
    </div>
  );
}

// ─── Tab Navigation ───────────────────────────────────────────────────────────
const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  { id: "assessments", label: "Assessments", icon: "📋" },
  { id: "training", label: "Cognitive Training", icon: "🧠" },
  { id: "mood", label: "Mood", icon: "😊" },
  { id: "cbt", label: "CBT", icon: "💭" },
  { id: "breathe", label: "Breathe", icon: "🌬" },
  { id: "progress", label: "Progress", icon: "📈" },
];

// ─── Main Clarity Page ────────────────────────────────────────────────────────
export default function Clarity() {
  const [activeTab, setActiveTab] = useState<Tab>("assessments");
  const { cookieId } = usePersonalization();

  return (
    <div style={{ paddingTop: 72, paddingBottom: 80, minHeight: "100vh" }}>
      <div className="section-container">
        {/* Hero */}
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 14px", borderRadius: 20, marginBottom: 16,
            background: "rgba(var(--nexus-purple-rgb,124,58,237),0.10)",
            border: "1px solid rgba(var(--nexus-purple-rgb,124,58,237),0.25)",
          }}>
            <span style={{ fontSize: 14 }}>🔮</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--nexus-purple)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Mental Wellness Suite
            </span>
          </div>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)", fontWeight: 800, lineHeight: 1.1, marginBottom: 12, background: "linear-gradient(135deg, var(--nexus-purple) 0%, oklch(0.70 0.20 290) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Clarity — Know Your Mind
          </h1>
          <p style={{ fontSize: 16, color: "var(--muted-foreground)", maxWidth: 540, margin: "0 auto", lineHeight: 1.6 }}>
            Evidence-based assessments, cognitive training, and mental wellness tools — all in one place.
          </p>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 4, overflowX: "auto", padding: "0 0 16px", marginBottom: 24, scrollbarWidth: "none" }}>
          {TABS.map((tab) => {
            const active = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                  borderRadius: 20, border: `1px solid ${active ? "var(--nexus-purple)" : "var(--surface-3)"}`,
                  background: active ? "rgba(var(--nexus-purple-rgb,124,58,237),0.12)" : "var(--surface-1)",
                  color: active ? "var(--nexus-purple)" : "var(--muted-foreground)",
                  fontSize: 13, fontWeight: active ? 700 : 400, cursor: "pointer",
                  whiteSpace: "nowrap", transition: "all 0.15s",
                }}
              >
                <span style={{ fontSize: 14 }}>{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {activeTab === "assessments" && <AssessmentsSection cookieId={cookieId} />}
        {activeTab === "training" && <TrainingSection cookieId={cookieId} />}
        {activeTab === "mood" && <MoodSection cookieId={cookieId} />}
        {activeTab === "cbt" && <CBTSection cookieId={cookieId} />}
        {activeTab === "breathe" && <BreathingSection />}
        {activeTab === "progress" && <ProgressSection cookieId={cookieId} />}
      </div>
    </div>
  );
}
