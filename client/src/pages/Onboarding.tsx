import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, ChevronRight, Loader2, Sparkles, Plus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const CORE_QUESTIONS = [
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
  {
    id: "q5",
    question: "How much time per week do you realistically dedicate to learning?",
    options: [
      { key: "A", label: "Less than 1 hour — I squeeze it in when I can" },
      { key: "B", label: "1–3 hours — a few focused sessions" },
      { key: "C", label: "3–7 hours — it's a regular habit" },
      { key: "D", label: "7+ hours — learning is a major priority for me" },
    ],
  },
  {
    id: "q6",
    question: "When you hit a concept that's genuinely hard, you typically…",
    options: [
      { key: "A", label: "Push through — struggle is how I learn best" },
      { key: "B", label: "Step away and return with fresh eyes" },
      { key: "C", label: "Seek out another explanation or resource" },
      { key: "D", label: "Move on and loop back if it keeps coming up" },
    ],
  },
  {
    id: "q7",
    question: "What content format works best for you?",
    options: [
      { key: "A", label: "Long-form articles and written explanations" },
      { key: "B", label: "Videos and visual walkthroughs" },
      { key: "C", label: "Interactive exercises and quizzes" },
      { key: "D", label: "Discussion, debate, and teaching others" },
    ],
  },
  {
    id: "q8",
    question: "What motivates you to keep learning?",
    options: [
      { key: "A", label: "Career advancement and marketable skills" },
      { key: "B", label: "Pure intellectual curiosity — I just love knowing things" },
      { key: "C", label: "Building real things that matter" },
      { key: "D", label: "Contributing to my community or helping others" },
    ],
  },
  {
    id: "q9",
    question: "How comfortable are you with ambiguity and open-ended problems?",
    options: [
      { key: "A", label: "Very comfortable — I thrive in it" },
      { key: "B", label: "Somewhat comfortable with a little structure" },
      { key: "C", label: "I prefer clarity but can handle some uncertainty" },
      { key: "D", label: "I need clear steps and defined outcomes" },
    ],
  },
  {
    id: "q10",
    question: "What's your biggest obstacle when it comes to learning?",
    options: [
      { key: "A", label: "Maintaining focus and avoiding distraction" },
      { key: "B", label: "Actually retaining what I learn" },
      { key: "C", label: "Finding consistent time in my schedule" },
      { key: "D", label: "Knowing where to start or what to learn next" },
    ],
  },
];

const EXTENDED_QUESTIONS = [
  {
    id: "q11",
    question: "Do you learn better alone or with others?",
    options: [
      { key: "A", label: "Alone — I need quiet and focus" },
      { key: "B", label: "Mostly alone but I like occasional check-ins" },
      { key: "C", label: "With a small group or study partner" },
      { key: "D", label: "In a community — energy from others helps me" },
    ],
  },
  {
    id: "q12",
    question: "How do you handle setbacks or failures in learning?",
    options: [
      { key: "A", label: "I analyze what went wrong and try again immediately" },
      { key: "B", label: "I take a break to reset, then come back" },
      { key: "C", label: "I find a different approach or resource" },
      { key: "D", label: "I question whether it's worth continuing" },
    ],
  },
  {
    id: "q13",
    question: "How important is structure to your ideal learning environment?",
    options: [
      { key: "A", label: "Very — I want a clear curriculum and milestones" },
      { key: "B", label: "Moderate — some structure but room to explore" },
      { key: "C", label: "Minimal — I follow my curiosity wherever it goes" },
      { key: "D", label: "None — rigid structure kills my motivation" },
    ],
  },
  {
    id: "q14",
    question: "What best describes how you remember things?",
    options: [
      { key: "A", label: "I remember by doing and applying immediately" },
      { key: "B", label: "I remember by explaining it to someone else" },
      { key: "C", label: "I remember by connecting it to things I already know" },
      { key: "D", label: "I remember by making notes or visual summaries" },
    ],
  },
  {
    id: "q15",
    question: "When are you most mentally sharp?",
    options: [
      { key: "A", label: "Early morning — I do my best thinking before noon" },
      { key: "B", label: "Midday — peak focus in the afternoon" },
      { key: "C", label: "Evening — I come alive after dark" },
      { key: "D", label: "It varies — I don't have a consistent pattern" },
    ],
  },
  {
    id: "q16",
    question: "How do you prefer to receive feedback on your progress?",
    options: [
      { key: "A", label: "Frequent, immediate feedback after each action" },
      { key: "B", label: "Summary feedback after each session" },
      { key: "C", label: "Periodic in-depth analysis (weekly/monthly)" },
      { key: "D", label: "I mainly judge my own progress internally" },
    ],
  },
  {
    id: "q17",
    question: "Which statement resonates most with you?",
    options: [
      { key: "A", label: "I'd rather go deep on one thing than wide across many" },
      { key: "B", label: "I like to understand how everything connects" },
      { key: "C", label: "I get bored if I stay on one topic too long" },
      { key: "D", label: "I follow energy — whatever excites me most right now" },
    ],
  },
  {
    id: "q18",
    question: "How do you feel about AI-assisted learning?",
    options: [
      { key: "A", label: "I want AI to guide and personalize everything for me" },
      { key: "B", label: "Helpful for explanations but I make my own decisions" },
      { key: "C", label: "Useful occasionally but I prefer human curation" },
      { key: "D", label: "Skeptical — I prefer to figure things out myself" },
    ],
  },
];

export default function Onboarding() {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<"core" | "extended-prompt" | "extended">("core");
  const [extIdx, setExtIdx] = useState(0);
  const { refreshUser } = useAuth();
  const [, setLocation] = useLocation();

  const onboardingMutation = trpc.auth.completeOnboarding.useMutation({
    onSuccess: () => {
      refreshUser();
      setLocation("/app");
    },
    onError: (e) => toast.error(e.message),
  });

  const allCoreQuestions = CORE_QUESTIONS;
  const totalCore = allCoreQuestions.length;

  const submit = (finalAnswers: Record<string, string>) => {
    onboardingMutation.mutate({ quizAnswers: finalAnswers });
  };

  const handleCoreAnswer = (key: string) => {
    const q = allCoreQuestions[current];
    const newAnswers = { ...answers, [q.id]: key };
    setAnswers(newAnswers);

    if (current < totalCore - 1) {
      setTimeout(() => setCurrent(current + 1), 200);
    } else {
      // Core done — show extended prompt
      setPhase("extended-prompt");
    }
  };

  const handleExtendedAnswer = (key: string) => {
    const q = EXTENDED_QUESTIONS[extIdx];
    const newAnswers = { ...answers, [q.id]: key };
    setAnswers(newAnswers);

    if (extIdx < EXTENDED_QUESTIONS.length - 1) {
      setTimeout(() => setExtIdx(extIdx + 1), 200);
    } else {
      // All extended done
      submit(newAnswers);
    }
  };

  const progress = phase === "core"
    ? ((current) / totalCore) * 100
    : phase === "extended"
    ? (totalCore + extIdx) / (totalCore + EXTENDED_QUESTIONS.length) * 100
    : 100;

  // Extended prompt screen
  if (phase === "extended-prompt") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-[oklch(0.75_0.18_55_/_0.06)] blur-[100px]" />
        </div>
        <div className="w-full max-w-lg relative z-10">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Brain size={22} className="text-[oklch(0.75_0.18_55)]" />
              <span className="font-semibold text-foreground">Nexus</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">You're all set!</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {totalCore} questions answered · Your profile is ready
            </p>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl border border-white/8 p-8 text-center space-y-6"
          >
            <Sparkles size={36} className="mx-auto text-[oklch(0.75_0.18_55)]" />
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">Want a sharper profile?</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Answer {EXTENDED_QUESTIONS.length} more questions and Nexus can learn much more about how your mind works — better recommendations, smarter AI, deeper personalization.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { setPhase("extended"); }}
                className="flex items-center justify-center gap-2 w-full p-3.5 rounded-xl bg-[oklch(0.75_0.18_55)] text-black font-semibold hover:opacity-90 transition-opacity"
              >
                <Plus size={16} />
                Keep Going — {EXTENDED_QUESTIONS.length} more questions
              </button>
              <button
                onClick={() => submit(answers)}
                disabled={onboardingMutation.isPending}
                className="w-full p-3.5 rounded-xl border border-white/8 bg-white/3 hover:bg-white/8 transition-all text-sm text-muted-foreground"
              >
                {onboardingMutation.isPending ? "Building your profile..." : "I'm good — take me to Nexus"}
              </button>
            </div>
          </motion.div>
          {onboardingMutation.isPending && (
            <div className="flex items-center justify-center gap-2 mt-6 text-muted-foreground text-sm">
              <Loader2 size={16} className="animate-spin" />
              <span>Building your personalized experience...</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  const question = phase === "core" ? allCoreQuestions[current] : EXTENDED_QUESTIONS[extIdx];
  const questionNumber = phase === "core" ? current + 1 : totalCore + extIdx + 1;
  const totalQuestions = phase === "core" ? totalCore : totalCore + EXTENDED_QUESTIONS.length;

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
            {phase === "extended" ? `Deep calibration · +50 XP bonus` : `${totalCore} quick questions · Earn 50 XP`}
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
            key={`${phase}-${questionNumber}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <div className="glass rounded-2xl border border-white/8 p-6">
              <div className="flex items-start gap-2 mb-6">
                <span className="text-xs font-medium text-[oklch(0.75_0.18_55)] bg-[oklch(0.75_0.18_55_/_0.1)] px-2 py-0.5 rounded-full mt-0.5">
                  {questionNumber} of {totalQuestions}
                </span>
                {phase === "extended" && (
                  <span className="text-xs text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full mt-0.5">Deep calibration</span>
                )}
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-5">{question.question}</h2>

              <div className="flex flex-col gap-2">
                {question.options.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => phase === "core" ? handleCoreAnswer(opt.key) : handleExtendedAnswer(opt.key)}
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
