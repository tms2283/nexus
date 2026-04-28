import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import {
  ArrowRight, Sparkles, X, Loader2,
  Brain, Layers, FlaskConical, BookOpen, Code2, Zap,
  Target, MessageSquare, GraduationCap,
  Star, TrendingUp, Clock, Users, Lightbulb, Trophy,
  Flame, CheckCircle2, Map as MapIcon, Microscope, Cpu, Globe,
  RefreshCw, ChevronRight, BarChart3, Library, BookMarked,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import PageWrapper from "@/components/PageWrapper";

// ─── Entrance Quiz (unchanged logic) ─────────────────────────────────────────
interface QuizQuestion { id: string; question: string; options: string[]; category: string; }

function EntranceQuiz({ onComplete, onSkip }: { onComplete: (results: Record<string, string>, topics: string[]) => void; onSkip: () => void }) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [batchDone, setBatchDone] = useState(false); // true when a batch is fully answered
  const [batch, setBatch] = useState(1);
  const { cookieId } = usePersonalization();
  const generateQuiz = trpc.ai.generateQuiz.useMutation();
  const completeQuiz = trpc.visitor.completeQuiz.useMutation();

  useEffect(() => {
    generateQuiz.mutate({ cookieId, batch: 1 }, {
      onSuccess: (data) => { setQuestions(data.questions); setLoading(false); },
      onError: () => setLoading(false),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = (finalAnswers: Record<string, string>) => {
    const topics = questions.map(q => q.category).filter(Boolean);
    completeQuiz.mutate({ cookieId, results: finalAnswers, preferredTopics: topics }, {
      onSuccess: () => onComplete(finalAnswers, topics),
    });
  };

  const handleAnswer = (questionId: string, answer: string) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);
    if (current < questions.length - 1) {
      setTimeout(() => setCurrent(c => c + 1), 280);
    } else {
      setBatchDone(true);
    }
  };

  const handleKeepGoing = () => {
    const nextBatch = batch + 1;
    setBatch(nextBatch);
    setLoadingMore(true);
    setBatchDone(false);
    generateQuiz.mutate({ cookieId, batch: nextBatch }, {
      onSuccess: (data) => {
        setQuestions(prev => [...prev, ...data.questions]);
        setCurrent(questions.length); // jump to first new question
        setLoadingMore(false);
      },
      onError: () => setLoadingMore(false),
    });
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <Loader2 className="animate-spin" size={24} style={{ color: "oklch(0.78 0.16 52)" }} />
      <p className="text-sm" style={{ color: "oklch(0.52 0.010 255)" }}>Generating your personalized assessment...</p>
    </div>
  );

  if (!questions.length) return (
    <div className="text-center py-8">
      <p className="text-sm mb-4" style={{ color: "oklch(0.52 0.010 255)" }}>Unable to load quiz. Start exploring anyway!</p>
      <button onClick={onSkip} className="btn-ghost">Skip to platform</button>
    </div>
  );

  // Batch complete — show "Keep Going" / "Done" choice
  if (batchDone) return (
    <AnimatePresence mode="wait">
      <motion.div key="batch-done" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="py-4 text-center">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{ background: "oklch(0.78 0.16 52 / 0.15)", border: "1px solid oklch(0.78 0.16 52 / 0.35)" }}>
          <CheckCircle2 size={22} style={{ color: "oklch(0.78 0.16 52)" }} />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">Great answers!</h3>
        <p className="text-sm mb-6" style={{ color: "oklch(0.52 0.010 255)" }}>
          The more you share, the better Nexus can tailor your experience.
        </p>
        <div className="flex flex-col gap-2.5">
          <button onClick={handleKeepGoing} disabled={loadingMore}
            className="btn-primary w-full justify-center gap-2">
            {loadingMore ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            Keep Going — answer more questions
          </button>
          <button onClick={() => finish(answers)}
            className="btn-ghost w-full justify-center">
            Done — show me my results
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );

  const q = questions[current];
  const totalAnswered = Object.keys(answers).length;
  return (
    <div className="py-2">
      <div className="flex gap-1 mb-2">
        {questions.map((_, i) => (
          <div key={i} className="h-1 flex-1 rounded-full transition-all duration-500"
            style={{ background: i < totalAnswered ? "oklch(0.78 0.16 52)" : i === current ? "oklch(0.78 0.16 52 / 0.45)" : "oklch(0.20 0.016 255)" }} />
        ))}
      </div>
      <p className="text-[10px] uppercase tracking-widest mb-6" style={{ color: "oklch(0.42 0.010 255)" }}>
        {totalAnswered} answered · question {current + 1}
      </p>
      <AnimatePresence mode="wait">
        <motion.div key={current} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }}>
          <h3 className="text-lg font-semibold text-foreground mb-5 leading-snug">{q.question}</h3>
          <div className="space-y-2.5">
            {q.options.map((option, i) => (
              <motion.button key={i} onClick={() => handleAnswer(q.id, option)}
                className="w-full text-left px-4 py-3.5 rounded-xl text-sm transition-all"
                style={{ background: "oklch(0.15 0.014 255)", border: "1px solid oklch(0.22 0.016 255)", color: "oklch(0.72 0.010 255)" }}
                onMouseEnter={e => { (e.currentTarget).style.borderColor = "oklch(0.78 0.16 52 / 0.35)"; (e.currentTarget).style.color = "oklch(0.92 0.008 255)"; }}
                onMouseLeave={e => { (e.currentTarget).style.borderColor = "oklch(0.22 0.016 255)"; (e.currentTarget).style.color = "oklch(0.72 0.010 255)"; }}
                whileHover={{ scale: 1.008 }} whileTap={{ scale: 0.998 }}>
                {option}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
      <button onClick={onSkip} className="mt-5 text-xs transition-colors" style={{ color: "oklch(0.40 0.010 255)" }}>
        Skip personalization →
      </button>
    </div>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────
const FEATURES = [
  { href: "/learn", icon: GraduationCap, title: "AI Curriculum", subtitle: "Adaptive Learning", description: "Describe your goal — the AI builds a personalized learning path with modules, resources, and milestones tailored to your exact level.", color: "oklch(0.78 0.16 52)", badge: "Most Popular" },
  { href: "/research", icon: FlaskConical, title: "Research Forge", subtitle: "Document Intelligence", description: "Paste any text or URL. Get a structured summary, key insights, and auto-generated flashcards for spaced repetition — instantly.", color: "oklch(0.68 0.14 210)", badge: "Unique" },
  { href: "/depth", icon: Layers, title: "Depth Engine", subtitle: "Multi-Level Explanation", description: "Understand any concept at 5 depths — from child-level analogy to expert precision. The Feynman Technique, automated.", color: "oklch(0.72 0.20 290)", badge: "Exclusive" },
  { href: "/learn", icon: MessageSquare, title: "Socratic Mode", subtitle: "Question-Based Learning", description: "The AI never gives you the answer. It asks questions until you discover it yourself — proven to produce 2× better retention.", color: "oklch(0.72 0.18 150)", badge: null },
  { href: "/library", icon: Library, title: "Knowledge Library", subtitle: "Curated Resources", description: "A hand-curated collection of the most valuable papers, tools, and resources — each with on-demand AI context and explanation.", color: "oklch(0.78 0.16 30)", badge: null },
  { href: "/lab", icon: Code2, title: "The Lab", subtitle: "Interactive Challenges", description: "Hands-on coding challenges with AI-assisted debugging. Learn by doing, not by watching.", color: "oklch(0.78 0.16 52)", badge: null },
];

const HOW_IT_WORKS = [
  { step: "01", icon: Sparkles, title: "Personalize", desc: "Answer a few questions — the more you share, the sharper your profile. Nexus maps your knowledge, style, and goals.", color: "oklch(0.78 0.16 52)" },
  { step: "02", icon: MapIcon, title: "Get Your Path", desc: "The AI generates a custom curriculum with modules, resources, and milestones — just for you.", color: "oklch(0.68 0.14 210)" },
  { step: "03", icon: Microscope, title: "Go Deep", desc: "Use the Depth Engine, Research Forge, and Lab to explore any concept at any level of detail.", color: "oklch(0.72 0.20 290)" },
  { step: "04", icon: BarChart3, title: "Track Growth", desc: "Take tests, earn XP, unlock badges, and watch your knowledge profile evolve over time.", color: "oklch(0.72 0.18 150)" },
];

const DAILY_TIPS = [
  { tip: "Use the Depth Engine to understand any concept at 5 levels — from child-friendly to expert. Start at level 1 and work your way up.", category: "Learning Strategy" },
  { tip: "The Feynman Technique: explain a concept in simple terms to find gaps in your understanding. Nexus's Socratic Mode automates this.", category: "Study Technique" },
  { tip: "Spaced repetition is the most evidence-backed learning method. Review your flashcard decks daily for 10 minutes to retain 90% long-term.", category: "Memory Science" },
  { tip: "When using AI for research, always ask it to cite sources and explain its reasoning — this helps you spot hallucinations.", category: "AI Literacy" },
  { tip: "Active recall beats passive re-reading by 2-3×. Use the Testing Center to quiz yourself instead of just reviewing notes.", category: "Cognitive Science" },
  { tip: "Mind maps help your brain encode information spatially. Use the Mind Map tool after learning a new topic to reinforce connections.", category: "Visualization" },
  { tip: "The best prompt for AI learning: 'Explain X, then ask me 3 questions to check my understanding.' Try it in the Lab.", category: "Prompt Engineering" },
];

function DailyTipWidget() {
  const dayIndex = Math.floor(Date.now() / 86400000) % DAILY_TIPS.length;
  const [idx, setIdx] = useState(dayIndex);
  const tip = DAILY_TIPS[idx];
  return (
    <div className="card-nexus p-5 h-full">
      <div className="flex items-start gap-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "oklch(0.78 0.16 52 / 0.12)", border: "1px solid oklch(0.78 0.16 52 / 0.25)" }}>
          <Lightbulb size={16} style={{ color: "oklch(0.78 0.16 52)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "oklch(0.78 0.16 52)" }}>{tip.category}</span>
            <button onClick={() => setIdx((idx + 1) % DAILY_TIPS.length)}
              className="p-1 rounded-lg transition-colors"
              style={{ color: "oklch(0.46 0.010 255)" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "oklch(0.78 0.008 255)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "oklch(0.46 0.010 255)"}>
              <RefreshCw size={11} />
            </button>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "oklch(0.72 0.008 255)" }}>{tip.tip}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Home() {
  const { profile, cookieId, isLoaded, updateProfile } = usePersonalization();
  const [greeting, setGreeting] = useState("");
  const [greetingLoaded, setGreetingLoaded] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizDone, setQuizDone] = useState(false);
  const featuresRef = useRef<HTMLDivElement>(null);

  const generateGreeting = trpc.ai.generateGreeting.useMutation();

  const getTimeOfDay = () => {
    const h = new Date().getHours();
    if (h < 5) return "late night"; if (h < 12) return "morning"; if (h < 17) return "afternoon"; if (h < 21) return "evening"; return "night";
  };

  useEffect(() => {
    if (!isLoaded) return;
    generateGreeting.mutate(
      { cookieId, visitCount: profile.visitCount, pagesVisited: profile.pagesVisited, preferredTopics: profile.preferredTopics, timeOfDay: getTimeOfDay(), xp: profile.xp },
      {
        onSuccess: (data) => { setGreeting(data.greeting); setGreetingLoaded(true); },
        onError: () => { setGreeting(""); setGreetingLoaded(true); },
      }
    );
    setQuizDone(profile.quizCompleted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  return (
    <PageWrapper pageName="home">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative pt-28 pb-20 px-4 text-center overflow-hidden">
        {/* Subtle hero gradient — replaces particle canvas */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 0%, oklch(0.20 0.05 52 / 0.18) 0%, transparent 65%), radial-gradient(ellipse 50% 40% at 80% 80%, oklch(0.18 0.04 210 / 0.10) 0%, transparent 60%)"
        }} />

        <div className="relative z-10 max-w-3xl mx-auto">
          {/* Top badge */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full mb-8 text-xs font-semibold"
            style={{ background: "oklch(0.78 0.16 52 / 0.10)", border: "1px solid oklch(0.78 0.16 52 / 0.28)", color: "oklch(0.88 0.16 52)" }}>
            <Sparkles size={11} />
            AI-Powered Adaptive Learning Platform
          </motion.div>

          {/* Headline */}
          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.08 }}
            className="font-bold tracking-tight leading-[1.08] mb-5"
            style={{ fontSize: "clamp(2.4rem, 6vw, 3.75rem)", color: "oklch(0.94 0.008 255)" }}>
            Learn anything,{" "}
            <span className="text-gradient-gold">deeply.</span>
          </motion.h1>

          {/* Subtitle — personalized greeting or static */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.18 }}
            className="text-lg mb-3 max-w-xl mx-auto leading-relaxed" style={{ color: "oklch(0.56 0.010 255)" }}>
            {!greetingLoaded ? (
              <span className="flex items-center justify-center gap-2 text-sm">
                <Loader2 size={13} className="animate-spin" />Personalizing your experience...
              </span>
            ) : greeting ? (
              <span style={{ color: "oklch(0.62 0.010 255)", fontStyle: "italic" }}>{greeting}</span>
            ) : (
              "Nexus adapts to how you learn — building personalized paths, tools, and challenges around your goals."
            )}
          </motion.div>

          {/* Static clarifier */}
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.28 }}
            className="text-sm mb-10" style={{ color: "oklch(0.42 0.010 255)" }}>
            Not another course platform. Nexus uses AI to build personalized curricula, explain concepts at any depth, and teach through questions — not lectures.
          </motion.p>

          {/* CTAs */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-3 mb-14">
            <Link href="/learn">
              <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }} className="btn-primary">
                <Brain size={15} />
                {profile.visitCount > 1 ? "Continue Learning" : "Start Learning"}
                <ArrowRight size={13} />
              </motion.button>
            </Link>
            <button onClick={() => featuresRef.current?.scrollIntoView({ behavior: "smooth" })} className="btn-ghost">
              How it works
            </button>
            {!quizDone && !showQuiz && (
              <button onClick={() => setShowQuiz(true)} className="btn-ghost"
                style={{ borderColor: "oklch(0.68 0.14 210 / 0.4)", color: "oklch(0.62 0.010 255)" }}>
                <Sparkles size={13} />Personalize
              </button>
            )}
          </motion.div>

          {/* Trust strip */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.48 }}
            className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
            {[
              { icon: Layers, label: "5 depth levels per concept" },
              { icon: Brain, label: "AI that asks, not just answers" },
              { icon: TrendingUp, label: "Measurable knowledge growth" },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-1.5 text-xs" style={{ color: "oklch(0.46 0.010 255)" }}>
                  <Icon size={12} style={{ color: "oklch(0.58 0.010 255)" }} />
                  {item.label}
                </div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── Why Nexus — 3 bento cards ─────────────────────────────────────── */}
      <section className="py-12 px-4">
        <div className="section-container grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: GraduationCap, color: "oklch(0.78 0.16 52)",
              title: "Adapts to You",
              desc: "Every learning path is built around your goals, your pace, and your current knowledge level — not a one-size-fits-all syllabus.",
            },
            {
              icon: Brain, color: "oklch(0.68 0.14 210)",
              title: "AI That Teaches",
              desc: "Ask anything mid-lesson. Get explanations from child-simple to expert-level. The AI challenges you with questions, not just answers.",
            },
            {
              icon: TrendingUp, color: "oklch(0.72 0.18 150)",
              title: "Progress That Sticks",
              desc: "Spaced repetition, testing, XP, and skill trees lock in what you learn. Watch your knowledge profile grow over time.",
            },
          ].map((card, i) => {
            const Icon = card.icon;
            return (
              <motion.div key={card.title}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}
                className="card-nexus p-6">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `oklch(from ${card.color} l c h / 0.12)`, border: `1px solid oklch(from ${card.color} l c h / 0.28)` }}>
                  <Icon size={18} style={{ color: card.color }} />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{card.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "oklch(0.52 0.010 255)" }}>{card.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Divider */}
      <div className="section-container px-4"><div className="divider" /></div>

      {/* ── Learning Paths ─────────────────────────────────────────────────── */}
      <section className="py-14 px-4">
        <div className="section-container">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.12em] mb-2" style={{ color: "oklch(0.78 0.16 52)" }}>Learning Paths</p>
            <h2 className="text-2xl font-bold text-foreground">Start a structured course</h2>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                title: "Mastering AI",
                subtitle: "Practical AI Usage",
                desc: "How to use AI tools, prompts, agents, automation, and workflows — not what AI is, but how to wield it.",
                modules: 3, lessons: 15, xp: 1165,
                color: "oklch(0.78 0.16 52)",
                href: "/learn",
                tags: ["Prompting", "Agents", "Automation", "Image Gen"],
              },
              {
                title: "Clear Thinking",
                subtitle: "Logic & Critical Reasoning",
                desc: "Mental models, argument mapping, systems thinking, and bias recognition — think clearer, decide better.",
                modules: 3, lessons: 15, xp: 1050,
                color: "oklch(0.68 0.14 210)",
                href: "/learn",
                tags: ["Logic", "Bias", "Systems", "Arguments"],
              },
            ].map((course, i) => (
              <motion.div key={course.title}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                <Link href={course.href}>
                  <motion.div whileHover={{ y: -2 }} className="card-nexus p-6 cursor-pointer h-full"
                    style={{ borderTop: `3px solid ${course.color}` }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: course.color }}>{course.subtitle}</p>
                    <h3 className="text-xl font-bold text-foreground mb-2">{course.title}</h3>
                    <p className="text-sm leading-relaxed mb-4" style={{ color: "oklch(0.52 0.010 255)" }}>{course.desc}</p>
                    <div className="flex flex-wrap gap-1.5 mb-5">
                      {course.tags.map(tag => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs" style={{ color: "oklch(0.46 0.010 255)" }}>
                        <span>{course.modules} modules</span>
                        <span>{course.lessons} lessons</span>
                        <span style={{ color: course.color }} className="font-semibold">+{course.xp} XP</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: course.color }}>
                        Start <ArrowRight size={12} />
                      </div>
                    </div>
                  </motion.div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section ref={featuresRef} className="py-14 px-4">
        <div className="section-container">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-10">
            <p className="text-xs font-bold uppercase tracking-[0.12em] mb-2" style={{ color: "oklch(0.68 0.14 210)" }}>Tools</p>
            <h2 className="text-2xl font-bold text-foreground mb-2">Tools that don't exist anywhere else</h2>
            <p className="text-sm" style={{ color: "oklch(0.52 0.010 255)" }}>Every feature is designed around one principle: active learning beats passive consumption.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div key={feature.title}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
                  <Link href={feature.href}>
                    <motion.div whileHover={{ y: -2 }} className="card-nexus p-5 h-full cursor-pointer group">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                          style={{ background: `oklch(from ${feature.color} l c h / 0.12)`, border: `1px solid oklch(from ${feature.color} l c h / 0.28)` }}>
                          <Icon size={16} style={{ color: feature.color }} />
                        </div>
                        {feature.badge && (
                          <span className="tag" style={{ color: feature.color, borderColor: `oklch(from ${feature.color} l c h / 0.3)` }}>
                            {feature.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: feature.color }}>{feature.subtitle}</p>
                      <h3 className="font-semibold text-foreground mb-2 group-hover:text-[oklch(0.88_0.16_52)] transition-colors">{feature.title}</h3>
                      <p className="text-sm leading-relaxed mb-4" style={{ color: "oklch(0.50 0.010 255)" }}>{feature.description}</p>
                      <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: feature.color }}>
                        Explore <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </motion.div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="section-container px-4"><div className="divider" /></div>

      {/* ── How It Works ──────────────────────────────────────────────────── */}
      <section className="py-14 px-4">
        <div className="section-container">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-10">
            <p className="text-xs font-bold uppercase tracking-[0.12em] mb-2" style={{ color: "oklch(0.72 0.18 150)" }}>Process</p>
            <h2 className="text-2xl font-bold text-foreground">How Nexus works</h2>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {HOW_IT_WORKS.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div key={i}
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                  className="card-nexus p-5 relative">
                  <div className="absolute top-4 right-4 text-3xl font-black opacity-[0.04] text-foreground select-none">{step.step}</div>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: `oklch(from ${step.color} l c h / 0.12)`, border: `1px solid oklch(from ${step.color} l c h / 0.28)` }}>
                    <Icon size={16} style={{ color: step.color }} />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1.5">{step.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "oklch(0.50 0.010 255)" }}>{step.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Daily tip + challenge ─────────────────────────────────────────── */}
      <section className="py-6 px-4">
        <div className="section-container grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <p className="text-xs font-bold uppercase tracking-[0.12em] mb-3 flex items-center gap-1.5" style={{ color: "oklch(0.50 0.010 255)" }}>
              <Lightbulb size={11} /> Daily Learning Tip
            </p>
            <DailyTipWidget />
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.06 }}>
            <p className="text-xs font-bold uppercase tracking-[0.12em] mb-3 flex items-center gap-1.5" style={{ color: "oklch(0.50 0.010 255)" }}>
              <Flame size={11} style={{ color: "oklch(0.78 0.16 30)" }} /> Today's Challenge
            </p>
            <div className="card-nexus p-5 h-[calc(100%-32px)]"
              style={{ borderLeft: "3px solid oklch(0.78 0.16 30)" }}>
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "oklch(0.78 0.16 30 / 0.12)", border: "1px solid oklch(0.78 0.16 30 / 0.28)" }}>
                  <Trophy size={16} style={{ color: "oklch(0.78 0.16 30)" }} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "oklch(0.78 0.16 30)" }}>
                    5-Question Daily Quiz
                  </p>
                  <p className="text-sm leading-relaxed mb-4" style={{ color: "oklch(0.52 0.010 255)" }}>
                    Test your knowledge across all subjects. Earn bonus XP for a perfect score. Takes under 3 minutes.
                  </p>
                  <Link href="/testing">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: "oklch(0.78 0.16 30 / 0.12)", border: "1px solid oklch(0.78 0.16 30 / 0.3)", color: "oklch(0.78 0.16 30)" }}>
                      <Flame size={11} /> Take the Challenge <ChevronRight size={10} />
                    </motion.button>
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="section-container">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="rounded-2xl p-10 text-center relative overflow-hidden"
            style={{ background: "oklch(0.12 0.012 255)", border: "1px solid oklch(0.22 0.016 255)" }}>
            <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 60% 80% at 50% 0%, oklch(0.78 0.16 52 / 0.07), transparent)" }} />
            <div className="relative z-10">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Ready to become a power learner?</h2>
              <p className="text-sm mb-8 max-w-md mx-auto" style={{ color: "oklch(0.52 0.010 255)" }}>
                Join a platform that adapts to you. Start with any course or let the AI build you a personalized path from scratch.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link href="/learn">
                  <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }} className="btn-primary">
                    <Brain size={15} /> Start Learning <ArrowRight size={13} />
                  </motion.button>
                </Link>
                {!quizDone && (
                  <button onClick={() => setShowQuiz(true)} className="btn-ghost">
                    <Sparkles size={13} /> Personalize first
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Entrance Quiz Modal (only on explicit click) ───────────────────── */}
      <AnimatePresence>
        {showQuiz && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "oklch(0 0 0 / 0.65)", backdropFilter: "blur(8px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowQuiz(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 16 }}
              transition={{ duration: 0.22 }}
              className="w-full max-w-lg rounded-2xl p-8"
              style={{ background: "oklch(0.12 0.012 255)", border: "1px solid oklch(0.22 0.016 255)", boxShadow: "0 32px 80px oklch(0 0 0 / 0.5)" }}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-foreground">Personalize Your Experience</h2>
                  <p className="text-sm mt-0.5" style={{ color: "oklch(0.52 0.010 255)" }}>Answer questions to personalize your experience — the more you answer, the better the result</p>
                </div>
                <button onClick={() => setShowQuiz(false)}
                  className="p-2 rounded-lg transition-colors"
                  style={{ color: "oklch(0.46 0.010 255)" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "oklch(0.15 0.014 255)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                  <X size={16} />
                </button>
              </div>
              <EntranceQuiz
                onComplete={(results, topics) => {
                  updateProfile({ preferredTopics: topics, quizCompleted: true });
                  setQuizDone(true);
                  setShowQuiz(false);
                }}
                onSkip={() => setShowQuiz(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}
