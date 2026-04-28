import { lazy, Suspense, useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Sparkles, Target, ChevronRight, Loader2,
  Brain, MessageSquare, CheckCircle2, ArrowRight,
  GraduationCap, Zap, RotateCcw, Send, ChevronDown, ChevronUp,
  Clock, Star, Play, Lock, ChevronLeft, XCircle, Check,
  Volume2, VolumeX, Pause, HelpCircle, Shield, Trophy,
  Eye, Info, Award, RefreshCw, Lightbulb, AlertTriangle,
  Scale, Search, FlaskConical, Flame, Users, TrendingUp,
  Heart, DollarSign, Palette, Fingerprint, Wifi, ShieldAlert,
  BadgeCheck, Banknote, Brush, Database, Globe, Smartphone,
  Sliders, Cpu, Link, Settings, Key, Terminal, Layers,
  GitBranch, Wand2, SlidersHorizontal, Code2, Copy,
  ThumbsUp, ThumbsDown, Repeat2, PenLine, Image as ImageIcon
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import PageWrapper from "@/components/PageWrapper";
import { toast } from "sonner";
import { useLocation } from "wouter";
import type { FeaturedPath } from "./learn/featuredPaths";

const SocraticTutorPanel = lazy(() => import("./learn/SocraticTutor"));
const PromptEngineeringMasteryCourse = lazy(() => import("./learn/PromptEngineeringMasteryCourse"));
const SystemsThinkingDesignCourse = lazy(() => import("./learn/SystemsThinkingDesignCourse"));
const Streamdown = lazy(async () => {
  const mod = await import("streamdown");
  return { default: mod.Streamdown };
});

function LazyMarkdown({ children }: { children: string }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground whitespace-pre-wrap">{children}</p>}>
      <Streamdown>{children}</Streamdown>
    </Suspense>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface CurriculumModule {
  title: string;
  description: string;
  duration: string;
  type: "lesson" | "practice" | "project" | "assessment";
  concepts: string[];
  objectives: string[];
}

interface Curriculum {
  title: string;
  overview: string;
  totalDuration: string;
  level: string;
  curriculumId?: string;
  modules: CurriculumModule[];
}



// ═══════════════════════════════════════════════════════════════════════════════
// AI MASTERY COURSE — "From Zero to Power User"
// 3 Modules · 15 Lessons · 1,100 XP
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Shared Types ─────────────────────────────────────────────────────────────
interface AIMasteryQuiz {
  id: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

// ─── Reusable Components ──────────────────────────────────────────────────────

// Glowing badge for section types
function SectionBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-widest mb-3"
      style={{ background: `oklch(from ${color} l c h / 0.15)`, color, border: `1px solid oklch(from ${color} l c h / 0.3)` }}>
      {label}
    </span>
  );
}

// Collapsible "Learn More" expander powered by AI
function AIExpander({ prompt, label = "Dig deeper with AI", color = "oklch(0.72_0.2_290)" }: { prompt: string; label?: string; color?: string }) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState("");
  const mut = trpc.ai.explainConcept.useMutation({
    onSuccess: d => setResult(d.explanation),
  });
  const trigger = () => {
    if (result) { setOpen(!open); return; }
    setOpen(true);
    mut.mutate({ concept: prompt, level: "student" });
  };
  return (
    <div className="mt-3">
      <button onClick={trigger}
        className="flex items-center gap-2 text-xs font-semibold transition-all px-3 py-1.5 rounded-lg"
        style={{ color, background: `oklch(from ${color} l c h / 0.08)`, border: `1px solid oklch(from ${color} l c h / 0.2)` }}>
        <Brain size={11} /> {label}
        <ChevronDown size={11} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-2">
            <div className="p-4 rounded-xl glass border" style={{ borderColor: `oklch(from ${color} l c h / 0.25)` }}>
              {mut.isPending ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 size={13} className="animate-spin" style={{ color }} /> Thinking…
                </div>
              ) : (
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{result}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Quiz block — one question at a time with XP feedback
function MasteryQuiz({ questions, color }: { questions: AIMasteryQuiz[]; color: string }) {
  const [qi, setQi] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const { addXP } = usePersonalization();

  const handleSelect = (i: number) => {
    if (sel !== null) return;
    setSel(i);
    if (i === questions[qi].correct) setScore(s => s + 1);
  };

  const next = () => {
    if (qi + 1 >= questions.length) {
      const pct = Math.round(((score + (sel === questions[qi].correct ? 1 : 0)) / questions.length) * 100);
      setDone(true);
      const xp = pct >= 80 ? 20 : pct >= 60 ? 10 : 5;
      addXP(xp);
      toast.success(`+${xp} XP — ${pct}% on knowledge check!`);
    } else {
      setQi(q => q + 1);
      setSel(null);
    }
  };

  if (done) {
    const finalScore = score + (sel === questions[qi]?.correct ? 1 : 0);
    const pct = Math.round((finalScore / questions.length) * 100);
    return (
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
        className="p-5 rounded-2xl glass border text-center" style={{ borderColor: `oklch(from ${color} l c h / 0.35)` }}>
        <div className="text-3xl font-black mb-1" style={{ color }}>{pct}%</div>
        <div className="text-sm text-muted-foreground">{finalScore}/{questions.length} correct</div>
        <div className="text-xs text-muted-foreground mt-2">
          {pct >= 80 ? "Excellent — you've got this." : pct >= 60 ? "Good foundation — review the explanations." : "Revisit the lesson content, then try again."}
        </div>
        <button onClick={() => { setQi(0); setSel(null); setScore(0); setDone(false); }}
          className="mt-3 px-4 py-1.5 rounded-lg text-xs font-medium glass border border-white/10 text-muted-foreground hover:text-foreground transition-colors">
          Retry
        </button>
      </motion.div>
    );
  }

  const q = questions[qi];
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">Question {qi + 1} of {questions.length}</span>
        <div className="flex gap-1">
          {questions.map((_, i) => (
            <div key={i} className="w-6 h-1.5 rounded-full"
              style={{ background: i < qi ? `oklch(from ${color} l c h / 0.6)` : i === qi ? color : "oklch(1 0 0 / 0.1)" }} />
          ))}
        </div>
      </div>
      <p className="font-semibold text-foreground leading-snug">{q.question}</p>
      <div className="space-y-2">
        {q.options.map((opt, i) => {
          const isCorrect = i === q.correct;
          const isSelected = i === sel;
          let bg = "oklch(1 0 0 / 0.04)";
          let border = "oklch(1 0 0 / 0.08)";
          let textColor = "oklch(0.7 0 0)";
          if (sel !== null) {
            if (isCorrect) { bg = "oklch(0.72_0.18_150_/_0.15)"; border = "oklch(0.72_0.18_150_/_0.5)"; textColor = "oklch(0.82_0.18_150)"; }
            else if (isSelected) { bg = "oklch(0.68_0.22_10_/_0.15)"; border = "oklch(0.68_0.22_10_/_0.5)"; textColor = "oklch(0.78_0.22_10)"; }
          }
          return (
            <button key={i} onClick={() => handleSelect(i)}
              className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all flex items-center gap-3"
              style={{ background: bg, border: `1px solid ${border}`, color: textColor }}>
              {sel !== null && isCorrect && <CheckCircle2 size={14} className="shrink-0" />}
              {sel !== null && isSelected && !isCorrect && <XCircle size={14} className="shrink-0" />}
              {sel === null && <div className="w-5 h-5 rounded-full border border-white/20 shrink-0 text-[10px] flex items-center justify-center font-bold text-muted-foreground">{String.fromCharCode(65 + i)}</div>}
              {opt}
            </button>
          );
        })}
      </div>
      <AnimatePresence>
        {sel !== null && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl glass border border-white/8">
            <p className="text-xs text-muted-foreground leading-relaxed">{q.explanation}</p>
            <button onClick={next} className="mt-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{ background: `oklch(from ${color} l c h / 0.15)`, color, border: `1px solid oklch(from ${color} l c h / 0.35)` }}>
              {qi + 1 >= questions.length ? "See results →" : "Next question →"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Live AI prompt sandbox — type a prompt, get a real response
function PromptSandbox({ placeholder, systemHint, color, label = "Try it live" }: {
  placeholder: string; systemHint: string; color: string; label?: string;
}) {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const mut = trpc.ai.explainConcept.useMutation({
    onSuccess: d => { setResponse(d.explanation); setLoading(false); },
    onError: () => { toast.error("AI unavailable — try again"); setLoading(false); },
  });
  const submit = () => {
    if (!input.trim()) { toast.error("Write a prompt first"); return; }
    setLoading(true);
    setResponse("");
    mut.mutate({ concept: `${systemHint}\n\nUser prompt: ${input}`, level: "student" });
  };
  return (
    <div className="space-y-3 p-4 rounded-2xl glass border" style={{ borderColor: `oklch(from ${color} l c h / 0.25)` }}>
      <div className="flex items-center gap-2 mb-1">
        <FlaskConical size={13} style={{ color }} />
        <span className="text-xs font-bold tracking-wide" style={{ color }}>{label.toUpperCase()}</span>
      </div>
      <textarea value={input} onChange={e => setInput(e.target.value)}
        placeholder={placeholder} rows={4}
        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-foreground placeholder:text-white/20 resize-none focus:outline-none focus:border-white/25 font-mono" />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{input.length} chars</span>
        <button onClick={submit} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
          style={{ background: `oklch(from ${color} l c h / 0.2)`, color, border: `1px solid oklch(from ${color} l c h / 0.4)` }}>
          {loading ? <><Loader2 size={13} className="animate-spin" />Running…</> : <><Send size={13} />Run Prompt</>}
        </button>
      </div>
      <AnimatePresence>
        {response && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="mt-2 p-4 rounded-xl border border-white/8 bg-white/3">
            <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <Sparkles size={10} /> AI RESPONSE
            </div>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{response}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Narrator with Web Speech API
function AIVoice({ text }: { text: string }) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ttsMutation = trpc.lesson.textToSpeech.useMutation();

  const play = useCallback(async () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setPlaying(true);
      return;
    }
    setLoading(true);
    try {
      const { audioUrl } = await ttsMutation.mutateAsync({ text });
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => setPlaying(false);
      audio.onerror = () => setPlaying(false);
      await audio.play();
      setPlaying(true);
    } catch {
      // Fallback to browser TTS
      window.speechSynthesis?.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 0.92; u.onend = () => setPlaying(false);
      setPlaying(true);
      window.speechSynthesis?.speak(u);
    } finally {
      setLoading(false);
    }
  }, [text]);

  const stop = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    window.speechSynthesis?.cancel();
    setPlaying(false);
  }, []);

  useEffect(() => () => {
    audioRef.current?.pause();
    window.speechSynthesis?.cancel();
  }, []);

  return (
    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[oklch(0.75_0.18_55_/_0.07)] border border-[oklch(0.75_0.18_55_/_0.18)] mb-3">
      {playing ? (
        <div className="flex items-end gap-0.5 h-3">
          {[0, 1, 2, 3].map(i => (
            <motion.div key={i} className="w-0.5 bg-[oklch(0.75_0.18_55)] rounded-full"
              animate={{ height: ["3px", "12px", "3px"] }}
              transition={{ repeat: Infinity, duration: 0.55, delay: i * 0.1 }} />
          ))}
        </div>
      ) : loading ? (
        <Loader2 size={11} className="text-[oklch(0.75_0.18_55)] animate-spin" />
      ) : (
        <Volume2 size={11} className="text-[oklch(0.75_0.18_55)]" />
      )}
      <span className="text-xs text-muted-foreground flex-1 leading-snug">{text.slice(0, 80)}{text.length > 80 ? "…" : ""}</span>
      {playing
        ? <button onClick={stop} className="px-2 py-0.5 rounded text-[10px] bg-white/10 text-muted-foreground"><Pause size={9} className="inline mr-0.5" />Stop</button>
        : <button onClick={play} disabled={loading} className="px-2 py-0.5 rounded text-[10px] bg-[oklch(0.75_0.18_55_/_0.2)] text-[oklch(0.85_0.18_55)] border border-[oklch(0.75_0.18_55_/_0.3)] disabled:opacity-50">
            {loading ? "…" : <><Play size={9} className="inline mr-0.5" />Listen</>}
          </button>
      }
    </div>
  );
}

// ─── Module Podcast ───────────────────────────────────────────────────────────
function ModulePodcast({ moduleNum, moduleTitle, content, cookieId }: {
  moduleNum: number; moduleTitle: string; content: string; cookieId: string;
}) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [callInText, setCallInText] = useState("");
  const [callInLoading, setCallInLoading] = useState(false);
  const [callInResponse, setCallInResponse] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const podcastMut = trpc.lesson.generateModulePodcast.useMutation();
  const callInMut = trpc.lesson.callInQuestion.useMutation();

  const generate = async () => {
    setLoading(true);
    try {
      const r = await podcastMut.mutateAsync({ cookieId, moduleNum, moduleTitle, content });
      if (r.success && r.audioUrl) {
        setAudioUrl(r.audioUrl);
        const audio = new Audio(r.audioUrl);
        audioRef.current = audio;
        audio.ontimeupdate = () => setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
        audio.onended = () => setPlaying(false);
      }
    } catch { toast.error("Podcast generation failed."); }
    finally { setLoading(false); }
  };

  const togglePlay = () => {
    const a = audioRef.current; if (!a) return;
    if (playing) { a.pause(); setPlaying(false); } else { a.play(); setPlaying(true); }
  };

  const submitCallIn = async () => {
    if (!callInText.trim()) return;
    setCallInLoading(true);
    try {
      const r = await callInMut.mutateAsync({ cookieId, question: callInText, moduleTitle });
      setCallInResponse(r.responseText);
      const extra = new Audio(r.audioUrl);
      extra.play();
      extra.onended = () => {};
    } catch { toast.error("Call-in failed."); }
    finally { setCallInLoading(false); }
  };

  return (
    <div className="mt-4 p-4 rounded-2xl bg-[var(--nexus-gold-fill)] border border-[var(--nexus-gold-border)]">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-[var(--nexus-gold-fill)] border border-[var(--nexus-gold-border)] flex items-center justify-center">
          <Volume2 size={13} className="text-[var(--nexus-gold)]" />
        </div>
        <div>
          <div className="text-xs font-semibold text-[var(--nexus-gold)]">Module Podcast</div>
          <div className="text-[10px] text-muted-foreground">AI hosts discuss every lesson — ElevenLabs voices</div>
        </div>
      </div>
      {!audioUrl ? (
        <button onClick={generate} disabled={loading}
          className="w-full py-2 rounded-xl text-sm font-medium bg-[oklch(0.75_0.18_55_/_0.15)] border border-[var(--nexus-gold-border)] text-[var(--nexus-gold)] hover:bg-[oklch(0.75_0.18_55_/_0.25)] disabled:opacity-50 transition-all flex items-center justify-center gap-2">
          {loading ? <><Loader2 size={13} className="animate-spin" />Generating podcast… (~30s)</> : <><Play size={13} />Listen to Full Module</>}
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <button onClick={togglePlay} className="w-8 h-8 rounded-full bg-[var(--nexus-gold)] flex items-center justify-center shrink-0">
              {playing ? <Pause size={14} className="text-black" /> : <Play size={14} className="text-black ml-0.5" />}
            </button>
            <div className="flex-1 h-1.5 rounded-full bg-[oklch(0.75_0.18_55_/_0.15)] overflow-hidden cursor-pointer"
              onClick={e => { const a = audioRef.current; if (!a) return; const r = e.currentTarget.getBoundingClientRect(); a.currentTime = ((e.clientX - r.left) / r.width) * a.duration; }}>
              <div className="h-full bg-[var(--nexus-gold)] rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="border-t border-[var(--nexus-gold-border)] pt-3">
            <div className="text-[10px] text-muted-foreground mb-2 font-medium uppercase tracking-wider">📞 Call In — Ask a question</div>
            <div className="flex gap-2">
              <input value={callInText} onChange={e => setCallInText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submitCallIn()}
                placeholder="Ask the hosts anything about this module…"
                className="flex-1 bg-[var(--surface-1)] border border-border/60 rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[var(--nexus-gold)]" />
              <button onClick={submitCallIn} disabled={callInLoading || !callInText.trim()}
                className="px-3 py-1.5 rounded-lg bg-[var(--nexus-gold)] text-black text-xs font-semibold disabled:opacity-50 flex items-center gap-1">
                {callInLoading ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
              </button>
            </div>
            {callInResponse && (
              <div className="mt-2 p-2.5 rounded-lg bg-[var(--surface-1)] border border-border/60 text-xs text-muted-foreground leading-relaxed">
                <span className="font-semibold text-[var(--nexus-gold)]">Morgan: </span>{callInResponse}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MODULE 1: "The AI Toolkit" — Understanding the tools you have access to
// Lessons 1-5
// ─────────────────────────────────────────────────────────────────────────────

const M1_META = [
  { id: 1, title: "The AI Landscape", subtitle: "A map of every major AI tool and what each is actually for", color: "oklch(0.72_0.2_290)", xp: 60, duration: "20 min" },
  { id: 2, title: "Free vs Paid", subtitle: "What you get for free, what's behind the paywall, and whether it's worth it", color: "oklch(0.75_0.18_55)", xp: 65, duration: "20 min" },
  { id: 3, title: "Context & Tokens", subtitle: "The hidden engine of every AI conversation — and why it matters", color: "oklch(0.68_0.22_10)", xp: 70, duration: "25 min" },
  { id: 4, title: "Settings & Parameters", subtitle: "Temperature, model choice, and the dials that change everything", color: "oklch(0.68_0.20_140)", xp: 75, duration: "25 min" },
  { id: 5, title: "Connecting & Uploading", subtitle: "Files, images, web search, and how to give AI real-world access", color: "oklch(0.72_0.18_150)", xp: 80, duration: "25 min" },
];

const M1_QUIZ_L1: AIMasteryQuiz[] = [
  { id: "m1l1q1", question: "What does an LLM (Large Language Model) actually do at its core?", options: ["Searches the internet for information", "Predicts the most likely next word/token based on patterns in training data", "Understands and reasons like a human", "Retrieves pre-written answers from a database"], correct: 1, explanation: "LLMs are trained to predict the next token (word fragment) given everything that came before it. They don't 'look things up' — they generate text by following statistical patterns learned from billions of documents. This is why they can be fluent but wrong." },
  { id: "m1l1q2", question: "Which AI tool is BEST suited for generating a realistic photo-quality image from a text description?", options: ["ChatGPT (text-only)", "DALL-E / Midjourney / Stable Diffusion", "GitHub Copilot", "Perplexity AI"], correct: 1, explanation: "Image generation models (DALL-E, Midjourney, Stable Diffusion) are trained specifically on image-text pairs. ChatGPT by itself only handles text — though some versions integrate DALL-E. Always match the tool to the modality." },
  { id: "m1l1q3", question: "What separates a 'foundation model' from a specialized AI tool?", options: ["Foundation models are always larger", "Foundation models are general-purpose and can be fine-tuned or prompted for many tasks", "Specialized tools use more data", "There is no meaningful difference"], correct: 1, explanation: "Foundation models (GPT-4, Claude, Gemini) are trained broadly and can handle many tasks through prompting. Specialized tools (Harvey for law, Consensus for research) are often built ON foundation models but fine-tuned or constrained for specific domains." },
  { id: "m1l1q4", question: "What is 'hallucination' in AI?", options: ["The AI becomes confused by your input", "The AI generates confident-sounding but factually incorrect information", "The AI refuses to answer", "A visual glitch in AI-generated images"], correct: 1, explanation: "Hallucination happens because LLMs optimize for plausibility, not accuracy. They generate text that 'sounds right' based on patterns — which can produce convincing fabrications including fake citations, statistics, and events. Verification is essential for any factual claim." },
];

const M1_QUIZ_L2: AIMasteryQuiz[] = [
  { id: "m1l2q1", question: "What is the primary limitation of free AI tiers compared to paid?", options: ["Free models are always less accurate", "Free tiers typically have slower speeds, lower rate limits, and access to older/smaller models", "Free tiers don't allow image generation", "There is no meaningful difference"], correct: 1, explanation: "Paid tiers give you access to the latest, largest models; higher rate limits (more messages per hour); faster response times; and often additional features like longer context windows, image generation, and API access. The underlying technology difference varies by provider." },
  { id: "m1l2q2", question: "What does 'API access' mean in practical terms for an AI user?", options: ["A way to access AI through a browser", "Programmatic access that lets you integrate AI into your own apps, scripts, or workflows", "A faster version of the chat interface", "Access to the AI's training data"], correct: 1, explanation: "An API (Application Programming Interface) lets you call AI from code, automation tools, or third-party apps — rather than only through the official chat UI. This enables workflows like automated report generation, custom chatbots, or integrating AI into spreadsheets." },
  { id: "m1l2q3", question: "Claude Pro, ChatGPT Plus, and Gemini Advanced all cost ~$20/month. When is this worth it?", options: ["Never — free tiers are sufficient for all tasks", "When you use AI daily for professional work requiring the best models, highest limits, and advanced features", "Only for developers building apps", "Only when you need image generation"], correct: 1, explanation: "The paid tier pays off when you hit free tier limits regularly, need the best model quality for professional output, require advanced features (code interpreter, file analysis, web search), or build workflows that depend on consistent high-volume access." },
];

const M1_QUIZ_L3: AIMasteryQuiz[] = [
  { id: "m1l3q1", question: "What is a 'token' in the context of LLMs?", options: ["A security credential", "A unit of text roughly equal to ¾ of a word that models process", "A single word", "A paragraph of text"], correct: 1, explanation: "Tokens are chunks of text — roughly ¾ of a word on average, though common words can be 1 token and rare words might be 2-3. LLMs process, generate, and are billed by token count. 'The quick brown fox' ≈ 4-5 tokens." },
  { id: "m1l3q2", question: "What happens when a conversation exceeds the AI's context window?", options: ["The AI crashes", "The AI forgets earlier parts of the conversation — it can only 'see' what fits in the window", "The AI automatically summarizes the whole conversation", "The AI asks you to start over"], correct: 1, explanation: "Context windows are the AI's 'working memory.' Once your conversation exceeds the limit, the earliest messages fall off. This is why AI sometimes 'forgets' what you said at the start of a long conversation — it literally can't see that far back." },
  { id: "m1l3q3", question: "Which strategy best manages context for a long working session?", options: ["Start a new conversation every few messages", "Periodically ask the AI to summarize the key points so far, then start fresh", "Use the longest context model available regardless of cost", "Avoid long tasks entirely"], correct: 1, explanation: "The best practice for long sessions: when you feel the conversation getting long, ask the AI to 'summarize the key decisions, goals, and context so far in a compact paragraph.' Then paste that summary into a fresh conversation as your opening context. This resets the window without losing important state." },
];

const M1_QUIZ_L4: AIMasteryQuiz[] = [
  { id: "m1l4q1", question: "What does AI 'temperature' control?", options: ["How fast the AI responds", "The randomness/creativity of outputs — low = predictable, high = creative", "The length of responses", "The model's intelligence level"], correct: 1, explanation: "Temperature is a parameter (0–2, typically) controlling output randomness. Low temperature (0–0.3) produces consistent, predictable answers — good for factual tasks. High temperature (0.7–1.2) produces more varied, creative responses — better for brainstorming or creative writing. Most chat UIs hide this but it's fundamental." },
  { id: "m1l4q2", question: "What's the practical difference between GPT-4o and GPT-4o mini?", options: ["Mini is for mobile devices only", "Mini is faster and cheaper with slightly lower capability — good for simpler tasks", "Mini cannot understand images", "There is no practical difference"], correct: 1, explanation: "Model variants (mini, turbo, etc.) represent speed/cost/capability tradeoffs. Mini/smaller models handle simple tasks fast and cheaply. Frontier models (4o, Claude Sonnet, Gemini Pro) deliver better reasoning for complex tasks but cost more and are slower. Choose based on task complexity, not habit." },
  { id: "m1l4q3", question: "What does 'System Prompt' mean?", options: ["The first message you send", "A hidden instruction that shapes the AI's behavior before the user conversation begins", "The AI's default personality", "An error message"], correct: 1, explanation: "System prompts are pre-conversation instructions that establish the AI's persona, rules, constraints, and context. 'You are a professional copywriter who writes in a direct, Hemingway-style tone. Never use bullet points.' These instructions persist for the whole conversation and are the most powerful configuration tool available." },
];

const M1_QUIZ_L5: AIMasteryQuiz[] = [
  { id: "m1l5q1", question: "When you upload a PDF to an AI, what actually happens?", options: ["The AI downloads and permanently stores the file", "The AI reads the extracted text content and includes it in your conversation context", "The AI searches the internet for related information", "The AI converts it to a different format"], correct: 1, explanation: "File upload extracts the text (or uses vision for images/PDFs) and feeds it into the context window. The AI doesn't permanently store your file — it reads it as part of the current conversation. This is why very large documents can hit context limits, and why sensitive files require careful consideration." },
  { id: "m1l5q2", question: "What is RAG (Retrieval-Augmented Generation)?", options: ["A type of image generation technique", "A method where AI retrieves relevant documents first, then generates answers grounded in that retrieved content", "The process of training AI on new data", "A way to make AI responses longer"], correct: 1, explanation: "RAG combines a retrieval system (searching a document database) with a generative model. Instead of relying purely on training data, the AI first fetches relevant chunks from your documents, then generates an answer grounded in that content. This dramatically reduces hallucination for domain-specific questions." },
  { id: "m1l5q3", question: "What is the main security risk when uploading sensitive files to public AI tools?", options: ["The AI might modify your file", "Your data may be used for training, stored on servers, or accessible to the company", "The file might corrupt the AI", "There are no real security risks"], correct: 1, explanation: "Most consumer AI tools store your conversations and uploads — and policies vary on training data use. For sensitive business, legal, or personal documents, check the privacy policy, consider using API with data retention disabled, or use enterprise tiers with data protection guarantees." },
];

// ─── M1 Lesson data structures ────────────────────────────────────────────────

const AI_TOOL_CATEGORIES = [
  {
    category: "Conversational AI",
    color: "oklch(0.72_0.2_290)",
    tools: [
      { name: "ChatGPT", maker: "OpenAI", strength: "Generalist — writing, code, analysis, image gen (with DALL-E)", bestFor: "Everyday tasks, writing, code help" },
      { name: "Claude", maker: "Anthropic", strength: "Long context, nuanced reasoning, following complex instructions, safer outputs", bestFor: "Long documents, sensitive topics, precise task execution" },
      { name: "Gemini", maker: "Google", strength: "Deep Google integration, real-time web, multimodal (text/image/video/audio)", bestFor: "Research with web access, Google Workspace tasks" },
      { name: "Perplexity", maker: "Perplexity AI", strength: "Real-time web search with citations — designed for research", bestFor: "Factual research, current events, cited answers" },
    ],
  },
  {
    category: "Image Generation",
    color: "oklch(0.68_0.22_10)",
    tools: [
      { name: "DALL-E 3", maker: "OpenAI", strength: "Integrated into ChatGPT; strong at following text descriptions precisely", bestFor: "Quick image gen from text, especially with ChatGPT Plus" },
      { name: "Midjourney", maker: "Midjourney", strength: "Highest aesthetic quality; preferred by professional designers", bestFor: "High-quality artistic images, marketing assets" },
      { name: "Stable Diffusion", maker: "Stability AI", strength: "Open-source; run locally; maximum control via settings", bestFor: "Privacy, fine-tuned control, free with own hardware" },
      { name: "Adobe Firefly", maker: "Adobe", strength: "Commercially safe training data; integrates with Creative Cloud", bestFor: "Commercial use, Photoshop/Illustrator workflows" },
    ],
  },
  {
    category: "Code & Dev AI",
    color: "oklch(0.72_0.18_150)",
    tools: [
      { name: "GitHub Copilot", maker: "GitHub/OpenAI", strength: "In-editor autocomplete; understands your codebase", bestFor: "Day-to-day coding, autocomplete, inline suggestions" },
      { name: "Cursor", maker: "Cursor AI", strength: "Full AI-native IDE; chat with your entire codebase", bestFor: "Complex refactoring, codebase-wide changes" },
      { name: "Replit AI", maker: "Replit", strength: "Build and run code in browser; great for beginners", bestFor: "Learning to code, quick prototypes" },
    ],
  },
  {
    category: "Specialized AI",
    color: "oklch(0.75_0.18_55)",
    tools: [
      { name: "Otter.ai", maker: "Otter", strength: "Real-time meeting transcription and summaries", bestFor: "Meeting notes, interviews, lectures" },
      { name: "ElevenLabs", maker: "ElevenLabs", strength: "Ultra-realistic voice cloning and text-to-speech", bestFor: "Voiceovers, podcasts, accessibility" },
      { name: "Runway ML", maker: "Runway", strength: "Professional AI video generation and editing", bestFor: "Video production, creative video work" },
      { name: "Consensus", maker: "Consensus", strength: "AI that searches and synthesizes academic papers with citations", bestFor: "Research, fact-checking, academic work" },
    ],
  },
];

const FREE_VS_PAID = [
  {
    provider: "ChatGPT",
    free: { model: "GPT-4o mini", limits: "Limited GPT-4o msgs/day", features: "Basic chat, limited image gen" },
    paid: { price: "$20/mo", model: "GPT-4o + o1", limits: "5× more messages, priority access", features: "DALL-E 3, code interpreter, file uploads, web search, custom GPTs" },
    verdict: "Worth it if you use it daily for professional work",
  },
  {
    provider: "Claude",
    free: { model: "Claude 3.5 Haiku", limits: "~50 msgs/day", features: "Basic chat, limited file upload" },
    paid: { price: "$20/mo", model: "Claude Sonnet/Opus", limits: "5× limits, priority", features: "Projects, 200K token context, artifacts, advanced analysis" },
    verdict: "Best value for long documents and complex reasoning tasks",
  },
  {
    provider: "Gemini",
    free: { model: "Gemini 1.5 Flash", limits: "Standard limits", features: "Basic chat, Google search" },
    paid: { price: "$20/mo (Google One AI Premium)", model: "Gemini 1.5 Pro / 2.0", limits: "Higher limits, faster", features: "Workspace integration, extended context, advanced reasoning, NotebookLM+" },
    verdict: "Worth it if you live in Google Workspace",
  },
  {
    provider: "Perplexity",
    free: { model: "Standard search", limits: "5 Pro searches/day", features: "Web-grounded answers with citations" },
    paid: { price: "$20/mo", model: "Pro search (GPT-4/Claude backend)", limits: "Unlimited Pro searches", features: "File uploads, image gen, longer answers, API access, multiple AI models" },
    verdict: "Best subscription for research-heavy users",
  },
];

const TOKEN_EXAMPLES = [
  { text: "Hello", tokens: 1 },
  { text: "The quick brown fox", tokens: 4 },
  { text: "Artificial intelligence is transforming every industry.", tokens: 8 },
  { text: "Please write a comprehensive 500-word marketing plan for a new coffee shop in Seattle targeting young professionals aged 25–35.", tokens: 27 },
  { text: "pneumonoultramicroscopicsilicovolcanoconiosis", tokens: 14 },
];

const CONTEXT_WINDOW_SIZES = [
  { model: "GPT-3.5 (2023)", tokens: 4096, pages: "~3 pages", color: "oklch(0.68_0.22_10)" },
  { model: "GPT-4 (2023)", tokens: 8192, pages: "~6 pages", color: "oklch(0.72_0.18_40)" },
  { model: "Claude 3 Sonnet", tokens: 200000, pages: "~150 pages", color: "oklch(0.72_0.2_290)" },
  { model: "Gemini 1.5 Pro", tokens: 1000000, pages: "~750 pages", color: "oklch(0.72_0.18_150)" },
  { model: "Claude 3.5 (latest)", tokens: 200000, pages: "~150 pages", color: "oklch(0.68_0.20_140)" },
];

// ─── Module 1 Component ───────────────────────────────────────────────────────
const M1_PODCAST_CONTENT = `Module: The AI Toolkit. Lesson 1: Every major category of AI tool exists for a different reason. Understanding the map first means you'll never wonder 'which AI should I use for this?' again. Lesson 2: The gap between free and paid AI has never been smaller — but for professional work, the difference still matters. Lesson 3: Tokens are AI's unit of currency — they determine what the AI can read, what it costs, and how much of your conversation it can remember. Lesson 4: Temperature, model selection, and system prompts are the three levers that most users never touch — and it's costing them half the power of AI. Lesson 5: Uploading a file, granting web access, or connecting a tool transforms AI from a conversation into a workflow. This is where AI becomes genuinely powerful for real work.`;

function AILiteracyModule1({ onBack }: { onBack: () => void }) {
  const { addXP, cookieId } = usePersonalization();
  const [activeLesson, setActiveLesson] = useState<number | null>(null);
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  // L1 state
  const [l1Category, setL1Category] = useState(0);
  const [l1ToolIdx, setL1ToolIdx] = useState(0);
  const [l1Revealed, setL1Revealed] = useState<Set<string>>(new Set());

  // L2 state — Free vs Paid comparison
  const [l2Row, setL2Row] = useState(0);
  const [l2Tab, setL2Tab] = useState<"free" | "paid">("free");
  const [l2FeatReveal, setL2FeatReveal] = useState<Set<number>>(new Set());

  // L3 state — Token counter game
  const [tokenInput, setTokenInput] = useState("");
  const [tokenGuess, setTokenGuess] = useState("");
  const [tokenRevealed, setTokenRevealed] = useState(false);
  const [contextScroll, setContextScroll] = useState(0);

  // L4 state — Temperature slider + settings explorer
  const [temperature, setTemperature] = useState(0.7);
  const [tempResult, setTempResult] = useState("");
  const [tempLoading, setTempLoading] = useState(false);
  const [settingTab, setSettingTab] = useState<"temperature" | "model" | "system">("temperature");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [systemResult, setSystemResult] = useState("");
  const [systemLoading, setSystemLoading] = useState(false);

  // L5 state — File upload sim + RAG explainer
  const [uploadStep, setUploadStep] = useState(0);
  const [ragStep, setRagStep] = useState(0);

  const tempMut = trpc.ai.explainConcept.useMutation({
    onSuccess: d => { setTempResult(d.explanation); setTempLoading(false); },
    onError: () => { toast.error("AI unavailable"); setTempLoading(false); },
  });
  const sysMut = trpc.ai.explainConcept.useMutation({
    onSuccess: d => { setSystemResult(d.explanation); setSystemLoading(false); },
    onError: () => { toast.error("AI unavailable"); setSystemLoading(false); },
  });

  const completeLesson = (id: number) => {
    if (completed.has(id)) return;
    const meta = M1_META.find(m => m.id === id)!;
    setCompleted(prev => new Set(Array.from(prev).concat(id)));
    addXP(meta.xp);
    toast.success(`+${meta.xp} XP — Lesson ${id} complete!`);
  };

  // Estimated token count (rough: ~0.75 tokens per word)
  const estimateTokens = (text: string) => Math.ceil(text.trim().split(/\s+/).filter(Boolean).length * 1.33);

  function LessonFrame({ id, children }: { id: number; children: React.ReactNode }) {
    const meta = M1_META.find(m => m.id === id)!;
    const done = completed.has(id);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => setActiveLesson(null)}
            className="p-2 rounded-lg glass border border-white/8 hover:border-white/20 transition-colors">
            <ChevronLeft size={14} className="text-muted-foreground" />
          </button>
          <div className="flex-1">
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Module 1 · Lesson {id}</div>
            <h2 className="font-bold text-foreground text-lg leading-tight">{meta.title}</h2>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={10} />{meta.duration}</span>
            <span className="text-xs flex items-center gap-1 font-semibold" style={{ color: meta.color }}><Zap size={10} />+{meta.xp} XP</span>
          </div>
        </div>
        {children}
        <div className="pt-4 border-t border-white/8 flex items-center justify-between">
          {done
            ? <div className="flex items-center gap-2 text-sm text-[oklch(0.72_0.18_150)]"><Award size={14} />Lesson complete</div>
            : <motion.button onClick={() => completeLesson(id)} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-black"
                style={{ background: `linear-gradient(135deg, ${meta.color}, oklch(0.65_0.22_200))` }}>
                <CheckCircle2 size={14} />Mark Complete · +{meta.xp} XP
              </motion.button>
          }
          {id < 5 && (
            <button onClick={() => setActiveLesson(id + 1)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg glass border border-white/10 text-sm text-muted-foreground hover:text-foreground transition-colors">
              Next <ChevronRight size={13} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── LESSON 1: The AI Landscape ────────────────────────────────────────────
  const Lesson1 = () => (
    <LessonFrame id={1}>
      <AIVoice text="Every major category of AI tool exists for a different reason. Understanding the map first means you'll never wonder 'which AI should I use for this?' again." />

      <div className="glass rounded-2xl p-5 border border-white/8">
        <SectionBadge label="THE LANDSCAPE" color="oklch(0.72_0.2_290)" />
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Every major AI tool exists because of a different training objective and architecture. Conversational LLMs predict the next token across vast text corpora. Image diffusion models learn to reverse a noise-adding process conditioned on text. Code AI is fine-tuned on millions of repositories with execution feedback. Voice models learn audio-to-text alignments across hundreds of languages. Each architectural difference produces fundamentally different capabilities — and critical limitations. Choosing the wrong category isn't a prompt problem; it's a tool problem. Master the map first.
        </p>
        {/* Category tabs */}
        <div className="grid grid-cols-2 gap-1.5 mb-4">
          {AI_TOOL_CATEGORIES.map((cat, i) => (
            <button key={cat.category} onClick={() => { setL1Category(i); setL1ToolIdx(0); }}
              className="py-2 px-3 rounded-xl text-xs font-semibold text-left transition-all"
              style={{
                background: l1Category === i ? `oklch(from ${cat.color} l c h / 0.15)` : "oklch(1 0 0 / 0.04)",
                color: l1Category === i ? cat.color : "oklch(0.6 0 0)",
                border: `1px solid ${l1Category === i ? `oklch(from ${cat.color} l c h / 0.4)` : "oklch(1 0 0 / 0.08)"}`,
              }}>
              {cat.category}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={l1Category} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            {/* Tool selector within category */}
            <div className="flex gap-1.5 flex-wrap mb-3">
              {AI_TOOL_CATEGORIES[l1Category].tools.map((tool, i) => (
                <button key={tool.name} onClick={() => setL1ToolIdx(i)}
                  className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                  style={{
                    background: l1ToolIdx === i ? `oklch(from ${AI_TOOL_CATEGORIES[l1Category].color} l c h / 0.2)` : "oklch(1 0 0 / 0.04)",
                    color: l1ToolIdx === i ? AI_TOOL_CATEGORIES[l1Category].color : "oklch(0.5 0 0)",
                    border: `1px solid ${l1ToolIdx === i ? `oklch(from ${AI_TOOL_CATEGORIES[l1Category].color} l c h / 0.4)` : "oklch(1 0 0 / 0.08)"}`,
                  }}>
                  {tool.name}
                </button>
              ))}
            </div>

            {/* Tool detail card */}
            <motion.div key={`${l1Category}-${l1ToolIdx}`} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
              className="rounded-2xl p-4 border" style={{ background: `oklch(from ${AI_TOOL_CATEGORIES[l1Category].color} l c h / 0.07)`, borderColor: `oklch(from ${AI_TOOL_CATEGORIES[l1Category].color} l c h / 0.25)` }}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-bold text-foreground">{AI_TOOL_CATEGORIES[l1Category].tools[l1ToolIdx].name}</div>
                  <div className="text-xs text-muted-foreground">by {AI_TOOL_CATEGORIES[l1Category].tools[l1ToolIdx].maker}</div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: `oklch(from ${AI_TOOL_CATEGORIES[l1Category].color} l c h / 0.15)`, color: AI_TOOL_CATEGORIES[l1Category].color }}>
                  {AI_TOOL_CATEGORIES[l1Category].category}
                </span>
              </div>
              {[
                { label: "What it does well", value: AI_TOOL_CATEGORIES[l1Category].tools[l1ToolIdx].strength },
                { label: "Best for", value: AI_TOOL_CATEGORIES[l1Category].tools[l1ToolIdx].bestFor },
              ].map(({ label, value }) => (
                <div key={label} className="mt-2">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">{label}</div>
                  <p className="text-sm text-foreground leading-snug">{value}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </AnimatePresence>
        <AIExpander prompt={`Explain the differences between ${AI_TOOL_CATEGORIES[l1Category].tools.map(t => t.name).join(", ")} in the ${AI_TOOL_CATEGORIES[l1Category].category} category. When would you pick one over another? Give concrete use-case examples.`} color="oklch(0.72_0.2_290)" />
      </div>

      {/* Quick-pick challenge */}
      <div className="glass rounded-2xl p-5 border border-white/8">
        <SectionBadge label="QUICK-PICK CHALLENGE" color="oklch(0.75_0.18_55)" />
        <p className="text-sm font-medium text-foreground mb-4">For each task, tap the best tool category:</p>
        {[
          { task: "Transcribe a 90-minute interview recording", correct: "Specialized AI", options: ["Conversational AI", "Specialized AI", "Code AI", "Image Generation"] },
          { task: "Create a product photo mockup from a text description", correct: "Image Generation", options: ["Conversational AI", "Code AI", "Image Generation", "Specialized AI"] },
          { task: "Autocomplete code as you type in VS Code", correct: "Code & Dev AI", options: ["Conversational AI", "Image Generation", "Code & Dev AI", "Specialized AI"] },
          { task: "Research a topic with cited sources from real websites", correct: "Conversational AI", options: ["Code & Dev AI", "Conversational AI", "Specialized AI", "Image Generation"] },
        ].map((item, qi) => {
          const [picked, setPicked] = useState<string | null>(null);
          return (
            <div key={qi} className={`mb-4 ${qi > 0 ? "pt-4 border-t border-white/8" : ""}`}>
              <p className="text-sm text-muted-foreground mb-2">"{item.task}"</p>
              <div className="flex flex-wrap gap-1.5">
                {item.options.map(opt => {
                  const isCorrect = opt === item.correct;
                  const isPicked = opt === picked;
                  return (
                    <button key={opt} onClick={() => setPicked(opt)} disabled={picked !== null}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                      style={{
                        background: picked === null ? "oklch(1 0 0 / 0.05)" : isCorrect ? "oklch(0.72_0.18_150_/_0.2)" : isPicked ? "oklch(0.68_0.22_10_/_0.2)" : "oklch(1 0 0 / 0.05)",
                        color: picked === null ? "oklch(0.6 0 0)" : isCorrect ? "oklch(0.82_0.18_150)" : isPicked ? "oklch(0.78_0.22_10)" : "oklch(0.4 0 0)",
                        border: `1px solid ${picked === null ? "oklch(1 0 0 / 0.08)" : isCorrect ? "oklch(0.72_0.18_150_/_0.4)" : isPicked ? "oklch(0.68_0.22_10_/_0.4)" : "oklch(1 0 0 / 0.05)"}`,
                      }}>
                      {isCorrect && picked !== null && <CheckCircle2 size={10} className="inline mr-1" />}
                      {isPicked && !isCorrect && <XCircle size={10} className="inline mr-1" />}
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass rounded-2xl p-5 border border-white/8">
        <SectionBadge label="KNOWLEDGE CHECK" color="oklch(0.72_0.2_290)" />
        <MasteryQuiz questions={M1_QUIZ_L1} color="oklch(0.72_0.2_290)" />
      </div>
    </LessonFrame>
  );

  // ── LESSON 2: Free vs Paid ─────────────────────────────────────────────────
  const Lesson2 = () => (
    <LessonFrame id={2}>
      <AIVoice text="The gap between free and paid AI has never been smaller — but for professional work, the difference still matters. Here's exactly what you're getting and what you're not." />

      <div className="glass rounded-2xl p-5 border border-white/8">
        <SectionBadge label="FREE VS PAID BREAKDOWN" color="oklch(0.75_0.18_55)" />
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          The economics are straightforward: frontier models cost tens of millions of dollars to train, so providers gate them behind subscriptions. Free tiers run lighter, older, or rate-limited versions of the same models. What you're paying for is not "better AI in general" — it's access to a specific capability tier (larger context, stronger reasoning, tool use) that free models can't match. The decision isn't emotional; it's an ROI calculation. Select a provider below to compare exactly what changes at each tier.
        </p>
        {/* Provider selector */}
        <div className="flex gap-1.5 flex-wrap mb-4">
          {FREE_VS_PAID.map((p, i) => (
            <button key={p.provider} onClick={() => setL2Row(i)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                background: l2Row === i ? "oklch(0.75_0.18_55_/_0.2)" : "oklch(1 0 0 / 0.04)",
                color: l2Row === i ? "oklch(0.85_0.18_55)" : "oklch(0.5 0 0)",
                border: `1px solid ${l2Row === i ? "oklch(0.75_0.18_55_/_0.4)" : "oklch(1 0 0 / 0.08)"}`,
              }}>
              {p.provider}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={l2Row} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {(["free", "paid"] as const).map(tier => {
                const data = FREE_VS_PAID[l2Row][tier];
                return (
                  <button key={tier} onClick={() => setL2Tab(tier)}
                    className={`p-4 rounded-xl text-left transition-all border ${l2Tab === tier ? (tier === "free" ? "border-[oklch(0.72_0.18_150_/_0.4)] bg-[oklch(0.72_0.18_150_/_0.08)]" : "border-[oklch(0.75_0.18_55_/_0.4)] bg-[oklch(0.75_0.18_55_/_0.08)]") : "border-white/8 glass"}`}>
                    <div className={`text-xs font-bold uppercase tracking-widest mb-2 ${tier === "paid" ? "text-[oklch(0.85_0.18_55)]" : "text-[oklch(0.72_0.18_150)]"}`}>
                      {tier === "free" ? "Free Tier" : `Paid · ${(data as { price: string; model: string; limits: string; features: string }).price}`}
                    </div>
                    <div className="text-xs text-muted-foreground"><strong className="text-foreground">Model:</strong> {data.model}</div>
                    <div className="text-xs text-muted-foreground mt-1"><strong className="text-foreground">Limits:</strong> {data.limits}</div>
                  </button>
                );
              })}
            </div>
            <motion.div key={l2Tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="p-4 rounded-xl glass border border-white/8">
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Features included:</div>
              <p className="text-sm text-foreground leading-relaxed">{FREE_VS_PAID[l2Row][l2Tab].features}</p>
            </motion.div>
            <div className="mt-3 p-3 rounded-xl bg-[oklch(0.75_0.18_55_/_0.08)] border border-[oklch(0.75_0.18_55_/_0.2)]">
              <span className="text-xs font-semibold text-[oklch(0.85_0.18_55)]">VERDICT: </span>
              <span className="text-xs text-muted-foreground">{FREE_VS_PAID[l2Row].verdict}</span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Feature reveal cards */}
      <div className="glass rounded-2xl p-5 border border-white/8">
        <SectionBadge label="WHAT EACH FEATURE ACTUALLY DOES" color="oklch(0.68_0.22_10)" />
        <p className="text-sm text-muted-foreground mb-4">Tap each paid feature to understand what it's really for:</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { feature: "Code Interpreter", what: "Runs real Python code in a sandbox — analyzes data, creates charts, solves math, processes files. It's a full analysis environment." },
            { feature: "File Upload", what: "Feed AI your PDFs, spreadsheets, or docs. AI reads the content and can answer questions, summarize, or extract data from it." },
            { feature: "Web Search", what: "Lets AI retrieve real-time information instead of relying on training data. Reduces hallucination for current events and facts." },
            { feature: "Custom GPTs / Projects", what: "Pre-configured AI instances with custom system prompts, uploaded knowledge bases, and saved instructions for recurring tasks." },
            { feature: "Extended Context", what: "Bigger context window = AI can read longer documents or maintain longer conversations without forgetting early content." },
            { feature: "API Access", what: "Programmatic access so you (or tools you use) can call AI from code, Zapier, Make, spreadsheets, or custom apps." },
          ].map((item, i) => (
            <div key={item.feature}>
              <button onClick={() => setL2FeatReveal(prev => {
                const n = new Set(Array.from(prev));
                n.has(i) ? n.delete(i) : n.add(i);
                return n;
              })}
                className={`w-full text-left p-3 rounded-xl transition-all border ${l2FeatReveal.has(i) ? "border-[oklch(0.68_0.22_10_/_0.4)] bg-[oklch(0.68_0.22_10_/_0.08)]" : "glass border-white/8 hover:border-white/20"}`}>
                <div className="text-xs font-semibold text-foreground flex items-center justify-between">
                  {item.feature}
                  <ChevronDown size={11} className={`text-muted-foreground transition-transform ${l2FeatReveal.has(i) ? "rotate-180" : ""}`} />
                </div>
                <AnimatePresence>
                  {l2FeatReveal.has(i) && (
                    <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      className="text-xs text-muted-foreground mt-2 leading-relaxed overflow-hidden">
                      {item.what}
                    </motion.p>
                  )}
                </AnimatePresence>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Decision guide */}
      <div className="glass rounded-2xl p-5 border border-white/8">
        <SectionBadge label="SHOULD YOU PAY?" color="oklch(0.72_0.2_290)" />
        <p className="text-sm text-muted-foreground mb-3">Answer these questions honestly:</p>
        {[
          "Do you use AI at least once per day for work tasks?",
          "Do you regularly hit message limits on the free tier?",
          "Do you need to analyze documents, run data, or generate images?",
          "Would better AI output quality meaningfully improve your work?",
        ].map((q, i) => {
          const [ans, setAns] = useState<boolean | null>(null);
          return (
            <div key={i} className="flex items-start gap-3 mb-3 p-3 rounded-xl glass border border-white/8">
              <p className="text-sm text-muted-foreground flex-1">{q}</p>
              <div className="flex gap-1.5 shrink-0">
                {[true, false].map(val => (
                  <button key={String(val)} onClick={() => setAns(val)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: ans === val ? (val ? "oklch(0.72_0.18_150_/_0.2)" : "oklch(0.68_0.22_10_/_0.2)") : "oklch(1 0 0 / 0.04)",
                      color: ans === val ? (val ? "oklch(0.82_0.18_150)" : "oklch(0.78_0.22_10)") : "oklch(0.5 0 0)",
                      border: `1px solid ${ans === val ? (val ? "oklch(0.72_0.18_150_/_0.4)" : "oklch(0.68_0.22_10_/_0.4)") : "oklch(1 0 0 / 0.08)"}`,
                    }}>
                    {val ? "Yes" : "No"}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
        <div className="p-3 rounded-xl bg-[oklch(0.75_0.18_55_/_0.08)] border border-[oklch(0.75_0.18_55_/_0.2)] text-xs text-muted-foreground">
          <strong className="text-foreground">Rule of thumb:</strong> If you answered Yes to 2 or more, a paid tier will likely pay for itself in time saved within the first week.
        </div>
      </div>

      <div className="glass rounded-2xl p-5 border border-white/8">
        <SectionBadge label="KNOWLEDGE CHECK" color="oklch(0.75_0.18_55)" />
        <MasteryQuiz questions={M1_QUIZ_L2} color="oklch(0.75_0.18_55)" />
      </div>
    </LessonFrame>
  );

  // ── LESSON 3: Context & Tokens ─────────────────────────────────────────────
  const Lesson3 = () => (
    <LessonFrame id={3}>
      <AIVoice text="Tokens are AI's unit of currency — they determine what the AI can read, what it costs, and how much of your conversation it can remember. Understanding tokens makes you a dramatically better AI user." />

      {/* Token counter game */}
      <div className="glass rounded-2xl p-5 border border-white/8">
        <SectionBadge label="TOKEN COUNTER — GUESS THE TOKENS" color="oklch(0.68_0.22_10)" />
        <p className="text-sm text-muted-foreground mb-4">
          Tokens aren't words — they're chunks. A token ≈ ¾ of a word. Common words = 1 token. Rare words can = 2–4 tokens.
        </p>

        {/* Example tokens visual */}
        <div className="space-y-3 mb-5">
          {TOKEN_EXAMPLES.map(ex => (
            <div key={ex.text} className="flex items-center gap-3 p-3 rounded-xl glass border border-white/8">
              <p className="text-sm text-foreground font-mono flex-1">"{ex.text}"</p>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex gap-0.5">
                  {Array.from({ length: Math.min(ex.tokens, 14) }).map((_, i) => (
                    <div key={i} className="w-2.5 h-4 rounded-sm" style={{ background: `oklch(0.68_0.22_10_/_${0.4 + (i / ex.tokens) * 0.5})` }} />
                  ))}
                  {ex.tokens > 14 && <span className="text-[10px] text-muted-foreground ml-1">+{ex.tokens - 14}</span>}
                </div>
                <span className="text-xs font-bold" style={{ color: "oklch(0.78_0.22_10)" }}>{ex.tokens} tokens</span>
              </div>
            </div>
          ))}
        </div>

        {/* Live token estimator */}
        <div className="border-t border-white/8 pt-4">
          <p className="text-sm font-semibold text-foreground mb-2">Estimate the tokens in your own text:</p>
          <textarea value={tokenInput} onChange={e => { setTokenInput(e.target.value); setTokenRevealed(false); setTokenGuess(""); }}
            placeholder="Type or paste anything…" rows={3}
            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-foreground placeholder:text-white/20 resize-none focus:outline-none focus:border-white/25 font-mono mb-3" />
          {tokenInput.trim() && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <input value={tokenGuess} onChange={e => setTokenGuess(e.target.value)}
                  placeholder="Your guess…" type="number"
                  className="w-24 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-white/25" />
                <button onClick={() => setTokenRevealed(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[oklch(0.68_0.22_10_/_0.15)] text-[oklch(0.78_0.22_10)] border border-[oklch(0.68_0.22_10_/_0.35)] hover:bg-[oklch(0.68_0.22_10_/_0.25)] transition-all">
                  Reveal
                </button>
              </div>
              {tokenRevealed && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-[oklch(0.68_0.22_10_/_0.08)] border border-[oklch(0.68_0.22_10_/_0.25)]">
                  <p className="text-sm"><span className="text-foreground font-bold">~{estimateTokens(tokenInput)} tokens</span> estimated
                    {tokenGuess && ` · Your guess: ${tokenGuess} (${Math.abs(parseInt(tokenGuess) - estimateTokens(tokenInput))} off)`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">≈ ${(estimateTokens(tokenInput) * 0.000003).toFixed(5)} at GPT-4o pricing · {Math.round(tokenInput.length / 4)} words</p>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Context window visualizer */}
      <div className="glass rounded-2xl p-5 border border-white/8">
        <SectionBadge label="CONTEXT WINDOW COMPARISON" color="oklch(0.72_0.2_290)" />
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          The context window is the AI's working memory — every token it can attend to simultaneously when generating a response. Transformer attention is quadratic in complexity, which is why larger windows cost significantly more to run. Critically, not all positions in the context window receive equal attention: research consistently shows that models pay more attention to tokens at the <strong className="text-foreground">beginning and end</strong> of the context ("lost in the middle" effect). This means front-loading your key instructions and constraints isn't just good practice — it's required to ensure the model doesn't deprioritize them as context length grows.
        </p>
        <div className="space-y-3">
          {CONTEXT_WINDOW_SIZES.map(cw => (
            <div key={cw.model} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground font-medium">{cw.model}</span>
                <span className="text-muted-foreground">{cw.tokens.toLocaleString()} tokens · {cw.pages}</span>
              </div>
              <div className="h-4 rounded-full bg-white/5 overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((cw.tokens / 1000000) * 100, 100)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full" style={{ background: cw.color, minWidth: "4px" }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 rounded-xl bg-[oklch(0.72_0.2_290_/_0.08)] border border-[oklch(0.72_0.2_290_/_0.2)]">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Practical impact:</strong> A 200K token window can hold the entire text of three average novels. A 4K window holds about 3 pages. When the window fills up, the model starts forgetting your earlier conversation — it can't "scroll up."
          </p>
        </div>
        <AIExpander prompt="Explain context windows in AI in plain language. What happens when you exceed them? What are the practical strategies for managing context effectively in long AI conversations? What does 'token pricing' mean for API users?" color="oklch(0.72_0.2_290)" />
      </div>

      {/* Context management strategies */}
      <div className="glass rounded-2xl p-5 border border-white/8">
        <SectionBadge label="CONTEXT MANAGEMENT STRATEGIES" color="oklch(0.72_0.18_150)" />
        <div className="space-y-3">
          {[
            { strategy: "Start fresh for new topics", desc: "Don't drag unrelated conversation history into a new task. Open a new chat so the model starts with a clean, focused window.", icon: <RotateCcw size={14} /> },
            { strategy: "Compress with periodic summaries", desc: 'Midway through a long session: "Summarize everything we\'ve covered so far in 3 sentences." Paste that into a new chat as your context opener.', icon: <MessageSquare size={14} /> },
            { strategy: "Front-load the important stuff", desc: "Whatever matters most — your goal, constraints, persona — put it at the START of the conversation, not buried later. Early tokens get more attention.", icon: <Target size={14} /> },
            { strategy: "Use system prompts for persistent context", desc: "In tools that support it, system prompts are always visible regardless of conversation length. Put your standing instructions there.", icon: <Shield size={14} /> },
          ].map(({ strategy, desc, icon }) => (
            <div key={strategy} className="flex items-start gap-3 p-3 rounded-xl glass border border-white/8">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[oklch(0.72_0.18_150_/_0.15)] border border-[oklch(0.72_0.18_150_/_0.3)] text-[oklch(0.82_0.18_150)]">
                {icon}
              </div>
              <div>
                <div className="font-semibold text-sm text-foreground mb-0.5">{strategy}</div>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-5 border border-white/8">
        <SectionBadge label="KNOWLEDGE CHECK" color="oklch(0.68_0.22_10)" />
        <MasteryQuiz questions={M1_QUIZ_L3} color="oklch(0.68_0.22_10)" />
      </div>
    </LessonFrame>
  );

  // ── LESSON 4: Settings & Parameters ───────────────────────────────────────
  const Lesson4 = () => (
    <LessonFrame id={4}>
      <AIVoice text="Temperature, model selection, and system prompts are the three levers that most users never touch — and it's costing them half the power of AI. Let's fix that." />

      <p className="text-sm text-muted-foreground leading-relaxed">
        Three parameters account for the majority of output quality variance between amateur and expert AI use — and most users leave all three at defaults. Temperature is not a "creativity dial" in any poetic sense: it is a divisor applied to the probability logits before softmax sampling, which literally flattens or sharpens the distribution over possible next tokens. Model selection is an architectural question, not a brand preference. And system prompts are the closest analog AI has to institutional training — they persist across the entire conversation and shape behavior in ways no user message can override. Use the tabs below to understand each one at the level of mechanism, not just surface.
      </p>

      <div className="glass rounded-2xl p-5 border border-white/8">
        <div className="flex gap-1.5 mb-4">
          {(["temperature", "model", "system"] as const).map(tab => (
            <button key={tab} onClick={() => setSettingTab(tab)}
              className="flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all"
              style={{
                background: settingTab === tab ? "oklch(0.68_0.20_140_/_0.2)" : "oklch(1 0 0 / 0.04)",
                color: settingTab === tab ? "oklch(0.80_0.20_140)" : "oklch(0.5 0 0)",
                border: `1px solid ${settingTab === tab ? "oklch(0.68_0.20_140_/_0.4)" : "oklch(1 0 0 / 0.08)"}`,
              }}>
              {tab === "temperature" ? "Temperature" : tab === "model" ? "Model Choice" : "System Prompt"}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {settingTab === "temperature" && (
            <motion.div key="temp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <SectionBadge label="TEMPERATURE SLIDER" color="oklch(0.68_0.20_140)" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Temperature is applied as a scalar divisor to the raw logits (unnormalized log-probabilities) before softmax is computed. At temperature 0, the highest-probability token is always selected (greedy decoding — fully deterministic). As temperature rises, the distribution flattens: lower-probability tokens become relatively more likely, producing more varied and surprising outputs. At very high temperatures the output becomes incoherent because near-impossible tokens are sampled regularly. <strong className="text-foreground">Low (0–0.3)</strong>: near-deterministic, ideal for factual QA and code. <strong className="text-foreground">Mid (0.6–0.9)</strong>: balanced creativity and reliability. <strong className="text-foreground">High (1.0–1.5)</strong>: exploratory, unpredictable — best for brainstorming and creative writing where you'll curate the output.
              </p>

              {/* Visual slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[oklch(0.72_0.18_150)]">0 — Deterministic</span>
                  <span className="text-[oklch(0.85_0.18_55)] font-bold text-base">{temperature.toFixed(1)}</span>
                  <span className="text-[oklch(0.68_0.22_10)]">2.0 — Chaotic</span>
                </div>
                <input type="range" min={0} max={2} step={0.1} value={temperature}
                  onChange={e => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-[oklch(0.75_0.18_55)]" />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Factual QA · Code · Data extraction</span>
                  <span>Brainstorming · Creative writing · Poetry</span>
                </div>
              </div>

              {/* Temperature presets */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Precise", val: 0.1, use: "Math, facts, code", color: "oklch(0.72_0.18_150)" },
                  { label: "Balanced", val: 0.7, use: "General use", color: "oklch(0.75_0.18_55)" },
                  { label: "Creative", val: 1.2, use: "Stories, ideas", color: "oklch(0.68_0.22_10)" },
                ].map(p => (
                  <button key={p.label} onClick={() => setTemperature(p.val)}
                    className="p-3 rounded-xl text-left transition-all border"
                    style={{
                      background: Math.abs(temperature - p.val) < 0.15 ? `oklch(from ${p.color} l c h / 0.15)` : "oklch(1 0 0 / 0.04)",
                      borderColor: Math.abs(temperature - p.val) < 0.15 ? `oklch(from ${p.color} l c h / 0.4)` : "oklch(1 0 0 / 0.08)",
                    }}>
                    <div className="text-xs font-bold text-foreground">{p.label}</div>
                    <div className="text-[10px] text-muted-foreground">{p.val} · {p.use}</div>
                  </button>
                ))}
              </div>

              {/* Live temperature comparison */}
              <div className="border-t border-white/8 pt-4">
                <p className="text-sm font-semibold text-foreground mb-2">See temperature in action:</p>
                <p className="text-xs text-muted-foreground mb-3">The prompt below will run at your selected temperature ({temperature.toFixed(1)}). Try it at 0.1, then again at 1.5 and compare.</p>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 font-mono text-sm text-muted-foreground mb-3">
                  "Give me 3 creative names for a productivity app. Be inventive."
                </div>
                <button disabled={tempLoading} onClick={() => {
                  setTempLoading(true); setTempResult("");
                  const prefix = temperature < 0.3 ? "Be very consistent and predictable. Give exactly 3 safe, professional names." :
                    temperature > 1 ? "Be wildly creative, unexpected, poetic. Surprise me. No clichés." :
                    "Balance creativity and practicality.";
                  tempMut.mutate({ concept: `${prefix} Give me 3 creative names for a productivity app. Be inventive. [Temperature simulation: ${temperature.toFixed(1)}]`, level: "student" });
                }}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 bg-[oklch(0.68_0.20_140_/_0.15)] text-[oklch(0.80_0.20_140)] border border-[oklch(0.68_0.20_140_/_0.35)] hover:bg-[oklch(0.68_0.20_140_/_0.25)]">
                  {tempLoading ? <><Loader2 size={13} className="animate-spin" />Running at temp {temperature.toFixed(1)}…</> : <><Zap size={13} />Run at Temperature {temperature.toFixed(1)}</>}
                </button>
                {tempResult && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-3 p-4 rounded-xl glass border border-white/8">
                    <div className="text-[10px] font-bold text-muted-foreground mb-2">AI RESPONSE @ temp {temperature.toFixed(1)}</div>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{tempResult}</p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {settingTab === "model" && (
            <motion.div key="model" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <SectionBadge label="MODEL SELECTION GUIDE" color="oklch(0.72_0.2_290)" />
              <p className="text-sm text-muted-foreground leading-relaxed">Bigger model ≠ always better. Match the model to the task for speed and cost efficiency.</p>
              <div className="space-y-2">
                {[
                  { tier: "Frontier / Largest", examples: "GPT-4o, Claude Sonnet 3.5, Gemini 1.5 Pro", use: "Complex reasoning, nuanced writing, multi-step analysis, code debugging", speed: "Slower", cost: "High", color: "oklch(0.72_0.2_290)" },
                  { tier: "Mid-tier", examples: "GPT-4o mini, Claude Haiku, Gemini Flash", use: "Summarization, Q&A, drafting, most everyday tasks", speed: "Fast", cost: "Low", color: "oklch(0.75_0.18_55)" },
                  { tier: "Reasoning Specialists", examples: "o1, o3, Claude 3.7 Sonnet thinking", use: "Math proofs, logic puzzles, code architecture, scientific reasoning", speed: "Very slow", cost: "Very high", color: "oklch(0.68_0.22_10)" },
                ].map(m => (
                  <div key={m.tier} className="p-4 rounded-xl border transition-all glass border-white/8">
                    <div className="flex items-start justify-between mb-1">
                      <div className="font-semibold text-sm text-foreground">{m.tier}</div>
                      <div className="flex gap-1.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: `oklch(from ${m.color} l c h / 0.15)`, color: m.color }}>{m.speed}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: `oklch(from ${m.color} l c h / 0.15)`, color: m.color }}>{m.cost} cost</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{m.examples}</p>
                    <p className="text-xs text-foreground">{m.use}</p>
                  </div>
                ))}
              </div>
              <div className="p-3 rounded-xl bg-[oklch(0.72_0.2_290_/_0.08)] border border-[oklch(0.72_0.2_290_/_0.2)]">
                <p className="text-xs text-muted-foreground"><strong className="text-foreground">Decision rule:</strong> Use the smallest model that can reliably do the task. Save frontier models for tasks where quality gap is clear. For rapid iteration, draft with a fast model, then polish with a frontier model.</p>
              </div>
            </motion.div>
          )}

          {settingTab === "system" && (
            <motion.div key="system" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <SectionBadge label="SYSTEM PROMPT LAB" color="oklch(0.75_0.18_55)" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                A system prompt is a hidden instruction that shapes everything the AI says before your first message. It's the most powerful configuration tool available.
              </p>
              <div className="space-y-2 mb-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">STARTER TEMPLATES — click to load:</p>
                {[
                  { label: "Expert Copywriter", prompt: "You are a senior copywriter who writes in a direct, punchy style — no fluff, no jargon, no passive voice. Every sentence must earn its place. When asked to write anything, you produce 2 versions: one safe, one bolder." },
                  { label: "Tough-Love Editor", prompt: "You are a ruthless editor. When I share writing, you first identify the single most damaging flaw — the thing that most undermines the piece — before anything else. Be blunt. Then offer specific rewrites, not vague suggestions." },
                  { label: "Rubber Duck Debugger", prompt: "You are a patient programming tutor. When I share code or an error, first make me explain what I think is happening before you correct me. Ask exactly one clarifying question at a time. Never give the answer before I've tried once." },
                ].map(t => (
                  <button key={t.label} onClick={() => setSystemPrompt(t.prompt)}
                    className="w-full text-left p-3 rounded-xl glass border border-white/8 hover:border-white/20 transition-all">
                    <div className="text-xs font-semibold text-foreground">{t.label}</div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{t.prompt}</p>
                  </button>
                ))}
              </div>
              <textarea value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)}
                placeholder="Write your own system prompt…" rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-foreground placeholder:text-white/20 resize-none focus:outline-none focus:border-white/25 font-mono" />
              <p className="text-xs text-muted-foreground">Now test it — send a simple message and see how the system prompt changes the response:</p>
              <PromptSandbox
                placeholder={`Type a message to test your system prompt:\n"${systemPrompt.slice(0, 60)}${systemPrompt.length > 60 ? "…" : ""}"`}
                systemHint={systemPrompt || "You are a helpful assistant."}
                color="oklch(0.75_0.18_55)"
                label="Test System Prompt" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="glass rounded-2xl p-5 border border-white/8">
        <SectionBadge label="KNOWLEDGE CHECK" color="oklch(0.68_0.20_140)" />
        <MasteryQuiz questions={M1_QUIZ_L4} color="oklch(0.68_0.20_140)" />
      </div>
    </LessonFrame>
  );

  // ── LESSON 5: Connecting & Uploading ──────────────────────────────────────
  const Lesson5 = () => (
    <LessonFrame id={5}>
      <AIVoice text="Uploading a file, granting web access, or connecting a tool transforms AI from a conversation into a workflow. This is where AI becomes genuinely powerful for real work." />

      {/* Upload walkthrough */}
      <div className="glass rounded-2xl p-5 border border-white/8">
        <SectionBadge label="WHAT HAPPENS WHEN YOU UPLOAD A FILE" color="oklch(0.72_0.18_150)" />
        <p className="text-sm text-muted-foreground mb-4">Step through what actually happens behind the scenes:</p>

        <div className="flex gap-1.5 mb-4 flex-wrap">
          {["You upload", "Text extracted", "Chunked", "Into context", "AI reads"].map((step, i) => (
            <button key={step} onClick={() => setUploadStep(i)}
              className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all min-w-[60px]"
              style={{
                background: uploadStep === i ? "oklch(0.72_0.18_150_/_0.2)" : uploadStep > i ? "oklch(0.72_0.18_150_/_0.08)" : "oklch(1 0 0 / 0.04)",
                color: uploadStep === i ? "oklch(0.82_0.18_150)" : uploadStep > i ? "oklch(0.62_0.18_150)" : "oklch(0.5 0 0)",
                border: `1px solid ${uploadStep === i ? "oklch(0.72_0.18_150_/_0.4)" : uploadStep > i ? "oklch(0.72_0.18_150_/_0.2)" : "oklch(1 0 0 / 0.08)"}`,
              }}>
              {i + 1}. {step}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={uploadStep} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="p-4 rounded-2xl glass border border-white/8">
            {[
              { title: "You select a file", body: "You choose a PDF, DOCX, spreadsheet, image, or other supported file type. The file is uploaded to the AI provider's server — it is NOT stored permanently in most cases, but check privacy policies for sensitive documents.", note: "Supported: PDF, DOCX, TXT, CSV, XLSX, PNG, JPG, MP4 (varies by tool)" },
              { title: "Text is extracted", body: "For documents: a parser extracts the raw text (or OCR extracts text from images/scanned PDFs). For images: the vision model reads pixels directly. For spreadsheets: data is converted to structured text representation.", note: "Gotcha: Scanned PDFs with bad OCR will produce garbled text — the AI only sees what the extractor could read" },
              { title: "Content is chunked", body: "Large documents are broken into chunks (typically 512–4000 tokens each) to fit into the context window. In some systems (RAG-enabled), these chunks are indexed separately for later retrieval.", note: "This is why very long documents may get summarized rather than fully read — they literally may not fit" },
              { title: "Chunks enter the context window", body: "The extracted content is inserted into your conversation context — like pasting the document text in yourself, but automated. This competes for space with your conversation history, instructions, and the AI's response.", note: "A 100-page PDF ≈ 75,000 tokens — which exceeds many models' context windows. Use models with large contexts for big documents." },
              { title: "AI reads and responds", body: "The model now has the document content as part of its 'current view.' It can answer questions about it, extract data, summarize, find patterns, or compare with other content — all within the scope of what fits in context.", note: "The AI doesn't 'learn' from your file — it only has access for this conversation session" },
            ][uploadStep] as { title: string; body: string; note: string } |undefined ? (() => {
              const items = [
                { title: "You select a file", body: "You choose a PDF, DOCX, spreadsheet, image, or other supported file type. The file is uploaded to the AI provider's server — it is NOT stored permanently in most cases, but check privacy policies for sensitive documents.", note: "Supported: PDF, DOCX, TXT, CSV, XLSX, PNG, JPG, MP4 (varies by tool)" },
                { title: "Text is extracted", body: "For documents: a parser extracts the raw text (or OCR extracts text from images/scanned PDFs). For images: the vision model reads pixels directly. For spreadsheets: data is converted to structured text representation.", note: "Gotcha: Scanned PDFs with bad OCR will produce garbled text — the AI only sees what the extractor could read" },
                { title: "Content is chunked", body: "Large documents are broken into chunks (typically 512–4000 tokens each) to fit into the context window. In some systems (RAG-enabled), these chunks are indexed separately for later retrieval.", note: "This is why very long documents may get summarized rather than fully read — they literally may not fit" },
                { title: "Chunks enter the context window", body: "The extracted content is inserted into your conversation context — like pasting the document text in yourself, but automated. This competes for space with your conversation history, instructions, and the AI's response.", note: "A 100-page PDF ≈ 75,000 tokens — which exceeds many models' context windows. Use models with large contexts for big documents." },
                { title: "AI reads and responds", body: "The model now has the document content as part of its 'current view.' It can answer questions about it, extract data, summarize, find patterns, or compare with other content — all within the scope of what fits in context.", note: "The AI doesn't 'learn' from your file — it only has access for this conversation session" },
              ];
              const item = items[uploadStep];
              return (
                <>
                  <div className="font-semibold text-foreground mb-2">{item.title}</div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">{item.body}</p>
                  <div className="p-2.5 rounded-lg bg-[oklch(0.75_0.18_55_/_0.08)] border border-[oklch(0.75_0.18_55_/_0.2)] text-xs text-muted-foreground">
                    <strong className="text-[oklch(0.85_0.18_55)]">Note: </strong>{item.note}
                  </div>
                </>
              );
            })() : null}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between mt-3">
          <button onClick={() => setUploadStep(s => Math.max(0, s - 1))} disabled={uploadStep === 0}
            className="px-3 py-1.5 rounded-lg text-xs glass border border-white/8 text-muted-foreground disabled:opacity-30">
            ← Back
          </button>
          <button onClick={() => setUploadStep(s => Math.min(4, s + 1))} disabled={uploadStep === 4}
            className="px-3 py-1.5 rounded-lg text-xs glass border border-white/8 text-muted-foreground disabled:opacity-30">
            Next →
          </button>
        </div>
      </div>

      {/* RAG explainer */}
      <div className="glass rounded-2xl p-5 border border-white/8">
        <SectionBadge label="RAG — RETRIEVAL AUGMENTED GENERATION" color="oklch(0.68_0.20_140)" />
        <p className="text-sm text-muted-foreground mb-4">RAG is how AI tools like Perplexity, NotebookLM, and enterprise chatbots give grounded, accurate answers from your documents.</p>

        <div className="flex gap-1.5 mb-4">
          {["Ask", "Search", "Retrieve", "Generate"].map((step, i) => (
            <button key={step} onClick={() => setRagStep(i)}
              className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: ragStep === i ? "oklch(0.68_0.20_140_/_0.2)" : ragStep > i ? "oklch(0.68_0.20_140_/_0.08)" : "oklch(1 0 0 / 0.04)",
                color: ragStep === i ? "oklch(0.80_0.20_140)" : "oklch(0.5 0 0)",
                border: `1px solid ${ragStep === i ? "oklch(0.68_0.20_140_/_0.4)" : "oklch(1 0 0 / 0.08)"}`,
              }}>
              {i + 1}. {step}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={ragStep} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
            className="p-4 rounded-2xl glass border border-white/8">
            {[
              { title: "You ask a question", icon: <MessageSquare size={20} />, body: "You type a question: 'What does the contract say about termination clauses?' The system needs to find the relevant part of your document — it doesn't load the whole thing every time.", color: "oklch(0.72_0.2_290)" },
              { title: "Vector search over your documents", icon: <Search size={20} />, body: "Your query is converted into a 'vector' (a list of numbers representing meaning). The system searches your document database for chunks with the closest meaning — not just keyword matches, but semantic similarity.", color: "oklch(0.68_0.22_10)" },
              { title: "Relevant chunks retrieved", icon: <Database size={20} />, body: "The 3–10 most relevant chunks from your documents are pulled out and assembled. These might be from different pages or even different files. Only the relevant sections are included — not the whole document.", color: "oklch(0.72_0.18_150)" },
              { title: "Answer generated with grounding", icon: <Sparkles size={20} />, body: "The AI generates an answer using those retrieved chunks as its evidence base. This dramatically reduces hallucination — the AI is constrained to reason from your actual documents rather than its training data.", color: "oklch(0.68_0.20_140)" },
            ][ragStep] as { title: string; icon: React.ReactNode; body: string; color: string } | undefined ? (() => {
              const items = [
                { title: "You ask a question", icon: <MessageSquare size={20} />, body: "You type a question: 'What does the contract say about termination clauses?' The system needs to find the relevant part of your document — it doesn't load the whole thing every time.", color: "oklch(0.72_0.2_290)" },
                { title: "Vector search over your documents", icon: <Search size={20} />, body: "Your query is converted into a 'vector' (a list of numbers representing meaning). The system searches your document database for chunks with the closest meaning — not just keyword matches, but semantic similarity.", color: "oklch(0.68_0.22_10)" },
                { title: "Relevant chunks retrieved", icon: <Database size={20} />, body: "The 3–10 most relevant chunks from your documents are pulled out and assembled. These might be from different pages or even different files. Only the relevant sections are included — not the whole document.", color: "oklch(0.72_0.18_150)" },
                { title: "Answer generated with grounding", icon: <Sparkles size={20} />, body: "The AI generates an answer using those retrieved chunks as its evidence base. This dramatically reduces hallucination — the AI is constrained to reason from your actual documents rather than its training data.", color: "oklch(0.68_0.20_140)" },
              ];
              const item = items[ragStep];
              return (
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: `oklch(from ${item.color} l c h / 0.15)`, color: item.color }}>{item.icon}</div>
                  <div>
                    <div className="font-semibold text-foreground mb-2">{item.title}</div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
                  </div>
                </div>
              );
            })() : null}
          </motion.div>
        </AnimatePresence>

        <div className="mt-3 p-3 rounded-xl bg-[oklch(0.68_0.20_140_/_0.08)] border border-[oklch(0.68_0.20_140_/_0.2)]">
          <p className="text-xs text-muted-foreground"><strong className="text-foreground">Tools using RAG:</strong> Perplexity (web), NotebookLM (your docs), ChatGPT with files (hybrid), Claude Projects (persistent docs), enterprise chatbots built on your company knowledge base.</p>
        </div>
      </div>

      {/* Connectors overview */}
      <div className="glass rounded-2xl p-5 border border-white/8">
        <SectionBadge label="CONNECTORS & INTEGRATIONS" color="oklch(0.72_0.18_150)" />
        <p className="text-sm text-muted-foreground mb-4">Connectors let AI interact with real-world data and services — not just your typed text.</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { name: "Web Search", desc: "Real-time internet access — facts, news, prices, documentation", icon: <Globe size={14} />, color: "oklch(0.72_0.2_290)" },
            { name: "Code Execution", desc: "Run Python scripts — analyze data, create charts, do math", icon: <Cpu size={14} />, color: "oklch(0.68_0.22_10)" },
            { name: "Calendar/Email", desc: "Read scheduling data, draft emails, summarize threads", icon: <MessageSquare size={14} />, color: "oklch(0.75_0.18_55)" },
            { name: "Image Generation", desc: "Create images mid-conversation based on your description", icon: <Palette size={14} />, color: "oklch(0.72_0.18_40)" },
            { name: "GitHub/Git", desc: "Read code, open PRs, analyze codebases, suggest fixes", icon: <Shield size={14} />, color: "oklch(0.72_0.18_150)" },
            { name: "Zapier / Make", desc: "Connect AI to 5,000+ apps via no-code automation workflows", icon: <Zap size={14} />, color: "oklch(0.68_0.20_140)" },
          ].map(c => (
            <div key={c.name} className="p-3 rounded-xl glass border border-white/8 flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `oklch(from ${c.color} l c h / 0.15)`, color: c.color, border: `1px solid oklch(from ${c.color} l c h / 0.3)` }}>
                {c.icon}
              </div>
              <div>
                <div className="text-xs font-semibold text-foreground">{c.name}</div>
                <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-5 border border-white/8">
        <SectionBadge label="KNOWLEDGE CHECK" color="oklch(0.72_0.18_150)" />
        <MasteryQuiz questions={M1_QUIZ_L5} color="oklch(0.72_0.18_150)" />
      </div>
    </LessonFrame>
  );

  // ── Overview / Lesson list ─────────────────────────────────────────────────
  const Overview = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-1">
        <button onClick={onBack} className="p-2 rounded-lg glass border border-white/8 hover:border-white/20 transition-colors">
          <ChevronLeft size={14} className="text-muted-foreground" />
        </button>
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest">AI Mastery · Module 1</div>
          <div className="font-bold text-lg text-foreground">The AI Toolkit</div>
          <div className="text-xs text-muted-foreground">Understanding the landscape, controls, and inputs</div>
        </div>
      </div>

      {completed.size > 0 && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-white/8">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-[oklch(0.72_0.2_290)] to-[oklch(0.72_0.18_150)]"
              animate={{ width: `${(completed.size / M1_META.length) * 100}%` }} />
          </div>
          <span className="text-xs text-muted-foreground shrink-0">{completed.size}/{M1_META.length} lessons</span>
        </div>
      )}

      <div className="space-y-2">
        {M1_META.map((lesson, i) => {
          const done = completed.has(lesson.id);
          const locked = i > 0 && !completed.has(M1_META[i - 1].id);
          return (
            <motion.button key={lesson.id} onClick={() => !locked && setActiveLesson(lesson.id)}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              whileHover={!locked ? { x: 4 } : undefined}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all border ${done ? "border-[oklch(0.72_0.18_150_/_0.3)] bg-[oklch(0.72_0.18_150_/_0.04)]" : locked ? "border-white/5 opacity-50 cursor-not-allowed" : "border-white/8 glass hover:border-white/15"}`}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-sm font-black"
                style={{ background: done ? "oklch(0.72_0.18_150_/_0.15)" : `oklch(from ${lesson.color} l c h / 0.12)`, color: done ? "oklch(0.72_0.18_150)" : lesson.color, border: `1px solid ${done ? "oklch(0.72_0.18_150_/_0.3)" : `oklch(from ${lesson.color} l c h / 0.3)`}` }}>
                {locked ? <Lock size={16} /> : done ? <CheckCircle2 size={18} /> : lesson.id}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground">{lesson.title}</div>
                <p className="text-xs text-muted-foreground truncate">{lesson.subtitle}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={9} />{lesson.duration}</span>
                <span className="text-xs font-semibold flex items-center gap-1" style={{ color: lesson.color }}><Zap size={9} />+{lesson.xp} XP</span>
              </div>
            </motion.button>
          );
        })}
      </div>
      <ModulePodcast moduleNum={1} moduleTitle="The AI Toolkit" content={M1_PODCAST_CONTENT} cookieId={cookieId} />
    </div>
  );

  const lessonMap: Record<number, React.ReactNode> = { 1: <Lesson1 />, 2: <Lesson2 />, 3: <Lesson3 />, 4: <Lesson4 />, 5: <Lesson5 /> };

  return (
    <AnimatePresence mode="wait">
      {activeLesson !== null
        ? <motion.div key={activeLesson} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            {lessonMap[activeLesson]}
          </motion.div>
        : <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Overview />
          </motion.div>
      }
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 2: "Prompting Mastery" — Every technique, from beginner to expert
// Lessons 6–10
// ═══════════════════════════════════════════════════════════════════════════════

const M2_META = [
  { id: 6, title: "Anatomy of a Great Prompt", subtitle: "The components every effective prompt must have", color: "oklch(0.72_0.2_290)", xp: 70, duration: "25 min" },
  { id: 7, title: "Advanced Techniques", subtitle: "Chain-of-thought, few-shot, role-play, iterative refinement", color: "oklch(0.68_0.22_10)", xp: 80, duration: "30 min" },
  { id: 8, title: "The Prompt Lab", subtitle: "10 live exercises across real use cases — build your repertoire", color: "oklch(0.75_0.18_55)", xp: 90, duration: "40 min" },
  { id: 9, title: "Prompt Fixer", subtitle: "Debug broken prompts — identify why they fail and fix them", color: "oklch(0.68_0.20_140)", xp: 85, duration: "30 min" },
  { id: 10, title: "Agents & Instructions", subtitle: "Custom GPTs, Projects, persistent instructions, and AI workflows", color: "oklch(0.72_0.18_150)", xp: 95, duration: "30 min" },
];

const M2_QUIZ_L6: AIMasteryQuiz[] = [
  { id: "m2l6q1", question: "What is the single most important element of any prompt?", options: ["Length — longer is always better", "Clarity of the desired output — the AI needs to know what 'done' looks like", "Politeness — saying please improves outputs", "Technical vocabulary — domain terms signal expertise"], correct: 1, explanation: "The AI needs to know what success looks like. A vague desired output ('write something about marketing') produces mediocre results. A specific desired output ('write a 3-paragraph email introducing a new product to existing customers, with a clear call to action in the last paragraph') gives the model a target to aim for." },
  { id: "m2l6q2", question: "What does a 'persona' instruction in a prompt do?", options: ["Makes the AI pretend to be human", "Activates a specific behavior mode — giving the AI a role that shapes its vocabulary, tone, and knowledge emphasis", "Lets you role-play as a character", "Has no significant effect on output"], correct: 1, explanation: "A persona instruction ('You are a senior product manager with 15 years of B2B SaaS experience') tells the model which areas of its training to emphasize, which vocabulary register to use, and what assumptions to make about the audience. It's one of the highest-impact prompt elements." },
  { id: "m2l6q3", question: "Why is specifying the FORMAT of output so important?", options: ["AI struggles to produce any formatted output by default", "Format determines how the output is used — an email, a table, and a bullet list are all different tools requiring different writing choices", "Formatting always makes outputs longer and more detailed", "Only relevant for technical tasks"], correct: 1, explanation: "Format shapes how the AI organizes its thinking. 'Give me a markdown table with three columns: Task, Priority, Estimated time' produces something entirely different from 'Summarize those tasks' — even from the same underlying request. Specifying format is specifying the tool, not just the content." },
  { id: "m2l6q4", question: "What's the purpose of providing 'negative constraints' (what NOT to do)?", options: ["Negative constraints confuse the AI", "They prevent the model from defaulting to its generic patterns — explicitly ruling out common but unwanted approaches", "They always make outputs shorter", "Only necessary for creative tasks"], correct: 1, explanation: "LLMs have strong default behaviors — they tend to use bullet points, hedging language, broad overviews, and generic examples. Negative constraints break these defaults: 'No bullet points. No hedging language like might or could. No generic examples — use real company names.'" },
];

const M2_QUIZ_L7: AIMasteryQuiz[] = [
  { id: "m2l7q1", question: "Why does 'Think step by step' improve AI reasoning?", options: ["It makes the AI work harder", "Generating intermediate reasoning steps forces the model to 'show its work,' reducing errors that compound when jumping to conclusions", "It makes responses longer and therefore better", "It activates a special reasoning mode"], correct: 1, explanation: "Chain-of-thought (CoT) prompting works because LLMs generate text left-to-right. If the model writes out its reasoning ('First, I need to identify... then I calculate... therefore...'), each step becomes context for the next. Without CoT, the model jumps to the answer — which can amplify early errors." },
  { id: "m2l7q2", question: "What is 'few-shot prompting'?", options: ["Asking the AI for only a few examples", "Providing 2-5 examples of input-output pairs in your prompt to show the model exactly what you want", "A technique for reducing token usage", "Asking multiple AI models simultaneously"], correct: 1, explanation: "Few-shot prompting demonstrates the task through examples rather than describing it through instructions. Input: 'Berlin → Germany, Paris → France, Tokyo →' Output: 'Japan.' The examples are the instruction — the model infers the pattern. This is especially powerful for classification, formatting, and stylistic consistency tasks." },
  { id: "m2l7q3", question: "When should you use iterative refinement rather than trying to write the perfect prompt upfront?", options: ["Never — always get it right on the first try", "Always — iteration is always better", "When the task is complex, subjective, or when you need to adjust tone/format/depth after seeing the first output", "Only for creative writing tasks"], correct: 2, explanation: "Perfect prompts on the first try are rare for complex tasks. Professional AI users treat the first response as a rough draft — then refine with specific follow-ups: 'Make this more concise,' 'The tone is too formal — loosen it up,' 'The second paragraph is strongest — expand that and cut the others.'" },
];

const M2_QUIZ_L9: AIMasteryQuiz[] = [
  { id: "m2l9q1", question: "You ask AI to 'summarize my report' and get a generic 3-sentence overview. What's the most likely cause?", options: ["The AI is incapable of better summaries", "The prompt lacks specificity about length, audience, purpose, and which aspects matter most", "You need a better AI model", "Summaries are inherently simple outputs"], correct: 1, explanation: "A broken summary usually means the AI defaulted to its most generic interpretation of 'summarize.' Fix: 'Summarize this report in 5 bullet points for a non-technical executive audience. Each bullet should capture a key finding, not a process step. Flag the most surprising statistic.'" },
  { id: "m2l9q2", question: "An AI keeps adding disclaimers and hedges ('it's important to note that...', 'however, results may vary...'). How do you stop this?", options: ["Switch to a different AI model", "Accept it as unavoidable AI behavior", "Add explicit negative constraints: 'No disclaimers, caveats, or hedging language. State conclusions directly and confidently.'", "Make your prompts shorter"], correct: 2, explanation: "Excessive hedging is a default LLM behavior from safety training. It's fully suppressible with a direct negative constraint. Be specific: 'Do not add any disclaimers, qualifications, or 'it depends' statements. I need direct assertions, not hedged ones.'" },
  { id: "m2l9q3", question: "The AI gives you a very long, comprehensive answer when you wanted a brief, punchy one. What's the most effective fix?", options: ["Say 'shorter please' in a follow-up", "In the original prompt, specify exact length constraints: '3 sentences maximum' or 'under 100 words'", "Ask for a summary of its answer", "Start a new conversation"], correct: 1, explanation: "LLMs are trained to be thorough. The only reliable fix is hard length constraints in the original prompt — not requests to shorten after the fact (which often still produce long responses). '3 sentences maximum' or 'under 80 words — every word must earn its place' works far better than 'be brief.'" },
];

const M2_QUIZ_L10: AIMasteryQuiz[] = [
  { id: "m2l10q1", question: "What is the core purpose of a 'Custom GPT' or 'Claude Project'?", options: ["A more powerful AI model", "A pre-configured AI instance with persistent system prompts, uploaded knowledge, and saved behavior — reusable across sessions", "An AI trained specifically on your data", "A team collaboration tool"], correct: 1, explanation: "Custom GPTs and Projects are not different models — they're configurations. You set a system prompt once, upload reference documents once, and save behaviors once. Then every conversation in that context starts with that full setup — no re-explaining yourself every time." },
  { id: "m2l10q2", question: "What are 'persistent instructions' / 'memory' features in AI tools?", options: ["A way to make the AI remember everything forever", "User-defined facts and preferences the AI applies across all conversations by default, without the user having to repeat them", "Technical training of the model on new data", "A premium feature that costs extra"], correct: 1, explanation: "Persistent instructions (ChatGPT's 'Memory,' Claude's 'Profile,' etc.) let you tell the AI standing facts about yourself once: 'I prefer direct, no-fluff communication,' 'I work in B2B SaaS,' 'Always suggest three options, not one.' These apply to every future conversation by default." },
  { id: "m2l10q3", question: "What distinguishes an AI 'agent' from a regular chatbot?", options: ["Agents are always autonomous — no human involvement", "Agents can take sequences of actions, use tools, and work toward goals across multiple steps — not just respond to single messages", "Agents are more expensive models", "There is no meaningful difference"], correct: 1, explanation: "A chatbot responds. An agent acts. An AI agent can: search the web, read files, run code, call APIs, make decisions based on results, and chain these actions together across multiple steps to complete a complex goal. The key property is autonomous multi-step action — not just generating text." },
];

const PROMPT_LAB_EXERCISES = [
  {
    id: "pl1", category: "Writing", title: "Email Writer",
    scenario: "You need to decline a meeting invitation professionally without giving a reason.",
    challenge: "Write a prompt that will produce a polished, warm, 3-sentence email declining the meeting — without excuses or over-explanation.",
    hint: "Include: tone (professional but warm), length (3 sentences max), what to NOT say (no excuse, no 'unfortunately'), and a brief offer for an alternative.",
    exampleGood: "You are a senior executive with excellent professional communication skills. Write a 3-sentence email declining a meeting invitation. Tone: warm but firm. Do NOT include an excuse or reason. Do NOT say 'unfortunately.' End with a brief, genuine offer to connect another time.",
    color: "oklch(0.72_0.2_290)",
  },
  {
    id: "pl2", category: "Analysis", title: "Data Interpreter",
    scenario: "You have a list of monthly sales numbers and want AI to spot trends and anomalies.",
    challenge: "Craft a prompt that produces a structured analysis: key trend, biggest anomaly, and one recommendation — not just a description.",
    hint: "Give it sample data. Tell it the output format exactly. Specify that you want a conclusion, not just observations. Forbid vague language.",
    exampleGood: "Analyze these monthly sales figures: [Jan: $42k, Feb: $38k, Mar: $51k, Apr: $49k, May: $65k, Jun: $41k]. Produce exactly: 1) The main trend in 1 sentence. 2) The biggest anomaly and why it stands out. 3) One specific, actionable recommendation. No vague language. State conclusions directly.",
    color: "oklch(0.68_0.22_10)",
  },
  {
    id: "pl3", category: "Brainstorming", title: "Idea Generator",
    scenario: "You need 10 unique marketing campaign ideas for a local bakery — none of the typical 'social media post' suggestions.",
    challenge: "Write a prompt that forces genuinely creative, specific ideas rather than generic advice.",
    hint: "Specify quantity and uniqueness. Tell it what you DON'T want (no social media tips). Give context about the bakery. Ask for a brief reason per idea.",
    exampleGood: "Generate 10 creative marketing campaign ideas for a neighborhood sourdough bakery — small, artisan, community-focused. Ideas must be specific and unconventional. DO NOT suggest: social media posts, loyalty cards, or discount coupons — these are already in place. Each idea should include: the campaign concept (1 sentence) + why it would work for this type of bakery (1 sentence).",
    color: "oklch(0.72_0.18_150)",
  },
  {
    id: "pl4", category: "Learning", title: "Concept Explainer",
    scenario: "You want to understand a technical concept but you keep getting overly complex explanations.",
    challenge: "Write a prompt that guarantees a clear, concrete, jargon-free explanation with a real-world analogy — for any complex topic.",
    hint: "Specify your background (non-expert), require an analogy, set a reading level, limit jargon, and ask it to check you understood by posing one question at the end.",
    exampleGood: "Explain [concept] to someone who has no technical background. Requirements: 1) Start with a concrete real-world analogy. 2) Explain the core mechanism in plain language. 3) Give one example of where this matters in everyday life. 4) No jargon — if you must use a technical term, define it immediately. 5) End with one question to check I understood correctly.",
    color: "oklch(0.75_0.18_55)",
  },
  {
    id: "pl5", category: "Code", title: "Code Reviewer",
    scenario: "You wrote a Python function and want substantive feedback — not just 'looks good' or basic syntax checks.",
    challenge: "Write a prompt that produces a structured code review covering efficiency, edge cases, readability, and a rewritten version.",
    hint: "Tell it your experience level. Ask for specific categories of feedback. Request a rewrite. Tell it to be direct, not polite.",
    exampleGood: "You are a senior Python developer doing a code review. Review the following function for: 1) Logic errors or edge cases I missed. 2) Performance issues. 3) Readability — is naming clear? 4) Pythonic style — am I doing this the Python way? Be direct and specific. Do not praise good parts — focus only on improvements. End with a rewritten version incorporating your suggestions. [paste code here]",
    color: "oklch(0.68_0.20_140)",
  },
];

const BROKEN_PROMPTS = [
  {
    id: "bp1",
    broken: "Write something about AI for my presentation.",
    problems: ["No audience specified", "No length or format", "No specific topic within AI", "'Something' is not a deliverable"],
    fixed: "Write a 3-slide talking point outline for a 5-minute executive presentation on how AI will affect our customer support team over the next 2 years. Audience: non-technical C-suite. Tone: confident, balanced (both opportunities and risks). Each slide: 3 bullet points maximum.",
    category: "Too Vague",
    color: "oklch(0.68_0.22_10)",
  },
  {
    id: "bp2",
    broken: "Explain quantum computing and also write me a cover letter and what are the best restaurants in my city.",
    problems: ["Three completely different tasks in one prompt", "Context switching confuses output quality", "No focused goal for any of the three"],
    fixed: "Split into three separate conversations, each with full context. One prompt per task produces dramatically better results than combining unrelated requests.",
    category: "Too Many Tasks",
    color: "oklch(0.72_0.2_290)",
  },
  {
    id: "bp3",
    broken: "Make this better.",
    problems: ["'Better' is undefined — better how?", "No original content to improve provided", "No criteria for what success looks like"],
    fixed: "Rewrite the following paragraph to be 30% shorter without losing any key information. Improve clarity by using active voice throughout. Replace any abstract statements with a concrete example. [paste original]",
    category: "No Criteria",
    color: "oklch(0.72_0.18_150)",
  },
  {
    id: "bp4",
    broken: "Don't use AI-sounding language and be natural and not robotic and avoid clichés and write conversationally.",
    problems: ["Stacked negative constraints only — no positive direction", "No example of what 'natural' sounds like to you", "No format or length specified", "No topic or content given"],
    fixed: "Write in a conversational, direct style — as if explaining this to a smart friend over coffee. Sentence length: varied, 8–20 words. Use: contractions, rhetorical questions, and concrete examples. Avoid: jargon, passive voice, and corporate buzzwords like 'leverage' or 'synergy'. [then state the topic]",
    category: "Only Negatives",
    color: "oklch(0.75_0.18_55)",
  },
];

// ─── Module 2 Component ───────────────────────────────────────────────────────
const M2_PODCAST_CONTENT = `Module: Prompting Mastery. Lesson 6: Every great prompt has the same DNA. Once you see it, you'll never write a vague prompt again — and you'll immediately recognize why a prompt failed. Lesson 7: These four techniques are what separate casual AI users from power users. Chain-of-thought alone can double the accuracy of complex reasoning tasks. Lesson 8: This is where you build real skill. Five live exercises, real AI responses. Write your own prompt for each scenario, then compare with the expert example. Lesson 9: The fastest way to improve your prompting is to study broken prompts. Each one has a specific failure mode — and once you can name the failure, you can fix it anywhere. Lesson 10: Custom GPTs, Projects, persistent memory, and AI agents are where the power users live. These aren't features — they're workflows. Set them up once, benefit from them forever.`;

function AILiteracyModule2({ onBack }: { onBack: () => void }) {
  const { addXP, cookieId } = usePersonalization();
  const [activeLesson, setActiveLesson] = useState<number | null>(null);
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  // L6 state — prompt builder
  const [pbParts, setPbParts] = useState({ persona: "", task: "", format: "", constraints: "", audience: "" });
  const [pbResult, setPbResult] = useState("");
  const [pbLoading, setPbLoading] = useState(false);

  // L7 state — technique explorer
  const [techTab, setTechTab] = useState<"cot" | "fewshot" | "roleplay" | "iterative">("cot");
  const [cotInput, setCotInput] = useState("");
  const [cotResult, setCotResult] = useState("");
  const [cotLoading, setCotLoading] = useState(false);
  const [fewshotInput, setFewshotInput] = useState("");
  const [fewshotResult, setFewshotResult] = useState("");
  const [fewshotLoading, setFewshotLoading] = useState(false);

  // L8 state — prompt lab
  const [labIdx, setLabIdx] = useState(0);
  const [labInput, setLabInput] = useState("");
  const [labResult, setLabResult] = useState("");
  const [labLoading, setLabLoading] = useState(false);
  const [labShowExample, setLabShowExample] = useState(false);
  const [labCompleted, setLabCompleted] = useState<Set<string>>(new Set());

  // L9 state — prompt fixer
  const [fixerIdx, setFixerIdx] = useState(0);
  const [fixerReveal, setFixerReveal] = useState(false);
  const [fixerUserFix, setFixerUserFix] = useState("");
  const [fixerResult, setFixerResult] = useState("");
  const [fixerLoading, setFixerLoading] = useState(false);

  // L10 state — agents & instructions
  const [agentTab, setAgentTab] = useState<"memory" | "custom" | "agent">("memory");
  const [memInstructions, setMemInstructions] = useState("");
  const [memResult, setMemResult] = useState("");
  const [memLoading, setMemLoading] = useState(false);

  const cotMut = trpc.ai.explainConcept.useMutation({ onSuccess: d => { setCotResult(d.explanation); setCotLoading(false); }, onError: () => setCotLoading(false) });
  const fewshotMut = trpc.ai.explainConcept.useMutation({ onSuccess: d => { setFewshotResult(d.explanation); setFewshotLoading(false); }, onError: () => setFewshotLoading(false) });
  const pbMut = trpc.ai.explainConcept.useMutation({ onSuccess: d => { setPbResult(d.explanation); setPbLoading(false); }, onError: () => setPbLoading(false) });
  const labMut = trpc.ai.explainConcept.useMutation({ onSuccess: d => { setLabResult(d.explanation); setLabLoading(false); if (!labCompleted.has(PROMPT_LAB_EXERCISES[labIdx].id)) { setLabCompleted(prev => new Set(Array.from(prev).concat(PROMPT_LAB_EXERCISES[labIdx].id))); addXP(10); toast.success("+10 XP — lab completed!"); } }, onError: () => setLabLoading(false) });
  const fixerMut = trpc.ai.explainConcept.useMutation({ onSuccess: d => { setFixerResult(d.explanation); setFixerLoading(false); }, onError: () => setFixerLoading(false) });
  const memMut = trpc.ai.explainConcept.useMutation({ onSuccess: d => { setMemResult(d.explanation); setMemLoading(false); }, onError: () => setMemLoading(false) });

  const completeLesson = (id: number) => {
    if (completed.has(id)) return;
    const meta = M2_META.find(m => m.id === id)!;
    setCompleted(prev => new Set(Array.from(prev).concat(id)));
    addXP(meta.xp);
    toast.success(`+${meta.xp} XP — Lesson ${id} complete!`);
  };

  function LessonFrame({ id, children }: { id: number; children: React.ReactNode }) {
    const meta = M2_META.find(m => m.id === id)!;
    const done = completed.has(id);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => setActiveLesson(null)} className="p-2 rounded-lg glass border border-white/8 hover:border-white/20 transition-colors">
            <ChevronLeft size={14} className="text-muted-foreground" />
          </button>
          <div className="flex-1">
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Module 2 · Lesson {id}</div>
            <h2 className="font-bold text-foreground text-lg leading-tight">{meta.title}</h2>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={10} />{meta.duration}</span>
            <span className="text-xs flex items-center gap-1 font-semibold" style={{ color: meta.color }}><Zap size={10} />+{meta.xp} XP</span>
          </div>
        </div>
        {children}
        <div className="pt-4 border-t border-white/8 flex items-center justify-between">
          {done
            ? <div className="flex items-center gap-2 text-sm text-[oklch(0.72_0.18_150)]"><Award size={14} />Lesson complete</div>
            : <motion.button onClick={() => completeLesson(id)} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-black"
                style={{ background: `linear-gradient(135deg, ${meta.color}, oklch(0.65_0.22_200))` }}>
                <CheckCircle2 size={14} />Mark Complete · +{meta.xp} XP
              </motion.button>
          }
          {id < 10 && (
            <button onClick={() => setActiveLesson(id + 1)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg glass border border-white/10 text-sm text-muted-foreground hover:text-foreground transition-colors">
              Next <ChevronRight size={13} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── LESSON 6: Anatomy of a Great Prompt ───────────────────────────────────
  const Lesson6 = () => (
    <LessonFrame id={6}>
      <AIVoice text="Every great prompt has the same DNA. Once you see it, you'll never write a vague prompt again — and you'll immediately recognize why a prompt failed." />

      <p className="text-sm text-muted-foreground leading-relaxed">
        Every great prompt is built from the same six components. Most people write prompts that only cover one or two of them — and then wonder why the AI gives a generic answer. Once you internalize this anatomy, you'll instantly know what a broken prompt is missing and exactly how to fix it.
      </p>

      {/* Prompt anatomy explainer */}
      <div className="glass rounded-2xl p-5 border border-white/8">
        <SectionBadge label="THE 6 COMPONENTS" color="oklch(0.72_0.2_290)" />
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Three components are required — without them, the AI has no clear job to do. The other three are optional but powerful: they narrow the output and eliminate the AI's worst default habits.
        </p>
        <div className="space-y-3">
          {[
            { component: "ROLE / PERSONA", example: '"You are a senior UX researcher specializing in B2B SaaS"', why: "Activates the right vocabulary, knowledge depth, and perspective. Without a role, the AI defaults to a generic helpful assistant — which is mediocre for specialized work.", color: "oklch(0.72_0.2_290)", required: true },
            { component: "TASK", example: '"Analyze the following user interview transcripts and identify the 3 most critical pain points"', why: "The specific action the AI must perform. Verbs matter: 'analyze' ≠ 'summarize' ≠ 'explain' ≠ 'critique'. Use the exact verb for what you need.", color: "oklch(0.68_0.22_10)", required: true },
            { component: "CONTEXT / INPUT", example: '"Transcripts from 8 customer interviews, all enterprise clients in manufacturing"', why: "Background the AI needs that it couldn't know otherwise. Include: who the audience is, what the document is, what the goal is, what constraints exist.", color: "oklch(0.72_0.18_150)", required: true },
            { component: "FORMAT", example: '"Output: numbered list, max 3 items, each with: pain point title (bold) + 2-sentence explanation + severity rating (1-5)"', why: "Specifying format determines how the AI structures its reasoning. A bullet list produces different thinking than a table or a narrative paragraph.", color: "oklch(0.68_0.20_140)", required: false },
            { component: "CONSTRAINTS", example: '"No jargon. No generic UX platitudes like \'users want easy to use\'. Cite the specific interview where each pain point appeared."', why: "What NOT to do breaks the AI's default patterns. LLMs have strong defaults (vague language, hedges, generic examples) — constraints are how you override them.", color: "oklch(0.75_0.18_55)", required: false },
            { component: "EXAMPLES (Few-shot)", example: '"Pain point format: [Title]: Users struggle to X because Y. Severity: 4/5. Evidence: Interviewee 3 said: \'quote\'"', why: "Showing beats telling. One good example eliminates ambiguity about format, tone, and depth better than a paragraph of instructions.", color: "oklch(0.72_0.18_40)", required: false },
          ].map(c => (
            <div key={c.component} className="p-4 rounded-xl border transition-all" style={{ borderColor: `oklch(from ${c.color} l c h / 0.25)`, background: `oklch(from ${c.color} l c h / 0.05)` }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded" style={{ background: `oklch(from ${c.color} l c h / 0.2)`, color: c.color }}>{c.component}</span>
                {c.required && <span className="text-[10px] text-[oklch(0.78_0.22_10)] font-semibold">Required</span>}
              </div>
              <div className="font-mono text-xs text-muted-foreground bg-white/5 p-2 rounded-lg mb-2 leading-relaxed">{c.example}</div>
              <p className="text-xs text-muted-foreground leading-relaxed">{c.why}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive prompt builder */}
      <div className="glass rounded-2xl p-5 border border-white/8">
        <SectionBadge label="PROMPT BUILDER — ASSEMBLE & FIRE" color="oklch(0.75_0.18_55)" />
        <p className="text-sm text-muted-foreground mb-4">Fill in the components. The builder assembles them into a structured prompt and runs it live.</p>
        <div className="space-y-3 mb-4">
          {[
            { key: "persona" as const, label: "Role / Persona", placeholder: "e.g., You are a seasoned marketing strategist with 10 years of B2C experience…" },
            { key: "task" as const, label: "Task", placeholder: "e.g., Write / Analyze / Create / Explain / Compare…" },
            { key: "format" as const, label: "Output Format", placeholder: "e.g., 3-paragraph essay / numbered list / table with 3 columns / bullet points…" },
            { key: "constraints" as const, label: "Constraints (what NOT to do)", placeholder: "e.g., No jargon, no hedging language, no generic advice…" },
            { key: "audience" as const, label: "Audience / Context", placeholder: "e.g., For a non-technical executive audience. Context: Q4 planning meeting…" },
          ].map(field => (
            <div key={field.key}>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">{field.label}</label>
              <textarea value={pbParts[field.key]} onChange={e => setPbParts(p => ({ ...p, [field.key]: e.target.value }))}
                placeholder={field.placeholder} rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-foreground placeholder:text-white/20 resize-none focus:outline-none focus:border-white/25" />
            </div>
          ))}
        </div>

        {/* Assembled prompt preview */}
        {Object.values(pbParts).some(v => v.trim()) && (
          <div className="mb-3 p-4 rounded-xl bg-white/4 border border-white/10">
            <div className="text-[10px] font-bold text-muted-foreground mb-2 tracking-widest">ASSEMBLED PROMPT PREVIEW:</div>
            <p className="text-xs font-mono text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {[pbParts.persona, pbParts.task, pbParts.audience && `Context: ${pbParts.audience}`, pbParts.format && `Format: ${pbParts.format}`, pbParts.constraints && `Constraints: ${pbParts.constraints}`].filter(Boolean).join("\n\n")}
            </p>
          </div>
        )}

        <button disabled={pbLoading || !Object.values(pbParts).some(v => v.trim())} onClick={() => {
          setPbLoading(true); setPbResult("");
          const assembled = [pbParts.persona, pbParts.task, pbParts.audience && `Context: ${pbParts.audience}`, pbParts.format && `Format: ${pbParts.format}`, pbParts.constraints && `Constraints: ${pbParts.constraints}`].filter(Boolean).join("\n\n");
          pbMut.mutate({ concept: assembled || "Say hello", level: "student" });
        }}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-40 text-black"
          style={{ background: "linear-gradient(135deg, oklch(0.72_0.2_290), oklch(0.68_0.22_10))" }}>
          {pbLoading ? <><Loader2 size={14} className="animate-spin" />Running assembled prompt…</> : <><Zap size={14} />Run Assembled Prompt</>}
        </button>

        {pbResult && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-4 rounded-xl glass border border-white/8">
            <div className="text-[10px] font-bold text-muted-foreground mb-2">AI RESPONSE</div>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{pbResult}</p>
          </motion.div>
        )}
      </div>

      <div className="glass rounded-2xl p-5 border border-white/8">
        <SectionBadge label="KNOWLEDGE CHECK" color="oklch(0.72_0.2_290)" />
        <MasteryQuiz questions={M2_QUIZ_L6} color="oklch(0.72_0.2_290)" />
      </div>
    </LessonFrame>
  );

  // ── LESSON 7: Advanced Techniques ─────────────────────────────────────────
  const Lesson7 = () => (
    <LessonFrame id={7}>
      <AIVoice text="These four techniques are what separate casual AI users from power users. Chain-of-thought alone can double the accuracy of complex reasoning tasks." />

      <p className="text-sm text-muted-foreground leading-relaxed">
        These four techniques are grounded in how transformer models actually process tokens. Because attention is causal — each token can only attend to previous tokens — the intermediate reasoning steps you force into the output become real context for subsequent tokens. This is why forcing explicit intermediate steps (chain-of-thought) measurably improves accuracy: the model isn't "thinking harder," it's building a richer intermediate representation that the later tokens in the answer can attend to. Published research (Wei et al., 2022) demonstrated 40–70% accuracy gains on complex reasoning benchmarks with CoT alone. Few-shot, role-play, and iterative refinement operate through related mechanisms — all of them shape the statistical context in which the model generates its response. Use the tabs to understand each one and practice it live.
      </p>

      <div className="glass rounded-2xl p-5 border border-white/8">
        <div className="grid grid-cols-2 gap-1.5 mb-4">
          {([
            { key: "cot" as const, label: "Chain of Thought", short: "CoT" },
            { key: "fewshot" as const, label: "Few-Shot", short: "FS" },
            { key: "roleplay" as const, label: "Role-Play", short: "RP" },
            { key: "iterative" as const, label: "Iterative", short: "IT" },
          ]).map(t => (
            <button key={t.key} onClick={() => setTechTab(t.key)}
              className="py-2.5 rounded-xl text-xs font-bold transition-all"
              style={{
                background: techTab === t.key ? "oklch(0.68_0.22_10_/_0.2)" : "oklch(1 0 0 / 0.04)",
                color: techTab === t.key ? "oklch(0.80_0.22_10)" : "oklch(0.5 0 0)",
                border: `1px solid ${techTab === t.key ? "oklch(0.68_0.22_10_/_0.4)" : "oklch(1 0 0 / 0.08)"}`,
              }}>
              {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {techTab === "cot" && (
            <motion.div key="cot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <SectionBadge label="CHAIN OF THOUGHT" color="oklch(0.68_0.22_10)" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Adding <strong className="text-foreground">"Think step by step"</strong> or <strong className="text-foreground">"Show your reasoning before answering"</strong> forces the model to generate intermediate steps before concluding. The mechanism is not metaphorical: transformer decoders generate tokens left-to-right, and each generated token becomes part of the context that determines the next. When you instruct the model to write out its reasoning, those reasoning tokens become literal context for the final answer tokens — giving the model a richer representational foundation to draw from. Without CoT, the model jumps from question to answer in a single step, compressing and often losing the intermediate logic. <strong className="text-foreground">Zero-shot CoT</strong> (just adding "think step by step") works for most tasks. <strong className="text-foreground">Few-shot CoT</strong> (providing 2-3 worked examples with full reasoning chains) is more powerful for complex domain-specific problems.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[oklch(0.68_0.22_10_/_0.08)] border border-[oklch(0.68_0.22_10_/_0.25)]">
                  <div className="text-[10px] font-bold text-[oklch(0.78_0.22_10)] mb-2">WITHOUT CoT</div>
                  <p className="text-xs font-mono text-muted-foreground">"What's 15% of 847?"</p>
                  <p className="text-xs text-muted-foreground mt-2">Model jumps to answer — more error-prone</p>
                </div>
                <div className="p-3 rounded-xl bg-[oklch(0.72_0.18_150_/_0.08)] border border-[oklch(0.72_0.18_150_/_0.25)]">
                  <div className="text-[10px] font-bold text-[oklch(0.82_0.18_150)] mb-2">WITH CoT</div>
                  <p className="text-xs font-mono text-muted-foreground">"What's 15% of 847? Think step by step."</p>
                  <p className="text-xs text-muted-foreground mt-2">Model shows work → answer from correct reasoning</p>
                </div>
              </div>

              {/* Live CoT demo */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">Try it — compare with and without CoT:</p>
                <textarea value={cotInput} onChange={e => setCotInput(e.target.value)}
                  placeholder="Enter any problem requiring reasoning: math, logic, analysis, decisions…" rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-foreground placeholder:text-white/20 resize-none focus:outline-none focus:border-white/25 font-mono" />
                <div className="grid grid-cols-2 gap-2">
                  <button disabled={cotLoading || !cotInput.trim()} onClick={() => {
                    setCotLoading(true); setCotResult("");
                    cotMut.mutate({ concept: cotInput, level: "student" });
                  }}
                    className="py-2 rounded-xl text-xs font-semibold disabled:opacity-40 bg-[oklch(0.68_0.22_10_/_0.15)] text-[oklch(0.80_0.22_10)] border border-[oklch(0.68_0.22_10_/_0.35)]">
                    Direct answer
                  </button>
                  <button disabled={cotLoading || !cotInput.trim()} onClick={() => {
                    setCotLoading(true); setCotResult("");
                    cotMut.mutate({ concept: `${cotInput}\n\nThink through this step by step. Show all reasoning before giving the final answer.`, level: "student" });
                  }}
                    className="py-2 rounded-xl text-xs font-semibold disabled:opacity-40 bg-[oklch(0.72_0.18_150_/_0.15)] text-[oklch(0.82_0.18_150)] border border-[oklch(0.72_0.18_150_/_0.35)]">
                    + Chain of Thought
                  </button>
                </div>
                {cotResult && (
                  <div className="p-4 rounded-xl glass border border-white/8">
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{cotResult}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {techTab === "fewshot" && (
            <motion.div key="fewshot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <SectionBadge label="FEW-SHOT PROMPTING" color="oklch(0.72_0.2_290)" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Instead of describing what you want, <strong className="text-foreground">show it</strong>. 2–5 examples in your prompt define the pattern far better than instructions. Especially powerful for classification, consistent formatting, and stylistic tasks.
              </p>
              <div className="p-4 rounded-xl bg-[oklch(0.72_0.2_290_/_0.08)] border border-[oklch(0.72_0.2_290_/_0.2)]">
                <div className="text-[10px] font-bold text-[oklch(0.82_0.2_290)] mb-2">EXAMPLE: Sentiment classifier via few-shot</div>
                <pre className="text-xs font-mono text-muted-foreground leading-relaxed whitespace-pre-wrap">{`Classify the sentiment:
"This product is amazing!" → Positive
"Delivery was 3 days late." → Negative  
"It works as expected." → Neutral
"I can't believe how bad the support was." → ?`}</pre>
              </div>
              <p className="text-sm text-muted-foreground">The model infers the classification task from examples — no explicit instructions needed. Now try building your own:</p>
              <textarea value={fewshotInput} onChange={e => setFewshotInput(e.target.value)}
                placeholder={`Write 3 input → output examples, then leave the last one incomplete:\n\nExample 1 → Output 1\nExample 2 → Output 2\nExample 3 → Output 3\nYour new input → ?`}
                rows={8}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-mono text-foreground placeholder:text-white/20 resize-none focus:outline-none focus:border-white/25" />
              <button disabled={fewshotLoading || !fewshotInput.trim()} onClick={() => {
                setFewshotLoading(true); setFewshotResult("");
                fewshotMut.mutate({ concept: fewshotInput, level: "student" });
              }}
                className="w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 bg-[oklch(0.72_0.2_290_/_0.15)] text-[oklch(0.82_0.2_290)] border border-[oklch(0.72_0.2_290_/_0.35)] flex items-center justify-center gap-2">
                {fewshotLoading ? <><Loader2 size={13} className="animate-spin" />Running…</> : <><Zap size={13} />Complete the pattern</>}
              </button>
              {fewshotResult && (
                <div className="p-4 rounded-xl glass border border-white/8">
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{fewshotResult}</p>
                </div>
              )}
            </motion.div>
          )}

          {techTab === "roleplay" && (
            <motion.div key="roleplay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <SectionBadge label="ROLE-PLAY PROMPTING" color="oklch(0.72_0.18_150)" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Role-play goes deeper than a persona instruction — you construct an entire scenario the AI inhabits. The model reasons from inside the scenario, which produces richer, more coherent outputs for simulation, debate preparation, and creative tasks.
              </p>
              <div className="space-y-3">
                {[
                  { title: "Devil's Advocate", prompt: "Argue the strongest possible case AGAINST my position on [topic]. You are a brilliant, good-faith opponent. Don't hold back — find every real weakness.", use: "Stress-test your arguments before a presentation or debate" },
                  { title: "Rubber Duck (for coders)", prompt: "I'm going to explain my code to you. Don't help me — just ask clarifying questions when what I say doesn't make sense. I'll figure out the bug by explaining it.", use: "Surfaces logic errors through articulation" },
                  { title: "Hostile Interviewer", prompt: "Interview me for [role]. Be challenging — ask follow-up questions, push back on vague answers, and flag weak responses. After 5 questions, give me honest feedback on my performance.", use: "Interview prep, pitch practice, public speaking" },
                  { title: "Future User", prompt: "You are a skeptical potential customer. I'm going to pitch you my product. Respond as a real person would — ask real objections, express doubts, and only be convinced by good answers.", use: "Stress-test product pitches and messaging" },
                ].map(r => (
                  <div key={r.title} className="p-4 rounded-xl glass border border-white/8">
                    <div className="font-semibold text-sm text-foreground mb-1">{r.title}</div>
                    <div className="font-mono text-xs text-muted-foreground bg-white/5 p-2.5 rounded-lg mb-2">{r.prompt}</div>
                    <p className="text-xs text-muted-foreground"><strong className="text-foreground">Best for:</strong> {r.use}</p>
                  </div>
                ))}
              </div>
              <PromptSandbox placeholder={"Try a role-play prompt:\n\n\"You are a skeptical investor. I'm going to pitch you my startup idea. Push back on anything that sounds hand-wavy. [Then describe your idea].\""} systemHint="You are a skilled AI assistant who can take on any role described in the prompt. Inhabit the role fully and maintain it throughout your response." color="oklch(0.72_0.18_150)" label="Try Role-Play Live" />
            </motion.div>
          )}

          {techTab === "iterative" && (
            <motion.div key="iterative" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <SectionBadge label="ITERATIVE REFINEMENT" color="oklch(0.75_0.18_55)" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Professional AI users rarely try to write the perfect prompt on the first attempt. They treat the first response as a rough draft and refine with targeted follow-ups. The <strong className="text-foreground">3-pass technique</strong> consistently produces much better results.
              </p>
              <div className="space-y-2">
                {[
                  { pass: "Pass 1 — Generate", instruction: "Broad initial prompt: get something on paper. Don't over-specify. See what the model defaults to.", color: "oklch(0.72_0.2_290)" },
                  { pass: "Pass 2 — Critique", instruction: "Ask the AI to critique its own output: 'What are the 3 weakest parts of what you just wrote? What's missing? What's too generic?'", color: "oklch(0.68_0.22_10)" },
                  { pass: "Pass 3 — Targeted Fix", instruction: "Give specific, targeted revision instructions based on Pass 2: 'Expand the second point. Cut the third — it's redundant. Make the conclusion more concrete.'", color: "oklch(0.72_0.18_150)" },
                ].map(p => (
                  <div key={p.pass} className="p-4 rounded-xl border transition-all" style={{ borderColor: `oklch(from ${p.color} l c h / 0.3)`, background: `oklch(from ${p.color} l c h / 0.06)` }}>
                    <div className="font-bold text-sm mb-1" style={{ color: p.color }}>{p.pass}</div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{p.instruction}</p>
                  </div>
                ))}
              </div>
              <div className="p-4 rounded-xl bg-[oklch(0.75_0.18_55_/_0.08)] border border-[oklch(0.75_0.18_55_/_0.2)]">
                <p className="text-xs font-semibold text-[oklch(0.85_0.18_55)] mb-1">HIGH-VALUE REFINEMENT PHRASES:</p>
                <div className="grid grid-cols-2 gap-1 text-xs font-mono text-muted-foreground">
                  {["Make this 30% shorter", "Add a concrete example to [part]", "The tone is too formal — loosen it", "Cut [specific section] — it's weak", "Lead with the most important point", "This is vague — be specific"].map(p => (
                    <div key={p} className="py-1 px-2 rounded bg-white/5">{p}</div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="glass rounded-2xl p-5 border border-white/8">
        <SectionBadge label="KNOWLEDGE CHECK" color="oklch(0.68_0.22_10)" />
        <MasteryQuiz questions={M2_QUIZ_L7} color="oklch(0.68_0.22_10)" />
      </div>
    </LessonFrame>
  );

  // ── LESSON 8: The Prompt Lab ───────────────────────────────────────────────
  const Lesson8 = () => (
    <LessonFrame id={8}>
      <AIVoice text="This is where you build real skill. Five live exercises, real AI responses. Write your own prompt for each scenario, then compare with the expert example. The gap between your first attempt and the expert prompt is where learning happens." />

      <div className="glass rounded-2xl p-2 border border-white/8 mb-1">
        <div className="flex gap-1 flex-wrap">
          {PROMPT_LAB_EXERCISES.map((ex, i) => (
            <button key={ex.id} onClick={() => { setLabIdx(i); setLabInput(""); setLabResult(""); setLabShowExample(false); }}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold min-w-[80px] transition-all"
              style={{
                background: labIdx === i ? `oklch(from ${ex.color} l c h / 0.2)` : labCompleted.has(ex.id) ? "oklch(0.72_0.18_150_/_0.1)" : "oklch(1 0 0 / 0.03)",
                color: labIdx === i ? ex.color : labCompleted.has(ex.id) ? "oklch(0.72_0.18_150)" : "oklch(0.5 0 0)",
                border: `1px solid ${labIdx === i ? `oklch(from ${ex.color} l c h / 0.4)` : "oklch(1 0 0 / 0.08)"}`,
              }}>
              {labCompleted.has(ex.id) && <CheckCircle2 size={10} className="inline mr-1" />}
              {ex.category}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={labIdx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="glass rounded-2xl p-5 border border-white/8 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black tracking-widest px-2 py-0.5 rounded" style={{ background: `oklch(from ${PROMPT_LAB_EXERCISES[labIdx].color} l c h / 0.15)`, color: PROMPT_LAB_EXERCISES[labIdx].color }}>LAB {labIdx + 1} — {PROMPT_LAB_EXERCISES[labIdx].category.toUpperCase()}</span>
            </div>
            <h3 className="font-bold text-foreground">{PROMPT_LAB_EXERCISES[labIdx].title}</h3>
          </div>

          <div className="p-4 rounded-xl glass border border-white/8">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2">SCENARIO</div>
            <p className="text-sm text-muted-foreground leading-relaxed">{PROMPT_LAB_EXERCISES[labIdx].scenario}</p>
          </div>

          <div className="p-4 rounded-xl" style={{ background: `oklch(from ${PROMPT_LAB_EXERCISES[labIdx].color} l c h / 0.07)`, border: `1px solid oklch(from ${PROMPT_LAB_EXERCISES[labIdx].color} l c h / 0.25)` }}>
            <div className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: PROMPT_LAB_EXERCISES[labIdx].color }}>YOUR CHALLENGE</div>
            <p className="text-sm text-foreground font-semibold leading-snug">{PROMPT_LAB_EXERCISES[labIdx].challenge}</p>
          </div>

          {!labShowExample && (
            <button onClick={() => setLabShowExample(true)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
              <Eye size={11} /> Show hint
            </button>
          )}
          {labShowExample && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-xl bg-[oklch(0.75_0.18_55_/_0.08)] border border-[oklch(0.75_0.18_55_/_0.2)]">
              <div className="text-[10px] font-bold text-[oklch(0.85_0.18_55)] mb-1">HINT</div>
              <p className="text-xs text-muted-foreground">{PROMPT_LAB_EXERCISES[labIdx].hint}</p>
            </motion.div>
          )}

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-2">YOUR PROMPT:</label>
            <textarea value={labInput} onChange={e => setLabInput(e.target.value)}
              placeholder="Write your best prompt for this scenario…" rows={6}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-mono text-foreground placeholder:text-white/20 resize-none focus:outline-none focus:border-white/25" />
          </div>

          <button disabled={labLoading || !labInput.trim()} onClick={() => { setLabLoading(true); setLabResult(""); labMut.mutate({ concept: labInput, level: "student" }); }}
            className="w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-40"
            style={{ background: `linear-gradient(135deg, ${PROMPT_LAB_EXERCISES[labIdx].color}, oklch(0.65_0.22_200))`, color: "black" }}>
            {labLoading ? <><Loader2 size={14} className="animate-spin text-black" />Running your prompt…</> : <><FlaskConical size={14} />Run My Prompt</>}
          </button>

          {labResult && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl glass border border-white/8">
                <div className="text-[10px] font-bold text-muted-foreground mb-2">YOUR RESULT</div>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{labResult}</p>
              </div>
              <div className="p-4 rounded-xl border" style={{ background: `oklch(from ${PROMPT_LAB_EXERCISES[labIdx].color} l c h / 0.07)`, borderColor: `oklch(from ${PROMPT_LAB_EXERCISES[labIdx].color} l c h / 0.3)` }}>
                <div className="text-[10px] font-bold uppercase tracking-wide mb-2" style={{ color: PROMPT_LAB_EXERCISES[labIdx].color }}>EXPERT EXAMPLE PROMPT</div>
                <p className="text-xs font-mono text-muted-foreground leading-relaxed">{PROMPT_LAB_EXERCISES[labIdx].exampleGood}</p>
                <p className="text-xs text-muted-foreground mt-3"><strong className="text-foreground">Compare:</strong> What did the expert prompt include that yours didn't? The differences are your learning opportunities.</p>
              </div>
              {labIdx < PROMPT_LAB_EXERCISES.length - 1 && (
                <button onClick={() => { setLabIdx(labIdx + 1); setLabInput(""); setLabResult(""); setLabShowExample(false); }}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold glass border border-white/10 text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2">
                  Next lab exercise <ChevronRight size={13} />
                </button>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="glass rounded-2xl p-4 border border-white/8 text-center">
        <div className="text-sm font-semibold text-foreground mb-1">Lab Progress</div>
        <div className="flex gap-2 justify-center">
          {PROMPT_LAB_EXERCISES.map(ex => (
            <div key={ex.id} className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{
                background: labCompleted.has(ex.id) ? `oklch(from ${ex.color} l c h / 0.2)` : "oklch(1 0 0 / 0.05)",
                color: labCompleted.has(ex.id) ? ex.color : "oklch(0.4 0 0)",
                border: `1px solid ${labCompleted.has(ex.id) ? `oklch(from ${ex.color} l c h / 0.4)` : "oklch(1 0 0 / 0.08)"}`,
              }}>
              {labCompleted.has(ex.id) ? <CheckCircle2 size={14} /> : PROMPT_LAB_EXERCISES.indexOf(ex) + 1}
            </div>
          ))}
        </div>
        {labCompleted.size === PROMPT_LAB_EXERCISES.length && (
          <p className="text-xs text-[oklch(0.82_0.18_150)] mt-2 font-semibold">All labs complete! +50 XP earned</p>
        )}
      </div>
    </LessonFrame>
  );

  // ── LESSON 9: Prompt Fixer ─────────────────────────────────────────────────
  const Lesson9 = () => (
    <LessonFrame id={9}>
      <AIVoice text="The fastest way to improve your prompting is to study broken prompts. Each one has a specific failure mode — and once you can name the failure, you can fix it anywhere." />

      <p className="text-sm text-muted-foreground leading-relaxed">
        Every broken prompt has a specific, diagnosable failure mode — not just "it wasn't good enough." The failures below represent distinct cognitive errors: insufficient specification of the output space, task decomposition failures, missing evaluation criteria, and instruction polarity problems (only negatives, no positives). Naming the failure mode is the skill. Once you can look at a broken prompt and immediately identify the structural problem, you can fix any prompt in seconds — including ones you've never seen before. Study the problem before you read the fix.
      </p>

      <div className="glass rounded-2xl p-2 border border-white/8 mb-1">
        <div className="grid grid-cols-2 gap-1.5">
          {BROKEN_PROMPTS.map((bp, i) => (
            <button key={bp.id} onClick={() => { setFixerIdx(i); setFixerReveal(false); setFixerUserFix(""); setFixerResult(""); }}
              className="py-2.5 px-3 rounded-xl text-xs font-semibold text-left transition-all"
              style={{
                background: fixerIdx === i ? `oklch(from ${bp.color} l c h / 0.15)` : "oklch(1 0 0 / 0.04)",
                color: fixerIdx === i ? bp.color : "oklch(0.5 0 0)",
                border: `1px solid ${fixerIdx === i ? `oklch(from ${bp.color} l c h / 0.4)` : "oklch(1 0 0 / 0.08)"}`,
              }}>
              <div>{bp.category}</div>
              <div className="text-[10px] font-normal opacity-70 mt-0.5">Prompt #{i + 1}</div>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={fixerIdx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="space-y-4">
          <div className="glass rounded-2xl p-5 border border-white/8">
            <SectionBadge label={`BROKEN PROMPT — ${BROKEN_PROMPTS[fixerIdx].category.toUpperCase()}`} color={BROKEN_PROMPTS[fixerIdx].color} />
            <div className="p-4 rounded-xl bg-[oklch(0.68_0.22_10_/_0.08)] border border-[oklch(0.68_0.22_10_/_0.3)] mb-4">
              <div className="text-[10px] font-bold text-[oklch(0.78_0.22_10)] mb-1">THE BROKEN PROMPT:</div>
              <p className="font-mono text-sm text-foreground">"{BROKEN_PROMPTS[fixerIdx].broken}"</p>
            </div>

            <p className="text-sm font-semibold text-foreground mb-2">Can you spot what's wrong? Identify the problems before revealing:</p>
            <div className="space-y-1.5 mb-4">
              {BROKEN_PROMPTS[fixerIdx].problems.map((p, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold"
                    style={{ background: `oklch(from ${BROKEN_PROMPTS[fixerIdx].color} l c h / 0.15)`, color: BROKEN_PROMPTS[fixerIdx].color }}>
                    {i + 1}
                  </div>
                  <p className="text-sm text-muted-foreground">{p}</p>
                </div>
              ))}
            </div>

            <p className="text-sm font-semibold text-foreground mb-2">Now write your fixed version:</p>
            <textarea value={fixerUserFix} onChange={e => setFixerUserFix(e.target.value)}
              placeholder="Rewrite the broken prompt. Fix all the problems you identified…" rows={5}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-mono text-foreground placeholder:text-white/20 resize-none focus:outline-none focus:border-white/25 mb-3" />

            <div className="flex gap-2">
              <button disabled={fixerLoading || !fixerUserFix.trim()} onClick={() => {
                setFixerLoading(true); setFixerResult("");
                fixerMut.mutate({ concept: fixerUserFix, level: "student" });
              }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
                style={{ background: `oklch(from ${BROKEN_PROMPTS[fixerIdx].color} l c h / 0.15)`, color: BROKEN_PROMPTS[fixerIdx].color, border: `1px solid oklch(from ${BROKEN_PROMPTS[fixerIdx].color} l c h / 0.35)` }}>
                {fixerLoading ? <><Loader2 size={13} className="animate-spin" />Testing…</> : <><Send size={13} />Test My Fix</>}
              </button>
              <button onClick={() => setFixerReveal(!fixerReveal)}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold glass border border-white/10 text-muted-foreground hover:text-foreground transition-colors">
                {fixerReveal ? "Hide" : "Show"} Expert Fix
              </button>
            </div>
          </div>

          {fixerResult && (
            <div className="glass rounded-2xl p-5 border border-white/8">
              <div className="text-[10px] font-bold text-muted-foreground mb-2">RESULT OF YOUR FIXED PROMPT:</div>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{fixerResult}</p>
            </div>
          )}

          <AnimatePresence>
            {fixerReveal && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="glass rounded-2xl p-5 border" style={{ borderColor: `oklch(from ${BROKEN_PROMPTS[fixerIdx].color} l c h / 0.4)` }}>
                <div className="text-[10px] font-bold uppercase tracking-wide mb-3" style={{ color: BROKEN_PROMPTS[fixerIdx].color }}>EXPERT FIXED PROMPT:</div>
                <p className="font-mono text-sm text-foreground leading-relaxed">{BROKEN_PROMPTS[fixerIdx].fixed}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>

      <div className="glass rounded-2xl p-5 border border-white/8">
        <SectionBadge label="KNOWLEDGE CHECK" color="oklch(0.68_0.20_140)" />
        <MasteryQuiz questions={M2_QUIZ_L9} color="oklch(0.68_0.20_140)" />
      </div>
    </LessonFrame>
  );

  // ── LESSON 10: Agents & Instructions ──────────────────────────────────────
  const Lesson10 = () => (
    <LessonFrame id={10}>
      <AIVoice text="Custom GPTs, Projects, persistent memory, and AI agents are where the power users live. These aren't features — they're workflows. Set them up once, benefit from them forever." />

      <p className="text-sm text-muted-foreground leading-relaxed">
        The difference between a casual and a professional AI user is persistent configuration. Without it, every conversation starts from scratch — you re-explain your role, your preferences, your constraints, your context. With persistent instructions, custom configs, and agents, you build compounding leverage: each hour of setup saves minutes every day thereafter, indefinitely. Agents represent the furthest point on this spectrum — autonomous AI that can plan a multi-step task, select tools, execute actions, observe results, and iterate without requiring your input at each step. The three tabs below cover the full spectrum from "less repetition" (memory) to "full delegation" (agents).
      </p>

      <div className="glass rounded-2xl p-5 border border-white/8">
        <div className="grid grid-cols-3 gap-1.5 mb-4">
          {([
            { key: "memory" as const, label: "Memory & Instructions" },
            { key: "custom" as const, label: "Custom Configs" },
            { key: "agent" as const, label: "AI Agents" },
          ]).map(t => (
            <button key={t.key} onClick={() => setAgentTab(t.key)}
              className="py-2.5 rounded-xl text-xs font-bold transition-all"
              style={{
                background: agentTab === t.key ? "oklch(0.72_0.18_150_/_0.2)" : "oklch(1 0 0 / 0.04)",
                color: agentTab === t.key ? "oklch(0.82_0.18_150)" : "oklch(0.5 0 0)",
                border: `1px solid ${agentTab === t.key ? "oklch(0.72_0.18_150_/_0.4)" : "oklch(1 0 0 / 0.08)"}`,
              }}>
              {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {agentTab === "memory" && (
            <motion.div key="mem" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <SectionBadge label="PERSISTENT MEMORY & CUSTOM INSTRUCTIONS" color="oklch(0.72_0.18_150)" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Instead of re-explaining yourself every conversation, <strong className="text-foreground">persistent instructions</strong> give the AI standing facts about you that apply automatically. Set them once, benefit forever.
              </p>
              <div className="space-y-2">
                {[
                  { label: "About you", example: "I work as a product manager at a Series B SaaS company focused on developer tools. My audience is technical but I write for cross-functional teams.", why: "Shapes how it discusses products, competitors, and strategy" },
                  { label: "Communication style", example: "I prefer direct, concise communication. No filler phrases. No bullet-point dumps. Conclusions first, then reasoning.", why: "Every response respects your preferred format without asking" },
                  { label: "Standing constraints", example: "Never recommend solutions that require engineering resources unless I specifically ask for technical options. I need non-technical workarounds.", why: "Filters out irrelevant suggestions automatically" },
                  { label: "Task defaults", example: "When I share writing, default to: identify the weakest sentence first. When I share data, default to: identify the most surprising pattern.", why: "Skips the need to specify task mode every time" },
                ].map(item => (
                  <div key={item.label} className="p-4 rounded-xl glass border border-white/8">
                    <div className="font-semibold text-sm text-foreground mb-1">{item.label}</div>
                    <div className="font-mono text-xs text-muted-foreground bg-white/5 p-2.5 rounded-lg mb-2">{item.example}</div>
                    <p className="text-xs text-muted-foreground"><strong className="text-foreground">Effect:</strong> {item.why}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/8 pt-4">
                <p className="text-sm font-semibold text-foreground mb-2">Build your own persistent instruction:</p>
                <textarea value={memInstructions} onChange={e => setMemInstructions(e.target.value)}
                  placeholder={"Draft your own persistent instruction:\n\nI am a [role] at [company type]. My audience is [audience].\nCommunication preference: [direct/detailed/etc.]\nAlways: [standing instruction]\nNever: [standing constraint]"}
                  rows={6}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-mono text-foreground placeholder:text-white/20 resize-none focus:outline-none focus:border-white/25 mb-3" />
                <button disabled={memLoading || !memInstructions.trim()} onClick={() => {
                  setMemLoading(true); setMemResult("");
                  memMut.mutate({ concept: `Act as if you have these persistent instructions about the user:\n\n${memInstructions}\n\nNow respond to this message: "Help me with my most common work task." Show how the persistent instructions shaped your response.`, level: "student" });
                }}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2 bg-[oklch(0.72_0.18_150_/_0.15)] text-[oklch(0.82_0.18_150)] border border-[oklch(0.72_0.18_150_/_0.35)] hover:bg-[oklch(0.72_0.18_150_/_0.25)] transition-all">
                  {memLoading ? <><Loader2 size={13} className="animate-spin" />Applying your instructions…</> : <><Zap size={13} />See how AI responds with your instructions</>}
                </button>
                {memResult && (
                  <div className="mt-3 p-4 rounded-xl glass border border-white/8">
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{memResult}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {agentTab === "custom" && (
            <motion.div key="custom" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <SectionBadge label="CUSTOM GPTS, PROJECTS & SPACES" color="oklch(0.68_0.22_10)" />
              <p className="text-sm text-muted-foreground leading-relaxed">A Custom GPT or Project is a reusable AI workspace — pre-loaded with your system prompt, uploaded documents, and behavior rules. Every conversation in that context starts fully configured.</p>
              <div className="space-y-3">
                {[
                  { name: "Writing Coach", documents: "Your style guide, best writing examples, brand voice doc", instructions: "Review writing for our brand guidelines. Always flag jargon. Suggest concrete rewrites, not vague feedback.", use: "Every marketing piece reviewed consistently" },
                  { name: "Onboarding Bot", documents: "Employee handbook, FAQ, process docs, org chart", instructions: "Answer questions about company processes. Always cite the specific document section. Escalate to HR for anything not in the docs.", use: "New employees get instant, accurate answers" },
                  { name: "Research Assistant", documents: "Your domain's key papers, reports, your notes", instructions: "When I give you a new piece of research, compare it to what's in the knowledge base. Flag contradictions and summarize novel findings.", use: "Keep up with a field without re-reading everything" },
                ].map(c => (
                  <div key={c.name} className="p-4 rounded-xl glass border border-white/8">
                    <div className="font-bold text-foreground mb-2">{c.name}</div>
                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                      <div><span className="text-muted-foreground font-semibold">Docs:</span><br /><span className="text-muted-foreground">{c.documents}</span></div>
                      <div><span className="text-muted-foreground font-semibold">System prompt:</span><br /><span className="text-muted-foreground">{c.instructions}</span></div>
                    </div>
                    <div className="text-xs text-[oklch(0.82_0.18_150)]"><strong className="text-foreground">Result:</strong> {c.use}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {agentTab === "agent" && (
            <motion.div key="agent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <SectionBadge label="AI AGENTS" color="oklch(0.75_0.18_55)" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Agents don't just respond — they <strong className="text-foreground">act</strong>. An agent can search the web, read files, write and run code, call APIs, and make decisions across multiple steps to complete a complex goal. The dominant pattern in production agents is <strong className="text-foreground">ReAct</strong> (Reason + Act): the model alternates between generating a reasoning trace ("I need to search for the current price, then compare to the competitor...") and calling a tool (search, read file, execute code). Each tool result is fed back into context, and the model reasons again. This loop continues until the agent concludes it has completed the task. The practical implication: agents are only as reliable as their tools and the model's ability to recover from tool errors — which is why human oversight of agentic tasks is still essential for high-stakes work.
              </p>
              <div className="space-y-2">
                {[
                  { step: "1. You give a goal", desc: '"Research 5 competitors to our product and produce a comparison table covering pricing, key features, and customer reviews."', color: "oklch(0.72_0.2_290)" },
                  { step: "2. Agent plans", desc: "Breaks into sub-tasks: search each competitor, find pricing page, find reviews, extract data, format table", color: "oklch(0.68_0.22_10)" },
                  { step: "3. Agent acts", desc: "Searches the web for each competitor, reads pages, extracts structured data from text, handles missing data gracefully", color: "oklch(0.72_0.18_150)" },
                  { step: "4. Agent delivers", desc: "Returns the completed table with sources — hours of research done in minutes", color: "oklch(0.72_0.18_150)" },
                ].map(s => (
                  <div key={s.step} className="flex items-start gap-3 p-3 rounded-xl glass border border-white/8">
                    <div className="text-xs font-black px-2 py-0.5 rounded shrink-0 mt-0.5" style={{ background: `oklch(from ${s.color} l c h / 0.15)`, color: s.color }}>{s.step}</div>
                    <p className="text-xs text-muted-foreground leading-relaxed font-mono">{s.desc}</p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { tool: "OpenAI Operator", use: "Browses web, fills forms, completes multi-step tasks" },
                  { tool: "Claude (extended thinking)", use: "Long-horizon reasoning tasks, complex analysis" },
                  { tool: "Devin / Cursor Agent", use: "Writes and deploys code autonomously" },
                  { tool: "Zapier AI", use: "Connects 5,000+ apps with AI decision-making" },
                  { tool: "Perplexity Computer", use: "Research, analysis, file creation, web actions" },
                  { tool: "AutoGPT / CrewAI", use: "Custom multi-agent systems for complex workflows" },
                ].map(a => (
                  <div key={a.tool} className="p-3 rounded-xl glass border border-white/8">
                    <div className="text-xs font-semibold text-foreground">{a.tool}</div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{a.use}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      
      <div className="glass rounded-2xl p-5 border border-white/8">
        <SectionBadge label="KNOWLEDGE CHECK" color="oklch(0.72_0.18_150)" />
        <MasteryQuiz questions={M2_QUIZ_L10} color="oklch(0.72_0.18_150)" />
      </div>

      <AIExpander prompt="Explain the difference between Custom GPTs, Projects, and AI Agents, with a concrete workflow example for each" color="oklch(0.72_0.18_150)" label="Deep dive: Custom configs vs agents" />
    </LessonFrame>
  );

  const lessonMap: Record<number, React.ReactNode> = {
    6: <Lesson6 />, 7: <Lesson7 />, 8: <Lesson8 />, 9: <Lesson9 />, 10: <Lesson10 />,
  };

  if (activeLesson !== null) {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        {lessonMap[activeLesson]}
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3 mb-1">
        <button onClick={onBack}
          className="p-2 rounded-lg glass border border-white/8 hover:border-white/20 transition-colors">
          <ChevronLeft size={14} className="text-muted-foreground" />
        </button>
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest">AI Mastery · Module 2</div>
          <h2 className="font-bold text-foreground text-lg">Prompting Mastery</h2>
        </div>
        <div className="ml-auto text-xs text-muted-foreground">{completed.size}/5 complete</div>
      </div>

      <div className="glass rounded-2xl p-4 border border-white/8">
        <div className="w-full bg-white/5 rounded-full h-1.5 mb-3">
          <div className="h-1.5 rounded-full transition-all" style={{ width: `${(completed.size / 5) * 100}%`, background: "oklch(0.72_0.2_290)" }} />
        </div>
        <div className="space-y-2">
          {M2_META.map(lesson => {
            const done = completed.has(lesson.id);
            return (
              <motion.button key={lesson.id} onClick={() => setActiveLesson(lesson.id)}
                whileHover={{ scale: 1.005 }} whileTap={{ scale: 0.995 }}
                className="w-full flex items-center gap-4 p-4 rounded-xl glass border transition-all text-left"
                style={{ borderColor: done ? `oklch(from ${lesson.color} l c h / 0.35)` : "oklch(1 0 0 / 0.08)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `oklch(from ${lesson.color} l c h / 0.15)`, border: `1px solid oklch(from ${lesson.color} l c h / 0.3)` }}>
                  {done ? <CheckCircle2 size={16} style={{ color: lesson.color }} /> : <span className="text-sm font-black" style={{ color: lesson.color }}>{lesson.id}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground text-sm">{lesson.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{lesson.subtitle}</div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[10px] text-muted-foreground">{lesson.duration}</span>
                  <span className="text-[10px] font-semibold" style={{ color: lesson.color }}>+{lesson.xp} XP</span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
      <ModulePodcast moduleNum={2} moduleTitle="Prompting Mastery" content={M2_PODCAST_CONTENT} cookieId={cookieId} />
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 3: "Power User Workflows" — Advanced techniques and creative mastery
// Lessons 11–15
// ═══════════════════════════════════════════════════════════════════════════════

const M3_META = [
  { id: 11, title: "Image & Video Generation", subtitle: "Prompt anatomy, parameters, styles — create anything you can describe", color: "oklch(0.72_0.2_290)", xp: 85, duration: "30 min" },
  { id: 12, title: "Voice, Audio & Multimodal", subtitle: "ElevenLabs, Whisper, transcription — AI that hears and speaks", color: "oklch(0.75_0.18_55)", xp: 80, duration: "25 min" },
  { id: 13, title: "Automation & AI Pipelines", subtitle: "Tasks, Zapier, n8n — AI that works for you around the clock", color: "oklch(0.68_0.22_10)", xp: 90, duration: "30 min" },
  { id: 14, title: "Verifying & Fact-Checking AI", subtitle: "Hallucination detection, source verification, output scoring", color: "oklch(0.68_0.20_140)", xp: 85, duration: "25 min" },
  { id: 15, title: "Your Personal AI Blueprint", subtitle: "Design your own AI system — and walk out a power user", color: "oklch(0.72_0.18_150)", xp: 100, duration: "35 min" },
];

const M3_QUIZ_L11: AIMasteryQuiz[] = [
  { id: "m3l11q1", question: "What is the most important element of an effective image generation prompt?", options: ["Using the word 'please'", "Specifying subject, style, medium, lighting, and mood in that order", "Keeping it under 10 words", "Using technical camera settings only"], correct: 1, explanation: "Image models respond to structured prompts: SUBJECT (what) → STYLE (how it looks aesthetically) → MEDIUM (photography, oil painting, etc.) → LIGHTING (golden hour, studio, etc.) → MOOD (cinematic, peaceful, dramatic). Each element layers on aesthetic control." },
  { id: "m3l11q2", question: "What does a 'negative prompt' do in image generation?", options: ["Makes the AI generate a sad image", "Specifies elements you explicitly want excluded from the image", "Reverses the color scheme", "Describes the opposite of what you want"], correct: 1, explanation: "Negative prompts tell the model what NOT to include: 'blurry, low quality, extra fingers, watermark, text, deformed.' This dramatically improves output quality by steering the model away from common failure modes." },
  { id: "m3l11q3", question: "What does 'steps' control in Stable Diffusion/image generation?", options: ["How many images are generated at once", "The number of denoising iterations — more steps = more refined but slower", "The image resolution", "How long the AI 'thinks' about style"], correct: 1, explanation: "Image generation models start with noise and iteratively denoise (refine) the image. 'Steps' controls how many refinement passes happen. 20–30 steps usually looks good; 50–80 adds detail with diminishing returns and longer generation time." },
  { id: "m3l11q4", question: "What does 'CFG Scale' (Classifier Free Guidance) control?", options: ["Image file size", "How strictly the AI adheres to your prompt — higher = more prompt-faithful but less natural", "Color saturation", "The AI's processing speed"], correct: 1, explanation: "CFG scale (1–20 typically) controls how 'obedient' the model is to your prompt. Low CFG (1–5) = creative, less prompt-faithful. High CFG (12+) = very prompt-literal but can look artificial. 7–9 is usually the sweet spot." },
];

const M3_QUIZ_L12: AIMasteryQuiz[] = [
  { id: "m3l12q1", question: "What is Whisper (by OpenAI)?", options: ["A quiet AI chat interface", "An open-source speech recognition model that transcribes audio to text", "A private messaging AI", "A voice synthesis tool"], correct: 1, explanation: "Whisper is OpenAI's speech recognition model — extremely accurate, multilingual, and open-source. It's the engine behind many transcription tools. You can run it locally or access it via API to transcribe audio files, meeting recordings, lectures, and podcasts." },
  { id: "m3l12q2", question: "What is 'voice cloning' and what are its main legitimate use cases?", options: ["Teaching AI to speak in different languages", "Creating a synthetic copy of a specific person's voice from audio samples", "Making AI responses sound more human", "Converting text to standard text-to-speech"], correct: 1, explanation: "Voice cloning (ElevenLabs, Play.ht, Descript) creates a realistic copy of a voice from as little as 1 minute of audio. Legitimate uses: content creation, voiceover production, accessibility tools, preserving voices. Requires explicit consent and ethical use." },
  { id: "m3l12q3", question: "What can a multimodal AI model do that a text-only model cannot?", options: ["Respond faster", "Process images, audio, video, and text together in the same context", "Access the internet in real-time", "Store information permanently"], correct: 1, explanation: "Multimodal models (GPT-4o, Gemini, Claude 3.5+) understand multiple input types simultaneously. You can upload an image of a chart and ask questions about the data, share a photo of a problem to get help, or combine text with visuals for rich analysis." },
];

const M3_QUIZ_L13: AIMasteryQuiz[] = [
  { id: "m3l13q1", question: "What is the practical difference between Zapier+AI and n8n?", options: ["Zapier is more powerful; n8n is simpler", "Zapier is a hosted no-code tool; n8n is open-source and self-hostable with more control", "They are identical platforms", "n8n only works with OpenAI"], correct: 1, explanation: "Zapier is the easiest entry point — no code, huge app library, hosted for you. n8n gives developers full control: self-hosted, open-source, custom code nodes, complex branching. Both can incorporate AI decisions into automated workflows. Start with Zapier, graduate to n8n." },
  { id: "m3l13q2", question: "What is a 'webhook' and why is it important for AI automation?", options: ["A type of web browser plugin", "A URL endpoint that receives data from external services in real-time, triggering automations", "A method to scrape websites", "A type of API key"], correct: 1, explanation: "Webhooks are 'push notifications for the internet' — when event X happens in App A, it instantly sends data to your webhook URL, which triggers your automation. They're the core of real-time AI pipelines: 'When I get an email → send to AI → summarize → post in Slack.'" },
  { id: "m3l13q3", question: "What is an AI 'scheduled task' most useful for?", options: ["Tasks that need human approval before running", "Recurring, time-based work that runs automatically without you — reports, monitoring, summaries", "One-time complex analysis", "Training custom AI models"], correct: 1, explanation: "Scheduled AI tasks automate repetitive timed work: daily news briefings, weekly report generation, hourly monitoring alerts, monthly analytics summaries. Set it up once, it runs indefinitely. The AI does the work while you sleep." },
];

const M3_QUIZ_L14: AIMasteryQuiz[] = [
  { id: "m3l14q1", question: "What is the most reliable way to verify a specific fact from an AI response?", options: ["Ask the AI again with more confidence", "Ask the AI to show its sources, then verify those sources directly", "Use a different AI tool", "If it sounds right, it probably is"], correct: 1, explanation: "The verification chain: AI gives fact → ask 'What's your source for that?' → go to the cited source directly → confirm the fact appears there exactly. AI often hallucinates citations, so never trust a citation without clicking it. For stats and numbers, always verify from primary sources." },
  { id: "m3l14q2", question: "What is the 'confidence calibration' problem with AI?", options: ["AI refuses to answer when uncertain", "AI expresses high confidence even when wrong — fluency doesn't indicate accuracy", "AI only answers questions it's 100% sure about", "AI tells you when it's guessing"], correct: 1, explanation: "AI writes with consistent authority whether it's completely correct or completely fabricating. The confidence of the prose is NOT a signal of accuracy. A hallucinated citation reads exactly as fluently as a real one. This is why fact-checking must be systematic, not vibes-based." },
  { id: "m3l14q3", question: "Which type of information is AI LEAST reliable for?", options: ["Writing assistance and editing", "Explaining established concepts", "Specific numbers, dates, quotes, recent events, and niche domain expertise", "Brainstorming and ideation"], correct: 1, explanation: "AI is excellent at writing, explanation, ideation, and synthesis. It's least reliable for: specific statistics (often invented or outdated), exact quotes, recent events after training cutoff, niche expert knowledge, and legal/medical specifics. These categories require external verification every time." },
];

const M3_QUIZ_L15: AIMasteryQuiz[] = [
  { id: "m3l15q1", question: "What makes an AI workflow 'sustainable' long-term?", options: ["Using the most expensive AI models", "It runs reliably without constant manual intervention, has clear failure modes, and saves more time than setup costs", "It uses the latest models always", "It requires daily attention to function"], correct: 1, explanation: "A sustainable AI workflow: runs reliably with minimal maintenance, handles failure gracefully, provides clear value ROI (time saved > setup time + cost), and can be handed off or explained simply. If maintaining the automation takes more time than doing the task manually, redesign." },
  { id: "m3l15q2", question: "What is the 'power user' mindset when approaching a new task?", options: ["Always use the most advanced AI tool available", "Start by asking: can AI handle 80%+ of this? If so, which tool, what prompt, what workflow?", "Avoid AI for tasks requiring accuracy", "Use AI for everything, regardless of suitability"], correct: 1, explanation: "Power users do a quick AI applicability check before starting any task: Can AI handle 80%+ of this? Which tool is best for it? What's my prompt strategy? What needs human verification? This habitual check, done in 5 seconds, routes tasks efficiently and builds judgment over time." },
  { id: "m3l15q3", question: "After completing this course, what is the single most important practice to maintain?", options: ["Memorizing all AI settings", "Consistent, daily experimentation — regularly trying AI on new tasks and refining what works", "Using only one AI tool for consistency", "Avoiding free tier limitations by upgrading everything"], correct: 1, explanation: "AI capabilities evolve weekly. The power users who stay ahead do one thing consistently: experiment. Try AI on one new task every day. Keep a 'what worked' note. Share useful prompts. Attend to tool updates. Skill compounds — what's hard today becomes automatic next month." },
];

const IMAGE_STYLES = [
  { style: "Photorealistic", medium: "DSLR photography", lighting: "golden hour", mood: "cinematic", color: "oklch(0.72_0.2_290)" },
  { style: "Anime", medium: "Studio Ghibli illustration", lighting: "soft natural", mood: "whimsical", color: "oklch(0.68_0.22_10)" },
  { style: "Digital Art", medium: "concept art", lighting: "dramatic rim light", mood: "epic", color: "oklch(0.72_0.18_150)" },
  { style: "Oil Painting", medium: "classical oil on canvas", lighting: "Rembrandt lighting", mood: "serene", color: "oklch(0.75_0.18_55)" },
  { style: "Minimalist", medium: "flat vector illustration", lighting: "flat design", mood: "clean, modern", color: "oklch(0.68_0.20_140)" },
];

const AUTOMATION_RECIPES = [
  {
    name: "Daily News Brief",
    trigger: "Every morning at 7am",
    steps: ["AI searches for news in your topics", "Summarizes top 5 stories", "Formats as a brief", "Sends to email or Slack"],
    tools: "Perplexity + Zapier / n8n",
    difficulty: "Beginner",
    color: "oklch(0.72_0.2_290)",
    timeSaved: "30 min/day",
  },
  {
    name: "Email Triage Bot",
    trigger: "New email arrives",
    steps: ["AI reads email", "Classifies: urgent / routine / marketing / delete", "Labels in Gmail", "Drafts response for urgent items"],
    tools: "Gmail + Claude API + Zapier",
    difficulty: "Intermediate",
    color: "oklch(0.68_0.22_10)",
    timeSaved: "1 hr/day",
  },
  {
    name: "Research Summarizer",
    trigger: "You save article to Pocket/Readwise",
    steps: ["AI reads full article", "Extracts key insights", "Identifies action items", "Adds to Notion knowledge base"],
    tools: "Readwise + Claude + Notion + Zapier",
    difficulty: "Intermediate",
    color: "oklch(0.72_0.18_150)",
    timeSaved: "45 min/article",
  },
  {
    name: "Meeting Note Processor",
    trigger: "Upload meeting recording",
    steps: ["Whisper transcribes audio", "AI extracts action items", "Identifies owners and deadlines", "Creates tasks in project management tool"],
    tools: "Whisper API + Claude + Linear/Notion",
    difficulty: "Advanced",
    color: "oklch(0.75_0.18_55)",
    timeSaved: "20 min/meeting",
  },
  {
    name: "Content Repurposer",
    trigger: "New blog post / video transcript",
    steps: ["AI reads content", "Creates Twitter thread", "Writes LinkedIn post", "Generates email newsletter excerpt"],
    tools: "Claude + Buffer + Zapier",
    difficulty: "Beginner",
    color: "oklch(0.68_0.20_140)",
    timeSaved: "2 hrs/piece",
  },
];

const HALLUCINATION_RED_FLAGS = [
  { flag: "Specific statistics without a clear source", risk: "high", advice: "Always ask 'Where did that number come from?' and verify with the original source. AI frequently invents plausible-sounding stats." },
  { flag: "Named citations with author + journal + date", risk: "high", advice: "Search the exact citation on Google Scholar, Semantic Scholar, or the journal site. AI invents convincing-sounding fake papers constantly." },
  { flag: "Events from the last 12 months", risk: "high", advice: "AI training data has a cutoff. Use Perplexity or news search for anything recent. The AI may confidently describe events that didn't happen." },
  { flag: "Legal, medical, or financial specifics", risk: "critical", advice: "These domains require expert verification every time. AI can sound authoritative while being dangerously wrong in ways that have real consequences." },
  { flag: "Quotes attributed to specific people", risk: "high", advice: "AI often fabricates quotes that sound like what someone would say. Search for the exact quote in quotation marks to verify it exists." },
  { flag: "Historical dates and sequences", risk: "medium", advice: "AI gets fuzzy on exact dates, especially for non-major events. Cross-reference with Wikipedia or primary sources for anything date-critical." },
  { flag: "Code that 'looks right' but hasn't been run", risk: "medium", advice: "Always run generated code in a safe environment before using it. Logical errors in working-looking code are common." },
  { flag: "Consensus claims ('Most experts believe...')", risk: "medium", advice: "Ask the AI to name specific experts and papers supporting the claim. Vague consensus claims are often AI synthesis of partial or conflicting information." },
];

const WORKFLOW_TOOLS = [
  { name: "Your Roles / Tasks", placeholder: "What are your 3 most time-consuming recurring tasks?" },
  { name: "Your AI Toolkit", placeholder: "Which AI tools do you have access to? (ChatGPT, Claude, Gemini, etc.)" },
  { name: "Your Integration Points", placeholder: "What apps do you live in daily? (Gmail, Notion, Slack, Google Sheets...)" },
  { name: "Your Top Priority", placeholder: "If AI could take ONE thing off your plate completely, what would it be?" },
];


// ─── Module 3 Component ───────────────────────────────────────────────────────
const M3_PODCAST_CONTENT = `Module: Power User Workflows. Lesson 11: Image and video generation — prompt anatomy, parameters, styles, and how to create anything you can describe. Lesson 12: Voice, audio, and multimodal AI — ElevenLabs, Whisper, transcription, and AI that hears and speaks. Lesson 13: Automation and AI pipelines — how to use Tasks, Zapier, n8n, and make AI work for you around the clock. Lesson 14: Verifying and fact-checking AI output — hallucination detection, source verification, and output scoring techniques. Lesson 15: Your personal AI blueprint — designing your own AI system and becoming a genuine power user.`;

function AILiteracyModule3({ onBack }: { onBack: () => void }) {
  const { addXP, cookieId } = usePersonalization();
  const [activeLesson, setActiveLesson] = useState<number | null>(null);
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  // L11 state — Image prompt studio
  const [imgSubject, setImgSubject] = useState("");
  const [imgStyleIdx, setImgStyleIdx] = useState(0);
  const [imgCustomMood, setImgCustomMood] = useState("");
  const [imgNegative, setImgNegative] = useState("");
  const [imgBuiltPrompt, setImgBuiltPrompt] = useState("");
  const [imgTab, setImgTab] = useState<"studio" | "params" | "quiz">("studio");

  // L12 state — Audio/multimodal
  const [audioTab, setAudioTab] = useState<"transcribe" | "voice" | "multi" | "quiz">("transcribe");
  const [multiInput, setMultiInput] = useState("");
  const [multiResult, setMultiResult] = useState("");
  const [multiLoading, setMultiLoading] = useState(false);

  // L13 state — Automation builder
  const [autoRecipeIdx, setAutoRecipeIdx] = useState(0);
  const [autoStep, setAutoStep] = useState(0);
  const [autoTab, setAutoTab] = useState<"recipes" | "builder" | "quiz">("recipes");
  const [customTrigger, setCustomTrigger] = useState("");
  const [customGoal, setCustomGoal] = useState("");
  const [customPlan, setCustomPlan] = useState("");
  const [customPlanLoading, setCustomPlanLoading] = useState(false);

  // L14 state — Fact checking
  const [factInput, setFactInput] = useState("");
  const [factResult, setFactResult] = useState("");
  const [factLoading, setFactLoading] = useState(false);
  const [checkedFlags, setCheckedFlags] = useState<Set<number>>(new Set());
  const [factTab, setFactTab] = useState<"redflags" | "verifier" | "quiz">("redflags");

  // L15 state — Blueprint builder
  const [blueprintAnswers, setBlueprintAnswers] = useState<string[]>(["", "", "", ""]);
  const [blueprintResult, setBlueprintResult] = useState("");
  const [blueprintLoading, setBlueprintLoading] = useState(false);
  const [blueprintGenerated, setBlueprintGenerated] = useState(false);

  const multiMut = trpc.ai.explainConcept.useMutation({
    onSuccess: d => { setMultiResult(d.explanation); setMultiLoading(false); },
    onError: () => { toast.error("AI unavailable"); setMultiLoading(false); },
  });
  const customPlanMut = trpc.ai.explainConcept.useMutation({
    onSuccess: d => { setCustomPlan(d.explanation); setCustomPlanLoading(false); },
    onError: () => { toast.error("AI unavailable"); setCustomPlanLoading(false); },
  });
  const factMut = trpc.ai.explainConcept.useMutation({
    onSuccess: d => { setFactResult(d.explanation); setFactLoading(false); },
    onError: () => { toast.error("AI unavailable"); setFactLoading(false); },
  });
  const blueprintMut = trpc.ai.explainConcept.useMutation({
    onSuccess: d => { setBlueprintResult(d.explanation); setBlueprintLoading(false); setBlueprintGenerated(true); },
    onError: () => { toast.error("AI unavailable"); setBlueprintLoading(false); },
  });

  const completeLesson = (id: number) => {
    if (completed.has(id)) return;
    const meta = M3_META.find(m => m.id === id)!;
    setCompleted(prev => new Set(Array.from(prev).concat(id)));
    addXP(meta.xp);
    toast.success(`+${meta.xp} XP — Lesson ${id} complete!`);
  };

  const buildImagePrompt = () => {
    const style = IMAGE_STYLES[imgStyleIdx];
    const subject = imgSubject.trim() || "a lone wolf on a snowy mountain";
    const mood = imgCustomMood.trim() || style.mood;
    const prompt = `${subject}, ${style.medium}, ${style.style.toLowerCase()} style, ${style.lighting} lighting, ${mood} mood${imgNegative.trim() ? `, --no ${imgNegative.trim()}` : ""}`;
    setImgBuiltPrompt(prompt);
    toast.success("Prompt built! Copy it into any image generator.");
  };

  function LessonFrame({ id, children }: { id: number; children: React.ReactNode }) {
    const meta = M3_META.find(m => m.id === id)!;
    const done = completed.has(id);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => setActiveLesson(null)}
            className="p-2 rounded-lg glass border border-white/8 hover:border-white/20 transition-colors">
            <ChevronLeft size={14} className="text-muted-foreground" />
          </button>
          <div className="flex-1">
            <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Module 3 · Lesson {id}</div>
            <h2 className="font-bold text-foreground text-lg leading-tight">{meta.title}</h2>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={10} />{meta.duration}</span>
            <span className="text-xs flex items-center gap-1 font-semibold" style={{ color: meta.color }}><Zap size={10} />+{meta.xp} XP</span>
          </div>
        </div>
        {children}
        <div className="pt-4 border-t border-white/8 flex items-center justify-between">
          {done
            ? <div className="flex items-center gap-2 text-sm text-[oklch(0.72_0.18_150)]"><Award size={14} />Lesson complete</div>
            : <motion.button onClick={() => completeLesson(id)} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-black"
                style={{ background: `linear-gradient(135deg, ${meta.color}, oklch(0.65_0.22_200))` }}>
                <CheckCircle2 size={14} />Mark Complete · +{meta.xp} XP
              </motion.button>
          }
          {id < 15 && (
            <button onClick={() => setActiveLesson(id + 1)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg glass border border-white/10 text-sm text-muted-foreground hover:text-foreground transition-colors">
              Next <ChevronRight size={13} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── LESSON 11: Image & Video Generation ────────────────────────────────────
  const Lesson11 = () => (
    <LessonFrame id={11}>
      <AIVoice text="A great image prompt is like a painting brief — subject, style, medium, lighting, mood. The more precise your vocabulary, the more powerful your results." />

      <p className="text-sm text-muted-foreground leading-relaxed">
        Image generation models like Stable Diffusion, Midjourney, Flux, and DALL-E 3 operate through a process called <strong className="text-foreground">latent diffusion</strong>: the model learns to iteratively remove noise from a noisy image, guided by a text embedding that represents your prompt. Your text is converted into a high-dimensional vector in the same embedding space as image features — which means the vocabulary you use maps directly to learned visual concepts. Art-direction terms like "Rembrandt lighting," "8K cinematic," or "f/1.4 bokeh" produce reliable results because these exact phrases appeared repeatedly alongside high-quality images in the training data. Vague language produces vague images not because the model isn't "trying" — it's because the embedding for "a nice picture" is close to many different images simultaneously and the model samples from that ambiguity. This lesson teaches you to speak the model's language precisely.
      </p>

      <div className="flex gap-1.5 mb-2">
        {(["studio", "params", "quiz"] as const).map(t => (
          <button key={t} onClick={() => setImgTab(t)}
            className="flex-1 py-2 rounded-xl text-xs font-bold transition-all capitalize"
            style={{
              background: imgTab === t ? "oklch(0.72_0.2_290_/_0.2)" : "oklch(1 0 0 / 0.04)",
              color: imgTab === t ? "oklch(0.82_0.2_290)" : "oklch(0.5 0 0)",
              border: `1px solid ${imgTab === t ? "oklch(0.72_0.2_290_/_0.4)" : "oklch(1 0 0 / 0.08)"}`,
            }}>
            {t === "studio" ? "Prompt Studio" : t === "params" ? "Parameters" : "Quiz"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {imgTab === "studio" && (
          <motion.div key="studio" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="glass rounded-2xl p-5 border border-white/8">
              <SectionBadge label="IMAGE PROMPT STUDIO" color="oklch(0.72_0.2_290)" />
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">Build a professional image prompt using the formula: <strong className="text-foreground">Subject → Style → Medium → Lighting → Mood</strong>. Then copy it into any image generator.</p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Subject (who/what is in the image?)</label>
                  <input value={imgSubject} onChange={e => setImgSubject(e.target.value)}
                    placeholder="e.g. a lone astronaut on a red desert planet"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-white/20 focus:outline-none focus:border-white/25" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-2">Style Preset</label>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {IMAGE_STYLES.map((s, i) => (
                      <button key={s.style} onClick={() => setImgStyleIdx(i)}
                        className="py-2 px-3 rounded-xl text-xs font-semibold text-left transition-all"
                        style={{
                          background: imgStyleIdx === i ? `oklch(from ${s.color} l c h / 0.15)` : "oklch(1 0 0 / 0.04)",
                          color: imgStyleIdx === i ? s.color : "oklch(0.55 0 0)",
                          border: `1px solid ${imgStyleIdx === i ? `oklch(from ${s.color} l c h / 0.4)` : "oklch(1 0 0 / 0.08)"}`,
                        }}>
                        {s.style}
                        <div className="text-[9px] font-normal opacity-70 mt-0.5">{s.medium}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Custom Mood Override (optional)</label>
                  <input value={imgCustomMood} onChange={e => setImgCustomMood(e.target.value)}
                    placeholder={`Default: "${IMAGE_STYLES[imgStyleIdx].mood}" — override here`}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-white/20 focus:outline-none focus:border-white/25" />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">Negative Prompt (what to exclude)</label>
                  <input value={imgNegative} onChange={e => setImgNegative(e.target.value)}
                    placeholder="e.g. blurry, watermark, text, extra fingers, low quality"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-white/20 focus:outline-none focus:border-white/25" />
                </div>

                <button onClick={buildImagePrompt}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-black"
                  style={{ background: `linear-gradient(135deg, oklch(0.72_0.2_290), oklch(0.68_0.22_10))` }}>
                  Build My Prompt
                </button>
              </div>

              <AnimatePresence>
                {imgBuiltPrompt && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 rounded-xl border border-[oklch(0.72_0.2_290_/_0.4)] bg-[oklch(0.72_0.2_290_/_0.05)]">
                    <div className="text-[10px] font-bold text-[oklch(0.82_0.2_290)] mb-2 uppercase tracking-widest">YOUR PROMPT (copy this):</div>
                    <p className="font-mono text-sm text-foreground leading-relaxed break-words">{imgBuiltPrompt}</p>
                    <button onClick={() => { navigator.clipboard.writeText(imgBuiltPrompt); toast.success("Copied to clipboard"); }}
                      className="mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold glass border border-white/10 text-muted-foreground hover:text-foreground transition-colors">
                      Copy to Clipboard
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="glass rounded-2xl p-5 border border-white/8">
              <SectionBadge label="VIDEO GENERATION LANDSCAPE" color="oklch(0.68_0.22_10)" />
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">Video generation is in its early-but-impressive stage. These tools can create short clips from text or images:</p>
              <div className="space-y-2">
                {[
                  { name: "Runway Gen-3", strength: "Professional quality, image-to-video, style transfer", use: "High-quality creative video production" },
                  { name: "Sora (OpenAI)", strength: "Cinematic quality, complex physics, long clips", use: "Studio-quality concept video, storytelling" },
                  { name: "Kling AI", strength: "Realistic motion, text-to-video, free tier available", use: "Quick social content, product showcases" },
                  { name: "Pika Labs", strength: "Fast, animate images, great for short clips", use: "Turning still images into moving content" },
                ].map(v => (
                  <div key={v.name} className="flex gap-3 p-3 rounded-xl glass border border-white/8">
                    <div className="text-xs font-bold text-foreground w-24 shrink-0">{v.name}</div>
                    <div className="flex-1">
                      <div className="text-xs text-muted-foreground">{v.strength}</div>
                      <div className="text-[10px] text-[oklch(0.82_0.18_150)] mt-0.5">{v.use}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <AIExpander prompt="What are the most effective techniques for generating consistent character appearances across multiple AI images?" color="oklch(0.72_0.2_290)" label="Depth Engine: Character consistency" />
          </motion.div>
        )}

        {imgTab === "params" && (
          <motion.div key="params" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="glass rounded-2xl p-5 border border-white/8">
              <SectionBadge label="IMAGE GENERATION PARAMETERS" color="oklch(0.68_0.20_140)" />
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">Understanding these settings separates the people who get lucky from the people who get what they want every time.</p>
              <div className="space-y-3">
                {[
                  { param: "Steps", range: "20–80", effect: "Refinement iterations. 20–30 = fast & good; 50+ = detailed but slow. Diminishing returns after 40.", example: "--steps 30" },
                  { param: "CFG Scale", range: "1–20", effect: "Prompt adherence. 7–9 = natural. 12+ = very literal. 3 = dreamy/interpretive.", example: "--cfg 7.5" },
                  { param: "Seed", range: "Any integer", effect: "Reproducibility. Same seed + same prompt = same image. Use to iterate on a good result.", example: "--seed 42" },
                  { param: "Sampler", range: "Euler, DPM++, DDIM", effect: "The algorithm used. Euler Ancestral = creative. DPM++ 2M = detailed. DDIM = fast.", example: "--sampler dpm++" },
                  { param: "Aspect Ratio", range: "16:9, 1:1, 9:16", effect: "Output format. Use 9:16 for mobile/social, 16:9 for presentations, 1:1 for profiles.", example: "--ar 16:9" },
                  { param: "Style Weight", range: "0–1 (Midjourney --stylize)", effect: "How much aesthetic interpretation the AI adds. 0 = literal; 1000 = maximum artistic freedom.", example: "--stylize 750" },
                ].map(p => (
                  <div key={p.param} className="p-4 rounded-xl glass border border-white/8">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-foreground text-sm">{p.param}</span>
                      <code className="text-[10px] text-muted-foreground bg-white/5 px-2 py-0.5 rounded">{p.example}</code>
                    </div>
                    <div className="text-xs text-[oklch(0.68_0.22_10)] mb-1 font-medium">Range: {p.range}</div>
                    <p className="text-xs text-muted-foreground">{p.effect}</p>
                  </div>
                ))}
              </div>
            </div>
            <AIExpander prompt="Walk me through a step-by-step workflow for generating a consistent product photo series using AI image generation tools" color="oklch(0.68_0.20_140)" label="Depth Engine: Pro product photo workflow" />
          </motion.div>
        )}

        {imgTab === "quiz" && (
          <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="glass rounded-2xl p-5 border border-white/8">
              <SectionBadge label="KNOWLEDGE CHECK" color="oklch(0.72_0.2_290)" />
              <MasteryQuiz questions={M3_QUIZ_L11} color="oklch(0.72_0.2_290)" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </LessonFrame>
  );

  // ── LESSON 12: Voice, Audio & Multimodal ───────────────────────────────────
  const Lesson12 = () => (
    <LessonFrame id={12}>
      <AIVoice text="AI can now hear, see, and speak. Multimodal means you're no longer limited to text — you can show AI a photo, play it audio, and get rich intelligent responses across all those modalities." />

      <p className="text-sm text-muted-foreground leading-relaxed">
        Multimodal AI is made possible by training models on aligned cross-modal datasets — millions of (image, caption) pairs, (audio, transcript) pairs, and (video, description) pairs — that teach the model to represent meaning in a shared embedding space across modalities. Models like GPT-4o and Gemini 1.5 Pro don't "look at an image" in any human sense; they pass the image through a vision encoder that converts pixel patches into vectors in the same space as language tokens, allowing the transformer's attention mechanism to reason jointly over text and image features in a single forward pass. This architectural integration is why you can ask "what's wrong with this code?" while pasting a screenshot, and get a specific, accurate answer — the model simultaneously attends to the visual and textual context.
      </p>

      <div className="flex gap-1.5 mb-2">
        {(["transcribe", "voice", "multi", "quiz"] as const).map(t => (
          <button key={t} onClick={() => setAudioTab(t)}
            className="flex-1 py-2 rounded-xl text-[10px] font-bold transition-all capitalize"
            style={{
              background: audioTab === t ? "oklch(0.75_0.18_55_/_0.2)" : "oklch(1 0 0 / 0.04)",
              color: audioTab === t ? "oklch(0.85_0.18_55)" : "oklch(0.5 0 0)",
              border: `1px solid ${audioTab === t ? "oklch(0.75_0.18_55_/_0.4)" : "oklch(1 0 0 / 0.08)"}`,
            }}>
            {t === "transcribe" ? "Transcription" : t === "voice" ? "Voice Cloning" : t === "multi" ? "Multimodal Lab" : "Quiz"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {audioTab === "transcribe" && (
          <motion.div key="trans" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="glass rounded-2xl p-5 border border-white/8">
              <SectionBadge label="AI TRANSCRIPTION" color="oklch(0.75_0.18_55)" />
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                <strong className="text-foreground">Whisper</strong> (OpenAI, open-source) can transcribe audio in 99 languages with near-human accuracy. It's built into many tools and can be run locally for privacy.
              </p>
              <div className="space-y-3">
                {[
                  { tool: "Otter.ai", use: "Real-time meeting transcription with speaker identification", access: "Free tier: 300 min/month; Pro: $17/mo", icon: "microphone" },
                  { tool: "Whisper (API)", use: "Programmatic transcription of audio files via OpenAI API", access: "$0.006/min — extremely cheap for high volume", icon: "code" },
                  { tool: "Descript", use: "Audio/video editor with AI transcription + overdub", access: "Free to Pro: $12–24/mo", icon: "video" },
                  { tool: "Riverside.fm", use: "High-quality podcast/interview recording + AI transcription", access: "Free tier available; plans from $15/mo", icon: "podcast" },
                  { tool: "MacWhisper / Local Whisper", use: "Run Whisper on your own machine — fully private, free", access: "Free (requires your compute); MacWhisper app is paid", icon: "lock" },
                ].map(t => (
                  <div key={t.tool} className="flex gap-3 p-4 rounded-xl glass border border-white/8">
                    <div className="flex-1">
                      <div className="font-semibold text-foreground text-sm mb-1">{t.tool}</div>
                      <div className="text-xs text-muted-foreground mb-1">{t.use}</div>
                      <div className="text-[10px] text-[oklch(0.85_0.18_55)]">{t.access}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-4 rounded-xl bg-[oklch(0.75_0.18_55_/_0.08)] border border-[oklch(0.75_0.18_55_/_0.25)]">
                <div className="text-xs font-bold text-[oklch(0.85_0.18_55)] mb-2">POWER WORKFLOW: Meeting-to-Action in 3 steps</div>
                <div className="space-y-1.5">
                  {["Record meeting in Otter / Riverside (free)", "After meeting, paste transcript into Claude: 'Extract action items, owners, and deadlines from this transcript'", "Copy structured output into Notion, Linear, or email to team"].map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-[oklch(0.75_0.18_55_/_0.2)] text-[oklch(0.85_0.18_55)] text-[9px] font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</div>
                      <p className="text-xs text-muted-foreground">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <AIExpander prompt="What is the best workflow for transcribing a 2-hour lecture, cleaning it up, and turning it into a structured study guide?" color="oklch(0.75_0.18_55)" label="Depth Engine: Lecture-to-study-guide workflow" />
          </motion.div>
        )}

        {audioTab === "voice" && (
          <motion.div key="voice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="glass rounded-2xl p-5 border border-white/8">
              <SectionBadge label="VOICE SYNTHESIS & CLONING" color="oklch(0.68_0.22_10)" />
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">Modern voice AI can clone a voice from just 1 minute of audio and produce speech indistinguishable from the original. This creates powerful tools — and serious ethical responsibilities.</p>
              <div className="space-y-3 mb-4">
                {[
                  { tool: "ElevenLabs", strength: "Best voice cloning quality; instant voice library; 29 languages", use: "Voiceovers, audiobooks, content creation", tier: "Free: 10k chars/mo · Creator: $22/mo" },
                  { tool: "Play.ht", strength: "Ultra-realistic TTS; 900+ voices; API-first", use: "Podcasts, apps, customer service bots", tier: "Free tier · Starter: $31/mo" },
                  { tool: "Murf.ai", strength: "Team collaboration; 120 voices; branded voice creation", use: "Professional voiceovers for videos and presentations", tier: "Free: 10 min · Starter: $19/mo" },
                  { tool: "OpenAI TTS", strength: "6 high-quality voices; fast; cheap API pricing", use: "Apps, automation, reading content aloud", tier: "$0.015/1000 chars via API" },
                ].map(t => (
                  <div key={t.tool} className="p-4 rounded-xl glass border border-white/8">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-foreground text-sm">{t.tool}</span>
                      <span className="text-[10px] text-[oklch(0.68_0.22_10)]">{t.tier}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">{t.strength}</div>
                    <div className="text-[10px] text-[oklch(0.82_0.18_150)]">Best for: {t.use}</div>
                  </div>
                ))}
              </div>
              <div className="p-4 rounded-xl bg-[oklch(0.68_0.22_10_/_0.08)] border border-[oklch(0.68_0.22_10_/_0.3)]">
                <div className="text-xs font-bold text-[oklch(0.78_0.22_10)] mb-2">ETHICAL RULES — Non-negotiable</div>
                <div className="space-y-1">
                  {["Always get explicit consent before cloning anyone's voice", "Never use voice cloning to impersonate people without their permission", "Disclose when audio is AI-generated in public-facing content", "Never use for fraud, deception, or creating non-consensual content"].map((r, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Shield size={10} className="text-[oklch(0.78_0.22_10)] shrink-0" />
                      <p className="text-xs text-muted-foreground">{r}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <AIExpander prompt="Walk me through creating a professional-quality podcast episode using AI tools from script to final audio" color="oklch(0.68_0.22_10)" label="Depth Engine: AI podcast production workflow" />
          </motion.div>
        )}

        {audioTab === "multi" && (
          <motion.div key="multi" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="glass rounded-2xl p-5 border border-white/8">
              <SectionBadge label="MULTIMODAL LAB" color="oklch(0.72_0.18_150)" />
              <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                Multimodal AI models (GPT-4o, Gemini, Claude 3.5) can understand text AND images in the same message. Describe what you'd show the AI — then ask your question.
              </p>
              <div className="space-y-2 mb-4">
                {[
                  { scenario: "Photo of a cluttered desk", question: "What's the most efficient way to organize this? Give me a specific system." },
                  { scenario: "Screenshot of an error message", question: "What's causing this error and how do I fix it?" },
                  { scenario: "Image of a graph/chart", question: "What story does this data tell? What should I pay attention to?" },
                  { scenario: "Photo of a meal/ingredients", question: "What recipe can I make with these? Give me step-by-step instructions." },
                ].map((ex, i) => (
                  <button key={i} onClick={() => setMultiInput(`I'm looking at: ${ex.scenario}\n\nMy question: ${ex.question}`)}
                    className="w-full text-left p-3 rounded-xl glass border border-white/8 hover:border-white/20 transition-all">
                    <div className="text-xs font-semibold text-foreground">{ex.scenario}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">"{ex.question}"</div>
                  </button>
                ))}
              </div>
              <textarea value={multiInput} onChange={e => setMultiInput(e.target.value)}
                placeholder={"Describe what you'd show an AI:\n\n'I'm looking at [describe image]. My question is: [your question]'\n\nThe AI will respond as if it's seeing the image."}
                rows={5}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-foreground placeholder:text-white/20 resize-none focus:outline-none focus:border-white/25 font-mono mb-3" />
              <button disabled={multiLoading || !multiInput.trim()} onClick={() => {
                setMultiLoading(true); setMultiResult("");
                multiMut.mutate({ concept: `You are a multimodal AI assistant. The user is describing an image to you and asking a question about it. Respond helpfully as if you can see the image they described.\n\n${multiInput}`, level: "student" });
              }}
                className="w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2 bg-[oklch(0.72_0.18_150_/_0.15)] text-[oklch(0.82_0.18_150)] border border-[oklch(0.72_0.18_150_/_0.35)]">
                {multiLoading ? <><Loader2 size={13} className="animate-spin" />Analyzing…</> : <><Sparkles size={13} />Simulate Multimodal Response</>}
              </button>
              {multiResult && (
                <div className="mt-3 p-4 rounded-xl glass border border-white/8">
                  <div className="text-[10px] font-bold text-muted-foreground mb-2">AI RESPONSE (as if seeing your image):</div>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{multiResult}</p>
                </div>
              )}
            </div>
            <AIExpander prompt="What are the most creative and practical ways people are using multimodal AI in education, healthcare, and business right now?" color="oklch(0.72_0.18_150)" label="Depth Engine: Real-world multimodal AI applications" />
          </motion.div>
        )}

        {audioTab === "quiz" && (
          <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="glass rounded-2xl p-5 border border-white/8">
              <SectionBadge label="KNOWLEDGE CHECK" color="oklch(0.75_0.18_55)" />
              <MasteryQuiz questions={M3_QUIZ_L12} color="oklch(0.75_0.18_55)" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </LessonFrame>
  );

  // ── LESSON 13: Automation & AI Pipelines ───────────────────────────────────
  const Lesson13 = () => (
    <LessonFrame id={13}>
      <AIVoice text="Automation is where AI stops being a tool you use and starts being a system that works for you. Set up the right pipelines once, and AI handles the work while you sleep." />

      <p className="text-sm text-muted-foreground leading-relaxed">
        An AI pipeline is a sequence of discrete processing steps where AI handles the decision-making and transformation logic between a trigger event and a final output. Effective pipeline design requires three engineering judgments: <strong className="text-foreground">trigger selection</strong> (what event initiates the workflow — webhook, schedule, file creation, email receipt), <strong className="text-foreground">AI placement</strong> (which steps require AI judgment vs. deterministic logic), and <strong className="text-foreground">failure handling</strong> (what happens when an API call fails, an AI output is malformed, or a downstream step errors). Most beginners skip failure handling entirely — the result is automations that work perfectly in testing and fail silently in production. The highest-leverage pipelines also have tight feedback loops: they route exceptions back to human review rather than propagating bad outputs downstream.
      </p>

      <div className="flex gap-1.5 mb-2">
        {(["recipes", "builder", "quiz"] as const).map(t => (
          <button key={t} onClick={() => setAutoTab(t)}
            className="flex-1 py-2 rounded-xl text-xs font-bold transition-all capitalize"
            style={{
              background: autoTab === t ? "oklch(0.68_0.22_10_/_0.2)" : "oklch(1 0 0 / 0.04)",
              color: autoTab === t ? "oklch(0.78_0.22_10)" : "oklch(0.5 0 0)",
              border: `1px solid ${autoTab === t ? "oklch(0.68_0.22_10_/_0.4)" : "oklch(1 0 0 / 0.08)"}`,
            }}>
            {t === "recipes" ? "Workflow Recipes" : t === "builder" ? "Custom Builder" : "Quiz"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {autoTab === "recipes" && (
          <motion.div key="recipes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="glass rounded-2xl p-5 border border-white/8">
              <SectionBadge label="AUTOMATION RECIPES" color="oklch(0.68_0.22_10)" />
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">Click any recipe to explore its step-by-step breakdown and tools needed:</p>

              <div className="space-y-2 mb-4">
                {AUTOMATION_RECIPES.map((recipe, i) => (
                  <button key={recipe.name} onClick={() => { setAutoRecipeIdx(i); setAutoStep(0); }}
                    className="w-full text-left p-4 rounded-xl glass border transition-all"
                    style={{ borderColor: autoRecipeIdx === i ? `oklch(from ${recipe.color} l c h / 0.4)` : "oklch(1 0 0 / 0.08)" }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-foreground text-sm">{recipe.name}</span>
                      <div className="flex gap-2">
                        <span className="text-[10px] text-[oklch(0.72_0.18_150)]">{recipe.timeSaved}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: `oklch(from ${recipe.color} l c h / 0.15)`, color: recipe.color }}>{recipe.difficulty}</span>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">{recipe.trigger}</div>
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div key={autoRecipeIdx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl border" style={{ borderColor: `oklch(from ${AUTOMATION_RECIPES[autoRecipeIdx].color} l c h / 0.3)`, background: `oklch(from ${AUTOMATION_RECIPES[autoRecipeIdx].color} l c h / 0.04)` }}>
                  <div className="text-xs font-bold mb-3" style={{ color: AUTOMATION_RECIPES[autoRecipeIdx].color }}>
                    {AUTOMATION_RECIPES[autoRecipeIdx].name.toUpperCase()} — STEP BY STEP
                  </div>
                  <div className="space-y-2 mb-3">
                    {AUTOMATION_RECIPES[autoRecipeIdx].steps.map((step, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <button onClick={() => setAutoStep(i)}
                          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black transition-all"
                          style={{
                            background: autoStep >= i ? `oklch(from ${AUTOMATION_RECIPES[autoRecipeIdx].color} l c h / 0.25)` : "oklch(1 0 0 / 0.05)",
                            color: autoStep >= i ? AUTOMATION_RECIPES[autoRecipeIdx].color : "oklch(0.4 0 0)",
                            border: `1px solid ${autoStep >= i ? `oklch(from ${AUTOMATION_RECIPES[autoRecipeIdx].color} l c h / 0.4)` : "oklch(1 0 0 / 0.1)"}`,
                          }}>
                          {i + 1}
                        </button>
                        <p className="text-xs text-muted-foreground pt-0.5">{step}</p>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Tools: </span>{AUTOMATION_RECIPES[autoRecipeIdx].tools}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="glass rounded-2xl p-5 border border-white/8">
              <SectionBadge label="PLATFORMS AT A GLANCE" color="oklch(0.75_0.18_55)" />
              <div className="space-y-2">
                {[
                  { name: "Zapier", icon: "Z", url: "zapier.com", desc: "6,000+ app integrations. No-code. 5-step limit on free tier. Best for non-technical users starting out.", best: "Beginners, simple automations" },
                  { name: "Make (Integromat)", icon: "M", url: "make.com", desc: "Visual workflow builder with more complex routing than Zapier. Free 1,000 ops/month.", best: "Visual thinkers, moderate complexity" },
                  { name: "n8n", icon: "n8", url: "n8n.io", desc: "Open-source, self-hostable, write custom code in nodes. Full control with AI nodes built in.", best: "Developers, maximum control, privacy" },
                  { name: "Perplexity Computer", icon: "PC", url: "perplexity.ai", desc: "AI that builds and executes scheduled tasks, research pipelines, and multi-step workflows directly.", best: "AI-native workflows, research automation" },
                ].map(p => (
                  <div key={p.name} className="flex gap-3 p-3 rounded-xl glass border border-white/8">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[9px] font-black text-white" style={{ background: "oklch(0.4 0.1 270)" }}>{p.icon}</div>
                    <div className="flex-1">
                      <div className="font-semibold text-foreground text-xs">{p.name}</div>
                      <div className="text-[10px] text-muted-foreground">{p.desc}</div>
                      <div className="text-[10px] text-[oklch(0.82_0.18_150)] mt-0.5">Best for: {p.best}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <AIExpander prompt="Walk me through setting up a Zapier automation that monitors my Gmail for emails from specific senders and uses AI to draft replies automatically" color="oklch(0.68_0.22_10)" label="Depth Engine: Build an email automation step-by-step" />
          </motion.div>
        )}

        {autoTab === "builder" && (
          <motion.div key="builder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="glass rounded-2xl p-5 border border-white/8">
              <SectionBadge label="CUSTOM AUTOMATION PLANNER" color="oklch(0.72_0.18_150)" />
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">Describe what you want to automate — the AI will design a workflow plan with tools, steps, and implementation notes.</p>
              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">What triggers the automation?</label>
                  <input value={customTrigger} onChange={e => setCustomTrigger(e.target.value)}
                    placeholder="e.g. When I receive an email from a client / Every Monday morning / When someone fills out my form"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-white/20 focus:outline-none focus:border-white/25" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1">What should happen automatically?</label>
                  <textarea value={customGoal} onChange={e => setCustomGoal(e.target.value)}
                    placeholder="e.g. Summarize the email, extract the client's request, create a task in Notion, and send me a Slack notification with the summary"
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-white/20 resize-none focus:outline-none focus:border-white/25" />
                </div>
                <button disabled={customPlanLoading || !customTrigger.trim() || !customGoal.trim()} onClick={() => {
                  setCustomPlanLoading(true); setCustomPlan("");
                  customPlanMut.mutate({ concept: `You are an automation workflow designer. The user wants to build an AI-powered automation. Design a step-by-step implementation plan including: the trigger, each step in the pipeline, which tool handles each step (Zapier/Make/n8n/API), and what the AI does at each decision point. Be specific and practical.\n\nTrigger: ${customTrigger}\n\nGoal: ${customGoal}`, level: "student" });
                }}
                  className="w-full py-3 rounded-xl text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: "oklch(0.72_0.18_150_/_0.15)", color: "oklch(0.82_0.18_150)", border: "1px solid oklch(0.72_0.18_150_/_0.35)" }}>
                  {customPlanLoading ? <><Loader2 size={13} className="animate-spin" />Designing your automation…</> : <><Sparkles size={13} />Design My Automation</>}
                </button>
              </div>
              {customPlan && (
                <div className="p-4 rounded-xl glass border border-white/8">
                  <div className="text-[10px] font-bold text-muted-foreground mb-3 uppercase tracking-widest">YOUR AUTOMATION PLAN:</div>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{customPlan}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {autoTab === "quiz" && (
          <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="glass rounded-2xl p-5 border border-white/8">
              <SectionBadge label="KNOWLEDGE CHECK" color="oklch(0.68_0.22_10)" />
              <MasteryQuiz questions={M3_QUIZ_L13} color="oklch(0.68_0.22_10)" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </LessonFrame>
  );

  // ── LESSON 14: Verifying & Fact-Checking AI ────────────────────────────────
  const Lesson14 = () => {
    const flagColors = { high: "oklch(0.68_0.22_10)", critical: "oklch(0.65_0.25_10)", medium: "oklch(0.75_0.18_55)" };

    return (
      <LessonFrame id={14}>
        <AIVoice text="Trust but verify. AI is fluent, confident, and sometimes completely wrong. The skill isn't doubting AI — it's knowing exactly which claims need external verification and how to do it fast." />

        <p className="text-sm text-muted-foreground leading-relaxed">
          AI hallucination is not a temporary defect waiting to be patched — it is a structural consequence of how language models work. These models generate text by predicting the statistically most likely next token given prior context. They have no separate knowledge retrieval mechanism and no internal truth-checking module. When a model writes a confident citation for a paper that doesn't exist, it is not malfunctioning: it has learned that academic sentences like the one it's generating are typically followed by specific citation patterns, and it reproduces that pattern — whether or not any matching paper exists. The phenomenon is sometimes called <strong className="text-foreground">confabulation</strong> (from clinical neuropsychology, where it describes fabricated memories produced without intent to deceive). Understanding the mechanism changes how you use AI: outputs become drafts requiring targeted verification, not authoritative sources. The skill isn't blanket distrust — it's precise risk assessment: knowing exactly which claim types are high-risk and how to verify them in under two minutes.
        </p>

        <div className="flex gap-1.5 mb-2">
          {(["redflags", "verifier", "quiz"] as const).map(t => (
            <button key={t} onClick={() => setFactTab(t)}
              className="flex-1 py-2 rounded-xl text-xs font-bold transition-all capitalize"
              style={{
                background: factTab === t ? "oklch(0.68_0.20_140_/_0.2)" : "oklch(1 0 0 / 0.04)",
                color: factTab === t ? "oklch(0.78_0.20_140)" : "oklch(0.5 0 0)",
                border: `1px solid ${factTab === t ? "oklch(0.68_0.20_140_/_0.4)" : "oklch(1 0 0 / 0.08)"}`,
              }}>
              {t === "redflags" ? "Red Flags" : t === "verifier" ? "Fact Checker" : "Quiz"}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {factTab === "redflags" && (
            <motion.div key="rf" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="glass rounded-2xl p-5 border border-white/8">
                <SectionBadge label="HALLUCINATION RED FLAGS" color="oklch(0.68_0.20_140)" />
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">Tap each flag to learn how to spot it and verify it quickly. Check all 8 to master this skill:</p>
                <div className="space-y-2">
                  {HALLUCINATION_RED_FLAGS.map((flag, i) => {
                    const riskColor = flagColors[flag.risk as keyof typeof flagColors] || "oklch(0.68_0.22_10)";
                    const checked = checkedFlags.has(i);
                    return (
                      <button key={i} onClick={() => setCheckedFlags(prev => new Set(Array.from(prev).concat(i)))}
                        className="w-full text-left p-4 rounded-xl glass border transition-all"
                        style={{ borderColor: checked ? `oklch(from ${riskColor} l c h / 0.5)` : "oklch(1 0 0 / 0.08)" }}>
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all`}
                            style={{ background: checked ? `oklch(from ${riskColor} l c h / 0.2)` : "oklch(1 0 0 / 0.05)", border: `1px solid ${checked ? `oklch(from ${riskColor} l c h / 0.5)` : "oklch(1 0 0 / 0.1)"}` }}>
                            {checked && <Check size={10} style={{ color: riskColor }} />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-foreground">{flag.flag}</span>
                              <span className="text-[9px] px-1.5 py-0.5 rounded uppercase font-black" style={{ background: `oklch(from ${riskColor} l c h / 0.15)`, color: riskColor }}>{flag.risk}</span>
                            </div>
                            {checked && <p className="text-xs text-muted-foreground leading-relaxed">{flag.advice}</p>}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {checkedFlags.size === 8 && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="mt-4 p-4 rounded-xl bg-[oklch(0.72_0.18_150_/_0.1)] border border-[oklch(0.72_0.18_150_/_0.4)] text-center">
                    <Trophy size={20} className="text-[oklch(0.82_0.18_150)] mx-auto mb-1" />
                    <div className="text-sm font-bold text-foreground">All 8 red flags learned!</div>
                    <div className="text-xs text-muted-foreground mt-1">You now know exactly what to verify and what to trust.</div>
                  </motion.div>
                )}
              </div>

              <div className="glass rounded-2xl p-5 border border-white/8">
                <SectionBadge label="VERIFICATION TOOLKIT" color="oklch(0.72_0.2_290)" />
                <div className="space-y-2">
                  {[
                    { name: "Perplexity AI", use: "Web-grounded answers with citations — great for fact-checking claims against current sources" },
                    { name: "Google Scholar", use: "Verify academic citations; check if papers actually exist with those exact authors and titles" },
                    { name: "Snopes / FactCheck.org", use: "Debunked myths, viral claims, and widely-shared misinformation" },
                    { name: "WolframAlpha", use: "Computational facts — math, statistics, scientific constants, verified data" },
                    { name: "Internet Archive (Wayback)", use: "Verify historical claims about websites, documents, and what was published when" },
                    { name: "Primary sources (gov, .edu, .org)", use: "For statistics: always trace back to the original dataset or study, not AI's summary of it" },
                  ].map(tool => (
                    <div key={tool.name} className="flex gap-3 p-3 rounded-xl glass border border-white/8">
                      <div className="font-semibold text-foreground text-xs w-32 shrink-0">{tool.name}</div>
                      <p className="text-xs text-muted-foreground">{tool.use}</p>
                    </div>
                  ))}
                </div>
              </div>
              <AIExpander prompt="Give me a step-by-step verification workflow I can run in under 5 minutes whenever AI gives me a specific statistic or factual claim I need to trust" color="oklch(0.68_0.20_140)" label="Depth Engine: 5-minute fact-check protocol" />
            </motion.div>
          )}

          {factTab === "verifier" && (
            <motion.div key="verifier" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="glass rounded-2xl p-5 border border-white/8">
                <SectionBadge label="AI CLAIM ANALYZER" color="oklch(0.68_0.20_140)" />
                <p className="text-sm text-muted-foreground mb-3 leading-relaxed">Paste an AI response below — the analyzer will identify which specific claims need verification, which red flags it contains, and how to verify each one.</p>
                <textarea value={factInput} onChange={e => setFactInput(e.target.value)}
                  placeholder={"Paste any AI response here to analyze it for claims that need verification…\n\nExample: 'According to a 2023 MIT study, AI will replace 40% of jobs by 2030. Dr. Sarah Chen found that...'"}
                  rows={6}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-mono text-foreground placeholder:text-white/20 resize-none focus:outline-none focus:border-white/25 mb-3" />
                <button disabled={factLoading || !factInput.trim()} onClick={() => {
                  setFactLoading(true); setFactResult("");
                  factMut.mutate({ concept: `You are a fact-checking analyst. The user has pasted an AI response. Analyze it and:\n1. List every specific factual claim (statistics, citations, named people, dates, events)\n2. For each claim: rate its verification priority (Critical/High/Medium), explain why it might be hallucinated, and give a specific way to verify it\n3. Identify any red flags that suggest the AI may have been hallucinating\n4. Give an overall reliability assessment\n\nAI response to analyze:\n\n${factInput}`, level: "student" });
                }}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{ background: "oklch(0.68_0.20_140_/_0.15)", color: "oklch(0.78_0.20_140)", border: "1px solid oklch(0.68_0.20_140_/_0.35)" }}>
                  {factLoading ? <><Loader2 size={13} className="animate-spin" />Analyzing claims…</> : <><Search size={13} />Analyze for Verification Needs</>}
                </button>
                {factResult && (
                  <div className="mt-4 p-4 rounded-xl glass border border-white/8">
                    <div className="text-[10px] font-bold text-muted-foreground mb-3 uppercase tracking-widest">FACT-CHECK ANALYSIS:</div>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{factResult}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {factTab === "quiz" && (
            <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="glass rounded-2xl p-5 border border-white/8">
                <SectionBadge label="KNOWLEDGE CHECK" color="oklch(0.68_0.20_140)" />
                <MasteryQuiz questions={M3_QUIZ_L14} color="oklch(0.68_0.20_140)" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </LessonFrame>
    );
  };

  // ── LESSON 15: Your Personal AI Blueprint ─────────────────────────────────
  const Lesson15 = () => (
    <LessonFrame id={15}>
      <AIVoice text="This is your capstone. You've learned every core AI skill. Now you're going to design your personal AI system — customized to your life, your work, your goals. This is what you walk out with." />

      <div className="glass rounded-2xl p-5 border border-white/8">
        <SectionBadge label="YOUR PERSONAL AI BLUEPRINT" color="oklch(0.72_0.18_150)" />
        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">Answer these 4 questions honestly. The AI will synthesize them into a personalized AI adoption blueprint — your specific tools, prompts, automations, and workflows to implement this week.</p>

        <div className="space-y-4 mb-5">
          {WORKFLOW_TOOLS.map((field, i) => (
            <div key={field.name}>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide block mb-1.5">
                {i + 1}. {field.name}
              </label>
              <textarea
                value={blueprintAnswers[i]}
                onChange={e => {
                  const next = [...blueprintAnswers];
                  next[i] = e.target.value;
                  setBlueprintAnswers(next);
                }}
                placeholder={field.placeholder}
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-foreground placeholder:text-white/20 resize-none focus:outline-none focus:border-white/25"
              />
            </div>
          ))}
        </div>

        <button
          disabled={blueprintLoading || blueprintAnswers.every(a => !a.trim())}
          onClick={() => {
            setBlueprintLoading(true); setBlueprintResult(""); setBlueprintGenerated(false);
            blueprintMut.mutate({
              concept: `You are a professional AI implementation consultant. Based on the user's answers below, create a highly personalized "Personal AI Blueprint" that includes:\n\n1. **Your AI Stack** — the specific 3-5 tools they should use based on their answers (not generic recommendations)\n2. **This Week's Quick Wins** — 3 specific AI tasks they can implement immediately (with example prompts)\n3. **Your Automation Priority** — the ONE automation to build first, with step-by-step tool recommendations\n4. **Your System Prompt** — a draft custom instruction they can paste into Claude/ChatGPT right now\n5. **30-Day Growth Path** — week by week what to learn and implement next\n\nUser's answers:\n1. Time-consuming tasks: ${blueprintAnswers[0]}\n2. AI tools they have: ${blueprintAnswers[1]}\n3. Apps they live in: ${blueprintAnswers[2]}\n4. Top priority: ${blueprintAnswers[3]}`,
              level: "expert",
            });
          }}
          className="w-full py-3.5 rounded-xl text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-2 text-black"
          style={{ background: "linear-gradient(135deg, oklch(0.72_0.18_150), oklch(0.72_0.2_290))" }}>
          {blueprintLoading ? <><Loader2 size={14} className="animate-spin" />Building your blueprint…</> : <><Sparkles size={14} />Generate My Personal AI Blueprint</>}
        </button>
      </div>

      <AnimatePresence>
        {blueprintResult && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6 border" style={{ borderColor: "oklch(0.72_0.18_150_/_0.4)" }}>
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={18} style={{ color: "oklch(0.82_0.18_150)" }} />
              <div>
                <div className="font-bold text-foreground">Your Personal AI Blueprint</div>
                <div className="text-xs text-muted-foreground">Generated just for you — save this</div>
              </div>
              <button onClick={() => { navigator.clipboard.writeText(blueprintResult); toast.success("Blueprint copied!"); }}
                className="ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold glass border border-white/10 text-muted-foreground hover:text-foreground transition-colors">
                Copy
              </button>
            </div>
            <div className="prose prose-invert prose-sm max-w-none">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{blueprintResult}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {blueprintGenerated && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="glass rounded-2xl p-5 border border-white/8">
          <SectionBadge label="CAPSTONE CHALLENGE" color="oklch(0.75_0.18_55)" />
          <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
            You now know how to use AI tools, craft powerful prompts, understand models and parameters, upload files, use RAG, generate images, automate workflows, and verify AI outputs. 
            <strong className="text-foreground"> That is a complete AI power user skillset.</strong>
          </p>
          <div className="space-y-2 mb-4">
            {[
              "Implement one 'Quick Win' from your blueprint today",
              "Share your AI Blueprint with one colleague who could benefit",
              "Set a recurring reminder to try AI on one new task per week",
              "Build your first automation using your top priority from the blueprint",
            ].map((challenge, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl glass border border-white/8">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "oklch(0.75_0.18_55_/_0.15)", color: "oklch(0.85_0.18_55)", fontSize: "10px", fontWeight: 800 }}>
                  {i + 1}
                </div>
                <p className="text-xs text-muted-foreground">{challenge}</p>
              </div>
            ))}
          </div>
          <PromptSandbox
            placeholder={"Ask me anything about AI — test any concept from the entire course.\n\n'What's the best way to use AI for [your specific use case]?'"}
            systemHint="You are a comprehensive AI literacy expert. The student has completed a full practical AI mastery course covering tools, prompting, parameters, multimodal AI, automation, and fact-checking. Answer their question as an expert mentor helping them apply what they've learned."
            color="oklch(0.75_0.18_55)"
            label="Open AI Lab — Ask Anything"
          />
        </motion.div>
      )}

      <div className="glass rounded-2xl p-5 border border-white/8">
        <SectionBadge label="FINAL KNOWLEDGE CHECK" color="oklch(0.72_0.18_150)" />
        <MasteryQuiz questions={M3_QUIZ_L15} color="oklch(0.72_0.18_150)" />
      </div>

      <AIExpander prompt="What are the most important habits, communities, and resources for staying up-to-date with AI as it evolves rapidly in the next 12 months?" color="oklch(0.72_0.18_150)" label="Depth Engine: Staying current with AI long-term" />
    </LessonFrame>
  );

  const lessonMap: Record<number, React.ReactNode> = {
    11: <Lesson11 />, 12: <Lesson12 />, 13: <Lesson13 />, 14: <Lesson14 />, 15: <Lesson15 />,
  };

  if (activeLesson !== null) {
    return (
      <div className="p-4 max-w-2xl mx-auto">
        {lessonMap[activeLesson]}
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3 mb-1">
        <button onClick={onBack}
          className="p-2 rounded-lg glass border border-white/8 hover:border-white/20 transition-colors">
          <ChevronLeft size={14} className="text-muted-foreground" />
        </button>
        <div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-widest">AI Mastery · Module 3</div>
          <h2 className="font-bold text-foreground text-lg">Power User Workflows</h2>
        </div>
        <div className="ml-auto text-xs text-muted-foreground">{completed.size}/5 complete</div>
      </div>

      <div className="glass rounded-2xl p-4 border border-white/8">
        <div className="w-full bg-white/5 rounded-full h-1.5 mb-3">
          <div className="h-1.5 rounded-full transition-all" style={{ width: `${(completed.size / 5) * 100}%`, background: "oklch(0.68_0.22_10)" }} />
        </div>
        <div className="space-y-2">
          {M3_META.map(lesson => {
            const done = completed.has(lesson.id);
            return (
              <motion.button key={lesson.id} onClick={() => setActiveLesson(lesson.id)}
                whileHover={{ scale: 1.005 }} whileTap={{ scale: 0.995 }}
                className="w-full flex items-center gap-4 p-4 rounded-xl glass border transition-all text-left"
                style={{ borderColor: done ? `oklch(from ${lesson.color} l c h / 0.35)` : "oklch(1 0 0 / 0.08)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `oklch(from ${lesson.color} l c h / 0.15)`, border: `1px solid oklch(from ${lesson.color} l c h / 0.3)` }}>
                  {done ? <CheckCircle2 size={16} style={{ color: lesson.color }} /> : <span className="text-sm font-black" style={{ color: lesson.color }}>{lesson.id}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground text-sm">{lesson.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{lesson.subtitle}</div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[10px] text-muted-foreground">{lesson.duration}</span>
                  <span className="text-[10px] font-semibold" style={{ color: lesson.color }}>+{lesson.xp} XP</span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
      <ModulePodcast moduleNum={3} moduleTitle="Power User Workflows" content={M3_PODCAST_CONTENT} cookieId={cookieId} />
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// AI LITERACY TAB — Module Switcher Shell
// ═══════════════════════════════════════════════════════════════════════════════

function AILiteracyTab() {
  const [activeModule, setActiveModule] = useState<1 | 2 | 3 | null>(null);
  const { profile } = usePersonalization();

  if (activeModule === 1) return <AILiteracyModule1 onBack={() => setActiveModule(null)} />;
  if (activeModule === 2) return <AILiteracyModule2 onBack={() => setActiveModule(null)} />;
  if (activeModule === 3) return <AILiteracyModule3 onBack={() => setActiveModule(null)} />;

  const modules = [
    {
      num: 1 as const,
      title: "AI Tools & You",
      desc: "The AI landscape, free vs paid, tokens, context, settings, and connecting files & apps",
      color: "oklch(0.72_0.2_290)",
      xp: 350,
      lessons: 5,
      icon: <Brain size={22} />,
      topics: ["AI tool map", "Free vs paid tiers", "Tokens & context", "Temperature & models", "File uploads & RAG"],
    },
    {
      num: 2 as const,
      title: "Prompting Mastery",
      desc: "Zero-shot to chain-of-thought, the Prompt Lab, Prompt Fixer game, and AI agents",
      color: "oklch(0.75_0.18_55)",
      xp: 375,
      lessons: 5,
      icon: <MessageSquare size={22} />,
      topics: ["Prompt anatomy", "Advanced techniques", "Live prompt lab", "Prompt fixer game", "Agents & instructions"],
    },
    {
      num: 3 as const,
      title: "Power User Workflows",
      desc: "Image & video generation, voice AI, automation pipelines, fact-checking, and your blueprint",
      color: "oklch(0.68_0.22_10)",
      xp: 440,
      lessons: 5,
      icon: <Zap size={22} />,
      topics: ["Image & video gen", "Voice & multimodal", "Automation & tasks", "Fact-checking AI", "Personal blueprint"],
    },
  ];

  const totalXP = modules.reduce((sum, m) => sum + m.xp, 0);

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-5">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl p-6" style={{ background: "linear-gradient(135deg, oklch(0.18 0.04 270), oklch(0.14 0.06 290))", border: "1px solid oklch(0.72_0.2_290_/_0.3)" }}>
        <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(ellipse 60% 80% at 80% 20%, oklch(0.72_0.2_290_/_0.4), transparent)" }} />
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-[10px] font-black tracking-[0.2em] text-[oklch(0.72_0.2_290)] mb-1">AI MASTERY COURSE</div>
              <h1 className="text-2xl font-black text-white leading-tight">From Zero to<br />Power User</h1>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-white">{totalXP}</div>
              <div className="text-xs text-muted-foreground">total XP</div>
            </div>
          </div>
          <p className="text-sm text-white/60 leading-relaxed mb-4">
            This course teaches you <em>how to use</em> AI — not what it is. By the end, you'll know how to prompt, automate, generate, verify, and build workflows that save hours every week.
          </p>
          <div className="flex items-center gap-4 text-xs text-white/50">
            <span className="flex items-center gap-1"><BookOpen size={11} />15 lessons</span>
            <span className="flex items-center gap-1"><Clock size={11} />~5 hrs total</span>
            <span className="flex items-center gap-1"><Sparkles size={11} />3 modules</span>
            <span className="flex items-center gap-1"><FlaskConical size={11} />10+ live labs</span>
          </div>
        </div>
      </div>

      {/* Module cards */}
      <div className="space-y-3">
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Choose a Module</div>
        {modules.map(mod => (
          <motion.button key={mod.num} onClick={() => setActiveModule(mod.num)}
            whileHover={{ scale: 1.008 }} whileTap={{ scale: 0.995 }}
            className="w-full text-left rounded-2xl overflow-hidden"
            style={{ background: `oklch(from ${mod.color} l c h / 0.06)`, border: `1px solid oklch(from ${mod.color} l c h / 0.25)` }}>
            <div className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `oklch(from ${mod.color} l c h / 0.15)`, color: mod.color, border: `1px solid oklch(from ${mod.color} l c h / 0.3)` }}>
                  {mod.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: mod.color }}>Module {mod.num}</span>
                    <span className="text-[10px] text-muted-foreground">· {mod.lessons} lessons · +{mod.xp} XP</span>
                  </div>
                  <div className="font-bold text-foreground mb-1">{mod.title}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{mod.desc}</p>
                </div>
                <ChevronRight size={16} className="text-muted-foreground shrink-0 mt-1" />
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {mod.topics.map(topic => (
                  <span key={topic} className="px-2.5 py-1 rounded-lg text-[10px] font-semibold"
                    style={{ background: `oklch(from ${mod.color} l c h / 0.12)`, color: mod.color }}>
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Course philosophy */}
      <div className="glass rounded-2xl p-5 border border-white/8">
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">How This Course Works</div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: <FlaskConical size={14} />, title: "Live Labs", desc: "Every lesson has hands-on exercises using real AI" },
            { icon: <Brain size={14} />, title: "Depth Engine", desc: "Tap any concept for an AI-powered deeper explanation" },
            { icon: <Zap size={14} />, title: "Adaptive Pacing", desc: "Expand any topic as deep as you want to go" },
            { icon: <Trophy size={14} />, title: "XP System", desc: "Earn XP for every lesson and quiz — track your mastery" },
          ].map(item => (
            <div key={item.title} className="flex items-start gap-2.5 p-3 rounded-xl glass border border-white/8">
              <div className="text-[oklch(0.72_0.2_290)] mt-0.5 shrink-0">{item.icon}</div>
              <div>
                <div className="text-xs font-semibold text-foreground">{item.title}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── END AI MASTERY COURSE ────────────────────────────────────────────────────


// ─── Clear Thinking Shared Types & Components ─────────────────────────────────
// Used by ClearThinkingTab and all CT modules

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

// ─── SegmentFooter ─────────────────────────────────────────────────────────────
function SegmentFooter({ topics, onReady, accentColor = "oklch(0.75_0.18_55)" }: {
  topics: string[];
  onReady?: () => void;
  accentColor?: string;
}) {
  const [mode, setMode] = useState<"idle" | "picking" | "loading" | "done">("idle");
  const [pickedTopic, setPickedTopic] = useState<string | null>(null);
  const [expansion, setExpansion] = useState("");

  const expandMutation = trpc.ai.explainConcept.useMutation({
    onSuccess: (data) => { setExpansion(data.explanation); setMode("done"); },
    onError: (err: { message: string }) => { toast.error(err.message); setMode("picking"); },
  });

  const handlePickTopic = (topic: string) => {
    setPickedTopic(topic);
    setMode("loading");
    setExpansion("");
    expandMutation.mutate({
      concept: `Explain "${topic}" in plain language for an adult learner who just encountered it in a critical thinking course. Be concise but thorough — 3 to 5 short paragraphs. Use concrete examples and avoid jargon.`,
      level: "student",
    });
  };

  const reset = () => { setMode("idle"); setPickedTopic(null); setExpansion(""); };

  return (
    <div className="mt-5 pt-4 border-t border-white/8">
      <AnimatePresence mode="wait">
        {mode === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <p className="text-xs text-muted-foreground">How are you feeling about this section?</p>
            <div className="flex gap-2">
              {onReady && (
                <motion.button onClick={onReady} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-black"
                  style={{ background: `linear-gradient(to right, ${accentColor}, oklch(0.65_0.22_200))` }}>
                  <Check size={13} /> Got it, move on
                </motion.button>
              )}
              <button onClick={() => setMode("picking")}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm border glass border-white/10 text-muted-foreground hover:text-foreground transition-colors">
                <HelpCircle size={13} /> Tell me more about…
              </button>
            </div>
          </motion.div>
        )}

        {mode === "picking" && (
          <motion.div key="picking" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-3">
            <p className="text-xs font-medium text-foreground">Which part do you want to dig deeper on?</p>
            <div className="flex flex-wrap gap-2">
              {topics.map((t) => (
                <button key={t} onClick={() => handlePickTopic(t)}
                  className="px-3 py-2 rounded-xl text-sm border glass border-white/10 text-muted-foreground hover:text-foreground hover:border-white/25 transition-colors text-left">
                  {t}
                </button>
              ))}
            </div>
            <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Never mind, I’m good
            </button>
          </motion.div>
        )}

        {mode === "loading" && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 p-4 rounded-xl glass border border-white/8">
            <RefreshCw size={14} className="animate-spin shrink-0" style={{ color: accentColor }} />
            <span className="text-sm text-muted-foreground">Expanding on <em className="text-foreground">{pickedTopic}</em>…</span>
          </motion.div>
        )}

        {mode === "done" && expansion && (
          <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-3">
            <div className="p-5 rounded-2xl glass border" style={{ borderColor: `color-mix(in oklch, ${accentColor} 30%, transparent)` }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold" style={{ color: accentColor }}>DEEPER DIVE — {pickedTopic?.toUpperCase()}</span>
                <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  <XCircle size={12} /> Close
                </button>
              </div>
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap space-y-2">{expansion}</div>
            </div>
            {onReady && (
              <div className="flex items-center gap-3">
                <motion.button onClick={onReady} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-black"
                  style={{ background: `linear-gradient(to right, ${accentColor}, oklch(0.65_0.22_200))` }}>
                  <Check size={13} /> Got it, move on
                </motion.button>
                <button onClick={() => setMode("picking")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Explore another topic
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Narrator ─────────────────────────────────────────────────────────────────
function Narrator({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);

  const speak = useCallback(() => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.92;
    utter.volume = muted ? 0 : 1;
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utter);
  }, [text, muted]);

  const stop = useCallback(() => { window.speechSynthesis?.cancel(); setSpeaking(false); }, []);
  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-[oklch(0.75_0.18_55_/_0.08)] border border-[oklch(0.75_0.18_55_/_0.2)]">
      {speaking ? (
        <motion.div className="flex items-end gap-0.5 h-4">
          {[0, 1, 2, 3].map((i) => (
            <motion.div key={i} className="w-1 bg-[oklch(0.75_0.18_55)] rounded-full"
              animate={{ height: ["4px", "14px", "4px"] }}
              transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }} />
          ))}
        </motion.div>
      ) : <Volume2 size={13} className="text-[oklch(0.75_0.18_55)]" />}
      <span className="text-xs text-muted-foreground flex-1">AI Narrator</span>
      <button onClick={() => setMuted(!muted)} className="p-1 rounded hover:bg-white/10 text-muted-foreground transition-colors">
        {muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
      </button>
      {speaking
        ? <button onClick={stop} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 text-xs text-foreground"><Pause size={11} /> Stop</button>
        : <button onClick={speak} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[oklch(0.75_0.18_55_/_0.2)] border border-[oklch(0.75_0.18_55_/_0.3)] text-xs text-[oklch(0.85_0.18_55)]"><Play size={11} /> Listen</button>
      }
    </div>
  );
}

// ─── QuizBlock ────────────────────────────────────────────────────────────────
function QuizBlock({ questions, accentColor }: { questions: QuizQuestion[]; accentColor: string }) {
  const [qi, setQi] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showExp, setShowExp] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);

  const q = questions[qi];

  const handleAnswer = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    setShowExp(true);
    if (idx === q.correct) setScore(s => s + 1);
  };

  const handleNext = () => {
    if (qi + 1 < questions.length) { setQi(i => i + 1); setSelected(null); setShowExp(false); }
    else setDone(true);
  };

  const reset = () => { setQi(0); setSelected(null); setShowExp(false); setScore(0); setDone(false); setStarted(true); };

  if (!started) return (
    <div className="text-center py-4">
      <button onClick={() => setStarted(true)}
        className="px-6 py-2.5 rounded-xl font-semibold text-sm inline-flex items-center gap-2 text-black"
        style={{ background: `linear-gradient(to right, ${accentColor}, oklch(0.65_0.22_200))` }}>
        <Brain size={15} /> Start Quiz ({questions.length} questions)
      </button>
    </div>
  );

  if (done) return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
      className="glass rounded-xl p-6 border border-white/10 text-center">
      <div className="text-xl font-bold text-foreground mb-1">{score}/{questions.length} correct</div>
      <p className="text-sm text-muted-foreground mb-4">
        {score === questions.length ? "Perfect score!" : score >= questions.length / 2 ? "Solid foundation — keep going!" : "Good effort — review the explanations to reinforce these concepts."}
      </p>
      <button onClick={reset} className="flex items-center gap-1.5 mx-auto px-4 py-2 rounded-lg glass border border-white/10 text-sm text-muted-foreground hover:text-foreground">
        <RotateCcw size={13} /> Retake
      </button>
    </motion.div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-5 border border-white/10 space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
        <span>Question {qi + 1} / {questions.length}</span>
        <span>{score} correct</span>
      </div>
      <div className="w-full h-1 rounded-full bg-white/8">
        <div className="h-full rounded-full bg-[oklch(0.75_0.18_55)] transition-all" style={{ width: `${(qi / questions.length) * 100}%` }} />
      </div>
      <p className="text-sm font-medium text-foreground">{q.question}</p>
      <div className="space-y-2">
        {q.options.map((opt, i) => (
          <button key={i} onClick={() => handleAnswer(i)}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm border transition-all ${
              selected === null ? "glass border-white/10 text-foreground hover:border-white/25"
              : i === q.correct ? "bg-[oklch(0.72_0.18_150_/_0.15)] border-[oklch(0.72_0.18_150_/_0.4)] text-foreground"
              : selected === i ? "bg-white/5 border-white/10 text-muted-foreground opacity-60"
              : "glass border-white/5 text-muted-foreground opacity-50"
            }`}>
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs border border-current shrink-0">{String.fromCharCode(65 + i)}</span>
              {opt}
              {selected !== null && i === q.correct && <CheckCircle2 size={13} className="ml-auto text-[oklch(0.72_0.18_150)] shrink-0" />}
              {selected === i && i !== q.correct && <XCircle size={13} className="ml-auto text-muted-foreground shrink-0" />}
            </div>
          </button>
        ))}
      </div>
      <AnimatePresence>
        {showExp && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            className="p-4 rounded-xl bg-white/3 border border-white/10">
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">Why: </span>{q.explanation}
            </p>
            <button onClick={handleNext} className="mt-3 flex items-center gap-1 text-xs font-medium text-[oklch(0.75_0.18_55)] hover:opacity-80">
              {qi + 1 < questions.length ? "Next question" : "See results"} <ChevronRight size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Clear Thinking Data ───────────────────────────────────────────────────────
type CTLessonId = "ct1" | "ct2" | "ct3" | "ct4" | "ct5";

interface Fallacy {
  id: string;
  name: string;
  definition: string;
  example: string;
  rebuttal: string;
}

interface Bias {
  id: string;
  name: string;
  definition: string;
  trigger: string;
  antidote: string;
}

interface EvidenceItem {
  id: string;
  label: string;
  description: string;
  strength: number; // 1 (weak) to 5 (strong)
}

const CT_LESSON_META = [
  { id: "ct1" as CTLessonId, title: "What Makes an Argument?", subtitle: "The anatomy of every claim worth listening to", duration: "20 min", color: "oklch(0.72_0.2_260)", xp: 50 },
  { id: "ct2" as CTLessonId, title: "Logical Fallacies", subtitle: "The tricks bad arguments use — and how to name them", duration: "25 min", color: "oklch(0.68_0.22_20)", xp: 60 },
  { id: "ct3" as CTLessonId, title: "Evidence & Sources", subtitle: "Not all evidence is created equal", duration: "25 min", color: "oklch(0.72_0.18_150)", xp: 60 },
  { id: "ct4" as CTLessonId, title: "Cognitive Biases", subtitle: "The mental shortcuts that make us predictably wrong", duration: "25 min", color: "oklch(0.78_0.16_30)", xp: 70 },
  { id: "ct5" as CTLessonId, title: "Capstone", subtitle: "Tear apart a real argument — then rebuild it", duration: "20 min", color: "oklch(0.75_0.18_55)", xp: 100 },
];

const FALLACIES: Fallacy[] = [
  { id: "f1", name: "Ad Hominem", definition: "Attacking the person making the argument instead of the argument itself. The attack can target character, appearance, past behavior, or personal life — anything but the actual argument.", example: "\"You can't trust his views on climate policy — he's been divorced twice and filed for bankruptcy.\"", rebuttal: "A person's character or personal life is entirely irrelevant to whether their argument is logically sound. A corrupt person can still make a true claim. Address the argument on its merits, then optionally note why the source's credibility matters separately." },
  { id: "f2", name: "Straw Man", definition: "Misrepresenting someone's position — usually making it weaker or more extreme — then attacking that distorted version instead of the actual claim.", example: "Person A: 'We should reduce military spending by 5%.' Person B: 'So you want to leave the country completely defenseless and surrender to our enemies?'", rebuttal: "Identify the misrepresentation explicitly: 'That's not what was said. The actual claim was X.' Restate the true position accurately before engaging with it." },
  { id: "f3", name: "False Dilemma", definition: "Presenting a situation as though only two options exist when in reality there are more — forcing a choice between extremes and hiding the middle ground.", example: "\"You're either with us or against us. If you're not supporting our policy, you're supporting terrorism.\"", rebuttal: "Ask: are these really the only options? Name the missing options. 'I can oppose this policy while also opposing terrorism — those aren't the only two choices.'" },
  { id: "f4", name: "Appeal to Authority", definition: "Using an authority's endorsement as a substitute for actual evidence — especially when the authority is outside their domain, or when experts are divided.", example: "\"This celebrity wellness doctor says the COVID vaccine has microchips. He has a medical degree, so it must be true.\"", rebuttal: "Expertise is domain-specific and not infallible. Ask: is this person an expert in this specific area? Is there expert consensus? What does the primary evidence say, independent of who endorses it?" },
  { id: "f5", name: "Slippery Slope", definition: "Claiming that one event or decision will inevitably lead to a series of extreme consequences — without providing evidence of that causal chain.", example: "\"If we allow doctor-assisted dying for the terminally ill, next they'll be euthanizing the elderly and disabled against their will.\"", rebuttal: "Each step in the chain requires its own independent evidence. Name the specific mechanism by which step A leads to step B. The slope metaphor doesn't make the slide inevitable." },
  { id: "f6", name: "Circular Reasoning", definition: "Using the conclusion of an argument as one of its premises — the argument assumes what it's trying to prove, going in a logical circle.", example: "\"The Bible is true because it is the Word of God. How do we know it is the Word of God? Because the Bible says so.\"", rebuttal: "Ask: what independent evidence — outside the circle — supports the premise? If the only support is the conclusion itself, the argument has zero explanatory power. Demand external evidence." },
  { id: "f7", name: "Bandwagon", definition: "Arguing that something is true, good, or correct because a large number of people believe it or do it — popularity as a substitute for evidence.", example: "\"A billion people practice this diet — a billion people can't be wrong. It must be the healthiest way to eat.\"", rebuttal: "Popular belief is historically unreliable as evidence — majorities have endorsed slavery, geocentrism, and bloodletting. Evaluate the independent evidence, not the headcount." },
  { id: "f8", name: "Appeal to Nature", definition: "Claiming something is good, safe, or true because it is 'natural,' or bad because it is 'artificial' or 'synthetic' — using natural origin as a quality signal.", example: "\"This herbal remedy is completely natural, so it can't hurt you. Unlike those chemical drugs from Big Pharma.\"", rebuttal: "Natural does not mean safe: arsenic, hemlock, and botulinum toxin are all natural. Artificial does not mean harmful: surgery, vaccines, and eyeglasses are artificial. Judge by evidence of safety and efficacy, not origin." },
  { id: "f9", name: "Appeal to Emotion", definition: "Manipulating the audience's emotions — fear, pity, outrage, pride — to win agreement without providing logical evidence.", example: "\"Think of the children exposed to this! Any parent with an ounce of humanity would vote for this policy.\"", rebuttal: "Emotional appeals can accompany legitimate arguments, but they cannot replace evidence. Ask: if I remove the emotional framing, is there actually a logical argument here? What is the evidence?" },
  { id: "f10", name: "Red Herring", definition: "Introducing an irrelevant topic or piece of information to divert attention from the actual issue — deliberately or accidentally changing the subject.", example: "\"Why are you worried about government surveillance? Thousands of people die in car accidents every year.\"", rebuttal: "Name the pivot: 'That's a different issue. We were discussing surveillance. Can you respond to the actual claim?' Both issues can be important — that doesn't make them the same issue." },
  { id: "f11", name: "Hasty Generalization", definition: "Drawing a broad conclusion from an unrepresentative or too-small sample — treating individual cases as universal rules.", example: "\"My grandfather smoked his whole life and lived to 96. Cigarettes can't be that dangerous.\"", rebuttal: "One case (or a few) cannot override population-level evidence. Ask: what is the actual rate across a representative sample? Individual exceptions don't refute statistical patterns." },
  { id: "f12", name: "False Cause (Post Hoc)", definition: "Assuming that because one thing followed another, the first thing caused the second. Correlation is mistaken for causation.", example: "\"We introduced the new CEO, and sales went up 30%. She clearly caused the improvement.\"", rebuttal: "Ask: what other factors changed simultaneously? Is there a plausible causal mechanism? Have similar interventions produced similar results elsewhere? Correlation requires a lot more work to become causation." },
  { id: "f13", name: "Tu Quoque", definition: "Deflecting a criticism by pointing out that the critic is guilty of the same thing — 'you do it too.' This avoids engaging with the actual argument.", example: "\"You say I shouldn't eat fast food, but I saw you at McDonald's last week.\"", rebuttal: "Whether the critic is hypocritical is a separate question from whether the argument is correct. The validity of the claim doesn't depend on the critic's behavior. Engage with the argument itself." },
  { id: "f14", name: "Equivocation", definition: "Using the same word in two different senses within one argument — exploiting the ambiguity of language to make an invalid inference seem valid.", example: "\"A bank is a place to store things. A river has banks. Therefore a river is a place to store things.\"", rebuttal: "Identify the word that shifts meaning and clarify which definition applies at each step. Replace the ambiguous term with a precise definition and see if the argument still holds." },
  { id: "f15", name: "No True Scotsman", definition: "Redefining a group's membership after a counterexample is provided, to protect an unfalsifiable claim about that group.", example: "A: 'No real Scotsman would behave that way.' B: 'But Angus MacDonald did exactly that.' A: 'Well, no true Scotsman would.'", rebuttal: "Ask for the definition of the group to be stated before the counterexample is introduced. If the definition shifts to exclude every counterexample, the claim is unfalsifiable and therefore meaningless." },
  { id: "f16", name: "Moving the Goalposts", definition: "Changing the criteria for what would count as evidence or proof after the original criteria have been met — demanding increasingly impossible standards.", example: "A: 'If we find a transitional fossil, you'll accept evolution?' B: 'We found one.' A: 'That's just one — I need ten.' [after ten] 'I need a hundred.'", rebuttal: "Agree on criteria for evidence before it is presented. When goalposts shift, name it explicitly: 'This is the third set of criteria you've demanded. We agreed on X. That evidence has been provided.'" },
  { id: "f17", name: "Gambler's Fallacy", definition: "Believing that past random events affect future probabilities of independent events — that 'luck evens out' in ways it mathematically doesn't.", example: "\"This coin has landed heads 8 times in a row. It's due for tails — I'll bet everything on tails.\"", rebuttal: "Independent random events have no memory. A fair coin is always 50/50 regardless of history. The gambler's fallacy conflates random processes with deterministic ones. Past results are irrelevant to future probabilities of independent events." },
];

const BIASES: Bias[] = [
  { id: "b1", name: "Confirmation Bias", definition: "The tendency to search for, interpret, favor, and remember information in a way that confirms or supports what we already believe — while discounting or ignoring information that challenges it.", trigger: "You research a health supplement you're already excited about, reading 3 glowing reviews and skipping the 7 critical ones. You feel more confident in your decision than before you searched.", antidote: "Deliberately seek the strongest counterargument to your position before forming a final view. If you can't steelman the opposing side accurately, you haven't understood the issue. Try the 'red team' exercise: argue the opposite position for 5 minutes." },
  { id: "b2", name: "Availability Heuristic", definition: "Judging the likelihood or frequency of events based on how easily examples come to mind — usually because they were recent, dramatic, or emotionally vivid, regardless of their actual frequency.", trigger: "After seeing extensive news coverage of shark attacks, you feel afraid to swim in the ocean — despite the fact that you're statistically more likely to be killed by a vending machine.", antidote: "Ask: am I relying on vivid, memorable examples or on actual base rates? Before forming probability estimates, look up the actual statistical frequency. Separate emotional salience from evidential weight." },
  { id: "b3", name: "Anchoring Bias", definition: "Over-relying on the first piece of numerical or comparative information encountered when making a decision — subsequent judgments are 'anchored' to that initial figure even when it's irrelevant.", trigger: "A car is listed at $45,000, then 'discounted' to $38,000. You feel you're getting a deal — but you never independently established what the car is actually worth.", antidote: "Establish your own reference point before receiving external information. Ask: if I had no starting price, what range would I independently estimate? Arrive at a value before negotiating, not after you've seen the anchor." },
  { id: "b4", name: "Dunning-Kruger Effect", definition: "A cognitive bias in which people with limited competence in a domain significantly overestimate their ability — while highly skilled people often underestimate their competence relative to others.", trigger: "After spending a weekend learning about nutrition, you feel qualified to dismiss the dietary advice of registered dietitians. A medical student with 3 months of training feels more confident than a physician with 20 years.", antidote: "Calibrate confidence to evidence of competence: track predictions and measure outcomes. Expertise is demonstrated, not felt. When you feel very confident about a complex domain, that's precisely when to slow down and seek expert input." },
  { id: "b5", name: "Sunk Cost Fallacy", definition: "Continuing a course of action because of past investment — time, money, or emotional energy — rather than because of its future value. The past investment is 'sunk' and cannot be recovered regardless of future choice.", trigger: "You've spent $800 on a gym membership and attended twice. You keep the membership 'to get your money's worth' even though you genuinely don't enjoy it and won't use it.", antidote: "Ask: if I were deciding today from scratch — with no past investment — would I still choose this? Only future expected value should drive future decisions. The money is already gone; the only question is whether continuing costs more than stopping." },
  { id: "b6", name: "In-Group Bias", definition: "Automatically favoring members of groups we belong to — applying more charitable interpretations to their actions and holding higher standards for outsiders — regardless of the actual merits of individual behavior.", trigger: "When a politician from your party is caught in a scandal, it's a 'mistake' or 'misrepresentation.' When a politician from the opposing party does the same thing, it 'reveals their true character.'", antidote: "Apply the identical evaluative standard to both groups. Ask: would I interpret this exact action the same way if someone from the other group did it? If not, you're seeing through bias, not evidence." },
  { id: "b7", name: "Hindsight Bias", definition: "After learning an outcome, believing you would have predicted it all along — 'I knew it!' — even when you couldn't have, making past events feel more predictable than they actually were.", trigger: "After a stock market crash, you're convinced you 'saw it coming' and 'knew the bubble would pop' — but before the crash, you had your money fully invested.", antidote: "Keep written records of your predictions before events happen. This creates an honest baseline against which to measure your actual forecasting ability, rather than retrofitting memory to match outcomes." },
  { id: "b8", name: "Status Quo Bias", definition: "Preferring the current state of affairs over alternatives — treating the existing situation as the default 'good' and change as inherently risky, even when the evidence suggests change would be beneficial.", trigger: "You keep a financial advisor who has underperformed the market for 5 years because switching 'feels risky' — even though staying with underperformance is the actual risk.", antidote: "Evaluate the status quo by the same standards you'd apply to alternatives. Ask: if today's situation were a proposal rather than the existing state, would you vote for it? Doing nothing is always a choice with its own risks." },
  { id: "b9", name: "Framing Effect", definition: "Making different decisions based on how the same information is presented — positive framing ('95% survival rate') versus negative framing ('5% mortality rate') produces different choices even with identical underlying facts.", trigger: "Patients are more likely to choose surgery when told it has a '90% survival rate' than when told it has a '10% mortality rate' — the statistical reality is identical.", antidote: "Deliberately reframe information in multiple ways before deciding. Convert percentages to absolute numbers. Present both the positive and negative version of the same statistic to yourself. The underlying reality shouldn't change with the framing." },
  { id: "b10", name: "Planning Fallacy", definition: "Systematically underestimating the time, cost, and risks of planned actions while overestimating their benefits — this bias affects individuals and organizations equally.", trigger: "You budget 2 hours to complete a project that ends up taking 8. You tell yourself you'll finish the book in 3 months; it takes 2 years. Despite this pattern repeating, your next estimate is just as optimistic.", antidote: "Use 'reference class forecasting': look at how long similar projects actually took, not how long this one feels like it should take. Add a minimum 50% buffer to your time estimates. Track your history and update your calibration." },
  { id: "b11", name: "Negativity Bias", definition: "Giving disproportionately more weight to negative experiences, information, and predictions than to positive ones of equivalent magnitude — bad events feel larger than equivalently good ones.", trigger: "One critical comment from a colleague affects your mood far more powerfully than five compliments. You remember insults from a decade ago vividly while positive feedback fades within days.", antidote: "Actively counteract by noting that your emotional weight on negative events doesn't reflect their objective importance. Practice deliberate recall of positive evidence when evaluating your performance or a situation." },
  { id: "b12", name: "Actor-Observer Asymmetry", definition: "Explaining your own failures as caused by circumstances, while explaining others' identical failures as caused by their character or personality — a systematic double standard in attribution.", trigger: "You're late to a meeting: 'There was terrible traffic.' Your colleague is late: 'He's so disorganized and disrespectful of others' time.' The actual causes might have been identical.", antidote: "Apply the charitable interpretation you use for yourself to others: 'What external factors might explain their behavior?' Conversely, when you fail, ask: 'What internal factors contributed, beyond just circumstances?'" },
];

const EVIDENCE_ITEMS: EvidenceItem[] = [
  { id: "ev1", label: "Systematic Review / Meta-Analysis", description: "Combines results from dozens of studies on the same question, controlled for quality. The gold standard.", strength: 5 },
  { id: "ev2", label: "Randomized Controlled Trial (RCT)", description: "Participants randomly assigned to treatment/control groups. Eliminates many confounding variables.", strength: 4 },
  { id: "ev3", label: "Peer-Reviewed Observational Study", description: "Tracks real-world populations without intervention. Can show correlation but not always causation.", strength: 3 },
  { id: "ev4", label: "Expert Opinion / Position Statement", description: "What credentialed experts believe based on their training. Useful context — not a substitute for primary data.", strength: 2 },
  { id: "ev5", label: "Anecdote / Personal Story", description: "One person's experience. Vivid and compelling — but tells us nothing about frequency or causation.", strength: 1 },
];

const CT_ARG_FLAWED = {
  title: "The 4-Day Work Week Argument",
  text: `A recent blog post by productivity influencer @WorkSmarter argued:

"Every employee I've interviewed loves the idea of a 4-day work week, so it clearly increases productivity. Besides, everyone is talking about it — it's obviously the future of work. Companies that don't adopt it are run by out-of-touch executives who just want to control their employees. Studies show output goes up 20% when teams switch. And honestly, if working less were bad for the economy, it would already be illegal."`,
  errors: [
    { id: "ce1", label: "Bandwagon fallacy", explanation: "'Everyone is talking about it' is not evidence it works." },
    { id: "ce2", label: "Ad hominem", explanation: "Dismissing opponents as 'out-of-touch' instead of addressing their concerns." },
    { id: "ce3", label: "Unverified statistic", explanation: "'Studies show 20%' — which studies? This needs a citation." },
    { id: "ce4", label: "Appeal to anecdote", explanation: "Interviewing a self-selected group of enthusiasts is not representative research." },
    { id: "ce5", label: "False reasoning", explanation: "'If it were bad, it would be illegal' — legality has nothing to do with economic impact." },
  ],
};

const CT_QUIZ_L1: QuizQuestion[] = [
  { id: "ct1q1", question: "An argument requires which three components?", options: ["Opinion, feeling, and tone", "Claim, evidence, and inference", "Introduction, body, and conclusion", "Facts, statistics, and examples"], correct: 1, explanation: "Every argument has a claim (what you're asserting), evidence (the support for it), and an inference (the logical bridge connecting the two). Without all three, something may sound persuasive without actually being an argument." },
  { id: "ct1q2", question: "What is the difference between a claim and a fact?", options: ["Claims are always false; facts are always true", "A claim requires acceptance; a fact is independently verifiable", "They mean the same thing in formal logic", "Claims are shorter than facts"], correct: 1, explanation: "A fact can be verified independently of who asserts it. A claim requires someone to accept it — it may be true or false, and requires evidence and reasoning to evaluate." },
  { id: "ct1q3", question: "Which of these is a conclusion, not a premise?", options: ["Studies show a link between sleep and memory", "Therefore, improving sleep should be a health priority", "The average adult sleeps 6.8 hours per night", "Chronic sleep deprivation raises disease risk"], correct: 1, explanation: "The conclusion is what the premises are trying to establish — it follows from the evidence. 'Therefore' is a classic conclusion indicator. The other three are premises (evidence/reasons)." },
  { id: "ct1q4", question: "A valid argument is one where:", options: ["All premises are true", "The conclusion follows logically from the premises, whether or not the premises are true", "The conclusion is true", "The argument has been verified by an expert"], correct: 1, explanation: "Validity is a structural property — it says: IF the premises were true, the conclusion would have to be true. An argument can be valid with false premises (and therefore unsound). Soundness requires both validity AND true premises." },
  { id: "ct1q5", question: "What is a hidden premise (unstated assumption)?", options: ["A premise the author forgot to include", "An assumption the argument requires to be true, but which is not made explicit", "A premise that is provably false", "Jargon the audience doesn't understand"], correct: 1, explanation: "Many arguments depend on unstated assumptions that do real logical work. Finding them is critical: once exposed, a hidden premise can be challenged directly, often collapsing the argument. Ask: 'What else must be true for this inference to work?'" },
];

const CT_QUIZ_L2: QuizQuestion[] = [
  { id: "ct2q1", question: "Which fallacy is this? 'You shouldn't listen to her argument about tax policy — she's never even run a business.'", options: ["Straw Man", "Ad Hominem", "Appeal to Authority", "Bandwagon"], correct: 1, explanation: "Ad hominem attacks the person rather than the argument. Whether she's run a business is irrelevant to whether her reasoning about tax policy is correct — evaluate the argument on its merits." },
  { id: "ct2q2", question: "'If we legalize marijuana, next everyone will be doing heroin.' This is:", options: ["A valid causal chain", "Slippery Slope fallacy", "False Dilemma", "Appeal to Nature"], correct: 1, explanation: "Slippery slope assumes a chain of inevitable consequences without providing evidence for each step. Naming a possible downstream outcome doesn't prove it will occur." },
  { id: "ct2q3", question: "'Nine out of ten dentists recommend this toothpaste.' Even if true, what makes this potentially misleading?", options: ["Dentists aren't experts in toothpaste", "We don't know what question was asked, or which toothpaste alternatives they compared it to", "Nine is not a significant sample size", "Appeal to authority is always a fallacy"], correct: 1, explanation: "Statistics can be technically true but deeply misleading depending on framing. 'Recommend' could mean 'over no toothpaste at all,' not 'over all competing brands.' Context and methodology matter enormously." },
  { id: "ct2q4", question: "'You can't trust my opponent's environmental policy — he drives a gas-powered car.' This is:", options: ["A valid point about hypocrisy", "Tu Quoque — using the critic's behavior to deflect from the argument", "Red Herring", "Straw Man"], correct: 1, explanation: "Tu Quoque ('you do it too') deflects by pointing to the critic's behavior rather than addressing the argument. Whether the critic is hypocritical is completely separate from whether their argument is correct. Hypocrisy doesn't invalidate logic." },
  { id: "ct2q5", question: "After presenting strong evidence, your opponent says 'OK, but I need peer-reviewed meta-analyses from five different countries.' This is:", options: ["A reasonable evidentiary standard", "Moving the Goalposts — changing the criteria after original criteria were met", "Hasty Generalization", "False Cause"], correct: 1, explanation: "Moving the goalposts happens when someone continually raises the evidential bar after each standard is met. The key signal: the criteria weren't specified in advance — they appear only after evidence is produced. Agree on standards before presenting evidence." },
];

const CT_QUIZ_L3: QuizQuestion[] = [
  { id: "ct3q1", question: "A single dramatic personal story is shared to oppose a vaccine. Why is this weak evidence?", options: ["Personal stories are always fabricated", "Anecdotes tell us nothing about frequency, causation, or whether the event was typical", "The person sharing it isn't a doctor", "It's strong evidence — lived experience counts"], correct: 1, explanation: "Anecdotes are real and emotionally compelling, but they tell us nothing about how common an outcome is, what caused it, or whether millions of other people had the opposite experience. Evidence quality requires data at scale, not individual cases." },
  { id: "ct3q2", question: "Which type of study provides the strongest evidence that X causes Y?", options: ["A survey of public opinion", "An expert panel consensus statement", "A randomized controlled trial with a large sample", "A compelling case study"], correct: 2, explanation: "RCTs randomly assign participants to conditions, which controls for confounding variables that observational studies cannot eliminate. They are the closest we can get to demonstrating causation rather than correlation." },
  { id: "ct3q3", question: "A study shows that people who drink coffee live longer. The best conclusion is:", options: ["Coffee causes longevity", "There is an association between coffee drinking and longevity that warrants further investigation", "Everyone should drink more coffee", "The study is wrong"], correct: 1, explanation: "Correlation does not imply causation. Coffee drinkers may have other lifestyle factors (income, health habits) that explain the difference. Association is a starting point for investigation, not a conclusion." },
  { id: "ct3q4", question: "What does the SIFT method stand for?", options: ["Search, Investigate, Fact-check, Trust", "Stop, Investigate the source, Find better coverage, Trace claims", "Source, Identity, Framing, Truth", "Scan, Identify, Filter, Test"], correct: 1, explanation: "SIFT (Stop, Investigate the source, Find better coverage, Trace claims to their origin) is a four-step framework for evaluating information before sharing or acting on it. 'Stop' is the most important step — it breaks the automatic impulse to react." },
  { id: "ct3q5", question: "A health article claims a study of 24 people found dramatic results. What is the primary concern?", options: ["The study wasn't peer-reviewed", "The sample is too small to draw reliable conclusions", "Medical studies need 10,000 participants minimum", "You can't trust health journalism"], correct: 1, explanation: "Small samples produce highly variable results — the same study run with a different 24 people might show the opposite. Larger representative samples are necessary to detect real effects and rule out chance. Very small studies generate hypotheses, not conclusions." },
];

const CT_QUIZ_L4: QuizQuestion[] = [
  { id: "ct4q1", question: "You've been working on a failing project for 18 months. The rational reason to continue is:", options: ["The 18 months of work already invested", "Evidence that future effort will produce future value", "Your team's emotional attachment to it", "Fairness to past effort"], correct: 1, explanation: "The sunk cost fallacy causes people to continue losing endeavors because of past investment. Rational decision-making is forward-looking — only future costs and future benefits should drive future choices." },
  { id: "ct4q2", question: "Which describes the Dunning-Kruger effect?", options: ["Experts overestimate how much others know", "Low-knowledge individuals overestimate their own competence", "Competent people refuse to share their knowledge", "Learning reduces confidence permanently"], correct: 1, explanation: "People with limited knowledge in a domain often lack the metacognitive ability to recognize what they don't know — producing unearned confidence. Expertise develops alongside the ability to recognize complexity and uncertainty." },
  { id: "ct4q3", question: "Your political party's candidate makes a mistake. You call it a misunderstanding. The rival party's candidate makes the same mistake. You call it incompetence. This illustrates:", options: ["Confirmation Bias", "Availability Heuristic", "In-Group Bias", "Anchoring"], correct: 2, explanation: "In-group bias causes us to apply different interpretive standards to the same behavior depending on who performs it. Recognizing this requires deliberately applying consistent standards regardless of group membership." },
  { id: "ct4q4", question: "You've only seen news about shark attacks this summer and estimate your ocean swimming risk as very high. The actual rate is 1 per 11.5 million ocean visits. Which bias explains this?", options: ["Confirmation Bias", "Framing Effect", "Availability Heuristic", "Anchoring Bias"], correct: 2, explanation: "The availability heuristic judges probability by how easily examples come to mind. Dramatic news coverage makes shark attacks highly memorable and cognitively available, causing systematic overestimation of a rare risk." },
  { id: "ct4q5", question: "The best antidote to confirmation bias is:", options: ["Reading more news sources", "Actively seeking the strongest version of the opposing argument", "Trusting your intuition less", "Avoiding controversial topics"], correct: 1, explanation: "Confirmation bias is defeated by steel-manning: deliberately constructing the strongest possible counterargument to your position. If you can't accurately represent the opposing view, you haven't engaged with it — you've only engaged with your own version of it." },
];

const CT_CAPSTONE_STEPS = [
  { label: "Spot the Errors", q: "Read the argument above carefully. List every logical error, fallacy, or unsupported claim you can find. Be specific — name the problem and quote the exact phrase it applies to.", ph: "e.g., 1. Bandwagon fallacy — 'everyone is talking about it' treats popularity as evidence of effectiveness. 2. Ad hominem — 'out-of-touch executives' dismisses opponents without addressing their concerns. 3. Unverified statistic — '20% output increase' cites no study, no author, no sample size..." },
  { label: "Steelman It", q: "Now argue the best possible version of the 4-day work week case — using only claims you could actually support with real evidence. No fallacies, no unsourced statistics, no personal attacks.", ph: "e.g., The strongest case for a 4-day work week rests on a growing body of controlled trials. Microsoft Japan's 2019 pilot reported a 40% productivity increase (measured by output per hour, not total output). Iceland's 2015–2019 trial — the largest of its kind — found sustained or improved productivity in most sectors. The mechanism is plausible: cognitive fatigue reduces output quality; recovery time improves focus..." },
  { label: "Your Verdict", q: "Based only on evidence you trust — do you think 4-day work weeks are beneficial? State your position, the two strongest pieces of evidence for it, and one significant counterargument you genuinely cannot dismiss.", ph: "e.g., My position: likely beneficial in knowledge-work sectors, with important caveats. Evidence for: (1) Iceland trial — large scale, government-coordinated, found sustained productivity. (2) Reduced burnout is well-documented in the literature, and burnout has measurable productivity costs. Counterargument I can't dismiss: manufacturing and client-service sectors face genuine output constraints that hourly workers can't absorb without overtime pay shifts — the research on these sectors is weaker..." },
];

// ─── Clear Thinking Tab ────────────────────────────────────────────────────────
function ClearThinkingTab() {
  const [activeLesson, setActiveLesson] = useState<CTLessonId | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [activeModule, setActiveModule] = useState<1 | 2 | 3 | null>(null);
  const { addXP } = usePersonalization();

  // L1 state — segmented + analysis lab
  const [ct1Seg, setCt1Seg] = useState(0);
  const [ct1LabInput, setCt1LabInput] = useState("");
  const [ct1LabResult, setCt1LabResult] = useState("");
  const [ct1LabLoading, setCt1LabLoading] = useState(false);

  // L2 state — fallacy explorer + identifier game
  const [activeFallacy, setActiveFallacy] = useState<string | null>(null);
  const [gameStatement, setGameStatement] = useState("");
  const [gameResult, setGameResult] = useState("");
  const [gameLoading, setGameLoading] = useState(false);
  const [selectedGuess, setSelectedGuess] = useState<string | null>(null);

  // L3 state — evidence ranking
  const [ranked, setRanked] = useState<string[]>([]);
  const [rankRevealed, setRankRevealed] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceResult, setSourceResult] = useState("");
  const [sourceLoading, setSourceLoading] = useState(false);

  // L4 state — bias self-assessment
  const [activeBias, setActiveBias] = useState<string | null>(null);
  const [biasReflections, setBiasReflections] = useState<Record<string, string>>({});
  const [savedBiasReflections, setSavedBiasReflections] = useState<Set<string>>(new Set());

  // L5 capstone state
  const [ctStep, setCtStep] = useState(0);
  const [ctAnswers, setCtAnswers] = useState(["", "", ""]);
  const [ctDone, setCtDone] = useState(false);
  const [errorChecks, setErrorChecks] = useState<Record<string, boolean>>({});

  const analyzeMutation = trpc.ai.explainConcept.useMutation({
    onSuccess: (data) => { setGameResult(data.explanation); setGameLoading(false); },
    onError: (err: { message: string }) => { toast.error(err.message); setGameLoading(false); },
  });

  const ct1LabMutation = trpc.ai.explainConcept.useMutation({
    onSuccess: (data) => { setCt1LabResult(data.explanation); setCt1LabLoading(false); },
    onError: (err: { message: string }) => { toast.error(err.message); setCt1LabLoading(false); },
  });

  const handleCt1Lab = () => {
    if (!ct1LabInput.trim()) { toast.error("Enter some text first."); return; }
    setCt1LabLoading(true); setCt1LabResult("");
    ct1LabMutation.mutate({
      concept: `Analyze this text as an argument. Identify: (1) the main CLAIM being made, (2) the EVIDENCE provided (or note if none is given), (3) the INFERENCE — the logical bridge connecting evidence to claim, (4) any hidden premises or unstated assumptions. Format clearly with bold labels. Text: "${ct1LabInput}"`,
      level: "student",
    });
  };

  const sourceMutation = trpc.ai.explainConcept.useMutation({
    onSuccess: (data) => { setSourceResult(data.explanation); setSourceLoading(false); },
    onError: (err: { message: string }) => { toast.error(err.message); setSourceLoading(false); },
  });

  const handleCTComplete = (id: CTLessonId) => {
    if (completedLessons.has(id)) return;
    const meta = CT_LESSON_META.find((l) => l.id === id)!;
    setCompletedLessons((prev) => new Set(Array.from(prev).concat(id)));
    addXP(meta.xp);
    toast.success(`+${meta.xp} XP — Lesson complete!`);
  };

  const handleAnalyzeFallacy = () => {
    if (!gameStatement.trim()) { toast.error("Enter a statement first."); return; }
    setGameLoading(true); setGameResult(""); setSelectedGuess(null);
    analyzeMutation.mutate({
      concept: `Analyze this statement for logical fallacies: "${gameStatement}". Identify any fallacies present (or confirm it's a sound argument). Name each fallacy, quote the exact part of the statement that contains it, and briefly explain why it qualifies. Be direct and educational.`,
      level: "student",
    });
  };

  const handleSourceCheck = () => {
    if (!sourceUrl.trim()) { toast.error("Paste a claim or URL first."); return; }
    setSourceLoading(true); setSourceResult("");
    sourceMutation.mutate({
      concept: `Evaluate the credibility of this source or claim: "${sourceUrl}". Apply the SIFT method (Stop, Investigate the source, Find better coverage, Trace claims). Rate its credibility (High / Medium / Low / Unknown) and explain what signals you used to reach that judgment. Be specific and educational.`,
      level: "student",
    });
  };

  const overallPct = Math.round((completedLessons.size / CT_LESSON_META.length) * 100);

  const ct1Segments = [
    {
      title: "Claims, Evidence & Inference",
      narration: "Every argument — whether it's a news headline, a friend's opinion, or a policy debate — has the same three parts: a claim, evidence, and an inference. Learning to spot all three is the foundation of clear thinking.",
      body: (
        <div className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground leading-relaxed">An argument is not a fight. It is a structured attempt to show that a <strong className="text-foreground">claim</strong> is true, supported by <strong className="text-foreground">evidence</strong>, connected by <strong className="text-foreground">inference</strong>.</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Claim", def: "What you're asserting is true.", ex: "\"Regular exercise improves mood.\"", color: "oklch(0.72_0.2_260)", icon: <Target size={18} /> },
              { label: "Evidence", def: "The support for the claim — data, studies, observations.", ex: "\"A meta-analysis of 49 RCTs found exercise reduces depression symptoms.\"", color: "oklch(0.72_0.18_150)", icon: <FlaskConical size={18} /> },
              { label: "Inference", def: "The logical bridge from evidence to claim.", ex: "\"Since the evidence shows reduced symptoms, the claim about mood is supported.\"", color: "oklch(0.78_0.16_30)", icon: <ArrowRight size={18} /> },
            ].map(({ label, def, ex, color, icon }) => (
              <div key={label} className="glass rounded-xl p-4 border border-white/8">
                <div className="flex items-center gap-2 mb-2" style={{ color }}>{icon}<span className="font-bold text-sm">{label}</span></div>
                <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{def}</p>
                <div className="text-xs italic text-foreground/70 leading-relaxed border-l-2 pl-2" style={{ borderColor: color }}>{ex}</div>
              </div>
            ))}
          </div>
          <div className="glass rounded-xl p-4 border border-white/10">
            <div className="flex items-start gap-2"><Info size={13} className="text-[oklch(0.72_0.2_260)] mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground"><strong className="text-foreground">Key insight:</strong> A claim can sound like evidence ("studies show...") but still require you to ask: which studies? How rigorous? What did they actually measure? The structure of an argument is just the starting point — quality of evidence is where critical thinking begins.</p>
            </div>
          </div>
        </div>
      ),
      topics: ["What makes a claim falsifiable", "The difference between deductive and inductive reasoning", "How to identify hidden premises in an argument", "What 'burden of proof' actually means"],
    },
    {
      title: "Valid vs. Sound Arguments",
      narration: "An argument can be perfectly logical in structure and still lead you to a false conclusion. Validity and soundness are different — and confusing them is one of the most common reasoning errors people make.",
      body: (
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Valid", color: "oklch(0.78_0.16_30)", desc: "The conclusion follows logically from the premises — IF the premises were true, the conclusion must be true.", example: "All cats are reptiles. (False)\nMy pet is a cat. (True)\n∴ My pet is a reptile. (Logically valid — but unsound!)", verdict: "Valid but NOT sound" },
              { label: "Sound", color: "oklch(0.72_0.18_150)", desc: "Valid structure AND true premises. Both requirements must be met for an argument to be genuinely convincing.", example: "All mammals have hearts. (True)\nDogs are mammals. (True)\n∴ Dogs have hearts. (True)", verdict: "Valid AND sound" },
            ].map(({ label, color, desc, example, verdict }) => (
              <div key={label} className="glass rounded-xl p-4 border border-white/8 space-y-2">
                <div className="text-sm font-bold" style={{ color }}>{label}</div>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                <div className="font-mono text-xs text-foreground/70 bg-white/3 rounded-lg p-3 whitespace-pre leading-relaxed">{example}</div>
                <div className="text-xs font-semibold" style={{ color }}>{verdict}</div>
              </div>
            ))}
          </div>
          <div className="glass rounded-xl p-4 border border-white/10">
            <div className="flex items-start gap-2"><AlertTriangle size={13} className="text-[oklch(0.78_0.16_30)] mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground"><strong className="text-foreground">Why this matters:</strong> Propaganda and misinformation often use valid logical structures with false premises. The argument sounds airtight — but only if you never question the starting assumptions. Always examine the premises, not just the logic.</p>
            </div>
          </div>
        </div>
      ),
      topics: ["What a syllogism is and why it matters", "How to spot false premises disguised as facts", "The difference between correlation and causation in arguments", "How to construct a deductively valid argument"],
    },
    {
      title: "Spotting Arguments in the Wild",
      narration: "Arguments don't announce themselves. They show up in news articles, social media posts, conversations, and product marketing — often dressed as facts. The skill is learning to pause and ask: is this an argument or just an assertion?",
      body: (
        <div className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground leading-relaxed">An <strong className="text-foreground">assertion</strong> is a statement made without support. An <strong className="text-foreground">argument</strong> attempts to provide reasons. In everyday discourse, the two are constantly confused.</p>
          <div className="space-y-3">
            {[
              { type: "Assertion", text: "\"Social media is destroying young people's mental health.\"", verdict: "No evidence, no inference — this is a claim presented as established fact.", color: "oklch(0.68_0.22_20)" },
              { type: "Weak Argument", text: "\"Social media is harmful because I can see teenagers are unhappy and they're all on their phones.\"", verdict: "Has a reason, but it's anecdotal and conflates correlation with causation.", color: "oklch(0.78_0.16_30)" },
              { type: "Proper Argument", text: "\"A 2022 systematic review of 72 studies found significant associations between heavy social media use and depression in adolescents, though the effect size varies by platform and usage type.\"", verdict: "Cites specific evidence, acknowledges nuance, and draws a proportionate conclusion.", color: "oklch(0.72_0.18_150)" },
            ].map(({ type, text, verdict, color }) => (
              <div key={type} className="glass rounded-xl p-4 border border-white/8">
                <div className="text-xs font-semibold mb-2" style={{ color }}>{type}</div>
                <p className="text-sm text-foreground italic mb-2">{text}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{verdict}</p>
              </div>
            ))}
          </div>
        </div>
      ),
      topics: ["What indicator words signal conclusions vs. premises", "How to diagram a complex argument", "Why appeals to emotion aren't inherently fallacious", "The difference between an argument and an explanation"],
    },
    {
      title: "Deductive vs. Inductive Reasoning",
      narration: "There are two fundamentally different ways to build an argument. Deductive reasoning guarantees the conclusion if premises are true. Inductive reasoning makes conclusions probable — never certain. Understanding which type you're dealing with changes how you evaluate it.",
      body: (
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: "Deductive", color: "oklch(0.72_0.2_260)",
                desc: "Moves from general premises to a specific conclusion. If premises are true and the argument is valid, the conclusion is guaranteed — it cannot be false.",
                example: "All humans are mortal.\nSocrates is human.\n∴ Socrates is mortal.\n\n(If both premises are true, the conclusion is certain.)",
                strength: "The conclusion follows necessarily",
                weakness: "Only as strong as its weakest premise"
              },
              {
                label: "Inductive", color: "oklch(0.72_0.18_150)",
                desc: "Moves from specific observations to a general conclusion. Even a perfect inductive argument cannot guarantee its conclusion — it only makes it more probable.",
                example: "Every crow we've ever observed is black.\nTherefore, all crows are probably black.\n\n(In 1697, Europeans discovered black swans. The conclusion failed.)",
                strength: "Grounds conclusions in real observations",
                weakness: "Can be overturned by a single counterexample"
              },
            ].map(({ label, color, desc, example, strength, weakness }) => (
              <div key={label} className="glass rounded-xl p-4 border border-white/8 space-y-2">
                <div className="text-sm font-bold" style={{ color }}>{label}</div>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                <div className="font-mono text-xs text-foreground/70 bg-white/3 rounded-lg p-3 whitespace-pre leading-relaxed">{example}</div>
                <div className="flex flex-col gap-1">
                  <div className="text-xs text-[oklch(0.72_0.18_150)]">✓ {strength}</div>
                  <div className="text-xs text-[oklch(0.68_0.22_20)]">✗ {weakness}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="glass rounded-xl p-4 border border-white/10 space-y-2">
            <div className="text-xs font-semibold text-foreground">Most arguments in real life are inductive</div>
            <p className="text-xs text-muted-foreground leading-relaxed">Science, policy, medicine, and daily decision-making mostly use inductive reasoning — building probable conclusions from evidence. The question is never "is this certain?" but "is the evidence strong enough to justify this level of confidence?" The strength of an inductive argument depends on the sample size, representativeness, and whether alternative explanations have been ruled out.</p>
          </div>
          <div className="glass rounded-xl p-4 border border-white/10">
            <div className="text-xs font-semibold text-foreground mb-2">Abductive Reasoning — the third type</div>
            <p className="text-xs text-muted-foreground leading-relaxed">Abduction reasons to the <em>best explanation</em>: "The ground is wet — it probably rained." It doesn't guarantee the conclusion (the sprinklers might have run) but picks the most plausible explanation given available evidence. Doctors, detectives, and scientists use abduction constantly — it's how diagnosis works.</p>
          </div>
        </div>
      ),
      topics: ["Why inductive arguments can't be 'valid' in the formal sense", "Abductive reasoning and inference to the best explanation", "How scientific methodology handles inductive uncertainty", "The role of Bayesian updating in inductive thinking"],
    },
    {
      title: "Hidden Premises & Burden of Proof",
      narration: "The most dangerous parts of an argument are the parts that aren't there. Hidden premises do real logical work while staying invisible — and whoever makes a claim bears the burden of proving it, not the other way around.",
      body: (
        <div className="space-y-4 mt-4">
          <div className="glass rounded-xl p-5 border border-white/8">
            <div className="text-sm font-semibold text-foreground mb-3">Surfacing Hidden Premises</div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">A hidden premise is an assumption the argument requires to be valid but never states. Finding it is critical — it converts an air-tight-sounding argument into something that can be challenged directly.</p>
            <div className="space-y-3">
              {[
                {
                  argument: "\"Women make worse engineers because they're more emotional.\"",
                  surface: "Women → emotional → worse engineers",
                  hidden: [
                    "1. Emotion is incompatible with engineering (not argued, just assumed)",
                    "2. Women are more emotional than men on average (disputed empirically)",
                    "3. Individual differences don't override group averages in performance (false)"
                  ],
                  color: "oklch(0.68_0.22_20)"
                },
                {
                  argument: "\"We shouldn't fund the arts — people need jobs, not paintings.\"",
                  surface: "Jobs > arts → don't fund arts",
                  hidden: [
                    "1. Funding arts prevents job creation (false — arts sector employs 5M+ in the US)",
                    "2. Arts and economic support are mutually exclusive (false)",
                    "3. Cultural value has no economic or social benefit (empirically contested)"
                  ],
                  color: "oklch(0.72_0.2_260)"
                },
              ].map(({ argument, surface, hidden, color }) => (
                <div key={argument} className="glass rounded-xl p-4 border border-white/8">
                  <div className="text-xs font-semibold mb-1" style={{ color }}>Argument</div>
                  <p className="text-sm text-foreground italic mb-3">{argument}</p>
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Surface logic: {surface}</div>
                  <div className="text-xs font-semibold mb-1" style={{ color }}>Hidden premises exposed:</div>
                  {hidden.map((h, i) => <p key={i} className="text-xs text-muted-foreground leading-relaxed">{h}</p>)}
                </div>
              ))}
            </div>
          </div>
          <div className="glass rounded-xl p-5 border border-white/8">
            <div className="text-sm font-semibold text-foreground mb-2">Burden of Proof</div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">Whoever makes a claim bears the burden of proving it. This is not just a legal principle — it's a logical necessity. Without it, every unfalsifiable claim becomes equally valid by default.</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { rule: "Positive claims need positive evidence", ex: "'X causes cancer' requires evidence that it does — not absence of evidence that it doesn't.", color: "oklch(0.68_0.22_20)" },
                { rule: "The default is skepticism, not belief", ex: "'Extraordinary claims require extraordinary evidence' (Sagan). The bigger the claim, the stronger the evidence required.", color: "oklch(0.72_0.2_260)" },
                { rule: "Unfalsifiability is not strength", ex: "If a claim cannot possibly be tested or disproven, it is not a scientific or logical claim — it is a belief or assertion.", color: "oklch(0.72_0.18_150)" },
              ].map(({ rule, ex, color }) => (
                <div key={rule} className="glass rounded-lg p-3 border border-white/8">
                  <div className="text-xs font-semibold mb-1" style={{ color }}>{rule}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{ex}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
      topics: ["How to find hidden premises in any argument", "The difference between burden of proof and shifting the burden", "Russell's Teapot and unfalsifiable claims", "How to respond to 'prove it doesn't exist'"],
    },
  ];

  function CTLessonShell({ id, children }: { id: CTLessonId; children: React.ReactNode }) {
    const meta = CT_LESSON_META.find((l) => l.id === id)!;
    const done = completedLessons.has(id);
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
        <button onClick={() => setActiveLesson(null)} className="flex items-center gap-1.5 mb-5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={14} /> Back to all lessons
        </button>
        <div className="glass rounded-2xl p-5 border border-white/8 mb-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Clear Thinking · Module 1 · The Architecture of an Argument</div>
              <h2 className="text-xl font-bold text-foreground">{meta.title}</h2>
              <p className="text-sm text-muted-foreground">{meta.subtitle}</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock size={10} /> {meta.duration}</span>
              <span className="flex items-center gap-1 text-xs" style={{ color: meta.color }}><Zap size={10} /> +{meta.xp} XP</span>
              {done && <span className="flex items-center gap-1 text-xs text-[oklch(0.72_0.18_150)] font-medium"><CheckCircle2 size={10} /> Complete</span>}
            </div>
          </div>
        </div>
        {children}
        <div className="mt-8 pt-6 border-t border-white/8">
          {done
            ? <div className="flex items-center justify-center gap-2 text-sm text-[oklch(0.72_0.18_150)]"><Award size={15} /> Lesson complete — great work!</div>
            : <motion.button onClick={() => handleCTComplete(id)} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 text-black"
                style={{ background: `linear-gradient(to right, ${meta.color}, oklch(0.72_0.18_150))` }}>
                <CheckCircle2 size={15} /> Mark Complete & Earn {meta.xp} XP
              </motion.button>
          }
        </div>
        {id !== "ct5" && (
          <div className="mt-4 flex justify-end">
            <button onClick={() => { const ids: CTLessonId[] = ["ct1","ct2","ct3","ct4","ct5"]; const idx = ids.indexOf(id); setActiveLesson(ids[idx + 1]); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg glass border border-white/10 text-sm text-muted-foreground hover:text-foreground transition-colors">
              Next lesson <ChevronRight size={13} />
            </button>
          </div>
        )}
      </motion.div>
    );
  }

  // ── Course overview (no module selected) ──────────────────────────────────
  if (activeModule === null) {
    const ctModules = [
      {
        num: 1 as const,
        title: "The Architecture of an Argument",
        desc: "Claims, evidence, inference, logical fallacies, cognitive biases, and evaluating sources",
        color: "oklch(0.72_0.2_260)",
        xp: 340,
        lessons: 5,
        icon: <Scale size={22} />,
        topics: ["Argument anatomy", "Valid vs. sound", "Deductive & inductive", "8 logical fallacies", "Cognitive biases", "Source evaluation"],
      },
      {
        num: 2 as const,
        title: "Thinking in Real Life",
        desc: "Misinformation, statistical traps, persuasion vs. manipulation, and decisions under uncertainty",
        color: "oklch(0.72_0.2_290)",
        xp: 380,
        lessons: 5,
        icon: <Globe size={22} />,
        topics: ["How misinformation spreads", "Statistical traps", "Persuasion vs. manipulation", "Decision frameworks", "Pre-mortem thinking"],
      },
      {
        num: 3 as const,
        title: "Systems & Self",
        desc: "Mental models, argument mapping, systems thinking, motivated reasoning, and your capstone project",
        color: "oklch(0.70_0.22_270)",
        xp: 390,
        lessons: 5,
        icon: <GitBranch size={22} />,
        topics: ["Mental models", "Argument mapping", "Systems thinking", "Motivated reasoning", "Capstone project"],
      },
    ];
    const totalXP = ctModules.reduce((sum, m) => sum + m.xp, 0);
    return (
      <div className="p-4 max-w-2xl mx-auto space-y-5">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl p-6" style={{ background: "linear-gradient(135deg, oklch(0.16 0.05 260), oklch(0.13 0.07 280))", border: "1px solid oklch(0.72_0.2_260_/_0.3)" }}>
          <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(ellipse 60% 80% at 80% 20%, oklch(0.72_0.2_260_/_0.4), transparent)" }} />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-[10px] font-black tracking-[0.2em] text-[oklch(0.72_0.2_260)] mb-1">CLEAR THINKING COURSE</div>
                <h1 className="text-2xl font-black text-white leading-tight">Think Sharper.<br />Argue Better.</h1>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-white">{totalXP}</div>
                <div className="text-xs text-muted-foreground">total XP</div>
              </div>
            </div>
            <p className="text-sm text-white/60 leading-relaxed mb-4">
              Master the tools of clear reasoning — from argument anatomy and logical fallacies to statistical thinking, systems analysis, and the biases that make smart people wrong. By the end, you'll be able to dismantle any argument and build unassailable ones.
            </p>
            <div className="flex items-center gap-4 text-xs text-white/50">
              <span className="flex items-center gap-1"><BookOpen size={11} />15 lessons</span>
              <span className="flex items-center gap-1"><Clock size={11} />~3 hrs total</span>
              <span className="flex items-center gap-1"><Sparkles size={11} />3 modules</span>
              <span className="flex items-center gap-1"><FlaskConical size={11} />12+ live exercises</span>
            </div>
          </div>
        </div>

        {/* Module cards */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Choose a Module</div>
          {ctModules.map(mod => (
            <motion.button key={mod.num} onClick={() => setActiveModule(mod.num)}
              whileHover={{ scale: 1.008 }} whileTap={{ scale: 0.995 }}
              className="w-full text-left rounded-2xl overflow-hidden"
              style={{ background: `oklch(from ${mod.color} l c h / 0.06)`, border: `1px solid oklch(from ${mod.color} l c h / 0.25)` }}>
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: `oklch(from ${mod.color} l c h / 0.15)`, border: `1px solid oklch(from ${mod.color} l c h / 0.3)`, color: mod.color }}>
                      {mod.icon}
                    </div>
                    <div>
                      <div className="text-[10px] font-bold tracking-widest mb-0.5" style={{ color: mod.color }}>MODULE {mod.num}</div>
                      <div className="font-bold text-foreground">{mod.title}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <div className="text-lg font-black" style={{ color: mod.color }}>+{mod.xp}</div>
                    <div className="text-[10px] text-muted-foreground">XP</div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3 pl-13">{mod.desc}</p>
                <div className="flex flex-wrap gap-1.5 pl-13">
                  {mod.topics.map(t => (
                    <span key={t} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: `oklch(from ${mod.color} l c h / 0.1)`, color: mod.color, border: `1px solid oklch(from ${mod.color} l c h / 0.25)` }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="px-5 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><BookOpen size={10} /> {mod.lessons} lessons</span>
                </div>
                <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: mod.color }}>
                  Start module <ArrowRight size={11} />
                </span>
              </div>
            </motion.button>
          ))}
        </div>

        {/* What you'll build */}
        <div className="glass rounded-2xl p-5 border border-white/8">
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={14} className="text-[oklch(0.72_0.2_260)]" />
            <h4 className="font-semibold text-sm text-foreground">What you'll be able to do</h4>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { n: "Argument Analysis", d: "Dissect any claim into structure, evidence, and inference" },
              { n: "Fallacy Detection", d: "Name and counter 12+ logical fallacies on sight" },
              { n: "Bias Awareness", d: "Recognize 10+ cognitive biases in yourself and others" },
              { n: "Statistical Literacy", d: "Spot misleading data, relative risk tricks, and cherry-picked timeframes" },
              { n: "Systems Thinking", d: "Model feedback loops, unintended consequences, and emergence" },
              { n: "Steel-Manning", d: "Build the strongest possible version of any opposing argument" },
            ].map(({ n, d }) => (
              <div key={n} className="glass rounded-lg p-3 border border-white/8">
                <div className="text-xs font-semibold text-foreground mb-0.5">{n}</div>
                <p className="text-xs text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (activeLesson !== null) return (
    <AnimatePresence mode="wait">

      {/* ── Lesson 1: What Makes an Argument? ── */}
      {activeLesson === "ct1" && (
        <CTLessonShell key="ct1" id="ct1">
          <div className="space-y-4">
            {/* Segment tabs */}
            <div className="flex gap-2">
              {ct1Segments.map((s, i) => (
                <button key={i} onClick={() => setCt1Seg(i)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all border ${
                    ct1Seg === i ? "bg-[oklch(0.72_0.2_260_/_0.15)] border-[oklch(0.72_0.2_260_/_0.4)] text-[oklch(0.82_0.2_260)]" : "glass border-white/8 text-muted-foreground"
                  }`}>{i + 1}. {s.title}</button>
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={ct1Seg} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                className="glass rounded-2xl p-6 border border-white/8">
                <h3 className="font-semibold text-foreground mb-3">{ct1Segments[ct1Seg].title}</h3>
                <Narrator text={ct1Segments[ct1Seg].narration} />
                {ct1Segments[ct1Seg].body}
                <SegmentFooter
                  accentColor="oklch(0.72_0.2_260)"
                  onReady={ct1Seg < ct1Segments.length - 1 ? () => setCt1Seg(ct1Seg + 1) : undefined}
                  topics={ct1Segments[ct1Seg].topics}
                />
              </motion.div>
            </AnimatePresence>
            <div className="flex justify-between">
              <button onClick={() => setCt1Seg(Math.max(0, ct1Seg - 1))} disabled={ct1Seg === 0}
                className="flex items-center gap-1 px-4 py-2 rounded-lg glass border border-white/8 text-sm text-muted-foreground disabled:opacity-40">
                <ChevronLeft size={13} /> Previous
              </button>
              {ct1Seg < ct1Segments.length - 1 && (
                <button onClick={() => setCt1Seg(ct1Seg + 1)}
                  className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[oklch(0.72_0.2_260_/_0.15)] border border-[oklch(0.72_0.2_260_/_0.3)] text-sm text-[oklch(0.82_0.2_260)]">
                  Next <ChevronRight size={13} />
                </button>
              )}
            </div>
            {/* Argument Analysis Lab */}
            <div className="glass rounded-2xl p-5 border border-[oklch(0.72_0.2_260_/_0.2)]">
              <div className="text-xs font-semibold text-[oklch(0.82_0.2_260)] mb-1">ARGUMENT ANALYSIS LAB</div>
              <p className="text-xs text-muted-foreground mb-3">Paste any argument, news headline, or claim. The AI will dissect it into claim, evidence, inference, and hidden premises — and show you exactly how its structure works.</p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[
                  "\"Organic food is healthier because it doesn't contain pesticides.\"",
                  "\"Crime went up after the new policy, so the policy must have caused it.\"",
                  "\"This supplement is safe — my doctor said natural ingredients are always fine.\"",
                  "\"Everyone is moving to electric cars, so they must be clearly better.\"",
                ].map(ex => (
                  <button key={ex} onClick={() => setCt1LabInput(ex.replace(/^"|"$/g, ""))}
                    className="text-xs text-left px-3 py-2 rounded-lg glass border border-white/8 text-muted-foreground hover:border-[oklch(0.72_0.2_260_/_0.4)] hover:text-foreground transition-all">
                    {ex}
                  </button>
                ))}
              </div>
              <textarea value={ct1LabInput} onChange={e => setCt1LabInput(e.target.value)}
                placeholder="Or type your own argument, headline, or claim here..."
                rows={3} className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[oklch(0.72_0.2_260_/_0.5)] resize-none mb-3" />
              <motion.button onClick={handleCt1Lab} disabled={ct1LabLoading || !ct1LabInput.trim()}
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                style={{ background: "oklch(0.72_0.2_260)" }}>
                {ct1LabLoading ? <><RefreshCw size={13} className="animate-spin" /> Analyzing…</> : <><Search size={13} /> Analyze Argument</>}
              </motion.button>
              <AnimatePresence>
                {ct1LabResult && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 rounded-xl bg-[oklch(0.72_0.2_260_/_0.08)] border border-[oklch(0.72_0.2_260_/_0.25)]">
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{ct1LabResult}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="glass rounded-2xl p-5 border border-white/8">
              <h4 className="font-semibold text-foreground mb-3">Knowledge Check</h4>
              <QuizBlock questions={CT_QUIZ_L1} accentColor="oklch(0.72_0.2_260)" />
            </div>
          </div>
        </CTLessonShell>
      )}

      {/* ── Lesson 2: Logical Fallacies ── */}
      {activeLesson === "ct2" && (
        <CTLessonShell key="ct2" id="ct2">
          <div className="space-y-5">
            <div className="glass rounded-2xl p-6 border border-white/8">
              <Narrator text="A logical fallacy is a flaw in reasoning that makes an argument invalid — even when the conclusion might happen to be true. Fallacies are not just academic curiosities: politicians, advertisers, and debaters use them constantly, often unconsciously. Learning to name them gives you the vocabulary to dismantle bad arguments without losing your temper — and to avoid using them yourself." />
              <div className="mt-4 space-y-3">
                {[
                  {
                    category: "Attacks & Deflections",
                    color: "oklch(0.68_0.22_20)",
                    fallacies: ["Ad Hominem", "Tu Quoque", "Red Herring", "Straw Man"],
                    desc: "These avoid engaging with the argument by attacking the person, deflecting to a side issue, or misrepresenting the opponent's position."
                  },
                  {
                    category: "False Structure",
                    color: "oklch(0.72_0.2_260)",
                    fallacies: ["False Dilemma", "Circular Reasoning", "Equivocation", "Moving the Goalposts"],
                    desc: "These arguments appear logically structured but rely on faulty reasoning — false binaries, circular definitions, or shifting standards."
                  },
                  {
                    category: "Bad Evidence",
                    color: "oklch(0.72_0.18_150)",
                    fallacies: ["Appeal to Authority", "Bandwagon", "Hasty Generalization", "False Cause", "Gambler's Fallacy"],
                    desc: "These treat insufficient, irrelevant, or misleading evidence as though it proves a conclusion."
                  },
                  {
                    category: "Manipulation",
                    color: "oklch(0.78_0.16_30)",
                    fallacies: ["Appeal to Emotion", "Appeal to Nature", "Slippery Slope", "No True Scotsman"],
                    desc: "These bypass logic entirely — exploiting emotions, natural origin, fear of extremes, or unfalsifiable group definitions."
                  },
                ].map(({ category, color, fallacies, desc }) => (
                  <div key={category} className="glass rounded-xl p-4 border border-white/8">
                    <div className="text-xs font-bold mb-1" style={{ color }}>{category}</div>
                    <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{desc}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {fallacies.map(name => (
                        <span key={name} className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: `oklch(from ${color} l c h / 0.12)`, color, border: `1px solid oklch(from ${color} l c h / 0.3)` }}>
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 glass rounded-xl p-4 border border-white/10">
                <div className="flex items-start gap-2"><Info size={13} className="text-[oklch(0.68_0.22_20)] mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground"><strong className="text-foreground">Important:</strong> A fallacious argument can accidentally reach a true conclusion. The point is not whether the conclusion is correct — it's whether the reasoning used to get there actually supports it. Bad reasoning that leads to a true conclusion is still bad reasoning; it just got lucky.</p>
                </div>
              </div>
              <SegmentFooter accentColor="oklch(0.68_0.22_20)"
                topics={["Why fallacies can still lead to true conclusions", "The difference between informal and formal fallacies", "How to respond to a fallacy without sounding condescending", "Why ad hominem is sometimes contextually relevant (credibility of testimony)"]} />
            </div>

            {/* Fallacy explorer */}
            <div className="text-sm font-semibold text-foreground">Click any of the 17 fallacies to study it in depth:</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FALLACIES.map((f) => (
                <button key={f.id} onClick={() => setActiveFallacy(activeFallacy === f.id ? null : f.id)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-medium transition-all border text-left ${
                    activeFallacy === f.id
                      ? "bg-[oklch(0.68_0.22_20_/_0.15)] border-[oklch(0.68_0.22_20_/_0.4)] text-[oklch(0.78_0.22_20)]"
                      : "glass border-white/8 text-muted-foreground hover:border-white/20"
                  }`}>{f.name}</button>
              ))}
            </div>

            <AnimatePresence>
              {activeFallacy && (() => {
                const f = FALLACIES.find((x) => x.id === activeFallacy)!;
                return (
                  <motion.div key={activeFallacy} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
                    className="glass rounded-2xl p-6 border border-[oklch(0.68_0.22_20_/_0.3)] space-y-3">
                    <h3 className="font-bold text-foreground text-lg">{f.name}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.definition}</p>
                    <div className="glass rounded-xl p-4 border border-[oklch(0.68_0.22_20_/_0.2)]">
                      <div className="text-xs font-semibold text-[oklch(0.68_0.22_20)] mb-2">EXAMPLE</div>
                      <p className="text-sm text-foreground italic leading-relaxed">{f.example}</p>
                    </div>
                    <div className="glass rounded-xl p-4 border border-[oklch(0.72_0.18_150_/_0.2)]">
                      <div className="text-xs font-semibold text-[oklch(0.72_0.18_150)] mb-2">HOW TO RESPOND</div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{f.rebuttal}</p>
                    </div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>

            {/* Live fallacy detector */}
            <div className="glass rounded-2xl p-5 border border-[oklch(0.68_0.22_20_/_0.2)]">
              <div className="text-xs font-semibold text-[oklch(0.68_0.22_20)] mb-1">FALLACY DETECTOR</div>
              <p className="text-xs text-muted-foreground mb-3">Paste any argument, headline, or statement. The AI will identify any fallacies present.</p>
              <textarea value={gameStatement} onChange={(e) => setGameStatement(e.target.value)}
                placeholder="e.g., 'You can't criticize the government's climate policy — you drive a car.'"
                rows={3} className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[oklch(0.68_0.22_20_/_0.5)] resize-none mb-3" />
              <motion.button onClick={handleAnalyzeFallacy} disabled={gameLoading || !gameStatement.trim()}
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                style={{ background: "oklch(0.68_0.22_20)" }}>
                {gameLoading ? <><RefreshCw size={13} className="animate-spin" /> Analyzing…</> : <><Search size={13} /> Detect Fallacies</>}
              </motion.button>
              <AnimatePresence>
                {gameResult && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 rounded-xl bg-[oklch(0.68_0.22_20_/_0.08)] border border-[oklch(0.68_0.22_20_/_0.25)]">
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{gameResult}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="glass rounded-2xl p-5 border border-white/8">
              <h4 className="font-semibold text-foreground mb-3">Knowledge Check</h4>
              <QuizBlock questions={CT_QUIZ_L2} accentColor="oklch(0.68_0.22_20)" />
            </div>
          </div>
        </CTLessonShell>
      )}

      {/* ── Lesson 3: Evidence & Sources ── */}
      {activeLesson === "ct3" && (
        <CTLessonShell key="ct3" id="ct3">
          <div className="space-y-5">
            <div className="glass rounded-2xl p-6 border border-white/8">
              <Narrator text="The quality of an argument is only as good as its evidence. Not all evidence is created equal. A personal story and a randomized controlled trial can both support the same claim — but they carry very different weight." />
              <div className="mt-4 space-y-2">
                {EVIDENCE_ITEMS.map((ev) => (
                  <div key={ev.id} className="glass rounded-xl p-4 border border-white/8 flex items-center gap-4">
                    <div className="flex gap-1 shrink-0">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className={`w-2.5 h-6 rounded-sm ${i < ev.strength ? "bg-[oklch(0.72_0.18_150)]" : "bg-white/10"}`} />
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground">{ev.label}</div>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{ev.description}</p>
                    </div>
                    <div className="shrink-0 text-xs font-bold text-[oklch(0.72_0.18_150)]">{ev.strength}/5</div>
                  </div>
                ))}
              </div>
              <SegmentFooter accentColor="oklch(0.72_0.18_150)"
                topics={["What makes an RCT more reliable than an observational study", "Why meta-analyses can still be flawed", "How publication bias distorts scientific literature", "What 'peer review' actually means — and its limits"]} />
            </div>

            {/* Ranking game */}
            <div className="glass rounded-2xl p-5 border border-[oklch(0.72_0.18_150_/_0.2)]">
              <div className="text-xs font-semibold text-[oklch(0.72_0.18_150)] mb-1">RANKING CHALLENGE</div>
              <p className="text-xs text-muted-foreground mb-4">Rank these five evidence types from strongest (1) to weakest (5) — tap in order.</p>
              {!rankRevealed ? (
                <>
                  <div className="space-y-2 mb-4">
                    {EVIDENCE_ITEMS.map((ev) => {
                      const pos = ranked.indexOf(ev.id);
                      return (
                        <button key={ev.id} onClick={() => {
                          if (pos >= 0) setRanked(ranked.filter((r) => r !== ev.id));
                          else if (ranked.length < 5) setRanked([...ranked, ev.id]);
                        }}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm border transition-all text-left ${
                            pos >= 0
                              ? "bg-[oklch(0.72_0.18_150_/_0.15)] border-[oklch(0.72_0.18_150_/_0.4)] text-foreground"
                              : "glass border-white/8 text-muted-foreground hover:border-white/20"
                          }`}>
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border ${
                            pos >= 0 ? "bg-[oklch(0.72_0.18_150)] border-[oklch(0.72_0.18_150)] text-white" : "border-white/20 text-muted-foreground"
                          }`}>{pos >= 0 ? pos + 1 : ""}</span>
                          <span className="flex-1">{ev.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-3">
                    <motion.button onClick={() => setRankRevealed(true)} disabled={ranked.length < 5}
                      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                      className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-medium text-black disabled:opacity-40"
                      style={{ background: "linear-gradient(to right, oklch(0.72_0.18_150), oklch(0.72_0.2_260))" }}>
                      <CheckCircle2 size={13} /> Reveal answer
                    </motion.button>
                    {ranked.length > 0 && (
                      <button onClick={() => setRanked([])} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Reset</button>
                    )}
                  </div>
                </>
              ) : (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                  {EVIDENCE_ITEMS.slice().sort((a, b) => b.strength - a.strength).map((ev, i) => {
                    const userPos = ranked.indexOf(ev.id);
                    const correct = userPos === i;
                    return (
                      <div key={ev.id} className={`flex items-center gap-3 p-3 rounded-xl border text-sm ${
                        correct ? "bg-[oklch(0.72_0.18_150_/_0.1)] border-[oklch(0.72_0.18_150_/_0.3)] text-foreground" : "glass border-white/8 text-muted-foreground"
                      }`}>
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-[oklch(0.72_0.18_150)] text-white">{i + 1}</span>
                        <span className="flex-1">{ev.label}</span>
                        {correct ? <CheckCircle2 size={13} className="text-[oklch(0.72_0.18_150)] shrink-0" /> : <span className="text-xs text-muted-foreground shrink-0">You ranked: {userPos + 1}</span>}
                      </div>
                    );
                  })}
                  <button onClick={() => { setRanked([]); setRankRevealed(false); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-2">Try again</button>
                </motion.div>
              )}
            </div>

            {/* Live source evaluator */}
            <div className="glass rounded-2xl p-5 border border-[oklch(0.72_0.18_150_/_0.2)]">
              <div className="text-xs font-semibold text-[oklch(0.72_0.18_150)] mb-1">SOURCE EVALUATOR</div>
              <p className="text-xs text-muted-foreground mb-3">Paste a claim, headline, or URL. Get a credibility analysis using the SIFT method.</p>
              <div className="flex gap-2">
                <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSourceCheck()}
                  placeholder="e.g., 'Scientists say coffee prevents cancer' or paste a URL…"
                  className="flex-1 bg-white/3 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[oklch(0.72_0.18_150_/_0.5)] transition-colors" />
                <motion.button onClick={handleSourceCheck} disabled={sourceLoading || !sourceUrl.trim()}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                  style={{ background: "oklch(0.72_0.18_150)" }}>
                  {sourceLoading ? <><RefreshCw size={13} className="animate-spin" /> Checking…</> : <><Search size={13} /> Evaluate</>}
                </motion.button>
              </div>
              <AnimatePresence>
                {sourceResult && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 rounded-xl bg-[oklch(0.72_0.18_150_/_0.08)] border border-[oklch(0.72_0.18_150_/_0.2)]">
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{sourceResult}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="glass rounded-2xl p-5 border border-white/8">
              <h4 className="font-semibold text-foreground mb-3">Knowledge Check</h4>
              <QuizBlock questions={CT_QUIZ_L3} accentColor="oklch(0.72_0.18_150)" />
            </div>
          </div>
        </CTLessonShell>
      )}

      {/* ── Lesson 4: Cognitive Biases ── */}
      {activeLesson === "ct4" && (
        <CTLessonShell key="ct4" id="ct4">
          <div className="space-y-5">
            <div className="glass rounded-2xl p-6 border border-white/8">
              <Narrator text="Cognitive biases are systematic errors in thinking that affect everyone — regardless of intelligence. They aren't character flaws, they are features of how the human brain processes information efficiently. Understanding them is the first step to overriding them when it counts." />
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { label: "Social", d: "Biases from group dynamics", icon: <Users size={16} className="text-[oklch(0.72_0.2_260)]" /> },
                  { label: "Memory", d: "Biases in what we remember", icon: <Brain size={16} className="text-[oklch(0.78_0.16_30)]" /> },
                  { label: "Decision", d: "Biases in how we choose", icon: <Scale size={16} className="text-[oklch(0.72_0.18_150)]" /> },
                ].map(({ label, d, icon }) => (
                  <div key={label} className="glass rounded-xl p-3 border border-white/8 text-center">
                    <div className="flex justify-center mb-2">{icon}</div>
                    <div className="text-xs font-semibold text-foreground">{label}</div>
                    <p className="text-xs text-muted-foreground mt-1 leading-snug">{d}</p>
                  </div>
                ))}
              </div>
              <SegmentFooter accentColor="oklch(0.78_0.16_30)"
                topics={["Why intelligent people are just as biased as everyone else", "What System 1 vs System 2 thinking means", "How biases interact and amplify each other", "Whether cognitive biases can actually be eliminated"]} />
            </div>

            <div className="text-sm font-medium text-foreground">Select a bias to explore it — and reflect on when it's affected you:</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {BIASES.map((b) => (
                <button key={b.id} onClick={() => setActiveBias(activeBias === b.id ? null : b.id)}
                  className={`py-3 px-4 rounded-xl text-sm font-medium transition-all border text-left ${
                    activeBias === b.id
                      ? "bg-[oklch(0.78_0.16_30_/_0.15)] border-[oklch(0.78_0.16_30_/_0.4)] text-[oklch(0.88_0.16_30)]"
                      : "glass border-white/8 text-muted-foreground hover:border-white/20"
                  }`}>{b.name}</button>
              ))}
            </div>

            <AnimatePresence>
              {activeBias && (() => {
                const b = BIASES.find((x) => x.id === activeBias)!;
                const saved = savedBiasReflections.has(b.id);
                return (
                  <motion.div key={activeBias} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="glass rounded-2xl p-6 border border-[oklch(0.78_0.16_30_/_0.3)] space-y-4">
                    <h3 className="font-bold text-foreground text-lg">{b.name}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{b.definition}</p>
                    <div className="glass rounded-xl p-4 border border-[oklch(0.78_0.16_30_/_0.2)]">
                      <div className="text-xs font-semibold text-[oklch(0.78_0.16_30)] mb-2">REAL-WORLD TRIGGER</div>
                      <p className="text-sm text-muted-foreground italic leading-relaxed">{b.trigger}</p>
                    </div>
                    <div className="glass rounded-xl p-4 border border-[oklch(0.72_0.18_150_/_0.2)]">
                      <div className="text-xs font-semibold text-[oklch(0.72_0.18_150)] mb-2">ANTIDOTE</div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{b.antidote}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground mb-2 block">Has this bias affected a decision you've made? Describe it briefly:</label>
                      <textarea value={biasReflections[b.id] ?? ""} onChange={(e) => setBiasReflections((prev) => ({ ...prev, [b.id]: e.target.value }))}
                        placeholder="Think of a specific moment — a purchase, an opinion you held, a conflict…"
                        rows={3} className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[oklch(0.78_0.16_30_/_0.5)] resize-none" />
                      {!saved
                        ? <button onClick={() => { if (!(biasReflections[b.id] ?? "").trim()) { toast.error("Write something first."); return; } setSavedBiasReflections((prev) => new Set(Array.from(prev).concat(b.id))); addXP(5); toast.success("+5 XP — reflection saved!"); }}
                            className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[oklch(0.78_0.16_30_/_0.2)] border border-[oklch(0.78_0.16_30_/_0.3)] text-sm text-[oklch(0.88_0.16_30)]">
                            <Check size={13} /> Save Reflection
                          </button>
                        : <p className="mt-2 text-xs text-[oklch(0.72_0.18_150)] flex items-center gap-1"><CheckCircle2 size={11} /> Saved — +5 XP</p>
                      }
                    </div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>

            <div className="glass rounded-2xl p-5 border border-white/8">
              <h4 className="font-semibold text-foreground mb-3">Knowledge Check</h4>
              <QuizBlock questions={CT_QUIZ_L4} accentColor="oklch(0.78_0.16_30)" />
            </div>
          </div>
        </CTLessonShell>
      )}

      {/* ── Lesson 5: Capstone ── */}
      {activeLesson === "ct5" && (
        <CTLessonShell key="ct5" id="ct5">
          <div className="space-y-5">
            {completedLessons.size < 4 && (
              <div className="glass rounded-xl p-5 border border-[oklch(0.75_0.18_55_/_0.3)]">
                <div className="flex items-start gap-3">
                  <Lock size={16} className="text-[oklch(0.75_0.18_55)] mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Complete Earlier Lessons First</h4>
                    <p className="text-sm text-muted-foreground">Completed {completedLessons.size}/4 lessons. The capstone requires all four skills working together.</p>
                    <div className="flex gap-1 mt-2">
                      {(["ct1","ct2","ct3","ct4"] as CTLessonId[]).map((id) => (
                        <div key={id} className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold border ${
                          completedLessons.has(id) ? "bg-[oklch(0.72_0.18_150_/_0.2)] border-[oklch(0.72_0.18_150_/_0.4)] text-[oklch(0.72_0.18_150)]" : "glass border-white/10 text-muted-foreground"
                        }`}>{completedLessons.has(id) ? <Check size={12} /> : id.replace("ct","")}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="glass rounded-2xl p-6 border border-white/8">
              <Narrator text="This capstone puts all four skills to work on a single flawed argument. You'll identify the errors, construct the strongest possible version of the argument, then deliver your own reasoned verdict." />
              <div className="mt-4 glass rounded-xl p-5 border border-white/10">
                <div className="text-xs font-semibold text-[oklch(0.75_0.18_55)] mb-2">{CT_ARG_FLAWED.title.toUpperCase()}</div>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap italic">{CT_ARG_FLAWED.text}</p>
              </div>
            </div>

            {/* Error checklist — interactive pre-work for step 1 */}
            {ctStep === 0 && (
              <div className="glass rounded-2xl p-5 border border-white/8">
                <div className="text-xs font-semibold text-foreground mb-3">QUICK SCAN — Check any errors you can already spot before writing:</div>
                <div className="space-y-2">
                  {CT_ARG_FLAWED.errors.map((e) => (
                    <label key={e.id} className="flex items-start gap-3 cursor-pointer">
                      <div onClick={() => setErrorChecks((prev) => ({ ...prev, [e.id]: !prev[e.id] }))}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                          errorChecks[e.id] ? "bg-[oklch(0.75_0.18_55)] border-[oklch(0.75_0.18_55)]" : "border-white/20"
                        }`}>
                        {errorChecks[e.id] && <Check size={11} className="text-white" />}
                      </div>
                      <div>
                        <div className={`text-sm font-medium ${errorChecks[e.id] ? "text-foreground" : "text-muted-foreground"}`}>{e.label}</div>
                        {errorChecks[e.id] && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{e.explanation}</p>}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {CT_CAPSTONE_STEPS.map((p, i) => (
                <button key={i} onClick={() => setCtStep(i)}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all border text-center ${
                    ctStep === i ? "bg-[oklch(0.75_0.18_55_/_0.15)] border-[oklch(0.75_0.18_55_/_0.4)] text-[oklch(0.85_0.18_55)]" : "glass border-white/8 text-muted-foreground"
                  }`}>
                  {p.label} {ctAnswers[i].length > 20 && <CheckCircle2 size={11} className="inline text-[oklch(0.72_0.18_150)]" />}
                </button>
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={ctStep} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                className="glass rounded-2xl p-6 border border-[oklch(0.75_0.18_55_/_0.15)]">
                <div className="text-xs font-semibold text-[oklch(0.75_0.18_55)] mb-3">CAPSTONE — {CT_CAPSTONE_STEPS[ctStep].label.toUpperCase()}</div>
                <p className="text-sm font-medium text-foreground mb-4 leading-snug">{CT_CAPSTONE_STEPS[ctStep].q}</p>
                <textarea value={ctAnswers[ctStep]}
                  onChange={(e) => { const u = [...ctAnswers]; u[ctStep] = e.target.value; setCtAnswers(u); }}
                  placeholder={CT_CAPSTONE_STEPS[ctStep].ph} rows={7}
                  className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[oklch(0.75_0.18_55_/_0.5)] resize-none leading-relaxed" />
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-muted-foreground">{ctAnswers[ctStep].length} chars</span>
                  <div className="flex gap-2">
                    {ctStep > 0 && (
                      <button onClick={() => setCtStep(ctStep - 1)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg glass border border-white/8 text-xs text-muted-foreground">
                        <ChevronLeft size={12} /> Previous
                      </button>
                    )}
                    {ctStep < CT_CAPSTONE_STEPS.length - 1
                      ? <button onClick={() => setCtStep(ctStep + 1)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[oklch(0.75_0.18_55_/_0.2)] border border-[oklch(0.75_0.18_55_/_0.3)] text-xs text-[oklch(0.85_0.18_55)]">
                          Next <ChevronRight size={12} />
                        </button>
                      : !ctDone && (
                          <motion.button
                            onClick={() => {
                              if (ctAnswers.filter((a) => a.length > 20).length < 3) { toast.error(`Complete all 3 parts (${ctAnswers.filter((a) => a.length > 20).length}/3 done).`); return; }
                              setCtDone(true); handleCTComplete("ct5"); toast.success("Module 1 complete!");
                            }}
                            whileHover={{ scale: 1.02 }}
                            className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-black text-xs font-semibold"
                            style={{ background: "linear-gradient(to right, oklch(0.75_0.18_55), oklch(0.72_0.2_260))" }}>
                            <Trophy size={12} /> Submit
                          </motion.button>
                        )
                    }
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
            {ctDone && (
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                className="glass rounded-2xl p-8 border border-[oklch(0.75_0.18_55_/_0.3)] text-center">
                <Lightbulb size={40} className="mx-auto mb-3 text-[oklch(0.75_0.18_55)]" />
                <h3 className="text-2xl font-bold text-foreground mb-2">Module 1 Complete!</h3>
                <p className="text-muted-foreground mb-4 max-w-lg mx-auto">You have earned your <strong className="text-foreground">Clear Thinking Certificate — Module 1</strong>.</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {["Argument Analysis", "Fallacy Spotter", "Evidence Ranker", "Bias Aware", "Capstone"].map((b) => (
                    <span key={b} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[oklch(0.75_0.18_55_/_0.12)] border border-[oklch(0.75_0.18_55_/_0.3)] text-[oklch(0.85_0.18_55)]">
                      <CheckCircle2 size={11} className="inline mr-1" />{b}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </CTLessonShell>
      )}
    </AnimatePresence>
  );

  // ── Module switcher + overview ──
  if (activeModule === 2) {
    return <ClearThinkingModule2 onBack={() => setActiveModule(null)} />;
  }
  if (activeModule === 3) {
    return <ClearThinkingModule3 onBack={() => setActiveModule(null)} />;
  }

  return (
    <div className="space-y-4">
      {/* Module 1 header with back button */}
      <button onClick={() => setActiveModule(null)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft size={14} /> Back to course overview
      </button>

      <div className="glass rounded-2xl p-6 border border-[oklch(0.72_0.2_260_/_0.2)]">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[oklch(0.72_0.2_260_/_0.15)] text-[oklch(0.82_0.2_260)] border border-[oklch(0.72_0.2_260_/_0.3)]">Clear Thinking</span>
              <span className="px-2.5 py-1 rounded-full text-xs bg-white/5 border border-white/10 text-muted-foreground">Beginner · ~2 hrs · 340 XP</span>
            </div>
            <h3 className="text-lg font-bold text-foreground">Module 1: The Architecture of an Argument</h3>
            <p className="text-sm text-muted-foreground">Arguments, fallacies, evidence, and the biases that trip us all up</p>
          </div>
          {completedLessons.size > 0 && <span className="text-sm font-bold shrink-0" style={{ color: "oklch(0.72_0.2_260)" }}>{overallPct}%</span>}
        </div>
        {completedLessons.size > 0 && (
          <div className="w-full h-2 rounded-full bg-white/8 mt-2">
            <div className="h-full rounded-full bg-gradient-to-r from-[oklch(0.72_0.2_260)] to-[oklch(0.72_0.18_150)] transition-all" style={{ width: `${overallPct}%` }} />
          </div>
        )}
      </div>
      <div className="space-y-2">
        {CT_LESSON_META.map((lesson, i) => {
          const done = completedLessons.has(lesson.id);
          return (
            <motion.div key={lesson.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`glass rounded-2xl border overflow-hidden transition-all ${done ? "border-[oklch(0.72_0.18_150_/_0.3)]" : "border-white/8 hover:border-white/15"}`}>
              <button onClick={() => setActiveLesson(lesson.id)} className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/3 transition-colors">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
                  style={{ background: `color-mix(in oklch, ${lesson.color} 15%, transparent)`, border: `1px solid color-mix(in oklch, ${lesson.color} 30%, transparent)`, color: lesson.color }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground">{lesson.title}</div>
                  <p className="text-sm text-muted-foreground truncate">{lesson.subtitle}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={10} /> {lesson.duration}</span>
                  <span className="text-xs flex items-center gap-1" style={{ color: lesson.color }}><Zap size={10} /> +{lesson.xp} XP</span>
                  {done ? <span className="text-xs text-[oklch(0.72_0.18_150)] flex items-center gap-1"><CheckCircle2 size={10} /> Done</span> : <ChevronRight size={13} className="text-muted-foreground" />}
                </div>
              </button>
            </motion.div>
          );
        })}
      </div>
      <div className="glass rounded-2xl p-5 border border-white/8">
        <div className="flex items-start gap-3">
          <Scale size={15} className="text-[oklch(0.72_0.2_260)] mt-0.5 shrink-0" />
          <div>
            <h4 className="font-semibold text-foreground mb-1 text-sm">What you will be able to do after Module 1</h4>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[
                { n: "Argument Analysis", d: "Identify claim, evidence, and inference in any text" },
                { n: "Fallacy Detection", d: "Name and counter 8 common logical fallacies" },
                { n: "Evidence Evaluation", d: "Rank sources by reliability and spot weak evidence" },
                { n: "Bias Awareness", d: "Recognize 6 biases in your own and others' thinking" },
              ].map(({ n, d }) => (
                <div key={n} className="glass rounded-lg p-3 border border-white/8">
                  <div className="text-xs font-semibold text-foreground mb-0.5">{n}</div>
                  <p className="text-xs text-muted-foreground">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Module 2 teaser */}
      <motion.button onClick={() => setActiveModule(2)} whileHover={{ scale: 1.005, x: 4 }}
        className="w-full glass rounded-2xl p-5 border border-[oklch(0.72_0.2_290_/_0.25)] hover:border-[oklch(0.72_0.2_290_/_0.5)] transition-all text-left">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[oklch(0.72_0.2_290_/_0.15)] border border-[oklch(0.72_0.2_290_/_0.3)]">
            <ArrowRight size={18} className="text-[oklch(0.82_0.2_290)]" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-[oklch(0.72_0.2_290)] font-semibold mb-0.5">MODULE 2</div>
            <div className="font-semibold text-foreground">Thinking in Real Life</div>
            <p className="text-xs text-muted-foreground mt-0.5">Misinformation, statistical traps, persuasion, and decisions under uncertainty · 380 XP</p>
          </div>
          <ChevronRight size={16} className="text-[oklch(0.72_0.2_290)] shrink-0" />
        </div>
      </motion.button>
      <motion.button onClick={() => setActiveModule(3)} whileHover={{ scale: 1.005, x: 4 }}
        className="w-full glass rounded-2xl p-5 border border-[oklch(0.70_0.22_270_/_0.25)] hover:border-[oklch(0.70_0.22_270_/_0.5)] transition-all text-left">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[oklch(0.70_0.22_270_/_0.15)] border border-[oklch(0.70_0.22_270_/_0.3)]">
            <ArrowRight size={18} className="text-[oklch(0.82_0.22_270)]" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-[oklch(0.70_0.22_270)] font-semibold mb-0.5">MODULE 3</div>
            <div className="font-semibold text-foreground">Systems &amp; Self</div>
            <p className="text-xs text-muted-foreground mt-0.5">Mental models, argument mapping, systems thinking, and motivated reasoning · 390 XP</p>
          </div>
          <ChevronRight size={16} className="text-[oklch(0.70_0.22_270)] shrink-0" />
        </div>
      </motion.button>
    </div>
  );
}

// ─── Clear Thinking Module 2 Data ──────────────────────────────────────────────
type CT2LessonId = "ct6" | "ct7" | "ct8" | "ct9" | "ct10";

interface StatTrap {
  id: string;
  title: string;
  misleading: string;
  reveal: string;
  lesson: string;
}

interface PersuasionTechnique {
  id: string;
  name: string;
  definition: string;
  ethical: string;
  manipulative: string;
  signal: string;
}

interface DecisionScenario {
  id: string;
  title: string;
  situation: string;
  options: { label: string; pros: string[]; cons: string[] }[];
  pmPrompt: string; // pre-mortem prompt
}

interface MisInfoVector {
  id: string;
  name: string;
  howItSpreads: string;
  whyItWorks: string;
  counter: string;
}

const CT2_LESSON_META = [
  { id: "ct6" as CT2LessonId, title: "How Misinformation Spreads", subtitle: "Why false beliefs are stickier than true ones — and what to do about it", duration: "25 min", color: "oklch(0.72_0.2_290)", xp: 60 },
  { id: "ct7" as CT2LessonId, title: "Statistical Traps", subtitle: "The numbers that lie without technically lying", duration: "25 min", color: "oklch(0.68_0.22_20)", xp: 65 },
  { id: "ct8" as CT2LessonId, title: "Persuasion vs. Manipulation", subtitle: "Where ethical influence ends and exploitation begins", duration: "25 min", color: "oklch(0.72_0.18_150)", xp: 65 },
  { id: "ct9" as CT2LessonId, title: "Deciding Under Uncertainty", subtitle: "How to make good calls when you can't know for sure", duration: "30 min", color: "oklch(0.75_0.18_55)", xp: 70 },
  { id: "ct10" as CT2LessonId, title: "Capstone: Real-World Case", subtitle: "Apply everything — M1 + M2 — to a live argument you choose", duration: "25 min", color: "oklch(0.78_0.16_30)", xp: 120 },
];

const MISINFO_VECTORS: MisInfoVector[] = [
  { id: "mv1", name: "Emotional Contagion", howItSpreads: "Content that triggers strong emotions (outrage, fear, pride) is shared 6x more often than neutral information, regardless of accuracy.", whyItWorks: "The brain's threat-detection system prioritizes emotional salience over fact-checking. Sharing feels like action — it relieves the emotional charge without requiring verification.", counter: "When you feel a strong urge to share immediately, treat it as a warning sign. Slow down: strong emotion is the misinformation's delivery mechanism." },
  { id: "mv2", name: "The Illusory Truth Effect", howItSpreads: "Repeated exposure to a false claim increases how true it feels — even when people know it's contested. Repetition alone creates a sense of familiarity that the brain interprets as credibility.", whyItWorks: "Processing fluency: when something is easy to recall, the brain shortcut-labels it as 'true.' Misinformation campaigns exploit this deliberately through coordinated repetition.", counter: "Track how many times you've seen a claim, not just whether it feels familiar. Familiarity is not evidence." },
  { id: "mv3", name: "Source Laundering", howItSpreads: "A false claim is seeded in a fringe outlet, picked up by a slightly less fringe outlet, then referenced by a mainstream outlet reporting on 'the controversy' — giving the original claim apparent legitimacy.", whyItWorks: "Audiences see a major outlet's name and stop tracing the origin. The number of citations looks like independent corroboration but is really one claim amplified through a chain.", counter: "Trace claims to their primary source. Ask: what is the original study, quote, or event? How many outlets are reporting this independently versus citing each other?" },
  { id: "mv4", name: "Context Collapse", howItSpreads: "Real images, videos, or quotes are stripped of their original context and reused to support a completely different narrative. The content is technically genuine — the framing is false.", whyItWorks: "People extend trust from verified content to the frame around it. Seeing an actual photo activates 'this is real' processing, which spills over to whatever caption accompanies it.", counter: "Reverse image search photos. Look up quotes in full. The question isn't whether the content is real — it's whether it means what this specific post claims it means." },
];

const STAT_TRAPS: StatTrap[] = [
  { id: "st1", title: "Relative vs. Absolute Risk", misleading: "\"New drug reduces cancer risk by 50%!\"", reveal: "If baseline risk is 2%, a 50% reduction means it drops to 1% — a 1 percentage-point absolute difference. Both statements are technically accurate. The relative number sounds transformative; the absolute number sounds modest.", lesson: "Always ask: 50% of what? Relative numbers without baselines are nearly meaningless for real-world decisions." },
  { id: "st2", title: "Survivorship Bias", misleading: "\"Entrepreneurs who dropped out of college became billionaires — so college isn't worth it.\"", reveal: "We see Gates, Zuckerberg, and Dell. We don't see the millions who also dropped out and failed — they don't make headlines. We're only counting the survivors of a massive selection process.", lesson: "Ask: where is the evidence of people who took the same path and failed? Invisible failures are still data." },
  { id: "st3", title: "Simpson's Paradox", misleading: "\"Treatment A has a higher success rate than Treatment B overall.\"", reveal: "When broken down by severity of condition, Treatment B outperforms Treatment A in every subgroup. The aggregate is misleading because Treatment A was used more often on mild cases, inflating its overall average.", lesson: "Aggregate statistics can reverse when broken into subgroups. Always ask: are the groups being compared truly comparable?" },
  { id: "st4", title: "Cherry-Picked Timeframes", misleading: "\"Violent crime has been rising for three years!\"", reveal: "Violent crime peaked in 1991, fell 50% over 25 years, briefly rose in 2020–22, and remains far below historical highs. Selecting a 3-year window from a 30-year trend is technically accurate but deeply misleading.", lesson: "Zoom out. Three-year trends are almost always less meaningful than 20-year trends. Ask what the full historical context looks like." },
  { id: "st5", title: "Percentage of a Percentage", misleading: "\"Salaries for women grew 15% faster than men's last year!\"", reveal: "If women's median salary grew 3% and men's grew 2.6%, the difference is 0.4 percentage points — a 15% relative difference, but nearly imperceptible in real income.", lesson: "When you see a percentage of a percentage, convert to absolute numbers to feel the real magnitude." },
];

const PERSUASION_TECHNIQUES: PersuasionTechnique[] = [
  { id: "pt1", name: "Social Proof", definition: "Using evidence that others have done or endorsed something to influence a decision.", ethical: "A restaurant showing verified customer reviews so diners can make informed choices.", manipulative: "Faking review counts, astroturfing forums, or presenting a vocal minority as mainstream consensus.", signal: "Ask: are these real, independent endorsements — or manufactured?" },
  { id: "pt2", name: "Scarcity & Urgency", definition: "Creating the impression that time or availability is limited to pressure faster decisions.", ethical: "A genuine sale ending Sunday, communicated clearly with no artificial deadline.", manipulative: "Fake countdown timers, 'Only 2 left!' on infinite-inventory items, manufactured crises.", signal: "Ask: is this deadline real and verifiable — or designed to prevent you from thinking?" },
  { id: "pt3", name: "Authority Signaling", definition: "Invoking credentials, titles, or institutional affiliation to increase persuasive weight.", ethical: "A cardiologist explaining evidence-based guidance on heart disease prevention.", manipulative: "Using scientific language without scientific method, or citing credentials in unrelated domains.", signal: "Ask: is this person an expert in this specific topic — and are they citing evidence or just credentials?" },
  { id: "pt4", name: "Reciprocity", definition: "Giving something first to create a felt obligation to give back.", ethical: "Free educational content that genuinely helps, with a non-coercive offer to purchase more.", manipulative: "Unsolicited 'gifts' paired with high-pressure asks, or manufactured obligation in one-sided relationships.", signal: "Ask: did I request this? Does refusing it make me a bad person — or just someone who said no?" },
  { id: "pt5", name: "Identity Appeals", definition: "Framing a choice as consistent with who the audience believes themselves to be.", ethical: "Connecting environmental action to a genuine sense of community responsibility.", manipulative: "Tribal messaging that equates product choices with political identity, or attacks group belonging to create fear of exclusion.", signal: "Ask: is my reasoning about the actual merits of this — or about who I want to be seen as?" },
];

const CT2_DECISION_SCENARIOS: DecisionScenario[] = [
  {
    id: "ds1",
    title: "The Job Offer",
    situation: "You have a stable job you find tolerable. A startup offers you 30% more pay but no benefits, a 6-month runway, and an equity stake worth a lot if it succeeds. You have a mortgage and young children.",
    options: [
      { label: "Take the startup offer", pros: ["Higher salary now", "Equity upside", "More growth potential"], cons: ["No benefits", "Company may fail in 6 months", "Financial risk with dependents"] },
      { label: "Stay at current job", pros: ["Stability", "Benefits", "Predictable income"], cons: ["Lower ceiling", "Potential regret", "Same tolerable situation"] },
    ],
    pmPrompt: "Assume you took the startup offer and it went badly wrong. It's 18 months from now. What specifically happened? What warning signs did you miss? What would you wish you had done differently?",
  },
  {
    id: "ds2",
    title: "The Medical Treatment",
    situation: "You're diagnosed with a condition. Treatment A has a 70% success rate with mild side effects. Treatment B has an 85% success rate but causes severe side effects in 40% of patients. Without treatment, the condition will worsen over 2 years.",
    options: [
      { label: "Choose Treatment A", pros: ["Lower risk of severe side effects", "Proven track record", "More comfortable recovery"], cons: ["Lower success rate (70%)", "May need to try B anyway if A fails"] },
      { label: "Choose Treatment B", pros: ["Higher success rate (85%)", "One course of treatment likely sufficient", "Less chance of long-term worsening"], cons: ["40% chance of severe side effects", "Higher short-term disruption to life"] },
    ],
    pmPrompt: "Assume you chose Treatment B and experienced severe side effects that lasted 4 months. What do you wish you had considered beforehand? What questions should you have asked the doctor? What support would you have needed?",
  },
  {
    id: "ds3",
    title: "The Investment",
    situation: "You have $15,000 saved. An opportunity arises: invest it in a friend's restaurant (you believe in them, but restaurants fail 60% of the time in year 1) or put it in an index fund (historical average ~7% annual return, boring, no story).",
    options: [
      { label: "Invest in friend's restaurant", pros: ["Potentially higher return", "Supporting someone you believe in", "Exciting, tangible involvement"], cons: ["60% failure rate", "Relationship risk if it fails", "Money is illiquid for years"] },
      { label: "Index fund", pros: ["Diversified, lower risk", "Liquid", "Historical data supports long-term growth"], cons: ["Lower ceiling", "No personal connection", "Misses potential upside"] },
    ],
    pmPrompt: "The restaurant closes 8 months in. The money is gone. Walk through exactly what went wrong from a decision-making perspective — not from bad luck, but from what you knew or could have known at decision time. What reasoning errors did you make?",
  },
];

const CT2_QUIZ_L6: QuizQuestion[] = [
  { id: "ct6q1", question: "The Illusory Truth Effect means:", options: ["People believe things that are told to them by authority figures", "Repeated exposure to a false claim makes it feel more true over time", "Emotional content is more likely to be remembered", "Misinformation only affects people with low education"], correct: 1, explanation: "The Illusory Truth Effect is one of the most robustly replicated findings in cognitive psychology: repeated exposure increases processing fluency, which the brain interprets as a signal of truth. This is why propaganda relies on repetition rather than argument." },
  { id: "ct6q2", question: "Source laundering works because:", options: ["People are too lazy to read original sources", "A chain of citations creates an appearance of independent corroboration even when all sources trace back to one original claim", "Mainstream media outlets deliberately spread misinformation", "False claims are more interesting than true ones"], correct: 1, explanation: "When multiple outlets report on something, readers assume independent verification has occurred. Source laundering exploits this by seeding a single claim that gets amplified up through a citation chain — giving one claim the appearance of many." },
  { id: "ct6q3", question: "When you feel a strong urge to share something immediately because it's outrageous, the critical thinking response is:", options: ["Share it — if it feels true, it probably is", "Check whether the emotional response is the content's delivery mechanism, not evidence of its accuracy", "Only share if you personally agree with it", "Share with a disclaimer"], correct: 1, explanation: "Misinformation is engineered to trigger emotional responses that bypass deliberate reasoning. The intensity of your emotional reaction is not correlated with the accuracy of the content — it's correlated with how viral it was designed to be." },
  { id: "ct6q4", question: "Context collapse describes:", options: ["Information becoming less relevant over time", "Real content (images, quotes, video) reused in a new framing that changes its meaning entirely", "When a source loses credibility after being caught in a lie", "The tendency to share only partial information"], correct: 1, explanation: "Context collapse is particularly dangerous because the underlying content is genuine — making it harder to identify as misinformation. A real photo from a 2015 event can be falsely presented as evidence of a 2024 event. Always ask: does this content mean what this post claims it means?" },
  { id: "ct6q5", question: "The most reliable first step when encountering a shocking claim is:", options: ["Immediately search for confirming evidence", "Stop — recognize the emotional reaction as a potential signal of manipulative design, before doing anything else", "Check how many people have shared it", "Look for the original source URL"], correct: 1, explanation: "The 'Stop' in SIFT is the hardest and most important step. Pausing before engaging interrupts the automatic emotional processing that misinformation exploits. All fact-checking techniques are useless if you never pause to apply them." },
];

const CT2_QUIZ_L7: QuizQuestion[] = [
  { id: "ct7q1", question: "A drug 'reduces risk by 50%.' Without knowing the baseline risk, this statistic is:", options: ["Highly informative — 50% is significant", "Meaningless — a 50% reduction of 0.2% is a different outcome than 50% of 20%", "Misleading only if the drug has side effects", "Acceptable shorthand in scientific communication"], correct: 1, explanation: "Relative risk reductions without baselines are one of the most common statistical deceptions in health journalism. A 50% reduction of a 0.1% risk (to 0.05%) is nearly irrelevant clinically. Context determines significance." },
  { id: "ct7q2", question: "Survivorship bias causes us to:", options: ["Overestimate how often survivors make good decisions", "Systematically overestimate success rates because failures are invisible", "Underestimate the value of perseverance", "Correctly identify patterns in outcomes"], correct: 1, explanation: "We study and celebrate visible successes while the much larger population of similar failures remains invisible. This distorts our picture of which strategies actually work — we're only seeing the tip of the iceberg." },
  { id: "ct7q3", question: "Simpson's Paradox demonstrates that:", options: ["Simple statistics are more reliable than complex ones", "Aggregate data can show the opposite trend of every subgroup it contains", "Statistical analysis always requires large sample sizes", "Averages are never accurate"], correct: 1, explanation: "Simpson's Paradox is a real phenomenon with major real-world implications — including in clinical trials, hiring discrimination cases, and educational data. Aggregating across non-comparable groups can produce conclusions that reverse entirely when examined properly." },
  { id: "ct7q4", question: "A headline says 'Crime rose 15% in 3 years!' The most important question to ask is:", options: ["Which types of crime?", "What is the full historical trend — is this 3-year rise within a long-term decline?", "Who funded the study?", "Was it reported in national media?"], correct: 1, explanation: "Short-window trends are almost always misleading without context. Violent crime in the US peaked in 1991, fell dramatically for 25 years, then briefly rose. A 3-year window presented without that context produces the opposite impression of the long-run reality." },
  { id: "ct7q5", question: "When a statistic says '15% faster growth than men,' the first question should be:", options: ["Is 15% a large difference?", "What are the actual absolute numbers this percentage describes?", "Who conducted the study?", "Was the finding peer-reviewed?"], correct: 1, explanation: "Percentage-of-percentage statistics are the most common form of statistical manipulation in journalism. 15% faster could describe a 3% vs 2.6% difference — barely noticeable in real terms. Always convert to absolute numbers before evaluating significance." },
];

const CT2_QUIZ_L8: QuizQuestion[] = [
  { id: "ct8q1", question: "Ethical persuasion differs from manipulation in that:", options: ["Ethical persuasion uses emotions; manipulation uses facts", "Ethical persuasion respects the audience's ability to reason and choose freely; manipulation exploits cognitive vulnerabilities", "Manipulation is always illegal", "Ethical persuasion never uses social proof"], correct: 1, explanation: "The core ethical distinction is consent and autonomy. Ethical persuasion provides accurate information and legitimate emotional appeals — it works with the audience's reasoning. Manipulation bypasses reasoning by exploiting cognitive shortcuts, fear, or social pressure." },
  { id: "ct8q2", question: "A countdown timer on a purchase page is manipulative when:", options: ["The deadline is real and clearly communicated", "The timer resets after it reaches zero — creating artificial urgency where none exists", "It causes you to decide quickly", "The product is genuinely limited"], correct: 1, explanation: "Artificial urgency is designed to prevent deliberate reasoning. When a countdown is fake (it resets, or the 'sale' is permanent), it's not providing information — it's exploiting the fear of missing out to override your rational decision-making process." },
  { id: "ct8q3", question: "Identity appeals become manipulative when they:", options: ["Connect a product to values the audience genuinely holds", "Frame a choice as a test of group loyalty to prevent independent evaluation of the merits", "Use testimonials from people in the target group", "Acknowledge that other groups may prefer different options"], correct: 1, explanation: "Connecting choices to genuine values is legitimate. Using tribal identity to short-circuit reasoning — 'real patriots buy X' — is manipulation because it substitutes group belonging for evidence. It makes you afraid to evaluate independently." },
  { id: "ct8q4", question: "A genuine use of reciprocity (giving before asking) differs from its manipulative form in that:", options: ["Genuine reciprocity gives more expensive gifts", "Genuine reciprocity provides real value freely with no obligation attached; manipulation creates manufactured obligation", "Only commercial transactions can be reciprocal", "Genuine reciprocity always involves a written agreement"], correct: 1, explanation: "Reciprocity becomes manipulation when the 'gift' is used to create social pressure to comply. Free educational content with an optional offer is genuine. Sending unsolicited items then using guilt to pressure a response is manipulation that exploits the norm of reciprocity." },
  { id: "ct8q5", question: "The signal that you are being manipulated (rather than legitimately persuaded) is:", options: ["You feel persuaded quickly", "The communication is designed to prevent you from taking time to think, access other information, or consult others", "The person is enthusiastic about their product", "Strong emotional content is used"], correct: 1, explanation: "Legitimate persuasion is comfortable with your deliberation — it gives you time to think, welcomes comparison, and respects a 'no.' Manipulation consistently creates pressure against deliberation: artificial urgency, isolation from alternative perspectives, fear of missing the offer." },
];

const CT2_QUIZ_L9: QuizQuestion[] = [
  { id: "ct9q1", question: "A pre-mortem is most useful because it:", options: ["Helps you feel more confident about a decision", "Forces explicit consideration of failure modes before they happen, while there's still time to act on that analysis", "Identifies the single most likely cause of failure", "Is performed after a project fails"], correct: 1, explanation: "The pre-mortem (imagining the project has already failed and asking why) bypasses the optimism bias that causes teams to underweight failure scenarios. It produces specific, actionable risks — not vague concerns — when you can still adjust the plan." },
  { id: "ct9q2", question: "Calibrated uncertainty means:", options: ["Always saying 'I'm not sure' to avoid being wrong", "Your confidence in a belief should match the actual evidence for it — neither overconfident nor underconfident", "Making decisions only when you have more than 90% certainty", "Expressing all beliefs as probability percentages"], correct: 1, explanation: "Good decision-making requires calibration: 70% confident beliefs should be right about 70% of the time. Overconfidence and underconfidence are both calibration errors. Tracking predictions and outcomes is the only reliable way to improve calibration." },
  { id: "ct9q3", question: "When two options have similar expected values, the rational tiebreaker is usually:", options: ["Go with your gut — intuition knows things analysis misses", "Choose the option with lower variance (more predictable outcomes), especially under resource constraints", "Flip a coin — expected values are equal so it doesn't matter", "Always choose the higher-upside option regardless of downside"], correct: 1, explanation: "When expected values are equal, variance matters enormously — especially when you can't afford the downside. A coin flip between $100 and $0 has the same expected value as $50 guaranteed, but if you need at least $50 to survive the month, the guaranteed option is rationally superior." },
  { id: "ct9q4", question: "Reversible decisions should be made:", options: ["With the same care as irreversible ones", "Faster — with lower information requirements, since you can adjust if wrong", "Only after extensive analysis", "With committee consensus"], correct: 1, explanation: "Decision quality should be proportional to reversibility and stakes. Reversible, low-stakes decisions made with excessive deliberation waste cognitive resources. Irreversible, high-stakes decisions made hastily are catastrophic. Calibrate your process to the actual consequences of being wrong." },
  { id: "ct9q5", question: "Expected value thinking is most dangerous when:", options: ["Applied to financial decisions", "Applied to decisions with catastrophic-but-rare downside scenarios that exceed your risk tolerance", "The probabilities are uncertain", "You are making group decisions"], correct: 1, explanation: "Pure expected value ignores variance and catastrophic risk. A 10% chance of total ruin might have a positive expected value on paper but be personally unacceptable. Kelly criterion, risk of ruin analysis, and variance-weighting exist precisely because EV alone doesn't account for survival constraints." },
];

const CT2_CAPSTONE_CASES = [
  {
    id: "case1",
    title: "The Supplement Ad",
    label: "Health Claim",
    scenario: `A full-page ad in a health magazine reads:

"NEUROFOCUS PRO — Clinically Proven to Boost Memory by 47%

Thousands of customers report sharper thinking in just 14 days. Our proprietary NeuroBlend formula uses 12 all-natural ingredients including Lion's Mane mushroom, trusted for centuries in traditional medicine. Dr. Elena Marsh — former neuroscience researcher — says: 'I've never seen results like this.'

⚡ WARNING: Due to unprecedented demand, we can only guarantee your supply if you order TODAY.
★★★★★ from 14,847 verified customers

Because your brain deserves better — and because you care about staying sharp — you owe it to yourself to try it risk-free."`,
    checklist: [
      { id: "cs1a", label: "Unverified claim: 'Clinically proven' — no study cited, no methodology, no peer review" },
      { id: "cs1b", label: "Misleading statistic: '47% boost' — boost in what? Measured how? By whom?" },
      { id: "cs1c", label: "Appeal to Nature fallacy: 'all-natural' implies safe, which is not valid logic" },
      { id: "cs1d", label: "Authority misuse: 'former neuroscience researcher' — in which domain? Which institution? Is this even verifiable?" },
      { id: "cs1e", label: "Artificial urgency (manipulation): 'order TODAY' — classic fake scarcity" },
      { id: "cs1f", label: "Social proof inflation: 14,847 'verified' reviews — verified by whom? What is their methodology?" },
      { id: "cs1g", label: "Identity appeal (manipulation): 'you care about staying sharp' — frames refusing as self-neglect" },
    ],
  },
  {
    id: "case2",
    title: "The Policy Debate",
    label: "Political Argument",
    scenario: `A social media post goes viral:

"NEW STUDY: Universal Basic Income DESTROYS work ethic — 73% of recipients stopped actively seeking employment.

This is what happens when you pay people to do nothing. Every economist who supports UBI has clearly never run a business. Meanwhile, the Scandinavian countries that tried it had to abandon the experiment because it FAILED.

The real data shows: work is the foundation of human dignity. Giving people 'free money' is not compassion — it's dependency. The millions of working Americans who get up every day are the backbone of this country, and policies like this are a slap in the face to all of them.

Retweet if you believe in REAL work."`,
    checklist: [
      { id: "cs2a", label: "Unverified statistic: '73%' — which study? What population? What definition of 'stopped seeking employment'?" },
      { id: "cs2b", label: "Ad hominem: 'never run a business' attacks economists personally rather than addressing their arguments" },
      { id: "cs2c", label: "False claim: Scandinavian UBI pilots were discontinued due to political changes, not failure — the data actually showed positive outcomes" },
      { id: "cs2d", label: "False framing: presenting UBI as 'paying people to do nothing' is a straw man of how advocates describe it" },
      { id: "cs2e", label: "Identity appeal: 'slap in the face to working Americans' uses group identity to prevent engagement with evidence" },
      { id: "cs2f", label: "Appeal to emotion: 'human dignity' and 'backbone of this country' are emotional appeals without evidentiary weight" },
      { id: "cs2g", label: "Bandwagon call: 'Retweet if you believe in REAL work' pressures sharing without evaluation" },
    ],
  },
  {
    id: "case3",
    title: "The Tech CEO Interview",
    label: "Business Argument",
    scenario: `A transcript excerpt from a tech podcast:

"Look, our AI system has a 94% accuracy rate — that's just a fact. It's trained on more data than any competitor. Our team of 200 engineers works around the clock to make sure it's safe and responsible. 

Critics who say there are bias problems are mostly academics who've never shipped a real product. The real-world feedback we're getting from our 3 million users is overwhelmingly positive.

Could there be edge cases? Sure, in any complex system there will be. But the overwhelming consensus in the industry is that we're setting the gold standard.

The alternative — not deploying AI — means falling behind China. At some point, you have to trust the engineers who built the system."`,
    checklist: [
      { id: "cs3a", label: "Decontextualized statistic: '94% accuracy' — on which task? On which population? False positive vs. false negative breakdown?" },
      { id: "cs3b", label: "Non sequitur: training data volume doesn't determine safety or fairness" },
      { id: "cs3c", label: "Ad hominem: dismissing critics as 'never shipped a product' ignores whether their bias findings are methodologically valid" },
      { id: "cs3d", label: "Survivorship bias in feedback: '3 million users overwhelmingly positive' — users who are harmed by bias are the least likely to be heard in user surveys" },
      { id: "cs3e", label: "False Dilemma: 'deploy or fall behind China' ignores middle-ground options (slower rollout, more auditing, domain restrictions)" },
      { id: "cs3f", label: "Appeal to authority: 'trust the engineers who built it' — creators are the least objective evaluators of their own work's harms" },
      { id: "cs3g", label: "Bandwagon: 'industry consensus' — industry consensus in technology has been wrong repeatedly about safety (see: social media + teen mental health)" },
    ],
  },
];

const CT2_CAPSTONE_STEPS = [
  { label: "Identify Problems", q: "Read your chosen case carefully. List every logical error, fallacy, statistical trap, and manipulation technique you can identify. Quote the exact phrase and name the specific problem. Aim for at least 5.", ph: "e.g., 1. Unverified statistic — '47% boost in memory' — no study cited, no methodology explained, no peer review. A claim that specific requires a specific citation...\n2. Appeal to Nature fallacy — 'all-natural ingredients' — natural ≠ safe or effective. Arsenic is natural. The word is doing emotional work, not evidentiary work...\n3. Authority appeal (questionable) — 'former neuroscience researcher' — which institution? What is her domain expertise in supplements specifically?..." },
  { label: "Steelman It", q: "Now make the strongest possible version of this argument — removing all fallacies and replacing unsupported claims with what actual evidence would need to say. What would this argument look like if it were honest?", ph: "e.g., A legitimate case for NeuropFocus Pro would require: a published, peer-reviewed RCT (not a paid study) showing statistically significant improvement on validated cognitive tests, with full methodology, sample size, and effect sizes disclosed. The endorsement would name the specific researcher, institution, and the precise nature of their review. Urgency would be absent unless supply were genuinely constrained with verifiable data..." },
  { label: "Your Assessment", q: "What is your overall verdict on this argument's credibility? What single change would make it most credible? And — most importantly — what is one way a reasonable person could still disagree with your analysis?", ph: "e.g., Overall credibility: very low. The argument relies almost entirely on emotional manipulation and unverifiable claims rather than transparent evidence.\n\nSingle change for most improvement: publish the full clinical trial methodology and let independent researchers replicate the results.\n\nReasonable disagreement: a defender could argue that testimonials represent real outcomes for real people, and that dismissing lived experience as 'anecdote' is itself a form of elitism..." },
];

// ─── Clear Thinking Module 2 Tab ────────────────────────────────────────────────
function ClearThinkingModule2({ onBack }: { onBack: () => void }) {
  const [activeLesson, setActiveLesson] = useState<CT2LessonId | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const { addXP } = usePersonalization();

  // L6 — misinformation
  const [activeMV, setActiveMV] = useState<string | null>(null);
  const [newsInput, setNewsInput] = useState("");
  const [newsResult, setNewsResult] = useState("");
  const [newsLoading, setNewsLoading] = useState(false);

  // L7 — stat traps
  const [activeTrap, setActiveTrap] = useState<string | null>(null);
  const [statInput, setStatInput] = useState("");
  const [statResult, setStatResult] = useState("");
  const [statLoading, setStatLoading] = useState(false);

  // L8 — persuasion
  const [activePT, setActivePT] = useState<string | null>(null);
  const [adInput, setAdInput] = useState("");
  const [adResult, setAdResult] = useState("");
  const [adLoading, setAdLoading] = useState(false);

  // L9 — decision making
  const [activeScenario, setActiveScenario] = useState<number | null>(null);
  const [activeOptionTab, setActiveOptionTab] = useState<number>(0);
  const [pmAnswer, setPmAnswer] = useState("");
  const [pmSaved, setPmSaved] = useState(false);
  const [calibrationInput, setCalibrationInput] = useState("");
  const [calibrationResult, setCalibrationResult] = useState("");
  const [calibrationLoading, setCalibrationLoading] = useState(false);

  // L10 — capstone
  const [selectedCase, setSelectedCase] = useState<number | null>(null);
  const [ct2Checks, setCt2Checks] = useState<Record<string, boolean>>({});
  const [ct2Step, setCt2Step] = useState(0);
  const [ct2Answers, setCt2Answers] = useState(["", "", ""]);
  const [ct2Done, setCt2Done] = useState(false);

  const newsMutation = trpc.ai.explainConcept.useMutation({
    onSuccess: (data) => { setNewsResult(data.explanation); setNewsLoading(false); },
    onError: (err: { message: string }) => { toast.error(err.message); setNewsLoading(false); },
  });
  const statMutation = trpc.ai.explainConcept.useMutation({
    onSuccess: (data) => { setStatResult(data.explanation); setStatLoading(false); },
    onError: (err: { message: string }) => { toast.error(err.message); setStatLoading(false); },
  });
  const adMutation = trpc.ai.explainConcept.useMutation({
    onSuccess: (data) => { setAdResult(data.explanation); setAdLoading(false); },
    onError: (err: { message: string }) => { toast.error(err.message); setAdLoading(false); },
  });
  const calibMutation = trpc.ai.explainConcept.useMutation({
    onSuccess: (data) => { setCalibrationResult(data.explanation); setCalibrationLoading(false); },
    onError: (err: { message: string }) => { toast.error(err.message); setCalibrationLoading(false); },
  });

  const handleCT2Complete = (id: CT2LessonId) => {
    if (completedLessons.has(id)) return;
    const meta = CT2_LESSON_META.find((l) => l.id === id)!;
    setCompletedLessons((prev) => new Set(Array.from(prev).concat(id)));
    addXP(meta.xp);
    toast.success(`+${meta.xp} XP — Lesson complete!`);
  };

  const overallPct = Math.round((completedLessons.size / CT2_LESSON_META.length) * 100);

  // Section-type badge helper (blueprint signaling principle)
  const SectionBadge = ({ type, color }: { type: string; color: string }) => (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase mb-3"
      style={{ background: `${color.replace(")", "_/_0.15)").replace("oklch(", "oklch(")}`, color }}>
      {type}
    </span>
  );

  function CT2Shell({ id, children }: { id: CT2LessonId; children: React.ReactNode }) {
    const meta = CT2_LESSON_META.find((l) => l.id === id)!;
    const done = completedLessons.has(id);
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
        <button onClick={() => setActiveLesson(null)} className="flex items-center gap-1.5 mb-5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={14} /> Back to all lessons
        </button>
        <div className="glass rounded-2xl p-5 border border-white/8 mb-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Clear Thinking · Module 2 · Thinking in Real Life</div>
              <h2 className="text-xl font-bold text-foreground">{meta.title}</h2>
              <p className="text-sm text-muted-foreground">{meta.subtitle}</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock size={10} /> {meta.duration}</span>
              <span className="flex items-center gap-1 text-xs" style={{ color: meta.color }}><Zap size={10} /> +{meta.xp} XP</span>
              {done && <span className="flex items-center gap-1 text-xs text-[oklch(0.72_0.18_150)] font-medium"><CheckCircle2 size={10} /> Complete</span>}
            </div>
          </div>
        </div>
        {children}
        <div className="mt-8 pt-6 border-t border-white/8">
          {done
            ? <div className="flex items-center justify-center gap-2 text-sm text-[oklch(0.72_0.18_150)]"><Award size={15} /> Lesson complete — great work!</div>
            : <motion.button onClick={() => handleCT2Complete(id)} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 text-black"
                style={{ background: `linear-gradient(to right, ${meta.color}, oklch(0.72_0.18_150))` }}>
                <CheckCircle2 size={15} /> Mark Complete & Earn {meta.xp} XP
              </motion.button>
          }
        </div>
        {id !== "ct10" && (
          <div className="mt-4 flex justify-end">
            <button onClick={() => { const ids: CT2LessonId[] = ["ct6","ct7","ct8","ct9","ct10"]; const idx = ids.indexOf(id); setActiveLesson(ids[idx + 1]); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg glass border border-white/10 text-sm text-muted-foreground hover:text-foreground transition-colors">
              Next lesson <ChevronRight size={13} />
            </button>
          </div>
        )}
      </motion.div>
    );
  }

  if (activeLesson !== null) return (
    <AnimatePresence mode="wait">

      {/* ── Lesson 6: How Misinformation Spreads ── */}
      {activeLesson === "ct6" && (
        <CT2Shell key="ct6" id="ct6">
          <div className="space-y-5">

            {/* Hook — why this matters */}
            <div className="glass rounded-2xl p-6 border border-white/8" style={{ borderLeft: "3px solid oklch(0.75_0.18_55)" }}>
              <SectionBadge type="Hook" color="oklch(0.75_0.18_55)" />
              <Narrator text="A false story spreads six times faster on social media than a true one. That's not a guess — it's a finding from an MIT study of 126,000 stories over a decade. This lesson explains exactly why that happens, and what it means for every piece of information you encounter." />
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { stat: "6×", label: "Faster spread for false stories", color: "oklch(0.68_0.22_20)" },
                  { stat: "70%", label: "More likely to be retweeted", color: "oklch(0.78_0.16_30)" },
                  { stat: "20×", label: "Deeper retweet cascade depth", color: "oklch(0.72_0.2_290)" },
                ].map(({ stat, label, color }) => (
                  <div key={stat} className="glass rounded-xl p-4 border border-white/8 text-center">
                    <div className="text-2xl font-bold mb-1" style={{ color }}>{stat}</div>
                    <p className="text-xs text-muted-foreground leading-snug">{label}</p>
                  </div>
                ))}
              </div>
              <SegmentFooter accentColor="oklch(0.75_0.18_55)"
                topics={["Why novelty makes false stories spread faster", "What the MIT Vosoughi study actually found and its limitations", "How social media algorithms amplify emotional content", "What 'epistemic cowardice' is and why it makes misinformation worse"]} />
            </div>

            {/* Concept — the 4 vectors */}
            <div className="glass rounded-2xl p-6 border border-white/8" style={{ borderLeft: "3px solid oklch(0.72_0.2_290)" }}>
              <SectionBadge type="Core Concept" color="oklch(0.72_0.2_290)" />
              <h3 className="font-semibold text-foreground mb-1">The 4 Mechanisms</h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">False information doesn't spread because people are stupid. It spreads because it exploits specific, predictable features of human cognition. Understanding the mechanism is how you become resistant to it.</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {MISINFO_VECTORS.map((mv) => (
                  <button key={mv.id} onClick={() => setActiveMV(activeMV === mv.id ? null : mv.id)}
                    className={`p-4 rounded-xl text-left border transition-all ${ activeMV === mv.id ? "bg-[oklch(0.72_0.2_290_/_0.15)] border-[oklch(0.72_0.2_290_/_0.4)]" : "glass border-white/8 hover:border-white/20" }`}>
                    <div className="text-sm font-semibold text-foreground mb-1">{mv.name}</div>
                    <p className="text-xs text-muted-foreground leading-snug line-clamp-2">{mv.howItSpreads}</p>
                  </button>
                ))}
              </div>
              <AnimatePresence>
                {activeMV && (() => {
                  const mv = MISINFO_VECTORS.find((x) => x.id === activeMV)!;
                  return (
                    <motion.div key={activeMV} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="glass rounded-2xl p-5 border border-[oklch(0.72_0.2_290_/_0.3)] space-y-3 mb-2">
                      <h4 className="font-bold text-foreground">{mv.name}</h4>
                      <div>
                        <div className="text-xs font-semibold text-[oklch(0.72_0.2_290)] mb-1">HOW IT SPREADS</div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{mv.howItSpreads}</p>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[oklch(0.68_0.22_20)] mb-1">WHY IT WORKS COGNITIVELY</div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{mv.whyItWorks}</p>
                      </div>
                      <div className="glass rounded-xl p-4 border border-[oklch(0.72_0.18_150_/_0.2)]">
                        <div className="text-xs font-semibold text-[oklch(0.72_0.18_150)] mb-1">YOUR COUNTER-MOVE</div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{mv.counter}</p>
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
              <SegmentFooter accentColor="oklch(0.72_0.2_290)"
                topics={["What 'prebunking' is and how it reduces susceptibility to misinformation", "How the backfire effect works (and whether it's real)", "Why corrections often fail to update beliefs", "What media literacy education actually teaches"]} />
            </div>

            {/* Activity — live news analyzer */}
            <div className="glass rounded-2xl p-5 border border-[oklch(0.72_0.2_290_/_0.2)]" style={{ borderLeft: "3px solid oklch(0.78_0.16_30)" }}>
              <SectionBadge type="Try It" color="oklch(0.78_0.16_30)" />
              <div className="text-xs font-semibold text-[oklch(0.78_0.16_30)] mb-1">MISINFORMATION ANALYZER</div>
              <p className="text-xs text-muted-foreground mb-3">Paste a headline, social post, or claim. The AI will identify which misinformation mechanisms it uses and how to evaluate it.</p>
              <textarea value={newsInput} onChange={(e) => setNewsInput(e.target.value)}
                placeholder="e.g., 'SHOCKING: Scientists admit vaccines contain microchips — 4 whistleblowers speak out'" rows={3}
                className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[oklch(0.72_0.2_290_/_0.5)] resize-none mb-3" />
              <motion.button onClick={() => {
                if (!newsInput.trim()) { toast.error("Paste a claim first."); return; }
                setNewsLoading(true); setNewsResult("");
                newsMutation.mutate({ concept: `Analyze this claim for misinformation patterns: "${newsInput}". Identify: (1) Which of these mechanisms it uses: emotional contagion, illusory truth effect, source laundering, or context collapse. (2) Specific red flags in the language or framing. (3) What a critical thinker should do before accepting or sharing this. Be specific, educational, and direct.`, level: "student" });
              }} disabled={newsLoading || !newsInput.trim()} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                style={{ background: "oklch(0.72_0.2_290)" }}>
                {newsLoading ? <><RefreshCw size={13} className="animate-spin" /> Analyzing…</> : <><Search size={13} /> Analyze Claim</>}
              </motion.button>
              <AnimatePresence>
                {newsResult && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 rounded-xl bg-[oklch(0.72_0.2_290_/_0.08)] border border-[oklch(0.72_0.2_290_/_0.25)]">
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{newsResult}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="glass rounded-2xl p-5 border border-white/8">
              <h4 className="font-semibold text-foreground mb-3">Knowledge Check</h4>
              <QuizBlock questions={CT2_QUIZ_L6} accentColor="oklch(0.72_0.2_290)" />
            </div>
          </div>
        </CT2Shell>
      )}

      {/* ── Lesson 7: Statistical Traps ── */}
      {activeLesson === "ct7" && (
        <CT2Shell key="ct7" id="ct7">
          <div className="space-y-5">

            <div className="glass rounded-2xl p-6 border border-white/8" style={{ borderLeft: "3px solid oklch(0.75_0.18_55)" }}>
              <SectionBadge type="Hook" color="oklch(0.75_0.18_55)" />
              <Narrator text="Statistics are the language of evidence — and one of the most powerful tools for misleading you without technically lying. You don't need to be a mathematician to spot the most common traps. You need to know which questions to ask." />
              <div className="mt-4 glass rounded-xl p-4 border border-[oklch(0.68_0.22_20_/_0.2)]">
                <div className="text-xs font-semibold text-[oklch(0.68_0.22_20)] mb-2">THE THREE QUESTIONS THAT DEFEAT MOST STATISTICAL CLAIMS</div>
                <div className="space-y-2">
                  {[
                    { q: "Compared to what?", d: "Every number needs a baseline. 50% of nothing is nothing." },
                    { q: "Who is missing from this data?", d: "Survivorship, selection, and publication bias all hide evidence that would change your conclusion." },
                    { q: "What does this actually measure?", d: "The metric used may not measure what you think it measures." },
                  ].map(({ q, d }) => (
                    <div key={q} className="flex items-start gap-3 p-3 rounded-lg glass border border-white/8">
                      <div className="text-xs font-bold text-[oklch(0.68_0.22_20)] shrink-0 mt-0.5">{q}</div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{d}</p>
                    </div>
                  ))}
                </div>
              </div>
              <SegmentFooter accentColor="oklch(0.68_0.22_20)"
                topics={["What p-values actually mean (and don't mean)", "How to read a forest plot from a meta-analysis", "What 'confidence interval' means in plain English", "Why large sample sizes don't fix bad methodology"]} />
            </div>

            {/* Statistical trap explorer */}
            <div className="glass rounded-2xl p-6 border border-white/8" style={{ borderLeft: "3px solid oklch(0.68_0.22_20)" }}>
              <SectionBadge type="Core Concept" color="oklch(0.68_0.22_20)" />
              <h3 className="font-semibold text-foreground mb-1">5 Traps in Detail</h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">Each of these traps has caused real harm in real decisions — in medicine, business, and policy. Click each one to see the trap, the reveal, and the lesson.</p>
              <div className="space-y-2 mb-2">
                {STAT_TRAPS.map((trap) => (
                  <div key={trap.id}>
                    <button onClick={() => setActiveTrap(activeTrap === trap.id ? null : trap.id)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl text-left border transition-all ${ activeTrap === trap.id ? "bg-[oklch(0.68_0.22_20_/_0.15)] border-[oklch(0.68_0.22_20_/_0.4)]" : "glass border-white/8 hover:border-white/20" }`}>
                      <span className="font-semibold text-sm text-foreground">{trap.title}</span>
                      <ChevronRight size={14} className={`text-muted-foreground transition-transform ${activeTrap === trap.id ? "rotate-90" : ""}`} />
                    </button>
                    <AnimatePresence>
                      {activeTrap === trap.id && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden">
                          <div className="p-4 space-y-3 glass rounded-b-xl border-x border-b border-[oklch(0.68_0.22_20_/_0.3)]">
                            <div className="glass rounded-lg p-3 border border-[oklch(0.68_0.22_20_/_0.2)]">
                              <div className="text-xs font-semibold text-[oklch(0.68_0.22_20)] mb-1">THE CLAIM</div>
                              <p className="text-sm text-foreground italic">{trap.misleading}</p>
                            </div>
                            <div className="glass rounded-lg p-3 border border-[oklch(0.72_0.18_150_/_0.2)]">
                              <div className="text-xs font-semibold text-[oklch(0.72_0.18_150)] mb-1">THE REVEAL</div>
                              <p className="text-sm text-muted-foreground leading-relaxed">{trap.reveal}</p>
                            </div>
                            <div className="glass rounded-lg p-3 border border-[oklch(0.75_0.18_55_/_0.2)]">
                              <div className="text-xs font-semibold text-[oklch(0.75_0.18_55)] mb-1">THE LESSON</div>
                              <p className="text-sm text-muted-foreground leading-relaxed">{trap.lesson}</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
              <SegmentFooter accentColor="oklch(0.68_0.22_20)"
                topics={["How to identify Simpson's Paradox in real data", "What absolute vs. relative risk means in drug trials", "How to find the original data behind a headline statistic", "What makes a graph visually misleading"]} />
            </div>

            {/* Live stat checker */}
            <div className="glass rounded-2xl p-5 border border-[oklch(0.68_0.22_20_/_0.2)]" style={{ borderLeft: "3px solid oklch(0.78_0.16_30)" }}>
              <SectionBadge type="Try It" color="oklch(0.78_0.16_30)" />
              <div className="text-xs font-semibold text-[oklch(0.78_0.16_30)] mb-1">STATISTIC DECODER</div>
              <p className="text-xs text-muted-foreground mb-3">Paste any statistic or data claim. The AI will explain what questions to ask and what context is missing.</p>
              <textarea value={statInput} onChange={(e) => setStatInput(e.target.value)}
                placeholder="e.g., 'Coffee drinkers have a 23% lower risk of dying from heart disease'" rows={2}
                className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[oklch(0.68_0.22_20_/_0.5)] resize-none mb-3" />
              <motion.button onClick={() => {
                if (!statInput.trim()) { toast.error("Enter a statistic first."); return; }
                setStatLoading(true); setStatResult("");
                statMutation.mutate({ concept: `Analyze this statistical claim: "${statInput}". Identify: (1) What type of statistical trap it might contain (relative vs. absolute, survivorship, Simpson's, cherry-picked timeframe, etc.). (2) What critical questions a reader should ask — be specific. (3) What additional context would be needed to properly evaluate this claim. Be educational and direct.`, level: "student" });
              }} disabled={statLoading || !statInput.trim()} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                style={{ background: "oklch(0.68_0.22_20)" }}>
                {statLoading ? <><RefreshCw size={13} className="animate-spin" /> Analyzing…</> : <><Search size={13} /> Decode Statistic</>}
              </motion.button>
              <AnimatePresence>
                {statResult && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 rounded-xl bg-[oklch(0.68_0.22_20_/_0.08)] border border-[oklch(0.68_0.22_20_/_0.25)]">
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{statResult}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="glass rounded-2xl p-5 border border-white/8">
              <h4 className="font-semibold text-foreground mb-3">Knowledge Check</h4>
              <QuizBlock questions={CT2_QUIZ_L7} accentColor="oklch(0.68_0.22_20)" />
            </div>
          </div>
        </CT2Shell>
      )}

      {/* ── Lesson 8: Persuasion vs. Manipulation ── */}
      {activeLesson === "ct8" && (
        <CT2Shell key="ct8" id="ct8">
          <div className="space-y-5">

            <div className="glass rounded-2xl p-6 border border-white/8" style={{ borderLeft: "3px solid oklch(0.75_0.18_55)" }}>
              <SectionBadge type="Hook" color="oklch(0.75_0.18_55)" />
              <Narrator text="Every advertisement, every political speech, every fundraiser, and every sales conversation is an attempt to change your behavior. Some of them are ethical. Some of them are not. The line between persuasion and manipulation isn't always obvious — but it's one of the most important distinctions a clear thinker can make." />
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  { label: "Persuasion", def: "Works through the audience's own reasoning. Provides accurate information and legitimate emotional appeals. Respects the person's ability to reach their own conclusions.", color: "oklch(0.72_0.18_150)" },
                  { label: "Manipulation", def: "Bypasses reasoning by exploiting cognitive vulnerabilities, emotional triggers, or social pressure. Achieves compliance without genuine understanding or free choice.", color: "oklch(0.68_0.22_20)" },
                ].map(({ label, def, color }) => (
                  <div key={label} className="glass rounded-xl p-4 border border-white/8" style={{ borderLeft: `3px solid ${color}` }}>
                    <div className="text-sm font-bold mb-2" style={{ color }}>{label}</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{def}</p>
                  </div>
                ))}
              </div>
              <SegmentFooter accentColor="oklch(0.72_0.18_150)"
                topics={["What Robert Cialdini's 6 principles of influence are", "When emotional appeals in arguments are legitimate vs. manipulative", "How dark patterns in UX design exploit cognitive biases", "What 'informed consent' means beyond medicine"]} />
            </div>

            {/* Technique explorer */}
            <div className="glass rounded-2xl p-6 border border-white/8" style={{ borderLeft: "3px solid oklch(0.72_0.18_150)" }}>
              <SectionBadge type="Core Concept" color="oklch(0.72_0.18_150)" />
              <h3 className="font-semibold text-foreground mb-1">5 Techniques — Ethical or Not?</h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">Every technique below has a legitimate ethical version and a manipulative one. The technique itself is often neutral — the ethics depend on how it's used.</p>
              <div className="space-y-2">
                {PERSUASION_TECHNIQUES.map((pt) => (
                  <div key={pt.id}>
                    <button onClick={() => setActivePT(activePT === pt.id ? null : pt.id)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl text-left border transition-all ${ activePT === pt.id ? "bg-[oklch(0.72_0.18_150_/_0.12)] border-[oklch(0.72_0.18_150_/_0.4)]" : "glass border-white/8 hover:border-white/20" }`}>
                      <div>
                        <span className="font-semibold text-sm text-foreground">{pt.name}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">{pt.definition}</p>
                      </div>
                      <ChevronRight size={14} className={`text-muted-foreground shrink-0 ml-3 transition-transform ${activePT === pt.id ? "rotate-90" : ""}`} />
                    </button>
                    <AnimatePresence>
                      {activePT === pt.id && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden">
                          <div className="p-4 space-y-3 glass rounded-b-xl border-x border-b border-[oklch(0.72_0.18_150_/_0.3)]">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="glass rounded-lg p-3 border border-[oklch(0.72_0.18_150_/_0.2)]">
                                <div className="text-xs font-semibold text-[oklch(0.72_0.18_150)] mb-1">ETHICAL USE</div>
                                <p className="text-xs text-muted-foreground leading-relaxed">{pt.ethical}</p>
                              </div>
                              <div className="glass rounded-lg p-3 border border-[oklch(0.68_0.22_20_/_0.2)]">
                                <div className="text-xs font-semibold text-[oklch(0.68_0.22_20)] mb-1">MANIPULATIVE USE</div>
                                <p className="text-xs text-muted-foreground leading-relaxed">{pt.manipulative}</p>
                              </div>
                            </div>
                            <div className="glass rounded-lg p-3 border border-[oklch(0.75_0.18_55_/_0.2)]">
                              <div className="text-xs font-semibold text-[oklch(0.75_0.18_55)] mb-1">YOUR SIGNAL TO WATCH FOR</div>
                              <p className="text-xs text-muted-foreground leading-relaxed">{pt.signal}</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
              <SegmentFooter accentColor="oklch(0.72_0.18_150)"
                topics={["What 'dark patterns' are and examples from major apps", "How to identify manipulation in political advertising", "Why manufactured urgency is one of the most common online tactics", "What Cialdini found about reciprocity in field experiments"]} />
            </div>

            {/* Live ad deconstructor */}
            <div className="glass rounded-2xl p-5 border border-[oklch(0.72_0.18_150_/_0.2)]" style={{ borderLeft: "3px solid oklch(0.78_0.16_30)" }}>
              <SectionBadge type="Try It" color="oklch(0.78_0.16_30)" />
              <div className="text-xs font-semibold text-[oklch(0.78_0.16_30)] mb-1">INFLUENCE DECODER</div>
              <p className="text-xs text-muted-foreground mb-3">Paste any ad, social post, email, or sales message. The AI will identify which persuasion or manipulation techniques it uses.</p>
              <textarea value={adInput} onChange={(e) => setAdInput(e.target.value)}
                placeholder="e.g., 'Only 3 spots left in our exclusive community! Thousands of members are already transforming their lives…'"
                rows={3} className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[oklch(0.72_0.18_150_/_0.5)] resize-none mb-3" />
              <motion.button onClick={() => {
                if (!adInput.trim()) { toast.error("Paste a message first."); return; }
                setAdLoading(true); setAdResult("");
                adMutation.mutate({ concept: `Analyze this message for persuasion and manipulation techniques: "${adInput}". For each technique identified: (1) Name it precisely (e.g., 'artificial scarcity', 'social proof', 'identity appeal'). (2) Quote the exact phrase using it. (3) Say whether this specific use is ethical persuasion or manipulative — and why. End with an overall assessment of whether this message respects the reader's autonomy.`, level: "student" });
              }} disabled={adLoading || !adInput.trim()} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                style={{ background: "oklch(0.72_0.18_150)" }}>
                {adLoading ? <><RefreshCw size={13} className="animate-spin" /> Analyzing…</> : <><Search size={13} /> Decode Influence</>}
              </motion.button>
              <AnimatePresence>
                {adResult && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 rounded-xl bg-[oklch(0.72_0.18_150_/_0.08)] border border-[oklch(0.72_0.18_150_/_0.25)]">
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{adResult}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="glass rounded-2xl p-5 border border-white/8">
              <h4 className="font-semibold text-foreground mb-3">Knowledge Check</h4>
              <QuizBlock questions={CT2_QUIZ_L8} accentColor="oklch(0.72_0.18_150)" />
            </div>
          </div>
        </CT2Shell>
      )}

      {/* ── Lesson 9: Deciding Under Uncertainty ── */}
      {activeLesson === "ct9" && (
        <CT2Shell key="ct9" id="ct9">
          <div className="space-y-5">

            <div className="glass rounded-2xl p-6 border border-white/8" style={{ borderLeft: "3px solid oklch(0.75_0.18_55)" }}>
              <SectionBadge type="Hook" color="oklch(0.75_0.18_55)" />
              <Narrator text="Every important decision is made with incomplete information. The question is never 'do I have enough data?' — it's 'how do I make the best call with what I actually have?' Professionals who make better decisions under uncertainty share a specific set of mental tools. This lesson teaches them." />
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { name: "Pre-Mortem", def: "Assume failure before it happens. Ask: why did this go wrong?", icon: <AlertTriangle size={16} />, color: "oklch(0.68_0.22_20)" },
                  { name: "Calibration", def: "Match confidence to evidence. 70% certain should mean right 70% of the time.", icon: <Scale size={16} />, color: "oklch(0.72_0.2_260)" },
                  { name: "Decision Journal", def: "Record your reasoning before outcomes are known. The only way to learn from decisions.", icon: <FlaskConical size={16} />, color: "oklch(0.72_0.18_150)" },
                ].map(({ name, def, icon, color }) => (
                  <div key={name} className="glass rounded-xl p-4 border border-white/8">
                    <div className="flex items-center gap-2 mb-2" style={{ color }}>{icon}<span className="font-bold text-xs">{name}</span></div>
                    <p className="text-xs text-muted-foreground leading-snug">{def}</p>
                  </div>
                ))}
              </div>
              <SegmentFooter accentColor="oklch(0.75_0.18_55)"
                topics={["What Bayesian reasoning is and a simple example", "How superforecasters make better predictions than experts", "What the 'reference class' is and why it matters in planning", "How to use a decision matrix for high-stakes choices"]} />
            </div>

            {/* Concept — pre-mortem method */}
            <div className="glass rounded-2xl p-6 border border-white/8" style={{ borderLeft: "3px solid oklch(0.72_0.2_260)" }}>
              <SectionBadge type="Core Concept" color="oklch(0.72_0.2_260)" />
              <h3 className="font-semibold text-foreground mb-3">Practice Scenario: The Pre-Mortem</h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">The pre-mortem technique (developed by psychologist Gary Klein) reverses the typical planning question. Instead of "what could go wrong?" — which produces polite, optimism-biased answers — you assume the project has already failed and ask "what happened?"</p>

              <div className="flex gap-2 mb-4">
                {CT2_DECISION_SCENARIOS.map((s, i) => (
                  <button key={s.id} onClick={() => { setActiveScenario(i); setActiveOptionTab(0); setPmAnswer(""); setPmSaved(false); }}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all border text-center ${ activeScenario === i ? "bg-[oklch(0.72_0.2_260_/_0.15)] border-[oklch(0.72_0.2_260_/_0.4)] text-[oklch(0.82_0.2_260)]" : "glass border-white/8 text-muted-foreground hover:border-white/20" }`}>
                    {s.title}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {activeScenario !== null && (() => {
                  const sc = CT2_DECISION_SCENARIOS[activeScenario];
                  return (
                    <motion.div key={activeScenario} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                      className="space-y-4">
                      <div className="glass rounded-xl p-4 border border-[oklch(0.72_0.2_260_/_0.2)]">
                        <div className="text-xs font-semibold text-[oklch(0.72_0.2_260)] mb-2">SCENARIO</div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{sc.situation}</p>
                      </div>
                      <div className="flex gap-1 p-1 glass rounded-xl border border-white/8">
                        {sc.options.map((opt, i) => (
                          <button key={i} onClick={() => setActiveOptionTab(i)}
                            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${ activeOptionTab === i ? "bg-[oklch(0.72_0.2_260_/_0.15)] text-[oklch(0.82_0.2_260)]" : "text-muted-foreground" }`}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <AnimatePresence mode="wait">
                        <motion.div key={activeOptionTab} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }}>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="glass rounded-xl p-4 border border-[oklch(0.72_0.18_150_/_0.2)]">
                              <div className="text-xs font-semibold text-[oklch(0.72_0.18_150)] mb-2">PROS</div>
                              <div className="space-y-1.5">
                                {sc.options[activeOptionTab].pros.map((p, i) => (
                                  <div key={i} className="flex items-start gap-2">
                                    <Check size={11} className="text-[oklch(0.72_0.18_150)] mt-0.5 shrink-0" />
                                    <p className="text-xs text-muted-foreground leading-snug">{p}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="glass rounded-xl p-4 border border-[oklch(0.68_0.22_20_/_0.2)]">
                              <div className="text-xs font-semibold text-[oklch(0.68_0.22_20)] mb-2">CONS</div>
                              <div className="space-y-1.5">
                                {sc.options[activeOptionTab].cons.map((c, i) => (
                                  <div key={i} className="flex items-start gap-2">
                                    <AlertTriangle size={11} className="text-[oklch(0.68_0.22_20)] mt-0.5 shrink-0" />
                                    <p className="text-xs text-muted-foreground leading-snug">{c}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      </AnimatePresence>

                      <div className="glass rounded-xl p-4 border border-[oklch(0.72_0.2_260_/_0.15)]">
                        <div className="text-xs font-semibold text-[oklch(0.72_0.2_260)] mb-2">PRE-MORTEM EXERCISE</div>
                        <p className="text-sm text-muted-foreground mb-3 leading-relaxed italic">{sc.pmPrompt}</p>
                        <textarea value={pmAnswer} onChange={(e) => setPmAnswer(e.target.value)}
                          placeholder="Imagine the worst outcome has happened. Walk through exactly what went wrong from a decision-making perspective…"
                          rows={5} className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[oklch(0.72_0.2_260_/_0.4)] resize-none" />
                        {!pmSaved
                          ? <button onClick={() => {
                              if (!pmAnswer.trim()) { toast.error("Write your pre-mortem first."); return; }
                              setPmSaved(true); addXP(10); toast.success("+10 XP — pre-mortem saved!");
                            }} className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[oklch(0.72_0.2_260_/_0.2)] border border-[oklch(0.72_0.2_260_/_0.3)] text-sm text-[oklch(0.82_0.2_260)]">
                              <Check size={13} /> Save Pre-Mortem (+10 XP)
                            </button>
                          : <p className="mt-3 text-xs text-[oklch(0.72_0.18_150)] flex items-center gap-1"><CheckCircle2 size={11} /> Saved — +10 XP</p>
                        }
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
              <SegmentFooter accentColor="oklch(0.72_0.2_260)"
                topics={["How to run a pre-mortem with a team (not just alone)", "What the 'planning fallacy' is and how it distorts time and cost estimates", "How to use base rates to calibrate your expectations", "What 'expected value' means and when to use it"]} />
            </div>

            {/* Live calibration tool */}
            <div className="glass rounded-2xl p-5 border border-[oklch(0.75_0.18_55_/_0.2)]" style={{ borderLeft: "3px solid oklch(0.78_0.16_30)" }}>
              <SectionBadge type="Try It" color="oklch(0.78_0.16_30)" />
              <div className="text-xs font-semibold text-[oklch(0.78_0.16_30)] mb-1">DECISION ADVISOR</div>
              <p className="text-xs text-muted-foreground mb-3">Describe a real decision you're facing. The AI will apply pre-mortem, calibrated uncertainty, and decision-quality frameworks to help you think it through.</p>
              <textarea value={calibrationInput} onChange={(e) => setCalibrationInput(e.target.value)}
                placeholder="e.g., 'I'm deciding whether to go back to school for a master's degree at 35. I have a stable job, two kids, and $40k saved.'"
                rows={3} className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[oklch(0.75_0.18_55_/_0.5)] resize-none mb-3" />
              <motion.button onClick={() => {
                if (!calibrationInput.trim()) { toast.error("Describe your decision first."); return; }
                setCalibrationLoading(true); setCalibrationResult("");
                calibMutation.mutate({ concept: `Apply decision-analysis frameworks to this situation: "${calibrationInput}". Structure your response as: (1) PRE-MORTEM: Assume the main choice failed — what specifically went wrong? (2) BASE RATE: What does the relevant evidence say about how often this kind of decision works out? (3) KEY UNCERTAINTIES: What are the 2-3 things you don't yet know that would most change the decision? (4) DECISION QUALITY CHECK: Is there additional information worth getting before deciding? Be specific and practical, not generic.`, level: "student" });
              }} disabled={calibrationLoading || !calibrationInput.trim()} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium text-black disabled:opacity-50"
                style={{ background: "linear-gradient(to right, oklch(0.75_0.18_55), oklch(0.72_0.18_150))" }}>
                {calibrationLoading ? <><RefreshCw size={13} className="animate-spin" /> Analyzing…</> : <><Lightbulb size={13} /> Analyze My Decision</>}
              </motion.button>
              <AnimatePresence>
                {calibrationResult && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 rounded-xl bg-[oklch(0.75_0.18_55_/_0.08)] border border-[oklch(0.75_0.18_55_/_0.25)]">
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{calibrationResult}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="glass rounded-2xl p-5 border border-white/8">
              <h4 className="font-semibold text-foreground mb-3">Knowledge Check</h4>
              <QuizBlock questions={CT2_QUIZ_L9} accentColor="oklch(0.75_0.18_55)" />
            </div>
          </div>
        </CT2Shell>
      )}

      {/* ── Lesson 10: Capstone ── */}
      {activeLesson === "ct10" && (
        <CT2Shell key="ct10" id="ct10">
          <div className="space-y-5">
            {completedLessons.size < 4 && (
              <div className="glass rounded-xl p-5 border border-[oklch(0.78_0.16_30_/_0.3)]">
                <div className="flex items-start gap-3">
                  <Lock size={16} className="text-[oklch(0.78_0.16_30)] mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Complete Earlier Lessons First</h4>
                    <p className="text-sm text-muted-foreground">You've completed {completedLessons.size}/4 lessons. The capstone requires the full Module 2 toolkit.</p>
                    <div className="flex gap-1 mt-2">
                      {(["ct6","ct7","ct8","ct9"] as CT2LessonId[]).map((id) => (
                        <div key={id} className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold border ${ completedLessons.has(id) ? "bg-[oklch(0.72_0.18_150_/_0.2)] border-[oklch(0.72_0.18_150_/_0.4)] text-[oklch(0.72_0.18_150)]" : "glass border-white/10 text-muted-foreground" }`}>
                          {completedLessons.has(id) ? <Check size={12} /> : id.replace("ct","")}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="glass rounded-2xl p-6 border border-white/8" style={{ borderLeft: "3px solid oklch(0.78_0.16_30)" }}>
              <SectionBadge type="Capstone" color="oklch(0.78_0.16_30)" />
              <Narrator text="This capstone applies all eight lessons — argument structure, fallacies, evidence quality, cognitive biases, misinformation mechanics, statistical traps, persuasion versus manipulation, and decision-making under uncertainty. Choose a real-world case and take it apart." />
            </div>

            {/* Case selector */}
            <div>
              <div className="text-sm font-semibold text-foreground mb-3">Choose your case:</div>
              <div className="grid grid-cols-3 gap-2">
                {CT2_CAPSTONE_CASES.map((c, i) => (
                  <button key={c.id} onClick={() => { setSelectedCase(i); setCt2Checks({}); setCt2Step(0); setCt2Answers(["","",""]); setCt2Done(false); }}
                    className={`py-3 px-4 rounded-xl text-sm font-medium transition-all border text-left ${ selectedCase === i ? "bg-[oklch(0.78_0.16_30_/_0.15)] border-[oklch(0.78_0.16_30_/_0.4)] text-[oklch(0.88_0.16_30)]" : "glass border-white/8 text-muted-foreground hover:border-white/20" }`}>
                    <div className="font-semibold text-xs text-muted-foreground mb-1">{c.label}</div>
                    {c.title}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {selectedCase !== null && (() => {
                const cs = CT2_CAPSTONE_CASES[selectedCase];
                const checkedCount = Object.values(ct2Checks).filter(Boolean).length;
                return (
                  <motion.div key={selectedCase} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="space-y-4">

                    {/* The case text */}
                    <div className="glass rounded-2xl p-5 border border-[oklch(0.78_0.16_30_/_0.2)]">
                      <div className="text-xs font-semibold text-[oklch(0.78_0.16_30)] mb-3">THE CASE — {cs.title.toUpperCase()}</div>
                      <pre className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap font-sans">{cs.scenario}</pre>
                    </div>

                    {/* Interactive error checklist */}
                    <div className="glass rounded-2xl p-5 border border-white/8">
                      <div className="text-sm font-semibold text-foreground mb-1">Step 1 — Error Hunt</div>
                      <p className="text-xs text-muted-foreground mb-4">Check off each problem as you find it in the text above. You should find all {cs.checklist.length}.</p>
                      <div className="space-y-2 mb-3">
                        {cs.checklist.map((item) => (
                          <label key={item.id} className="flex items-start gap-3 cursor-pointer group">
                            <div onClick={() => setCt2Checks((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                              className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all ${ ct2Checks[item.id] ? "bg-[oklch(0.72_0.18_150)] border-[oklch(0.72_0.18_150)]" : "border-white/20 group-hover:border-white/40" }`}>
                              {ct2Checks[item.id] && <Check size={11} className="text-white" />}
                            </div>
                            <span className={`text-sm leading-snug transition-colors ${ ct2Checks[item.id] ? "text-foreground" : "text-muted-foreground" }`}>{item.label}</span>
                          </label>
                        ))}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 rounded-full bg-white/8">
                          <div className="h-full rounded-full bg-[oklch(0.72_0.18_150)] transition-all" style={{ width: `${(checkedCount / cs.checklist.length) * 100}%` }} />
                        </div>
                        <span className="text-xs font-medium text-foreground">{checkedCount}/{cs.checklist.length}</span>
                      </div>
                    </div>

                    {/* Written analysis steps */}
                    <div className="flex gap-2">
                      {CT2_CAPSTONE_STEPS.map((s, i) => (
                        <button key={i} onClick={() => setCt2Step(i)}
                          className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all border text-center ${ ct2Step === i ? "bg-[oklch(0.78_0.16_30_/_0.15)] border-[oklch(0.78_0.16_30_/_0.4)] text-[oklch(0.88_0.16_30)]" : "glass border-white/8 text-muted-foreground" }`}>
                          {s.label} {ct2Answers[i].length > 20 && <CheckCircle2 size={11} className="inline text-[oklch(0.72_0.18_150)]" />}
                        </button>
                      ))}
                    </div>
                    <AnimatePresence mode="wait">
                      <motion.div key={ct2Step} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                        className="glass rounded-2xl p-6 border border-[oklch(0.78_0.16_30_/_0.15)]">
                        <div className="text-xs font-semibold text-[oklch(0.78_0.16_30)] mb-3">STEP {ct2Step + 1} — {CT2_CAPSTONE_STEPS[ct2Step].label.toUpperCase()}</div>
                        <p className="text-sm font-medium text-foreground mb-4 leading-snug">{CT2_CAPSTONE_STEPS[ct2Step].q}</p>
                        <textarea value={ct2Answers[ct2Step]}
                          onChange={(e) => { const u = [...ct2Answers]; u[ct2Step] = e.target.value; setCt2Answers(u); }}
                          placeholder={CT2_CAPSTONE_STEPS[ct2Step].ph} rows={7}
                          className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[oklch(0.78_0.16_30_/_0.5)] resize-none leading-relaxed" />
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-muted-foreground">{ct2Answers[ct2Step].length} chars</span>
                          <div className="flex gap-2">
                            {ct2Step > 0 && (
                              <button onClick={() => setCt2Step(ct2Step - 1)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg glass border border-white/8 text-xs text-muted-foreground">
                                <ChevronLeft size={12} /> Previous
                              </button>
                            )}
                            {ct2Step < CT2_CAPSTONE_STEPS.length - 1
                              ? <button onClick={() => setCt2Step(ct2Step + 1)}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[oklch(0.78_0.16_30_/_0.2)] border border-[oklch(0.78_0.16_30_/_0.3)] text-xs text-[oklch(0.88_0.16_30)]">
                                  Next <ChevronRight size={12} />
                                </button>
                              : !ct2Done && (
                                  <motion.button
                                    onClick={() => {
                                      const complete = ct2Answers.filter((a) => a.length > 20).length;
                                      if (complete < 3) { toast.error(`Complete all 3 steps (${complete}/3 done).`); return; }
                                      if (checkedCount < Math.ceil(cs.checklist.length * 0.7)) { toast.error(`Find at least ${Math.ceil(cs.checklist.length * 0.7)} errors first.`); return; }
                                      setCt2Done(true); handleCT2Complete("ct10");
                                    }}
                                    whileHover={{ scale: 1.02 }}
                                    className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-black text-xs font-semibold"
                                    style={{ background: "linear-gradient(to right, oklch(0.78_0.16_30), oklch(0.72_0.2_290))" }}>
                                    <Trophy size={12} /> Submit
                                  </motion.button>
                                )
                            }
                          </div>
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    {/* Completion certificate */}
                    <AnimatePresence>
                      {ct2Done && (
                        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                          className="glass rounded-2xl p-8 border border-[oklch(0.78_0.16_30_/_0.4)] text-center"
                          style={{ background: "linear-gradient(135deg, oklch(0.78_0.16_30_/_0.05), oklch(0.72_0.2_290_/_0.05))" }}>
                          <Trophy size={40} className="mx-auto mb-3" style={{ color: "oklch(0.78_0.16_30)" }} />
                          <h3 className="text-xl font-bold text-foreground mb-2">Clear Thinking — Module 2 Complete</h3>
                          <p className="text-sm text-muted-foreground mb-5 leading-relaxed max-w-md mx-auto">You've completed "Thinking in Real Life." You can now identify misinformation mechanisms, spot statistical traps, distinguish persuasion from manipulation, and apply structured decision-making under uncertainty.</p>
                          <div className="flex justify-center gap-2 flex-wrap">
                            {[
                              { label: "Misinformation-Aware", color: "oklch(0.72_0.2_290)" },
                              { label: "Stat Trapper", color: "oklch(0.68_0.22_20)" },
                              { label: "Influence Literate", color: "oklch(0.72_0.18_150)" },
                              { label: "Decision Analyst", color: "oklch(0.75_0.18_55)" },
                              { label: "Case Certified", color: "oklch(0.78_0.16_30)" },
                            ].map(({ label, color }) => (
                              <span key={label} className="px-3 py-1.5 rounded-full text-xs font-semibold border"
                                style={{ color, borderColor: color, background: `${color.replace("oklch(", "oklch(").replace(")", "_/_0.1)")}` }}>
                                {label}
                              </span>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </div>
        </CT2Shell>
      )}
    </AnimatePresence>
  );

  // Lesson grid
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <button onClick={onBack} className="flex items-center gap-1.5 mb-5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft size={14} /> Back to modules
      </button>
      <div className="glass rounded-2xl p-5 border border-white/8 mb-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Clear Thinking · Module 2</div>
            <h2 className="text-xl font-bold text-foreground">Thinking in Real Life</h2>
            <p className="text-sm text-muted-foreground">Applying critical reasoning to misinformation, statistics, persuasion, and decisions</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold text-foreground">{overallPct}%</div>
            <div className="text-xs text-muted-foreground">{completedLessons.size}/{CT2_LESSON_META.length} complete</div>
          </div>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/8">
          <div className="h-full rounded-full transition-all" style={{ width: `${overallPct}%`, background: "linear-gradient(to right, oklch(0.72_0.2_290), oklch(0.72_0.18_150))" }} />
        </div>
      </div>
      <div className="space-y-3">
        {CT2_LESSON_META.map((lesson, i) => {
          const done = completedLessons.has(lesson.id);
          const locked = i > 0 && !completedLessons.has(CT2_LESSON_META[i - 1].id);
          return (
            <motion.button key={lesson.id} onClick={() => !locked && setActiveLesson(lesson.id)}
              whileHover={!locked ? { scale: 1.005, x: 4 } : {}}
              className={`w-full glass rounded-2xl p-5 border text-left transition-all ${ done ? "border-[oklch(0.72_0.18_150_/_0.3)]" : locked ? "border-white/5 opacity-50 cursor-not-allowed" : "border-white/8 hover:border-white/20" }`}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm"
                  style={{ background: done ? `${lesson.color.replace(")", "_/_0.2)")}` : "oklch(1_0_0_/_0.04)", color: done ? lesson.color : "oklch(0.7_0_0)" }}>
                  {done ? <CheckCircle2 size={20} /> : locked ? <Lock size={16} /> : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground text-sm">{lesson.title}</div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{lesson.subtitle}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={10} /> {lesson.duration}</span>
                  <span className="text-xs flex items-center gap-1" style={{ color: lesson.color }}><Zap size={10} /> +{lesson.xp}</span>
                  {!locked && <ChevronRight size={14} className="text-muted-foreground" />}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Clear Thinking Module 3 Data ──────────────────────────────────────────────
type CT3LessonId = "ct11" | "ct12" | "ct13" | "ct14" | "ct15";

const CT3_LESSON_META: { id: CT3LessonId; title: string; subtitle: string; duration: string; color: string; xp: number }[] = [
  { id: "ct11" as CT3LessonId, title: "Mental Models", subtitle: "The thinking frameworks that compress reality into usable maps", duration: "35 min", color: "oklch(0.70_0.22_270)", xp: 75 },
  { id: "ct12" as CT3LessonId, title: "Argument Mapping", subtitle: "Structuring debates, surfacing hidden assumptions, steel-manning", duration: "25 min", color: "oklch(0.68_0.20_140)", xp: 65 },
  { id: "ct13" as CT3LessonId, title: "Reasoning About Systems", subtitle: "Feedback loops, unintended consequences, and emergence", duration: "35 min", color: "oklch(0.72_0.18_40)", xp: 80 },
  { id: "ct14" as CT3LessonId, title: "Motivated Reasoning", subtitle: "How smart people talk themselves into wrong conclusions", duration: "35 min", color: "oklch(0.68_0.22_10)", xp: 75 },
  { id: "ct15" as CT3LessonId, title: "Capstone: Build Your Argument", subtitle: "Construct a steel-manned position on a real controversy", duration: "30 min", color: "oklch(0.75_0.18_55)", xp: 125 },
];

const CT3_MENTAL_MODELS = [
  {
    name: "First Principles",
    icon: "FP",
    color: "oklch(0.70_0.22_270)",
    what: "Break a problem down to its most basic, undeniable truths — then reason up from there.",
    why: "Most thinking starts from analogy ('this is like X'). First principles starts from fundamentals, which surfaces genuinely new solutions.",
    example: "Elon Musk asked: 'What are rocket components actually made of, atomically?' Battery packs cost $600/kWh — but the raw materials cost $80/kWh. So the problem was manufacturing, not physics.",
    trap: "Can be overused: reinventing well-solved problems wastes time. Apply when analogies keep failing.",
  },
  {
    name: "Inversion",
    icon: "IV",
    color: "oklch(0.68_0.20_140)",
    what: "Instead of asking 'How do I succeed?' ask 'What would guarantee failure?' Then avoid those things.",
    why: "Humans are better at spotting what's wrong than what's right. Inversion makes the obstacles vivid and concrete.",
    example: "Charlie Munger: 'Invert, always invert.' A manager improving team morale inverts: 'What would destroy morale fastest?' Micromanagement, unclear goals, ignoring feedback — now you have a prioritized to-don't list.",
    trap: "Don't stop at inversion — use it alongside positive analysis. Knowing what to avoid doesn't tell you what to do.",
  },
  {
    name: "Second-Order Effects",
    icon: "2O",
    color: "oklch(0.72_0.18_40)",
    what: "First-order: the direct, intended result. Second-order: what happens next because of that result.",
    why: "Most bad policy, business decisions, and life choices fail because planners stopped at the first-order effect.",
    example: "First-order: subsidize housing construction → more affordable housing. Second-order: increased demand from subsidy may drive up land prices, offsetting gains. Third-order: developers concentrate on subsidized units only, reducing unsubsidized supply.",
    trap: "Analysis paralysis. Second-order thinking is a check, not a veto — don't use possible negative downstream effects to justify inaction.",
  },
  {
    name: "Occam's Razor",
    icon: "OR",
    color: "oklch(0.68_0.22_10)",
    what: "Among competing explanations that equally fit the evidence, prefer the simplest.",
    why: "Complex explanations have more places to be wrong. Simpler ones are easier to test and falsify.",
    example: "Your car won't start. Occam's: dead battery or empty fuel. Not: the fuel injectors AND the alternator AND the ECU all failed simultaneously.",
    trap: "Simplest does not mean 'most comfortable' or 'requires least change to your current beliefs.' The simplest explanation must still fit all the evidence.",
  },
  {
    name: "The Map ≠ Territory",
    icon: "MT",
    color: "oklch(0.75_0.18_55)",
    what: "Every model, framework, or mental map is a simplification. It is not the thing it describes.",
    why: "We forget this constantly. A spreadsheet model of a business is not the business. A political theory is not the society it describes. Confusing the map for the territory is the source of enormous error.",
    example: "GDP measures economic output, not well-being. When countries optimize for GDP growth while ignoring inequality, pollution, and social cohesion, they optimized for the map — and found the territory got worse.",
    trap: "This doesn't mean models are useless. A map that gets you from A to B is extremely useful — just don't eat it when you're hungry.",
  },
  {
    name: "Circle of Competence",
    icon: "CC",
    color: "oklch(0.72_0.2_290)",
    what: "Know the boundaries of what you actually understand deeply — and operate mostly within them. Expand deliberately rather than accidentally.",
    why: "Most catastrophic decisions are made by intelligent people operating outside their area of genuine competence while not knowing they've crossed the line. Confidence and competence often diverge — especially in adjacent domains.",
    example: "Warren Buffett refuses to invest in tech companies he doesn't understand, even during bubbles. In 1999 he was mocked for missing the dot-com boom. In 2001, his portfolio was fine. He knew his circle and stayed in it.",
    trap: "The circle is not fixed — you can expand it through deliberate study. The trap is thinking you've expanded your circle when you've only borrowed vocabulary from an adjacent field.",
  },
  {
    name: "Hanlon's Razor",
    icon: "HR",
    color: "oklch(0.68_0.18_200)",
    what: "Never attribute to malice what can be adequately explained by stupidity — or more charitably, by ignorance, negligence, or poor systems.",
    why: "Assuming malice is cognitively easy and emotionally satisfying. It provides a clear villain. But most bad outcomes result from incompetence, miscommunication, or structural problems — not deliberate harm.",
    example: "Your email goes unanswered for four days. Malice interpretation: they're ignoring you. Hanlon's: they're overwhelmed, forgot, or have a system that buried your message. The charitable interpretation is usually correct and leads to more productive responses.",
    trap: "Some things are genuinely malicious. Hanlon's Razor is a prior to start from, not a rule that forecloses updating toward malice when evidence warrants it.",
  },
  {
    name: "Regret Minimization",
    icon: "RM",
    color: "oklch(0.70_0.20_150)",
    what: "When facing a major decision, project yourself to age 80 and ask which choice you would regret less. Optimize for that.",
    why: "We overweight immediate costs (fear, embarrassment, financial risk) and underweight long-term costs (inaction, unlived paths, accumulated regret). The 80-year-old view corrects that time-horizon bias.",
    example: "Jeff Bezos was deciding whether to leave a well-paying job to start Amazon in 1994. His regret minimization: at 80, would he regret not trying? Yes, deeply. Would he regret trying and failing? No — he'd understand that. He quit.",
    trap: "Don't use regret minimization to rationalize impulsive decisions. It works best for high-stakes, irreversible choices where you've done the analysis and are stuck on fear of the leap.",
  },
  {
    name: "Margin of Safety",
    icon: "MS",
    color: "oklch(0.75_0.15_60)",
    what: "Build in a buffer between what you need and what you have. Design for being more wrong than you think you'll be.",
    why: "We are systematically overconfident about our estimates. Bridges are built to hold far more than their maximum load. Businesses keep cash reserves. The margin is protection against the inevitable gap between map and territory.",
    example: "Benjamin Graham's value investing principle: only buy a stock at a significant discount to its intrinsic value. If your analysis is even somewhat off, the margin absorbs the error. In engineering: the Golden Gate Bridge was built to support six times the traffic of the densest expected day.",
    trap: "Excessive margin of safety can mean never acting — you're always waiting for conditions to be better. The margin should be calibrated to the stakes and irreversibility of the decision, not maximized unconditionally.",
  },
  {
    name: "Base Rates",
    icon: "BR",
    color: "oklch(0.68_0.20_240)",
    what: "Before estimating the probability of a specific outcome, ask: how often do similar things typically succeed? Start from the outside view, then adjust for your specific case.",
    why: "Humans default to the inside view — focusing on the specific features of their situation. But our case is rarely as unique as we think. The base rate of restaurant failures, startup failures, construction overruns, and relationship success rates are all predictive — and mostly ignored.",
    example: "A startup founder estimates 70% chance of success based on their team, idea, and market timing. Base rate: ~90% of startups fail within ten years. A calibrated estimate combines both — the specific factors shift the base rate, but not as much as founders believe.",
    trap: "Base rates from the wrong reference class are worse than useless. A startup disrupting an established industry has a different base rate than a typical new restaurant. Selecting the right reference class is the hard part.",
  },
];

const CT3_QUIZ_L11 = [
  {
    id: "ct11q1",
    question: "First-principles thinking differs from analogical thinking because:",
    options: [
      "First principles is always slower and less practical",
      "First principles builds from verified fundamentals rather than inherited assumptions from similar situations",
      "Analogical thinking is less accurate in all circumstances",
      "First principles applies only to engineering problems",
    ],
    correct: 1,
    explanation: "Analogical thinking ('this is like X') inherits all of X's constraints — including ones that may not apply. First principles strips those away and asks what is fundamentally true, which can reveal solutions invisible from the analogical frame.",
  },
  {
    id: "ct11q2",
    question: "A manager using inversion to improve team culture asks:",
    options: [
      "'What would make people love working here?'",
      "'What would make everyone quit within a month?'",
      "'What do other successful companies do?'",
      "'What did we do last quarter?'",
    ],
    correct: 1,
    explanation: "Inversion reframes the question toward guaranteed failure — which humans identify more reliably than guaranteed success. The resulting list of failure conditions becomes a high-value avoidance checklist.",
  },
  {
    id: "ct11q3",
    question: "The 'map is not the territory' principle warns us that:",
    options: [
      "Geographic maps are inaccurate",
      "Our models and frameworks are simplifications that can diverge dangerously from the reality they represent",
      "Abstract thinking is less useful than concrete thinking",
      "We should avoid using frameworks altogether",
    ],
    correct: 1,
    explanation: "Every model — economic, scientific, social, cognitive — is a simplification. The danger is mistaking the model for the thing it represents. Optimizing for the metric (the map) instead of the underlying reality (the territory) is one of the most common institutional failures.",
  },
  {
    id: "ct11q4",
    question: "Occam's Razor says that when two explanations fit the evidence equally well, you should prefer:",
    options: [
      "The more creative one",
      "The one with fewer unsupported assumptions",
      "The one endorsed by authority",
      "The one that appeared first in the literature",
    ],
    correct: 1,
    explanation: "Occam's Razor is a principle of parsimony — simpler explanations are preferred not because they're definitely correct, but because extra assumptions compound uncertainty. An explanation that requires fewer unverified assumptions is more robust and easier to test.",
  },
  {
    id: "ct11q5",
    question: "Second-order thinking asks:",
    options: [
      "'What will happen?' (the immediate effect)",
      "'And then what?' — the consequences of the consequences",
      "'What happened before?' — the historical precedent",
      "'Who else benefits?' — the stakeholder analysis",
    ],
    correct: 1,
    explanation: "Most people stop at first-order effects ('the policy will reduce X'). Second-order thinking asks what happens as a result of that change — which is where unintended consequences, adaptive responses, and systemic effects live. The chess player who only thinks one move ahead loses.",
  },
  {
    id: "ct11q6",
    question: "The Circle of Competence model warns against:",
    options: [
      "Developing expertise in too many fields",
      "Applying the analytical style of one domain with confidence to adjacent domains where the domain knowledge doesn't transfer",
      "Relying on specialists rather than generalists",
      "Overestimating how long learning takes",
    ],
    correct: 1,
    explanation: "The analytical skill (rigorous thinking, quantitative reasoning, hypothesis testing) often transfers across domains. The domain knowledge does not. Expert overreach happens when a physicist speaks about economics or a doctor about public policy with the same confidence they have in their primary field — mistaking one for the other.",
  },
  {
    id: "ct11q7",
    question: "The Regret Minimization Framework is most useful when:",
    options: [
      "Making small reversible decisions where the stakes are low",
      "Facing high-stakes, hard-to-reverse decisions where fear of the short-term cost may outweigh the long-term cost of inaction",
      "Evaluating other people's decisions in retrospect",
      "Comparing two similar options with similar expected outcomes",
    ],
    correct: 1,
    explanation: "Regret minimization corrects a specific bias: we overweight immediate, concrete costs (fear, financial risk, social discomfort) relative to long-run costs (inaction, unlived alternatives, accumulated regret). The 80-year-old perspective shifts the time horizon and resolves many fear-driven impasses.",
  },
];

const CT3_ARGUMENT_MAP_EXAMPLES = [
  {
    claim: "Remote work increases productivity",
    premises: [
      "Stanford study: remote workers were 13% more productive than office counterparts",
      "Commute elimination saves 2+ hours/day, reducing fatigue",
      "Flexible schedule allows work during personal peak focus hours",
    ],
    hidden_assumptions: [
      "Productivity is accurately captured by output metrics, not just hours",
      "Home environments are suitable for focused work (no childcare, noise, etc.)",
      "The benefits generalize beyond individual contributors to collaborative teams",
    ],
    steelman: "Remote work likely increases productivity for roles requiring deep, individual focus — but may reduce effectiveness for roles requiring spontaneous collaboration, mentorship, or real-time iteration. The question is role-dependent, not universal.",
    color: "oklch(0.68_0.20_140)",
  },
  {
    claim: "Social media is harmful to democracy",
    premises: [
      "Algorithmic amplification of outrage-inducing content creates filter bubbles",
      "Foreign state actors use platforms to spread coordinated disinformation",
      "Political polarization metrics have risen alongside social media adoption",
    ],
    hidden_assumptions: [
      "Correlation between social media rise and polarization implies causation",
      "Pre-social-media democracy was the healthier baseline",
      "The harms are distributed equally across populations and political groups",
    ],
    steelman: "Social media likely amplifies pre-existing polarization tendencies rather than creating them. The platform design — not social media in principle — drives most identified harms. Platform-specific regulation may address root causes better than broad restriction.",
    color: "oklch(0.70_0.22_270)",
  },
];

const CT3_QUIZ_L12 = [
  {
    id: "ct12q1",
    question: "A hidden assumption is best described as:",
    options: [
      "A premise the arguer is deliberately concealing",
      "An unstated belief the argument must be true for it to work",
      "Evidence that contradicts the conclusion",
      "A conclusion that hasn't been proven yet",
    ],
    correct: 1,
    explanation: "Hidden assumptions are not necessarily dishonest — the arguer often isn't aware of them. They are the unstated background beliefs that a conclusion depends on. Surfacing them is how you test whether an argument actually holds under scrutiny.",
  },
  {
    id: "ct12q2",
    question: "Steel-manning an argument means:",
    options: [
      "Repeating the argument back in weaker terms to make it easier to refute",
      "Constructing the strongest possible version of the opposing view before responding",
      "Finding all factual errors in the argument",
      "Agreeing with the conclusion while disputing the premises",
    ],
    correct: 1,
    explanation: "Steel-manning is the opposite of straw-manning. It forces you to engage with the best version of the opposing view — which reveals whether your rebuttal holds up against real objections, not caricatures.",
  },
  {
    id: "ct12q3",
    question: "An argument mapping diagram helps most by:",
    options: [
      "Making arguments look more persuasive through visual presentation",
      "Revealing the logical structure so each premise can be evaluated independently",
      "Summarizing both sides of a debate into equal length",
      "Replacing the need to read the original argument",
    ],
    correct: 1,
    explanation: "Argument maps force you to identify which claims support which conclusions — making the logical structure visible. This allows each premise to be challenged or validated individually, without the rhetorical packaging of the original text.",
  },
  {
    id: "ct12q4",
    question: "You've steel-manned an opponent's position when:",
    options: [
      "You can recite their exact words back",
      "They would agree that your version of their argument is stronger than the original",
      "You've identified all their factual errors",
      "You've found at least three weaknesses in their case"],
    correct: 1,
    explanation: "The test of a good steelman is whether the opponent endorses it. If they say 'that's not my argument' or 'that's even better than how I put it,' you're in range. If they object to your characterization, you haven't steel-manned — you've straw-manned with more effort.",
  },
  {
    id: "ct12q5",
    question: "Convergent validity in argument evaluation means:",
    options: [
      "Multiple independent lines of evidence point toward the same conclusion",
      "The argument is accepted by the scientific community",
      "The conclusion is consistent with your prior beliefs",
      "The argument has been peer-reviewed"],
    correct: 0,
    explanation: "Convergent validity — when multiple independent methods, sources, or lines of reasoning all reach the same conclusion — is one of the strongest signals of a robust claim. This is different from source laundering (same claim cited multiple times) because the independence is real.",
  },
];

const CT3_SYSTEMS_CONCEPTS = [
  {
    name: "Feedback Loops",
    type: "Reinforcing (R)",
    color: "oklch(0.68_0.22_10)",
    description: "Output feeds back as input, amplifying the original signal. Growth compounds. Decline spirals.",
    example: "More users → more content → better recommendations → more users. Also: poverty → limited opportunity → poverty.",
    insight: "Reinforcing loops don't continue forever. They hit limits — physical, social, economic. Identifying those limits is the key question.",
  },
  {
    name: "Balancing Loops",
    type: "Stabilizing (B)",
    color: "oklch(0.70_0.22_270)",
    description: "The system resists change and seeks equilibrium. The output feeds back to reduce the gap between actual and desired state.",
    example: "Thermostat: if temperature drops below target → heater activates → temperature rises → heater deactivates. Body temperature regulation works the same way.",
    insight: "Balancing loops underlie most stable systems — biology, economics, ecosystems. Breaking them produces instability.",
  },
  {
    name: "Unintended Consequences",
    type: "Emergence",
    color: "oklch(0.72_0.18_40)",
    description: "Interventions in complex systems produce effects beyond those intended — often working through second- and third-order feedback loops invisible at the time of the decision.",
    example: "Cobra Effect (India, British colonial era): bounty offered for dead cobras → entrepreneurs bred cobras to collect bounties → cobra population increased after program ended.",
    insight: "The more tightly coupled a system (parts interact with many other parts), the higher the probability of unintended consequences. This isn't a reason for inaction — it's a reason for monitoring and iteration.",
  },
  {
    name: "Emergence",
    type: "Complexity",
    color: "oklch(0.68_0.20_140)",
    description: "Properties that appear at the system level that cannot be predicted from examining any individual component.",
    example: "No individual neuron understands language, but 86 billion neurons collectively produce comprehension, creativity, and consciousness. Markets 'know' prices that no individual participant knows.",
    insight: "Emergence makes purely reductionist analysis fail. You cannot understand traffic by studying one car. You cannot understand a market by studying one trader.",
  },
  {
    name: "Stock & Flow",
    type: "Structure",
    color: "oklch(0.75_0.18_55)",
    description: "Stocks are accumulations — the amount of something at a point in time. Flows are rates of change — how fast the stock is filling or draining. Most system delays exist because stocks take time to respond to changes in flows.",
    example: "Carbon in the atmosphere is a stock. Emissions are inflows; absorption by oceans and forests are outflows. Even if we stopped all emissions today, the stock would remain elevated for centuries. This is why climate targets require negative flows, not just reduced flows.",
    insight: "Policy failures often result from confusing a flow (rate of change) for a stock (current level). Reducing the rate of harm is different from reducing harm. Understanding which you're targeting determines whether your intervention makes sense.",
  },
  {
    name: "Time Delays",
    type: "Dynamics",
    color: "oklch(0.72_0.2_290)",
    description: "In complex systems, causes and effects are separated in time — often by months or years. This makes it hard to identify what caused what, and causes actors to over-correct because they respond before the first intervention has had time to work.",
    example: "Interest rate hikes take 12-18 months to reduce inflation through the economy. Central banks that raise rates and then see no immediate effect often raise again — producing a cumulative effect that tips the economy into recession 18 months later.",
    insight: "Time delays create the classic 'whack-a-mole' pattern: interventions seem to fail, you intervene more aggressively, and then multiple delayed effects arrive simultaneously and overshoot. Patience and monitoring are more effective than escalating responses.",
  },
  {
    name: "Leverage Points",
    type: "Intervention",
    color: "oklch(0.70_0.22_270)",
    description: "Some places in a system are disproportionately sensitive to intervention. Small changes at leverage points produce large system-wide effects. Donella Meadows identified a hierarchy: changing parameters (numbers) is weak; changing goals, paradigms, or system structure is powerful.",
    example: "Changing the interest rate on a loan is a parameter-level intervention — it affects flows, but the system structure remains. Changing the rules about who can lend (system structure) or the purpose a financial system is designed to serve (paradigm) is a much higher leverage point.",
    insight: "Most policy interventions operate at the lowest-leverage levels (changing numbers, adjusting existing flows) because they're politically easiest. The highest-leverage interventions (changing goals, rules, paradigms) are the most contested because they threaten existing power structures.",
  },
];

const CT3_QUIZ_L13 = [
  {
    id: "ct13q1",
    question: "A reinforcing feedback loop is one where:",
    options: [
      "The system corrects toward a stable equilibrium",
      "Output feeds back as input, amplifying the original direction",
      "External forces balance competing pressures",
      "Multiple systems check each other's growth",
    ],
    correct: 1,
    explanation: "Reinforcing loops amplify — they drive growth or decline depending on direction. They do not self-correct. Understanding whether a loop is reinforcing or balancing tells you whether a trend will accelerate or stabilize.",
  },
  {
    id: "ct13q2",
    question: "The Cobra Effect illustrates:",
    options: [
      "That bounties are an ineffective motivator",
      "How interventions in complex systems can produce outcomes opposite to those intended through adaptive behavior",
      "That colonial policies were always poorly designed",
      "How to eliminate an invasive species",
    ],
    correct: 1,
    explanation: "The Cobra Effect is the archetypal unintended consequence: the incentive changed behavior in an unexpected way that worked against the goal. Complex systems contain adaptive agents who respond to interventions — often by finding loopholes.",
  },
  {
    id: "ct13q3",
    question: "Emergence means that complex system properties:",
    options: [
      "Are caused by a single dominant component",
      "Can be fully predicted by studying parts in isolation",
      "Arise at the system level and cannot be predicted from components alone",
      "Are random and therefore not worth studying",
    ],
    correct: 2,
    explanation: "Emergence is why reductionism has limits. The wetness of water is not a property of H2O molecules in isolation. Consciousness is not a property of a single neuron. The price signal in a market is not held by any one trader. The system level has properties that parts do not.",
  },
  {
    id: "ct13q4",
    question: "The best response to unintended consequences of a complex policy is:",
    options: [
      "Abandon the policy immediately",
      "Double down — unintended consequences prove the policy was right",
      "Monitor, identify which feedback loops produced the unintended effect, and iterate",
      "Ignore them — all policies have side effects"],
    correct: 2,
    explanation: "Complex systems require iteration, not abandonment or doubling-down. The unintended consequence is information — it reveals which feedback loops were missed in the design. The right response is to monitor, diagnose, and adjust the intervention rather than treating the initial design as either perfect or failed.",
  },
  {
    id: "ct13q5",
    question: "Stock and flow thinking is useful because:",
    options: [
      "It separates the amount of something (stock) from the rate of change (flow), revealing why systems are slow to respond to intervention",
      "It applies only to financial systems",
      "It simplifies complex systems into two variables",
      "It predicts when a system will reach equilibrium"],
    correct: 0,
    explanation: "Stocks (the accumulation) and flows (the rate of change) explain why complex systems have delays. Reducing pollution inflow today doesn't immediately clean a lake — the accumulated stock takes time to drain. This is why systemic problems persist even after their causes are addressed.",
  },
];

const CT3_MOTIVATED_REASONING_PATTERNS = [
  {
    name: "Conclusion-First Reasoning",
    shortname: "Conclusion First",
    color: "oklch(0.68_0.22_10)",
    description: "You decide what you want to be true, then assemble evidence in its favor — treating disconfirming evidence as requiring disproof and confirming evidence as self-evident.",
    signal: "You feel confident without having seriously engaged opposing evidence. You experience discomfort rather than curiosity when challenged.",
    example: "A manager unconsciously wants to hire the candidate from their own alma mater. They rate 'culture fit' highly for that candidate and 'communication skills' as what's missing for the others.",
    antidote: "Write down your conclusion before researching. After, list the three strongest arguments against it. Engage those honestly.",
  },
  {
    name: "Identity-Protective Cognition",
    shortname: "Identity Defense",
    color: "oklch(0.70_0.22_270)",
    description: "When evidence threatens a belief central to your group identity, intelligence is deployed to defend the belief rather than evaluate it.",
    signal: "Your position on an issue tracks your tribal group perfectly. You've never publicly disagreed with your group on any issue.",
    example: "Research shows that increasing scientific literacy among politically polarized groups increases disagreement on climate change — not reduces it. More information, more sophisticated motivated reasoning.",
    antidote: "Ask: 'What would it take to change my mind on this?' If the answer is 'nothing,' the belief is tribal, not rational.",
  },
  {
    name: "Galaxy-Brained Reasoning",
    shortname: "Galaxy Brain",
    color: "oklch(0.72_0.18_40)",
    description: "A chain of individually plausible-seeming logical steps that leads to an absurd or monstrous conclusion — used to justify what common sense would reject.",
    signal: "The argument is extremely clever. It requires many steps. It arrives at a conclusion almost everyone would find repugnant.",
    example: "'If we could prevent X deaths by doing Y, and our moral duty is to minimize death, then we are obligated to do Y' — where Y is something almost universally considered wrong. The sophistication of the argument is the red flag.",
    antidote: "Strong intuitions are evidence. If a conclusion feels deeply wrong, that's a signal to check the premises — not override the intuition with the logic.",
  },
  {
    name: "The Motte and Bailey",
    shortname: "Motte & Bailey",
    color: "oklch(0.68_0.20_140)",
    description: "Defend a controversial claim (the bailey) by retreating to an unobjectionable claim (the motte) when challenged — then return to the bailey when pressure eases.",
    signal: "When challenged, the position suddenly becomes much more modest. When unchallenged, it makes much stronger claims.",
    example: "Bailey: 'All gender differences are social constructs.' Challenged → Motte: 'Socialization plays a significant role in gender expression.' Nobody argues with the motte. Bailey reinstated when unchallenged.",
    antidote: "Pin down the specific claim: 'Is this the strong version or the modest version of your position? Which one are you defending?'",
  },
  {
    name: "Epistemic Cowardice",
    shortname: "Epistemic Cowardice",
    color: "oklch(0.75_0.18_55)",
    description: "Deliberately giving vague, uncommitted, or hedge-heavy answers to avoid controversy or social cost — sacrificing honesty for comfort.",
    signal: "Your stated position is consistently vaguer than your private position. You use phrases like 'it's complicated' or 'both sides have valid points' on issues where you've actually formed a clear view.",
    example: "A doctor privately believes a patient's lifestyle is causing their illness but frames it so gently that the patient doesn't register it as the main message. The doctor protected themselves from an uncomfortable conversation at the cost of the patient's health.",
    antidote: "Ask yourself: what would I say to a close friend I genuinely wanted to help, with no audience watching? That's usually your actual view. Then ask whether the version you're publicly stating is meaningfully weaker.",
  },
  {
    name: "Overconfidence by Expertise",
    shortname: "Expert Overreach",
    color: "oklch(0.70_0.22_270)",
    description: "Genuine expertise in one domain produces inflated confidence in adjacent or unrelated domains — and the intellectual tools of expertise are then deployed in motivated defense of those overconfident views.",
    signal: "You find yourself speaking with expert-level confidence about topics adjacent to (but not actually within) your domain. You dismiss criticism from non-experts rather than engaging their arguments.",
    example: "Physicists who become confident commentators on economics, biologists who pronounce on geopolitics, or engineers who dismiss social science as 'not rigorous.' The analytical style transfers; the domain knowledge does not.",
    antidote: "Explicitly map your circle of competence. When you leave it, switch from 'I know' to 'I suspect, based on analogies from my domain.' Actively seek out domain experts and update from them.",
  },
];

const CT3_QUIZ_L14 = [
  {
    id: "ct14q1",
    question: "Identity-protective cognition means that for politically polarized people, greater scientific literacy tends to:",
    options: [
      "Reduce polarization on contested scientific issues",
      "Have no effect on beliefs",
      "Increase polarization because intelligence is applied to defend tribal positions",
      "Improve factual accuracy while maintaining policy disagreements",
    ],
    correct: 2,
    explanation: "Research by Dan Kahan (Cultural Cognition Project) found that among the politically polarized, higher scientific literacy correlated with greater disagreement on issues like climate change — not less. Smarter people are better at motivated reasoning.",
  },
  {
    id: "ct14q2",
    question: "A Motte and Bailey argument involves:",
    options: [
      "Using historical precedent to justify current policy",
      "Switching between a strong, controversial claim and a weak, unobjectionable one depending on whether you're being challenged",
      "Building an argument on two separate but compatible foundations",
      "Using metaphors to explain technical concepts",
    ],
    correct: 1,
    explanation: "The Motte (a defensible stronghold) is the modest claim you retreat to under attack. The Bailey (the valuable but exposed village) is the bold claim you actually want to make. The fallacy is treating success in defending the motte as vindication of the bailey.",
  },
  {
    id: "ct14q3",
    question: "When a chain of sophisticated logic leads to a conclusion that strikes almost everyone as deeply wrong, a critical thinker should:",
    options: [
      "Accept the conclusion if the logic is formally valid",
      "Reject the logic as obviously flawed",
      "Treat the near-universal intuitive rejection as evidence that a premise in the chain is false",
      "Suspend judgment indefinitely",
    ],
    correct: 2,
    explanation: "Strong moral intuitions are evidence. They represent accumulated human wisdom about consequences and values. In ethics especially, when a valid argument produces a repugnant conclusion (tollensing the ponens), the right move is often to reject a premise — not accept the conclusion because the logic is clean.",
  },
  {
    id: "ct14q4",
    question: "The 'galaxy-brained' reasoning failure occurs when:",
    options: [
      "Arguments are too abstract to be understood",
      "A chain of individually plausible steps leads to a conclusion that should have been rejected at the start",
      "Experts use jargon to obscure weak arguments",
      "Complex analysis produces accurate predictions"],
    correct: 1,
    explanation: "Galaxy-brained reasoning is sophisticated motivated reasoning: each step seems locally valid, but the conclusion reveals that the entire chain was constructed backward from a desired endpoint. The antidote is to check whether you would have accepted each premise independently before seeing the conclusion.",
  },
  {
    id: "ct14q5",
    question: "The best signal that you are reasoning rather than rationalizing is:",
    options: [
      "Your conclusion agrees with expert consensus",
      "You would update your position if certain specific evidence emerged — and you can name what that evidence would be",
      "Your reasoning is complex and nuanced",
      "Your conclusion makes you uncomfortable"],
    correct: 1,
    explanation: "Pre-committing to what would change your mind is the strongest test of genuine reasoning. If you cannot name any possible evidence that would update your position, you are likely not reasoning — you are rationalizing a conclusion you've already committed to.",
  },
  {
    id: "ct14q6",
    question: "Epistemic cowardice is:",
    options: [
      "Refusing to engage with complex topics",
      "Giving deliberately vague or non-committal answers to avoid social cost, even when you hold a clear private view",
      "Changing your mind too quickly under social pressure",
      "Refusing to update beliefs even when evidence warrants it",
    ],
    correct: 1,
    explanation: "Epistemic cowardice is sacrificing honesty for comfort. The tell is the gap between what you say publicly and what you actually believe. It's not identical to genuine uncertainty — that's legitimate. It's when the vagueness is strategic, not epistemic.",
  },
  {
    id: "ct14q7",
    question: "Expert overreach in motivated reasoning occurs when:",
    options: [
      "An expert is overconfident within their own domain",
      "Genuine expertise in one area produces overconfidence in adjacent areas, and the same sophisticated reasoning tools are used to defend those overconfident views",
      "An expert refuses to engage outside their specialty",
      "Non-experts dismiss expert testimony",
    ],
    correct: 1,
    explanation: "The analytical style of expertise (systematic thinking, ability to construct sophisticated arguments) transfers across domains. The domain knowledge does not. This creates the most dangerous form of expert overreach: a person who is genuinely right to be confident in their domain, and cannot feel the difference when they've crossed the boundary.",
  },
];

const CT3_CAPSTONE_TOPICS = [
  { id: "tax", label: "Should wealthy individuals pay higher tax rates?", complexity: "Political Economy" },
  { id: "ubi", label: "Should governments provide a Universal Basic Income?", complexity: "Economic Policy" },
  { id: "ai_reg", label: "Should powerful AI systems be regulated by governments?", complexity: "Technology Policy" },
  { id: "speech", label: "Should social media platforms moderate political speech?", complexity: "Free Speech vs. Harm" },
  { id: "vax", label: "Should vaccines be mandatory for school attendance?", complexity: "Public Health vs. Autonomy" },
  { id: "custom", label: "A topic you care about (write it in)", complexity: "Your choice" },
];

const CT3_CAPSTONE_STEPS = [
  {
    label: "Claim",
    q: "State your position in one clear, specific sentence. Avoid vague language like 'should be considered' — commit to a claim.",
    ph: "Example: 'Government regulation of AI systems above a defined capability threshold is necessary and should be enacted within 5 years.'",
  },
  {
    label: "Best Evidence",
    q: "List the 3 strongest pieces of evidence or reasoning that support your claim. Be specific — cite studies, historical examples, or logical arguments.",
    ph: "1. ...\n2. ...\n3. ...",
  },
  {
    label: "Hidden Assumptions",
    q: "What must be true for your argument to work? List 2–3 assumptions your position depends on — things you're taking for granted.",
    ph: "My argument assumes that...\nIt also requires...",
  },
  {
    label: "Steel-Man",
    q: "State the strongest opposing argument in its most charitable form. This should be something an intelligent, good-faith opponent would actually say.",
    ph: "The strongest case against my position is...",
  },
  {
    label: "Rebuttal",
    q: "Now respond to that steel-manned opposition. Acknowledge what's valid in it, then explain why your position still holds (or revise your position if needed).",
    ph: "I acknowledge that... However...",
  },
  {
    label: "Limits",
    q: "Under what conditions would your position NOT hold? Every good argument has boundary conditions. Name at least one.",
    ph: "My argument breaks down if...\nThis doesn't apply when...",
  },
];

// ─── Clear Thinking Module 3 Component ──────────────────────────────────────────
function ClearThinkingModule3({ onBack }: { onBack: () => void }) {
  const { addXP } = usePersonalization();
  const [activeLesson, setActiveLesson] = useState<CT3LessonId>("ct11");
  const [completedLessons, setCompletedLessons] = useState<Set<CT3LessonId>>(new Set());

  function handleCT3Complete(id: CT3LessonId) {
    if (completedLessons.has(id)) return;
    const meta = CT3_LESSON_META.find((l) => l.id === id)!;
    setCompletedLessons((prev) => new Set(Array.from(prev).concat(id)));
    addXP(meta.xp);
    toast.success(`+${meta.xp} XP — ${meta.title} complete!`);
  }

  const overallPct = Math.round((completedLessons.size / CT3_LESSON_META.length) * 100);

  // Per-lesson state
  const [ct11ModelIdx, setCt11ModelIdx] = useState(0);
  const [ct11Revealed, setCt11Revealed] = useState<Set<number>>(new Set());
  const [ct11Seg, setCt11Seg] = useState(0);

  const [ct12ExIdx, setCt12ExIdx] = useState(0);
  const [ct12MapStep, setCt12MapStep] = useState<"premises" | "assumptions" | "steelman">("premises");
  const [ct12Practice, setCt12Practice] = useState({ claim: "", premises: "", assumptions: "", steelman: "" });
  const [ct12Seg, setCt12Seg] = useState(0);

  const [ct13ConceptIdx, setCt13ConceptIdx] = useState(0);
  const [ct13Seg, setCt13Seg] = useState(0);

  const [ct14PatternIdx, setCt14PatternIdx] = useState(0);
  const [ct14Reflection, setCt14Reflection] = useState("");
  const [ct14ReflectionDone, setCt14ReflectionDone] = useState(false);
  const [ct14Seg, setCt14Seg] = useState(0);

  const [ct15Topic, setCt15Topic] = useState<string | null>(null);
  const [ct15CustomTopic, setCt15CustomTopic] = useState("");
  const [ct15Step, setCt15Step] = useState(0);
  const [ct15Answers, setCt15Answers] = useState<string[]>(Array(CT3_CAPSTONE_STEPS.length).fill(""));
  const [ct15Done, setCt15Done] = useState(false);

  // AI expand
  const [expandResult, setExpandResult] = useState<string>("");
  const expandMutation = trpc.ai.explainConcept.useMutation({
    onSuccess: (data) => setExpandResult(data.explanation),
  });

  // ct13 — System Analyzer interactive lab
  const [ct13SysInput, setCt13SysInput] = useState("");
  const [ct13SysResult, setCt13SysResult] = useState("");
  const [ct13SysLoading, setCt13SysLoading] = useState(false);
  const ct13SysMutation = trpc.ai.explainConcept.useMutation({
    onSuccess: (data) => { setCt13SysResult(data.explanation); setCt13SysLoading(false); },
    onError: (err) => { toast.error(err.message); setCt13SysLoading(false); },
  });

  // ct14 — Motivated Reasoning Audit interactive lab
  const [ct14AuditInput, setCt14AuditInput] = useState("");
  const [ct14AuditResult, setCt14AuditResult] = useState("");
  const [ct14AuditLoading, setCt14AuditLoading] = useState(false);
  const ct14AuditMutation = trpc.ai.explainConcept.useMutation({
    onSuccess: (data) => { setCt14AuditResult(data.explanation); setCt14AuditLoading(false); },
    onError: (err) => { toast.error(err.message); setCt14AuditLoading(false); },
  });

  type SectionBadgeVariant = "hook" | "concept" | "explore" | "practice" | "capstone";
  function SectionBadge({ variant }: { variant: SectionBadgeVariant }) {
    const config: Record<SectionBadgeVariant, { label: string; color: string }> = {
      hook:     { label: "HOOK",     color: "oklch(0.75_0.18_55)" },
      concept:  { label: "CONCEPT",  color: "oklch(0.70_0.22_270)" },
      explore:  { label: "EXPLORE",  color: "oklch(0.68_0.20_140)" },
      practice: { label: "PRACTICE", color: "oklch(0.72_0.18_40)" },
      capstone: { label: "CAPSTONE", color: "oklch(0.68_0.22_10)" },
    };
    const { label, color } = config[variant];
    return (
      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold tracking-widest mr-2 mb-3"
        style={{ background: `oklch(from ${color} l c h / 0.15)`, color, border: `1px solid oklch(from ${color} l c h / 0.35)` }}>
        {label}
      </span>
    );
  }

  function CT3Shell({ id, children }: { id: CT3LessonId; children: React.ReactNode }) {
    const meta = CT3_LESSON_META.find((l) => l.id === id)!;
    const done = completedLessons.has(id);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => setActiveLesson(CT3_LESSON_META[0].id)} className="p-2 rounded-lg glass border border-white/8 hover:border-white/20 transition-colors">
            <ChevronLeft size={14} className="text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground">Clear Thinking · Module 3 · {meta.title}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex-1 h-1 rounded-full bg-white/8">
                <div className="h-full rounded-full transition-all" style={{ width: done ? "100%" : "40%", background: meta.color }} />
              </div>
              <span className="text-xs shrink-0" style={{ color: meta.color }}>+{meta.xp} XP</span>
            </div>
          </div>
          {done
            ? <span className="text-xs px-2 py-1 rounded-full bg-[oklch(0.72_0.18_150_/_0.15)] text-[oklch(0.72_0.18_150)] border border-[oklch(0.72_0.18_150_/_0.3)]">Done</span>
            : <motion.button onClick={() => handleCT3Complete(id)} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
                style={{ background: `oklch(from ${meta.color} l c h / 0.15)`, color: meta.color, border: `1px solid oklch(from ${meta.color} l c h / 0.35)` }}>
                Mark done
              </motion.button>}
        </div>
        {children}
        {id !== "ct15" && (
          <div className="pt-2">
            <button onClick={() => { const ids: CT3LessonId[] = ["ct11","ct12","ct13","ct14","ct15"]; const idx = ids.indexOf(id); setActiveLesson(ids[idx + 1]); }}
              className="w-full py-3 rounded-xl glass border border-white/8 hover:border-white/20 text-sm text-muted-foreground hover:text-foreground transition-all flex items-center justify-center gap-2">
              Next lesson <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── CT11: Mental Models ──────────────────────────────────────────────────────
  const ct11Segments = [
    {
      title: "Why Your Thinking Needs Maps",
      narration: "Reality is too complex to hold in your head. Mental models are compression algorithms — frameworks that let you reason about new situations using patterns from solved ones. The question isn't whether to use mental models — you already do. The question is whether yours are accurate.",
      topics: ["mental models", "cognitive compression", "thinking frameworks"],
      body: (
        <div className="space-y-3">
          <SectionBadge variant="hook" />
          <p className="text-sm text-muted-foreground leading-relaxed">
            Charlie Munger called them a <strong className="text-foreground">"lattice of mental models"</strong> — a toolkit of frameworks that compound in value as they interact. A person with one mental model interprets every problem through that lens. A person with 50 has genuine intellectual flexibility.
          </p>
          <div className="glass rounded-xl p-4 border border-white/8">
            <div className="text-xs font-semibold text-foreground mb-2">The core insight</div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Every expert in every domain has developed mental models for their field. The goal of cross-disciplinary thinking is to borrow the most powerful models from each domain and apply them beyond their origin.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "Five Essential Models",
      narration: "These five models come from physics, philosophy, economics, and logic. Together they cover a large portion of the reasoning problems you will encounter.",
      topics: ["first principles", "inversion", "second-order effects", "Occam's razor"],
      body: (
        <div className="space-y-3">
          <SectionBadge variant="concept" />
          <div className="grid grid-cols-5 gap-1 mb-3">
            {CT3_MENTAL_MODELS.map((m, i) => (
              <button key={m.name} onClick={() => { setCt11ModelIdx(i); setCt11Revealed(new Set()); }}
                className="py-2 px-1 rounded-lg text-xs font-bold transition-all text-center"
                style={{
                  background: ct11ModelIdx === i ? `oklch(from ${m.color} l c h / 0.2)` : "oklch(1 0 0 / 0.04)",
                  color: ct11ModelIdx === i ? m.color : "oklch(0.6 0 0)",
                  border: `1px solid ${ct11ModelIdx === i ? `oklch(from ${m.color} l c h / 0.4)` : "oklch(1 0 0 / 0.08)"}`,
                }}>
                {m.icon}
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={ct11ModelIdx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="glass rounded-xl p-4 border" style={{ borderColor: `oklch(from ${CT3_MENTAL_MODELS[ct11ModelIdx].color} l c h / 0.3)` }}>
              <div className="font-semibold mb-2" style={{ color: CT3_MENTAL_MODELS[ct11ModelIdx].color }}>{CT3_MENTAL_MODELS[ct11ModelIdx].name}</div>
              <p className="text-sm text-foreground leading-relaxed mb-3">{CT3_MENTAL_MODELS[ct11ModelIdx].what}</p>
              {[
                { key: 0, label: "Why it works", content: CT3_MENTAL_MODELS[ct11ModelIdx].why },
                { key: 1, label: "Real example", content: CT3_MENTAL_MODELS[ct11ModelIdx].example },
                { key: 2, label: "Common trap", content: CT3_MENTAL_MODELS[ct11ModelIdx].trap },
              ].map(({ key, label, content }) => (
                <div key={key} className="mb-2">
                  {ct11Revealed.has(key) ? (
                    <div className="glass rounded-lg p-3 border border-white/8">
                      <div className="text-xs font-semibold text-muted-foreground mb-1">{label}</div>
                      <p className="text-sm text-foreground leading-relaxed">{content}</p>
                    </div>
                  ) : (
                    <button onClick={() => setCt11Revealed(prev => new Set(Array.from(prev).concat(key)))}
                      className="w-full text-left py-2 px-3 rounded-lg glass border border-white/8 hover:border-white/20 text-xs text-muted-foreground hover:text-foreground transition-all flex items-center gap-2">
                      <Eye size={11} /> Reveal: {label}
                    </button>
                  )}
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
          <div className="text-xs text-muted-foreground text-center">{ct11ModelIdx + 1} of {CT3_MENTAL_MODELS.length} models</div>
        </div>
      ),
    },
    {
      title: "Put a Model to Work",
      narration: "Now try applying one. Pick any model and use it on a real problem you face — work, personal, or social.",
      topics: ["applying mental models", "practice", "problem framing"],
      body: (
        <div className="space-y-3">
          <SectionBadge variant="practice" />
          <p className="text-sm text-muted-foreground mb-3">Pick one of the five models and apply it to a current decision or problem. Use the AI below to check your reasoning.</p>
          <div className="flex gap-1 flex-wrap mb-3">
            {CT3_MENTAL_MODELS.map((m) => (
              <button key={m.name} onClick={() => setCt11ModelIdx(CT3_MENTAL_MODELS.indexOf(m))}
                className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                style={{
                  background: `oklch(from ${m.color} l c h / 0.12)`,
                  color: m.color,
                  border: `1px solid oklch(from ${m.color} l c h / 0.3)`,
                }}>
                {m.name}
              </button>
            ))}
          </div>
          <div className="glass rounded-xl p-4 border border-[oklch(0.70_0.22_270_/_0.2)]">
            <div className="text-xs font-semibold text-[oklch(0.80_0.22_270)] mb-2">Selected: {CT3_MENTAL_MODELS[ct11ModelIdx].name}</div>
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{CT3_MENTAL_MODELS[ct11ModelIdx].what}</p>
            <div className="text-xs font-semibold text-muted-foreground mb-2">Applying this model to your problem:</div>
            <textarea
              placeholder={`Describe a problem, then apply ${CT3_MENTAL_MODELS[ct11ModelIdx].name} to it...`}
              rows={5}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-foreground placeholder:text-white/20 resize-none focus:outline-none focus:border-white/25"
              id="ct11-practice-input"
            />
            <button
              onClick={() => {
                const input = (document.getElementById("ct11-practice-input") as HTMLTextAreaElement)?.value || "";
                if (input.trim().length < 20) { toast.error("Describe your problem first"); return; }
                setExpandResult(""); expandMutation.mutate({ concept: `Check this reasoning with the "${CT3_MENTAL_MODELS[ct11ModelIdx].name}" model:\n${input}\n\nSay whether the model is applied well and give one improvement.`, level: "student" });
              }}
              disabled={expandMutation.isPending}
              className="mt-2 w-full py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 bg-[oklch(0.70_0.22_270_/_0.15)] text-[oklch(0.82_0.22_270)] border border-[oklch(0.70_0.22_270_/_0.3)] hover:bg-[oklch(0.70_0.22_270_/_0.25)]">
              {expandMutation.isPending ? <><Loader2 size={13} className="animate-spin" />Analyzing...</> : <><Brain size={13} />Get AI feedback</>}
            </button>
            {expandResult && (
              <div className="mt-3 p-3 rounded-lg bg-[oklch(0.70_0.22_270_/_0.1)] border border-[oklch(0.70_0.22_270_/_0.2)]">
                <LazyMarkdown>{expandResult}</LazyMarkdown>
              </div>
            )}
          </div>
          <QuizBlock questions={CT3_QUIZ_L11} accentColor="oklch(0.70_0.22_270)" />
        </div>
      ),
    },
  ];

  // ── CT12: Argument Mapping ───────────────────────────────────────────────────
  const ct12Segments = [
    {
      title: "Arguments Have Architecture",
      narration: "Every argument is a structure. It has a claim at the top, premises supporting it, and assumptions holding it all together. Most arguments look like prose — which hides the structure. Mapping forces you to expose it.",
      topics: ["argument structure", "premise mapping", "logical architecture"],
      body: (
        <div className="space-y-3">
          <SectionBadge variant="hook" />
          <div className="glass rounded-xl p-4 border border-[oklch(0.68_0.20_140_/_0.3)]">
            <div className="text-xs font-semibold text-[oklch(0.78_0.20_140)] mb-3">Anatomy of an Argument</div>
            {[
              { role: "CONCLUSION", description: "The claim being argued for", color: "oklch(0.68_0.20_140)" },
              { role: "PREMISES", description: "The reasons / evidence offered in support", color: "oklch(0.70_0.22_270)" },
              { role: "HIDDEN ASSUMPTIONS", description: "Unstated beliefs the argument must be true to work", color: "oklch(0.72_0.18_40)" },
              { role: "INFERENCE", description: "The logical bridge from premises to conclusion", color: "oklch(0.68_0.22_10)" },
            ].map(({ role, description, color }) => (
              <div key={role} className="flex items-start gap-3 mb-2.5">
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 mt-0.5"
                  style={{ background: `oklch(from ${color} l c h / 0.15)`, color, border: `1px solid oklch(from ${color} l c h / 0.3)` }}>
                  {role}
                </span>
                <p className="text-sm text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Most poor reasoning fails not at the inference step but at hidden assumptions — things taken for granted that turn out to be false or contested.
          </p>
        </div>
      ),
    },
    {
      title: "Case Studies: Map It",
      narration: "Let's map two real arguments. Step through each layer — premises, hidden assumptions, then the steel-man of the opposing view.",
      topics: ["argument mapping", "steel-manning", "hidden assumptions"],
      body: (
        <div className="space-y-3">
          <SectionBadge variant="explore" />
          <div className="flex gap-2 mb-3">
            {CT3_ARGUMENT_MAP_EXAMPLES.map((ex, i) => (
              <button key={i} onClick={() => { setCt12ExIdx(i); setCt12MapStep("premises"); }}
                className="flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all text-center"
                style={{
                  background: ct12ExIdx === i ? `oklch(from ${ex.color} l c h / 0.15)` : "oklch(1 0 0 / 0.04)",
                  color: ct12ExIdx === i ? ex.color : "oklch(0.6 0 0)",
                  border: `1px solid ${ct12ExIdx === i ? `oklch(from ${ex.color} l c h / 0.35)` : "oklch(1 0 0 / 0.08)"}`,
                }}>
                Case {i + 1}
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={ct12ExIdx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div className="glass rounded-xl p-4 border mb-3" style={{ borderColor: `oklch(from ${CT3_ARGUMENT_MAP_EXAMPLES[ct12ExIdx].color} l c h / 0.3)` }}>
                <div className="text-xs font-semibold text-muted-foreground mb-1">CLAIM</div>
                <p className="font-semibold text-foreground text-sm">{CT3_ARGUMENT_MAP_EXAMPLES[ct12ExIdx].claim}</p>
              </div>
              <div className="flex gap-1 mb-3">
                {(["premises", "assumptions", "steelman"] as const).map((step) => (
                  <button key={step} onClick={() => setCt12MapStep(step)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
                    style={{
                      background: ct12MapStep === step ? `oklch(from ${CT3_ARGUMENT_MAP_EXAMPLES[ct12ExIdx].color} l c h / 0.15)` : "oklch(1 0 0 / 0.04)",
                      color: ct12MapStep === step ? CT3_ARGUMENT_MAP_EXAMPLES[ct12ExIdx].color : "oklch(0.6 0 0)",
                      border: `1px solid ${ct12MapStep === step ? `oklch(from ${CT3_ARGUMENT_MAP_EXAMPLES[ct12ExIdx].color} l c h / 0.35)` : "oklch(1 0 0 / 0.08)"}`,
                    }}>
                    {step === "steelman" ? "Steel-Man" : step.charAt(0).toUpperCase() + step.slice(1)}
                  </button>
                ))}
              </div>
              <AnimatePresence mode="wait">
                <motion.div key={ct12MapStep} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                  className="glass rounded-xl p-4 border border-white/8">
                  {ct12MapStep === "premises" && (
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground mb-2">SUPPORTING PREMISES</div>
                      {CT3_ARGUMENT_MAP_EXAMPLES[ct12ExIdx].premises.map((p, i) => (
                        <div key={i} className="flex items-start gap-2 mb-2">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                            style={{ background: `oklch(from ${CT3_ARGUMENT_MAP_EXAMPLES[ct12ExIdx].color} l c h / 0.2)`, color: CT3_ARGUMENT_MAP_EXAMPLES[ct12ExIdx].color }}>
                            {i + 1}
                          </span>
                          <p className="text-sm text-foreground leading-relaxed">{p}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {ct12MapStep === "assumptions" && (
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground mb-2">HIDDEN ASSUMPTIONS</div>
                      <p className="text-xs text-muted-foreground mb-3">These are not stated in the argument but must be true for the argument to work.</p>
                      {CT3_ARGUMENT_MAP_EXAMPLES[ct12ExIdx].hidden_assumptions.map((a, i) => (
                        <div key={i} className="flex items-start gap-2 mb-2 p-2 rounded-lg bg-[oklch(0.72_0.18_40_/_0.08)] border border-[oklch(0.72_0.18_40_/_0.2)]">
                          <AlertTriangle size={12} className="text-[oklch(0.75_0.18_55)] mt-0.5 shrink-0" />
                          <p className="text-sm text-foreground leading-relaxed">{a}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {ct12MapStep === "steelman" && (
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground mb-2">STEEL-MAN (STRONGEST OPPOSING VIEW)</div>
                      <p className="text-sm text-foreground leading-relaxed">{CT3_ARGUMENT_MAP_EXAMPLES[ct12ExIdx].steelman}</p>
                      <div className="mt-3 p-2 rounded-lg bg-[oklch(0.68_0.20_140_/_0.08)] border border-[oklch(0.68_0.20_140_/_0.2)]">
                        <p className="text-xs text-muted-foreground">A steel-man is not a concession — it's intellectual honesty. If you can't state the opposing view in a way that proponent would recognize, you haven't understood the debate.</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        </div>
      ),
    },
    {
      title: "Map Your Own Argument",
      narration: "Now you try. Take any claim you believe and map it — identify the premises, surface the hidden assumptions, and write a steel-man of the opposition.",
      topics: ["argument mapping practice", "steel-manning", "self-assessment"],
      body: (
        <div className="space-y-3">
          <SectionBadge variant="practice" />
          {(["claim", "premises", "assumptions", "steelman"] as const).map((field) => {
            const labels: Record<string, string> = {
              claim: "Your Claim",
              premises: "Your 3 Strongest Premises",
              assumptions: "Hidden Assumptions (what must be true for your argument to work?)",
              steelman: "Steel-Man the Opposition",
            };
            const phs: Record<string, string> = {
              claim: "State your position clearly...",
              premises: "1. \n2. \n3. ",
              assumptions: "My argument assumes that...",
              steelman: "The strongest case against my view is...",
            };
            return (
              <div key={field} className="glass rounded-xl p-3 border border-white/8">
                <div className="text-xs font-semibold text-muted-foreground mb-1.5">{labels[field]}</div>
                <textarea
                  value={ct12Practice[field]}
                  onChange={(e) => setCt12Practice(prev => ({ ...prev, [field]: e.target.value }))}
                  placeholder={phs[field]}
                  rows={field === "claim" ? 2 : 3}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-sm text-foreground placeholder:text-white/20 resize-none focus:outline-none focus:border-white/25"
                />
              </div>
            );
          })}
          <button
            onClick={() => {
              const filled = Object.values(ct12Practice).every(v => v.trim().length > 10);
              if (!filled) { toast.error("Fill in all four fields first"); return; }
              setExpandResult(""); expandMutation.mutate({ concept: `Review this argument map:\nClaim: ${ct12Practice.claim}\nPremises: ${ct12Practice.premises}\nAssumptions: ${ct12Practice.assumptions}\nSteel-man: ${ct12Practice.steelman}\n\nBriefly score clarity/support/assumptions/charity and give one concrete improvement.`, level: "student" });
            }}
            disabled={expandMutation.isPending}
            className="w-full py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 bg-[oklch(0.68_0.20_140_/_0.15)] text-[oklch(0.78_0.20_140)] border border-[oklch(0.68_0.20_140_/_0.3)] hover:bg-[oklch(0.68_0.20_140_/_0.25)]">
            {expandMutation.isPending ? <><Loader2 size={13} className="animate-spin" />Reviewing...</> : <><Brain size={13} />AI argument review</>}
          </button>
          {expandResult && (
            <div className="p-3 rounded-xl bg-[oklch(0.68_0.20_140_/_0.1)] border border-[oklch(0.68_0.20_140_/_0.25)]">
              <LazyMarkdown>{expandResult}</LazyMarkdown>
            </div>
          )}
          <QuizBlock questions={CT3_QUIZ_L12} accentColor="oklch(0.68_0.20_140)" />
        </div>
      ),
    },
  ];

  // ── CT13: Systems Thinking ───────────────────────────────────────────────────
  const ct13Segments = [
    {
      title: "Why Smart People Cause Disasters",
      narration: "The most consequential policy failures, business collapses, and social crises are rarely caused by stupid people. They're caused by intelligent people reasoning correctly about components while missing the system.",
      topics: ["systems thinking", "complex systems", "why interventions fail"],
      body: (
        <div className="space-y-3">
          <SectionBadge variant="hook" />
          <div className="glass rounded-xl p-4 border border-[oklch(0.72_0.18_40_/_0.3)]">
            <p className="text-sm text-foreground leading-relaxed mb-3">
              In 1956, the US Army Corps of Engineers straightened the Kissimmee River in Florida to reduce flooding. It worked — flooding stopped. Then:
            </p>
            <div className="space-y-2">
              {[
                "Fish populations collapsed — they needed the meanders to spawn",
                "Wading bird populations fell 90% — they hunted in the shallow floodplains",
                "Water quality degraded — natural filtration systems were destroyed",
                "Downstream Lake Okeechobee began eutrophication cycles",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[oklch(0.75_0.18_55)] mt-1.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">The engineers solved the problem they could see. They were blind to the system.</p>
          </div>
        </div>
      ),
    },
    {
      title: "Four Systems Concepts",
      narration: "These four concepts explain most of how complex systems behave — and most of how interventions in them go wrong.",
      topics: ["feedback loops", "balancing loops", "unintended consequences", "emergence"],
      body: (
        <div className="space-y-3">
          <SectionBadge variant="concept" />
          <div className="flex gap-1 flex-wrap mb-2">
            {CT3_SYSTEMS_CONCEPTS.map((c, i) => (
              <button key={c.name} onClick={() => setCt13ConceptIdx(i)}
                className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                style={{
                  background: ct13ConceptIdx === i ? `oklch(from ${c.color} l c h / 0.18)` : "oklch(1 0 0 / 0.04)",
                  color: ct13ConceptIdx === i ? c.color : "oklch(0.6 0 0)",
                  border: `1px solid ${ct13ConceptIdx === i ? `oklch(from ${c.color} l c h / 0.4)` : "oklch(1 0 0 / 0.08)"}`,
                }}>
                {c.name}
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={ct13ConceptIdx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="glass rounded-xl p-4 border" style={{ borderColor: `oklch(from ${CT3_SYSTEMS_CONCEPTS[ct13ConceptIdx].color} l c h / 0.35)` }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs px-2 py-0.5 rounded font-bold"
                  style={{ background: `oklch(from ${CT3_SYSTEMS_CONCEPTS[ct13ConceptIdx].color} l c h / 0.15)`, color: CT3_SYSTEMS_CONCEPTS[ct13ConceptIdx].color, border: `1px solid oklch(from ${CT3_SYSTEMS_CONCEPTS[ct13ConceptIdx].color} l c h / 0.3)` }}>
                  {CT3_SYSTEMS_CONCEPTS[ct13ConceptIdx].type}
                </span>
                <span className="font-semibold text-foreground">{CT3_SYSTEMS_CONCEPTS[ct13ConceptIdx].name}</span>
              </div>
              <p className="text-sm text-foreground leading-relaxed mb-3">{CT3_SYSTEMS_CONCEPTS[ct13ConceptIdx].description}</p>
              <div className="glass rounded-lg p-3 border border-white/8 mb-2">
                <div className="text-xs font-semibold text-muted-foreground mb-1">Example</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{CT3_SYSTEMS_CONCEPTS[ct13ConceptIdx].example}</p>
              </div>
              <div className="glass rounded-lg p-3 border border-white/8">
                <div className="text-xs font-semibold text-muted-foreground mb-1">Key insight</div>
                <p className="text-sm text-foreground leading-relaxed">{CT3_SYSTEMS_CONCEPTS[ct13ConceptIdx].insight}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      ),
    },
    {
      title: "Spot the System",
      narration: "Let's test your systems lens. Read a scenario and identify which system dynamic is driving the outcome.",
      topics: ["systems identification", "feedback analysis", "practice"],
      body: (
        <div className="space-y-3">
          <SectionBadge variant="practice" />
          <div className="glass rounded-xl p-4 border border-[oklch(0.72_0.18_40_/_0.25)]">
            <div className="text-xs font-semibold text-muted-foreground mb-3">SCENARIO ANALYSIS</div>
            {[
              {
                scenario: "A city installs speed cameras to reduce accidents. Drivers slow down near cameras but speed up between them — total accidents remain constant.",
                dynamics: ["Feedback Loop (Balancing)", "Unintended Consequences", "Emergent Behavior", "Reinforcing Loop"],
                correct: 1,
                explanation: "This is an unintended consequence: drivers adapted their behavior in a way the intervention didn't anticipate. The cameras created a local balancing loop (near-camera) but the adaptive agents (drivers) found the system boundary.",
              },
              {
                scenario: "A popular social platform's algorithm rewards engagement. Controversial content gets more engagement than neutral content. The platform gradually fills with increasingly extreme content.",
                dynamics: ["Balancing Loop", "Reinforcing Loop (compounding amplification)", "Emergence", "Hidden Assumption"],
                correct: 1,
                explanation: "Reinforcing loop: controversial content → more engagement → more algorithmic promotion → more controversial content produced. No single decision caused this — it emerges from the feedback structure of the system.",
              },
            ].map((q, qi) => {
              const [selected, setSelected] = useState<number | null>(null);
              return (
                <div key={qi} className={qi > 0 ? "mt-4 pt-4 border-t border-white/8" : ""}>
                  <p className="text-sm text-foreground leading-snug mb-3">{q.scenario}</p>
                  <div className="space-y-1.5">
                    {q.dynamics.map((d, di) => (
                      <button key={di} onClick={() => setSelected(di)}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2"
                        style={{
                          background: selected === null ? "oklch(1 0 0 / 0.04)" : selected === di ? (di === q.correct ? "oklch(0.72_0.18_150_/_0.15)" : "oklch(0.68_0.22_10_/_0.15)") : "oklch(1 0 0 / 0.04)",
                          color: selected === null ? "oklch(0.7 0 0)" : selected === di ? (di === q.correct ? "oklch(0.80_0.18_150)" : "oklch(0.78_0.22_10)") : "oklch(0.5 0 0)",
                          border: `1px solid ${selected === di ? (di === q.correct ? "oklch(0.72_0.18_150_/_0.4)" : "oklch(0.68_0.22_10_/_0.4)") : "oklch(1 0 0 / 0.08)"}`,
                        }}>
                        {selected !== null && di === q.correct && <CheckCircle2 size={12} className="shrink-0" />}
                        {selected !== null && selected === di && di !== q.correct && <XCircle size={12} className="shrink-0" />}
                        {d}
                      </button>
                    ))}
                  </div>
                  {selected !== null && (
                    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                      className="mt-2 p-3 rounded-lg bg-[oklch(0.72_0.18_40_/_0.08)] border border-[oklch(0.72_0.18_40_/_0.2)]">
                      <p className="text-xs text-muted-foreground leading-relaxed">{q.explanation}</p>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
          <QuizBlock questions={CT3_QUIZ_L13} accentColor="oklch(0.72_0.18_40)" />
        </div>
      ),
    },
    {
      title: "System Analyzer Lab",
      narration: "Now apply the systems lens to a real situation. Describe any situation — a policy, a business, a social dynamic, a personal challenge — and the AI will identify the feedback loops, stocks and flows, and leverage points involved.",
      topics: ["systems analysis", "feedback identification", "leverage points", "practice"],
      body: (
        <div className="space-y-4">
          <SectionBadge variant="practice" />
          <div className="glass rounded-xl p-4 border border-[oklch(0.72_0.18_40_/_0.2)]">
            <div className="text-xs font-semibold text-[oklch(0.72_0.18_40)] mb-2">WHAT TO ANALYZE</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                "Traffic congestion in a growing city",
                "Declining enrollment at a university",
                "Polarization increasing on social media",
                "Burnout spreading in a workplace",
                "A startup growing faster than its processes",
                "Your own situation (describe below)",
              ].map((ex) => (
                <button key={ex} onClick={() => setCt13SysInput(ex)}
                  className="text-left p-2 rounded-lg glass border border-white/8 hover:border-[oklch(0.72_0.18_40_/_0.4)] text-xs text-muted-foreground hover:text-foreground transition-all">
                  {ex}
                </button>
              ))}
            </div>
          </div>
          <textarea value={ct13SysInput} onChange={(e) => setCt13SysInput(e.target.value)}
            placeholder="Describe a situation you want to analyze through a systems lens…"
            rows={4} className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[oklch(0.72_0.18_40_/_0.5)] resize-none" />
          <motion.button onClick={() => {
            if (!ct13SysInput.trim()) { toast.error("Describe a situation first."); return; }
            setCt13SysLoading(true); setCt13SysResult("");
            ct13SysMutation.mutate({ concept: `Analyze this situation with systems thinking:\n${ct13SysInput}\n\nReturn:\n1) Stocks and flows\n2) One reinforcing + one balancing loop\n3) Key time delays and likely misreads\n4) Possible unintended consequences\n5) Highest-leverage intervention and why`, level: "student" });
          }} disabled={ct13SysLoading || !ct13SysInput.trim()} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium text-black disabled:opacity-50"
            style={{ background: "linear-gradient(to right, oklch(0.72_0.18_40), oklch(0.70_0.22_270))" }}>
            {ct13SysLoading ? <><RefreshCw size={13} className="animate-spin" /> Analyzing…</> : <><Brain size={13} /> Analyze System</>}
          </motion.button>
          <AnimatePresence>
            {ct13SysResult && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-[oklch(0.72_0.18_40_/_0.08)] border border-[oklch(0.72_0.18_40_/_0.25)]">
                <div className="text-xs font-semibold text-[oklch(0.72_0.18_40)] mb-2">SYSTEMS ANALYSIS</div>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{ct13SysResult}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ),
    },
  ];

  // ── CT14: Motivated Reasoning ────────────────────────────────────────────────
  const ct14Segments = [
    {
      title: "The Lawyer in Your Head",
      narration: "Psychologist Jonathan Haidt described human reasoning as mostly post-hoc rationalization — the emotional/intuitive system decides first, and the rational mind constructs justifications afterward. You are not usually a scientist seeking truth. You are usually a lawyer defending a client you already believe is innocent.",
      topics: ["motivated reasoning", "rationalization", "intellectual honesty"],
      body: (
        <div className="space-y-3">
          <SectionBadge variant="hook" />
          <div className="glass rounded-xl p-4 border border-[oklch(0.68_0.22_10_/_0.3)]">
            <div className="text-xs font-semibold text-[oklch(0.78_0.22_10)] mb-2">The Haidt Rider-Elephant Model</div>
            <p className="text-sm text-foreground leading-relaxed mb-3">
              Jonathan Haidt's metaphor: moral and political reasoning is an <strong className="text-foreground">elephant</strong> (automatic emotional response) with a <strong className="text-foreground">rider</strong> (conscious reasoning) on top. The rider believes it controls the elephant. In reality, the elephant goes where it wants, and the rider narrates a justification.
            </p>
            <div className="glass rounded-lg p-3 border border-white/8">
              <p className="text-xs text-muted-foreground leading-relaxed">
                This isn't a flaw in bad reasoners — it's the default mode of essentially all human reasoning, including highly educated, highly intelligent people. The defense against it is <strong className="text-foreground">process</strong>, not intelligence.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Four Patterns of Self-Deception",
      narration: "These four patterns are the most common ways motivated reasoning expresses itself. Learning to name them is the first step to catching them in yourself.",
      topics: ["conclusion-first reasoning", "identity-protective cognition", "galaxy brain", "motte and bailey"],
      body: (
        <div className="space-y-3">
          <SectionBadge variant="concept" />
          <div className="flex gap-1 flex-wrap mb-2">
            {CT3_MOTIVATED_REASONING_PATTERNS.map((p, i) => (
              <button key={p.name} onClick={() => setCt14PatternIdx(i)}
                className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                style={{
                  background: ct14PatternIdx === i ? `oklch(from ${p.color} l c h / 0.15)` : "oklch(1 0 0 / 0.04)",
                  color: ct14PatternIdx === i ? p.color : "oklch(0.6 0 0)",
                  border: `1px solid ${ct14PatternIdx === i ? `oklch(from ${p.color} l c h / 0.35)` : "oklch(1 0 0 / 0.08)"}`,
                }}>
                {p.shortname}
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={ct14PatternIdx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="glass rounded-xl p-4 border" style={{ borderColor: `oklch(from ${CT3_MOTIVATED_REASONING_PATTERNS[ct14PatternIdx].color} l c h / 0.3)` }}>
              <div className="font-semibold mb-2 text-sm" style={{ color: CT3_MOTIVATED_REASONING_PATTERNS[ct14PatternIdx].color }}>
                {CT3_MOTIVATED_REASONING_PATTERNS[ct14PatternIdx].name}
              </div>
              <p className="text-sm text-foreground leading-relaxed mb-3">{CT3_MOTIVATED_REASONING_PATTERNS[ct14PatternIdx].description}</p>
              <div className="space-y-2">
                {[
                  { label: "Warning signal", content: CT3_MOTIVATED_REASONING_PATTERNS[ct14PatternIdx].signal },
                  { label: "Example", content: CT3_MOTIVATED_REASONING_PATTERNS[ct14PatternIdx].example },
                  { label: "Antidote", content: CT3_MOTIVATED_REASONING_PATTERNS[ct14PatternIdx].antidote },
                ].map(({ label, content }) => (
                  <div key={label} className="glass rounded-lg p-3 border border-white/8">
                    <div className="text-xs font-semibold text-muted-foreground mb-1">{label}</div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{content}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      ),
    },
    {
      title: "Intellectual Honesty as Practice",
      narration: "Intellectual honesty isn't a personality trait — it's a set of practices. Here are the ones with the strongest evidence base for reducing motivated reasoning.",
      topics: ["intellectual honesty", "epistemic hygiene", "debiasing"],
      body: (
        <div className="space-y-3">
          <SectionBadge variant="practice" />
          <div className="space-y-2">
            {[
              { practice: "Pre-mortem", description: "Before committing to a decision, imagine it has failed catastrophically. What went wrong? Forces you to surface objections your motivated mind suppressed.", icon: <Eye size={13} /> },
              { practice: "Consider the opposite", description: "For every conclusion, spend 2 minutes seriously generating the best case for the contrary position.", icon: <RotateCcw size={13} /> },
              { practice: "Confidence calibration", description: "Attach probabilities to your beliefs. '90% sure' forces more honesty than 'I know this is true.' Track your calibration over time.", icon: <Target size={13} /> },
              { practice: "Outsider test", description: "Ask: would I evaluate this evidence the same way if someone I disagree with politically/socially made this argument?", icon: <Users size={13} /> },
            ].map(({ practice, description, icon }) => (
              <div key={practice} className="glass rounded-xl p-3 border border-white/8 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-[oklch(0.68_0.22_10_/_0.15)] text-[oklch(0.78_0.22_10)] border border-[oklch(0.68_0.22_10_/_0.3)]">
                  {icon}
                </div>
                <div>
                  <div className="font-semibold text-sm text-foreground mb-0.5">{practice}</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="glass rounded-xl p-4 border border-[oklch(0.68_0.22_10_/_0.2)]">
            <div className="text-xs font-semibold text-muted-foreground mb-2">REFLECTION — Where Have You Done This?</div>
            <p className="text-xs text-muted-foreground mb-2 leading-relaxed">Describe a time you held a position that, in retrospect, was more about identity or emotion than evidence. What was the position? What were the signals you missed?</p>
            <textarea
              value={ct14Reflection}
              onChange={(e) => setCt14Reflection(e.target.value)}
              placeholder="Be honest — everyone has examples of this. The goal isn't confession, it's calibration..."
              rows={5}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-foreground placeholder:text-white/20 resize-none focus:outline-none focus:border-white/25"
            />
            {ct14Reflection.length > 30 && !ct14ReflectionDone && (
              <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                onClick={() => { setCt14ReflectionDone(true); addXP(10); toast.success("+10 XP — Reflection complete"); }}
                className="mt-2 w-full py-2 rounded-lg text-sm font-medium bg-[oklch(0.68_0.22_10_/_0.15)] text-[oklch(0.78_0.22_10)] border border-[oklch(0.68_0.22_10_/_0.35)] hover:bg-[oklch(0.68_0.22_10_/_0.25)] transition-all">
                Submit reflection (+10 XP)
              </motion.button>
            )}
            {ct14ReflectionDone && (
              <div className="mt-2 p-2 rounded-lg bg-[oklch(0.72_0.18_150_/_0.12)] border border-[oklch(0.72_0.18_150_/_0.3)] text-xs text-[oklch(0.72_0.18_150)] text-center">
                Reflection logged. Intellectual honesty is a practice, not a destination.
              </div>
            )}
          </div>
          <QuizBlock questions={CT3_QUIZ_L14} accentColor="oklch(0.68_0.22_10)" />
        </div>
      ),
    },
    {
      title: "Reasoning Audit Lab",
      narration: "The hardest application of motivated reasoning detection is turning the lens on yourself — in real time, on an issue you actually care about. Describe your reasoning on any topic and the AI will audit it for common patterns.",
      topics: ["reasoning audit", "self-analysis", "epistemic hygiene", "apply and practice"],
      body: (
        <div className="space-y-4">
          <SectionBadge variant="capstone" />
          <p className="text-sm text-muted-foreground leading-relaxed">Choose a topic where you have a strong view — ideally political, social, or personal. Describe your reasoning: why you believe what you believe and what evidence supports it. The AI will flag patterns of motivated reasoning it detects.</p>
          <div className="glass rounded-xl p-4 border border-[oklch(0.68_0.22_10_/_0.2)]">
            <div className="text-xs font-semibold text-[oklch(0.78_0.22_10)] mb-2">EXAMPLE TOPICS TO ANALYZE YOUR OWN REASONING ON</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                "Why I support / oppose stricter immigration policy",
                "Why I believe / doubt climate change requires urgent action",
                "Why I trust / distrust a particular media source",
                "Why I support / oppose my preferred political party",
                "Why I chose my current career path",
                "Why a particular person in my life was in the wrong",
              ].map((ex) => (
                <button key={ex} onClick={() => setCt14AuditInput(ex)}
                  className="text-left p-2.5 rounded-lg glass border border-white/8 hover:border-[oklch(0.68_0.22_10_/_0.4)] text-xs text-muted-foreground hover:text-foreground transition-all leading-snug">
                  {ex}
                </button>
              ))}
            </div>
          </div>
          <textarea value={ct14AuditInput} onChange={(e) => setCt14AuditInput(e.target.value)}
            placeholder="Describe your view and your reasoning in as much detail as you can. The more honest and specific you are, the more useful the audit will be…"
            rows={6} className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[oklch(0.68_0.22_10_/_0.4)] resize-none" />
          <motion.button onClick={() => {
            if (ct14AuditInput.trim().length < 30) { toast.error("Write more about your reasoning first."); return; }
            setCt14AuditLoading(true); setCt14AuditResult("");
            ct14AuditMutation.mutate({ concept: `Audit this reasoning for motivated reasoning:\n${ct14AuditInput}\n\nCheck for:\n1) conclusion-first reasoning\n2) identity-protective cognition\n3) hedging/epistemic cowardice\n4) motte-and-bailey shifts\n5) strongest missing counterargument\n\nThen give: likely core bias + one concrete corrective practice.\nBe candid and specific.`, level: "student" });
          }} disabled={ct14AuditLoading || ct14AuditInput.trim().length < 30} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
            style={{ background: "oklch(0.68_0.22_10)" }}>
            {ct14AuditLoading ? <><RefreshCw size={13} className="animate-spin" /> Auditing…</> : <><Search size={13} /> Audit My Reasoning</>}
          </motion.button>
          <AnimatePresence>
            {ct14AuditResult && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-[oklch(0.68_0.22_10_/_0.08)] border border-[oklch(0.68_0.22_10_/_0.25)]">
                <div className="text-xs font-semibold text-[oklch(0.78_0.22_10)] mb-2">REASONING AUDIT RESULTS</div>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{ct14AuditResult}</p>
                <div className="mt-3 p-3 rounded-lg bg-white/5 border border-white/8">
                  <p className="text-xs text-muted-foreground italic">Remember: identifying motivated reasoning in yourself is a skill that improves with practice. This audit reflects patterns in the reasoning you shared — not a judgment of your intelligence or character.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ),
    },
  ];

  function LessonWithSegments({
    id, segments, seg, setSeg,
  }: {
    id: CT3LessonId;
    segments: { title: string; narration: string; topics: string[]; body: React.ReactNode }[];
    seg: number;
    setSeg: (n: number) => void;
  }) {
    return (
      <CT3Shell id={id}>
        <div className="flex gap-1 mb-3">
          {segments.map((s, i) => (
            <button key={i} onClick={() => setSeg(i)}
              className="flex-1 py-1.5 px-2 rounded-lg text-xs transition-all text-center font-medium"
              style={{
                background: seg === i ? "oklch(0.70_0.22_270_/_0.15)" : "oklch(1 0 0 / 0.04)",
                color: seg === i ? "oklch(0.82_0.22_270)" : "oklch(0.5 0 0)",
                border: `1px solid ${seg === i ? "oklch(0.70_0.22_270_/_0.35)" : "oklch(1 0 0 / 0.08)"}`,
              }}>
              {i + 1}
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={seg} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
            <h3 className="font-semibold text-foreground mb-3">{segments[seg].title}</h3>
            <Narrator text={segments[seg].narration} />
            {segments[seg].body}
          </motion.div>
        </AnimatePresence>
        <SegmentFooter
          onReady={seg < segments.length - 1 ? () => setSeg(seg + 1) : undefined}
          topics={segments[seg].topics}
        />
        <div className="flex gap-2 mt-2">
          <button onClick={() => setSeg(Math.max(0, seg - 1))} disabled={seg === 0}
            className="flex-1 py-2 rounded-lg glass border border-white/8 text-xs text-muted-foreground disabled:opacity-30 hover:border-white/20 transition-all flex items-center justify-center gap-1">
            <ChevronLeft size={12} /> Back
          </button>
          {seg < segments.length - 1 && (
            <button onClick={() => setSeg(seg + 1)}
              className="flex-1 py-2 rounded-lg glass border border-white/8 text-xs text-muted-foreground hover:border-white/20 transition-all flex items-center justify-center gap-1">
              Next <ChevronRight size={12} />
            </button>
          )}
        </div>
      </CT3Shell>
    );
  }

  // ── Lesson list overview ─────────────────────────────────────────────────────
  if (activeLesson === "ct11" && ct11Seg === 0 && !completedLessons.has("ct11")) {
    // show full lesson
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <button onClick={onBack} className="p-2 rounded-lg glass border border-white/8 hover:border-white/20 transition-colors">
          <ChevronLeft size={14} className="text-muted-foreground" />
        </button>
        <div className="flex-1">
          <div className="text-xs text-muted-foreground mb-0.5">Clear Thinking · Module 3</div>
          <div className="font-semibold text-foreground">Systems &amp; Self</div>
        </div>
        {completedLessons.size > 0 && (
          <span className="text-sm font-bold" style={{ color: "oklch(0.70_0.22_270)" }}>{overallPct}%</span>
        )}
      </div>

      {completedLessons.size > 0 && (
        <div className="w-full h-2 rounded-full bg-white/8">
          <div className="h-full rounded-full bg-gradient-to-r from-[oklch(0.70_0.22_270)] to-[oklch(0.68_0.20_140)] transition-all" style={{ width: `${overallPct}%` }} />
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* CT11 */}
        {activeLesson === "ct11" && (
          <motion.div key="ct11" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LessonWithSegments id="ct11" segments={ct11Segments} seg={ct11Seg} setSeg={setCt11Seg} />
          </motion.div>
        )}

        {/* CT12 */}
        {activeLesson === "ct12" && (
          <motion.div key="ct12" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LessonWithSegments id="ct12" segments={ct12Segments} seg={ct12Seg} setSeg={setCt12Seg} />
          </motion.div>
        )}

        {/* CT13 */}
        {activeLesson === "ct13" && (
          <motion.div key="ct13" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LessonWithSegments id="ct13" segments={ct13Segments} seg={ct13Seg} setSeg={setCt13Seg} />
          </motion.div>
        )}

        {/* CT14 */}
        {activeLesson === "ct14" && (
          <motion.div key="ct14" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <LessonWithSegments id="ct14" segments={ct14Segments} seg={ct14Seg} setSeg={setCt14Seg} />
          </motion.div>
        )}

        {/* CT15 — Capstone */}
        {activeLesson === "ct15" && (
          <motion.div key="ct15" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <CT3Shell id="ct15">
              <div className="space-y-4">
                <Narrator text="This is the capstone for the entire Clear Thinking track — Modules 1, 2, and 3. You're going to build a complete, well-reasoned argument from scratch: a specific claim, strong premises, explicit assumptions, a genuine steel-man of the opposition, a rebuttal, and your argument's boundary conditions. This is what rigorous thinking looks like in practice." />

                {!ct15Topic ? (
                  <div className="space-y-3">
                    <SectionBadge variant="capstone" />
                    <div className="text-sm font-semibold text-foreground mb-2">Choose your controversy</div>
                    <p className="text-xs text-muted-foreground mb-3">Pick a topic you have a genuine opinion about. These are complex issues with legitimate positions on multiple sides — which makes them good test cases for your reasoning.</p>
                    <div className="space-y-2">
                      {CT3_CAPSTONE_TOPICS.map((t) => (
                        <button key={t.id} onClick={() => { setCt15Topic(t.id === "custom" ? "" : t.label); }}
                          className="w-full text-left p-3 rounded-xl glass border border-white/8 hover:border-white/20 transition-all">
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-sm text-foreground leading-snug">{t.label}</span>
                            <span className="text-xs text-muted-foreground shrink-0 mt-0.5">{t.complexity}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : ct15Topic === "" ? (
                  <div className="space-y-3">
                    <SectionBadge variant="capstone" />
                    <div className="text-sm font-semibold text-foreground mb-2">Write your own topic</div>
                    <textarea
                      value={ct15CustomTopic}
                      onChange={(e) => setCt15CustomTopic(e.target.value)}
                      placeholder="Describe a controversial topic you care about..."
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-foreground placeholder:text-white/20 resize-none focus:outline-none focus:border-white/25"
                    />
                    <button onClick={() => { if (ct15CustomTopic.trim().length > 5) setCt15Topic(ct15CustomTopic); }}
                      disabled={ct15CustomTopic.trim().length < 5}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[oklch(0.75_0.18_55_/_0.15)] text-[oklch(0.85_0.18_55)] border border-[oklch(0.75_0.18_55_/_0.3)] disabled:opacity-40 hover:bg-[oklch(0.75_0.18_55_/_0.25)] transition-all">
                      Use this topic
                    </button>
                  </div>
                ) : !ct15Done ? (
                  <div className="space-y-3">
                    <SectionBadge variant="capstone" />
                    <div className="glass rounded-xl p-3 border border-[oklch(0.75_0.18_55_/_0.3)]">
                      <div className="text-xs font-semibold text-[oklch(0.85_0.18_55)] mb-1">Your topic</div>
                      <p className="text-sm text-foreground leading-snug">{ct15Topic}</p>
                      <button onClick={() => { setCt15Topic(null); setCt15Step(0); setCt15Answers(Array(CT3_CAPSTONE_STEPS.length).fill("")); }}
                        className="mt-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">Change topic</button>
                    </div>
                    <div className="flex gap-1">
                      {CT3_CAPSTONE_STEPS.map((s, i) => (
                        <button key={i} onClick={() => setCt15Step(i)}
                          className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all text-center"
                          style={{
                            background: ct15Step === i ? "oklch(0.75_0.18_55_/_0.15)" : "oklch(1 0 0 / 0.04)",
                            color: ct15Step === i ? "oklch(0.85_0.18_55)" : ct15Answers[i].length > 20 ? "oklch(0.72_0.18_150)" : "oklch(0.5 0 0)",
                            border: `1px solid ${ct15Step === i ? "oklch(0.75_0.18_55_/_0.35)" : "oklch(1 0 0 / 0.08)"}`,
                          }}>
                          {ct15Answers[i].length > 20 ? <CheckCircle2 size={10} className="inline" /> : i + 1} {s.label}
                        </button>
                      ))}
                    </div>
                    <AnimatePresence mode="wait">
                      <motion.div key={ct15Step} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
                        <div className="glass rounded-xl p-4 border border-white/8">
                          <div className="text-xs font-semibold text-[oklch(0.85_0.18_55)] mb-2">STEP {ct15Step + 1} — {CT3_CAPSTONE_STEPS[ct15Step].label.toUpperCase()}</div>
                          <p className="text-sm text-foreground leading-snug mb-3">{CT3_CAPSTONE_STEPS[ct15Step].q}</p>
                          <textarea
                            value={ct15Answers[ct15Step]}
                            onChange={(e) => { const u = [...ct15Answers]; u[ct15Step] = e.target.value; setCt15Answers(u); }}
                            placeholder={CT3_CAPSTONE_STEPS[ct15Step].ph}
                            rows={7}
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-foreground placeholder:text-white/20 resize-none focus:outline-none focus:border-white/25"
                          />
                          <div className="flex justify-between items-center mt-2">
                            <span className="text-xs text-muted-foreground">{ct15Answers[ct15Step].length} chars</span>
                            <div className="flex gap-2">
                              {ct15Step > 0 && (
                                <button onClick={() => setCt15Step(ct15Step - 1)}
                                  className="px-3 py-1.5 rounded-lg glass border border-white/8 text-xs text-muted-foreground hover:text-foreground transition-all">
                                  Back
                                </button>
                              )}
                              {ct15Step < CT3_CAPSTONE_STEPS.length - 1
                                ? <button onClick={() => setCt15Step(ct15Step + 1)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all bg-[oklch(0.75_0.18_55_/_0.15)] text-[oklch(0.85_0.18_55)] border border-[oklch(0.75_0.18_55_/_0.35)] hover:bg-[oklch(0.75_0.18_55_/_0.25)]">
                                    Next step
                                  </button>
                                : !ct15Done && (
                                  <button
                                    onClick={() => {
                                      const complete = ct15Answers.filter(a => a.length > 20).length;
                                      if (complete < 5) { toast.error(`Complete at least 5 of 6 steps (${complete}/6 done)`); return; }
                                      setCt15Done(true);
                                      handleCT3Complete("ct15");
                                    }}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[oklch(0.72_0.18_150_/_0.15)] text-[oklch(0.82_0.18_150)] border border-[oklch(0.72_0.18_150_/_0.35)] hover:bg-[oklch(0.72_0.18_150_/_0.25)] transition-all">
                                    Submit argument
                                  </button>
                                )
                              }
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                    {ct15Answers.every(a => a.length > 20) && (
                      <button
                        onClick={() => { setExpandResult(""); expandMutation.mutate({ concept: `Review this argument:\nTopic: ${ct15Topic}\nClaim: ${ct15Answers[0]}\nEvidence: ${ct15Answers[1]}\nAssumptions: ${ct15Answers[2]}\nSteel-man: ${ct15Answers[3]}\nRebuttal: ${ct15Answers[4]}\nLimits: ${ct15Answers[5]}\n\nEvaluate specificity, evidence quality, assumption quality, steel-man strength, rebuttal fit, and limits honesty. Give an overall rating and one key fix.`, level: "student" }); }}
                        disabled={expandMutation.isPending}
                        className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 bg-[oklch(0.70_0.22_270_/_0.15)] text-[oklch(0.82_0.22_270)] border border-[oklch(0.70_0.22_270_/_0.3)] hover:bg-[oklch(0.70_0.22_270_/_0.25)] transition-all">
                        {expandMutation.isPending ? <><Loader2 size={13} className="animate-spin" />Reviewing...</> : <><Brain size={13} />Get AI critique of my full argument</>}
                      </button>
                    )}
                    {expandResult && (
                      <div className="p-4 rounded-xl bg-[oklch(0.70_0.22_270_/_0.1)] border border-[oklch(0.70_0.22_270_/_0.25)]">
                        <LazyMarkdown>{expandResult}</LazyMarkdown>
                      </div>
                    )}
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
                    <div className="glass rounded-2xl p-6 border border-[oklch(0.75_0.18_55_/_0.4)] text-center">
                      <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-[oklch(0.75_0.18_55_/_0.15)] border border-[oklch(0.75_0.18_55_/_0.4)]">
                        <Trophy size={28} className="text-[oklch(0.85_0.18_55)]" />
                      </div>
                      <h3 className="text-xl font-bold text-foreground mb-2">Clear Thinking Certificate</h3>
                      <p className="text-sm text-muted-foreground mb-1">Module 3 — Systems &amp; Self</p>
                      <p className="text-xs text-muted-foreground mb-4">You have completed all 15 Clear Thinking lessons across 3 modules.</p>
                      <div className="flex flex-wrap gap-2 justify-center mb-5">
                        {[
                          { badge: "Argument Architect", color: "oklch(0.70_0.22_270)" },
                          { badge: "Systems Thinker", color: "oklch(0.72_0.18_40)" },
                          { badge: "Bias Spotter", color: "oklch(0.68_0.22_10)" },
                          { badge: "Steel-Manner", color: "oklch(0.68_0.20_140)" },
                          { badge: "Evidence Analyst", color: "oklch(0.72_0.18_150)" },
                          { badge: "Model Builder", color: "oklch(0.75_0.18_55)" },
                        ].map(({ badge, color }) => (
                          <span key={badge} className="px-2.5 py-1 rounded-full text-xs font-semibold"
                            style={{ background: `oklch(from ${color} l c h / 0.15)`, color, border: `1px solid oklch(from ${color} l c h / 0.35)` }}>
                            {badge}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">You can now: build structured arguments from first principles, map logical architecture, identify motivated reasoning in yourself and others, reason about complex systems, and construct well-bounded positions on contested issues.</p>
                    </div>
                  </motion.div>
                )}
              </div>
            </CT3Shell>
          </motion.div>
        )}

        {/* Lesson overview (default) */}
        {!["ct11","ct12","ct13","ct14","ct15"].includes(activeLesson) && (
          <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="space-y-2">
            {CT3_LESSON_META.map((lesson, i) => {
              const done = completedLessons.has(lesson.id);
              const locked = i > 0 && !completedLessons.has(CT3_LESSON_META[i - 1].id);
              return (
                <motion.div key={lesson.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className={`glass rounded-2xl border overflow-hidden transition-all ${done ? "border-[oklch(0.72_0.18_150_/_0.3)]" : "border-white/8 hover:border-white/15"}`}>
                  <button onClick={() => !locked && setActiveLesson(lesson.id)} className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/3 transition-colors">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
                      style={{ background: `color-mix(in oklch, ${lesson.color} 15%, transparent)`, border: `1px solid color-mix(in oklch, ${lesson.color} 30%, transparent)`, color: lesson.color }}>
                      {locked ? <Lock size={14} className="text-muted-foreground" /> : i + 11}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-foreground">{lesson.title}</div>
                      <p className="text-sm text-muted-foreground truncate">{lesson.subtitle}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={10} /> {lesson.duration}</span>
                      <span className="text-xs flex items-center gap-1" style={{ color: lesson.color }}><Zap size={10} /> +{lesson.xp} XP</span>
                      {done ? <span className="text-xs text-[oklch(0.72_0.18_150)] flex items-center gap-1"><CheckCircle2 size={10} /> Done</span> : <ChevronRight size={13} className="text-muted-foreground" />}
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lesson list always visible below active lesson */}
      {["ct11","ct12","ct13","ct14","ct15"].includes(activeLesson) && (
        <div className="space-y-1.5 pt-2">
          <div className="text-xs text-muted-foreground px-1 mb-1">All Module 3 Lessons</div>
          {CT3_LESSON_META.map((lesson, i) => {
            const done = completedLessons.has(lesson.id);
            const isActive = activeLesson === lesson.id;
            return (
              <button key={lesson.id} onClick={() => setActiveLesson(lesson.id)}
                className="w-full flex items-center gap-3 p-3 rounded-xl glass border transition-all text-left"
                style={{ borderColor: isActive ? `oklch(from ${lesson.color} l c h / 0.4)` : "oklch(1 0 0 / 0.08)" }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold"
                  style={{ background: `oklch(from ${lesson.color} l c h / 0.15)`, color: lesson.color }}>
                  {i + 11}
                </div>
                <span className="flex-1 text-sm text-foreground truncate">{lesson.title}</span>
                {done && <CheckCircle2 size={13} className="text-[oklch(0.72_0.18_150)] shrink-0" />}
                {isActive && !done && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: lesson.color }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Curriculum Generator ─────────────────────────────────────────────────────
function CurriculumGenerator({ initialGoal = "" }: { initialGoal?: string }) {
  const [, setLocation] = useLocation();
  const [goal, setGoal] = useState(initialGoal);
  const [currentKnowledge, setCurrentKnowledge] = useState("");
  const [timeAvailable, setTimeAvailable] = useState("5 hours/week");
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedModule, setExpandedModule] = useState<number | null>(null);
  const [generatingModuleIndex, setGeneratingModuleIndex] = useState<number | null>(null);
  const { addXP, profile, cookieId } = usePersonalization();

  const generateCurriculum = trpc.ai.generateCurriculum.useMutation({
    onSuccess: (data) => {
      // The server returns the curriculum as a structured object
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = data as any;
      // Map server format to client format
      const mapped: Curriculum = {
        title: (raw.title as string) ?? "Your Learning Path",
        overview: (raw.description as string) ?? "",
        totalDuration: raw.estimatedWeeks ? `${raw.estimatedWeeks as number} weeks` : "Self-paced",
        level: currentKnowledge || "Adaptive",
        curriculumId: (raw.curriculumId as string) ?? undefined,
        modules: ((raw.phases ?? []) as Array<{ title: string; objectives: string[]; resources: Array<{ title: string }> }>).map((p, i) => ({
          title: p.title,
          description: (p.objectives ?? []).join(". "),
          duration: `Phase ${i + 1}`,
          type: "lesson" as const,
          concepts: (p.resources ?? []).map((r) => r.title),
          objectives: p.objectives ?? [],
        })),
      };
      setCurriculum(mapped);
      addXP(50);
      toast.success("+50 XP — Curriculum generated!");
      setIsGenerating(false);
    },
    onError: (err: { message: string }) => {
      toast.error(err.message);
      setIsGenerating(false);
    },
  });

  const handleGenerate = () => {
    if (!goal.trim()) { toast.error("Please enter your learning goal."); return; }
    setIsGenerating(true);
    setCurriculum(null);
    const levelMap: Record<string, "beginner" | "intermediate" | "advanced"> = {
      beginner: "beginner", intermediate: "intermediate", advanced: "advanced",
    };
    generateCurriculum.mutate({
      goal,
      currentLevel: levelMap[currentKnowledge] ?? "beginner",
      timeAvailable,
      interests: profile.preferredTopics,
    });
  };

  const startAdaptivePath = trpc.curriculum.startGoal.useMutation();
  const [isStartingPath, setIsStartingPath] = useState(false);

  const handleStartAdaptivePath = async () => {
    if (!goal.trim()) { toast.error("Please enter your learning goal first."); return; }
    if (!cookieId) { toast.error("Missing session cookie. Refresh and try again."); return; }
    setIsStartingPath(true);
    try {
      const { pathId } = await startAdaptivePath.mutateAsync({
        cookieId,
        goalText: goal,
        timeCommitment: "moderate",
      });
      addXP(25);
      setLocation(`/path/${pathId}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to start path";
      toast.error(msg);
      setIsStartingPath(false);
    }
  };

  const typeColors: Record<string, string> = {
    lesson: "text-[oklch(0.75_0.18_55)] border-[oklch(0.75_0.18_55_/_0.3)] bg-[oklch(0.75_0.18_55_/_0.08)]",
    practice: "text-[oklch(0.65_0.22_200)] border-[oklch(0.65_0.22_200_/_0.3)] bg-[oklch(0.65_0.22_200_/_0.08)]",
    project: "text-[oklch(0.72_0.2_290)] border-[oklch(0.72_0.2_290_/_0.3)] bg-[oklch(0.72_0.2_290_/_0.08)]",
    assessment: "text-[oklch(0.72_0.18_150)] border-[oklch(0.72_0.18_150_/_0.3)] bg-[oklch(0.72_0.18_150_/_0.08)]",
  };

  const createLessonWithResources = trpc.lesson.createLessonWithResources.useMutation();
  const blueprintLesson = trpc.lesson.blueprintLesson.useMutation();
  const generateLessonSections = trpc.lesson.generateLessonSections.useMutation();

  const handleBuildStructuredLesson = async (module: CurriculumModule, index: number) => {
    if (!curriculum) return;
    if (!cookieId) {
      toast.error("Missing session cookie. Refresh and try again.");
      return;
    }
    setGeneratingModuleIndex(index);
    try {
      const created = await createLessonWithResources.mutateAsync({
        cookieId,
        title: module.title,
        topic: goal || module.title,
        objectives: module.objectives.length > 0 ? module.objectives : [module.description || module.title],
        curriculumId: curriculum.curriculumId || `curriculum-${Date.now()}`,
      });
      const blueprint = await blueprintLesson.mutateAsync({
        lessonId: created.id,
        cookieId,
        topic: module.title,
        depth: 3,
      });
      await generateLessonSections.mutateAsync({
        lessonId: created.id,
        blueprintId: blueprint.blueprintId,
        cookieId,
      });
      toast.success("Structured lesson generated.");
      setLocation(`/lesson/${created.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate lesson.";
      toast.error(message);
    } finally {
      setGeneratingModuleIndex(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Input Section */}
      <div className="glass rounded-2xl p-8 border border-white/8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[oklch(0.75_0.18_55_/_0.15)] border border-[oklch(0.75_0.18_55_/_0.3)] flex items-center justify-center">
            <Target size={18} className="text-[oklch(0.75_0.18_55)]" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">AI Curriculum Generator</h3>
            <p className="text-xs text-muted-foreground">Describe your goal — we'll build a personalized learning path</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              What do you want to learn or achieve?
            </label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g., 'I want to understand machine learning well enough to build my own models' or 'Learn TypeScript to contribute to open source projects'"
              className="w-full h-24 bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[oklch(0.75_0.18_55_/_0.5)] resize-none transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                What do you already know? (optional)
              </label>
              <textarea
                value={currentKnowledge}
                onChange={(e) => setCurrentKnowledge(e.target.value)}
                placeholder="e.g., 'I know basic Python and statistics'"
                className="w-full h-20 bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[oklch(0.75_0.18_55_/_0.5)] resize-none transition-colors"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Time available per week
              </label>
              <div className="grid grid-cols-2 gap-2">
                {["2 hours/week", "5 hours/week", "10 hours/week", "20+ hours/week"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTimeAvailable(t)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                      timeAvailable === t
                        ? "bg-[oklch(0.75_0.18_55_/_0.15)] border-[oklch(0.75_0.18_55_/_0.4)] text-[oklch(0.85_0.18_55)]"
                        : "bg-white/3 border-white/10 text-muted-foreground hover:border-white/20"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Primary: Adaptive path (concept graph + BKT mastery) */}
          <motion.button
            onClick={handleStartAdaptivePath}
            disabled={isStartingPath || !goal.trim()}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[oklch(0.65_0.22_200)] to-[oklch(0.72_0.2_290)] text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {isStartingPath ? (
              <><Loader2 size={16} className="animate-spin" /> Building your adaptive path…</>
            ) : (
              <><Sparkles size={16} /> Build Adaptive Learning Path</>
            )}
          </motion.button>

          {/* Secondary: legacy markdown curriculum generator */}
          <motion.button
            onClick={handleGenerate}
            disabled={isGenerating || !goal.trim()}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-muted-foreground font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors hover:bg-white/10"
          >
            {isGenerating ? (
              <><Loader2 size={14} className="animate-spin" /> Generating…</>
            ) : (
              <>Generate Outline (Legacy)</>
            )}
          </motion.button>
        </div>
      </div>

      {/* Generated Curriculum */}
      <AnimatePresence>
        {curriculum && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Header */}
            <div className="glass rounded-2xl p-6 border border-[oklch(0.75_0.18_55_/_0.2)]">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-1">{curriculum.title}</h3>
                  <p className="text-sm text-muted-foreground">{curriculum.overview}</p>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-[oklch(0.75_0.18_55_/_0.15)] text-[oklch(0.85_0.18_55)] border border-[oklch(0.75_0.18_55_/_0.3)]">
                    {curriculum.level}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock size={11} /> {curriculum.totalDuration}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><BookOpen size={11} /> {curriculum.modules.length} modules</span>
                <span>·</span>
                <span className="flex items-center gap-1"><Zap size={11} /> AI-generated for your goals</span>
              </div>
            </div>

            {/* Modules */}
            <div className="space-y-3">
              {curriculum.modules.map((mod, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass rounded-xl border border-white/8 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedModule(expandedModule === i ? null : i)}
                    className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/3 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 text-sm font-bold text-muted-foreground">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-sm text-foreground truncate">{mod.title}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs border ${typeColors[mod.type] ?? typeColors.lesson}`}>
                          {mod.type}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{mod.description}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock size={10} /> {mod.duration}
                      </span>
                      <ChevronDown
                        size={14}
                        className={`text-muted-foreground transition-transform ${expandedModule === i ? "rotate-180" : ""}`}
                      />
                    </div>
                  </button>
                  <AnimatePresence>
                    {expandedModule === i && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 border-t border-white/5 pt-3">
                          <p className="text-sm text-muted-foreground mb-3">{mod.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {mod.concepts.map((c, ci) => (
                            <span key={ci} className="px-2 py-1 rounded-md text-xs bg-white/5 border border-white/8 text-muted-foreground">
                              {c}
                            </span>
                          ))}
                        </div>
                        <div className="mt-4 flex justify-end">
                          <button
                            onClick={() => handleBuildStructuredLesson(mod, i)}
                            disabled={generatingModuleIndex === i}
                            className="px-3 py-2 rounded-lg text-xs font-semibold bg-[oklch(0.75_0.18_55)] text-black disabled:opacity-60"
                          >
                            {generatingModuleIndex === i ? "Building lesson..." : "Generate Structured Lesson"}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Socratic Tutor ───────────────────────────────────────────────────────────
// FoundationTrackTab removed — replaced by AILiteracyTab above

// ─── Paths Tab Component ────────────────────────────────────────────
function PathsTab({ onSelectPath }: { onSelectPath: (title: string) => void }) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeCourse, setActiveCourse] = useState<"ailiteracy" | "clearthinking" | "promptmastery" | "systemsthinking" | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [pathCatalog, setPathCatalog] = useState<FeaturedPath[]>([]);
  const [isCatalogLoaded, setIsCatalogLoaded] = useState(false);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!showMore || isCatalogLoaded || isCatalogLoading) return;
    let alive = true;
    setIsCatalogLoading(true);
    void import("./learn/featuredPaths")
      .then((mod) => {
        if (!alive) return;
        setPathCatalog(mod.featuredPaths);
        setIsCatalogLoaded(true);
      })
      .finally(() => {
        if (alive) setIsCatalogLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [isCatalogLoaded, isCatalogLoading, showMore]);

  // If a curated course is open, show it inline with a back button
  if (activeCourse === "ailiteracy") {
    return (
      <div>
        <button onClick={() => setActiveCourse(null)}
          className="flex items-center gap-1.5 mb-6 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={14} /> Back to Learning Paths
        </button>
        <AILiteracyTab />
      </div>
    );
  }
  if (activeCourse === "clearthinking") {
    return (
      <div>
        <button onClick={() => setActiveCourse(null)}
          className="flex items-center gap-1.5 mb-6 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={14} /> Back to Learning Paths
        </button>
        <ClearThinkingTab />
      </div>
    );
  }
  if (activeCourse === "promptmastery") {
    return (
      <div>
        <button onClick={() => setActiveCourse(null)}
          className="flex items-center gap-1.5 mb-6 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={14} /> Back to Learning Paths
        </button>
        <Suspense fallback={<LearnTabSkeleton />}>
          <PromptEngineeringMasteryCourse />
        </Suspense>
      </div>
    );
  }
  if (activeCourse === "systemsthinking") {
    return (
      <div>
        <button onClick={() => setActiveCourse(null)}
          className="flex items-center gap-1.5 mb-6 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={14} /> Back to Learning Paths
        </button>
        <Suspense fallback={<LearnTabSkeleton />}>
          <SystemsThinkingDesignCourse />
        </Suspense>
      </div>
    );
  }

  const categories = ["All", ...Array.from(new Set(pathCatalog.map(p => p.category)))];
  const filtered = pathCatalog.filter(p => {
    const matchCat = activeCategory === "All" || p.category === activeCategory;
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-4">
      {/* ── 2 Featured Curated Courses ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* AI Literacy */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="card-nexus p-6 group cursor-pointer relative overflow-hidden"
            onClick={() => setActiveCourse("ailiteracy")}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.75_0.18_55_/_0.06)] to-transparent pointer-events-none" />
            <div className="flex items-start gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-[oklch(0.75_0.18_55_/_0.15)] border border-[oklch(0.75_0.18_55_/_0.3)]">
                <Brain size={20} className="text-[oklch(0.85_0.18_55)]" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold text-[oklch(0.85_0.18_55)]">AI Mastery</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-[oklch(0.75_0.18_55_/_0.15)] text-[oklch(0.85_0.18_55)] border border-[oklch(0.75_0.18_55_/_0.3)] font-semibold">POPULAR</span>
                </div>
                <h4 className="font-bold text-foreground group-hover:text-[oklch(0.85_0.18_55)] transition-colors">AI Literacy for Adults</h4>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">Core AI literacy from fundamentals to practical execution.</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><BookOpen size={10} /> 3 modules</span>
                <span className="flex items-center gap-1"><Zap size={10} /> 1,100 XP</span>
                <span className="flex items-center gap-1"><Clock size={10} /> ~3 hrs</span>
              </div>
              <span className="flex items-center gap-1 text-xs font-medium text-[oklch(0.75_0.18_55)] opacity-0 group-hover:opacity-100 transition-opacity">
                Start <ArrowRight size={11} />
              </span>
            </div>
          </motion.div>

          {/* Clear Thinking */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
            className="card-nexus p-6 group cursor-pointer relative overflow-hidden"
            onClick={() => setActiveCourse("clearthinking")}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.72_0.2_260_/_0.06)] to-transparent pointer-events-none" />
            <div className="flex items-start gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-[oklch(0.72_0.2_260_/_0.15)] border border-[oklch(0.72_0.2_260_/_0.3)]">
                <Scale size={20} className="text-[oklch(0.82_0.2_260)]" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold text-[oklch(0.82_0.2_260)]">Logic & Reasoning</span>
                </div>
                <h4 className="font-bold text-foreground group-hover:text-[oklch(0.82_0.2_260)] transition-colors">Clear Thinking</h4>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">Rigorous reasoning, bias control, and argument quality training.</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><BookOpen size={10} /> 3 modules</span>
                <span className="flex items-center gap-1"><Zap size={10} /> 1,110 XP</span>
                <span className="flex items-center gap-1"><Clock size={10} /> ~3 hrs</span>
              </div>
              <span className="flex items-center gap-1 text-xs font-medium text-[oklch(0.72_0.2_260)] opacity-0 group-hover:opacity-100 transition-opacity">
                Start <ArrowRight size={11} />
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
            className="card-nexus p-6 group cursor-pointer relative overflow-hidden"
            onClick={() => setActiveCourse("promptmastery")}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.65_0.22_200_/_0.06)] to-transparent pointer-events-none" />
            <div className="flex items-start gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-[oklch(0.65_0.22_200_/_0.15)] border border-[oklch(0.65_0.22_200_/_0.3)]">
                <Sparkles size={20} className="text-[oklch(0.75_0.22_200)]" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold text-[oklch(0.75_0.22_200)]">AI Systems</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-[oklch(0.65_0.22_200_/_0.15)] text-[oklch(0.75_0.22_200)] border border-[oklch(0.65_0.22_200_/_0.3)] font-semibold">EXPERT</span>
                </div>
                <h4 className="font-bold text-foreground group-hover:text-[oklch(0.75_0.22_200)] transition-colors">Prompt Engineering Mastery</h4>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">Advanced prompting for reliable, production-grade outputs.</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><BookOpen size={10} /> 4 modules</span>
                <span className="flex items-center gap-1"><Zap size={10} /> advanced labs</span>
                <span className="flex items-center gap-1"><Clock size={10} /> ~6 hrs</span>
              </div>
              <span className="flex items-center gap-1 text-xs font-medium text-[oklch(0.65_0.22_200)] opacity-0 group-hover:opacity-100 transition-opacity">
                Start <ArrowRight size={11} />
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
            className="card-nexus p-6 group cursor-pointer relative overflow-hidden"
            onClick={() => setActiveCourse("systemsthinking")}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.72_0.18_150_/_0.06)] to-transparent pointer-events-none" />
            <div className="flex items-start gap-3 mb-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-[oklch(0.72_0.18_150_/_0.15)] border border-[oklch(0.72_0.18_150_/_0.3)]">
                <GitBranch size={20} className="text-[oklch(0.82_0.18_150)]" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold text-[oklch(0.82_0.18_150)]">Strategy</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-[oklch(0.72_0.18_150_/_0.15)] text-[oklch(0.82_0.18_150)] border border-[oklch(0.72_0.18_150_/_0.3)] font-semibold">EXPERT</span>
                </div>
                <h4 className="font-bold text-foreground group-hover:text-[oklch(0.82_0.18_150)] transition-colors">Systems Thinking &amp; Design</h4>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">Causal maps, dynamics, and leverage-focused strategy design.</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><BookOpen size={10} /> 4 modules</span>
                <span className="flex items-center gap-1"><Zap size={10} /> simulation labs</span>
                <span className="flex items-center gap-1"><Clock size={10} /> ~6 hrs</span>
              </div>
              <span className="flex items-center gap-1 text-xs font-medium text-[oklch(0.72_0.18_150)] opacity-0 group-hover:opacity-100 transition-opacity">
                Start <ArrowRight size={11} />
              </span>
            </div>
          </motion.div>
        </div>

      {/* ── View More toggle ── */}
      <div>
        <button
          onClick={() => setShowMore(v => !v)}
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          {showMore ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showMore ? "Show Less" : "View More Paths"}
        </button>

        <AnimatePresence>
          {showMore && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="pt-4 space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="Search paths..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl glass border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[oklch(0.75_0.18_55_/_0.4)] bg-transparent"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        activeCategory === cat
                          ? "bg-[oklch(0.75_0.18_55_/_0.2)] border border-[oklch(0.75_0.18_55_/_0.4)] text-[oklch(0.85_0.18_55)]"
                          : "glass border border-white/8 text-muted-foreground hover:border-white/15"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                {isCatalogLoading ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">Loading paths...</div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">No paths match your search.</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filtered.map((path, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="card-nexus p-5 group cursor-pointer relative"
                        onClick={() => path.href ? setLocation(path.href) : onSelectPath(path.title)}
                      >
                        {path.popular && (
                          <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-xs font-semibold bg-[oklch(0.75_0.18_55_/_0.15)] border border-[oklch(0.75_0.18_55_/_0.3)] text-[oklch(0.85_0.18_55)]">
                            Popular
                          </span>
                        )}
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-xs font-medium px-2 py-1 rounded-md bg-white/5 border border-white/8 text-muted-foreground">
                            {path.category}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1 mr-16">
                            <Clock size={10} /> {path.duration}
                          </span>
                        </div>
                        <h4 className="font-semibold text-foreground mb-2 group-hover:text-[oklch(0.85_0.18_55)] transition-colors pr-4">
                          {path.title}
                        </h4>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><BookOpen size={10} /> {path.modules} modules</span>
                            <span className="flex items-center gap-1"><Star size={10} /> {path.level}</span>
                          </div>
                          <motion.button
                            whileHover={{ x: 3 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (path.href) { setLocation(path.href); return; }
                              onSelectPath(path.title);
                            }}
                            className="flex items-center gap-1 text-xs font-medium text-[oklch(0.75_0.18_55)] opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            {path.href ? "Open course" : "Generate path"} <ArrowRight size={12} />
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function LearnTabSkeleton() {
  return (
    <div className="glass rounded-2xl p-8 border border-white/8 flex items-center justify-center min-h-60">
      <Loader2 size={18} className="animate-spin text-[var(--nexus-gold)]" />
    </div>
  );
}

export default function Learn() {
  const [prefillGoal, setPrefillGoal] = useState("");

  const handleLearnKeyDownCapture = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (
      target.isContentEditable ||
      target.closest('[contenteditable="true"]') ||
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.tagName === "SELECT"
    ) {
      e.stopPropagation();
    }
  }, []);

  const handleSelectPath = (pathTitle: string) => {
    setPrefillGoal(`I want to learn: ${pathTitle}`);
    // Scroll down to curriculum generator
    setTimeout(() => {
      document.getElementById("curriculum-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  return (
    <PageWrapper pageName="learn">
      <div className="min-h-screen pt-20" onKeyDownCapture={handleLearnKeyDownCapture}>

        {/* Hero */}
        <section className="py-12 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--nexus-gold-fill)] border border-[var(--nexus-gold-border)] text-sm text-[var(--nexus-gold)] mb-6"
            >
              <Sparkles size={14} />
              <span>AI-Powered Adaptive Learning</span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight"
            >
              Learn anything,{" "}
              <span className="text-gradient-gold">your way</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-muted-foreground max-w-2xl mx-auto"
            >
              Curated courses, AI-generated curricula, or Socratic dialogue — pick your path.
            </motion.p>
          </div>
        </section>

        {/* ── TOP: Learning Paths ── */}
        <section className="pb-10 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 mb-5">
              <GraduationCap size={16} className="text-[var(--nexus-gold)]" />
              <h2 className="text-base font-bold text-foreground uppercase tracking-widest">Learning Paths</h2>
              <span className="text-xs text-muted-foreground">— curated courses, start immediately</span>
            </div>
            <PathsTab onSelectPath={handleSelectPath} />
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-4">
          <div className="border-t border-border/40" />
        </div>

        {/* ── MIDDLE: AI Curriculum Generator ── */}
        <section id="curriculum-section" className="py-10 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 mb-5">
              <Target size={16} className="text-[var(--nexus-gold)]" />
              <h2 className="text-base font-bold text-foreground uppercase tracking-widest">AI Curriculum Generator</h2>
              <span className="text-xs text-muted-foreground">— describe your goal, get a full learning plan</span>
            </div>
            <CurriculumGenerator key={prefillGoal} initialGoal={prefillGoal} />
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-4">
          <div className="border-t border-border/40" />
        </div>

        {/* ── BOTTOM: Socratic Mode ── */}
        <section className="py-10 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-2 mb-5">
              <MessageSquare size={16} className="text-[var(--nexus-gold)]" />
              <h2 className="text-base font-bold text-foreground uppercase tracking-widest">Socratic Mode</h2>
              <span className="text-xs text-muted-foreground">— learn through questions, not answers</span>
            </div>
            <Suspense fallback={<LearnTabSkeleton />}>
              <SocraticTutorPanel />
            </Suspense>
          </div>
        </section>

      </div>
    </PageWrapper>
  );
}
