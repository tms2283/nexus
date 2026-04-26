/**
 * First-run onboarding tour overlay.
 * Shows once after the user first reaches /app, stored in localStorage.
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { useTour } from "@/contexts/TourContext";

// ─── Tour steps ───────────────────────────────────────────────────────────────

const STEPS = [
  {
    id: "welcome",
    icon: "🧠",
    title: "Welcome to Nexus",
    subtitle: "Your adaptive AI-powered learning platform",
    description:
      "Nexus is built around one idea: learning should fit you, not the other way around. Everything here adapts to how your mind works — your pace, your style, your goals. This quick tour shows you the most powerful things you can do.",
    cta: null,
    color: "oklch(0.72 0.20 310)",
    bg: "oklch(0.72 0.20 310 / 0.08)",
    preview: null,
  },
  {
    id: "learn",
    icon: "📚",
    title: "Structured Learning Paths",
    subtitle: "Navigate to: Learn",
    description:
      "Start with a curated course like \"Mastering AI\" — built as a guided journey with modules, quizzes, and AI-powered explanations at every step. Each lesson adapts its depth and vocabulary to your knowledge level, so you never feel lost or bored.",
    cta: { label: "Go to Learn", href: "/learn" },
    color: "oklch(0.75 0.18 55)",
    bg: "oklch(0.75 0.18 55 / 0.08)",
    preview: [
      { label: "AI Literacy", detail: "6 modules · Beginner → Expert" },
      { label: "Clear Thinking", detail: "Critical reasoning for AI age" },
      { label: "AI by AI", detail: "Claude teaches you about Claude" },
    ],
  },
  {
    id: "depth",
    icon: "🔭",
    title: "Depth Engine",
    subtitle: "Navigate to: Learn → Depth",
    description:
      "Type any topic and Nexus generates a rich, multi-level explanation calibrated to your background. You can request simpler or more technical language, ask follow-up questions, and explore related concepts — all in a single focused session.",
    cta: { label: "Try Depth Engine", href: "/depth" },
    color: "oklch(0.75 0.18 180)",
    bg: "oklch(0.75 0.18 180 / 0.08)",
    preview: [
      { label: "Choose your level", detail: "Plain → Standard → Technical" },
      { label: "Follow-up questions", detail: "Go deeper on any part" },
      { label: "Related concepts", detail: "Auto-generated knowledge map" },
    ],
  },
  {
    id: "research",
    icon: "🔬",
    title: "Research Forge",
    subtitle: "Navigate to: Explore → Research",
    description:
      "The Research Forge lets you explore any topic like a researcher. It builds a knowledge tree, finds connections, surfaces rabbit holes, and lets you save sources to your Reading List. Great for going beyond surface-level understanding.",
    cta: { label: "Open Research", href: "/research" },
    color: "oklch(0.72 0.20 310)",
    bg: "oklch(0.72 0.20 310 / 0.08)",
    preview: [
      { label: "Knowledge tree", detail: "Visualize how ideas connect" },
      { label: "Rabbit holes", detail: "Surprising angles & deep dives" },
      { label: "Save sources", detail: "Build your reading list" },
    ],
  },
  {
    id: "practice",
    icon: "⚡",
    title: "Daily Practice",
    subtitle: "Navigate to: Practice",
    description:
      "Learning without practice fades fast. Use the Testing Center to check your retention, Flashcards to drill key concepts, or take the Daily Challenge — 5 quick questions every day to build a streak and keep your mind sharp.",
    cta: { label: "Start a Daily Challenge", href: "/daily" },
    color: "oklch(0.75 0.18 55)",
    bg: "oklch(0.75 0.18 55 / 0.08)",
    preview: [
      { label: "Testing Center", detail: "Full quizzes on any topic" },
      { label: "Flashcards", detail: "Spaced repetition built-in" },
      { label: "Daily Challenge", detail: "5 questions · maintain your streak" },
    ],
  },
  {
    id: "lab",
    icon: "🧪",
    title: "The Lab",
    subtitle: "Navigate to: Practice → The Lab",
    description:
      "The Lab is where you build things. Write and run code in the browser, work through guided coding challenges, and experiment with AI tools hands-on. If you learn by doing, this is where you'll spend most of your time.",
    cta: { label: "Open The Lab", href: "/lab" },
    color: "oklch(0.75 0.18 180)",
    bg: "oklch(0.75 0.18 180 / 0.08)",
    preview: [
      { label: "In-browser editor", detail: "Run code instantly" },
      { label: "Guided challenges", detail: "Structured experiments" },
      { label: "AI assistance", detail: "Explain, debug, suggest" },
    ],
  },
  {
    id: "clarity",
    icon: "💜",
    title: "Clarity — Know Your Mind",
    subtitle: "Navigate to: Explore → Clarity",
    description:
      "Clarity is Nexus's mental health and cognitive science module. Take validated psychological assessments (PHQ-9, GAD-7, personality), run cognitive training exercises backed by neuroscience (N-Back, Flanker, Mental Rotation), and track your mood over time.",
    cta: { label: "Open Clarity", href: "/clarity" },
    color: "oklch(0.72 0.20 310)",
    bg: "oklch(0.72 0.20 310 / 0.08)",
    preview: [
      { label: "27+ assessments", detail: "Psych, personality, IQ, career" },
      { label: "12 cog. exercises", detail: "Science-backed brain training" },
      { label: "Mood & CBT tools", detail: "Track and reframe thoughts" },
    ],
  },
  {
    id: "study-buddy",
    icon: "🤖",
    title: "Study Buddy",
    subtitle: "The floating chat button (bottom-right)",
    description:
      "Study Buddy is your always-available AI tutor. Ask it anything — explain a concept, quiz you on what you've learned, debate an idea, or just think out loud. It knows your learning history and adapts its responses to your level.",
    cta: { label: "Open Study Buddy", href: "/study-buddy" },
    color: "oklch(0.75 0.18 55)",
    bg: "oklch(0.75 0.18 55 / 0.08)",
    preview: [
      { label: "Ask anything", detail: "No judgment, infinite patience" },
      { label: "Context-aware", detail: "Knows your profile & history" },
      { label: "Socratic mode", detail: "Guides you to discover answers" },
    ],
  },
  {
    id: "profile",
    icon: "🗺️",
    title: "Your Profile & Mind Map",
    subtitle: "Navigate to: My Nexus → Profile",
    description:
      "Your Profile is a living map of your mind. See your inferred learning style, behavioral trait radar chart, burnout risk, optimal study times heatmap, and all your assessment results — in one place. The more you use Nexus, the sharper it gets.",
    cta: { label: "View Your Profile", href: "/profile" },
    color: "oklch(0.75 0.18 180)",
    bg: "oklch(0.75 0.18 180 / 0.08)",
    preview: [
      { label: "Trait radar", detail: "6 behavioral dimensions" },
      { label: "Study heatmap", detail: "Your optimal hours & days" },
      { label: "Psych profile", detail: "Inferred from your behavior" },
    ],
  },
  {
    id: "done",
    icon: "🚀",
    title: "You're all set!",
    subtitle: "Your personalized learning journey starts now",
    description:
      "Nexus learns from every session, every click, every question you ask. The longer you use it, the more precisely it adapts to you. Start anywhere — explore freely, and Nexus will meet you there.",
    cta: { label: "Start Exploring →", href: "/app" },
    color: "oklch(0.72 0.20 310)",
    bg: "oklch(0.72 0.20 310 / 0.15)",
    preview: null,
  },
];

const TOUR_KEY = "nexus_tour_v1_seen";

// ─── Component ────────────────────────────────────────────────────────────────

export default function TourOverlay() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [, setLocation] = useLocation();
  const { showMainTour, closeMainTour } = useTour();

  // Auto-show on first visit
  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(TOUR_KEY);
    if (!seen) {
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  // Show when triggered programmatically via context
  useEffect(() => {
    if (showMainTour) {
      setStep(0);
      setVisible(true);
    }
  }, [showMainTour]);

  const dismiss = () => {
    localStorage.setItem(TOUR_KEY, "1");
    setVisible(false);
    closeMainTour();
  };

  const handleCta = (href: string) => {
    dismiss();
    if (href !== "/app") setLocation(href);
  };

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="tour-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "oklch(0.04 0.010 255 / 0.85)",
            backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "16px",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.97 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              style={{
                width: "100%", maxWidth: 540,
                borderRadius: 20,
                border: `1px solid ${current.color}40`,
                background: "var(--surface-1, oklch(0.10 0.014 255))",
                boxShadow: `0 0 60px ${current.color}20, 0 24px 80px oklch(0 0 0 / 0.5)`,
                overflow: "hidden",
                position: "relative",
              }}
            >
              {/* Color accent bar */}
              <div style={{ height: 3, background: `linear-gradient(90deg, ${current.color}, transparent)` }} />

              {/* Close */}
              <button
                onClick={dismiss}
                style={{
                  position: "absolute", top: 16, right: 16, zIndex: 1,
                  width: 28, height: 28, borderRadius: "50%",
                  background: "oklch(0.15 0.014 255)", border: "1px solid var(--border)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "var(--muted-foreground)",
                }}
                title="Skip tour"
              >
                <X size={13} />
              </button>

              {/* Body */}
              <div style={{ padding: "32px 32px 24px" }}>
                {/* Step badge */}
                <div style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase",
                    padding: "3px 10px", borderRadius: 20,
                    background: `${current.color}20`, color: current.color,
                  }}>
                    {step === 0 ? "Getting Started" : step === STEPS.length - 1 ? "All Done!" : `Step ${step} of ${STEPS.length - 2}`}
                  </span>
                </div>

                {/* Icon + title */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 16 }}>
                  <div style={{
                    width: 60, height: 60, borderRadius: 16, flexShrink: 0,
                    background: current.bg, border: `1px solid ${current.color}30`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28,
                  }}>
                    {current.icon}
                  </div>
                  <div style={{ paddingTop: 4 }}>
                    <h2 style={{ fontWeight: 800, fontSize: 20, color: "var(--foreground)", lineHeight: 1.2, marginBottom: 4 }}>
                      {current.title}
                    </h2>
                    {current.subtitle && (
                      <p style={{ fontSize: 11, color: current.color, fontWeight: 600, letterSpacing: 0.4 }}>
                        {current.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.7, marginBottom: 20 }}>
                  {current.description}
                </p>

                {/* Feature preview pills */}
                {current.preview && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 24 }}>
                    {current.preview.map(({ label, detail }) => (
                      <div key={label} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "9px 14px", borderRadius: 10,
                        background: "var(--surface-2, oklch(0.13 0.014 255))",
                        border: "1px solid var(--border)",
                      }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: current.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)", flex: 1 }}>{label}</span>
                        <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{detail}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Last step confetti dots */}
                {isLast && (
                  <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 20, fontSize: 20 }}>
                    {"🎯🧠💡🔬⚡🚀".split("").map((e, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                      >{e}</motion.span>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{
                padding: "16px 32px 24px",
                borderTop: "1px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
              }}>
                {/* Progress dots */}
                <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                  {STEPS.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setStep(i)}
                      style={{
                        width: i === step ? 20 : 6,
                        height: 6, borderRadius: 3,
                        background: i === step ? current.color : "var(--border)",
                        border: "none", cursor: "pointer", padding: 0,
                        transition: "all 0.25s",
                      }}
                    />
                  ))}
                </div>

                {/* Nav buttons */}
                <div style={{ display: "flex", gap: 8 }}>
                  {!isFirst && (
                    <button
                      onClick={() => setStep((s) => s - 1)}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        padding: "8px 14px", borderRadius: 10, fontSize: 13,
                        background: "transparent", border: "1px solid var(--border)",
                        color: "var(--muted-foreground)", cursor: "pointer",
                      }}
                    >
                      <ChevronLeft size={14} /> Back
                    </button>
                  )}

                  {current.cta && !isLast ? (
                    <button
                      onClick={() => handleCta(current.cta!.href)}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                        background: `${current.color}20`, border: `1px solid ${current.color}40`,
                        color: current.color, cursor: "pointer",
                      }}
                    >
                      {current.cta.label} <ChevronRight size={14} />
                    </button>
                  ) : null}

                  {isLast ? (
                    <button
                      onClick={() => { handleCta("/app"); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "10px 24px", borderRadius: 10, fontSize: 14, fontWeight: 700,
                        background: current.color, color: "#000",
                        border: "none", cursor: "pointer",
                      }}
                    >
                      Let's Go! 🚀
                    </button>
                  ) : (
                    <button
                      onClick={() => setStep((s) => s + 1)}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                        background: current.color, color: "#000",
                        border: "none", cursor: "pointer",
                      }}
                    >
                      Next <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Call this to re-trigger the tour (e.g. from a Help menu) */
export function resetTour() {
  localStorage.removeItem(TOUR_KEY);
}
