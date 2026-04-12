import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Sparkles, Target, ChevronRight, Loader2,
  Brain, MessageSquare, CheckCircle2, ArrowRight,
  GraduationCap, Zap, RotateCcw, Send, ChevronDown,
  Clock, Star, Play, Lock
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import PageWrapper from "@/components/PageWrapper";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CurriculumModule {
  title: string;
  description: string;
  duration: string;
  type: "lesson" | "practice" | "project" | "assessment";
  concepts: string[];
}

interface Curriculum {
  title: string;
  overview: string;
  totalDuration: string;
  level: string;
  modules: CurriculumModule[];
}

interface SocraticMessage {
  role: "tutor" | "student";
  content: string;
}

// ─── Curriculum Generator ─────────────────────────────────────────────────────
function CurriculumGenerator({ initialGoal = "" }: { initialGoal?: string }) {
  const [goal, setGoal] = useState(initialGoal);
  const [currentKnowledge, setCurrentKnowledge] = useState("");
  const [timeAvailable, setTimeAvailable] = useState("5 hours/week");
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expandedModule, setExpandedModule] = useState<number | null>(null);
  const { addXP } = usePersonalization();

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
        modules: ((raw.phases ?? []) as Array<{ title: string; objectives: string[]; resources: Array<{ title: string }> }>).map((p, i) => ({
          title: p.title,
          description: (p.objectives ?? []).join(". "),
          duration: `Phase ${i + 1}`,
          type: "lesson" as const,
          concepts: (p.resources ?? []).map((r) => r.title),
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
      interests: [],
    });
  };

  const typeColors: Record<string, string> = {
    lesson: "text-[oklch(0.75_0.18_55)] border-[oklch(0.75_0.18_55_/_0.3)] bg-[oklch(0.75_0.18_55_/_0.08)]",
    practice: "text-[oklch(0.65_0.22_200)] border-[oklch(0.65_0.22_200_/_0.3)] bg-[oklch(0.65_0.22_200_/_0.08)]",
    project: "text-[oklch(0.72_0.2_290)] border-[oklch(0.72_0.2_290_/_0.3)] bg-[oklch(0.72_0.2_290_/_0.08)]",
    assessment: "text-[oklch(0.72_0.18_150)] border-[oklch(0.72_0.18_150_/_0.3)] bg-[oklch(0.72_0.18_150_/_0.08)]",
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

          <motion.button
            onClick={handleGenerate}
            disabled={isGenerating || !goal.trim()}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[oklch(0.75_0.18_55)] to-[oklch(0.65_0.22_200)] text-black font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            {isGenerating ? (
              <><Loader2 size={16} className="animate-spin" /> Building your curriculum...</>
            ) : (
              <><Sparkles size={16} /> Generate My Learning Path</>
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
function SocraticTutor() {
  const [topic, setTopic] = useState("");
  const [messages, setMessages] = useState<SocraticMessage[]>([]);
  const [input, setInput] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { addXP } = usePersonalization();

  const startSession = trpc.ai.startSocraticSession.useMutation({
    onSuccess: (data) => {
      setMessages([{ role: "tutor", content: data.question }]);
      setIsActive(true);
      setIsLoading(false);
      addXP(10);
    },
    onError: (err: { message: string }) => { toast.error(err.message); setIsLoading(false); },
  });

  const continueSession = trpc.ai.continueSocraticSession.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "tutor", content: data.response }]);
      setIsLoading(false);
    },
    onError: (err: { message: string }) => { toast.error(err.message); setIsLoading(false); },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleStart = () => {
    if (!topic.trim()) { toast.error("Enter a topic first."); return; }
    setIsLoading(true);
    startSession.mutate({ topic, userLevel: "intermediate" });
  };

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "student", content: userMsg }]);
    setIsLoading(true);
    continueSession.mutate({
      topic,
      history: [...messages, { role: "student", content: userMsg }],
      userResponse: userMsg,
    });
  };

  const handleReset = () => {
    setMessages([]);
    setIsActive(false);
    setTopic("");
  };

  return (
    <div className="space-y-6">
      {!isActive ? (
        <div className="glass rounded-2xl p-8 border border-white/8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[oklch(0.65_0.22_200_/_0.15)] border border-[oklch(0.65_0.22_200_/_0.3)] flex items-center justify-center">
              <MessageSquare size={18} className="text-[oklch(0.65_0.22_200)]" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Socratic Mode</h3>
              <p className="text-xs text-muted-foreground">The AI won't give you answers — it will ask questions until you discover them yourself</p>
            </div>
          </div>

          <div className="glass rounded-xl p-4 border border-[oklch(0.65_0.22_200_/_0.15)] mb-6">
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="text-[oklch(0.65_0.22_200)] font-medium">How it works:</span> You pick a topic. The AI tutor asks you probing questions — never lecturing, never giving answers. You reason through it. When you get stuck, it reframes the question. This is how Socrates taught, and research shows it produces 2× better retention than passive learning.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                What concept do you want to explore?
              </label>
              <input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleStart()}
                placeholder="e.g., 'recursion', 'supply and demand', 'quantum entanglement', 'the French Revolution'"
                className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[oklch(0.65_0.22_200_/_0.5)] transition-colors"
              />
            </div>
            <motion.button
              onClick={handleStart}
              disabled={isLoading || !topic.trim()}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[oklch(0.65_0.22_200)] to-[oklch(0.72_0.2_290)] text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? <><Loader2 size={16} className="animate-spin" /> Starting session...</> : <><Brain size={16} /> Begin Socratic Session</>}
            </motion.button>
          </div>
        </div>
      ) : (
        <div className="glass rounded-2xl border border-white/8 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[oklch(0.65_0.22_200)] animate-pulse" />
              <span className="text-sm font-medium text-foreground">Socratic Session: <span className="text-[oklch(0.65_0.22_200)]">{topic}</span></span>
            </div>
            <button onClick={handleReset} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <RotateCcw size={12} /> New topic
            </button>
          </div>

          {/* Messages */}
          <div className="h-80 overflow-y-auto p-6 space-y-4">
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === "student" ? "flex-row-reverse" : ""}`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  msg.role === "tutor"
                    ? "bg-[oklch(0.65_0.22_200_/_0.2)] text-[oklch(0.65_0.22_200)]"
                    : "bg-[oklch(0.75_0.18_55_/_0.2)] text-[oklch(0.75_0.18_55)]"
                }`}>
                  {msg.role === "tutor" ? "S" : "Y"}
                </div>
                <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "tutor"
                    ? "bg-white/5 border border-white/8 text-foreground"
                    : "bg-[oklch(0.75_0.18_55_/_0.12)] border border-[oklch(0.75_0.18_55_/_0.2)] text-foreground"
                }`}>
                  <Streamdown>{msg.content}</Streamdown>
                </div>
              </motion.div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-[oklch(0.65_0.22_200_/_0.2)] flex items-center justify-center text-xs font-bold text-[oklch(0.65_0.22_200)]">S</div>
                <div className="bg-white/5 border border-white/8 rounded-xl px-4 py-3">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                        animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-6 py-4 border-t border-white/5 flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Think it through and respond..."
              className="flex-1 bg-white/3 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[oklch(0.65_0.22_200_/_0.5)] transition-colors"
            />
            <motion.button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 rounded-xl bg-[oklch(0.65_0.22_200)] flex items-center justify-center disabled:opacity-50 shrink-0"
            >
              <Send size={15} className="text-white" />
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Paths Tab Component ────────────────────────────────────────────
function PathsTab({ onSelectPath }: { onSelectPath: (title: string) => void }) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const categories = ["All", ...Array.from(new Set(featuredPaths.map(p => p.category)))];
  const filtered = featuredPaths.filter(p => {
    const matchCat = activeCategory === "All" || p.category === activeCategory;
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });
  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          type="text"
          placeholder="Search learning paths..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl glass border border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[oklch(0.75_0.18_55_/_0.4)] bg-transparent"
        />
      </div>
      <div className="flex gap-2 flex-wrap mb-5">
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
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No paths match your search.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((path, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="glass rounded-xl p-5 border border-white/8 hover:border-white/15 transition-all group cursor-pointer relative"
              onClick={() => onSelectPath(path.title)}
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
                  onClick={(e) => { e.stopPropagation(); onSelectPath(path.title); }}
                  className="flex items-center gap-1 text-xs font-medium text-[oklch(0.75_0.18_55)] opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Generate path <ArrowRight size={12} />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Featured Learning Paths ────────────────────────────────────────────
const featuredPaths = [
  { title: "AI & Machine Learning Fundamentals", level: "Beginner", duration: "8 weeks", modules: 12, category: "Technology", color: "oklch(0.75_0.18_55)", popular: true },
  { title: "Full-Stack Web Development", level: "Intermediate", duration: "12 weeks", modules: 16, category: "Engineering", color: "oklch(0.65_0.22_200)", popular: true },
  { title: "Data Science & Analytics", level: "Beginner", duration: "10 weeks", modules: 14, category: "Data", color: "oklch(0.72_0.2_290)", popular: false },
  { title: "Systems Thinking & Design", level: "Advanced", duration: "6 weeks", modules: 8, category: "Strategy", color: "oklch(0.72_0.18_150)", popular: false },
  { title: "Cognitive Science & Learning", level: "Intermediate", duration: "8 weeks", modules: 10, category: "Science", color: "oklch(0.75_0.18_55)", popular: false },
  { title: "Entrepreneurship & Product", level: "Beginner", duration: "6 weeks", modules: 9, category: "Business", color: "oklch(0.65_0.22_200)", popular: false },
  { title: "Philosophy & Critical Thinking", level: "Beginner", duration: "6 weeks", modules: 8, category: "Humanities", color: "oklch(0.78_0.16_30)", popular: false },
  { title: "Behavioral Economics", level: "Intermediate", duration: "7 weeks", modules: 10, category: "Economics", color: "oklch(0.72_0.18_150)", popular: false },
  { title: "Neuroscience & the Brain", level: "Beginner", duration: "8 weeks", modules: 11, category: "Science", color: "oklch(0.72_0.2_290)", popular: false },
  { title: "Quantum Physics Explained", level: "Intermediate", duration: "10 weeks", modules: 13, category: "Physics", color: "oklch(0.65_0.22_200)", popular: false },
  { title: "Creative Writing & Storytelling", level: "Beginner", duration: "5 weeks", modules: 7, category: "Arts", color: "oklch(0.75_0.18_55)", popular: false },
  { title: "Public Speaking & Rhetoric", level: "Beginner", duration: "4 weeks", modules: 6, category: "Communication", color: "oklch(0.78_0.16_30)", popular: false },
  { title: "History of Science & Ideas", level: "Beginner", duration: "9 weeks", modules: 12, category: "History", color: "oklch(0.72_0.18_150)", popular: false },
  { title: "Prompt Engineering Mastery", level: "Intermediate", duration: "4 weeks", modules: 6, category: "AI", color: "oklch(0.75_0.18_55)", popular: true },
  { title: "Ethics of Artificial Intelligence", level: "Beginner", duration: "5 weeks", modules: 7, category: "AI", color: "oklch(0.72_0.2_290)", popular: false },
  { title: "Statistics & Probability", level: "Beginner", duration: "8 weeks", modules: 11, category: "Mathematics", color: "oklch(0.65_0.22_200)", popular: false },
];

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Learn() {
  const [activeTab, setActiveTab] = useState<"curriculum" | "socratic" | "paths">("curriculum");
  const [prefillGoal, setPrefillGoal] = useState("");
  const handleSelectPath = (pathTitle: string) => {
    setPrefillGoal(`I want to learn: ${pathTitle}`);
    setActiveTab("curriculum");
  };
  const tabs = [
    { id: "curriculum" as const, label: "AI Curriculum", icon: Target, desc: "Build your personalized path" },
    { id: "socratic" as const, label: "Socratic Mode", icon: MessageSquare, desc: "Learn by questioning" },
    { id: "paths" as const, label: "Learning Paths", icon: GraduationCap, desc: "Curated starting points" },
  ];

  return (
    <PageWrapper pageName="learn">
      <div className="min-h-screen pt-20">
        {/* Hero */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-[oklch(0.75_0.18_55_/_0.3)] text-sm text-[oklch(0.75_0.18_55)] mb-6"
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
              Tell us your goal. We build a personalized curriculum. Or engage in Socratic dialogue — where the AI never gives you the answer, only better questions.
            </motion.p>
          </div>
        </section>

        {/* Stats bar */}
        <section className="pb-8 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Curricula Generated", value: "2,400+", icon: Target },
                { label: "Socratic Sessions", value: "8,100+", icon: MessageSquare },
                { label: "Concepts Mastered", value: "41,000+", icon: CheckCircle2 },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="glass rounded-xl p-4 border border-white/8 text-center">
                  <Icon size={16} className="text-[oklch(0.75_0.18_55)] mx-auto mb-2" />
                  <div className="text-xl font-bold text-foreground">{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tabs */}
        <section className="pb-4 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2 p-1 glass rounded-xl border border-white/8 mb-8">
              {tabs.map(({ id, label, icon: Icon, desc }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex-1 flex flex-col items-center gap-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                    activeTab === id
                      ? "bg-[oklch(0.75_0.18_55_/_0.12)] border border-[oklch(0.75_0.18_55_/_0.25)] text-[oklch(0.85_0.18_55)]"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/3"
                  }`}
                >
                  <Icon size={16} />
                  <span className="hidden sm:block">{label}</span>
                  <span className="hidden md:block text-xs opacity-60">{desc}</span>
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === "curriculum" && <CurriculumGenerator key={prefillGoal} initialGoal={prefillGoal} />}
                {activeTab === "socratic" && <SocraticTutor />}
                {activeTab === "paths" && <PathsTab onSelectPath={handleSelectPath} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}
