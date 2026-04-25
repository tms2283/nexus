import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers, Sparkles, Loader2, ChevronRight, Brain,
  Lightbulb, Microscope, GraduationCap, Baby,
  MessageSquare, RotateCcw, Copy, Check, Zap
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import PageWrapper from "@/components/PageWrapper";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

// ─── Depth Level Config ───────────────────────────────────────────────────────
const DEPTH_LEVELS = [
  {
    id: "child",
    label: "Child",
    sublabel: "Age 8 — Simple & concrete",
    icon: Baby,
    color: "oklch(0.75_0.18_55)",
    bgColor: "oklch(0.75_0.18_55_/_0.1)",
    borderColor: "oklch(0.75_0.18_55_/_0.25)",
    description: "No jargon. Pure analogy. Like explaining to a curious 8-year-old.",
  },
  {
    id: "student",
    label: "Student",
    sublabel: "High school — Building blocks",
    icon: GraduationCap,
    color: "oklch(0.65_0.22_200)",
    bgColor: "oklch(0.65_0.22_200_/_0.1)",
    borderColor: "oklch(0.65_0.22_200_/_0.25)",
    description: "Introduces proper terminology with clear definitions and examples.",
  },
  {
    id: "expert",
    label: "Expert",
    sublabel: "Graduate level — Full depth",
    icon: Microscope,
    color: "oklch(0.72_0.2_290)",
    bgColor: "oklch(0.72_0.2_290_/_0.1)",
    borderColor: "oklch(0.72_0.2_290_/_0.25)",
    description: "Technical precision. Assumes domain knowledge. No hand-holding.",
  },
  {
    id: "socratic",
    label: "Socratic",
    sublabel: "Questions only — Discover it yourself",
    icon: MessageSquare,
    color: "oklch(0.72_0.18_150)",
    bgColor: "oklch(0.72_0.18_150_/_0.1)",
    borderColor: "oklch(0.72_0.18_150_/_0.25)",
    description: "No explanations. Only questions that lead you to the answer.",
  },
  {
    id: "analogy",
    label: "Analogy",
    sublabel: "Visual metaphors — See it differently",
    icon: Lightbulb,
    color: "oklch(0.78_0.16_30)",
    bgColor: "oklch(0.78_0.16_30_/_0.1)",
    borderColor: "oklch(0.78_0.16_30_/_0.25)",
    description: "Multiple vivid analogies from different domains to make it click.",
  },
];

// ─── Example Concepts ─────────────────────────────────────────────────────────
const EXAMPLE_CONCEPTS = [
  "Quantum entanglement", "Gradient descent", "Supply and demand",
  "DNA replication", "Blockchain consensus", "Compound interest",
  "Natural selection", "Recursion", "Cognitive dissonance",
  "Entropy", "Neural plasticity", "Game theory",
];

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function DepthEngine() {
  const [concept, setConcept] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [explanations, setExplanations] = useState<Record<string, string>>({});
  const [loadingLevel, setLoadingLevel] = useState<string | null>(null);
  const [copiedLevel, setCopiedLevel] = useState<string | null>(null);
  const [activeExplanation, setActiveExplanation] = useState<string | null>(null);
  const { addXP, cookieId } = usePersonalization();

  const explain = trpc.ai.explainConcept.useMutation({
    onSuccess: (data: { explanation: string; level: string }) => {
      setExplanations((prev) => ({ ...prev, [data.level]: data.explanation }));
      setActiveExplanation(data.level);
      setLoadingLevel(null);
      addXP(20);
      toast.success("+20 XP — Concept explained!");
    },
    onError: (err: { message: string }) => {
      toast.error(err.message);
      setLoadingLevel(null);
    },
  });

  const handleExplain = (levelId: string) => {
    if (!concept.trim()) { toast.error("Enter a concept first."); return; }
    setSelectedLevel(levelId);
    setLoadingLevel(levelId);
    explain.mutate({ concept, level: levelId as "child" | "student" | "expert" | "socratic" | "analogy", cookieId: cookieId ?? undefined });
  };

  const handleCopy = (levelId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLevel(levelId);
    setTimeout(() => setCopiedLevel(null), 2000);
  };

  const handleReset = () => {
    setExplanations({});
    setActiveExplanation(null);
    setSelectedLevel(null);
  };

  const completedLevels = Object.keys(explanations).length;

  return (
    <PageWrapper pageName="depth">
      <div className="min-h-screen pt-20">
        {/* Hero */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--nexus-purple-fill)] border border-[var(--nexus-purple-border)] text-sm text-[var(--nexus-purple)] mb-6"
            >
              <Layers size={14} />
              <span>Depth Engine</span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold text-foreground mb-4"
            >
              Any concept,{" "}
              <span className="text-gradient-gold">five depths</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-muted-foreground max-w-2xl mx-auto"
            >
              The Feynman Technique, automated. If you can't explain something simply, you don't understand it yet. Explore any concept from child-level to expert — or let Socratic questions guide you to discover it yourself.
            </motion.p>
          </div>
        </section>

        <section className="pb-16 px-4">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Concept Input */}
            <div className="card-nexus p-6">
              <label className="text-sm font-medium text-muted-foreground mb-3 block">
                What concept do you want to understand?
              </label>
              <div className="flex gap-3">
                <input
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && selectedLevel && handleExplain(selectedLevel)}
                  placeholder="Enter any concept, theory, or idea..."
                  className="flex-1 bg-[var(--surface-2)] border border-border/60 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[var(--nexus-purple)] transition-colors"
                />
                {completedLevels > 0 && (
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--surface-1)] border border-border/60 text-sm text-muted-foreground hover:text-foreground hover:border-border/60 transition-all"
                  >
                    <RotateCcw size={14} /> Reset
                  </button>
                )}
              </div>

              {/* Example chips */}
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="text-xs text-muted-foreground mr-1">Try:</span>
                {EXAMPLE_CONCEPTS.slice(0, 6).map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setConcept(ex)}
                    className="px-3 py-1 rounded-full text-xs bg-[var(--surface-1)] border border-border/60 text-muted-foreground hover:border-border/60 hover:text-foreground transition-all"
                  >
                    {ex}
                  </button>
                ))}
              </div>

              {/* Progress indicator */}
              {completedLevels > 0 && (
                <div className="mt-4 flex items-center gap-2">
                  <div className="flex gap-1">
                    {DEPTH_LEVELS.map((level) => (
                      <div
                        key={level.id}
                        className={`w-2 h-2 rounded-full transition-all ${
                          explanations[level.id]
                            ? "bg-[oklch(0.72_0.18_150)] scale-125"
                            : "bg-[var(--surface-2)]"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {completedLevels} / {DEPTH_LEVELS.length} depths explored
                  </span>
                  {completedLevels === DEPTH_LEVELS.length && (
                    <span className="text-xs text-[oklch(0.75_0.18_55)] flex items-center gap-1">
                      <Zap size={10} /> Full mastery unlocked
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Depth Level Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {DEPTH_LEVELS.map((level, i) => {
                const Icon = level.icon;
                const isLoading = loadingLevel === level.id;
                const isDone = !!explanations[level.id];
                const isActive = activeExplanation === level.id;

                return (
                  <motion.button
                    key={level.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    onClick={() => handleExplain(level.id)}
                    disabled={isLoading || !concept.trim()}
                    className={`relative p-4 rounded-xl border text-left transition-all group ${
                      isActive
                        ? `bg-[${level.bgColor}] border-[${level.borderColor}]`
                        : isDone
                        ? "bg-white/5 border-white/15 hover:border-border/60"
                        : "bg-[var(--surface-2)] border-border/30 hover:border-white/18 hover:bg-white/5"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    style={{
                      backgroundColor: isActive ? level.bgColor : undefined,
                      borderColor: isActive ? level.borderColor : undefined,
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${level.bgColor}`, border: `1px solid ${level.borderColor}` }}
                        >
                          {isLoading ? (
                            <Loader2 size={13} className="animate-spin" style={{ color: level.color }} />
                          ) : isDone ? (
                            <Check size={13} style={{ color: level.color }} />
                          ) : (
                            <Icon size={13} style={{ color: level.color }} />
                          )}
                        </div>
                        <span className="font-semibold text-sm text-foreground">{level.label}</span>
                      </div>
                      <ChevronRight
                        size={13}
                        className="text-muted-foreground group-hover:translate-x-0.5 transition-transform"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{level.sublabel}</p>
                  </motion.button>
                );
              })}

              {/* Explain All button */}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                onClick={() => {
                  if (!concept.trim()) { toast.error("Enter a concept first."); return; }
                  DEPTH_LEVELS.forEach((level) => {
                    if (!explanations[level.id]) {
                      setTimeout(() => handleExplain(level.id), DEPTH_LEVELS.indexOf(level) * 300);
                    }
                  });
                }}
                disabled={!concept.trim() || !!loadingLevel}
                className="p-4 rounded-xl border border-dashed border-white/15 text-left bg-white/2 hover:bg-white/5 hover:border-border/60 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-[var(--nexus-gold-fill)] border border-[var(--nexus-gold-border)] flex items-center justify-center">
                    <Sparkles size={13} className="text-[oklch(0.75_0.18_55)]" />
                  </div>
                  <span className="font-semibold text-sm text-foreground">All Depths</span>
                </div>
                <p className="text-xs text-muted-foreground">Generate all 5 explanations at once</p>
              </motion.button>
            </div>

            {/* Active Explanation */}
            <AnimatePresence mode="wait">
              {activeExplanation && explanations[activeExplanation] && (
                <motion.div
                  key={activeExplanation}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="card-nexus overflow-hidden"
                >
                  {/* Header */}
                  {(() => {
                    const level = DEPTH_LEVELS.find((l) => l.id === activeExplanation);
                    if (!level) return null;
                    const Icon = level.icon;
                    return (
                      <div
                        className="flex items-center justify-between px-6 py-4 border-b border-border/60"
                        style={{ backgroundColor: level.bgColor }}
                      >
                        <div className="flex items-center gap-3">
                          <Icon size={16} style={{ color: level.color }} />
                          <div>
                            <span className="font-semibold text-sm text-foreground">{level.label} Level</span>
                            <span className="text-xs text-muted-foreground ml-2">— {level.sublabel}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopy(activeExplanation, explanations[activeExplanation])}
                            className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors"
                          >
                            {copiedLevel === activeExplanation ? (
                              <Check size={13} className="text-[oklch(0.72_0.18_150)]" />
                            ) : (
                              <Copy size={13} className="text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Content */}
                  <div className="p-6 prose prose-invert prose-sm max-w-none">
                    <Streamdown>{explanations[activeExplanation]}</Streamdown>
                  </div>

                  {/* Level switcher */}
                  {Object.keys(explanations).length > 1 && (
                    <div className="px-6 pb-4 flex gap-2 flex-wrap border-t border-border/60 pt-4">
                      <span className="text-xs text-muted-foreground mr-1 self-center">Switch depth:</span>
                      {DEPTH_LEVELS.filter((l) => explanations[l.id]).map((level) => (
                        <button
                          key={level.id}
                          onClick={() => setActiveExplanation(level.id)}
                          className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                            activeExplanation === level.id
                              ? "text-foreground"
                              : "bg-[var(--surface-2)] border-border/30 text-muted-foreground hover:border-border/60"
                          }`}
                          style={
                            activeExplanation === level.id
                              ? { backgroundColor: level.bgColor, borderColor: level.borderColor, color: level.color }
                              : {}
                          }
                        >
                          {level.label}
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* How it works */}
            {!activeExplanation && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="card-nexus p-6"
              >
                <div className="flex items-center gap-2 mb-4">
                  <Brain size={16} className="text-[oklch(0.72_0.2_290)]" />
                  <h3 className="font-semibold text-foreground">The Feynman Technique, Automated</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  Richard Feynman's learning method: if you can't explain something in simple terms, you don't truly understand it. The Depth Engine applies this systematically — exposing exactly where your understanding breaks down.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { step: "1", title: "Enter any concept", desc: "From quantum physics to business strategy" },
                    { step: "2", title: "Choose your depth", desc: "Or generate all 5 levels at once" },
                    { step: "3", title: "Find your gaps", desc: "Where does the explanation stop making sense?" },
                  ].map(({ step, title, desc }) => (
                    <div key={step} className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-[oklch(0.72_0.2_290_/_0.15)] border border-[oklch(0.72_0.2_290_/_0.3)] flex items-center justify-center shrink-0 text-xs font-bold text-[oklch(0.72_0.2_290)]">
                        {step}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">{title}</div>
                        <div className="text-xs text-muted-foreground">{desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}
