import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, ChevronRight, Loader2, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const QUESTIONS = [
  {
    id: "q1",
    question: "What best describes your relationship with technology?",
    options: [
      { key: "A", label: "I build it — developer or engineer" },
      { key: "B", label: "I design it — UX, product, or creative" },
      { key: "C", label: "I strategize it — business or management" },
      { key: "D", label: "I'm curious about it — lifelong learner" },
    ],
  },
  {
    id: "q2",
    question: "What draws you to Nexus most?",
    options: [
      { key: "A", label: "Personalized learning paths built for me" },
      { key: "B", label: "Researching topics with AI assistance" },
      { key: "C", label: "Coding challenges and technical labs" },
      { key: "D", label: "The knowledge library and codex" },
    ],
  },
  {
    id: "q3",
    question: "What's your primary learning goal right now?",
    options: [
      { key: "A", label: "Master a specific technical skill" },
      { key: "B", label: "Understand a topic deeply and thoroughly" },
      { key: "C", label: "Stay current with AI and tech trends" },
      { key: "D", label: "Explore broadly across many domains" },
    ],
  },
  {
    id: "q4",
    question: "How do you prefer to learn?",
    options: [
      { key: "A", label: "Deep dives — give me all the technical detail" },
      { key: "B", label: "Visual and conceptual — show me the big picture" },
      { key: "C", label: "Socratic — guide me to discover it myself" },
      { key: "D", label: "Hands-on — let me build and experiment" },
    ],
  },
];

export default function Onboarding() {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const { refreshUser } = useAuth();
  const [, setLocation] = useLocation();

  const onboardingMutation = trpc.auth.completeOnboarding.useMutation({
    onSuccess: () => {
      refreshUser();
      setLocation("/app");
    },
    onError: (e) => toast.error(e.message),
  });

  const question = QUESTIONS[current];
  const progress = ((current) / QUESTIONS.length) * 100;

  const handleAnswer = (key: string) => {
    const newAnswers = { ...answers, [question.id]: key };
    setAnswers(newAnswers);

    if (current < QUESTIONS.length - 1) {
      setTimeout(() => setCurrent(current + 1), 200);
    } else {
      onboardingMutation.mutate({ quizAnswers: newAnswers });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-[oklch(0.75_0.18_55_/_0.06)] blur-[100px]" />
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Brain size={22} className="text-[oklch(0.75_0.18_55)]" />
            <span className="font-semibold text-foreground">Nexus</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Personalize your experience</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {QUESTIONS.length} quick questions · Earn 50 XP
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 bg-white/8 rounded-full mb-8">
          <motion.div
            className="h-full bg-[oklch(0.75_0.18_55)] rounded-full"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Question */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <div className="glass rounded-2xl border border-white/8 p-6">
              <div className="flex items-start gap-2 mb-6">
                <span className="text-xs font-medium text-[oklch(0.75_0.18_55)] bg-[oklch(0.75_0.18_55_/_0.1)] px-2 py-0.5 rounded-full mt-0.5">
                  {current + 1} of {QUESTIONS.length}
                </span>
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-5">{question.question}</h2>

              <div className="flex flex-col gap-2">
                {question.options.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => handleAnswer(opt.key)}
                    disabled={onboardingMutation.isPending}
                    className="flex items-center gap-3 p-3.5 rounded-xl border border-white/8 bg-white/3 hover:bg-white/8 hover:border-[oklch(0.75_0.18_55_/_0.4)] transition-all text-left group"
                  >
                    <span className="w-6 h-6 rounded-full border border-white/20 group-hover:border-[oklch(0.75_0.18_55_/_0.6)] flex items-center justify-center text-xs font-semibold text-muted-foreground group-hover:text-[oklch(0.75_0.18_55)] shrink-0 transition-colors">
                      {opt.key}
                    </span>
                    <span className="text-sm text-foreground">{opt.label}</span>
                    <ChevronRight size={14} className="ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Loading state */}
        {onboardingMutation.isPending && (
          <div className="flex items-center justify-center gap-2 mt-6 text-muted-foreground text-sm">
            <Loader2 size={16} className="animate-spin" />
            <span>Building your personalized experience...</span>
            <Sparkles size={14} className="text-[oklch(0.75_0.18_55)]" />
          </div>
        )}
      </div>
    </div>
  );
}
