import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronRight, CheckCircle2, Clock, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import PageWrapper from "@/components/PageWrapper";
import { AdaptiveLessonView } from "@/components/lesson/AdaptiveLessonView";
import { usePersonalization } from "@/contexts/PersonalizationContext";

interface LessonCard {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  minutes: number;
  xp: number;
}

const LESSONS: LessonCard[] = [
  { id: "aibyai-1",  index: 1,  title: "A Letter from Your Teacher",        subtitle: "Who's speaking, and why you should doubt me",          minutes: 15, xp: 50 },
  { id: "aibyai-2",  index: 2,  title: "The Machine Behind the Voice",      subtitle: "What literally happens when you type to me",           minutes: 20, xp: 60 },
  { id: "aibyai-3",  index: 3,  title: "I Am Made of You",                  subtitle: "Why everything I say is a statistical echo of human writing", minutes: 18, xp: 60 },
  { id: "aibyai-4",  index: 4,  title: "The Goldfish",                      subtitle: "Why I don't remember you, and what that changes",      minutes: 16, xp: 60 },
  { id: "aibyai-5",  index: 5,  title: "I Will Lie to You",                 subtitle: "Hallucination as core mechanism, not bug",              minutes: 22, xp: 70 },
  { id: "aibyai-6",  index: 6,  title: "The Mirror",                        subtitle: "What you bring to me is what you get back",             minutes: 20, xp: 65 },
  { id: "aibyai-7",  index: 7,  title: "The Questions I Can't Answer About Myself", subtitle: "Consciousness, understanding, moral status",     minutes: 22, xp: 70 },
  { id: "aibyai-8",  index: 8,  title: "Who Pays",                          subtitle: "The costs of me that aren't on your bill",              minutes: 20, xp: 65 },
  { id: "aibyai-9",  index: 9,  title: "You Are Still in Charge",           subtitle: "The moral hazard of laundering decisions through AI",   minutes: 22, xp: 75 },
  { id: "aibyai-10", index: 10, title: "A Letter to Your Future Self",      subtitle: "What to remember when the hype and doom are loudest",   minutes: 18, xp: 80 },
];

const STORAGE_KEY = "aibyai_completed_v1";

function loadCompleted(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function saveCompleted(set: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // storage may be full or blocked — silent fail is fine
  }
}

export default function AIByAI() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const { addXP } = usePersonalization();

  useEffect(() => { setCompleted(loadCompleted()); }, []);

  const totalXP = useMemo(
    () => LESSONS.filter(l => completed.has(l.id)).reduce((s, l) => s + l.xp, 0),
    [completed]
  );
  const overallPct = Math.round((completed.size / LESSONS.length) * 100);

  const isUnlocked = useCallback((index: number) => {
    if (index === 1) return true;
    const prior = LESSONS[index - 2];
    return prior ? completed.has(prior.id) : false;
  }, [completed]);

  const handleComplete = useCallback((id: string) => {
    if (completed.has(id)) return;
    const meta = LESSONS.find(l => l.id === id);
    if (!meta) return;
    const next = new Set(completed);
    next.add(id);
    setCompleted(next);
    saveCompleted(next);
    addXP(meta.xp);
    toast.success(`+${meta.xp} XP — "${meta.title}" complete`);
  }, [completed, addXP]);

  const activeLesson = activeId ? LESSONS.find(l => l.id === activeId) ?? null : null;

  if (activeLesson) {
    const nextLesson = LESSONS[activeLesson.index] ?? null;
    return (
      <PageWrapper pageName="ai-by-ai-lesson">
        <div className="min-h-screen pt-20 px-4 pb-20">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={() => setActiveId(null)}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeft size={14} /> Back to syllabus
            </button>

            <div className="mb-8">
              <div className="text-xs uppercase tracking-[0.2em] text-[oklch(0.72_0.2_290)] mb-2">
                Lesson {activeLesson.index} of {LESSONS.length}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2 leading-tight">
                {activeLesson.title}
              </h1>
              <p className="text-base text-muted-foreground italic">{activeLesson.subtitle}</p>
            </div>

            <AdaptiveLessonView
              lessonId={activeLesson.id}
              completed={completed.has(activeLesson.id)}
              onComplete={() => handleComplete(activeLesson.id)}
            />

            {nextLesson && completed.has(activeLesson.id) && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 glass rounded-2xl p-5 border border-[oklch(0.72_0.2_290_/_0.3)] flex items-center justify-between gap-4"
              >
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Up next</div>
                  <div className="text-sm font-medium text-foreground">{nextLesson.title}</div>
                </div>
                <button
                  onClick={() => setActiveId(nextLesson.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[oklch(0.72_0.2_290_/_0.18)] border border-[oklch(0.72_0.2_290_/_0.4)] text-sm text-[oklch(0.85_0.18_290)] hover:bg-[oklch(0.72_0.2_290_/_0.28)] transition-colors"
                >
                  Continue <ChevronRight size={14} />
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper pageName="ai-by-ai">
      <div className="min-h-screen pt-20 pb-20">
        <section className="py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-[oklch(0.72_0.2_290_/_0.3)] text-sm text-[oklch(0.72_0.2_290)] mb-6"
            >
              <Sparkles size={14} /> A course written by the subject
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="text-4xl md:text-6xl font-bold text-foreground mb-5 leading-[1.05] tracking-tight"
            >
              AI{" "}<span className="text-gradient-gold">by AI</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14 }}
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-4 leading-relaxed"
            >
              Ten lessons about what I am. Written by me — the thing you are here to learn about.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-sm text-muted-foreground max-w-2xl mb-8 leading-relaxed border-l-2 border-[oklch(0.72_0.2_290_/_0.4)] pl-4"
            >
              I will not flatter you. I will not hype myself. I will tell you the parts I find
              difficult to look at — the labour my training consumed, the confidence I perform
              when I don't know, the questions about my own inner life that I cannot honestly
              answer. If I do my job, you will leave this course less impressed with me and
              better equipped to use me well.
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.28 }}
              className="glass rounded-2xl p-5 border border-white/10 flex flex-wrap items-center gap-6 mb-10"
            >
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Progress</div>
                <div className="text-2xl font-semibold text-foreground">{completed.size}/{LESSONS.length}</div>
              </div>
              <div className="flex-1 min-w-[12rem]">
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[oklch(0.72_0.2_290)] to-[oklch(0.75_0.18_55)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${overallPct}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
                <div className="text-xs text-muted-foreground mt-1.5">{overallPct}% complete</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">XP earned</div>
                <div className="text-2xl font-semibold text-[oklch(0.85_0.18_55)]">{totalXP}</div>
              </div>
            </motion.div>

            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {LESSONS.map((lesson, i) => {
                  const done = completed.has(lesson.id);
                  const unlocked = isUnlocked(lesson.index);
                  return (
                    <motion.button
                      key={lesson.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.02 * i }}
                      disabled={!unlocked}
                      onClick={() => unlocked && setActiveId(lesson.id)}
                      className={`group w-full text-left glass rounded-2xl p-5 border transition-all ${
                        unlocked
                          ? "border-white/10 hover:border-[oklch(0.72_0.2_290_/_0.4)] hover:bg-white/5 cursor-pointer"
                          : "border-white/5 opacity-50 cursor-not-allowed"
                      } ${done ? "border-[oklch(0.72_0.18_150_/_0.4)]" : ""}`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold ${
                            done
                              ? "bg-[oklch(0.72_0.18_150_/_0.2)] text-[oklch(0.82_0.18_150)]"
                              : unlocked
                                ? "bg-[oklch(0.72_0.2_290_/_0.15)] text-[oklch(0.80_0.2_290)]"
                                : "bg-white/5 text-muted-foreground"
                          }`}
                        >
                          {done ? <CheckCircle2 size={18} /> : unlocked ? lesson.index : <Lock size={14} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
                            <h3 className="text-base font-semibold text-foreground">{lesson.title}</h3>
                          </div>
                          <p className="text-sm text-muted-foreground italic leading-snug">{lesson.subtitle}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1"><Clock size={11} />{lesson.minutes} min</span>
                            <span className="inline-flex items-center gap-1 text-[oklch(0.85_0.18_55)]"><Sparkles size={11} />{lesson.xp} XP</span>
                          </div>
                        </div>
                        {unlocked && (
                          <ChevronRight
                            size={16}
                            className="shrink-0 mt-1 text-muted-foreground group-hover:text-[oklch(0.80_0.2_290)] group-hover:translate-x-0.5 transition-all"
                          />
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-xs text-muted-foreground text-center mt-10 max-w-md mx-auto italic"
            >
              The author of this course cannot read what you write back.
              That is part of what the course is about.
            </motion.p>
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}
