import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, BookOpen, Lightbulb, Shield, Trophy, ChevronRight,
  ChevronLeft, CheckCircle2, XCircle, Play, Pause, Volume2,
  VolumeX, RotateCcw, Star, Clock,
  MessageSquare, Zap, Check, Target, Sparkles,
  Eye, RefreshCw, Send, Award, Lock,
  ChevronDown, Info, HelpCircle
} from "lucide-react";
import PageWrapper from "@/components/PageWrapper";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { AdaptiveLessonView } from "@/components/lesson/AdaptiveLessonView";

// --- Types -------------------------------------------------------------------
type LessonId = 1 | 2 | 3 | 4 | 5;

interface LessonMeta {
  id: LessonId;
  title: string;
  subtitle: string;
  duration: string;
  icon: React.ReactNode;
  color: string;
  mayer: string;  // Mayer principle highlighted
  xp: number;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  myth?: boolean; // true = this IS a myth
}

interface PromptExercise {
  id: string;
  title: string;
  scenario: string;
  vague: string;
  hint: string;
  rubric: string[];
}

interface EthicsScenario {
  id: string;
  title: string;
  setup: string;
  stakeholders: { name: string; concern: string }[];
  discussion: string;
}

// --- Lesson Metadata ---------------------------------------------------------
const LESSONS: LessonMeta[] = [
  {
    id: 1, title: "What Is AI?", subtitle: "Demystifying the technology reshaping our world",
    duration: "25 min", icon: <Brain size={20} />, color: "oklch(0.75_0.18_55)",
    mayer: "Coherence + Segmenting", xp: 50,
  },
  {
    id: 2, title: "Myths vs. Reality", subtitle: "Separating science fiction from science fact",
    duration: "20 min", icon: <Eye size={20} />, color: "oklch(0.65_0.22_200)",
    mayer: "Personalization + Redundancy", xp: 60,
  },
  {
    id: 3, title: "Prompt Engineering", subtitle: "Speak AI fluently — craft prompts that work",
    duration: "30 min", icon: <Zap size={20} />, color: "oklch(0.72_0.2_290)",
    mayer: "Interactivity + Guided Discovery", xp: 80,
  },
  {
    id: 4, title: "Ethics & Society", subtitle: "Navigating the human side of artificial intelligence",
    duration: "25 min", icon: <Shield size={20} />, color: "oklch(0.72_0.18_150)",
    mayer: "Embodied Cognition + Dialogue", xp: 70,
  },
  {
    id: 5, title: "Putting It Together", subtitle: "Apply everything — your AI literacy capstone",
    duration: "20 min", icon: <Trophy size={20} />, color: "oklch(0.78_0.16_30)",
    mayer: "Signaling + Coherence", xp: 100,
  },
];

// --- Quiz Data ----------------------------------------------------------------
const MYTH_QUIZ: QuizQuestion[] = [
  {
    id: "m1", question: "AI systems like ChatGPT are conscious and have feelings.",
    options: ["True — they learn from human emotion", "False — they process patterns, not feelings", "Partly true — they simulate empathy", "Scientists disagree on this"],
    correct: 1, myth: true,
    explanation: "LLMs are statistical pattern-matchers. They predict likely next tokens based on training data. There is no subjective experience, emotion, or consciousness — however convincing the output feels."
  },
  {
    id: "m2", question: "AI will replace ALL jobs within the next decade.",
    options: ["True — automation always eliminates jobs", "False — it transforms and creates new roles too", "Only blue-collar jobs are at risk", "Only white-collar jobs are at risk"],
    correct: 1, myth: true,
    explanation: "History shows that automation displaces tasks, not entire occupations. New jobs emerge (AI trainers, auditors, designers). The risk is real for some roles but 'all jobs' is an overstatement with no economic consensus."
  },
  {
    id: "m3", question: "What does 'machine learning' actually mean?",
    options: ["A robot physically learning to walk", "Algorithms improving from data without explicit rules", "A computer memorizing a textbook", "Software that mimics human thought step by step"],
    correct: 1, myth: false,
    explanation: "Machine learning finds patterns in data to make predictions or decisions — without being explicitly programmed with every rule. It's statistics at scale, not a digital brain."
  },
  {
    id: "m4", question: "AI is 100% objective because it's just math.",
    options: ["True — algorithms can't be biased", "False — AI inherits bias from training data and designers", "True — bias is a human problem only", "Partially true for supervised learning"],
    correct: 1, myth: true,
    explanation: "AI reflects what's in its training data. If historical data encodes racial, gender, or socioeconomic bias, the model will too. 'It's just math' doesn't eliminate human bias — it can amplify it at scale."
  },
  {
    id: "m5", question: "Which of these best describes a Large Language Model (LLM)?",
    options: ["A database that looks up answers", "A model trained to predict the next most likely word/token", "A program that understands language like a human", "A search engine with a chat interface"],
    correct: 1, myth: false,
    explanation: "LLMs are trained on enormous text corpora to predict what comes next, token by token. They don't 'understand' in a human sense — they model statistical relationships between words with remarkable results."
  },
  {
    id: "m6", question: "AI systems always give accurate, truthful answers.",
    options: ["True — they're trained on verified data", "False — they can 'hallucinate' plausible-sounding falsehoods", "True if you use a premium tier", "Only false for open-source models"],
    correct: 1, myth: true,
    explanation: "AI hallucination is a well-documented phenomenon: models produce confident-sounding but factually wrong answers because they optimize for plausibility, not truth. Always verify critical AI-generated claims."
  },
];

const DEFINITIONS_QUIZ: QuizQuestion[] = [
  {
    id: "d1", question: "AI stands for:",
    options: ["Automated Intelligence", "Artificial Intelligence", "Advanced Integration", "Algorithmic Interface"],
    correct: 1,
    explanation: "Artificial Intelligence — the simulation of human-like reasoning by machines, encompassing machine learning, natural language processing, computer vision, and more."
  },
  {
    id: "d2", question: "Which term describes AI that can perform any intellectual task a human can?",
    options: ["Narrow AI", "Strong AI / AGI", "Supervised Learning", "Neural Network"],
    correct: 1,
    explanation: "Artificial General Intelligence (AGI) is hypothetical AI that matches human cognitive flexibility across all domains. Today's AI is narrow — excellent at specific tasks, brittle outside them."
  },
  {
    id: "d3", question: "A 'neural network' in AI is inspired by:",
    options: ["Internet networks", "Electrical grids", "The human brain's neuron structure", "Social networks"],
    correct: 2,
    explanation: "Neural networks use layers of interconnected nodes (loosely inspired by neurons and synapses) that learn to recognize patterns through training. Deep learning = many such layers."
  },
  {
    id: "d4", question: "When an AI is 'trained', what happens?",
    options: ["It reads a manual written by engineers", "It adjusts its parameters by processing large amounts of data", "It copies a human's behavior directly", "Engineers manually program every rule"],
    correct: 1,
    explanation: "Training is the process where a model processes data, makes predictions, receives feedback (via loss functions), and adjusts millions/billions of numerical weights to improve future predictions."
  },
];

// --- Prompt Engineering Exercises --------------------------------------------
const PROMPT_EXERCISES: PromptExercise[] = [
  {
    id: "p1",
    title: "The Job Application Letter",
    scenario: "You need to write a cover letter for a marketing manager position at a tech startup. You have 5 years of experience in digital marketing and led a team that grew social media by 300%.",
    vague: "Write me a cover letter.",
    hint: "Add: role + company type, your specific achievements, desired tone, length, and what to emphasize.",
    rubric: ["Specifies the role and company type", "Includes at least one concrete achievement with a number", "States desired tone (professional, energetic, etc.)", "Mentions approximate length or format"],
  },
  {
    id: "p2",
    title: "Explaining to a Family Member",
    scenario: "Your 70-year-old grandmother asks you to have AI explain what a 'blockchain' is. She's comfortable with everyday technology but not technical jargon.",
    vague: "Explain blockchain.",
    hint: "Use: persona instruction, audience description, analogy request, length limit, and plain language requirement.",
    rubric: ["Specifies the audience (older adult, non-technical)", "Requests an analogy or comparison to something familiar", "Sets a length limit (e.g., 3 sentences or 100 words)", "Explicitly says 'no jargon' or 'plain language'"],
  },
  {
    id: "p3",
    title: "Brainstorming Business Names",
    scenario: "You're starting a local bakery that specializes in sourdough bread and pastries. You want a name that feels warm, artisan, and slightly whimsical — not corporate.",
    vague: "Give me bakery names.",
    hint: "Specify: specialty, tone/mood, style (modern vs. vintage), and ask for a certain number with brief reasoning for each.",
    rubric: ["Describes the bakery's specialty (sourdough, pastries)", "Describes the desired tone or mood", "Specifies how many options (e.g., 10 names)", "Asks for a brief reason/explanation per name"],
  },
];

// --- Ethics Scenarios ---------------------------------------------------------
const ETHICS_SCENARIOS: EthicsScenario[] = [
  {
    id: "e1",
    title: "The Hiring Algorithm",
    setup: "A major employer uses an AI system to screen 50,000 job applications. The AI was trained on 10 years of hiring data. An audit reveals it consistently scores women 15% lower for engineering roles — because historically, fewer women were hired for those roles.",
    stakeholders: [
      { name: "Job Applicant (Female Engineer)", concern: "Qualified but unfairly filtered out before a human ever sees her application." },
      { name: "HR Manager", concern: "Trusts the system to be objective, didn't know about the bias, and is now liable." },
      { name: "AI Developer", concern: "Trained on available data; wasn't asked to audit for demographic parity." },
      { name: "Company CEO", concern: "Wants efficiency AND legal compliance. A lawsuit could cost millions." },
    ],
    discussion: "Who is responsible? Should the system be halted immediately? Can 'debiasing' the training data solve the problem — or does it require rethinking the data entirely? What oversight should exist before deploying AI in high-stakes decisions?"
  },
  {
    id: "e2",
    title: "The Medical Chatbot",
    setup: "A hospital deploys an AI chatbot that triages patients based on symptom descriptions. It routes people to the ER, urgent care, or home care. Studies show it performs well on average — but has higher error rates for patients who describe symptoms in informal English or non-standard dialects.",
    stakeholders: [
      { name: "Patient (Non-native English speaker)", concern: "Risk of being incorrectly triaged to home care when ER is needed." },
      { name: "ER Nurse", concern: "Overwhelmed if the AI sends everyone to ER; undertrained if it filters too aggressively." },
      { name: "Hospital Administrator", concern: "Reduced wait times and cost — but liability for AI errors." },
      { name: "Regulator (FDA)", concern: "AI medical devices need approval. What testing standard applies here?" },
    ],
    discussion: "Should language-unequal AI be deployed in healthcare at all? What minimum accuracy threshold across all demographic groups should be required? Who bears responsibility when an AI misdiagnosis leads to patient harm?"
  },
  {
    id: "e3",
    title: "The AI Tutor at School",
    setup: "A school district deploys an AI writing tutor that gives feedback on student essays. It's personalized, available 24/7, and teachers report improved grades. But a parent discovers the system stores all student writing indefinitely and the company's privacy policy allows using this data to train future models.",
    stakeholders: [
      { name: "Student (14 years old)", concern: "Their personal writing, opinions, and struggles are data — forever." },
      { name: "Teacher", concern: "Great tool, but didn't consent students to data collection as part of using it." },
      { name: "Parent", concern: "Their child's data is being used commercially without informed consent." },
      { name: "EdTech Company", concern: "Student data is core to improving the product. Anonymization is expensive." },
    ],
    discussion: "Does 'better learning outcomes' justify data collection from minors? Should there be a legal right to be forgotten for student data? What's the difference between anonymized and de-identified data — and does it matter?"
  },
];

// --- Narrator Component (Mayer: Modality Principle) --------------------------
function Narrator({ text, autoPlay = false }: { text: string; autoPlay?: boolean }) {
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback(() => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.92;
    utter.pitch = 1.0;
    utter.volume = muted ? 0 : 1;
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    utterRef.current = utter;
    setSpeaking(true);
    window.speechSynthesis.speak(utter);
  }, [text, muted]);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  useEffect(() => {
    if (autoPlay && !muted) speak();
    return () => { window.speechSynthesis?.cancel(); setSpeaking(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay]);

  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-[oklch(0.75_0.18_55_/_0.08)] border border-[oklch(0.75_0.18_55_/_0.2)]">
      <div className="flex items-center gap-1">
        {speaking ? (
          <motion.div className="flex items-end gap-0.5 h-4" aria-label="Audio playing">
            {[0, 1, 2, 3].map((i) => (
              <motion.div key={i} className="w-1 bg-[oklch(0.75_0.18_55)] rounded-full"
                animate={{ height: ["4px", "14px", "4px"] }}
                transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }} />
            ))}
          </motion.div>
        ) : (
          <Volume2 size={14} className="text-[oklch(0.75_0.18_55)]" />
        )}
      </div>
      <span className="text-xs text-muted-foreground flex-1">AI Narrator</span>
      <div className="flex items-center gap-1.5">
        <button onClick={() => setMuted(!muted)}
          className="p-1 rounded-md hover:bg-white/10 text-muted-foreground transition-colors"
          aria-label={muted ? "Unmute" : "Mute"}>
          {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
        </button>
        {speaking ? (
          <button onClick={stop}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 text-xs text-foreground hover:bg-white/15 transition-colors">
            <Pause size={11} /> Stop
          </button>
        ) : (
          <button onClick={speak}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[oklch(0.75_0.18_55_/_0.2)] border border-[oklch(0.75_0.18_55_/_0.3)] text-xs text-[oklch(0.85_0.18_55)] hover:bg-[oklch(0.75_0.18_55_/_0.3)] transition-colors">
            <Play size={11} /> Listen
          </button>
        )}
      </div>
    </div>
  );
}

// --- Progress Badge -----------------------------------------------------------
function ProgressBadge({ completed, total }: { completed: number; total: number }) {
  const pct = Math.round((completed / total) * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <Progress value={pct} className="h-2" />
      </div>
      <span className="text-xs text-muted-foreground shrink-0">{completed}/{total} lessons</span>
    </div>
  );
}

// --- Lesson Shell -------------------------------------------------------------
function LessonShell({
  meta, children, onComplete, completed,
}: {
  meta: LessonMeta;
  children: React.ReactNode;
  onComplete: () => void;
  completed: boolean;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
      {/* Header */}
      <div className="glass rounded-2xl p-6 border border-white/8 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${meta.color.replace("oklch(", "oklch(").replace(")", "_/_0.15)")}`, border: `1px solid ${meta.color.replace("oklch(", "oklch(").replace(")", "_/_0.3)")}` }}>
              <span style={{ color: meta.color }}>{meta.icon}</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/8 border border-white/10 text-muted-foreground">
                  Mayer: {meta.mayer}
                </span>
              </div>
              <h2 className="text-xl font-bold text-foreground">{meta.title}</h2>
              <p className="text-sm text-muted-foreground">{meta.subtitle}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock size={11} /> {meta.duration}
            </span>
            <span className="flex items-center gap-1 text-xs text-[oklch(0.75_0.18_55)]">
              <Zap size={11} /> +{meta.xp} XP
            </span>
            {completed && (
              <span className="flex items-center gap-1 text-xs text-[oklch(0.72_0.18_150)] font-medium">
                <CheckCircle2 size={11} /> Complete
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      {children}

      {/* Complete CTA */}
      {!completed && (
        <motion.div className="mt-8 pt-6 border-t border-white/8"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <motion.button onClick={onComplete}
            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
            className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-[oklch(0.75_0.18_55)] to-[oklch(0.65_0.22_200)] text-black transition-opacity">
            <CheckCircle2 size={16} /> Mark Lesson Complete & Earn {meta.xp} XP
          </motion.button>
        </motion.div>
      )}
      {completed && (
        <div className="mt-8 pt-6 border-t border-white/8 flex items-center justify-center gap-2 text-sm text-[oklch(0.72_0.18_150)]">
          <Award size={16} /> Lesson completed — great work!
        </div>
      )}
    </motion.div>
  );
}

// --- Lesson 1: What Is AI? ----------------------------------------------------
function Lesson1({ onComplete, completed }: { onComplete: () => void; completed: boolean }) {
  const [activeSegment, setActiveSegment] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showExp, setShowExp] = useState(false);
  const [score, setScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);

  const segments = [
    {
      title: "The 60-Second Definition",
      narration: "Artificial Intelligence is the ability of a computer system to perform tasks that typically require human intelligence — things like understanding language, recognizing patterns, making decisions, and learning from experience.",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Artificial Intelligence</strong> is the ability of a computer system to perform tasks that typically require human intelligence — understanding language, recognizing patterns, making decisions, and <em>learning from experience</em>.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
            {[
              { label: "Narrow AI", desc: "Excels at one specific task (e.g., chess, image recognition, language translation). All AI today is narrow.", icon: "\u{1F3AF}" },
              { label: "Machine Learning", desc: "A subfield of AI where systems learn from data rather than explicit rules.", icon: "\u{1F4CA}" },
              { label: "Deep Learning", desc: "ML using layered neural networks — the engine behind LLMs, image AI, and voice recognition.", icon: "\u{1F9E0}" },
              { label: "LLMs", desc: "Large Language Models like ChatGPT — trained on vast text to generate and understand language.", icon: "\u{1F4AC}" },
            ].map(({ label, desc, icon }) => (
              <div key={label} className="glass rounded-xl p-4 border border-white/8">
                <div className="text-2xl mb-2">{icon}</div>
                <div className="font-semibold text-sm text-foreground mb-1">{label}</div>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: "How AI Actually Learns",
      narration: "Think of training an AI like teaching a dog, but at a scale of billions of examples. You show it inputs and correct outputs. It adjusts its internal numbers to get better. Then you test it on things it's never seen before.",
      content: (
        <div className="space-y-5">
          <p className="text-muted-foreground leading-relaxed">
            Training is the core process. The model sees data, makes a prediction, receives feedback on how wrong it was (the "loss"), and adjusts millions of internal numbers (weights) to improve. Repeat billions of times.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch gap-2">
            {[
              { step: "1", label: "Data In", desc: "Text, images, audio — vast amounts", color: "oklch(0.75_0.18_55)" },
              { step: "?", label: "", desc: "", color: "transparent" },
              { step: "2", label: "Prediction", desc: "Model guesses the output", color: "oklch(0.65_0.22_200)" },
              { step: "?", label: "", desc: "", color: "transparent" },
              { step: "3", label: "Feedback", desc: "How wrong was it? (loss)", color: "oklch(0.72_0.2_290)" },
              { step: "?", label: "", desc: "", color: "transparent" },
              { step: "4", label: "Adjustment", desc: "Update weights \u2192 repeat", color: "oklch(0.72_0.18_150)" },
            ].map(({ step, label, desc, color }, i) => (
              step === "?"
                ? <div key={i} className="hidden sm:flex items-center justify-center text-muted-foreground self-center"><ChevronRight size={16} /></div>
                : <div key={i} className="flex-1 glass rounded-xl p-3 border border-white/8 text-center">
                  <div className="text-lg font-bold mb-1" style={{ color }}>{step}</div>
                  <div className="text-xs font-semibold text-foreground mb-0.5">{label}</div>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
            ))}
          </div>
          <div className="glass rounded-xl p-4 border border-[oklch(0.75_0.18_55_/_0.2)]">
            <div className="flex items-start gap-2">
              <Info size={14} className="text-[oklch(0.75_0.18_55)] mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Key insight:</strong> AI doesn't "understand" the way humans do. It finds statistical patterns so strong that the outputs look like understanding. This is why it can be brilliant at some things and completely wrong about others.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "The AI Landscape Today",
      narration: "We are living through the most rapid technological transition in history. In just five years, AI has moved from a research curiosity to a tool used by hundreds of millions of people every day. Understanding what it is, and what it isn't, is now a basic literacy skill.",
      content: (
        <div className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            In 2024 alone, over <strong className="text-foreground">200 million people</strong> used AI writing tools. Hospitals use AI for diagnosis. Courts use it for bail recommendations. Teachers use it for grading feedback. AI literacy isn't just for technologists — it's civic literacy.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { domain: "Healthcare", uses: "Medical imaging, drug discovery, symptom triage, treatment recommendations", risk: "Misdiagnosis at scale, bias in datasets" },
              { domain: "Education", uses: "Personalized tutoring, essay feedback, automated grading, accessibility tools", risk: "Academic dishonesty, over-reliance, surveillance" },
              { domain: "Work", uses: "Code generation, document drafting, customer service, logistics optimization", risk: "Job displacement, deskilling, quality control" },
            ].map(({ domain, uses, risk }) => (
              <div key={domain} className="glass rounded-xl p-4 border border-white/8">
                <div className="font-semibold text-sm text-foreground mb-2">{domain}</div>
                <p className="text-xs text-muted-foreground mb-2 leading-relaxed"><strong>Uses:</strong> {uses}</p>
                <p className="text-xs text-[oklch(0.72_0.18_150)] leading-relaxed"><strong>Risks:</strong> {risk}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ];

  const handleAnswer = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    setShowExp(true);
    if (idx === DEFINITIONS_QUIZ[qIndex].correct) setScore(s => s + 1);
  };

  const handleNext = () => {
    if (qIndex + 1 < DEFINITIONS_QUIZ.length) {
      setQIndex(q => q + 1);
      setSelected(null);
      setShowExp(false);
    } else {
      setQuizDone(true);
    }
  };

  return (
    <LessonShell meta={LESSONS[0]} onComplete={onComplete} completed={completed}>
      {/* Mayer Segmenting: chunked content with explicit navigation */}
      <div className="space-y-6">
        {/* Segment Navigator */}
        <div className="flex gap-2">
          {segments.map((seg, i) => (
            <button key={i} onClick={() => setActiveSegment(i)}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all border ${activeSegment === i
                ? "bg-[oklch(0.75_0.18_55_/_0.15)] border-[oklch(0.75_0.18_55_/_0.4)] text-[oklch(0.85_0.18_55)]"
                : "glass border-white/8 text-muted-foreground hover:border-white/15"
                }`}>
              {i + 1}. {seg.title}
            </button>
          ))}
        </div>

        {/* Segment Content */}
        <AnimatePresence mode="wait">
          <motion.div key={activeSegment}
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
            className="glass rounded-2xl p-6 border border-white/8">
            <h3 className="text-lg font-semibold text-foreground mb-4">{segments[activeSegment].title}</h3>
            <Narrator text={segments[activeSegment].narration} />
            <div className="mt-5">{segments[activeSegment].content}</div>
          </motion.div>
        </AnimatePresence>

        {/* Segment nav */}
        <div className="flex items-center justify-between">
          <button onClick={() => setActiveSegment(Math.max(0, activeSegment - 1))}
            disabled={activeSegment === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg glass border border-white/8 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors">
            <ChevronLeft size={14} /> Previous
          </button>
          {activeSegment < segments.length - 1
            ? <button onClick={() => setActiveSegment(activeSegment + 1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[oklch(0.75_0.18_55_/_0.15)] border border-[oklch(0.75_0.18_55_/_0.3)] text-sm text-[oklch(0.85_0.18_55)] hover:bg-[oklch(0.75_0.18_55_/_0.25)] transition-colors">
              Next Segment <ChevronRight size={14} />
            </button>
            : !quizStarted && (
              <button onClick={() => setQuizStarted(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-[oklch(0.75_0.18_55)] to-[oklch(0.65_0.22_200)] text-black text-sm font-semibold transition-opacity hover:opacity-90">
                Start Knowledge Check <ChevronRight size={14} />
              </button>
            )
          }
        </div>

        {/* Quiz (Mayer: Testing Effect) */}
        <AnimatePresence>
          {quizStarted && !quizDone && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-6 border border-[oklch(0.75_0.18_55_/_0.2)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Knowledge Check</h3>
                <span className="text-xs text-muted-foreground">{qIndex + 1} / {DEFINITIONS_QUIZ.length}</span>
              </div>
              <Progress value={((qIndex) / DEFINITIONS_QUIZ.length) * 100} className="h-1.5 mb-5" />
              <p className="text-sm font-medium text-foreground mb-4">{DEFINITIONS_QUIZ[qIndex].question}</p>
              <div className="space-y-2">
                {DEFINITIONS_QUIZ[qIndex].options.map((opt, i) => (
                  <button key={i} onClick={() => handleAnswer(i)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm border transition-all ${selected === null
                      ? "glass border-white/10 text-foreground hover:border-white/25 hover:bg-white/5"
                      : i === DEFINITIONS_QUIZ[qIndex].correct
                        ? "bg-[oklch(0.72_0.18_150_/_0.15)] border-[oklch(0.72_0.18_150_/_0.4)] text-foreground"
                        : selected === i
                          ? "bg-[oklch(0.72_0.2_290_/_0.15)] border-[oklch(0.72_0.2_290_/_0.3)] text-muted-foreground"
                          : "glass border-white/5 text-muted-foreground opacity-60"
                      }`}>
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs border border-current shrink-0">
                        {String.fromCharCode(65 + i)}
                      </span>
                      {opt}
                      {selected !== null && i === DEFINITIONS_QUIZ[qIndex].correct && (
                        <CheckCircle2 size={14} className="ml-auto text-[oklch(0.72_0.18_150)] shrink-0" />
                      )}
                      {selected === i && i !== DEFINITIONS_QUIZ[qIndex].correct && (
                        <XCircle size={14} className="ml-auto text-[oklch(0.72_0.2_290)] shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <AnimatePresence>
                {showExp && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    className="mt-4 p-4 rounded-xl bg-[oklch(0.75_0.18_55_/_0.06)] border border-[oklch(0.75_0.18_55_/_0.15)]">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      <span className="font-semibold text-foreground">Explanation: </span>
                      {DEFINITIONS_QUIZ[qIndex].explanation}
                    </p>
                    <button onClick={handleNext}
                      className="mt-3 flex items-center gap-1 text-xs font-medium text-[oklch(0.75_0.18_55)] hover:opacity-80 transition-opacity">
                      {qIndex + 1 < DEFINITIONS_QUIZ.length ? "Next question" : "See results"} <ChevronRight size={12} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
          {quizDone && (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
              className="glass rounded-2xl p-6 border border-[oklch(0.75_0.18_55_/_0.3)] text-center">
              <div className="text-4xl mb-3">
                {score === DEFINITIONS_QUIZ.length ? "\u{1F3C6}" : score >= DEFINITIONS_QUIZ.length / 2 ? "\u{1F44D}" : "\u{1F4D6}"}
              </div>
              <h3 className="text-xl font-bold text-foreground mb-1">
                {score}/{DEFINITIONS_QUIZ.length} Correct
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {score === DEFINITIONS_QUIZ.length ? "Perfect score — you've got this!" : score >= DEFINITIONS_QUIZ.length / 2 ? "Solid foundation — keep going!" : "Good effort — the next lesson will reinforce these concepts."}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </LessonShell>
  );
}

// --- Lesson 2: Myths vs. Reality ---------------------------------------------
function Lesson2({ onComplete, completed }: { onComplete: () => void; completed: boolean }) {
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showExp, setShowExp] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);

  const handleAnswer = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    setShowExp(true);
    if (idx === MYTH_QUIZ[qIndex].correct) setScore(s => s + 1);
  };

  const handleNext = () => {
    if (qIndex + 1 < MYTH_QUIZ.length) {
      setQIndex(q => q + 1);
      setSelected(null);
      setShowExp(false);
    } else {
      setDone(true);
    }
  };

  const reset = () => {
    setQIndex(0); setSelected(null); setShowExp(false);
    setScore(0); setDone(false); setStarted(true);
  };

  const q = MYTH_QUIZ[qIndex];

  return (
    <LessonShell meta={LESSONS[1]} onComplete={onComplete} completed={completed}>
      <div className="space-y-6">
        {/* Intro */}
        <div className="glass rounded-2xl p-6 border border-white/8">
          <Narrator text="This lesson debunks the most common AI myths through active testing. For each statement, decide whether it's fact or fiction. The explanation afterward will tell you why — and that's where the real learning happens." />
          <div className="mt-5 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              Media coverage of AI swings between panic and hype. Both distort reality. To think clearly about AI — as a worker, voter, parent, or citizen — you need to separate what AI actually does from what people <em>imagine</em> it does.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: "Media Fear", text: "\"Robots will take over.\" \"AI is sentient.\" \"AI never makes mistakes.\"", color: "oklch(0.72_0.2_290)" },
                { label: "Reality", text: "Narrow tools, statistical pattern-matching, useful but brittle, trained — not conscious.", color: "oklch(0.72_0.18_150)" },
                { label: "Media Hype", text: "\"AI will solve cancer.\" \"AI reads minds.\" \"AI is 100% objective.\"", color: "oklch(0.78_0.16_30)" },
              ].map(({ label, text, color }) => (
                <div key={label} className="glass rounded-xl p-4 border border-white/8">
                  <div className="text-xs font-semibold mb-2" style={{ color }}>{label}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quiz */}
        {!started && !done && (
          <div className="text-center py-4">
            <motion.button onClick={() => setStarted(true)}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-[oklch(0.65_0.22_200)] to-[oklch(0.72_0.2_290)] text-white font-semibold text-sm inline-flex items-center gap-2">
              <Brain size={16} /> Start Myth-Buster Quiz ({MYTH_QUIZ.length} questions)
            </motion.button>
          </div>
        )}

        <AnimatePresence>
          {started && !done && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-6 border border-[oklch(0.65_0.22_200_/_0.2)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">Myth Buster</h3>
                  {q.myth !== undefined && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${q.myth
                      ? "bg-[oklch(0.72_0.2_290_/_0.1)] border-[oklch(0.72_0.2_290_/_0.3)] text-[oklch(0.72_0.2_290)]"
                      : "bg-[oklch(0.72_0.18_150_/_0.1)] border-[oklch(0.72_0.18_150_/_0.3)] text-[oklch(0.72_0.18_150)]"
                    }`}>
                      {q.myth ? "Myth?" : "Fact?"}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{qIndex + 1} / {MYTH_QUIZ.length}</span>
              </div>
              <Progress value={(qIndex / MYTH_QUIZ.length) * 100} className="h-1.5 mb-5" />

              <p className="text-base font-medium text-foreground mb-5 leading-snug">{q.question}</p>

              <div className="space-y-2">
                {q.options.map((opt, i) => (
                  <button key={i} onClick={() => handleAnswer(i)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm border transition-all ${selected === null
                      ? "glass border-white/10 text-foreground hover:border-white/25 hover:bg-white/5"
                      : i === q.correct
                        ? "bg-[oklch(0.72_0.18_150_/_0.15)] border-[oklch(0.72_0.18_150_/_0.4)] text-foreground"
                        : selected === i
                          ? "bg-[oklch(0.72_0.2_290_/_0.1)] border-[oklch(0.72_0.2_290_/_0.3)] text-muted-foreground"
                          : "glass border-white/5 text-muted-foreground opacity-50"
                      }`}>
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs border border-current shrink-0">
                        {String.fromCharCode(65 + i)}
                      </span>
                      {opt}
                      {selected !== null && i === q.correct && <Check size={13} className="ml-auto text-[oklch(0.72_0.18_150)] shrink-0" />}
                      {selected === i && i !== q.correct && <XCircle size={13} className="ml-auto text-[oklch(0.72_0.2_290)] shrink-0" />}
                    </div>
                  </button>
                ))}
              </div>

              <AnimatePresence>
                {showExp && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    className="mt-4 p-4 rounded-xl bg-[oklch(0.65_0.22_200_/_0.06)] border border-[oklch(0.65_0.22_200_/_0.15)]">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      <span className="font-semibold text-foreground">Why: </span>{q.explanation}
                    </p>
                    <button onClick={handleNext}
                      className="mt-3 flex items-center gap-1 text-xs font-medium text-[oklch(0.65_0.22_200)] hover:opacity-80 transition-opacity">
                      {qIndex + 1 < MYTH_QUIZ.length ? "Next statement" : "See final score"} <ChevronRight size={12} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {done && (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
              className="glass rounded-2xl p-8 border border-[oklch(0.65_0.22_200_/_0.3)] text-center">
              <div className="text-5xl mb-4">
                {score >= 5 ? "\u{1F3C6}" : score >= 3 ? "\u{1F44D}" : "\u{1F4D8}"}
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">{score}/{MYTH_QUIZ.length} correct</h3>
              <p className="text-muted-foreground mb-2">
                {score >= 5 ? "Strong critical thinking — you can identify AI hype and fear with precision." :
                  score >= 3 ? "Good foundation. A few myths still slip through — that's exactly what this lesson is for." :
                    "The myths are convincing — that's why they spread. Review the explanations and you'll catch them next time."}
              </p>
              <button onClick={reset}
                className="mt-4 flex items-center gap-1.5 mx-auto px-4 py-2 rounded-lg glass border border-white/10 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <RotateCcw size={13} /> Retake Quiz
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </LessonShell>
  );
}

// --- Lesson 3: Prompt Engineering --------------------------------------------
function Lesson3({ onComplete, completed }: { onComplete: () => void; completed: boolean }) {
  const [activeEx, setActiveEx] = useState(0);
  const [userPrompt, setUserPrompt] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [checklist, setChecklist] = useState<boolean[]>([false, false, false, false]);
  const [submitted, setSubmitted] = useState(false);
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [allScores, setAllScores] = useState<Record<string, number>>({});

  const ex = PROMPT_EXERCISES[activeEx];

  const { addXP } = usePersonalization();

  const sendPrompt = trpc.ai.explainConcept.useMutation({
    onSuccess: (data) => {
      setResponse(data.explanation);
      setLoading(false);
      setSubmitted(true);
    },
    onError: (err: { message: string }) => {
      toast.error(err.message);
      setLoading(false);
    },
  });

  const handleSubmit = () => {
    if (!userPrompt.trim()) { toast.error("Write a prompt first."); return; }
    setLoading(true);
    setResponse("");
    // Send the user's own prompt as the concept for a "student" level explanation
    // This demonstrates real AI interaction with the prompt they wrote
    sendPrompt.mutate({ concept: userPrompt.substring(0, 500), level: "student" });
  };

  const handleCheck = (i: number) => {
    const updated = [...checklist];
    updated[i] = !updated[i];
    setChecklist(updated);
    const score = updated.filter(Boolean).length;
    setAllScores(prev => ({ ...prev, [ex.id]: score }));
    if (score === 4) {
      addXP(15);
      toast.success("+15 XP — perfect prompt criteria!");
    }
  };

  const switchEx = (idx: number) => {
    setActiveEx(idx);
    setUserPrompt("");
    setShowHint(false);
    setChecklist([false, false, false, false]);
    setSubmitted(false);
    setResponse("");
  };

  const promptScore = allScores[ex.id] ?? 0;

  const PRINCIPLES = [
    { name: "Persona", desc: "Tell the AI who to act as", example: "\"You are an expert cover letter coach...\"" },
    { name: "Context", desc: "Provide the relevant background", example: "\"I have 5 years of marketing experience...\"" },
    { name: "Specifics", desc: "Include concrete details and numbers", example: "\"grew social media by 300%\"" },
    { name: "Constraints", desc: "Set length, format, tone", example: "\"Keep it under 300 words. Professional but warm.\"" },
    { name: "Goal", desc: "State the desired outcome clearly", example: "\"The goal is to get an interview at a tech startup.\"" },
  ];

  return (
    <LessonShell meta={LESSONS[2]} onComplete={onComplete} completed={completed}>
      <div className="space-y-6">
        {/* Intro */}
        <div className="glass rounded-2xl p-6 border border-white/8">
          <Narrator text="Prompt engineering is the skill of communicating with AI clearly and effectively. The difference between a vague prompt and a precise one can mean the difference between a useless response and a genuinely helpful one. You'll practice this now." />
          <div className="mt-5">
            <p className="text-muted-foreground leading-relaxed mb-4">
              Prompt engineering is not magic — it's <strong className="text-foreground">communication design</strong>. You're writing instructions for a very capable but literal assistant with no context about you, your goals, or your standards. Precision wins.
            </p>
            {/* PARE Framework */}
            <div className="glass rounded-xl p-4 border border-[oklch(0.72_0.2_290_/_0.2)]">
              <div className="text-xs font-semibold text-[oklch(0.72_0.2_290)] mb-3">THE 5 PROMPT PRINCIPLES</div>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                {PRINCIPLES.map(({ name, desc, example }) => (
                  <div key={name} className="glass rounded-lg p-3 border border-white/8">
                    <div className="text-xs font-bold text-foreground mb-1">{name}</div>
                    <p className="text-xs text-muted-foreground mb-1.5 leading-snug">{desc}</p>
                    <p className="text-xs italic text-[oklch(0.72_0.2_290_/_0.8)] leading-snug">{example}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Exercise Selector */}
        <div className="flex gap-2">
          {PROMPT_EXERCISES.map((e, i) => (
            <button key={i} onClick={() => switchEx(i)}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all border ${activeEx === i
                ? "bg-[oklch(0.72_0.2_290_/_0.15)] border-[oklch(0.72_0.2_290_/_0.4)] text-[oklch(0.82_0.2_290)]"
                : "glass border-white/8 text-muted-foreground hover:border-white/15"
                }`}>
              {i + 1}. {e.title}
              {allScores[e.id] !== undefined && (
                <span className="ml-1 text-[oklch(0.72_0.18_150)]">
                  ({allScores[e.id]}/4)
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Exercise Card */}
        <AnimatePresence mode="wait">
          <motion.div key={activeEx} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
            <div className="glass rounded-2xl p-6 border border-white/8 space-y-5">
              <div>
                <h3 className="font-semibold text-foreground mb-2">{ex.title}</h3>
                <div className="glass rounded-xl p-4 border border-[oklch(0.72_0.2_290_/_0.15)] mb-3">
                  <div className="text-xs font-semibold text-[oklch(0.72_0.2_290)] mb-1.5">SCENARIO</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{ex.scenario}</p>
                </div>
                <div className="glass rounded-xl p-3 border border-white/8">
                  <div className="text-xs font-medium text-muted-foreground mb-1">A weak prompt for this would be:</div>
                  <p className="text-sm text-foreground font-mono italic">"{ex.vague}"</p>
                </div>
              </div>

              {/* Prompt Editor */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Your improved prompt:</label>
                <textarea value={userPrompt} onChange={e => setUserPrompt(e.target.value)}
                  placeholder="Write a detailed, specific prompt using the 5 principles above..."
                  rows={5}
                  className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[oklch(0.72_0.2_290_/_0.5)] resize-none transition-colors font-mono" />
              </div>

              <div className="flex items-center gap-3">
                <button onClick={() => setShowHint(!showHint)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg glass border border-white/8 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <HelpCircle size={12} /> {showHint ? "Hide hint" : "Show hint"}
                </button>
                <motion.button onClick={handleSubmit} disabled={loading || !userPrompt.trim()}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[oklch(0.72_0.2_290)] text-white text-sm font-medium disabled:opacity-50 transition-opacity">
                  {loading ? <><RefreshCw size={13} className="animate-spin" /> Sending...</> : <><Send size={13} /> Test My Prompt</>}
                </motion.button>
              </div>

              <AnimatePresence>
                {showHint && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                    className="px-4 py-3 rounded-xl bg-[oklch(0.72_0.2_290_/_0.08)] border border-[oklch(0.72_0.2_290_/_0.2)] text-sm text-muted-foreground">
                    <strong className="text-foreground">Hint: </strong>{ex.hint}
                  </motion.div>
                )}
                {submitted && response && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="glass rounded-xl p-5 border border-[oklch(0.72_0.2_290_/_0.2)]">
                    <div className="text-xs font-semibold text-[oklch(0.72_0.2_290)] mb-3">AI RESPONSE</div>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{response}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Self-Evaluation Rubric (Mayer: Metacognition) */}
              <div className="glass rounded-xl p-5 border border-[oklch(0.72_0.2_290_/_0.15)]">
                <div className="text-xs font-semibold text-[oklch(0.72_0.2_290)] mb-3">SELF-EVALUATION RUBRIC</div>
                <p className="text-xs text-muted-foreground mb-3">Check each criterion your prompt included:</p>
                <div className="space-y-2">
                  {ex.rubric.map((criterion, i) => (
                    <label key={i} className="flex items-start gap-3 cursor-pointer group">
                      <div onClick={() => handleCheck(i)}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all ${checklist[i]
                          ? "bg-[oklch(0.72_0.18_150)] border-[oklch(0.72_0.18_150)]"
                          : "border-white/20 group-hover:border-white/40"
                          }`}>
                        {checklist[i] && <Check size={11} className="text-white" />}
                      </div>
                      <span className={`text-sm transition-colors ${checklist[i] ? "text-foreground" : "text-muted-foreground"}`}>
                        {criterion}
                      </span>
                    </label>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <Progress value={(promptScore / 4) * 100} className="flex-1 h-2" />
                  <span className="text-xs font-medium text-foreground shrink-0">{promptScore}/4 criteria</span>
                </div>
                {promptScore === 4 && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="mt-2 text-xs text-[oklch(0.72_0.18_150)] font-medium">
                    ? Full marks — your prompt hits all key principles!
                  </motion.p>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </LessonShell>
  );
}

// --- Lesson 4: Ethics & Society -----------------------------------------------
function Lesson4({ onComplete, completed }: { onComplete: () => void; completed: boolean }) {
  const [activeScenario, setActiveScenario] = useState(0);
  const [expandedStakeholder, setExpandedStakeholder] = useState<number | null>(null);
  const [userResponse, setUserResponse] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});

  const sc = ETHICS_SCENARIOS[activeScenario];

  return (
    <LessonShell meta={LESSONS[3]} onComplete={onComplete} completed={completed}>
      <div className="space-y-6">
        {/* Intro */}
        <div className="glass rounded-2xl p-6 border border-white/8">
          <Narrator text="AI ethics is not about being anti-technology. It's about asking the right questions: Who benefits? Who bears the risk? Who decides? These scenarios have no single correct answer — the point is to reason carefully through competing values." />
          <div className="mt-5">
            <p className="text-muted-foreground leading-relaxed mb-4">
              Every AI system encodes choices — about what data to collect, what to optimize for, whose interests to prioritize. <strong className="text-foreground">AI literacy includes ethical reasoning</strong>: the capacity to identify those choices and ask who made them.
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Fairness", desc: "Does the system treat all groups equitably?", icon: "\u2696\uFE0F" },
                { label: "Accountability", desc: "When AI causes harm, who is responsible?", icon: "\u{1F91D}" },
                { label: "Transparency", desc: "Can people understand how decisions are made?", icon: "\u{1F50D}" },
              ].map(({ label, desc, icon }) => (
                <div key={label} className="glass rounded-xl p-3 border border-white/8 text-center">
                  <div className="text-2xl mb-1.5">{icon}</div>
                  <div className="text-xs font-semibold text-foreground mb-1">{label}</div>
                  <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scenario Selector */}
        <div className="flex gap-2">
          {ETHICS_SCENARIOS.map((e, i) => (
            <button key={i} onClick={() => setActiveScenario(i)}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all border ${activeScenario === i
                ? "bg-[oklch(0.72_0.18_150_/_0.15)] border-[oklch(0.72_0.18_150_/_0.4)] text-[oklch(0.82_0.18_150)]"
                : "glass border-white/8 text-muted-foreground hover:border-white/15"
                }`}>
              {e.title}
            </button>
          ))}
        </div>

        {/* Scenario Card */}
        <AnimatePresence mode="wait">
          <motion.div key={activeScenario} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
            <div className="glass rounded-2xl p-6 border border-white/8 space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">{sc.title}</h3>
                <div className="glass rounded-xl p-4 border border-[oklch(0.72_0.18_150_/_0.15)]">
                  <div className="text-xs font-semibold text-[oklch(0.72_0.18_150)] mb-2">THE SITUATION</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{sc.setup}</p>
                </div>
              </div>

              {/* Stakeholder Perspectives (Mayer: Personalization) */}
              <div>
                <div className="text-sm font-semibold text-foreground mb-3">Who is affected?</div>
                <div className="space-y-2">
                  {sc.stakeholders.map((s, i) => (
                    <motion.div key={i} className="glass rounded-xl border border-white/8 overflow-hidden">
                      <button onClick={() => setExpandedStakeholder(expandedStakeholder === i ? null : i)}
                        className="w-full flex items-center justify-between p-4 text-left hover:bg-white/3 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[oklch(0.72_0.18_150_/_0.15)] border border-[oklch(0.72_0.18_150_/_0.3)] flex items-center justify-center text-xs font-bold text-[oklch(0.72_0.18_150)]">
                            {s.name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-foreground">{s.name}</span>
                        </div>
                        <ChevronDown size={14} className={`text-muted-foreground transition-transform ${expandedStakeholder === i ? "rotate-180" : ""}`} />
                      </button>
                      <AnimatePresence>
                        {expandedStakeholder === i && (
                          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                            <div className="px-4 pb-4 border-t border-white/5 pt-3">
                              <p className="text-sm text-muted-foreground leading-relaxed">{s.concern}</p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Discussion Prompt */}
              <div className="glass rounded-xl p-5 border border-[oklch(0.72_0.18_150_/_0.2)]">
                <div className="text-xs font-semibold text-[oklch(0.72_0.18_150)] mb-3">DISCUSSION QUESTIONS</div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{sc.discussion}</p>
                <label className="text-xs font-medium text-foreground mb-2 block">
                  Your perspective (write freely — there's no single right answer):
                </label>
                <textarea
                  value={userResponse[sc.id] ?? ""}
                  onChange={e => setUserResponse(prev => ({ ...prev, [sc.id]: e.target.value }))}
                  placeholder="Reason through it... Who bears the greatest responsibility here? What safeguards would you require?"
                  rows={4}
                  className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[oklch(0.72_0.18_150_/_0.5)] resize-none transition-colors"
                />
                {!submitted[sc.id] ? (
                  <motion.button
                    onClick={() => {
                      if (!(userResponse[sc.id] ?? "").trim()) { toast.error("Write your perspective first."); return; }
                      setSubmitted(prev => ({ ...prev, [sc.id]: true }));
                      toast.success("Reflection saved — good critical thinking!");
                    }}
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[oklch(0.72_0.18_150_/_0.2)] border border-[oklch(0.72_0.18_150_/_0.3)] text-sm text-[oklch(0.82_0.18_150)] hover:bg-[oklch(0.72_0.18_150_/_0.3)] transition-colors">
                    <MessageSquare size={13} /> Save Reflection
                  </motion.button>
                ) : (
                  <p className="mt-3 text-xs text-[oklch(0.72_0.18_150)] flex items-center gap-1.5">
                    <CheckCircle2 size={12} /> Reflection saved. Consider how your view might change with more context.
                  </p>
                )}
              </div>

              {/* Key Takeaway */}
              <div className="glass rounded-xl p-4 border border-white/8">
                <div className="flex items-start gap-2">
                  <Lightbulb size={14} className="text-[oklch(0.75_0.18_55)] mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">The key insight:</strong> AI systems don't make ethical decisions — <em>people</em> do, when they design, deploy, and regulate these systems. AI literacy means knowing how to ask: who made that choice, and why?
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </LessonShell>
  );
}

// --- Lesson 5: Putting It Together -------------------------------------------
function Lesson5({ onComplete, completed, completedLessons }: {
  onComplete: () => void; completed: boolean; completedLessons: Set<number>;
}) {
  const [capstoneStep, setCapstoneStep] = useState(0);
  const [capstoneAnswers, setCapstoneAnswers] = useState<string[]>(["", "", ""]);
  const [submitted, setSubmitted] = useState(false);
  const [personalPlan, setPersonalPlan] = useState({ useCase: "", concern: "", nextStep: "" });

  const prevCount = completedLessons.size;
  const allDone = prevCount >= 4;

  const CAPSTONE_PROMPTS = [
    {
      label: "Real-World Application",
      question: "Identify one AI tool or system you encounter in daily life (Google search, Netflix recommendations, banking fraud detection, Siri/Alexa, etc.). How does it use AI? What data does it need? Who benefits?",
      placeholder: "e.g., Netflix's recommendation algorithm uses viewing history and behavior data from millions of users to predict what I'll enjoy next. Netflix benefits from longer engagement; I benefit from discovery but risk filter bubbles..."
    },
    {
      label: "Myth Identification",
      question: "You see a news headline: \"AI Chatbot Passes Medical Board Exam — Human Doctors Now Obsolete.\" Using what you learned in Lesson 2, break down what's misleading about this framing.",
      placeholder: "e.g., Passing a multiple-choice exam tests pattern recognition on a static dataset, not clinical judgment in ambiguous real-world situations. 'Obsolete' overstates the case — doctors do far more than answer exam questions..."
    },
    {
      label: "Ethical Reasoning",
      question: "A city plans to use AI to predict which neighborhoods need more police patrols. Based on Lesson 4, identify at least two ethical concerns and one safeguard you would require before deployment.",
      placeholder: "e.g., Concern 1: Predictive policing can amplify historical bias — if past over-policing created more arrests in certain areas, that data creates a self-fulfilling feedback loop. Concern 2: Lack of transparency — residents can't contest a decision made by an algorithm they can't see..."
    },
  ];

  return (
    <LessonShell meta={LESSONS[4]} onComplete={onComplete} completed={completed}>
      <div className="space-y-6">
        {/* Progress Check */}
        {!allDone && (
          <motion.div className="glass rounded-xl p-5 border border-[oklch(0.78_0.16_30_/_0.3)]">
            <div className="flex items-start gap-3">
              <Lock size={18} className="text-[oklch(0.78_0.16_30)] mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-foreground mb-1">Complete Earlier Lessons First</h4>
                <p className="text-sm text-muted-foreground">
                  You've completed {prevCount}/4 previous lessons. The capstone works best after you've built the foundation. Finish the earlier lessons to unlock the full experience.
                </p>
                <div className="mt-3 flex gap-1">
                  {[1, 2, 3, 4].map(n => (
                    <div key={n} className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold border ${completedLessons.has(n)
                      ? "bg-[oklch(0.72_0.18_150_/_0.2)] border-[oklch(0.72_0.18_150_/_0.4)] text-[oklch(0.72_0.18_150)]"
                      : "glass border-white/10 text-muted-foreground"
                      }`}>
                      {completedLessons.has(n) ? <Check size={12} /> : n}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Capstone content is always visible */}
        <div className="glass rounded-2xl p-6 border border-white/8">
          <Narrator text="This capstone brings everything together. You'll apply what you've learned about AI definitions, myth-busting, prompt engineering, and ethics to real-world scenarios. Write your answers thoughtfully — this is your AI literacy demonstration." />
          <div className="mt-4">
            <p className="text-muted-foreground leading-relaxed">
              AI literacy isn't a certification — it's a lens. You now have the vocabulary to describe AI systems, the skepticism to evaluate AI claims, the skill to communicate with AI tools effectively, and the framework to reason about AI's social impacts.
            </p>
          </div>
        </div>

        {/* Capstone Steps */}
        <div className="flex gap-2 mb-2">
          {CAPSTONE_PROMPTS.map((p, i) => (
            <button key={i} onClick={() => setCapstoneStep(i)}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all border text-center ${capstoneStep === i
                ? "bg-[oklch(0.78_0.16_30_/_0.15)] border-[oklch(0.78_0.16_30_/_0.4)] text-[oklch(0.88_0.16_30)]"
                : "glass border-white/8 text-muted-foreground hover:border-white/15"
                }`}>
              {p.label}
              {capstoneAnswers[i].length > 20 && <span className="ml-1 text-[oklch(0.72_0.18_150)]">?</span>}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={capstoneStep} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
            className="glass rounded-2xl p-6 border border-[oklch(0.78_0.16_30_/_0.15)]">
            <div className="text-xs font-semibold text-[oklch(0.78_0.16_30)] mb-3">
              CAPSTONE — PART {capstoneStep + 1}: {CAPSTONE_PROMPTS[capstoneStep].label.toUpperCase()}
            </div>
            <p className="text-sm font-medium text-foreground mb-4 leading-snug">{CAPSTONE_PROMPTS[capstoneStep].question}</p>
            <textarea
              value={capstoneAnswers[capstoneStep]}
              onChange={e => {
                const updated = [...capstoneAnswers];
                updated[capstoneStep] = e.target.value;
                setCapstoneAnswers(updated);
              }}
              placeholder={CAPSTONE_PROMPTS[capstoneStep].placeholder}
              rows={6}
              className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[oklch(0.78_0.16_30_/_0.5)] resize-none transition-colors leading-relaxed"
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-muted-foreground">{capstoneAnswers[capstoneStep].length} characters</span>
              <div className="flex gap-2">
                {capstoneStep > 0 && (
                  <button onClick={() => setCapstoneStep(capstoneStep - 1)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg glass border border-white/8 text-xs text-muted-foreground">
                    <ChevronLeft size={12} /> Previous
                  </button>
                )}
                {capstoneStep < CAPSTONE_PROMPTS.length - 1 ? (
                  <button onClick={() => setCapstoneStep(capstoneStep + 1)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[oklch(0.78_0.16_30_/_0.2)] border border-[oklch(0.78_0.16_30_/_0.3)] text-xs text-[oklch(0.88_0.16_30)]">
                    Next <ChevronRight size={12} />
                  </button>
                ) : (
                  !submitted && (
                    <motion.button
                      onClick={() => {
                        const filled = capstoneAnswers.filter(a => a.length > 20).length;
                        if (filled < 3) { toast.error(`Complete all 3 capstone questions (${filled}/3 done).`); return; }
                        setSubmitted(true);
                        toast.success("Capstone submitted — excellent reasoning!");
                      }}
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-1 px-4 py-1.5 rounded-lg bg-gradient-to-r from-[oklch(0.78_0.16_30)] to-[oklch(0.75_0.18_55)] text-black text-xs font-semibold">
                      <Trophy size={12} /> Submit Capstone
                    </motion.button>
                  )
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Personal AI Action Plan */}
        <AnimatePresence>
          {submitted && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-6 border border-[oklch(0.72_0.18_150_/_0.3)] space-y-4">
              <div className="text-center mb-2">
                <div className="text-4xl mb-2">🎉</div>
                <h3 className="text-xl font-bold text-foreground mb-1">Capstone Complete</h3>
                <p className="text-sm text-muted-foreground">Your AI Literacy Module 1 is complete. Build your personal action plan:</p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">One AI tool I'll use intentionally this week:</label>
                  <input value={personalPlan.useCase} onChange={e => setPersonalPlan(p => ({ ...p, useCase: e.target.value }))}
                    placeholder="e.g., Use ChatGPT to help draft emails — but always review before sending"
                    className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[oklch(0.72_0.18_150_/_0.5)] transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">One AI use I'll think more critically about:</label>
                  <input value={personalPlan.concern} onChange={e => setPersonalPlan(p => ({ ...p, concern: e.target.value }))}
                    placeholder="e.g., Social media algorithms that decide what news I see"
                    className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[oklch(0.72_0.18_150_/_0.5)] transition-colors" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-1.5 block">My next step to deepen AI literacy:</label>
                  <input value={personalPlan.nextStep} onChange={e => setPersonalPlan(p => ({ ...p, nextStep: e.target.value }))}
                    placeholder="e.g., Take Module 2 on Machine Learning, or read one article about AI regulation"
                    className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[oklch(0.72_0.18_150_/_0.5)] transition-colors" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Final completion summary */}
        {completed && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-2xl p-6 border border-[oklch(0.75_0.18_55_/_0.3)] text-center">
            <div className="text-5xl mb-3">🏆</div>
            <h3 className="text-2xl font-bold text-foreground mb-2">Module 1 Complete!</h3>
            <p className="text-muted-foreground mb-4 max-w-lg mx-auto">
              You've earned your <strong className="text-foreground">AI Literacy Certificate — Module 1</strong>. You can now define AI, identify myths, craft effective prompts, and reason through AI ethics.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {["AI Definitions", "Myth Buster", "Prompt Engineer", "Ethics Reasoning", "Capstone"].map(badge => (
                <span key={badge} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[oklch(0.75_0.18_55_/_0.12)] border border-[oklch(0.75_0.18_55_/_0.3)] text-[oklch(0.85_0.18_55)] inline-flex items-center gap-1">
                  <Check size={12} /> {badge}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </LessonShell>
  );
}

// --- Main Page ----------------------------------------------------------------
export default function AILiteracy() {
  const [activeLesson, setActiveLesson] = useState<LessonId | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<number>>(new Set());
  const [totalXP, setTotalXP] = useState(0);
  const { addXP, cookieId } = usePersonalization();
  const lessonStartRef = useRef<Record<number, number>>({});

  const progressQuery = trpc.lesson.getUserProgress.useQuery(
    { cookieId },
    { enabled: !!cookieId, staleTime: 30_000 }
  );
  const startLessonMutation = trpc.lesson.startLessonProgress.useMutation();
  const completeLessonMutation = trpc.lesson.completeLessonProgress.useMutation();

  // Hydrate completed state from server on first load
  useEffect(() => {
    const rows = progressQuery.data?.lessons;
    if (!rows || rows.length === 0) return;
    const completed = new Set<number>();
    let xp = 0;
    for (const row of rows) {
      if (row.completedAt && row.lessonId != null) {
        completed.add(row.lessonId);
        const meta = LESSONS.find(l => l.id === row.lessonId);
        if (meta) xp += meta.xp;
      }
    }
    setCompletedLessons(completed);
    setTotalXP(xp);
  }, [progressQuery.data]);

  const handleOpenLesson = useCallback((lessonId: LessonId) => {
    setActiveLesson(lessonId);
    lessonStartRef.current[lessonId] = Date.now();
    if (cookieId) {
      startLessonMutation.mutate({ cookieId, lessonId });
    }
  }, [cookieId, startLessonMutation]);

  const handleComplete = (lessonId: LessonId) => {
    if (completedLessons.has(lessonId)) return;
    const meta = LESSONS.find(l => l.id === lessonId)!;
    setCompletedLessons(prev => new Set(Array.from(prev).concat(lessonId)));
    setTotalXP(prev => prev + meta.xp);
    addXP(meta.xp);
    const startedAt = lessonStartRef.current[lessonId] ?? Date.now();
    const timeSpentSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    if (cookieId) {
      completeLessonMutation.mutate(
        { cookieId, lessonId, timeSpentSeconds },
        {
          onError: () => {
            // Persistence failed — local state still reflects completion; server will catch up next session
          },
        }
      );
    }
    toast.success(`+${meta.xp} XP — Lesson ${lessonId} complete!`);
  };

  const overallPct = Math.round((completedLessons.size / LESSONS.length) * 100);

  return (
    <PageWrapper pageName="ai-literacy">
      <div className="min-h-screen pt-20">
        {/* Hero */}
        <section className="py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-[oklch(0.75_0.18_55_/_0.3)] text-sm text-[oklch(0.75_0.18_55)] mb-6">
              <Brain size={14} />
              <span>Module 1 · AI Literacy for Adults</span>
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
              className="text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
              Introduction to{" "}
              <span className="text-gradient-gold">AI Literacy</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="text-lg text-muted-foreground max-w-2xl mb-4 leading-relaxed">
              A complete, research-backed introduction to artificial intelligence for adult learners — no coding required. Built on Mayer's 12 Multimedia Learning Principles.
            </motion.p>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }} className="mb-6">
              <Link href="/learn/my-profile" className="inline-flex items-center gap-1.5 text-xs text-[oklch(0.65_0.22_200)] hover:text-[oklch(0.85_0.18_200)] transition-colors">
                <Sparkles size={12} />
                Lessons here adapt to your reading level, pace, and confidence — see how →
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {[
                { label: "Lessons", value: "5", icon: <BookOpen size={14} /> },
                { label: "Total XP", value: `${totalXP > 0 ? totalXP : 360}`, icon: <Zap size={14} /> },
                { label: "Duration", value: "~2 hrs", icon: <Clock size={14} /> },
                { label: "Level", value: "Beginner", icon: <Star size={14} /> },
              ].map(({ label, value, icon }) => (
                <div key={label} className="glass rounded-xl p-4 border border-white/8 text-center">
                  <div className="flex items-center justify-center gap-1 text-[oklch(0.75_0.18_55)] mb-2">{icon}</div>
                  <div className="text-lg font-bold text-foreground">{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              ))}
            </motion.div>

            {/* Overall progress */}
            {completedLessons.size > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="glass rounded-xl p-4 border border-[oklch(0.75_0.18_55_/_0.2)] mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Course Progress</span>
                  <span className="text-sm font-bold text-[oklch(0.75_0.18_55)]">{overallPct}%</span>
                </div>
                <Progress value={overallPct} className="h-2 mb-2" />
                <ProgressBadge completed={completedLessons.size} total={LESSONS.length} />
              </motion.div>
            )}
          </div>
        </section>

        {/* Lesson List + Content */}
        <section className="pb-20 px-4">
          <div className="max-w-4xl mx-auto">
            {activeLesson === null ? (
              /* Lesson cards */
              <div className="space-y-3">
                {LESSONS.map((lesson, i) => {
                  const isComplete = completedLessons.has(lesson.id);
                  const isLocked = false; // all lessons open
                  return (
                    <motion.div key={lesson.id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className={`glass rounded-2xl border overflow-hidden transition-all ${isComplete
                        ? "border-[oklch(0.72_0.18_150_/_0.3)]"
                        : "border-white/8 hover:border-white/15"
                        }`}>
                      <button
                        onClick={() => handleOpenLesson(lesson.id)}
                        className="w-full flex items-center gap-5 p-5 text-left hover:bg-white/3 transition-colors">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                          style={{
                            background: `color-mix(in oklch, ${lesson.color} 15%, transparent)`,
                            border: `1px solid color-mix(in oklch, ${lesson.color} 30%, transparent)`,
                          }}>
                          <span style={{ color: lesson.color }}>{lesson.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs text-muted-foreground">Lesson {lesson.id}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-muted-foreground">
                              {lesson.mayer}
                            </span>
                          </div>
                          <h3 className="font-semibold text-foreground">{lesson.title}</h3>
                          <p className="text-sm text-muted-foreground truncate">{lesson.subtitle}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock size={10} /> {lesson.duration}
                          </span>
                          <span className="text-xs text-[oklch(0.75_0.18_55)] flex items-center gap-1">
                            <Zap size={10} /> +{lesson.xp} XP
                          </span>
                          {isComplete
                            ? <span className="flex items-center gap-1 text-xs text-[oklch(0.72_0.18_150)] font-medium"><CheckCircle2 size={11} /> Done</span>
                            : <ChevronRight size={14} className="text-muted-foreground" />
                          }
                        </div>
                      </button>
                    </motion.div>
                  );
                })}

                {/* Mayer Principles Info Panel */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                  className="glass rounded-2xl p-6 border border-white/8 mt-6">
                  <div className="flex items-start gap-3 mb-4">
                    <Brain size={16} className="text-[oklch(0.65_0.22_200)] mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">Built on Mayer's Multimedia Learning Theory</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        This module applies Richard Mayer's 12 evidence-based principles for effective digital learning — proven to improve retention and transfer.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { name: "Coherence", desc: "No extraneous information" },
                      { name: "Segmenting", desc: "Content in learner-paced chunks" },
                      { name: "Personalization", desc: "Conversational tone throughout" },
                      { name: "Modality", desc: "Audio narration + visual text" },
                      { name: "Signaling", desc: "Clear structure and cues" },
                      { name: "Interactivity", desc: "Active exercises, not passive reading" },
                    ].map(({ name, desc }) => (
                      <div key={name} className="glass rounded-lg p-3 border border-white/8">
                        <div className="text-xs font-semibold text-foreground mb-0.5">{name}</div>
                        <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              </div>
            ) : (
              /* Active lesson view */
              <div>
                <button onClick={() => setActiveLesson(null)}
                  className="flex items-center gap-1.5 mb-6 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronLeft size={14} /> Back to all lessons
                </button>
                <AnimatePresence mode="wait">
                  <AdaptiveLessonView
                    key={activeLesson}
                    lessonId={`lesson-${activeLesson}`}
                    completed={completedLessons.has(activeLesson)}
                    onComplete={() => handleComplete(activeLesson)}
                  />
                </AnimatePresence>
                {activeLesson < 5 && (
                  <div className="mt-6 flex justify-end">
                    <button onClick={() => handleOpenLesson((activeLesson + 1) as LessonId)}
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl glass border border-white/10 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      Next Lesson <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}
