import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import {
  ArrowRight, Sparkles, ChevronDown, X, Loader2,
  Brain, Layers, FlaskConical, BookOpen, Code2, Zap,
  Target, MessageSquare, GraduationCap, Library,
  Star, TrendingUp, Clock, Users, Lightbulb, Trophy,
  Flame, CheckCircle2, Map, Microscope, Cpu, Globe,
  RefreshCw, ChevronRight, BarChart3
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import PageWrapper from "@/components/PageWrapper";

// ─── Particle Canvas ──────────────────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    // Respect reduced-motion preference — skip the canvas entirely
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);
    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    window.addEventListener("resize", resize);

    interface P { x: number; y: number; vx: number; vy: number; size: number; opacity: number; hue: number; life: number; maxLife: number; }
    const colors = [{ h: 55 }, { h: 200 }, { h: 290 }];
    const count = Math.min(60, Math.floor((W * H) / 20000));
    const particles: P[] = Array.from({ length: count }, () => {
      const c = colors[Math.floor(Math.random() * colors.length)];
      return { x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35 - 0.04, size: Math.random() * 1.8 + 0.4, opacity: Math.random() * 0.45 + 0.1, hue: c.h, life: Math.random() * 200, maxLife: 200 + Math.random() * 200 };
    });

    let mouse = { x: W / 2, y: H / 2 };
    const onMouse = (e: MouseEvent) => { mouse = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("mousemove", onMouse);

    // Spatial grid for O(n) connection checks instead of O(n²)
    const CELL = 100;
    function getCell(x: number, y: number) { return `${Math.floor(x / CELL)},${Math.floor(y / CELL)}`; }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);

      // Build grid
      const grid = new Map<string, P[]>();
      for (const p of particles) {
        const key = getCell(p.x, p.y);
        if (!grid.has(key)) grid.set(key, []);
        grid.get(key)!.push(p);
      }

      // Draw connections using grid neighbours only
      for (const p of particles) {
        const cx = Math.floor(p.x / CELL);
        const cy = Math.floor(p.y / CELL);
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const neighbours = grid.get(`${cx + dx},${cy + dy}`) ?? [];
            for (const q of neighbours) {
              if (q === p) continue;
              const dist = Math.hypot(p.x - q.x, p.y - q.y);
              if (dist < CELL) {
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(q.x, q.y);
                ctx.strokeStyle = `oklch(0.7 0.12 ${p.hue} / ${(1 - dist / CELL) * 0.08})`;
                ctx.lineWidth = 0.5;
                ctx.stroke();
              }
            }
          }
        }
      }

      for (const p of particles) {
        p.life++;
        if (p.life > p.maxLife) { p.x = Math.random() * W; p.y = H + 10; p.life = 0; }
        const mdx = mouse.x - p.x, mdy = mouse.y - p.y, md = Math.hypot(mdx, mdy);
        if (md < 160 && md > 0) { p.vx += (mdx / md) * 0.005; p.vy += (mdy / md) * 0.005; }
        p.vx *= 0.99; p.vy *= 0.99; p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0; if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        const a = p.opacity * Math.sin((p.life / p.maxLife) * Math.PI);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fillStyle = `oklch(0.75 0.18 ${p.hue} / ${a})`; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2); ctx.fillStyle = `oklch(0.65 0.12 ${p.hue} / ${a * 0.1})`; ctx.fill();
      }
      animRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener("resize", resize); window.removeEventListener("mousemove", onMouse); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.6 }} />;
}
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fillStyle = `oklch(0.75 0.18 ${p.hue} / ${a})`; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2); ctx.fillStyle = `oklch(0.65 0.12 ${p.hue} / ${a * 0.1})`; ctx.fill();
      }
      animRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(animRef.current); window.removeEventListener("resize", resize); window.removeEventListener("mousemove", onMouse); };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.6 }} />;
}

// ─── Typewriter ───────────────────────────────────────────────────────────────
function Typewriter({ texts, speed = 65 }: { texts: string[]; speed?: number }) {
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    const current = texts[textIndex];
    let timeout: ReturnType<typeof setTimeout>;
    if (!deleting && charIndex < current.length) {
      timeout = setTimeout(() => { setDisplayed(current.slice(0, charIndex + 1)); setCharIndex(c => c + 1); }, speed);
    } else if (!deleting && charIndex === current.length) {
      timeout = setTimeout(() => setDeleting(true), 2200);
    } else if (deleting && charIndex > 0) {
      timeout = setTimeout(() => { setDisplayed(current.slice(0, charIndex - 1)); setCharIndex(c => c - 1); }, speed / 2);
    } else if (deleting && charIndex === 0) {
      setDeleting(false);
      setTextIndex(i => (i + 1) % texts.length);
    }
    return () => clearTimeout(timeout);
  }, [charIndex, deleting, textIndex, texts, speed]);

  return <span>{displayed}<span className="animate-pulse text-[oklch(0.75_0.18_55)]">|</span></span>;
}

// ─── Entrance Quiz ────────────────────────────────────────────────────────────
interface QuizQuestion { id: string; question: string; options: string[]; category: string; }

function EntranceQuiz({ onComplete, onSkip }: { onComplete: (results: Record<string, string>, topics: string[]) => void; onSkip: () => void }) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const { cookieId } = usePersonalization();
  const generateQuiz = trpc.ai.generateQuiz.useMutation();
  const completeQuiz = trpc.visitor.completeQuiz.useMutation();

  useEffect(() => {
    generateQuiz.mutate({ cookieId }, {
      onSuccess: (data) => { setQuestions(data.questions); setLoading(false); },
      onError: () => setLoading(false),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnswer = (questionId: string, answer: string) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);
    if (current < questions.length - 1) {
      setTimeout(() => setCurrent(c => c + 1), 280);
    } else {
      const topics = questions.map(q => q.category).filter(Boolean);
      completeQuiz.mutate({ cookieId, results: newAnswers, preferredTopics: topics }, {
        onSuccess: () => onComplete(newAnswers, topics),
      });
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <Loader2 className="animate-spin text-[oklch(0.75_0.18_55)]" size={26} />
      <p className="text-muted-foreground text-sm">Generating your personalized assessment...</p>
    </div>
  );

  if (!questions.length) return (
    <div className="text-center py-8">
      <p className="text-muted-foreground text-sm mb-4">Unable to load quiz. Start exploring anyway!</p>
      <button onClick={onSkip} className="px-6 py-2.5 rounded-xl bg-white/8 border border-white/15 text-sm text-foreground hover:bg-white/12 transition-colors">Skip to platform</button>
    </div>
  );

  const q = questions[current];
  return (
    <div className="py-2">
      <div className="flex gap-1.5 mb-8">{questions.map((_, i) => <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-500 ${i < current ? "bg-[oklch(0.75_0.18_55)]" : i === current ? "bg-[oklch(0.75_0.18_55_/_0.5)]" : "bg-white/10"}`} />)}</div>
      <AnimatePresence mode="wait">
        <motion.div key={current} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.22 }}>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Question {current + 1} of {questions.length}</p>
          <h3 className="text-lg font-semibold text-foreground mb-5 leading-snug">{q.question}</h3>
          <div className="space-y-2.5">
            {q.options.map((option, i) => (
              <motion.button key={i} onClick={() => handleAnswer(q.id, option)} className="w-full text-left px-4 py-3.5 rounded-xl glass border border-white/10 hover:border-[oklch(0.75_0.18_55_/_0.3)] hover:bg-white/5 text-sm text-muted-foreground hover:text-foreground transition-all" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>{option}</motion.button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
      <button onClick={onSkip} className="mt-5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors">Skip personalization →</button>
    </div>
  );
}

// ─── Feature Cards ────────────────────────────────────────────────────────────
const FEATURES = [
  { href: "/learn", icon: GraduationCap, title: "AI Curriculum", subtitle: "Adaptive Learning", description: "Describe your goal — the AI builds a personalized learning path with modules, resources, and milestones tailored to your exact level.", color: "oklch(0.75 0.18 55)", badge: "Most Popular" },
  { href: "/research", icon: FlaskConical, title: "Research Forge", subtitle: "Document Intelligence", description: "Paste any text or URL. Get a structured summary, key insights, and auto-generated flashcards for spaced repetition — instantly.", color: "oklch(0.65 0.22 200)", badge: "Unique" },
  { href: "/depth", icon: Layers, title: "Depth Engine", subtitle: "Multi-Level Explanation", description: "Understand any concept at 5 depths — from child-level analogy to expert precision. The Feynman Technique, automated.", color: "oklch(0.72 0.2 290)", badge: "Exclusive" },
  { href: "/learn", icon: MessageSquare, title: "Socratic Mode", subtitle: "Question-Based Learning", description: "The AI never gives you the answer. It asks questions until you discover it yourself — proven to produce 2× better retention.", color: "oklch(0.72 0.18 150)", badge: null },
  { href: "/library", icon: Library, title: "Knowledge Library", subtitle: "Curated Resources", description: "A hand-curated collection of the most valuable papers, tools, and resources — each with on-demand AI context and explanation.", color: "oklch(0.78 0.16 30)", badge: null },
  { href: "/lab", icon: Code2, title: "The Lab", subtitle: "Interactive Challenges", description: "Hands-on coding challenges with AI-assisted debugging. Learn by doing, not by watching.", color: "oklch(0.75 0.18 55)", badge: null },
];

const STATS = [
  { icon: Brain, value: "5", label: "Explanation depths", color: "oklch(0.75 0.18 55)" },
  { icon: Target, value: "∞", label: "Personalized paths", color: "oklch(0.65 0.22 200)" },
  { icon: TrendingUp, value: "2×", label: "Better retention", color: "oklch(0.72 0.2 290)" },
  { icon: Clock, value: "0", label: "Passive lectures", color: "oklch(0.72 0.18 150)" },
];

const HOW_IT_WORKS = [
  { step: "01", icon: Sparkles, title: "Personalize", desc: "Answer 4 quick questions. Nexus maps your knowledge level, learning style, and goals.", color: "oklch(0.75 0.18 55)" },
  { step: "02", icon: Map, title: "Get Your Path", desc: "The AI generates a custom curriculum with modules, resources, and milestones — just for you.", color: "oklch(0.65 0.22 200)" },
  { step: "03", icon: Microscope, title: "Go Deep", desc: "Use the Depth Engine, Research Forge, and Lab to explore any concept at any level of detail.", color: "oklch(0.72 0.2 290)" },
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
    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="glass rounded-2xl border border-[oklch(0.75_0.18_55_/_0.2)] p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-[oklch(0.75_0.18_55_/_0.04)] rounded-full blur-2xl" />
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-[oklch(0.75_0.18_55_/_0.15)] border border-[oklch(0.75_0.18_55_/_0.3)] flex items-center justify-center flex-shrink-0">
          <Lightbulb size={18} className="text-[oklch(0.75_0.18_55)]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[oklch(0.75_0.18_55)]">{tip.category}</span>
            <button onClick={() => setIdx((idx + 1) % DAILY_TIPS.length)} className="p-1.5 rounded-lg hover:bg-white/8 transition-colors text-muted-foreground hover:text-foreground">
              <RefreshCw size={12} />
            </button>
          </div>
          <p className="text-sm text-foreground/85 leading-relaxed">{tip.tip}</p>
        </div>
      </div>
    </motion.div>
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
        onError: () => { setGreeting("Welcome to Nexus — an AI-powered learning platform built to help you understand anything, deeply."); setGreetingLoaded(true); },
      }
    );
    if (profile.visitCount <= 1 && !profile.quizCompleted) {
      const t = setTimeout(() => setShowQuiz(true), 2800);
      return () => clearTimeout(t);
    }
    setQuizDone(profile.quizCompleted);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  return (
    <PageWrapper pageName="home">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        <ParticleCanvas />
        <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 100% 80% at 50% 50%, transparent 30%, oklch(0.08 0.015 260 / 0.7) 100%)" }} />

        <div className="relative z-10 text-center px-4 max-w-5xl mx-auto">
          {/* Badge */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-[oklch(0.75_0.18_55_/_0.3)] text-sm text-[oklch(0.75_0.18_55)] mb-8">
            <Sparkles size={13} />
            <span>AI-Powered Learning Platform</span>
          </motion.div>

          {/* Headline */}
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }} className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight tracking-tight">
            Learn anything,{" "}
            <span className="text-gradient-gold block md:inline">
              <Typewriter texts={["deeply.", "adaptively.", "intelligently.", "with Socrates.", "at your pace."]} />
            </span>
          </motion.h1>

          {/* Personalized greeting or subheadline */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.25 }} className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed min-h-[3rem]">
            {!greetingLoaded ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={15} className="animate-spin" />
                <span className="text-sm">Personalizing your experience...</span>
              </span>
            ) : greeting ? (
              <span className="text-foreground/80 italic">{greeting}</span>
            ) : (
              "Not another course platform. Nexus uses AI to build personalized curricula, explain concepts at any depth, and teach through questions — not lectures."
            )}
          </motion.div>

          {/* CTAs */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.35 }} className="flex flex-wrap items-center justify-center gap-4 mb-16">
            <Link href="/learn">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-[oklch(0.75_0.18_55)] to-[oklch(0.65_0.22_200)] text-black font-semibold text-sm shadow-lg shadow-[oklch(0.75_0.18_55_/_0.25)]">
                <Brain size={16} />
                {profile.visitCount > 1 ? "Continue Learning" : "Start Learning"}
                <ArrowRight size={14} />
              </motion.button>
            </Link>
            <Link href="/depth">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex items-center gap-2 px-8 py-3.5 rounded-xl glass border border-white/15 text-sm font-medium text-foreground hover:border-white/25 transition-colors">
                <Layers size={16} />
                Try Depth Engine
              </motion.button>
            </Link>
            {!quizDone && !showQuiz && (
              <motion.button onClick={() => setShowQuiz(true)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex items-center gap-2 px-8 py-3.5 rounded-xl glass border border-[oklch(0.65_0.22_200_/_0.3)] text-[oklch(0.75_0.18_200)] text-sm font-medium hover:border-[oklch(0.65_0.22_200_/_0.5)] transition-all">
                <Sparkles size={14} /> Personalize
              </motion.button>
            )}
          </motion.div>

          {/* Stats */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.45 }} className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {STATS.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="glass rounded-xl border border-white/8 p-4 text-center">
                  <Icon size={16} className="mx-auto mb-2" style={{ color: stat.color }} />
                  <div className="text-2xl font-bold mb-0.5" style={{ color: stat.color }}>{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              );
            })}
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.button onClick={() => featuresRef.current?.scrollIntoView({ behavior: "smooth" })} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-muted-foreground/50 hover:text-muted-foreground transition-colors">
          <span className="text-xs tracking-wider uppercase">Explore</span>
          <motion.div animate={{ y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}><ChevronDown size={18} /></motion.div>
        </motion.button>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section ref={featuresRef} className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-white/10 text-sm text-muted-foreground mb-6">
              <Zap size={13} className="text-[oklch(0.75_0.18_55)]" />
              <span>What makes Nexus different</span>
            </motion.div>
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Tools that don't exist{" "}<span className="text-gradient-gold">anywhere else</span>
            </motion.h2>
            <motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="text-muted-foreground max-w-xl mx-auto">
              Every feature is designed around one principle: active learning beats passive consumption. The AI here challenges you, adapts to you, and remembers you.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div key={feature.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}>
                  <Link href={feature.href}>
                    <motion.div whileHover={{ y: -3, scale: 1.01 }} className="glass rounded-2xl border border-white/8 p-6 h-full cursor-pointer group hover:border-white/15 transition-all">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${feature.color.replace(")", " / 0.15)")}`, border: `1px solid ${feature.color.replace(")", " / 0.3)")}` }}>
                          <Icon size={18} style={{ color: feature.color }} />
                        </div>
                        {feature.badge && (
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold border" style={{ color: feature.color, backgroundColor: `${feature.color.replace(")", " / 0.1)")}`, borderColor: `${feature.color.replace(")", " / 0.25)")}` }}>
                            {feature.badge}
                          </span>
                        )}
                      </div>
                      <div className="mb-1"><span className="text-xs font-medium uppercase tracking-wider" style={{ color: feature.color }}>{feature.subtitle}</span></div>
                      <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-[oklch(0.85_0.18_55)] transition-colors">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{feature.description}</p>
                      <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: feature.color }}>
                        Explore <ArrowRight size={11} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </motion.div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Daily Tip + Today's Challenge ──────────────────────────────── */}
      <section className="py-8 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Daily AI Tip */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb size={14} className="text-[oklch(0.75_0.18_55)]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Daily Learning Tip</span>
            </div>
            <DailyTipWidget />
          </div>

          {/* Today's Challenge */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Flame size={14} className="text-[oklch(0.78_0.18_30)]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Today's Challenge</span>
            </div>
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="glass rounded-2xl border border-[oklch(0.78_0.18_30_/_0.2)] p-6 relative overflow-hidden h-full">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[oklch(0.78_0.18_30_/_0.04)] rounded-full blur-2xl" />
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[oklch(0.78_0.18_30_/_0.15)] border border-[oklch(0.78_0.18_30_/_0.3)] flex items-center justify-center flex-shrink-0">
                  <Trophy size={18} className="text-[oklch(0.78_0.18_30)]" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[oklch(0.78_0.18_30)] mb-1">5-Question Daily Quiz</p>
                  <p className="text-sm text-foreground/85 leading-relaxed mb-4">Test your knowledge across all subjects. Earn bonus XP for a perfect score. Takes under 3 minutes.</p>
                  <Link href="/testing">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[oklch(0.78_0.18_30_/_0.15)] border border-[oklch(0.78_0.18_30_/_0.3)] text-[oklch(0.78_0.18_30)] text-xs font-semibold hover:bg-[oklch(0.78_0.18_30_/_0.25)] transition-all">
                      <Flame size={12} /> Take the Challenge <ChevronRight size={11} />
                    </motion.button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────────── */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-white/10 text-sm text-muted-foreground mb-6">
              <CheckCircle2 size={13} className="text-[oklch(0.72_0.18_150)]" />
              <span>Simple, powerful, effective</span>
            </motion.div>
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              How Nexus <span className="text-gradient-gold">works</span>
            </motion.h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {HOW_IT_WORKS.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="glass rounded-2xl border border-white/8 p-6 relative">
                  <div className="absolute top-4 right-4 text-4xl font-black opacity-5 text-foreground">{step.step}</div>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${step.color.replace(")", " / 0.15)")}`, border: `1px solid ${step.color.replace(")", " / 0.3)")}` }}>
                    <Icon size={18} style={{ color: step.color }} />
                  </div>
                  <h3 className="text-base font-bold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Platform Highlights ───────────────────────────────────────────── */}
      <section className="py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: Cpu, title: "AI-First Design", desc: "Every feature is powered by state-of-the-art language models. Not bolted on — built in from day one.", color: "oklch(0.65 0.22 200)", href: "/lab" },
              { icon: Globe, title: "Learn Anything", desc: "From quantum physics to creative writing, philosophy to machine learning. No topic is off limits.", color: "oklch(0.72 0.2 290)", href: "/library" },
              { icon: TrendingUp, title: "Measure Progress", desc: "IQ tests, subject assessments, XP tracking, and trend charts. See exactly how you're improving.", color: "oklch(0.72 0.18 150)", href: "/dashboard" },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                  <Link href={item.href}>
                    <motion.div whileHover={{ y: -3 }} className="glass rounded-2xl border border-white/8 p-6 cursor-pointer group hover:border-white/15 transition-all">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${item.color.replace(")", " / 0.15)")}`, border: `1px solid ${item.color.replace(")", " / 0.3)")}` }}>
                        <Icon size={18} style={{ color: item.color }} />
                      </div>
                      <h3 className="text-base font-bold text-foreground mb-2 group-hover:text-[oklch(0.85_0.18_55)] transition-colors">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-3">{item.desc}</p>
                      <div className="flex items-center gap-1 text-xs font-medium" style={{ color: item.color }}>
                        Explore <ChevronRight size={11} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </motion.div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Philosophy ────────────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="glass rounded-3xl border border-white/8 p-10 md:p-14 text-center relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-[oklch(0.75_0.18_55_/_0.05)] blur-3xl rounded-full" />
            </div>
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-[oklch(0.75_0.18_55_/_0.15)] border border-[oklch(0.75_0.18_55_/_0.3)] flex items-center justify-center mx-auto mb-6">
                <Star size={20} className="text-[oklch(0.75_0.18_55)]" />
              </div>
              <blockquote className="text-xl md:text-2xl font-medium text-foreground leading-relaxed mb-4">
                "The mind is not a vessel to be filled, but a fire to be kindled."
              </blockquote>
              <p className="text-sm text-muted-foreground mb-2">— Plutarch</p>
              <p className="text-sm text-muted-foreground/70 max-w-xl mx-auto mt-6 leading-relaxed">
                Nexus was built on this principle. Every tool here is designed to spark curiosity, challenge assumptions, and build genuine understanding — not just surface-level familiarity.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
                <Link href="/learn">
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[oklch(0.75_0.18_55)] to-[oklch(0.65_0.22_200)] text-black font-semibold text-sm">
                    <Brain size={15} /> Start your journey
                  </motion.button>
                </Link>
                <Link href="/about">
                  <button className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
                    <Users size={13} /> About the creator
                  </button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Entrance Quiz Modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showQuiz && !quizDone && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} transition={{ type: "spring", bounce: 0.2 }} className="glass-strong rounded-3xl border border-[oklch(0.75_0.18_55_/_0.3)] p-8 max-w-lg w-full shadow-2xl">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h2 className="text-xl font-bold text-foreground">Personalize your experience</h2>
                  <p className="text-sm text-muted-foreground mt-1">3 quick questions to tailor Nexus for you. Earn 50 XP.</p>
                </div>
                <button onClick={() => { setShowQuiz(false); setQuizDone(true); }} className="p-2 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground"><X size={18} /></button>
              </div>
              <EntranceQuiz
                onComplete={(r, t) => { updateProfile({ quizCompleted: true, quizResults: r, preferredTopics: t }); setQuizDone(true); setShowQuiz(false); }}
                onSkip={() => { setShowQuiz(false); setQuizDone(true); }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}
