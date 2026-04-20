import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, BookOpen, Shield, Trophy, ChevronRight,
  ChevronLeft, CheckCircle2, Star, Clock,
  Zap, Sparkles, Eye,
} from "lucide-react";
import PageWrapper from "@/components/PageWrapper";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { AdaptiveLessonView } from "@/components/lesson/AdaptiveLessonView";

// --- Types -------------------------------------------------------------------
type LessonId = 1 | 2 | 3 | 4 | 5;

interface LessonMeta {
  id: LessonId;
  title: string;
  subtitle: string;
  duration: string;
  icon: React.ReactNode;
  color: string;
  mayer: string;  // Mayer principle highlighted
  xp: number;
}

// --- Lesson Metadata ---------------------------------------------------------
const LESSONS: LessonMeta[] = [
  {
    id: 1, title: "What Is AI?", subtitle: "Demystifying the technology reshaping our world",
    duration: "25 min", icon: <Brain size={20} />, color: "oklch(0.75_0.18_55)",
    mayer: "Coherence + Segmenting", xp: 50,
  },
  {
    id: 2, title: "Myths vs. Reality", subtitle: "Separating science fiction from science fact",
    duration: "20 min", icon: <Eye size={20} />, color: "oklch(0.65_0.22_200)",
    mayer: "Personalization + Redundancy", xp: 60,
  },
  {
    id: 3, title: "Prompt Engineering", subtitle: "Speak AI fluently — craft prompts that work",
    duration: "30 min", icon: <Zap size={20} />, color: "oklch(0.72_0.2_290)",
    mayer: "Interactivity + Guided Discovery", xp: 80,
  },
  {
    id: 4, title: "Ethics & Society", subtitle: "Navigating the human side of artificial intelligence",
    duration: "25 min", icon: <Shield size={20} />, color: "oklch(0.72_0.18_150)",
    mayer: "Embodied Cognition + Dialogue", xp: 70,
  },
  {
    id: 5, title: "Putting It Together", subtitle: "Apply everything — your AI literacy capstone",
    duration: "20 min", icon: <Trophy size={20} />, color: "oklch(0.78_0.16_30)",
    mayer: "Signaling + Coherence", xp: 100,
  },
];

// --- Progress Badge -----------------------------------------------------------
function ProgressBadge({ completed, total }: { completed: number; total: number }) {
  const pct = Math.round((completed / total) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <Progress value={pct} className="h-2" />
      </div>
      <span className="text-xs text-muted-foreground shrink-0">{completed}/{total} lessons</span>
    </div>
  );
}

// --- Main Page ----------------------------------------------------------------
export default function AILiteracy() {
  const [activeLesson, setActiveLesson] = useState<LessonId | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<number>>(new Set());
  const [totalXP, setTotalXP] = useState(0);
  const { addXP, cookieId } = usePersonalization();
  const lessonStartRef = useRef<Record<number, number>>({});

  const progressQuery = trpc.lesson.getUserProgress.useQuery(
    { cookieId },
    { enabled: !!cookieId, staleTime: 30_000 }
  );
  const startLessonMutation = trpc.lesson.startLessonProgress.useMutation();
  const completeLessonMutation = trpc.lesson.completeLessonProgress.useMutation();

  // Hydrate completed state from server on first load
  useEffect(() => {
    const rows = progressQuery.data?.lessons;
    if (!rows || rows.length === 0) return;
    const completed = new Set<number>();
    let xp = 0;
    for (const row of rows) {
      if (row.completedAt && row.lessonId != null) {
        completed.add(row.lessonId);
        const meta = LESSONS.find(l => l.id === row.lessonId);
        if (meta) xp += meta.xp;
      }
    }
    setCompletedLessons(completed);
    setTotalXP(xp);
  }, [progressQuery.data]);

  const handleOpenLesson = useCallback((lessonId: LessonId) => {
    setActiveLesson(lessonId);
    lessonStartRef.current[lessonId] = Date.now();
    if (cookieId) {
      startLessonMutation.mutate({ cookieId, lessonId });
    }
  }, [cookieId, startLessonMutation]);

  const handleComplete = (lessonId: LessonId) => {
    if (completedLessons.has(lessonId)) return;
    const meta = LESSONS.find(l => l.id === lessonId)!;
    setCompletedLessons(prev => new Set(Array.from(prev).concat(lessonId)));
    setTotalXP(prev => prev + meta.xp);
    addXP(meta.xp);
    const startedAt = lessonStartRef.current[lessonId] ?? Date.now();
    const timeSpentSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    if (cookieId) {
      completeLessonMutation.mutate(
        { cookieId, lessonId, timeSpentSeconds },
        {
          onError: () => {
            // Persistence failed — local state still reflects completion; server will catch up next session
          },
        }
      );
    }
    toast.success(`+${meta.xp} XP — Lesson ${lessonId} complete!`);
  };

  const overallPct = Math.round((completedLessons.size / LESSONS.length) * 100);

  return (
    <PageWrapper pageName="ai-literacy">
      <div className="min-h-screen pt-20">
        {/* Hero */}
        <section className="py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-[oklch(0.75_0.18_55_/_0.3)] text-sm text-[oklch(0.75_0.18_55)] mb-6">
              <Brain size={14} />
              <span>Module 1 · AI Literacy for Adults</span>
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
              className="text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
              Introduction to{" "}
              <span className="text-gradient-gold">AI Literacy</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="text-lg text-muted-foreground max-w-2xl mb-4 leading-relaxed">
              A complete, research-backed introduction to artificial intelligence for adult learners — no coding required. Built on Mayer's 12 Multimedia Learning Principles.
            </motion.p>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }} className="mb-6">
              <Link href="/learn/my-profile" className="inline-flex items-center gap-1.5 text-xs text-[oklch(0.65_0.22_200)] hover:text-[oklch(0.85_0.18_200)] transition-colors">
                <Sparkles size={12} />
                Lessons here adapt to your reading level, pace, and confidence — see how →
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {[
                { label: "Lessons", value: "5", icon: <BookOpen size={14} /> },
                { label: "Total XP", value: `${totalXP > 0 ? totalXP : 360}`, icon: <Zap size={14} /> },
                { label: "Duration", value: "~2 hrs", icon: <Clock size={14} /> },
                { label: "Level", value: "Beginner", icon: <Star size={14} /> },
              ].map(({ label, value, icon }) => (
                <div key={label} className="glass rounded-xl p-4 border border-white/8 text-center">
                  <div className="flex items-center justify-center gap-1 text-[oklch(0.75_0.18_55)] mb-2">{icon}</div>
                  <div className="text-lg font-bold text-foreground">{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              ))}
            </motion.div>

            {/* Overall progress */}
            {completedLessons.size > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="glass rounded-xl p-4 border border-[oklch(0.75_0.18_55_/_0.2)] mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Course Progress</span>
                  <span className="text-sm font-bold text-[oklch(0.75_0.18_55)]">{overallPct}%</span>
                </div>
                <Progress value={overallPct} className="h-2 mb-2" />
                <ProgressBadge completed={completedLessons.size} total={LESSONS.length} />
              </motion.div>
            )}
          </div>
        </section>

        {/* Lesson List + Content */}
        <section className="pb-20 px-4">
          <div className="max-w-4xl mx-auto">
            {activeLesson === null ? (
              /* Lesson cards */
              <div className="space-y-3">
                {LESSONS.map((lesson, i) => {
                  const isComplete = completedLessons.has(lesson.id);
                  return (
                    <motion.div key={lesson.id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className={`glass rounded-2xl border overflow-hidden transition-all ${isComplete
                        ? "border-[oklch(0.72_0.18_150_/_0.3)]"
                        : "border-white/8 hover:border-white/15"
                        }`}>
                      <button
                        onClick={() => handleOpenLesson(lesson.id)}
                        className="w-full flex items-center gap-5 p-5 text-left hover:bg-white/3 transition-colors">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            background: `color-mix(in oklch, ${lesson.color} 15%, transparent)`,
                            border: `1px solid color-mix(in oklch, ${lesson.color} 30%, transparent)`,
                          }}>
                          <span style={{ color: lesson.color }}>{lesson.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs text-muted-foreground">Lesson {lesson.id}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-muted-foreground">
                              {lesson.mayer}
                            </span>
                          </div>
                          <h3 className="font-semibold text-foreground">{lesson.title}</h3>
                          <p className="text-sm text-muted-foreground truncate">{lesson.subtitle}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock size={10} /> {lesson.duration}
                          </span>
                          <span className="text-xs text-[oklch(0.75_0.18_55)] flex items-center gap-1">
                            <Zap size={10} /> +{lesson.xp} XP
                          </span>
                          {isComplete
                            ? <span className="flex items-center gap-1 text-xs text-[oklch(0.72_0.18_150)] font-medium"><CheckCircle2 size={11} /> Done</span>
                            : <ChevronRight size={14} className="text-muted-foreground" />
                          }
                        </div>
                      </button>
                    </motion.div>
                  );
                })}

                {/* Mayer Principles Info Panel */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                  className="glass rounded-2xl p-6 border border-white/8 mt-6">
                  <div className="flex items-start gap-3 mb-4">
                    <Brain size={16} className="text-[oklch(0.65_0.22_200)] mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">Built on Mayer's Multimedia Learning Theory</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        This module applies Richard Mayer's 12 evidence-based principles for effective digital learning — proven to improve retention and transfer.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { name: "Coherence", desc: "No extraneous information" },
                      { name: "Segmenting", desc: "Content in learner-paced chunks" },
                      { name: "Personalization", desc: "Conversational tone throughout" },
                      { name: "Modality", desc: "Audio narration + visual text" },
                      { name: "Signaling", desc: "Clear structure and cues" },
                      { name: "Interactivity", desc: "Active exercises, not passive reading" },
                    ].map(({ name, desc }) => (
                      <div key={name} className="glass rounded-lg p-3 border border-white/8">
                        <div className="text-xs font-semibold text-foreground mb-0.5">{name}</div>
                        <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            ) : (
              /* Active lesson view */
              <div>
                <button onClick={() => setActiveLesson(null)}
                  className="flex items-center gap-1.5 mb-6 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronLeft size={14} /> Back to all lessons
                </button>
                <AnimatePresence mode="wait">
                  <AdaptiveLessonView
                    key={activeLesson}
                    lessonId={`lesson-${activeLesson}`}
                    completed={completedLessons.has(activeLesson)}
                    onComplete={() => handleComplete(activeLesson)}
                  />
                </AnimatePresence>
                {activeLesson < 5 && (
                  <div className="mt-6 flex justify-end">
                    <button onClick={() => handleOpenLesson((activeLesson + 1) as LessonId)}
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl glass border border-white/10 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      Next Lesson <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}
