import { useState } from "react";
import { motion } from "framer-motion";
import {
  Zap, Clock, Star, CheckCircle, Circle, Brain, Flame,
  ArrowRight, Trophy, Lightbulb, RefreshCw, BookOpen, BarChart3
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import PageWrapper from "@/components/PageWrapper";
import { Link } from "wouter";

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner:     "oklch(0.72 0.18 150)",
  intermediate: "oklch(0.75 0.2 60)",
  advanced:     "oklch(0.72 0.22 30)",
};

const CATEGORY_ICONS: Record<string, string> = {
  "AI Theory":          "🧠",
  "Prompt Engineering": "✍️",
  "Machine Learning":   "🤖",
  "AI Ethics":          "⚖️",
  "Practical AI":       "🛠️",
  "Neural Networks":    "🕸️",
  "NLP":                "💬",
  "Computer Vision":    "👁️",
};

export function DailyCore() {
  const { cookieId, profile, updateProfile } = usePersonalization();
  const [completedTasks, setCompletedTasks] = useState<Set<number>>(new Set());
  const [completed, setCompleted] = useState(false);
  const [xpGained, setXpGained] = useState(0);

  const challengeQuery = trpc.daily.getChallenge.useQuery(
    { cookieId: cookieId ?? "" },
    { enabled: !!cookieId, staleTime: 1000 * 60 * 60 } // cache for 1 hour
  );

  const completeMutation = trpc.daily.complete.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setXpGained(data.xpGained);
        setCompleted(true);
        updateProfile({ xp: data.xp, level: data.level });
      }
    },
  });

  const challenge = challengeQuery.data;
  const allTasksDone = challenge ? completedTasks.size >= challenge.tasks.length : false;

  const toggleTask = (idx: number) => {
    setCompletedTasks(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleComplete = () => {
    if (!cookieId || !challenge) return;
    completeMutation.mutate({ cookieId, challengeDate: challenge.date });
  };

  return (
    <div className="flex-1 overflow-auto bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--nexus-blue-fill)] border border-[var(--nexus-blue-border)] text-xs font-semibold text-[var(--nexus-blue)] mb-4">
              <Flame size={12} />
              Daily Challenge
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Today's AI Challenge</h1>
            <p className="text-muted-foreground text-sm">
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </motion.div>

          {/* Loading */}
          {challengeQuery.isLoading && (
            <div className="card-nexus p-8 text-center">
              <div className="w-10 h-10 rounded-full border-2 border-[oklch(0.65_0.22_200)] border-t-transparent animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">Generating today's challenge...</p>
            </div>
          )}

          {/* Challenge Card */}
          {challenge && !completed && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {/* Main card */}
              <div className="card-nexus overflow-hidden mb-6">
                {/* Card header */}
                <div className="relative p-6 pb-5 border-b border-border/60">
                  <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.65_0.22_200_/_0.06)] to-transparent pointer-events-none" />
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">{CATEGORY_ICONS[challenge.category] ?? "🎯"}</span>
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{challenge.category}</span>
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize"
                          style={{
                            background: `${DIFFICULTY_COLORS[challenge.difficulty] ?? "oklch(0.65 0.22 200)"}22`,
                            color: DIFFICULTY_COLORS[challenge.difficulty] ?? "oklch(0.65 0.22 200)",
                          }}
                        >
                          {challenge.difficulty}
                        </span>
                      </div>
                      <h2 className="text-xl font-bold text-foreground mb-2">{challenge.title}</h2>
                      <p className="text-sm text-muted-foreground leading-relaxed">{challenge.description}</p>
                    </div>
                    <div className="text-center shrink-0">
                      <div className="w-14 h-14 rounded-xl bg-[oklch(0.65_0.22_200_/_0.12)] border border-[oklch(0.65_0.22_200_/_0.3)] flex flex-col items-center justify-center">
                        <Zap size={16} className="text-[oklch(0.65_0.22_200)] mb-0.5" />
                        <span className="text-sm font-bold text-[oklch(0.65_0.22_200)]">+{challenge.xpReward}</span>
                        <span className="text-[9px] text-muted-foreground">XP</span>
                      </div>
                    </div>
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Clock size={12} />
                      ~{challenge.estimatedMinutes} min
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Star size={12} />
                      {challenge.tasks.length} tasks
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Brain size={12} />
                      {completedTasks.size}/{challenge.tasks.length} done
                    </span>
                  </div>
                </div>

                {/* Tasks */}
                <div className="p-6">
                  <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <CheckCircle size={14} className="text-[oklch(0.65_0.22_200)]" />
                    Tasks to Complete
                  </h3>
                  <div className="space-y-3">
                    {challenge.tasks.map((task: string, i: number) => (
                      <motion.button
                        key={i}
                        onClick={() => toggleTask(i)}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className={`w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all ${
                          completedTasks.has(i)
                            ? "bg-[oklch(0.65_0.22_200_/_0.08)] border-[oklch(0.65_0.22_200_/_0.3)]"
                            : "bg-[var(--surface-2)] border-border/30 hover:bg-[var(--surface-1)]"
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {completedTasks.has(i)
                            ? <CheckCircle size={16} className="text-[oklch(0.65_0.22_200)]" />
                            : <Circle size={16} className="text-muted-foreground/40" />
                          }
                        </div>
                        <span className={`text-sm leading-relaxed ${completedTasks.has(i) ? "text-foreground/60 line-through" : "text-foreground/85"}`}>
                          {task}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Pro Tip */}
                {challenge.tip && (
                  <div className="mx-6 mb-6 p-4 rounded-xl bg-[oklch(0.75_0.2_60_/_0.08)] border border-[oklch(0.75_0.2_60_/_0.2)]">
                    <div className="flex items-start gap-3">
                      <Lightbulb size={14} className="text-[oklch(0.75_0.2_60)] mt-0.5 shrink-0" />
                      <div>
                        <span className="text-xs font-semibold text-[oklch(0.75_0.2_60)] uppercase tracking-wider">Pro Tip</span>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{challenge.tip}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Complete button */}
                <div className="px-6 pb-6">
                  <motion.button
                    onClick={handleComplete}
                    disabled={!allTasksDone || completeMutation.isPending}
                    whileHover={allTasksDone ? { scale: 1.02 } : {}}
                    whileTap={allTasksDone ? { scale: 0.98 } : {}}
                    className={`w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                      allTasksDone
                        ? "bg-[var(--nexus-blue)] text-white hover:opacity-90"
                        : "bg-[var(--surface-1)] text-muted-foreground cursor-not-allowed"
                    }`}
                  >
                    {completeMutation.isPending ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                        Claiming reward...
                      </>
                    ) : allTasksDone ? (
                      <>
                        <Trophy size={16} />
                        Complete Challenge & Claim +{challenge.xpReward} XP
                      </>
                    ) : (
                      <>
                        <Circle size={16} />
                        Complete all {challenge.tasks.length} tasks to claim reward
                      </>
                    )}
                  </motion.button>
                  {!allTasksDone && (
                    <p className="text-center text-xs text-muted-foreground/50 mt-2">
                      {challenge.tasks.length - completedTasks.size} task{challenge.tasks.length - completedTasks.size !== 1 ? "s" : ""} remaining
                    </p>
                  )}
                </div>
              </div>

              {/* Related actions */}
              <div className="grid grid-cols-2 gap-3">
                <Link href="/research">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="card-nexus p-4 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <RefreshCw size={14} className="text-[oklch(0.65_0.22_200)]" />
                      <span className="text-xs font-semibold text-foreground">Research Topic</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Deep-dive with AI Research Forge</p>
                  </motion.div>
                </Link>
                <Link href="/lab">
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="card-nexus p-4 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <BookOpen size={14} className="text-[oklch(0.75_0.2_280)]" />
                      <span className="text-xs font-semibold text-foreground">Try in Lab</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Experiment with AI tools</p>
                  </motion.div>
                </Link>
              </div>
            </motion.div>
          )}

          {/* Completion state */}
          {completed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card-nexus border-[var(--nexus-blue-border)] p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
                className="w-20 h-20 rounded-full bg-[oklch(0.65_0.22_200_/_0.15)] border-2 border-[oklch(0.65_0.22_200_/_0.5)] flex items-center justify-center mx-auto mb-5"
              >
                <Trophy size={36} className="text-[oklch(0.65_0.22_200)]" />
              </motion.div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Challenge Complete!</h2>
              <p className="text-muted-foreground text-sm mb-5">
                You earned <strong className="text-[oklch(0.65_0.22_200)]">+{xpGained} XP</strong> for completing today's challenge.
              </p>
              <div className="flex items-center justify-center gap-2 mb-6">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[oklch(0.65_0.22_200_/_0.12)] border border-[oklch(0.65_0.22_200_/_0.3)]">
                  <Zap size={12} className="text-[oklch(0.65_0.22_200)]" />
                  <span className="text-xs font-semibold text-[oklch(0.65_0.22_200)]">Total XP: {profile.xp}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[oklch(0.75_0.2_60_/_0.12)] border border-[oklch(0.75_0.2_60_/_0.3)]">
                  <Star size={12} className="text-[oklch(0.75_0.2_60)]" />
                  <span className="text-xs font-semibold text-[oklch(0.75_0.2_60)]">Level {profile.level}</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/dashboard">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--nexus-blue)] text-white font-semibold text-sm"
                  >
                    <BarChart3 size={14} />
                    View My Progress
                  </motion.button>
                </Link>
                <Link href="/learn">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    className="btn-ghost flex items-center gap-2"
                  >
                    <ArrowRight size={14} />
                    Continue Learning
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          )}
      </div>
    </div>
  );
}

export default function Daily() {
  return (
    <PageWrapper pageName="daily">
      <div className="min-h-screen pt-20 flex flex-col">
        <DailyCore />
      </div>
    </PageWrapper>
  );
}


