import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Sparkles, Send, Loader2, BookOpen, Zap, Target,
  ChevronRight, RotateCcw, CheckCircle2, XCircle, MessageSquare,
  Layers, TrendingUp, Clock, Star, ArrowRight, Plus, Lightbulb
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import PageWrapper from "@/components/PageWrapper";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  topic: string;
}

// ─── Study Modes ──────────────────────────────────────────────────────────────
const STUDY_MODES = [
  {
    id: "tutor",
    title: "AI Tutor",
    description: "Have a conversation with your personal AI tutor on any topic",
    icon: MessageSquare,
    color: "oklch(0.65 0.22 200)",
    bg: "oklch(0.65 0.22 200 / 0.1)",
    border: "oklch(0.65 0.22 200 / 0.25)",
  },
  {
    id: "quiz",
    title: "Adaptive Quiz",
    description: "AI-generated questions that adapt to your knowledge level",
    icon: Target,
    color: "oklch(0.75 0.18 55)",
    bg: "oklch(0.75 0.18 55 / 0.1)",
    border: "oklch(0.75 0.18 55 / 0.25)",
  },
  {
    id: "flashcards",
    title: "Smart Flashcards",
    description: "Generate and review spaced repetition flashcards on any topic",
    icon: Layers,
    color: "oklch(0.72 0.2 290)",
    bg: "oklch(0.72 0.2 290 / 0.1)",
    border: "oklch(0.72 0.2 290 / 0.25)",
  },
  {
    id: "explain",
    title: "Concept Explainer",
    description: "Get multi-level explanations from beginner to expert",
    icon: Lightbulb,
    color: "oklch(0.72 0.18 150)",
    bg: "oklch(0.72 0.18 150 / 0.1)",
    border: "oklch(0.72 0.18 150 / 0.25)",
  },
];

const SUGGESTED_TOPICS = [
  "Transformer architecture in LLMs",
  "Gradient descent optimization",
  "Attention mechanisms",
  "Reinforcement learning basics",
  "Neural network backpropagation",
  "Prompt engineering techniques",
  "RAG (Retrieval-Augmented Generation)",
  "Fine-tuning vs. in-context learning",
  "Quantum computing fundamentals",
  "CRISPR gene editing",
];

// ─── AI Tutor Mode ────────────────────────────────────────────────────────────
function TutorMode({ cookieId }: { cookieId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi! I'm your AI Study Buddy. I can explain any concept, answer questions, help you understand difficult topics, or guide you through learning something new. What would you like to explore today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [topic, setTopic] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { addXP } = usePersonalization();

  const chat = trpc.ai.chat.useMutation({
    onSuccess: (data) => {
      setMessages(prev => [...prev, { role: "assistant", content: data.response, timestamp: new Date() }]);
      setIsLoading(false);
      addXP(5);
    },
    onError: (err: { message: string }) => {
      toast.error(err.message);
      setIsLoading(false);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || isLoading) return;
    const userMsg: ChatMessage = { role: "user", content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    const systemPrompt = topic
      ? `You are an expert AI tutor specializing in "${topic}". Explain concepts clearly, use analogies, and adapt to the student's level. Be encouraging and thorough.`
      : "You are an expert AI tutor. Explain concepts clearly, use analogies, and adapt to the student's level. Be encouraging and thorough. Cover any topic the student asks about.";
    // Prepend system context to message since ai.chat uses NEXUS_SYSTEM_PROMPT internally
    const contextualMessage = topic ? `[Study topic: ${topic}]\n\n${input}` : input;
    chat.mutate({
      cookieId,
      message: contextualMessage,
    });
    setInput("");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Topic Selector */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-muted-foreground font-medium">Study topic (optional)</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Machine Learning, Quantum Physics..."
            className="flex-1 min-w-48 bg-[var(--surface-2)] border border-border/60 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[var(--nexus-blue)] transition-colors"
          />
          {SUGGESTED_TOPICS.slice(0, 4).map(t => (
            <button
              key={t}
              onClick={() => setTopic(t)}
              className="px-3 py-1.5 rounded-lg text-xs bg-[var(--surface-1)] border border-border/60 text-muted-foreground hover:text-foreground hover:border-border/60 transition-all whitespace-nowrap"
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 min-h-0 max-h-[420px] pr-1">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === "assistant"
                ? "bg-[oklch(0.65_0.22_200_/_0.15)] border border-[oklch(0.65_0.22_200_/_0.3)]"
                : "bg-[var(--surface-2)] border border-border/60"
            }`}>
              {msg.role === "assistant" ? <Brain size={13} className="text-[oklch(0.65_0.22_200)]" /> : <span className="text-xs">You</span>}
            </div>
            <div className={`flex-1 rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[85%] ${
              msg.role === "user"
                ? "bg-[var(--surface-2)] border border-border/60 text-foreground"
                : "bg-[oklch(0.65_0.22_200_/_0.05)] border border-[oklch(0.65_0.22_200_/_0.15)] text-foreground"
            }`}>
              {msg.role === "assistant" ? <Streamdown>{msg.content}</Streamdown> : msg.content}
            </div>
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-[oklch(0.65_0.22_200_/_0.15)] border border-[oklch(0.65_0.22_200_/_0.3)] flex items-center justify-center shrink-0">
              <Brain size={13} className="text-[oklch(0.65_0.22_200)]" />
            </div>
            <div className="bg-[oklch(0.65_0.22_200_/_0.05)] border border-[oklch(0.65_0.22_200_/_0.15)] rounded-2xl px-4 py-3">
              <Loader2 size={14} className="animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="Ask anything... (Enter to send)"
          className="flex-1 bg-[var(--surface-2)] border border-border/60 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[var(--nexus-blue)] transition-colors"
        />
        <button
          onClick={sendMessage}
          disabled={isLoading || !input.trim()}
          className="w-11 h-11 rounded-xl bg-[oklch(0.65_0.22_200)] text-white flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}

// ─── Adaptive Quiz Mode ───────────────────────────────────────────────────────
function QuizMode({ cookieId }: { cookieId: string }) {
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<"beginner" | "intermediate" | "advanced">("intermediate");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const { addXP } = usePersonalization();

  const generateQuiz = trpc.testing.generateAdaptiveQuestions.useMutation({
    onSuccess: (data) => {
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions as QuizQuestion[]);
        setCurrentIdx(0);
        setScore(0);
        setSelectedAnswer(null);
        setShowExplanation(false);
        setIsComplete(false);
      }
      setIsGenerating(false);
    },
    onError: (err: { message: string }) => {
      toast.error(err.message);
      setIsGenerating(false);
    },
  });

  const handleGenerate = () => {
    if (!topic.trim()) { toast.error("Please enter a topic"); return; }
    setIsGenerating(true);
    generateQuiz.mutate({ cookieId, subject: topic, difficulty, count: 5 });
  };

  const handleAnswer = (idx: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(idx);
    setShowExplanation(true);
    if (idx === questions[currentIdx].correctIndex) {
      setScore(s => s + 1);
      addXP(10);
    }
  };

  const handleNext = () => {
    if (currentIdx + 1 >= questions.length) {
      setIsComplete(true);
    } else {
      setCurrentIdx(i => i + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    }
  };

  const handleRestart = () => {
    setQuestions([]);
    setIsComplete(false);
    setScore(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
  };

  if (questions.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">Topic to quiz on</label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
            placeholder="e.g., Neural Networks, Quantum Mechanics, World War II..."
            className="w-full bg-[var(--surface-2)] border border-border/60 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[var(--nexus-gold)] transition-colors"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">Difficulty</label>
          <div className="flex gap-2">
           {(["beginner", "intermediate", "advanced"] as const).map(d => (
              <button
                key={d}
          onClick={() => setDifficulty(d)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all capitalize ${
                  difficulty === d
                    ? d === "beginner" ? "bg-[oklch(0.70_0.20_150_/_0.15)] border-[oklch(0.70_0.20_150_/_0.4)] text-[oklch(0.70_0.20_150)]"
                    : d === "intermediate" ? "bg-[oklch(0.75_0.18_55_/_0.15)] border-[oklch(0.75_0.18_55_/_0.4)] text-[oklch(0.75_0.18_55)]"
                    : "bg-[oklch(0.65_0.22_20_/_0.15)] border-[oklch(0.65_0.22_20_/_0.4)] text-[oklch(0.65_0.22_20)]"
                    : "bg-[var(--surface-2)] border-border/30 text-muted-foreground hover:border-border/60"
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">Quick topics</label>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_TOPICS.map(t => (
              <button
                key={t}
                onClick={() => setTopic(t)}
                className="px-3 py-1.5 rounded-lg text-xs bg-[var(--surface-1)] border border-border/60 text-muted-foreground hover:text-foreground hover:border-border/60 transition-all"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !topic.trim()}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-[oklch(0.75_0.18_55)] to-[oklch(0.65_0.22_200)] text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
        >
          {isGenerating ? <><Loader2 size={16} className="animate-spin" /> Generating quiz...</> : <><Sparkles size={16} /> Generate 5-Question Quiz</>}
        </button>
      </div>
    );
  }

  if (isComplete) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
        <div className={`w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center ${
          pct >= 80 ? "bg-[oklch(0.70_0.20_150_/_0.15)] border border-[oklch(0.70_0.20_150_/_0.3)]" : "bg-[oklch(0.75_0.18_55_/_0.15)] border border-[oklch(0.75_0.18_55_/_0.3)]"
        }`}>
          {pct >= 80 ? <CheckCircle2 size={32} className="text-[oklch(0.70_0.20_150)]" /> : <Target size={32} className="text-[oklch(0.75_0.18_55)]" />}
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-1">{score}/{questions.length} Correct</h3>
        <p className="text-muted-foreground mb-2">{pct}% — {pct >= 80 ? "Excellent!" : pct >= 60 ? "Good effort!" : "Keep practicing!"}</p>
        <p className="text-xs text-muted-foreground mb-6">+{score * 10} XP earned</p>
        <div className="flex gap-3 justify-center">
          <button onClick={handleRestart} className="btn-ghost flex items-center gap-2">
            <RotateCcw size={14} /> Try Another
          </button>
          <button onClick={() => { setDifficulty(pct >= 80 ? "advanced" : pct >= 60 ? "intermediate" : "beginner"); handleRestart(); }} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[oklch(0.75_0.18_55)] to-[oklch(0.65_0.22_200)] text-white text-sm font-medium">
            <TrendingUp size={14} /> Adaptive Retry
          </button>
        </div>
      </motion.div>
    );
  }

  const q = questions[currentIdx];
  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">Question {currentIdx + 1} of {questions.length}</span>
        <span className="text-xs text-muted-foreground">Score: {score}/{currentIdx}</span>
      </div>
      <div className="h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[oklch(0.75_0.18_55)] to-[oklch(0.65_0.22_200)] rounded-full transition-all" style={{ width: `${((currentIdx) / questions.length) * 100}%` }} />
      </div>

      {/* Question */}
      <div className="card-nexus p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${
            q.difficulty === "easy" ? "text-[oklch(0.70_0.20_150)] bg-[oklch(0.70_0.20_150_/_0.1)] border-[oklch(0.70_0.20_150_/_0.25)]"
            : q.difficulty === "medium" ? "text-[oklch(0.75_0.18_55)] bg-[oklch(0.75_0.18_55_/_0.1)] border-[oklch(0.75_0.18_55_/_0.25)]"
            : "text-[oklch(0.65_0.22_20)] bg-[oklch(0.65_0.22_20_/_0.1)] border-[oklch(0.65_0.22_20_/_0.25)]"
          }`}>{q.difficulty}</span>
          {q.topic && <span className="text-xs text-muted-foreground">{q.topic}</span>}
        </div>
        <p className="text-sm font-medium text-foreground leading-relaxed">{q.question}</p>
      </div>

      {/* Options */}
      <div className="space-y-2">
        {q.options.map((opt, i) => {
          const isSelected = selectedAnswer === i;
          const isCorrect = i === q.correctIndex;
          const showResult = selectedAnswer !== null;
          return (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={selectedAnswer !== null}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                showResult
                  ? isCorrect ? "bg-[oklch(0.70_0.20_150_/_0.15)] border-[oklch(0.70_0.20_150_/_0.4)] text-foreground"
                  : isSelected ? "bg-[oklch(0.65_0.22_20_/_0.15)] border-[oklch(0.65_0.22_20_/_0.4)] text-foreground"
                  : "bg-[var(--surface-2)] border-border/30 text-muted-foreground"
                  : "bg-[var(--surface-2)] border-border/30 text-foreground hover:bg-white/6 hover:border-border/60"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full border flex items-center justify-center text-xs shrink-0 font-medium" style={{ borderColor: "inherit" }}>
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{opt}</span>
                {showResult && isCorrect && <CheckCircle2 size={14} className="text-[oklch(0.70_0.20_150)] shrink-0" />}
                {showResult && isSelected && !isCorrect && <XCircle size={14} className="text-[oklch(0.65_0.22_20)] shrink-0" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Explanation */}
      <AnimatePresence>
        {showExplanation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="card-nexus border-[var(--nexus-blue-border)] p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={12} className="text-[oklch(0.65_0.22_200)]" />
              <span className="text-xs font-medium text-[oklch(0.65_0.22_200)]">Explanation</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{q.explanation}</p>
            <button
              onClick={handleNext}
              className="mt-3 flex items-center gap-1.5 text-xs text-[oklch(0.75_0.18_55)] hover:text-foreground transition-colors font-medium"
            >
              {currentIdx + 1 >= questions.length ? "See Results" : "Next Question"} <ChevronRight size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Flashcard Generator Mode ─────────────────────────────────────────────────
function FlashcardGeneratorMode({ cookieId }: { cookieId: string }) {
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(10);
  const [generatedDeckId, setGeneratedDeckId] = useState<number | null>(null);
  const { addXP } = usePersonalization();

  const generateDeck = trpc.flashcards.generateDeck.useMutation({
    onSuccess: (data) => {
      setGeneratedDeckId(data.deckId);
      toast.success(`Generated ${data.cardCount} flashcards! +15 XP`);
      addXP(15);
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  return (
    <div className="space-y-5">
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Topic for flashcards</label>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g., Python decorators, Calculus derivatives, French Revolution..."
          className="w-full bg-[var(--surface-2)] border border-border/60 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[var(--nexus-purple)] transition-colors"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Number of cards: {count}</label>
        <input
          type="range" min={5} max={30} step={5} value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          className="w-full accent-[oklch(0.72_0.2_290)]"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>5 cards</span><span>30 cards</span>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Quick topics</label>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_TOPICS.slice(0, 6).map(t => (
            <button key={t} onClick={() => setTopic(t)} className="px-3 py-1.5 rounded-lg text-xs bg-[var(--surface-1)] border border-border/60 text-muted-foreground hover:text-foreground hover:border-border/60 transition-all">
              {t}
            </button>
          ))}
        </div>
      </div>
      {!generatedDeckId ? (
        <button
          onClick={() => { if (topic.trim()) generateDeck.mutate({ cookieId, topic, count }); else toast.error("Enter a topic"); }}
          disabled={generateDeck.isPending || !topic.trim()}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-[oklch(0.72_0.2_290)] to-[oklch(0.65_0.22_200)] text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {generateDeck.isPending ? <><Loader2 size={16} className="animate-spin" /> Generating...</> : <><Plus size={16} /> Generate {count} Flashcards</>}
        </button>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-nexus border-[var(--nexus-purple-border)] p-5 text-center">
          <CheckCircle2 size={32} className="text-[oklch(0.72_0.2_290)] mx-auto mb-3" />
          <p className="font-medium text-foreground mb-1">Flashcard deck created!</p>
          <p className="text-xs text-muted-foreground mb-4">Your {count} cards are ready for spaced repetition review.</p>
          <div className="flex gap-3 justify-center">
            <a href="/flashcards" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[oklch(0.72_0.2_290_/_0.15)] border border-[oklch(0.72_0.2_290_/_0.3)] text-[oklch(0.72_0.2_290)] text-sm font-medium hover:bg-[oklch(0.72_0.2_290_/_0.25)] transition-all">
              <Layers size={13} /> Review Deck <ArrowRight size={12} />
            </a>
            <button onClick={() => { setGeneratedDeckId(null); setTopic(""); }} className="px-4 py-2 rounded-xl bg-[var(--surface-1)] border border-border/60 text-sm text-muted-foreground hover:text-foreground transition-all">
              Generate Another
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Concept Explainer Mode ───────────────────────────────────────────────────
function ConceptExplainerMode({ cookieId }: { cookieId: string }) {
  const [concept, setConcept] = useState("");
  const [level, setLevel] = useState<"child" | "student" | "expert" | "socratic" | "analogy">("student");
  const [explanation, setExplanation] = useState<string | null>(null);
  const { addXP } = usePersonalization();

  const explain = trpc.ai.explainConcept.useMutation({
    onSuccess: (data) => {
      setExplanation(data.explanation);
      addXP(10);
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const LEVELS = [
    { id: "child", label: "Child", desc: "Simple analogies" },
    { id: "student", label: "Student", desc: "Clear & thorough" },
    { id: "socratic", label: "Socratic", desc: "Question-led" },
    { id: "expert", label: "Expert", desc: "Full complexity" },
  ] as const;

  return (
    <div className="space-y-5">
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Concept to explain</label>
        <input
          value={concept}
          onChange={(e) => setConcept(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && concept.trim() && explain.mutate({ concept, level })}
          placeholder="e.g., Attention mechanism, Black holes, Recursion..."
          className="w-full bg-[var(--surface-2)] border border-border/60 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[var(--nexus-green)] transition-colors"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-2 block">Explanation level</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {LEVELS.map(l => (
            <button
              key={l.id}
              onClick={() => setLevel(l.id)}
              className={`py-2.5 px-3 rounded-xl border text-left transition-all ${
                level === l.id
                  ? "bg-[oklch(0.72_0.18_150_/_0.15)] border-[oklch(0.72_0.18_150_/_0.4)] text-foreground"
                  : "bg-[var(--surface-2)] border-border/30 text-muted-foreground hover:border-border/60"
              }`}
            >
              <div className="text-xs font-medium">{l.label}</div>
              <div className="text-xs text-muted-foreground">{l.desc}</div>
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={() => { if (concept.trim()) explain.mutate({ concept, level }); else toast.error("Enter a concept"); }}
        disabled={explain.isPending || !concept.trim()}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-[oklch(0.72_0.18_150)] to-[oklch(0.65_0.22_200)] text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {explain.isPending ? <><Loader2 size={16} className="animate-spin" /> Explaining...</> : <><Lightbulb size={16} /> Explain This</>}
      </button>
      <AnimatePresence>
        {explanation && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card-nexus border-[var(--nexus-green-border)] p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Lightbulb size={13} className="text-[oklch(0.72_0.18_150)]" />
                <span className="text-xs font-medium text-[oklch(0.72_0.18_150)]">Explanation ({level} level)</span>
              </div>
              <button onClick={() => { setExplanation(null); setConcept(""); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Clear</button>
            </div>
            <div className="text-sm text-muted-foreground leading-relaxed">
              <Streamdown>{explanation}</Streamdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StudyBuddy() {
  const [activeMode, setActiveMode] = useState<string | null>(null);
  const { cookieId } = usePersonalization();

  return (
    <PageWrapper pageName="study-buddy">
      <div className="min-h-screen pt-20">
        {/* Hero */}
        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--nexus-blue-fill)] border border-[var(--nexus-blue-border)] text-sm text-[var(--nexus-blue)] mb-6"
              >
                <Brain size={14} />
                <span>AI Study Buddy</span>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl md:text-5xl font-bold text-foreground mb-4"
              >
                Your personal{" "}
                <span className="text-gradient-cyan">AI tutor</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg text-muted-foreground max-w-2xl mx-auto"
              >
                Learn anything with adaptive quizzes, AI-powered explanations, smart flashcards, and a conversational tutor that adapts to your level.
              </motion.p>
            </div>

            {/* Mode Selector */}
            {!activeMode ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4"
              >
                {STUDY_MODES.map((mode, i) => {
                  const Icon = mode.icon;
                  return (
                    <motion.button
                      key={mode.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.08 }}
                      onClick={() => setActiveMode(mode.id)}
                      className="glass rounded-2xl border p-6 text-left hover:border-border/60 transition-all group"
                      style={{ borderColor: mode.border }}
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                        style={{ background: mode.bg, border: `1px solid ${mode.border}` }}
                      >
                        <Icon size={22} style={{ color: mode.color }} />
                      </div>
                      <h3 className="font-semibold text-foreground mb-1 group-hover:text-white transition-colors">{mode.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{mode.description}</p>
                      <div className="flex items-center gap-1.5 mt-4 text-xs font-medium" style={{ color: mode.color }}>
                        Start <ChevronRight size={12} />
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="card-nexus p-6"
              >
                {/* Mode Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const mode = STUDY_MODES.find(m => m.id === activeMode)!;
                      const Icon = mode.icon;
                      return (
                        <>
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: mode.bg, border: `1px solid ${mode.border}` }}>
                            <Icon size={17} style={{ color: mode.color }} />
                          </div>
                          <div>
                            <h2 className="font-semibold text-foreground text-sm">{mode.title}</h2>
                            <p className="text-xs text-muted-foreground">{mode.description}</p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                  <button
                    onClick={() => setActiveMode(null)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg bg-[var(--surface-1)] border border-border/60 hover:border-border/60"
                  >
                    ← Back
                  </button>
                </div>

                {/* Mode Content */}
                {activeMode === "tutor" && <TutorMode cookieId={cookieId} />}
                {activeMode === "quiz" && <QuizMode cookieId={cookieId} />}
                {activeMode === "flashcards" && <FlashcardGeneratorMode cookieId={cookieId} />}
                {activeMode === "explain" && <ConceptExplainerMode cookieId={cookieId} />}
              </motion.div>
            )}

            {/* Stats Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-8 grid grid-cols-3 gap-4"
            >
              {[
                { icon: Zap, label: "XP per quiz answer", value: "+10 XP", color: "oklch(0.75 0.18 55)" },
                { icon: Star, label: "XP per tutor chat", value: "+5 XP", color: "oklch(0.65 0.22 200)" },
                { icon: Clock, label: "Spaced repetition", value: "SM-2 algo", color: "oklch(0.72 0.2 290)" },
              ].map(stat => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="card-nexus p-4 text-center">
                    <Icon size={18} className="mx-auto mb-2" style={{ color: stat.color }} />
                    <div className="text-sm font-semibold text-foreground">{stat.value}</div>
                    <div className="text-xs text-muted-foreground">{stat.label}</div>
                  </div>
                );
              })}
            </motion.div>
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}
