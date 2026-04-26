/**
 * Page-specific tour overlay.
 * Shows when the user clicks the "?" help button on any page other than /app.
 * Includes a link to open the main site-overview tour.
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { X, ChevronRight, ChevronLeft, Map } from "lucide-react";
import { useTour } from "@/contexts/TourContext";

// ─── Per-page tour step data ──────────────────────────────────────────────────

type TourStep = {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  preview: { label: string; detail: string }[] | null;
  color: string;
};

const PAGE_TOURS: Record<string, { pageTitle: string; accentColor: string; steps: TourStep[] }> = {

  // ── /learn ─────────────────────────────────────────────────────────────────
  "/learn": {
    pageTitle: "Learn",
    accentColor: "oklch(0.75 0.18 55)",
    steps: [
      {
        id: "learn-overview",
        icon: "📚",
        title: "Your Learning Hub",
        subtitle: "Everything structured learning lives here",
        description:
          "The Learn page is where all curated courses, learning paths, and the AI-powered Curriculum Generator live. Whether you want a guided course or a custom path built around your exact goal, this is your starting point.",
        preview: [
          { label: "Curated Courses", detail: "AI Literacy, Clear Thinking, AI by AI" },
          { label: "Learning Paths", detail: "Topic-based progressions" },
          { label: "Curriculum Generator", detail: "Custom path for any goal" },
        ],
        color: "oklch(0.75 0.18 55)",
      },
      {
        id: "learn-courses",
        icon: "🎓",
        title: "Curated Lesson Plans",
        subtitle: "Pre-built structured courses",
        description:
          "Curated courses are fully pre-built with modules, lessons, interactive segments, and quizzes. Each lesson has a narrator, concept exploration, a hands-on practice section, and a quiz to check retention. Lessons unlock progressively — complete one to unlock the next.",
        preview: [
          { label: "AI Literacy", detail: "3 modules, 15 lessons — Beginner → Expert" },
          { label: "Clear Thinking", detail: "3 modules on logic, reasoning & systems" },
          { label: "AI by AI", detail: "Claude teaches you about Claude" },
        ],
        color: "oklch(0.75 0.18 55)",
      },
      {
        id: "learn-ai-literacy",
        icon: "🤖",
        title: "AI Literacy Course",
        subtitle: "Master AI from first principles",
        description:
          "Three modules across 15 lessons. Module 1 covers what AI models are and how to use them. Module 2 dives into advanced prompting, workflows, and automation. Module 3 teaches image generation, agents, and building with AI. Each lesson adapts to your knowledge level.",
        preview: [
          { label: "Module 1", detail: "Foundations — models, prompting, outputs" },
          { label: "Module 2", detail: "Power use — memory, agents, integrations" },
          { label: "Module 3", detail: "Create — images, code, automations" },
        ],
        color: "oklch(0.72 0.20 310)",
      },
      {
        id: "learn-clear-thinking",
        icon: "🧠",
        title: "Clear Thinking Course",
        subtitle: "Critical reasoning for the AI age",
        description:
          "Three modules across 15 lessons on how to think well. Module 1 covers argument structure and logical fallacies. Module 2 tackles cognitive biases and misinformation. Module 3 covers mental models, systems thinking, and motivated reasoning — all with interactive exercises and AI feedback.",
        preview: [
          { label: "Module 1", detail: "Arguments, fallacies, evidence" },
          { label: "Module 2", detail: "Biases, misinformation, critical reading" },
          { label: "Module 3", detail: "Mental models, systems, self-deception" },
        ],
        color: "oklch(0.70 0.22 270)",
      },
      {
        id: "learn-curriculum",
        icon: "⚙️",
        title: "Curriculum Generator",
        subtitle: "Build a custom learning path",
        description:
          "Type any learning goal — 'Understand machine learning', 'Learn financial modeling', 'Master public speaking' — and Nexus generates a structured multi-week curriculum with modules, weekly goals, and resources. It adapts the depth and pace to your current knowledge level.",
        preview: [
          { label: "Any subject", detail: "From quantum physics to copywriting" },
          { label: "Personalized depth", detail: "Calibrated to your background" },
          { label: "Expandable modules", detail: "Drill into any week for details" },
        ],
        color: "oklch(0.75 0.18 180)",
      },
      {
        id: "learn-xp",
        icon: "⚡",
        title: "XP & Progress Tracking",
        subtitle: "Every lesson earns experience points",
        description:
          "Each lesson you complete awards XP shown in the lesson header. Your total XP accumulates across all modules and courses. Progress bars show completion per module, and the lesson list shows which lessons are done, in-progress, or locked. Quizzes at the end of each lesson reinforce what you learned.",
        preview: [
          { label: "Per-lesson XP", detail: "Shown before you start each lesson" },
          { label: "Module progress", detail: "Visual progress bars across lessons" },
          { label: "Quiz reinforcement", detail: "3-question checks after each lesson" },
        ],
        color: "oklch(0.75 0.18 55)",
      },
    ],
  },

  // ── /research ──────────────────────────────────────────────────────────────
  "/research": {
    pageTitle: "Research Forge",
    accentColor: "oklch(0.72 0.20 310)",
    steps: [
      {
        id: "research-overview",
        icon: "🔬",
        title: "Research Forge",
        subtitle: "AI-powered document intelligence",
        description:
          "The Research Forge turns any document, article, or topic into a structured knowledge session. Upload a PDF, paste a URL, or type a topic — then let Nexus extract key insights, answer your questions, and help you build understanding faster than reading alone.",
        preview: [
          { label: "Upload documents", detail: "PDF, text, or URL" },
          { label: "AI Q&A", detail: "Ask anything about the content" },
          { label: "Structured insights", detail: "Summaries, themes, key concepts" },
        ],
        color: "oklch(0.72 0.20 310)",
      },
      {
        id: "research-input",
        icon: "📄",
        title: "Input: Documents & Topics",
        subtitle: "Three ways to start a session",
        description:
          "You can start a research session three ways: (1) Upload a PDF or document file directly; (2) Paste a URL and Nexus will fetch and analyze the page; (3) Type a topic and Nexus will research it from scratch. Each method feeds into the same AI analysis pipeline.",
        preview: [
          { label: "Document upload", detail: "Drag & drop or browse" },
          { label: "URL fetch", detail: "Paste any web article" },
          { label: "Topic research", detail: "Let Nexus research for you" },
        ],
        color: "oklch(0.72 0.20 310)",
      },
      {
        id: "research-analysis",
        icon: "🔍",
        title: "AI Analysis Panel",
        subtitle: "What Nexus extracts automatically",
        description:
          "After processing, Nexus produces: an executive summary, key themes and concepts, notable quotes, questions the document raises, and connections to related ideas. Each section is collapsible so you can focus on what matters most to your session.",
        preview: [
          { label: "Executive summary", detail: "Core argument in 3–5 sentences" },
          { label: "Key concepts", detail: "Auto-extracted terms and ideas" },
          { label: "Open questions", detail: "What the source leaves unresolved" },
        ],
        color: "oklch(0.75 0.18 180)",
      },
      {
        id: "research-qa",
        icon: "💬",
        title: "Ask Anything About the Source",
        subtitle: "Conversational document Q&A",
        description:
          "Below the analysis is a chat interface grounded in your document. Ask specific questions: 'What does the author mean by X?', 'Does this contradict Y?', 'Summarize section 3'. Nexus answers using only the content you provided, so answers stay accurate.",
        preview: [
          { label: "Grounded answers", detail: "Only from your document" },
          { label: "Follow-up questions", detail: "Build on previous answers" },
          { label: "Quote attribution", detail: "Answers cite the source" },
        ],
        color: "oklch(0.72 0.20 310)",
      },
      {
        id: "research-save",
        icon: "🔖",
        title: "Save to Reading List",
        subtitle: "Build your personal library",
        description:
          "Any source you analyze can be saved to your Reading List with one click. Saved sources retain their AI analysis so you can return to them later. Access your full Reading List under My Nexus → Reading List.",
        preview: [
          { label: "One-click save", detail: "Source + analysis saved together" },
          { label: "Persistent access", detail: "Revisit any time from Reading List" },
          { label: "Annotate & tag", detail: "Add notes and categories" },
        ],
        color: "oklch(0.75 0.18 55)",
      },
    ],
  },

  // ── /depth ─────────────────────────────────────────────────────────────────
  "/depth": {
    pageTitle: "Depth Engine",
    accentColor: "oklch(0.75 0.18 180)",
    steps: [
      {
        id: "depth-overview",
        icon: "🔭",
        title: "The Depth Engine",
        subtitle: "Any concept. Any level. Right now.",
        description:
          "The Depth Engine generates rich, layered explanations of any topic — calibrated precisely to your knowledge level. Type any concept, choose your depth, and get an explanation that neither talks down to you nor loses you in jargon.",
        preview: [
          { label: "Any topic", detail: "Science, history, philosophy, tech..." },
          { label: "5 depth levels", detail: "ELI5 through Expert" },
          { label: "Follow-up Q&A", detail: "Keep drilling into sub-topics" },
        ],
        color: "oklch(0.75 0.18 180)",
      },
      {
        id: "depth-topic",
        icon: "✍️",
        title: "Enter Any Topic",
        subtitle: "The search bar is your starting point",
        description:
          "Type any concept, term, phenomenon, or question into the topic bar. Be as broad ('Quantum mechanics') or specific ('Bell's theorem and non-locality') as you want. Nexus works best with precise, single-concept queries rather than multi-part questions.",
        preview: [
          { label: "Single concepts", detail: "One topic per session for clarity" },
          { label: "Any domain", detail: "STEM, humanities, arts, business" },
          { label: "Questions work too", detail: "'How does inflation cause recessions?'" },
        ],
        color: "oklch(0.75 0.18 180)",
      },
      {
        id: "depth-levels",
        icon: "📊",
        title: "Five Depth Levels",
        subtitle: "Match the explanation to your background",
        description:
          "Choose from five levels before generating: ELI5 (explain like I'm five), Beginner, Standard, Advanced, or Expert. Each level adjusts vocabulary, assumed knowledge, and density of technical detail. You can regenerate at a different level at any time.",
        preview: [
          { label: "ELI5", detail: "Simple analogies, zero jargon" },
          { label: "Standard", detail: "Educated non-specialist baseline" },
          { label: "Expert", detail: "Full technical vocabulary assumed" },
        ],
        color: "oklch(0.75 0.18 180)",
      },
      {
        id: "depth-followup",
        icon: "🔗",
        title: "Follow-Up Questions",
        subtitle: "Go deeper on any part of the explanation",
        description:
          "After your explanation generates, you'll see suggested follow-up questions — and you can type your own. Each follow-up stays in the context of the original topic, so you can trace rabbit holes without losing the thread.",
        preview: [
          { label: "AI-suggested follow-ups", detail: "Natural next questions" },
          { label: "Custom questions", detail: "Ask exactly what you're curious about" },
          { label: "Maintains context", detail: "Answers build on previous content" },
        ],
        color: "oklch(0.72 0.20 310)",
      },
      {
        id: "depth-related",
        icon: "🕸️",
        title: "Related Concepts",
        subtitle: "Expand your knowledge graph",
        description:
          "Each explanation includes a panel of related concepts — adjacent ideas that often connect to what you're studying. Click any related concept to start a new depth session on that topic. This is how deep learning sessions develop organically.",
        preview: [
          { label: "Auto-generated", detail: "Nexus identifies the connections" },
          { label: "One click to explore", detail: "Opens a new depth session" },
          { label: "Build a map", detail: "Track what you've explored" },
        ],
        color: "oklch(0.75 0.18 55)",
      },
    ],
  },

  // ── /lab ───────────────────────────────────────────────────────────────────
  "/lab": {
    pageTitle: "The Lab",
    accentColor: "oklch(0.75 0.18 180)",
    steps: [
      {
        id: "lab-overview",
        icon: "🧪",
        title: "The Lab",
        subtitle: "Learn by building and experimenting",
        description:
          "The Lab is Nexus's hands-on environment. Write and run code directly in the browser, work through structured coding challenges, and get AI assistance at every step. If you learn best by doing, this is where you'll spend the most time.",
        preview: [
          { label: "In-browser editor", detail: "Run code instantly, no setup" },
          { label: "Structured challenges", detail: "Guided experiments with goals" },
          { label: "AI pair programmer", detail: "Explain, debug, refactor on demand" },
        ],
        color: "oklch(0.75 0.18 180)",
      },
      {
        id: "lab-editor",
        icon: "💻",
        title: "In-Browser Code Editor",
        subtitle: "Write and run code without leaving Nexus",
        description:
          "The built-in editor supports JavaScript, Python, and other languages. Write code in the left panel, click Run, and see output in the right panel immediately. No environment setup, no installs — just code and results.",
        preview: [
          { label: "Multiple languages", detail: "JS, Python, and more" },
          { label: "Instant execution", detail: "Run with a single click" },
          { label: "Output panel", detail: "Console, errors, and results" },
        ],
        color: "oklch(0.75 0.18 180)",
      },
      {
        id: "lab-challenges",
        icon: "🎯",
        title: "Guided Challenges",
        subtitle: "Structured experiments with clear objectives",
        description:
          "Challenges give you a goal, some starter code, and a set of tests that your code must pass. Work through the challenge, run the tests, and get immediate feedback. Challenges progress from simple (modify one function) to complex (build a full feature).",
        preview: [
          { label: "Clear objectives", detail: "Know exactly what success looks like" },
          { label: "Test-driven", detail: "Automated tests verify your solution" },
          { label: "Progressive difficulty", detail: "Challenges scale with your skill" },
        ],
        color: "oklch(0.72 0.20 310)",
      },
      {
        id: "lab-ai",
        icon: "🤖",
        title: "AI Assistance",
        subtitle: "Your pair programmer is always available",
        description:
          "Highlight any code and ask the AI to explain it, find the bug, suggest an improvement, or generate a test. The AI sees your full editor context — it doesn't just answer abstractly, it responds to your specific code.",
        preview: [
          { label: "Explain selected code", detail: "Understand what it does line by line" },
          { label: "Debug mode", detail: "Find and fix errors with AI" },
          { label: "Generate tests", detail: "Auto-create test cases" },
        ],
        color: "oklch(0.75 0.18 55)",
      },
    ],
  },

  // ── /flashcards ────────────────────────────────────────────────────────────
  "/flashcards": {
    pageTitle: "Flashcards",
    accentColor: "oklch(0.72 0.20 310)",
    steps: [
      {
        id: "flash-overview",
        icon: "🃏",
        title: "Spaced Repetition Flashcards",
        subtitle: "The most efficient way to remember anything",
        description:
          "Nexus uses a spaced repetition algorithm (SRS) to schedule card reviews at the optimal moment — just before you'd forget. This makes retention dramatically more efficient than re-reading or random review.",
        preview: [
          { label: "SRS scheduling", detail: "Cards appear when you need them most" },
          { label: "AI-generated cards", detail: "Create from any topic or text" },
          { label: "Multiple decks", detail: "Organize by subject or course" },
        ],
        color: "oklch(0.72 0.20 310)",
      },
      {
        id: "flash-create",
        icon: "✨",
        title: "Creating Cards",
        subtitle: "Manual or AI-generated",
        description:
          "Create cards manually by typing a front (question/term) and back (answer/definition). Or paste any text and let AI generate a full deck from it automatically — it identifies the key concepts and creates question-answer pairs covering all of them.",
        preview: [
          { label: "Manual creation", detail: "Type front and back directly" },
          { label: "AI from text", detail: "Paste a passage → full deck in seconds" },
          { label: "AI from topic", detail: "Type a topic → Nexus builds the deck" },
        ],
        color: "oklch(0.72 0.20 310)",
      },
      {
        id: "flash-study",
        icon: "📖",
        title: "Study Sessions",
        subtitle: "How to review effectively",
        description:
          "During a session, a card appears face-down. Think of the answer, then reveal it. Rate your recall: Easy, Good, Hard, or Again. Your rating tells the SRS algorithm when to show this card next — cards you find easy appear less often; hard cards more often.",
        preview: [
          { label: "Self-rating", detail: "Easy / Good / Hard / Again" },
          { label: "Adaptive timing", detail: "Next review calculated per rating" },
          { label: "Session stats", detail: "Cards due, retention rate, streak" },
        ],
        color: "oklch(0.75 0.18 180)",
      },
      {
        id: "flash-decks",
        icon: "📂",
        title: "Deck Management",
        subtitle: "Organize and track all your decks",
        description:
          "The deck overview shows all your decks with their card counts, due-today counts, and retention rates. You can import/export decks, share with other users, and archive decks you've mastered without deleting them.",
        preview: [
          { label: "Due today count", detail: "See what needs review at a glance" },
          { label: "Retention rate", detail: "% of cards you know well" },
          { label: "Import / export", detail: "Share decks or import from Anki" },
        ],
        color: "oklch(0.75 0.18 55)",
      },
    ],
  },

  // ── /daily ─────────────────────────────────────────────────────────────────
  "/daily": {
    pageTitle: "Daily Challenge",
    accentColor: "oklch(0.75 0.18 55)",
    steps: [
      {
        id: "daily-overview",
        icon: "⚡",
        title: "Daily Challenge",
        subtitle: "5 questions. Every day. Keep the streak alive.",
        description:
          "The Daily Challenge is a 5-question quiz that refreshes every 24 hours. It covers topics from across your learning history — courses you've taken, subjects you've explored in Depth Engine, and general knowledge spanning the platform's curriculum.",
        preview: [
          { label: "5 questions daily", detail: "Fresh set every day at midnight" },
          { label: "Personalized topics", detail: "Drawn from your learning history" },
          { label: "Streaks and XP", detail: "Build a chain of consecutive days" },
        ],
        color: "oklch(0.75 0.18 55)",
      },
      {
        id: "daily-how",
        icon: "🎯",
        title: "How a Challenge Works",
        subtitle: "Start, answer, review, done",
        description:
          "Start the challenge and answer 5 questions in order. Each question is multiple choice. After answering, you see whether you're correct and a short explanation. After all 5, you get your score and today's XP reward.",
        preview: [
          { label: "Multiple choice", detail: "4 options per question" },
          { label: "Instant feedback", detail: "Correct/incorrect + explanation" },
          { label: "Score summary", detail: "Your result and XP at the end" },
        ],
        color: "oklch(0.75 0.18 55)",
      },
      {
        id: "daily-streaks",
        icon: "🔥",
        title: "Streaks & XP",
        subtitle: "Consistency compounds over time",
        description:
          "Complete the Daily Challenge on consecutive days to build a streak. Your streak is shown on your Dashboard and Profile. Longer streaks earn streak-multiplier bonuses on XP. Missing a day resets your streak — so consistency matters.",
        preview: [
          { label: "Daily streak counter", detail: "Shown on home and profile" },
          { label: "XP multiplier", detail: "Longer streaks, higher XP reward" },
          { label: "Streak history", detail: "See your longest runs over time" },
        ],
        color: "oklch(0.72 0.20 310)",
      },
      {
        id: "daily-history",
        icon: "📅",
        title: "Challenge History",
        subtitle: "See every past session",
        description:
          "Below the current challenge, you'll find your history — every past daily challenge with its date, score, and which topics were covered. Use this to spot knowledge gaps (topics you consistently get wrong) and prioritize your learning.",
        preview: [
          { label: "Full history", detail: "Every session ever completed" },
          { label: "Per-question scores", detail: "See exactly which questions tripped you" },
          { label: "Topic patterns", detail: "Identify recurring weak spots" },
        ],
        color: "oklch(0.75 0.18 55)",
      },
    ],
  },

  // ── /clarity ───────────────────────────────────────────────────────────────
  "/clarity": {
    pageTitle: "Clarity",
    accentColor: "oklch(0.72 0.20 310)",
    steps: [
      {
        id: "clarity-overview",
        icon: "💜",
        title: "Clarity — Know Your Mind",
        subtitle: "Mental health, cognitive science, and self-understanding",
        description:
          "Clarity is Nexus's psychology and cognitive science module. Take validated clinical assessments, run evidence-based cognitive training exercises, track your mood over time, and use CBT tools for thought reframing — all in one private space.",
        preview: [
          { label: "27+ assessments", detail: "Psych, personality, IQ, career" },
          { label: "12 cognitive exercises", detail: "Neuroscience-backed brain training" },
          { label: "Mood & CBT tools", detail: "Track patterns and reframe thoughts" },
        ],
        color: "oklch(0.72 0.20 310)",
      },
      {
        id: "clarity-assessments",
        icon: "📋",
        title: "Psychological Assessments",
        subtitle: "Validated clinical and personality tools",
        description:
          "Clarity includes validated tools used by clinicians and researchers: PHQ-9 (depression screening), GAD-7 (anxiety), Big Five personality, OCEAN traits, IQ-style reasoning tests, career aptitude assessments, and more. Results are private to you.",
        preview: [
          { label: "PHQ-9 & GAD-7", detail: "Standard clinical depression/anxiety screens" },
          { label: "Big Five / OCEAN", detail: "Gold-standard personality model" },
          { label: "Reasoning tests", detail: "Verbal, numerical, abstract patterns" },
        ],
        color: "oklch(0.72 0.20 310)",
      },
      {
        id: "clarity-cognitive",
        icon: "🧩",
        title: "Cognitive Training Exercises",
        subtitle: "Neuroscience-backed brain workouts",
        description:
          "Twelve cognitive exercises target specific mental faculties: N-Back (working memory), Flanker Task (selective attention), Mental Rotation (spatial reasoning), Stroop (cognitive control), and more. Each exercise tracks your performance over time.",
        preview: [
          { label: "N-Back", detail: "Working memory — remembering sequences" },
          { label: "Flanker Task", detail: "Attention control and inhibition" },
          { label: "Mental Rotation", detail: "Spatial reasoning and visualization" },
        ],
        color: "oklch(0.75 0.18 180)",
      },
      {
        id: "clarity-mood",
        icon: "📈",
        title: "Mood Tracking & CBT Tools",
        subtitle: "Build self-awareness over time",
        description:
          "Log your mood daily with a simple 1–10 scale and optional notes. Clarity plots your mood history so you can spot patterns — days, times, correlations with activities. The CBT tools guide you through thought records and cognitive reframing exercises.",
        preview: [
          { label: "Daily mood log", detail: "Quick 10-second check-in" },
          { label: "Mood trend chart", detail: "30/90/365-day visualizations" },
          { label: "CBT thought records", detail: "Identify and reframe distorted thinking" },
        ],
        color: "oklch(0.72 0.20 310)",
      },
      {
        id: "clarity-privacy",
        icon: "🔒",
        title: "Your Data is Private",
        subtitle: "What you enter here stays here",
        description:
          "All Clarity data — assessment results, mood logs, CBT records — is stored only in your account and never used for any purpose other than showing you your own history. No data is shared externally or used for advertising.",
        preview: [
          { label: "Private by default", detail: "Only you see your results" },
          { label: "No external sharing", detail: "Not used for advertising or research" },
          { label: "Export anytime", detail: "Download all your data as CSV" },
        ],
        color: "oklch(0.75 0.18 55)",
      },
    ],
  },

  // ── /study-buddy ───────────────────────────────────────────────────────────
  "/study-buddy": {
    pageTitle: "Study Buddy",
    accentColor: "oklch(0.75 0.18 55)",
    steps: [
      {
        id: "sb-overview",
        icon: "🤖",
        title: "Study Buddy",
        subtitle: "Your always-available AI tutor",
        description:
          "Study Buddy is a conversational AI tutor built into Nexus. It's always available — from the chat panel (bottom-right floating button) or this dedicated page. It knows your learning profile and tailors explanations to your knowledge level.",
        preview: [
          { label: "Ask anything", detail: "No judgment, infinite patience" },
          { label: "Context-aware", detail: "Knows your courses and profile" },
          { label: "Multiple modes", detail: "Teach, Quiz, Debate, Brainstorm" },
        ],
        color: "oklch(0.75 0.18 55)",
      },
      {
        id: "sb-ask",
        icon: "💬",
        title: "Ask Anything",
        subtitle: "The most natural way to learn",
        description:
          "Type any question, explain a concept you're confused about, ask Study Buddy to explain something you just read, or just think out loud. Study Buddy responds conversationally, following your train of thought and adapting when you push back.",
        preview: [
          { label: "Explain concepts", detail: "'What is entropy?'" },
          { label: "Follow-up naturally", detail: "'Wait, can you clarify that part?'" },
          { label: "Test your understanding", detail: "'Am I understanding this correctly?'" },
        ],
        color: "oklch(0.75 0.18 55)",
      },
      {
        id: "sb-modes",
        icon: "🔄",
        title: "Learning Modes",
        subtitle: "Different ways to engage with the AI",
        description:
          "Study Buddy supports several explicit modes you can request: Teach me (Socratic dialogue), Quiz me (generates questions on a topic), Debate me (takes the opposing view to stress-test your reasoning), and Brainstorm (open-ended exploration of ideas).",
        preview: [
          { label: "Socratic teaching", detail: "Guides you to discover answers" },
          { label: "Quiz mode", detail: "Tests your knowledge on any topic" },
          { label: "Debate mode", detail: "Argues the other side to sharpen thinking" },
        ],
        color: "oklch(0.72 0.20 310)",
      },
      {
        id: "sb-history",
        icon: "📜",
        title: "Conversation History",
        subtitle: "Your sessions are saved and searchable",
        description:
          "Every Study Buddy conversation is saved to your history. You can return to past sessions to review what you learned, continue a conversation where you left off, or search across sessions for a concept you discussed.",
        preview: [
          { label: "Full history", detail: "Every conversation saved" },
          { label: "Resume sessions", detail: "Pick up where you left off" },
          { label: "Search", detail: "Find concepts across all sessions" },
        ],
        color: "oklch(0.75 0.18 180)",
      },
    ],
  },

  // ── /testing ───────────────────────────────────────────────────────────────
  "/testing": {
    pageTitle: "Testing Center",
    accentColor: "oklch(0.72 0.20 310)",
    steps: [
      {
        id: "test-overview",
        icon: "🎯",
        title: "Testing Center",
        subtitle: "Measure and reinforce what you know",
        description:
          "The Testing Center lets you generate quizzes on any topic, from your study materials, or from specific courses you've taken. Tests give you immediate feedback, explanations, and performance data to identify exactly where your knowledge has gaps.",
        preview: [
          { label: "Any topic", detail: "Generate a quiz on anything" },
          { label: "From your content", detail: "Test based on uploaded material" },
          { label: "Performance tracking", detail: "See score trends over time" },
        ],
        color: "oklch(0.72 0.20 310)",
      },
      {
        id: "test-create",
        icon: "✨",
        title: "Creating a Test",
        subtitle: "Three ways to start",
        description:
          "Generate a quiz by: (1) typing any topic; (2) pasting text and letting Nexus write questions from it; or (3) selecting a course module to be tested on specifically. Choose the number of questions (5–50), difficulty level, and question type (multiple choice, true/false, short answer).",
        preview: [
          { label: "Topic-based", detail: "AI generates questions on any subject" },
          { label: "Text-based", detail: "From your notes or a document" },
          { label: "Course-linked", detail: "Tied to specific module content" },
        ],
        color: "oklch(0.72 0.20 310)",
      },
      {
        id: "test-taking",
        icon: "📝",
        title: "Taking the Test",
        subtitle: "Timed or untimed, immediate feedback",
        description:
          "Tests can be timed (optional) or open-ended. Answer each question and see immediate feedback: correct/incorrect, the right answer, and an explanation. You can flag questions to review at the end, or skip and return to them.",
        preview: [
          { label: "Immediate feedback", detail: "Know right away if you got it" },
          { label: "Explanations", detail: "Understand why the answer is correct" },
          { label: "Flag for review", detail: "Mark uncertain answers to revisit" },
        ],
        color: "oklch(0.75 0.18 180)",
      },
      {
        id: "test-analytics",
        icon: "📊",
        title: "Performance Analytics",
        subtitle: "Turn results into insight",
        description:
          "After each test, you see a full breakdown: overall score, time taken, which topics you got right and wrong, and how your score compares to your previous attempts. Retake any test to track improvement over time.",
        preview: [
          { label: "Topic breakdown", detail: "Which areas need work" },
          { label: "Score trends", detail: "Are you improving over attempts?" },
          { label: "Weak spot export", detail: "Convert wrong answers to flashcards" },
        ],
        color: "oklch(0.75 0.18 55)",
      },
    ],
  },

  // ── /dashboard ─────────────────────────────────────────────────────────────
  "/dashboard": {
    pageTitle: "Dashboard",
    accentColor: "oklch(0.75 0.18 180)",
    steps: [
      {
        id: "dash-overview",
        icon: "📊",
        title: "Your Dashboard",
        subtitle: "Your learning at a glance",
        description:
          "The Dashboard is your command center. It shows your XP level, current streak, activity calendar, performance trends, and a breakdown of what you've learned across Nexus. Everything here updates automatically as you use the platform.",
        preview: [
          { label: "XP & level", detail: "Your current rank and progress to next level" },
          { label: "Streak calendar", detail: "Daily activity for the past 90 days" },
          { label: "Learning breakdown", detail: "Time spent by subject and tool" },
        ],
        color: "oklch(0.75 0.18 180)",
      },
      {
        id: "dash-xp",
        icon: "⚡",
        title: "XP and Levels",
        subtitle: "How experience points work",
        description:
          "Every action in Nexus earns XP: completing a lesson, taking a test, finishing a flashcard session, completing a Daily Challenge, writing in Study Buddy. XP accumulates into levels, with each level requiring more XP than the last.",
        preview: [
          { label: "Lesson XP", detail: "50–125 XP per lesson depending on depth" },
          { label: "Daily Challenge", detail: "+25–75 XP with streak multiplier" },
          { label: "Quizzes & tests", detail: "XP based on score and difficulty" },
        ],
        color: "oklch(0.75 0.18 55)",
      },
      {
        id: "dash-streak",
        icon: "🔥",
        title: "Streak System",
        subtitle: "Reward for showing up every day",
        description:
          "Your streak counts consecutive days where you completed at least one learning activity. Streaks appear on your Dashboard, Profile, and Leaderboard. A streak freeze can protect your streak if you need to miss a day — check your profile settings.",
        preview: [
          { label: "Any activity counts", detail: "Lesson, quiz, flashcard, or challenge" },
          { label: "Streak milestones", detail: "7, 30, 100 day badges" },
          { label: "Freeze protection", detail: "One freeze available per week" },
        ],
        color: "oklch(0.72 0.20 310)",
      },
      {
        id: "dash-mastery",
        icon: "🏆",
        title: "Mastery Dashboard",
        subtitle: "Deep dive into your knowledge map",
        description:
          "Click 'Mastery' to open a detailed view of all concepts you've engaged with across Nexus — grouped by domain, with mastery scores based on test performance and spaced repetition data. This is where you see the full shape of what you know.",
        preview: [
          { label: "Concept map", detail: "Every topic you've touched" },
          { label: "Mastery scores", detail: "0–100% per concept, based on performance" },
          { label: "Knowledge gaps", detail: "Concepts to revisit highlighted" },
        ],
        color: "oklch(0.75 0.18 180)",
      },
    ],
  },

  // ── /library ───────────────────────────────────────────────────────────────
  "/library": {
    pageTitle: "Knowledge Library",
    accentColor: "oklch(0.75 0.18 55)",
    steps: [
      {
        id: "lib-overview",
        icon: "📚",
        title: "Knowledge Library",
        subtitle: "Curated resources with AI context",
        description:
          "The Knowledge Library is a curated collection of high-quality resources — articles, papers, videos, tools — organized by subject. Every resource has an AI-generated context note explaining what it is, why it matters, and how it connects to other topics.",
        preview: [
          { label: "Curated quality", detail: "Hand-selected for depth and accuracy" },
          { label: "AI context notes", detail: "Why this matters and what to know first" },
          { label: "All subjects", detail: "STEM, philosophy, history, business, arts" },
        ],
        color: "oklch(0.75 0.18 55)",
      },
      {
        id: "lib-browse",
        icon: "🔍",
        title: "Browse and Search",
        subtitle: "Find what you need quickly",
        description:
          "Browse by category (Science, Technology, Philosophy, History, etc.) or search by keyword. The search understands concepts, not just keywords — searching 'how memory works' finds neuroscience resources even if those exact words aren't in the title.",
        preview: [
          { label: "Category browsing", detail: "12 major subject areas" },
          { label: "Semantic search", detail: "Finds by concept, not just keywords" },
          { label: "Filter by format", detail: "Articles, papers, videos, tools" },
        ],
        color: "oklch(0.75 0.18 55)",
      },
      {
        id: "lib-save",
        icon: "🔖",
        title: "Save to Reading List",
        subtitle: "Build your personal collection",
        description:
          "Any resource in the Library can be saved to your Reading List with one click. Your Reading List (under My Nexus) keeps all saved resources — from the Library and from Research Forge sessions — in one place with your own notes.",
        preview: [
          { label: "One-click save", detail: "Bookmark any resource instantly" },
          { label: "Add personal notes", detail: "Annotate why you saved it" },
          { label: "Syncs with Research Forge", detail: "All saves appear in Reading List" },
        ],
        color: "oklch(0.72 0.20 310)",
      },
    ],
  },

  // ── /mindmap ───────────────────────────────────────────────────────────────
  "/mindmap": {
    pageTitle: "Mind Maps",
    accentColor: "oklch(0.75 0.18 180)",
    steps: [
      {
        id: "mm-overview",
        icon: "🗺️",
        title: "Mind Maps",
        subtitle: "Visualize how ideas connect",
        description:
          "The Mind Map tool lets you build visual concept maps — networks of ideas and relationships. Start from a central concept, branch out to subtopics, and connect related ideas across branches. Use it for studying, planning, or just thinking on a canvas.",
        preview: [
          { label: "Free-form canvas", detail: "Drag, connect, arrange freely" },
          { label: "AI expansion", detail: "Ask AI to suggest branches" },
          { label: "Export & share", detail: "PNG, SVG, or shareable link" },
        ],
        color: "oklch(0.75 0.18 180)",
      },
      {
        id: "mm-create",
        icon: "✏️",
        title: "Creating and Editing",
        subtitle: "How to build a map",
        description:
          "Double-click the canvas to create a new node. Drag from a node's edge to create a connected child node. Click a node to edit its label. Right-click for options: change color, add icon, delete, or duplicate. You can also import an outline from text.",
        preview: [
          { label: "Double-click to create", detail: "New nodes anywhere on canvas" },
          { label: "Drag to connect", detail: "Draw edges between any nodes" },
          { label: "Color-coded clusters", detail: "Group related concepts visually" },
        ],
        color: "oklch(0.75 0.18 180)",
      },
      {
        id: "mm-ai",
        icon: "🤖",
        title: "AI-Assisted Expansion",
        subtitle: "Let AI suggest branches",
        description:
          "Select any node and click 'Expand with AI'. Nexus generates 4–6 relevant subtopics or related concepts and attaches them as new branches. This is a great way to discover angles you hadn't thought of, or to rapidly scaffold a new topic.",
        preview: [
          { label: "Select + expand", detail: "Click any node, request expansion" },
          { label: "4–6 new branches", detail: "AI generates relevant subtopics" },
          { label: "Edit or delete", detail: "Keep what's useful, discard what isn't" },
        ],
        color: "oklch(0.72 0.20 310)",
      },
    ],
  },

  // ── /profile ───────────────────────────────────────────────────────────────
  "/profile": {
    pageTitle: "Profile",
    accentColor: "oklch(0.72 0.20 310)",
    steps: [
      {
        id: "profile-overview",
        icon: "🗺️",
        title: "Your Profile & Mind Map",
        subtitle: "A living map of your cognitive identity",
        description:
          "Your Profile is not just account settings — it's a detailed psychological and behavioral portrait built from how you use Nexus. The more you engage, the more precise it becomes. Everything here is private to you.",
        preview: [
          { label: "Trait radar chart", detail: "6 behavioral dimensions visualized" },
          { label: "Learning style", detail: "Inferred from your activity patterns" },
          { label: "All assessment results", detail: "Stored from Clarity" },
        ],
        color: "oklch(0.72 0.20 310)",
      },
      {
        id: "profile-traits",
        icon: "📡",
        title: "Behavioral Trait Radar",
        subtitle: "Six dimensions of how you learn",
        description:
          "The radar chart visualizes your scores on six behavioral dimensions inferred from your learning behavior: Curiosity Depth, Persistence, Systematic Thinking, Social Learning, Risk Tolerance, and Abstraction Preference. These update automatically.",
        preview: [
          { label: "Curiosity Depth", detail: "Do you explore broadly or go deep?" },
          { label: "Persistence", detail: "Do you push through difficulty?" },
          { label: "Abstraction", detail: "Do you prefer theory or applied?" },
        ],
        color: "oklch(0.72 0.20 310)",
      },
      {
        id: "profile-heatmap",
        icon: "🕐",
        title: "Study Heatmap",
        subtitle: "When your mind is sharpest",
        description:
          "The study heatmap shows your learning activity by day of week and hour of day, with intensity indicating how much you engaged. Over time, patterns emerge showing when you tend to be most productive — which you can use to schedule your hardest learning tasks.",
        preview: [
          { label: "Hour × day grid", detail: "168 cells showing your patterns" },
          { label: "Intensity overlay", detail: "Darker = more activity at that time" },
          { label: "Optimal window", detail: "Nexus highlights your peak hours" },
        ],
        color: "oklch(0.75 0.18 180)",
      },
      {
        id: "profile-settings",
        icon: "⚙️",
        title: "Account & Preferences",
        subtitle: "Control your Nexus experience",
        description:
          "Scroll down in your Profile to find account settings: display name, avatar, email, notification preferences, and privacy controls. You can also reset your onboarding tour, export your data, or delete your account from here.",
        preview: [
          { label: "Reset tour", detail: "Re-run the intro tour anytime" },
          { label: "Export data", detail: "Download everything Nexus has stored" },
          { label: "Privacy controls", detail: "Choose what's tracked and what isn't" },
        ],
        color: "oklch(0.75 0.18 55)",
      },
    ],
  },

};

// Pages that share the same tour (prefix match)
function getTourForPath(path: string): { pageTitle: string; accentColor: string; steps: TourStep[] } | null {
  // Exact match first
  if (PAGE_TOURS[path]) return PAGE_TOURS[path];
  // Prefix match (e.g. /dashboard/mastery → /dashboard)
  for (const key of Object.keys(PAGE_TOURS)) {
    if (path.startsWith(key) && key.length > 1) return PAGE_TOURS[key];
  }
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PageTourOverlay() {
  const { showPageTour, closePageTour, openMainTour } = useTour();
  const [step, setStep] = useState(0);
  const [location] = useLocation();

  const tour = getTourForPath(location);

  // Reset step when tour opens or page changes
  useEffect(() => {
    if (showPageTour) setStep(0);
  }, [showPageTour, location]);

  if (!showPageTour || !tour) return null;

  const { steps, accentColor } = tour;
  const current = steps[step];
  const isLast = step === steps.length - 1;
  const isFirst = step === 0;

  const dismiss = () => closePageTour();

  const handleSwitchToMain = () => {
    closePageTour();
    openMainTour();
  };

  return (
    <AnimatePresence>
      {showPageTour && tour && (
        <motion.div
          key="page-tour-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "oklch(0.04 0.010 255 / 0.82)",
            backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "16px",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.97 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              style={{
                width: "100%", maxWidth: 560,
                borderRadius: 20,
                border: `1px solid ${current.color}40`,
                background: "var(--surface-1, oklch(0.10 0.014 255))",
                boxShadow: `0 0 60px ${current.color}18, 0 24px 80px oklch(0 0 0 / 0.5)`,
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
                title="Close tour"
              >
                <X size={13} />
              </button>

              {/* Body */}
              <div style={{ padding: "28px 32px 20px" }}>
                {/* Step badge */}
                <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase",
                    padding: "3px 10px", borderRadius: 20,
                    background: `${current.color}20`, color: current.color,
                  }}>
                    {tour.pageTitle} Guide · {isLast ? "Done!" : `Step ${step + 1} of ${steps.length}`}
                  </span>
                </div>

                {/* Icon + title */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                    background: `${current.color}18`, border: `1px solid ${current.color}30`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
                  }}>
                    {current.icon}
                  </div>
                  <div style={{ paddingTop: 2 }}>
                    <h2 style={{ fontWeight: 800, fontSize: 19, color: "var(--foreground)", lineHeight: 1.2, marginBottom: 4 }}>
                      {current.title}
                    </h2>
                    {current.subtitle && (
                      <p style={{ fontSize: 11, color: current.color, fontWeight: 600, letterSpacing: 0.3 }}>
                        {current.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p style={{ fontSize: 14, color: "var(--muted-foreground)", lineHeight: 1.7, marginBottom: 16 }}>
                  {current.description}
                </p>

                {/* Feature preview pills */}
                {current.preview && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
                    {current.preview.map(({ label, detail }) => (
                      <div key={label} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 12px", borderRadius: 10,
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
              </div>

              {/* Footer */}
              <div style={{
                padding: "14px 32px 20px",
                borderTop: "1px solid var(--border)",
              }}>
                {/* Progress dots + nav */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                  <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                    {steps.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setStep(i)}
                        style={{
                          width: i === step ? 18 : 6,
                          height: 6, borderRadius: 3,
                          background: i === step ? current.color : "var(--border)",
                          border: "none", cursor: "pointer", padding: 0,
                          transition: "all 0.2s",
                        }}
                      />
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    {!isFirst && (
                      <button
                        onClick={() => setStep((s) => s - 1)}
                        style={{
                          display: "flex", alignItems: "center", gap: 4,
                          padding: "7px 12px", borderRadius: 10, fontSize: 13,
                          background: "transparent", border: "1px solid var(--border)",
                          color: "var(--muted-foreground)", cursor: "pointer",
                        }}
                      >
                        <ChevronLeft size={13} /> Back
                      </button>
                    )}

                    {isLast ? (
                      <button
                        onClick={dismiss}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "8px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                          background: current.color, color: "#000",
                          border: "none", cursor: "pointer",
                        }}
                      >
                        Got it! ✓
                      </button>
                    ) : (
                      <button
                        onClick={() => setStep((s) => s + 1)}
                        style={{
                          display: "flex", alignItems: "center", gap: 4,
                          padding: "7px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                          background: current.color, color: "#000",
                          border: "none", cursor: "pointer",
                        }}
                      >
                        Next <ChevronRight size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Link to main tour */}
                <div style={{ textAlign: "center" }}>
                  <button
                    onClick={handleSwitchToMain}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      fontSize: 12, color: "var(--muted-foreground)",
                      background: "transparent", border: "none", cursor: "pointer",
                      padding: "4px 8px", borderRadius: 6,
                      textDecoration: "none",
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--foreground)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--muted-foreground)"}
                  >
                    <Map size={11} />
                    View the full Nexus site overview instead
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
