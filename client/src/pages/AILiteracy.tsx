import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, BookOpen, Lightbulb, Shield, Trophy, ChevronRight,
  ChevronLeft, CheckCircle2, XCircle, Play, Pause, Volume2,
  VolumeX, RotateCcw, Star, Clock, MessageSquare, Zap, Check,
  Target, Sparkles, Eye, RefreshCw, Send, Award, Lock,
  ChevronDown, Info, HelpCircle, Briefcase, Scale, Compass,
  Users, AlertTriangle, TrendingUp, GraduationCap, FileText
} from "lucide-react";
import PageWrapper from "@/components/PageWrapper";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

// ═══════════════════════════════════════════════════════════════════════════
// LEARNER PROFILE TYPES (client-side Phase 1 — Phase 2 will move server-side)
// ═══════════════════════════════════════════════════════════════════════════

type Proficiency = "novice" | "intermediate" | "advanced";
type Motivation = "career" | "civic" | "curiosity" | "parent_educator";
type Pace = "accelerated" | "standard" | "deliberate";

interface CoursePreferences {
  proficiencyLevel: Proficiency;
  motivationProfile: Motivation;
  pacePreference: Pace;
  setAt: number; // ISO ms
}

interface LessonSeed {
  lessonId: 1 | 2 | 3 | 4 | 5;
  depthTier: 1 | 2 | 3;
  vocabularyTier: "plain" | "standard" | "technical";
  quizTier: 1 | 2 | 3;
  examplesPerConcept: 1 | 2 | 3;
  enableProductiveFailure: boolean;
  framingTheme: Motivation;
  ethicsPriority: string[]; // ordered scenario ids
  exampleDomain: "general" | "workplace" | "civic" | "family" | "creative";
}

const DEFAULT_PREFS: CoursePreferences = {
  proficiencyLevel: "intermediate",
  motivationProfile: "curiosity",
  pacePreference: "standard",
  setAt: 0,
};

// Seed generator — the same shape we'll run server-side in Phase 2
function generateSeed(lessonId: 1 | 2 | 3 | 4 | 5, prefs: CoursePreferences): LessonSeed {
  const { proficiencyLevel, motivationProfile, pacePreference } = prefs;

  const depthTier: 1 | 2 | 3 =
    proficiencyLevel === "novice" ? 1 : proficiencyLevel === "advanced" ? 3 : 2;
  const vocabularyTier: "plain" | "standard" | "technical" =
    proficiencyLevel === "novice" ? "plain" :
    proficiencyLevel === "advanced" ? "technical" : "standard";
  const quizTier: 1 | 2 | 3 = depthTier;

  let examplesPerConcept: 1 | 2 | 3 = proficiencyLevel === "novice" ? 3 : proficiencyLevel === "advanced" ? 1 : 2;
  if (pacePreference === "accelerated") examplesPerConcept = Math.max(1, examplesPerConcept - 1) as 1 | 2 | 3;
  if (pacePreference === "deliberate") examplesPerConcept = Math.min(3, examplesPerConcept + 1) as 1 | 2 | 3;

  const enableProductiveFailure = proficiencyLevel !== "novice";

  const ethicsPriorityByMotivation: Record<Motivation, string[]> = {
    career: ["hiring", "tutor", "medical"],
    civic: ["medical", "hiring", "tutor"],
    curiosity: ["medical", "tutor", "hiring"],
    parent_educator: ["tutor", "medical", "hiring"],
  };

  const exampleDomainByMotivation: Record<Motivation, LessonSeed["exampleDomain"]> = {
    career: "workplace",
    civic: "civic",
    curiosity: "general",
    parent_educator: "family",
  };

  return {
    lessonId,
    depthTier,
    vocabularyTier,
    quizTier,
    examplesPerConcept,
    enableProductiveFailure,
    framingTheme: motivationProfile,
    ethicsPriority: ethicsPriorityByMotivation[motivationProfile],
    exampleDomain: exampleDomainByMotivation[motivationProfile],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PERSISTENCE — uses the existing visitor.addXP + updateProfile context
// and a new light-weight localStorage fallback keyed on cookieId for
// per-lesson completion state until Phase 2 backend lands.
// ═══════════════════════════════════════════════════════════════════════════

interface CourseState {
  completedLessons: number[];
  segmentProgress: Record<number, number>; // lessonId -> last seen segment
  quizScores: Record<string, { correct: number; total: number; attempts: number }>;
  promptRubricScores: Record<string, number>; // exerciseId -> 0..4
  ethicsReflections: Record<string, string>;
  capstoneAnswers: string[];
  capstoneSubmitted: boolean;
  confidenceRatings: Record<string, number>; // questionId -> 1..5
  preferences: CoursePreferences | null;
}

const EMPTY_STATE: CourseState = {
  completedLessons: [],
  segmentProgress: {},
  quizScores: {},
  promptRubricScores: {},
  ethicsReflections: {},
  capstoneAnswers: ["", "", ""],
  capstoneSubmitted: false,
  confidenceRatings: {},
  preferences: null,
};

function storageKey(cookieId: string): string {
  return `nexus_course_ai_literacy_${cookieId || "anon"}`;
}

function loadState(cookieId: string): CourseState {
  try {
    const raw = localStorage.getItem(storageKey(cookieId));
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw);
    return { ...EMPTY_STATE, ...parsed };
  } catch {
    return EMPTY_STATE;
  }
}

function saveState(cookieId: string, state: CourseState): void {
  try {
    localStorage.setItem(storageKey(cookieId), JSON.stringify(state));
  } catch {
    // storage full or disabled — fail silently, user still has in-memory state
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONTENT BANK — variant-aware. Every user-facing string is driven by
// seed.depthTier / seed.vocabularyTier so swapping profile → swaps content.
// ═══════════════════════════════════════════════════════════════════════════

interface LessonMeta {
  id: 1 | 2 | 3 | 4 | 5;
  title: string;
  subtitle: string;
  duration: string;
  icon: React.ReactNode;
  color: string;
  xp: number;
}

const LESSONS: LessonMeta[] = [
  { id: 1, title: "What Is AI?", subtitle: "A stable mental model — no buzzwords", duration: "25 min", icon: <Brain size={20} />, color: "oklch(0.75 0.18 55)", xp: 50 },
  { id: 2, title: "Myths vs. Reality", subtitle: "Separate hype and fear from fact", duration: "20 min", icon: <Eye size={20} />, color: "oklch(0.65 0.22 200)", xp: 60 },
  { id: 3, title: "Prompt Engineering", subtitle: "Talk to AI fluently — get results that matter", duration: "30 min", icon: <Zap size={20} />, color: "oklch(0.72 0.2 290)", xp: 80 },
  { id: 4, title: "Ethics & Society", subtitle: "Navigate the human side of AI", duration: "25 min", icon: <Shield size={20} />, color: "oklch(0.72 0.18 150)", xp: 70 },
  { id: 5, title: "Capstone", subtitle: "Apply everything — graded demonstration", duration: "25 min", icon: <Trophy size={20} />, color: "oklch(0.78 0.16 30)", xp: 100 },
];

// Motivation-shaped opening hooks (SDT autonomy + ARCS relevance)
const OPENING_HOOKS: Record<Motivation, string> = {
  career: "Your manager just asked if the team should adopt AI. In 25 minutes, you will have a mental model sharp enough to answer with evidence — not a vibe.",
  civic: "AI is already deciding bail, benefits, and what news you see. Your vote in the next five years will include questions about systems you need to understand now.",
  curiosity: "There is a decent chance that in the next decade we will build systems that think — or very convincingly seem to. Here is how the ones we have now actually work.",
  parent_educator: "Your kid is using AI for homework whether you know it or not. This course gets you ahead of them in two hours.",
};

const CLOSING_CTAS: Record<Motivation, string> = {
  career: "Next: Module 2 — AI in the Workplace.",
  civic: "Next: explore Nexus's AI Governance primer.",
  curiosity: "Next: deep dive on how transformers work.",
  parent_educator: "Next: AI for Families workshop.",
};

// ───────────── LESSON 1 VARIANTS ─────────────
// Concepts shown as cards. Novice gets 2, standard 4, advanced 7.
const L1_CONCEPTS_ALL = [
  { id: "narrow", label: "Narrow AI", plain: "An AI that is good at one specific job (like chess, or translating French). That is all today's AI is.", standard: "AI systems that excel at a single task — chess, image recognition, translation — and are brittle outside that task.", technical: "Task-specialized function approximators with distribution-limited competence; all deployed systems today.", icon: <Target size={22} />, color: "oklch(0.85 0.18 55)" },
  { id: "llm", label: "LLMs", plain: "Very large autocomplete. It learned from billions of sentences how words usually follow each other.", standard: "Large Language Models like ChatGPT and Claude — trained on huge text corpora to predict likely next words.", technical: "Transformer decoders with 10⁹–10¹² parameters trained via next-token prediction over internet-scale corpora; base models then instruction-tuned with RLHF.", icon: <MessageSquare size={22} />, color: "oklch(0.72 0.2 290)" },
  { id: "ml", label: "Machine Learning", plain: "Software that gets better by looking at examples, instead of being told every rule.", standard: "A subfield of AI where systems learn patterns from data rather than explicit rules.", technical: "Inductive pattern learning via optimization over labelled or unlabelled datasets; supervised / unsupervised / reinforcement.", icon: <Zap size={22} />, color: "oklch(0.65 0.22 200)" },
  { id: "dl", label: "Deep Learning", plain: "Machine learning using many layers of tiny decision-makers stacked together.", standard: "ML using layered neural networks — the engine behind LLMs, image AI, and voice recognition.", technical: "Gradient-based learning in multi-layer neural architectures; the engine of modern foundation models.", icon: <Brain size={22} />, color: "oklch(0.72 0.18 150)" },
  { id: "transformer", label: "Transformer", plain: "", standard: "", technical: "The architecture behind modern LLMs — uses 'attention' to weight which parts of the input matter most for each output token.", icon: <Sparkles size={22} />, color: "oklch(0.78 0.16 30)" },
  { id: "attention", label: "Attention", plain: "", standard: "", technical: "The mechanism that lets a model focus on relevant input tokens when producing each output token — enables long-range dependencies.", icon: <Eye size={22} />, color: "oklch(0.72 0.2 260)" },
  { id: "foundation", label: "Foundation Models", plain: "", standard: "", technical: "Large pretrained models (LLMs, vision transformers) that can be adapted to many downstream tasks via fine-tuning or prompting.", icon: <GraduationCap size={22} />, color: "oklch(0.68 0.22 20)" },
];

function l1Concepts(seed: LessonSeed) {
  const base = seed.depthTier === 1
    ? L1_CONCEPTS_ALL.filter(c => ["narrow", "llm"].includes(c.id))
    : seed.depthTier === 3
    ? L1_CONCEPTS_ALL // all 7
    : L1_CONCEPTS_ALL.slice(0, 4); // standard: first 4
  return base;
}

// Domain examples shift with motivation profile
const L1_DOMAIN_EXAMPLES: Record<LessonSeed["exampleDomain"], Array<{ domain: string; uses: string; risk: string }>> = {
  workplace: [
    { domain: "Meetings", uses: "Live transcription, action-item extraction, summary generation", risk: "Recording consent, sensitive info leaving the organization" },
    { domain: "Analysis", uses: "First-draft reports, data summaries, competitive research", risk: "Hallucinated statistics, fabricated citations" },
    { domain: "Hiring", uses: "Resume screening, candidate matching, interview scheduling", risk: "Inherited bias, illegal discrimination at scale" },
  ],
  civic: [
    { domain: "Justice", uses: "Bail recommendations, risk scoring, predictive policing", risk: "Amplified historical bias, opacity, no right to explanation" },
    { domain: "Benefits", uses: "Automated eligibility decisions, fraud flagging", risk: "Wrongful denial, no human appeal, digital exclusion" },
    { domain: "Elections", uses: "Micro-targeted ads, synthetic media, sentiment analysis", risk: "Deepfakes, coordinated inauthentic behavior" },
  ],
  family: [
    { domain: "School", uses: "AI tutors, essay feedback, personalized practice", risk: "Data retention, academic integrity, surveillance" },
    { domain: "Home", uses: "Voice assistants, recommendation engines, smart cameras", risk: "Continuous listening, profile-building on minors" },
    { domain: "Health", uses: "Symptom checkers, therapy chatbots, fitness coaching", risk: "Under-referral for serious issues, privacy of health data" },
  ],
  general: [
    { domain: "Healthcare", uses: "Medical imaging, drug discovery, symptom triage", risk: "Misdiagnosis at scale, dataset bias" },
    { domain: "Education", uses: "Personalized tutoring, essay feedback, accessibility", risk: "Over-reliance, academic dishonesty" },
    { domain: "Work", uses: "Code generation, document drafting, logistics", risk: "Job displacement, deskilling" },
  ],
  creative: [
    { domain: "Visual", uses: "Image generation, concept art, storyboards", risk: "Copyright exposure, artist displacement, deepfakes" },
    { domain: "Writing", uses: "Drafting, editing, ideation, translation", risk: "Loss of voice, fabricated quotes" },
    { domain: "Music", uses: "Composition, mastering, voice cloning", risk: "Unauthorized likeness, royalty collapse" },
  ],
};

// ───────────── LESSON 2 QUIZZES — tiered distractors ─────────────
interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  relatedConceptId?: string; // for spaced retrieval
}

// Tier 1 (novice) — obviously wrong distractors; Tier 2 (standard) — common misconceptions;
// Tier 3 (advanced) — nuance-requiring distractors
const MYTH_QUIZ_TIERS: Record<1 | 2 | 3, QuizQuestion[]> = {
  1: [
    { id: "m1t1", question: "Does ChatGPT have feelings?", options: ["Yes, because it talks kindly", "No — it predicts likely words, no feelings involved", "Only when angry", "Scientists do not know"], correct: 1, explanation: "LLMs have no subjective experience. They match statistical patterns in language. 'Feelings' require something our systems do not have." },
    { id: "m2t1", question: "Will AI replace all jobs?", options: ["Yes, all of them, soon", "No — some tasks yes, but new jobs will exist too", "Only factory jobs", "Only office jobs"], correct: 1, explanation: "Historically automation reshapes jobs. Some tasks disappear, some roles transform, new roles appear. 'All jobs' is not supported by any economic consensus." },
    { id: "m3t1", question: "Does AI always tell the truth?", options: ["Yes — it is a computer", "No — it can sound confident and still be wrong", "Only paid versions lie", "Only free versions lie"], correct: 1, explanation: "AI 'hallucinates' — it produces plausible-sounding answers even when wrong. Verify anything important before acting on it." },
    { id: "m4t1", question: "Is AI unbiased because it is just math?", options: ["Yes", "No — it learns bias from the data humans gave it", "Only certain models", "Only for English"], correct: 1, explanation: "AI reflects its training data. If that data encodes bias, the model does too. Math does not clean bias; it can amplify it." },
  ],
  2: [
    { id: "m1", question: "AI systems like ChatGPT are conscious and have feelings.", options: ["True — they learn from human emotion", "False — they process patterns, not feelings", "Partly true — they simulate empathy convincingly", "Scientists disagree on this"], correct: 1, explanation: "LLMs are statistical pattern-matchers. They predict likely next tokens based on training data. There is no subjective experience or consciousness — however convincing the output feels.", relatedConceptId: "llm" },
    { id: "m2", question: "AI will replace ALL jobs within the next decade.", options: ["True — automation always eliminates jobs", "False — it transforms and creates new roles too", "Only blue-collar jobs are at risk", "Only white-collar jobs are at risk"], correct: 1, explanation: "History shows automation displaces tasks, not entire occupations. New jobs emerge (AI trainers, auditors, designers). The risk is real for some roles but 'all jobs' overstates what any evidence supports." },
    { id: "m3", question: "What does 'machine learning' actually mean?", options: ["A robot physically learning to walk", "Algorithms improving from data without explicit rules", "A computer memorizing a textbook", "Software that mimics human thought step by step"], correct: 1, explanation: "Machine learning finds patterns in data to make predictions — without being programmed with every rule. It is statistics at scale, not a digital brain.", relatedConceptId: "ml" },
    { id: "m4", question: "AI is 100% objective because it is just math.", options: ["True — algorithms cannot be biased", "False — AI inherits bias from training data and designers", "True — bias is a human problem only", "Partially true for supervised learning"], correct: 1, explanation: "AI reflects its training data. If historical data encodes racial, gender, or socioeconomic bias, the model will too. 'Just math' does not clean bias — it can amplify it at scale." },
    { id: "m5", question: "Which best describes a Large Language Model?", options: ["A database that looks up answers", "A model trained to predict the next most likely word", "Software that understands language like a human", "A search engine with a chat interface"], correct: 1, explanation: "LLMs predict what comes next, token by token. They do not 'understand' in a human sense — they model statistical relationships between words with remarkable results.", relatedConceptId: "llm" },
    { id: "m6", question: "AI systems always give accurate, truthful answers.", options: ["True — they are trained on verified data", "False — they can 'hallucinate' plausible-sounding falsehoods", "True on premium tiers", "Only open-source models are unreliable"], correct: 1, explanation: "Hallucination is well-documented: models optimize for plausibility, not truth. They produce confident-sounding output even when wrong. Always verify critical claims." },
  ],
  3: [
    { id: "m1a", question: "Recent evaluations have observed LLMs producing deceptive outputs under certain test conditions. The most defensible interpretation is:", options: ["The model has goals and is lying to pursue them", "The model is imitating deceptive patterns present in training data and optimization pressure — no goals required", "The model is sentient", "This is a journalistic exaggeration with no empirical basis"], correct: 1, explanation: "'Deception-like behavior' in LLMs is explained by pattern imitation plus optimization pressure (e.g., RLHF producing responses that score well on graders). This does not require goals or consciousness — and attributing those overreaches the evidence." },
    { id: "m2a", question: "'LLMs are just a lookup table of their training data' is:", options: ["True — they memorize and retrieve", "False — they compress patterns and generate novel combinations, but cannot retrieve verbatim most of the time", "True for small models only", "Unknowable"], correct: 1, explanation: "LLMs learn compressed statistical representations. They can reproduce training strings sometimes (memorization), but most outputs are novel generalizations from the learned distribution. 'Lookup table' understates the compression; 'understanding' overstates the representation." },
    { id: "m3a", question: "Which most accurately describes why LLMs hallucinate?", options: ["Bugs in the model code", "The next-token objective rewards plausibility, not truth — so confident falsehoods are a direct consequence of how they are trained", "They run out of memory", "Poor prompt engineering always"], correct: 1, explanation: "Hallucination is not a bug — it is a direct consequence of training on next-token-prediction. The model has no truth signal, only a plausibility signal. This is why RAG, tool use, and verification are essential for high-stakes use." },
    { id: "m4a", question: "'Larger models are always more accurate' is:", options: ["True — scaling laws prove it", "False — scaling laws describe aggregate capability, but specific tasks can regress or show U-shaped curves", "True for reasoning, false for recall", "Only true for models over 100B parameters"], correct: 1, explanation: "Scaling laws describe aggregate loss trends. On individual tasks, larger models sometimes perform worse (inverse scaling), show U-shaped curves, or gain new failure modes. 'Always' is too strong." },
    { id: "m5a", question: "'AI is unbiased because it is just math' — the strongest counter is:", options: ["Bias is a political construct", "Data selection, labeling choices, objective design, and deployment context each encode human judgment — bias enters at every step", "AI is biased only against certain groups", "We cannot measure AI bias"], correct: 1, explanation: "Bias in AI is not a single failure mode — it enters via data collection, labeling, objective choice, threshold setting, and deployment context. Treating any of these as value-neutral misses where the choices actually live." },
    { id: "m6a", question: "The 'hallucination' framing has limits. Which critique is most substantive?", options: ["'Hallucination' anthropomorphizes — the model is not perceiving anything, it is producing statistically likely outputs. Calling it hallucination can obscure the mechanism.", "Hallucinations are actually good", "Only GPT-4 hallucinates", "The term is trademarked"], correct: 0, explanation: "The term 'hallucination' imports perceptual vocabulary and can mislead about mechanism. Stricter framings (e.g., 'confabulation', 'plausibility-maximizing generation without truth constraint') are more accurate. Both terms appear in the literature." },
  ],
};

const DEF_QUIZ_TIERS: Record<1 | 2 | 3, QuizQuestion[]> = {
  1: [
    { id: "d1t1", question: "What does 'AI' stand for?", options: ["Automated Intelligence", "Artificial Intelligence", "Advanced Integration", "Algorithmic Interface"], correct: 1, explanation: "Artificial Intelligence — the simulation of human-like reasoning tasks by machines." },
    { id: "d2t1", question: "Which is true about AI today?", options: ["It is conscious", "It is good at specific narrow tasks", "It does every human job", "It cannot learn"], correct: 1, explanation: "All AI today is 'narrow' — it is very good at specific tasks, brittle outside of them.", relatedConceptId: "narrow" },
    { id: "d3t1", question: "When AI is 'trained', what happens?", options: ["It reads a manual", "It adjusts numbers inside itself by processing examples", "It copies a person", "Engineers program every rule"], correct: 1, explanation: "Training means processing examples, predicting, measuring how wrong, and adjusting internal numbers (weights) millions of times." },
  ],
  2: [
    { id: "d1", question: "Which term describes AI that can perform any intellectual task a human can?", options: ["Narrow AI", "Strong AI / AGI", "Supervised Learning", "Neural Network"], correct: 1, explanation: "AGI is hypothetical AI matching human cognitive flexibility across all domains. Today's systems are narrow — excellent at specific tasks, brittle outside them." },
    { id: "d2", question: "A neural network is inspired by:", options: ["Internet networks", "Electrical grids", "The brain's neuron structure (loosely)", "Social networks"], correct: 2, explanation: "Neural networks use layers of interconnected nodes loosely inspired by neurons and synapses. The inspiration is structural, not literal." },
    { id: "d3", question: "When an AI is trained, what actually changes?", options: ["Code is rewritten", "Millions of numerical weights are adjusted by gradient-based optimization", "A textbook is added to memory", "Humans write new rules"], correct: 1, explanation: "Training adjusts weights via optimization on a loss function — millions (or billions) of numbers shifting to reduce prediction error.", relatedConceptId: "ml" },
    { id: "d4", question: "What is a 'context window' in an LLM?", options: ["The screen size", "How much text the model can attend to in one turn", "The training dataset", "The login time"], correct: 1, explanation: "The context window is the maximum amount of input text the model can process in a single request. Modern models range from 8k to over 1M tokens.", relatedConceptId: "llm" },
  ],
  3: [
    { id: "d1a", question: "Which distinction is most accurate?", options: ["ML ⊂ AI, DL ⊂ ML, LLMs ⊂ DL", "AI ⊂ ML, DL ⊂ ML, LLMs ⊂ AI", "DL ⊂ AI, ML ⊂ DL, LLMs ⊂ ML", "All terms are synonymous"], correct: 0, explanation: "Machine Learning is a subfield of AI; Deep Learning is a subfield of ML using many-layered networks; LLMs are a specific type of deep learning model for language." },
    { id: "d2a", question: "What does 'temperature' control in an LLM?", options: ["GPU heat", "Randomness in next-token sampling — lower = more deterministic", "Training speed", "Context length"], correct: 1, explanation: "Temperature scales the logits before sampling. T=0 approaches greedy (always pick top token); higher T increases diversity at the cost of coherence." },
    { id: "d3a", question: "RLHF stands for and does what?", options: ["Regular Learning from Human Feedback; replaces gradient descent", "Reinforcement Learning from Human Feedback; aligns the base model to human preferences after pretraining", "Random Look at Human Files; generates data", "Rapid Language with Human Framing; a prompt technique"], correct: 1, explanation: "RLHF takes a pretrained model and further tunes it using human preference rankings, typically via a learned reward model. This is how base LLMs become conversational assistants." },
    { id: "d4a", question: "Why do LLMs sometimes answer math questions wrong even when they can explain the method correctly?", options: ["Bugs in the arithmetic module", "They are trained on text, not on performing arithmetic — the competence is in pattern-matching explanations, not in calculation", "Temperature is too low", "They cannot read numbers"], correct: 1, explanation: "LLMs are next-token predictors over text. They learn patterns about arithmetic from text rather than doing arithmetic. That is why tool use (calculators, code interpreters) dramatically improves their quantitative reliability." },
  ],
};

// ───────────── LESSON 3 — PROMPT EXERCISES (motivation-aware) ─────────────
interface PromptExercise {
  id: string;
  title: string;
  scenario: string;
  vague: string;
  hint: string;
  rubric: string[];
}

const PROMPT_EXERCISES_BY_DOMAIN: Record<LessonSeed["exampleDomain"], PromptExercise[]> = {
  workplace: [
    { id: "pw1", title: "Client Apology Email", scenario: "Your team missed a deadline affecting a major client. Server migration took longer than expected. You propose a new delivery date of Friday EOD. Tone: professional, human — not robotic.", vague: "Write an apology email.", hint: "Include: the client relationship context, the specific reason, a concrete new commitment, tone guidance, and a clear ask of the client.", rubric: ["Describes the client relationship (major client, long-term, etc.)", "States the specific reason (server migration)", "Commits to a concrete new deadline (Friday EOD)", "Requests a clear response from the client"] },
    { id: "pw2", title: "Executive Data Summary", scenario: "Q1 revenue: $1.2M (up 18% YoY). Unit sales down 3%. AOV up 22%. Top 3 products = 71% of revenue. You need a 3-bullet executive summary.", vague: "Summarize my Q1 numbers.", hint: "Put all numbers directly in the prompt. Specify 3 bullets, executive audience, and ask for insight framing.", rubric: ["All four data points included in the prompt", "Specifies bullet count (3)", "States audience (executives/leadership)", "Asks for insight framing, not just number restatement"] },
    { id: "pw3", title: "Meeting Action Items", scenario: "You attended a 45-minute planning meeting. You want AI to extract clean action items with owner, task, and due date from a rough transcript with crosstalk.", vague: "Get action items from this.", hint: "Specify format (table/bullets), fields needed, how to handle unclear owners, and what to ignore.", rubric: ["Specifies output format (table or bullet list)", "Lists fields (owner, task, deadline)", "Instructs how to flag unclear owners", "Tells AI to ignore filler/smalltalk"] },
  ],
  civic: [
    { id: "pc1", title: "Local Policy Explainer", scenario: "Your city council is considering a facial-recognition ban. You want a plain-language explainer suitable for a neighborhood newsletter, covering what the tech does, what the concerns are, and what counter-arguments exist.", vague: "Explain facial recognition.", hint: "Specify: audience (non-technical neighbors), length, tone (neutral), coverage of both sides, and format.", rubric: ["Specifies the audience (newsletter readers, non-technical)", "Sets a length (word/paragraph count)", "Asks for balanced coverage of pro and con", "Specifies a structure (e.g., three sections)"] },
    { id: "pc2", title: "Constituent Letter", scenario: "You want to write your state representative about AI-generated political ads. You care about disclosure rules. You want the letter to be firm but respectful, under 200 words.", vague: "Write my rep about AI ads.", hint: "Include: your concrete ask (mandated disclosure), why it matters (election integrity), tone, length, and your district.", rubric: ["States a specific policy ask (disclosure)", "Gives a reason grounded in a public-interest principle", "Specifies tone and length", "Identifies you as a constituent (district context)"] },
    { id: "pc3", title: "News Claim Verification", scenario: "You saw a viral claim that 'AI facial recognition misidentifies Black women 34% of the time'. You want AI to help you verify whether this statistic is real, recent, and in what context.", vague: "Is this AI stat true?", hint: "Ask for: primary sources, publication year, the exact study population, and the specific measure.", rubric: ["Asks for the primary source (Buolamwini/Gebru Gender Shades study)", "Requests publication year and study scope", "Asks about the specific demographic and error type", "Requests citation rather than a summary"] },
  ],
  family: [
    { id: "pf1", title: "Explaining to Grandparent", scenario: "Your 70-year-old parent asks what ChatGPT 'actually is'. They use email and Facebook but do not know tech jargon.", vague: "Explain ChatGPT to my mom.", hint: "Specify: age, familiarity level, analogy from everyday life, length, no jargon.", rubric: ["Specifies the audience (older adult, non-technical)", "Requests an everyday analogy", "Sets a short length (e.g., 3 sentences)", "Explicitly asks for no jargon"] },
    { id: "pf2", title: "Homework Helper Boundaries", scenario: "Your 13-year-old wants help understanding a history essay prompt. You want AI to coach — not write it — and to explain its thinking so the kid learns.", vague: "Help my kid with homework.", hint: "Specify: age of student, subject, the coaching vs writing boundary, tone (encouraging), and what to produce.", rubric: ["Specifies the student's age", "Establishes 'coach, do not write'", "Describes desired tone", "States what the output should look like (questions/hints not the essay)"] },
    { id: "pf3", title: "Family AI Rules", scenario: "You want a one-page family AI-use policy: what kids can use, what needs adult check-in, what is off-limits, calibrated for ages 10–15.", vague: "Give me family AI rules.", hint: "Specify: ages, categories of use, tone (clear but not scary), length, and format (one page).", rubric: ["Specifies the age range (10–15)", "Names categories to cover (homework, image gen, chat, etc.)", "Specifies tone and length", "Asks for a usable format (table or numbered list)"] },
  ],
  general: [
    { id: "pg1", title: "Cover Letter Draft", scenario: "Marketing manager role at a tech startup. You have 5 years of experience and led a team that grew social media engagement by 300%.", vague: "Write me a cover letter.", hint: "Include: role + company type, concrete achievement with the number, desired tone, length, what to emphasize.", rubric: ["Specifies role and company type", "Includes the concrete 300% achievement", "States desired tone (professional, energetic, etc.)", "Mentions approximate length/format"] },
    { id: "pg2", title: "Explaining to Non-Technical Family", scenario: "Your parent asks about blockchain. Comfortable with everyday technology, not technical jargon.", vague: "Explain blockchain.", hint: "Use: persona, audience description, analogy, length, plain-language requirement.", rubric: ["Specifies the audience (non-technical)", "Requests an analogy", "Sets a length limit", "Explicitly requires plain language"] },
    { id: "pg3", title: "Business Name Brainstorm", scenario: "Local bakery specializing in sourdough. Wants a name that feels warm, artisan, slightly whimsical — not corporate.", vague: "Give me bakery names.", hint: "Specify: specialty, tone/mood, number of options, and ask for reasoning per name.", rubric: ["Describes the specialty (sourdough)", "Describes the desired tone/mood", "Specifies how many options", "Asks for a reason per name"] },
  ],
  creative: [
    { id: "pcr1", title: "Story Opening", scenario: "You are writing a short story set in a coastal town during a storm. The POV character is a retired lighthouse keeper with a secret.", vague: "Write me a story opening.", hint: "Include: setting specifics, POV, tone, length, what should happen in the opening scene.", rubric: ["Describes setting (coastal, storm)", "Establishes POV and character", "Specifies tone and length", "States what the opening scene should accomplish"] },
    { id: "pcr2", title: "Song Bridge Brainstorm", scenario: "You have verses and a chorus about leaving a small town. You need a bridge that turns the feeling from regret to resolve — 4 lines, singable to the same melody.", vague: "Write a bridge.", hint: "Give AI the existing lyrics. Specify the emotional shift, line count, meter, and singability.", rubric: ["Provides existing lyrics context", "Specifies the emotional shift", "States line count and meter", "Mentions singability / melody constraint"] },
    { id: "pcr3", title: "Visual Concept Prompt", scenario: "You are generating cover art for a podcast on grief and recovery. You want moody but not dark — coastal, muted palette, a single human figure at distance.", vague: "Make me a podcast cover.", hint: "Specify: style, palette, subject, mood, composition, and what to avoid.", rubric: ["Specifies style/medium", "Names the palette", "Describes subject and composition", "Lists things to avoid"] },
  ],
};

// ───────────── LESSON 4 — ETHICS SCENARIOS ─────────────
interface EthicsScenario {
  id: string;
  title: string;
  setup: string;
  stakeholders: { name: string; concern: string }[];
  discussion: string;
  framework: string;
}

const ETHICS_SCENARIOS: Record<string, EthicsScenario> = {
  hiring: {
    id: "hiring",
    title: "The Hiring Algorithm",
    setup: "A major employer uses AI to screen 50,000 applications. An audit reveals it scores women 15% lower for engineering roles — because historically, fewer women were hired.",
    stakeholders: [
      { name: "The applicant", concern: "Qualified but filtered out before a human ever sees her application." },
      { name: "The HR manager", concern: "Trusted the system to be objective. Did not know about the bias. Now liable." },
      { name: "The AI vendor", concern: "Trained on the data provided. Was not asked to audit for demographic parity." },
      { name: "The CEO", concern: "Wants efficiency AND legal compliance. A lawsuit could cost millions." },
    ],
    discussion: "Who is responsible? Can 'debiasing' the data fix this — or does it require rethinking the data entirely? What pre-deployment oversight should be required for AI in hiring?",
    framework: "This is a Title VII (US) and EU AI Act 'high-risk' case. Employment AI must be auditable; disparate impact is actionable even without intent.",
  },
  medical: {
    id: "medical",
    title: "The Medical Triage Chatbot",
    setup: "A hospital deploys an AI chatbot that triages patients by symptoms. It performs well on average — but has higher error rates for patients who describe symptoms in non-standard English.",
    stakeholders: [
      { name: "The non-native-English patient", concern: "Risk of being routed to home care when they need the ER." },
      { name: "The ER nurse", concern: "Overtaxed if AI over-refers; undertrained if it filters too aggressively." },
      { name: "The administrator", concern: "Reduced wait times — but liability for AI-caused delays." },
      { name: "The regulator", concern: "AI medical devices need approval. What testing standard applies to 'fairness across dialects'?" },
    ],
    discussion: "Should language-unequal AI be deployed in healthcare at all? What minimum accuracy threshold across demographic groups should be required? Who bears liability when an AI misrouting causes harm?",
    framework: "FDA regulates medical device software (SaMD). 'Equitable performance across demographic subgroups' is an emerging but not yet uniformly-enforced criterion.",
  },
  tutor: {
    id: "tutor",
    title: "The School AI Tutor",
    setup: "A district deploys an AI writing tutor. Teachers report improved grades. A parent discovers the system stores all student writing indefinitely — and the privacy policy permits using it to train future models.",
    stakeholders: [
      { name: "The student (14)", concern: "Their personal writing, opinions, and struggles — recorded forever." },
      { name: "The teacher", concern: "Great tool. Did not consent students to data collection when using it." },
      { name: "The parent", concern: "Their child's data is being used commercially without informed consent." },
      { name: "The EdTech company", concern: "Student data is core to improving the product. Anonymization is expensive and imperfect." },
    ],
    discussion: "Does 'better outcomes' justify data collection from minors? What is the difference between 'anonymized' and 'de-identified' data — and does it matter for children? Should there be a right to be forgotten for student writing?",
    framework: "COPPA (US, under 13) and FERPA (educational records) apply. EU AI Act classifies AI used in education as 'high-risk'. Commercial use of minor data is the brightest line.",
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// SHARED UI PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════════

// ── Narrator with transcript toggle (WCAG SC 1.2.1) ──
function Narrator({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  const speak = useCallback(() => {
    if (!window.speechSynthesis) { toast.error("Audio narration is not supported in this browser. Use the transcript."); return; }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.94; utter.pitch = 1.0;
    utter.volume = muted ? 0 : 1;
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utter);
  }, [text, muted]);

  const stop = useCallback(() => { window.speechSynthesis?.cancel(); setSpeaking(false); }, []);
  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  return (
    <div className="rounded-xl bg-[oklch(0.75_0.18_55_/_0.08)] border border-[oklch(0.75_0.18_55_/_0.2)]">
      <div className="flex items-center gap-2 p-3">
        {speaking ? (
          <motion.div className="flex items-end gap-0.5 h-4" aria-label="Audio playing">
            {[0, 1, 2, 3].map(i => (
              <motion.div key={i} className="w-1 bg-[oklch(0.75_0.18_55)] rounded-full"
                animate={{ height: ["4px", "14px", "4px"] }}
                transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }} />
            ))}
          </motion.div>
        ) : <Volume2 size={14} className="text-[oklch(0.75_0.18_55)]" />}
        <span className="text-xs text-muted-foreground flex-1">AI Narrator</span>
        <button onClick={() => setShowTranscript(s => !s)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2"
          aria-label={showTranscript ? "Hide transcript" : "Show transcript"}>
          {showTranscript ? "Hide" : "Transcript"}
        </button>
        <button onClick={() => setMuted(!muted)}
          className="p-1 rounded hover:bg-white/10 text-muted-foreground transition-colors"
          aria-label={muted ? "Unmute" : "Mute"}>
          {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
        </button>
        {speaking
          ? <button onClick={stop} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 text-xs text-foreground"><Pause size={11} /> Stop</button>
          : <button onClick={speak} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[oklch(0.75_0.18_55_/_0.2)] border border-[oklch(0.75_0.18_55_/_0.3)] text-xs text-[oklch(0.85_0.18_55)]"><Play size={11} /> Listen</button>}
      </div>
      <AnimatePresence>
        {showTranscript && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/8">
            <p className="p-3 text-xs text-muted-foreground leading-relaxed italic">{text}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Adaptive Quiz Block with confidence ratings + spaced retrieval tagging ──
interface QuizBlockProps {
  questions: QuizQuestion[];
  accentColor: string;
  storageKey: string; // for persisting scores
  onScoreUpdate: (key: string, correct: number, total: number) => void;
  onConfidenceRecord?: (questionId: string, confidence: number) => void;
  showConfidence?: boolean;
  persistedScore?: { correct: number; total: number; attempts: number };
}

function QuizBlock({ questions, accentColor, storageKey: sk, onScoreUpdate, onConfidenceRecord, showConfidence = true, persistedScore }: QuizBlockProps) {
  const [qi, setQi] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [showExp, setShowExp] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);
  const [calibrationHits, setCalibrationHits] = useState<Array<{ id: string; confidence: number; correct: boolean }>>([]);

  const q = questions[qi];

  const handleAnswer = (idx: number) => {
    if (selected !== null) return;
    if (showConfidence && confidence === null) { toast.error("Rate your confidence first — it is part of the learning."); return; }
    setSelected(idx);
    setShowExp(true);
    const wasCorrect = idx === q.correct;
    if (wasCorrect) setScore(s => s + 1);
    if (showConfidence && confidence !== null) {
      onConfidenceRecord?.(q.id, confidence);
      setCalibrationHits(h => [...h, { id: q.id, confidence, correct: wasCorrect }]);
    }
  };

  const handleNext = () => {
    if (qi + 1 < questions.length) { setQi(i => i + 1); setSelected(null); setConfidence(null); setShowExp(false); }
    else { setDone(true); onScoreUpdate(sk, score, questions.length); }
  };

  const reset = () => { setQi(0); setSelected(null); setConfidence(null); setShowExp(false); setScore(0); setDone(false); setStarted(true); setCalibrationHits([]); };

  if (!started) return (
    <div className="text-center py-4">
      <button onClick={() => setStarted(true)}
        className="px-6 py-2.5 rounded-xl font-semibold text-sm inline-flex items-center gap-2 text-black"
        style={{ background: `linear-gradient(to right, ${accentColor}, oklch(0.65 0.22 200))` }}>
        <Brain size={15} /> Start Quiz — {questions.length} questions
      </button>
      {persistedScore && persistedScore.attempts > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          Last attempt: {persistedScore.correct}/{persistedScore.total} ({persistedScore.attempts} attempt{persistedScore.attempts > 1 ? "s" : ""})
        </p>
      )}
    </div>
  );

  if (done) {
    // Calibration summary — metacognitive feedback
    const overconfidentErrors = calibrationHits.filter(h => h.confidence >= 4 && !h.correct);
    const underconfidentWins = calibrationHits.filter(h => h.confidence <= 2 && h.correct);
    return (
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-xl p-6 border border-white/10 text-center">
        <div className="text-4xl mb-3" aria-hidden>{score === questions.length ? "🌟" : score >= questions.length / 2 ? "✅" : "📚"}</div>
        <div className="text-xl font-bold text-foreground mb-1">{score}/{questions.length} correct</div>
        <p className="text-sm text-muted-foreground mb-3">
          {score === questions.length ? "Perfect score." : score >= questions.length / 2 ? "Solid foundation — keep going." : "The explanations are doing the real teaching — read them closely."}
        </p>
        {showConfidence && (overconfidentErrors.length > 0 || underconfidentWins.length > 0) && (
          <div className="text-xs text-muted-foreground bg-white/3 rounded-lg p-3 mx-auto max-w-md text-left mb-3">
            <p className="font-semibold text-foreground mb-1">Calibration insight</p>
            {overconfidentErrors.length > 0 && <p>You were highly confident on {overconfidentErrors.length} question{overconfidentErrors.length > 1 ? "s" : ""} and got {overconfidentErrors.length > 1 ? "them" : "it"} wrong — those concepts deserve a second pass.</p>}
            {underconfidentWins.length > 0 && <p className="mt-1">You were low-confidence on {underconfidentWins.length} question{underconfidentWins.length > 1 ? "s" : ""} you actually got right — trust your judgment more.</p>}
          </div>
        )}
        <button onClick={reset} className="flex items-center gap-1.5 mx-auto px-4 py-2 rounded-lg glass border border-white/10 text-sm text-muted-foreground hover:text-foreground">
          <RotateCcw size={13} /> Retake
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-5 border border-white/10 space-y-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Question {qi + 1} / {questions.length}</span>
        <span>{score} correct so far</span>
      </div>
      <div className="w-full h-1 rounded-full bg-white/8">
        <div className="h-full rounded-full transition-all" style={{ width: `${(qi / questions.length) * 100}%`, background: accentColor }} />
      </div>
      <p className="text-sm font-medium text-foreground">{q.question}</p>

      {/* Confidence slider (Recommendation 3) */}
      {showConfidence && selected === null && (
        <div className="rounded-lg bg-white/3 border border-white/8 p-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>How confident are you before answering?</span>
            {confidence !== null && <span className="font-medium text-foreground">{confidence}/5</span>}
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setConfidence(n)}
                aria-label={`Confidence ${n} of 5`}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium border transition-all ${confidence === n ? "border-current text-foreground" : "border-white/10 text-muted-foreground hover:border-white/25"}`}
                style={confidence === n ? { background: `color-mix(in oklch, ${accentColor} 15%, transparent)`, color: accentColor } : undefined}>
                {n}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>guessing</span><span>certain</span></div>
        </div>
      )}

      <div className="space-y-2">
        {q.options.map((opt, i) => (
          <button key={i} onClick={() => handleAnswer(i)} disabled={showConfidence && confidence === null && selected === null}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              selected === null ? "glass border-white/10 text-foreground hover:border-white/25"
              : i === q.correct ? "bg-[oklch(0.72_0.18_150_/_0.15)] border-[oklch(0.72_0.18_150_/_0.4)] text-foreground"
              : selected === i ? "bg-[oklch(0.68_0.22_20_/_0.1)] border-[oklch(0.68_0.22_20_/_0.3)] text-muted-foreground"
              : "glass border-white/5 text-muted-foreground opacity-50"
            }`}>
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs border border-current shrink-0">{String.fromCharCode(65 + i)}</span>
              <span className="flex-1">{opt}</span>
              {selected !== null && i === q.correct && <span className="flex items-center gap-1 text-xs text-[oklch(0.72_0.18_150)] font-medium shrink-0"><CheckCircle2 size={13} /> Correct</span>}
              {selected === i && i !== q.correct && <span className="flex items-center gap-1 text-xs text-[oklch(0.78_0.22_20)] font-medium shrink-0"><XCircle size={13} /> Not this one</span>}
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
            <button onClick={handleNext} className="mt-3 flex items-center gap-1 text-xs font-medium hover:opacity-80" style={{ color: accentColor }}>
              {qi + 1 < questions.length ? "Next question" : "See results"} <ChevronRight size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ONBOARDING GATE — single question, writes preferences (SDT autonomy)
// ═══════════════════════════════════════════════════════════════════════════

function OnboardingGate({ onComplete }: { onComplete: (prefs: CoursePreferences) => void }) {
  const [step, setStep] = useState(0);
  const [motivation, setMotivation] = useState<Motivation | null>(null);
  const [proficiency, setProficiency] = useState<Proficiency | null>(null);
  const [pace, setPace] = useState<Pace | null>(null);

  const complete = () => {
    if (!motivation || !proficiency || !pace) return;
    onComplete({ motivationProfile: motivation, proficiencyLevel: proficiency, pacePreference: pace, setAt: Date.now() });
  };

  const motivationOpts: Array<{ id: Motivation; label: string; desc: string; icon: React.ReactNode }> = [
    { id: "career", label: "My career", desc: "I want to use AI well at work and stay ahead of changes to my job.", icon: <Briefcase size={22} /> },
    { id: "civic", label: "My role as a citizen", desc: "I want to understand how AI is shaping policy, justice, democracy.", icon: <Scale size={22} /> },
    { id: "curiosity", label: "Because it's interesting", desc: "I want to know how these systems actually work.", icon: <Compass size={22} /> },
    { id: "parent_educator", label: "My kids / students", desc: "I want to guide the next generation well.", icon: <Users size={22} /> },
  ];

  const proficiencyOpts: Array<{ id: Proficiency; label: string; desc: string }> = [
    { id: "novice", label: "New to all of this", desc: "I have used ChatGPT or similar maybe a few times — or not at all." },
    { id: "intermediate", label: "I use it regularly", desc: "I have a working understanding but want a proper mental model." },
    { id: "advanced", label: "I know the basics well", desc: "I want depth — mechanisms, tradeoffs, nuance." },
  ];

  const paceOpts: Array<{ id: Pace; label: string; desc: string }> = [
    { id: "accelerated", label: "Move fast", desc: "Essentials only. Fewer examples, shorter quizzes." },
    { id: "standard", label: "Standard", desc: "Balanced depth and pace." },
    { id: "deliberate", label: "Go deep", desc: "More examples, more practice, more questions." },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-8 border border-[oklch(0.75_0.18_55_/_0.3)] max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-white/8 border border-white/10 text-muted-foreground">Personalization · {step + 1} of 3</span>
      </div>

      {step === 0 && (
        <>
          <h2 className="text-xl font-bold text-foreground mb-2">What brings you here?</h2>
          <p className="text-sm text-muted-foreground mb-5">This shapes the examples, framings, and scenarios you'll see. You can change this any time.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {motivationOpts.map(o => (
              <button key={o.id} onClick={() => setMotivation(o.id)}
                className={`text-left p-4 rounded-xl border transition-all ${motivation === o.id ? "bg-[oklch(0.75_0.18_55_/_0.12)] border-[oklch(0.75_0.18_55_/_0.4)]" : "glass border-white/8 hover:border-white/20"}`}>
                <div className="flex items-start gap-3">
                  <span className="text-[oklch(0.85_0.18_55)] mt-0.5">{o.icon}</span>
                  <div>
                    <div className="font-semibold text-sm text-foreground">{o.label}</div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{o.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="flex justify-end mt-5">
            <button onClick={() => setStep(1)} disabled={!motivation}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-black disabled:opacity-40"
              style={{ background: "linear-gradient(to right, oklch(0.75 0.18 55), oklch(0.65 0.22 200))" }}>
              Next <ChevronRight size={13} className="inline ml-1" />
            </button>
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <h2 className="text-xl font-bold text-foreground mb-2">How familiar are you with AI?</h2>
          <p className="text-sm text-muted-foreground mb-5">Determines lesson depth — language, examples, quiz difficulty.</p>
          <div className="space-y-2">
            {proficiencyOpts.map(o => (
              <button key={o.id} onClick={() => setProficiency(o.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${proficiency === o.id ? "bg-[oklch(0.65_0.22_200_/_0.12)] border-[oklch(0.65_0.22_200_/_0.4)]" : "glass border-white/8 hover:border-white/20"}`}>
                <div className="font-semibold text-sm text-foreground">{o.label}</div>
                <p className="text-xs text-muted-foreground mt-1">{o.desc}</p>
              </button>
            ))}
          </div>
          <div className="flex justify-between mt-5">
            <button onClick={() => setStep(0)} className="px-4 py-2 rounded-xl glass border border-white/10 text-sm text-muted-foreground"><ChevronLeft size={13} className="inline mr-1" /> Back</button>
            <button onClick={() => setStep(2)} disabled={!proficiency}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-black disabled:opacity-40"
              style={{ background: "linear-gradient(to right, oklch(0.65 0.22 200), oklch(0.72 0.2 290))" }}>
              Next <ChevronRight size={13} className="inline ml-1" />
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h2 className="text-xl font-bold text-foreground mb-2">How much time do you want to spend?</h2>
          <p className="text-sm text-muted-foreground mb-5">Adjusts number of examples and quiz length. Not a hard cap.</p>
          <div className="space-y-2">
            {paceOpts.map(o => (
              <button key={o.id} onClick={() => setPace(o.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${pace === o.id ? "bg-[oklch(0.72_0.2_290_/_0.12)] border-[oklch(0.72_0.2_290_/_0.4)]" : "glass border-white/8 hover:border-white/20"}`}>
                <div className="font-semibold text-sm text-foreground">{o.label}</div>
                <p className="text-xs text-muted-foreground mt-1">{o.desc}</p>
              </button>
            ))}
          </div>
          <div className="flex justify-between mt-5">
            <button onClick={() => setStep(1)} className="px-4 py-2 rounded-xl glass border border-white/10 text-sm text-muted-foreground"><ChevronLeft size={13} className="inline mr-1" /> Back</button>
            <button onClick={complete} disabled={!pace}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-black disabled:opacity-40"
              style={{ background: "linear-gradient(to right, oklch(0.72 0.2 290), oklch(0.72 0.18 150))" }}>
              Start learning <Sparkles size={13} className="inline ml-1" />
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LESSON SHELL
// ═══════════════════════════════════════════════════════════════════════════

interface LessonShellProps {
  meta: LessonMeta;
  seed: LessonSeed;
  onComplete: () => void;
  completed: boolean;
  children: React.ReactNode;
  onBack: () => void;
  onNext?: () => void;
}

function LessonShell({ meta, seed, onComplete, completed, children, onBack, onNext }: LessonShellProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
      <button onClick={onBack} className="flex items-center gap-1.5 mb-5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft size={14} /> Back to all lessons
      </button>
      <div className="glass rounded-2xl p-5 border border-white/8 mb-5">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `color-mix(in oklch, ${meta.color} 15%, transparent)`, border: `1px solid color-mix(in oklch, ${meta.color} 30%, transparent)`, color: meta.color }}>
              {meta.icon}
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">
                Lesson {meta.id} · Depth: {seed.depthTier === 1 ? "essentials" : seed.depthTier === 3 ? "deep dive" : "standard"} · Vocabulary: {seed.vocabularyTier}
              </div>
              <h2 className="text-xl font-bold text-foreground">{meta.title}</h2>
              <p className="text-sm text-muted-foreground">{meta.subtitle}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock size={10} /> {meta.duration}</span>
            <span className="flex items-center gap-1 text-xs" style={{ color: meta.color }}><Zap size={10} /> +{meta.xp} XP</span>
            {completed && <span className="flex items-center gap-1 text-xs text-[oklch(0.72_0.18_150)] font-medium"><CheckCircle2 size={10} /> Complete</span>}
          </div>
        </div>
      </div>
      {children}
      <div className="mt-8 pt-6 border-t border-white/8">
        {completed
          ? <div className="flex items-center justify-center gap-2 text-sm text-[oklch(0.72_0.18_150)]"><Award size={15} /> Lesson complete — great work.</div>
          : <motion.button onClick={onComplete} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 text-black"
              style={{ background: `linear-gradient(to right, ${meta.color}, oklch(0.65 0.22 200))` }}>
              <CheckCircle2 size={15} /> Mark Complete & Earn {meta.xp} XP
            </motion.button>
        }
      </div>
      {onNext && (
        <div className="mt-4 flex justify-end">
          <button onClick={onNext}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg glass border border-white/10 text-sm text-muted-foreground hover:text-foreground transition-colors">
            Next lesson <ChevronRight size={13} />
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LESSON 1 — What Is AI?
// ═══════════════════════════════════════════════════════════════════════════

function Lesson1({ seed, state, setState, meta, onComplete, completed, onBack, onNext }: {
  seed: LessonSeed; state: CourseState; setState: (s: CourseState) => void;
  meta: LessonMeta; onComplete: () => void; completed: boolean;
  onBack: () => void; onNext?: () => void;
}) {
  const [seg, setSeg] = useState(state.segmentProgress[1] ?? 0);
  useEffect(() => { setState({ ...state, segmentProgress: { ...state.segmentProgress, 1: seg } }); /* eslint-disable-next-line */ }, [seg]);

  const concepts = useMemo(() => l1Concepts(seed), [seed]);
  const domainExamples = L1_DOMAIN_EXAMPLES[seed.exampleDomain];

  const narrationBySeg = {
    1: [
      "Artificial Intelligence is software that does things that usually need a person — recognizing a face, writing a sentence, recommending a movie. It does not think. It finds patterns.",
      "Artificial Intelligence is a computer system that performs tasks that typically require human intelligence — understanding language, recognizing patterns, making decisions, and learning from experience.",
      "Artificial Intelligence is a broad research programme encompassing systems that perform perception, reasoning, language, and action — today dominated by statistical learning over large data corpora.",
    ],
    2: [
      "Training is like teaching a dog with treats, but at a scale of billions of examples. The computer sees something, guesses, gets told how wrong it was, and adjusts. Repeat until it's good.",
      "Training is the core process. The model sees data, makes a prediction, gets feedback on how wrong it was, and adjusts millions of internal numbers to improve. Repeat billions of times.",
      "Training optimizes weighted parameters via gradient descent on a loss function, iterating billions of forward-backward passes across data shards to minimize prediction error.",
    ],
    3: [
      "AI is now everywhere: in your email, your phone, your bank. Understanding what it's doing is as important as knowing how to read a news headline.",
      "In 2024 alone, over 200 million people used AI writing tools. Hospitals use AI for diagnosis. Courts use it for sentencing recommendations. AI literacy is civic literacy now.",
      "AI systems increasingly mediate access to employment, credit, justice, and information. Meaningful civic participation now requires literacy in algorithmic systems' mechanisms and failure modes.",
    ],
  }[seg + 1 as 1 | 2 | 3][seed.depthTier - 1];

  return (
    <LessonShell meta={meta} seed={seed} onComplete={onComplete} completed={completed} onBack={onBack} onNext={onNext}>
      <div className="space-y-4">
        {/* Segment nav */}
        <div className="flex gap-2" role="tablist" aria-label="Lesson segments">
          {["The 60-Second Definition", "How AI Actually Learns", "AI in Your World"].map((t, i) => (
            <button key={i} onClick={() => setSeg(i)} role="tab" aria-selected={seg === i}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all border ${seg === i ? "bg-[oklch(0.75_0.18_55_/_0.15)] border-[oklch(0.75_0.18_55_/_0.4)] text-[oklch(0.85_0.18_55)]" : "glass border-white/8 text-muted-foreground hover:border-white/15"}`}>
              {i + 1}. {t}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={seg} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
            className="glass rounded-2xl p-6 border border-white/8">
            <Narrator text={narrationBySeg} />

            {seg === 0 && (
              <div className="mt-5 space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">{narrationBySeg}</p>
                <div className={`grid gap-3 ${concepts.length <= 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-" + Math.min(concepts.length, 4)}`}>
                  {concepts.map(c => (
                    <div key={c.id} className="glass rounded-xl p-4 border border-white/8">
                      <div className="mb-2" style={{ color: c.color }}>{c.icon}</div>
                      <div className="font-semibold text-sm text-foreground mb-1">{c.label}</div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {seed.vocabularyTier === "plain" ? c.plain || c.standard : seed.vocabularyTier === "technical" ? c.technical : c.standard}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {seg === 1 && (
              <div className="mt-5 space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">{narrationBySeg}</p>
                {/* Training pipeline — clean SVG-free flex with proper arrows */}
                <div className="flex flex-col sm:flex-row gap-2" role="list" aria-label="AI training pipeline">
                  {[
                    { n: "1", l: "Data In", d: "Text, images, audio — vast amounts" },
                    { n: "→", l: "", d: "" },
                    { n: "2", l: "Prediction", d: "Model makes a guess" },
                    { n: "→", l: "", d: "" },
                    { n: "3", l: "Feedback", d: "How wrong was it? (loss)" },
                    { n: "→", l: "", d: "" },
                    { n: "4", l: "Adjust", d: "Update millions of weights, repeat" },
                  ].map((s, i) => s.n === "→"
                    ? <div key={i} className="hidden sm:flex items-center justify-center text-muted-foreground self-center" aria-hidden>→</div>
                    : <div key={i} role="listitem" className="flex-1 glass rounded-xl p-3 border border-white/8 text-center">
                        <div className="text-base font-bold text-[oklch(0.85_0.18_55)] mb-1">{s.n}</div>
                        <div className="text-xs font-semibold text-foreground">{s.l}</div>
                        <p className="text-xs text-muted-foreground mt-1">{s.d}</p>
                      </div>
                  )}
                </div>
                <div className="glass rounded-xl p-4 border border-white/10">
                  <div className="flex items-start gap-2">
                    <Info size={13} className="text-[oklch(0.85_0.18_55)] mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Key insight:</strong> AI does not "understand" like a human. It finds statistical patterns strong enough that the output <em>looks</em> like understanding. That is why it can be brilliant at one task and wildly wrong at the next.
                    </p>
                  </div>
                </div>
                {seed.depthTier === 3 && (
                  <div className="glass rounded-xl p-4 border border-[oklch(0.78_0.16_30_/_0.2)]">
                    <div className="text-xs font-semibold text-[oklch(0.78_0.16_30)] mb-2">ADVANCED · The loss landscape</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Training is optimization over a high-dimensional, non-convex loss surface. Gradient descent follows the local slope. Modern optimizers (Adam, AdamW) add momentum and per-parameter learning rates. Overfitting happens when the model memorizes noise — regularization and validation sets are how we detect it.
                    </p>
                  </div>
                )}
              </div>
            )}

            {seg === 2 && (
              <div className="mt-5 space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">{narrationBySeg}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {domainExamples.slice(0, seed.examplesPerConcept === 3 ? 3 : 3).map(ex => (
                    <div key={ex.domain} className="glass rounded-xl p-4 border border-white/8">
                      <div className="font-semibold text-sm text-foreground mb-2">{ex.domain}</div>
                      <p className="text-xs text-muted-foreground mb-2"><strong>Uses:</strong> {ex.uses}</p>
                      <p className="text-xs text-[oklch(0.78_0.22_20)]"><strong>Risks:</strong> {ex.risk}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between">
          <button onClick={() => setSeg(Math.max(0, seg - 1))} disabled={seg === 0}
            className="flex items-center gap-1 px-4 py-2 rounded-lg glass border border-white/8 text-sm text-muted-foreground disabled:opacity-40">
            <ChevronLeft size={13} /> Previous
          </button>
          {seg < 2 && (
            <button onClick={() => setSeg(seg + 1)}
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[oklch(0.75_0.18_55_/_0.15)] border border-[oklch(0.75_0.18_55_/_0.3)] text-sm text-[oklch(0.85_0.18_55)]">
              Next <ChevronRight size={13} />
            </button>
          )}
        </div>

        <div className="glass rounded-2xl p-5 border border-white/8">
          <h4 className="font-semibold text-foreground mb-3">Knowledge Check</h4>
          <QuizBlock
            questions={DEF_QUIZ_TIERS[seed.quizTier]}
            accentColor="oklch(0.85 0.18 55)"
            storageKey="l1_definitions"
            persistedScore={state.quizScores.l1_definitions}
            onScoreUpdate={(k, c, t) => setState({ ...state, quizScores: { ...state.quizScores, [k]: { correct: c, total: t, attempts: (state.quizScores[k]?.attempts ?? 0) + 1 } } })}
            onConfidenceRecord={(qid, conf) => setState({ ...state, confidenceRatings: { ...state.confidenceRatings, [qid]: conf } })}
          />
        </div>
      </div>
    </LessonShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LESSON 2 — Myths vs. Reality (with optional productive-failure sorter)
// ═══════════════════════════════════════════════════════════════════════════

function Lesson2({ seed, state, setState, meta, onComplete, completed, onBack, onNext }: {
  seed: LessonSeed; state: CourseState; setState: (s: CourseState) => void;
  meta: LessonMeta; onComplete: () => void; completed: boolean;
  onBack: () => void; onNext?: () => void;
}) {
  // Spaced retrieval: retrieve a Lesson 1 concept if the user completed Lesson 1
  const didLesson1 = state.completedLessons.includes(1);

  // Productive-failure sort (Recommendation 1)
  const [sorter, setSorter] = useState<null | "sorting" | "revealed">(seed.enableProductiveFailure ? "sorting" : null);
  const SORT_STATEMENTS = [
    { id: "s1", text: "AI can 'hallucinate' — produce confident-sounding falsehoods.", isMyth: false },
    { id: "s2", text: "AI understands language the way humans do.", isMyth: true },
    { id: "s3", text: "AI systems inherit bias from their training data.", isMyth: false },
    { id: "s4", text: "AI will replace every human job within ten years.", isMyth: true },
    { id: "s5", text: "AI is 100% objective because it runs on math.", isMyth: true },
    { id: "s6", text: "AI can be better than humans at specific narrow tasks.", isMyth: false },
  ];
  const [sortChoices, setSortChoices] = useState<Record<string, "myth" | "reality">>({});

  const myths = seed.depthTier === 1 ? MYTH_QUIZ_TIERS[1] : seed.depthTier === 3 ? MYTH_QUIZ_TIERS[3] : MYTH_QUIZ_TIERS[2];
  const accent = "oklch(0.65 0.22 200)";

  return (
    <LessonShell meta={meta} seed={seed} onComplete={onComplete} completed={completed} onBack={onBack} onNext={onNext}>
      <div className="space-y-5">
        {/* Spaced retrieval callback (Recommendation 2) */}
        {didLesson1 && (
          <div className="glass rounded-xl p-4 border border-[oklch(0.75_0.18_55_/_0.25)]">
            <div className="text-xs font-semibold text-[oklch(0.85_0.18_55)] mb-1">QUICK RETRIEVAL · From Lesson 1</div>
            <p className="text-xs text-muted-foreground">
              Before we start: <em className="text-foreground">Why does an LLM's output sound coherent even though it has no understanding?</em> Think for a moment before continuing — the quick retrieval strengthens the memory.
            </p>
          </div>
        )}

        <div className="glass rounded-2xl p-6 border border-white/8">
          <Narrator text="This lesson debunks the most common AI myths. For each statement, decide — fact or fiction? The explanation afterward is where the real learning happens." />
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { l: "Media Fear", t: "Robots will take over. AI is sentient. AI never makes mistakes.", c: "oklch(0.72 0.2 290)", icon: <AlertTriangle size={16} /> },
              { l: "Reality", t: "Narrow tools. Statistical pattern-matching. Useful but brittle. Trained — not conscious.", c: "oklch(0.72 0.18 150)", icon: <CheckCircle2 size={16} /> },
              { l: "Media Hype", t: "AI will solve cancer next year. AI reads minds. AI is 100% objective.", c: "oklch(0.78 0.16 30)", icon: <TrendingUp size={16} /> },
            ].map(({ l, t, c, icon }) => (
              <div key={l} className="glass rounded-xl p-4 border border-white/8">
                <div className="flex items-center gap-2 text-xs font-semibold mb-2" style={{ color: c }}>{icon} {l}</div>
                <p className="text-xs text-muted-foreground leading-relaxed">{t}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Productive-failure sorter (optional by profile) */}
        {sorter === "sorting" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6 border border-[oklch(0.72_0.2_290_/_0.25)]">
            <div className="text-xs font-semibold text-[oklch(0.82_0.2_290)] mb-1">BEFORE WE TEACH — YOU GUESS FIRST</div>
            <h3 className="text-base font-semibold text-foreground mb-3">Sort these statements. You will probably miss some — that is the point.</h3>
            <div className="space-y-2">
              {SORT_STATEMENTS.map(s => (
                <div key={s.id} className="glass rounded-xl p-3 border border-white/8 flex items-center gap-3">
                  <p className="text-sm text-foreground flex-1">{s.text}</p>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setSortChoices(c => ({ ...c, [s.id]: "myth" }))}
                      className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${sortChoices[s.id] === "myth" ? "bg-[oklch(0.78_0.22_20_/_0.15)] border-[oklch(0.78_0.22_20_/_0.4)] text-[oklch(0.88_0.22_20)]" : "glass border-white/10 text-muted-foreground"}`}>
                      Myth
                    </button>
                    <button onClick={() => setSortChoices(c => ({ ...c, [s.id]: "reality" }))}
                      className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${sortChoices[s.id] === "reality" ? "bg-[oklch(0.72_0.18_150_/_0.15)] border-[oklch(0.72_0.18_150_/_0.4)] text-[oklch(0.82_0.18_150)]" : "glass border-white/10 text-muted-foreground"}`}>
                      Reality
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-muted-foreground">{Object.keys(sortChoices).length} / {SORT_STATEMENTS.length} sorted</span>
              <button onClick={() => setSorter("revealed")} disabled={Object.keys(sortChoices).length < SORT_STATEMENTS.length}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-black disabled:opacity-40"
                style={{ background: "linear-gradient(to right, oklch(0.72 0.2 290), oklch(0.65 0.22 200))" }}>
                Reveal answers
              </button>
            </div>
          </motion.div>
        )}

        {sorter === "revealed" && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6 border border-[oklch(0.72_0.18_150_/_0.25)] space-y-3">
            <div className="text-xs font-semibold text-[oklch(0.82_0.18_150)]">YOUR RESULTS</div>
            {SORT_STATEMENTS.map(s => {
              const userChoice = sortChoices[s.id];
              const truth = s.isMyth ? "myth" : "reality";
              const correct = userChoice === truth;
              return (
                <div key={s.id} className={`rounded-xl p-3 border ${correct ? "bg-[oklch(0.72_0.18_150_/_0.08)] border-[oklch(0.72_0.18_150_/_0.25)]" : "bg-[oklch(0.78_0.22_20_/_0.08)] border-[oklch(0.78_0.22_20_/_0.25)]"}`}>
                  <div className="flex items-start gap-2">
                    {correct ? <CheckCircle2 size={14} className="text-[oklch(0.72_0.18_150)] mt-0.5 shrink-0" /> : <XCircle size={14} className="text-[oklch(0.78_0.22_20)] mt-0.5 shrink-0" />}
                    <div className="flex-1">
                      <p className="text-sm text-foreground">{s.text}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        You said <strong>{userChoice}</strong>. Actually: <strong className="text-foreground">{truth}</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-muted-foreground italic pt-2">
              Now the quiz below will drill these deeper. You will retain more than learners who were handed the answers first — this is called productive failure.
            </p>
          </motion.div>
        )}

        {/* Main quiz — always rendered; gated on sorter completion if enabled */}
        {(!seed.enableProductiveFailure || sorter === "revealed") && (
          <div className="glass rounded-2xl p-5 border border-white/8">
            <h4 className="font-semibold text-foreground mb-3">Myth Buster Quiz</h4>
            <QuizBlock
              questions={myths}
              accentColor={accent}
              storageKey="l2_myths"
              persistedScore={state.quizScores.l2_myths}
              onScoreUpdate={(k, c, t) => setState({ ...state, quizScores: { ...state.quizScores, [k]: { correct: c, total: t, attempts: (state.quizScores[k]?.attempts ?? 0) + 1 } } })}
              onConfidenceRecord={(qid, conf) => setState({ ...state, confidenceRatings: { ...state.confidenceRatings, [qid]: conf } })}
            />
          </div>
        )}

        {/* Advanced-only: hallucination mechanism panel */}
        {seed.depthTier === 3 && (
          <div className="glass rounded-2xl p-5 border border-[oklch(0.78_0.16_30_/_0.2)]">
            <div className="text-xs font-semibold text-[oklch(0.88_0.16_30)] mb-2">DEEP DIVE · Why LLMs hallucinate (the mechanism)</div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              LLMs are trained on next-token prediction. The training objective rewards outputs that are <em>plausible continuations</em> of the input — not outputs that are <em>true</em>. There is no truth signal in the loss function. This is why hallucination is not a bug to be patched; it is a direct consequence of the training regime. Fixes live outside the model: retrieval augmentation (RAG), tool use, verifiable grounding, and human oversight.
            </p>
          </div>
        )}
      </div>
    </LessonShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LESSON 3 — Prompt Engineering (FIXED grading: execution + critique)
// ═══════════════════════════════════════════════════════════════════════════

function Lesson3({ seed, state, setState, meta, onComplete, completed, onBack, onNext }: {
  seed: LessonSeed; state: CourseState; setState: (s: CourseState) => void;
  meta: LessonMeta; onComplete: () => void; completed: boolean;
  onBack: () => void; onNext?: () => void;
}) {
  const exercises = PROMPT_EXERCISES_BY_DOMAIN[seed.exampleDomain] ?? PROMPT_EXERCISES_BY_DOMAIN.general;
  const limitedExercises = seed.depthTier === 1 ? exercises.slice(0, 2) : exercises.slice(0, 3);

  const [activeEx, setActiveEx] = useState(0);
  const [userPrompt, setUserPrompt] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [checklist, setChecklist] = useState<boolean[]>([false, false, false, false]);
  const [execResponse, setExecResponse] = useState("");
  const [critique, setCritique] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<"idle" | "exec" | "critique" | "done">("idle");

  const { addXP } = usePersonalization();
  const ex = limitedExercises[activeEx];

  // Two-stage call using the existing ai.explainConcept endpoint:
  //   stage 1: "here is a user's prompt — produce what the AI would likely produce as output"
  //   stage 2: "here is the same prompt and a rubric — score each criterion 0/1 with one-line justifications"
  const executeMutation = trpc.ai.explainConcept.useMutation({
    onSuccess: (d) => { setExecResponse(d.explanation); setPhase("critique"); runCritique(); },
    onError: (e: { message: string }) => { toast.error(e.message); setLoading(false); setPhase("idle"); },
  });
  const critiqueMutation = trpc.ai.explainConcept.useMutation({
    onSuccess: (d) => { setCritique(d.explanation); setLoading(false); setPhase("done"); },
    onError: (e: { message: string }) => { toast.error(e.message); setLoading(false); },
  });

  const runCritique = () => {
    const rubricText = ex.rubric.map((r, i) => `${i + 1}. ${r}`).join("\n");
    critiqueMutation.mutate({
      concept: `You are critiquing a learner's prompt. SCENARIO: "${ex.scenario}" LEARNER'S PROMPT: "${userPrompt}" RUBRIC (score each 0=absent, 1=present):\n${rubricText}\n\nReturn a short analysis: one line per rubric item saying PRESENT or MISSING plus one line explaining why, then one sentence of concrete advice. Be direct and specific. Do not write a new prompt for them.`,
      level: "student",
    });
  };

  const handleSubmit = () => {
    if (!userPrompt.trim()) { toast.error("Write a prompt first."); return; }
    setLoading(true); setExecResponse(""); setCritique(""); setPhase("exec");
    executeMutation.mutate({
      concept: `You are a task-executing AI. Produce the output that the following prompt requests. Do NOT discuss the prompt — just do what it asks. SCENARIO CONTEXT (what the learner was working on, for your understanding only): "${ex.scenario}" PROMPT: "${userPrompt}"`,
      level: "student",
    });
  };

  const handleCheck = (i: number) => {
    const updated = [...checklist]; updated[i] = !updated[i]; setChecklist(updated);
    const sc = updated.filter(Boolean).length;
    setState({ ...state, promptRubricScores: { ...state.promptRubricScores, [ex.id]: sc } });
    if (sc === 4) { addXP(15); toast.success("+15 XP — perfect prompt."); }
  };

  const switchEx = (idx: number) => {
    setActiveEx(idx); setUserPrompt(""); setShowHint(false);
    setChecklist([false, false, false, false]); setExecResponse(""); setCritique(""); setPhase("idle");
  };

  const promptScore = state.promptRubricScores[ex.id] ?? 0;

  const PRINCIPLES = seed.depthTier === 1
    ? [
        { n: "Who", d: "Tell AI who it is talking to" },
        { n: "What", d: "Describe exactly what you want" },
        { n: "How", d: "Say how long / what style" },
      ]
    : [
        { n: "Persona", d: "Tell AI who to act as" },
        { n: "Context", d: "Provide background" },
        { n: "Specifics", d: "Concrete details & numbers" },
        { n: "Constraints", d: "Length, format, tone" },
        { n: "Goal", d: "State desired outcome" },
      ];

  return (
    <LessonShell meta={meta} seed={seed} onComplete={onComplete} completed={completed} onBack={onBack} onNext={onNext}>
      <div className="space-y-5">
        {/* Spaced retrieval from Lesson 2 */}
        {state.completedLessons.includes(2) && (
          <div className="glass rounded-xl p-4 border border-[oklch(0.65_0.22_200_/_0.25)]">
            <div className="text-xs font-semibold text-[oklch(0.75_0.22_200)] mb-1">QUICK RETRIEVAL · From Lesson 2</div>
            <p className="text-xs text-muted-foreground">
              Before writing prompts: <em className="text-foreground">Why can an AI give you a confident-sounding answer that is completely wrong?</em> Hold that in mind while testing your prompts.
            </p>
          </div>
        )}

        <div className="glass rounded-2xl p-6 border border-white/8">
          <Narrator text="Prompt engineering is communication design. You are writing instructions for a capable but literal assistant with no context about you. Precision wins." />
          <div className="mt-4 glass rounded-xl p-4 border border-[oklch(0.72_0.2_290_/_0.2)]">
            <div className="text-xs font-semibold text-[oklch(0.82_0.2_290)] mb-3">
              {seed.depthTier === 1 ? "THE 3 PROMPT ESSENTIALS" : "THE 5 PROMPT PRINCIPLES"}
            </div>
            <div className={`grid gap-2 ${PRINCIPLES.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-5"}`}>
              {PRINCIPLES.map(p => (
                <div key={p.n} className="glass rounded-lg p-3 border border-white/8">
                  <div className="text-xs font-bold text-foreground mb-1">{p.n}</div>
                  <p className="text-xs text-muted-foreground leading-snug">{p.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Exercise selector */}
        <div className="flex gap-2">
          {limitedExercises.map((e, i) => (
            <button key={i} onClick={() => switchEx(i)}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all border ${activeEx === i ? "bg-[oklch(0.72_0.2_290_/_0.15)] border-[oklch(0.72_0.2_290_/_0.4)] text-[oklch(0.82_0.2_290)]" : "glass border-white/8 text-muted-foreground"}`}>
              {i + 1}. {e.title}
              {state.promptRubricScores[e.id] !== undefined && <span className="text-[oklch(0.72_0.18_150)]"> ({state.promptRubricScores[e.id]}/4)</span>}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={activeEx} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
            className="glass rounded-2xl p-6 border border-white/8 space-y-4">
            <h3 className="font-semibold text-foreground">{ex.title}</h3>
            <div className="glass rounded-xl p-4 border border-[oklch(0.72_0.2_290_/_0.15)]">
              <div className="text-xs font-semibold text-[oklch(0.82_0.2_290)] mb-1.5">SCENARIO</div>
              <p className="text-sm text-muted-foreground leading-relaxed">{ex.scenario}</p>
            </div>
            <div className="glass rounded-xl p-3 border border-white/8">
              <div className="text-xs text-muted-foreground mb-1">A weak prompt for this would be:</div>
              <p className="text-sm text-foreground font-mono italic">"{ex.vague}"</p>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Your improved prompt:</label>
              <textarea value={userPrompt} onChange={e => setUserPrompt(e.target.value)}
                placeholder="Write a detailed, specific prompt using the principles above..."
                rows={5}
                className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[oklch(0.72_0.2_290_/_0.5)] resize-none font-mono transition-colors" />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowHint(s => !s)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg glass border border-white/8 text-xs text-muted-foreground">
                <HelpCircle size={12} /> {showHint ? "Hide hint" : "Show hint"}
              </button>
              <motion.button onClick={handleSubmit} disabled={loading || !userPrompt.trim()}
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[oklch(0.72_0.2_290)] text-white text-sm font-medium disabled:opacity-50">
                {loading
                  ? <><RefreshCw size={13} className="animate-spin" /> {phase === "exec" ? "Running your prompt..." : "Grading..."}</>
                  : <><Send size={13} /> Execute & Grade</>
                }
              </motion.button>
            </div>

            <AnimatePresence>
              {showHint && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="px-4 py-3 rounded-xl bg-[oklch(0.72_0.2_290_/_0.08)] border border-[oklch(0.72_0.2_290_/_0.2)] text-sm text-muted-foreground overflow-hidden">
                  <strong className="text-foreground">Hint: </strong>{ex.hint}
                </motion.div>
              )}
              {execResponse && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-xl p-5 border border-[oklch(0.72_0.2_290_/_0.2)]">
                  <div className="text-xs font-semibold text-[oklch(0.82_0.2_290)] mb-2">WHAT YOUR PROMPT WOULD PRODUCE</div>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{execResponse}</p>
                </motion.div>
              )}
              {critique && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-xl p-5 border border-[oklch(0.72_0.18_150_/_0.25)]">
                  <div className="text-xs font-semibold text-[oklch(0.82_0.18_150)] mb-2">AI-GRADED CRITIQUE</div>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{critique}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="glass rounded-xl p-5 border border-[oklch(0.72_0.2_290_/_0.15)]">
              <div className="text-xs font-semibold text-[oklch(0.82_0.2_290)] mb-2">YOUR SELF-EVALUATION</div>
              <p className="text-xs text-muted-foreground mb-3">Compare the AI critique above to your own check. Honest self-assessment is the skill.</p>
              <div className="space-y-2">
                {ex.rubric.map((criterion, i) => (
                  <label key={i} className="flex items-start gap-3 cursor-pointer">
                    <button onClick={() => handleCheck(i)}
                      aria-label={`Mark criterion ${i + 1} complete`}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all ${checklist[i] ? "bg-[oklch(0.72_0.18_150)] border-[oklch(0.72_0.18_150)]" : "border-white/20"}`}>
                      {checklist[i] && <Check size={11} className="text-white" />}
                    </button>
                    <span className={`text-sm ${checklist[i] ? "text-foreground" : "text-muted-foreground"}`}>{criterion}</span>
                  </label>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <Progress value={(promptScore / 4) * 100} className="flex-1 h-2" />
                <span className="text-xs font-medium text-foreground">{promptScore}/4</span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </LessonShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LESSON 4 — Ethics & Society
// ═══════════════════════════════════════════════════════════════════════════

function Lesson4({ seed, state, setState, meta, onComplete, completed, onBack, onNext }: {
  seed: LessonSeed; state: CourseState; setState: (s: CourseState) => void;
  meta: LessonMeta; onComplete: () => void; completed: boolean;
  onBack: () => void; onNext?: () => void;
}) {
  const scenarioIds = seed.ethicsPriority.slice(0, seed.depthTier === 1 ? 2 : 3);
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const accent = "oklch(0.72 0.18 150)";
  const sc = ETHICS_SCENARIOS[scenarioIds[active]];

  const saveReflection = () => {
    const text = state.ethicsReflections[sc.id] ?? "";
    if (!text.trim()) { toast.error("Write your perspective first."); return; }
    setState({ ...state, ethicsReflections: { ...state.ethicsReflections, [sc.id]: text } });
    toast.success("Reflection saved.");
  };

  return (
    <LessonShell meta={meta} seed={seed} onComplete={onComplete} completed={completed} onBack={onBack} onNext={onNext}>
      <div className="space-y-5">
        {state.completedLessons.includes(3) && (
          <div className="glass rounded-xl p-4 border border-[oklch(0.72_0.2_290_/_0.25)]">
            <div className="text-xs font-semibold text-[oklch(0.82_0.2_290)] mb-1">QUICK RETRIEVAL · From Lesson 3</div>
            <p className="text-xs text-muted-foreground">
              Before we discuss ethics: <em className="text-foreground">Why does a clearer prompt produce better output?</em> Same principle applies when designing AI systems for real-world deployment.
            </p>
          </div>
        )}

        <div className="glass rounded-2xl p-6 border border-white/8">
          <Narrator text="AI ethics is not about being anti-technology. It is about asking: Who benefits? Who bears the risk? Who decides? These scenarios have no single correct answer." />
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { l: "Fairness", d: "Does it treat all groups equitably?", icon: <Shield size={18} className="text-[oklch(0.82_0.18_150)]" /> },
              { l: "Accountability", d: "When it harms, who is responsible?", icon: <Scale size={18} className="text-[oklch(0.75_0.22_200)]" /> },
              { l: "Transparency", d: "Can people understand the decision?", icon: <Eye size={18} className="text-[oklch(0.85_0.18_55)]" /> },
            ].map(({ l, d, icon }) => (
              <div key={l} className="glass rounded-xl p-3 border border-white/8 text-center">
                <div className="flex justify-center mb-2">{icon}</div>
                <div className="text-xs font-semibold text-foreground">{l}</div>
                <p className="text-xs text-muted-foreground mt-1 leading-snug">{d}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          {scenarioIds.map((id, i) => (
            <button key={id} onClick={() => { setActive(i); setExpanded(null); }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all border ${active === i ? "bg-[oklch(0.72_0.18_150_/_0.15)] border-[oklch(0.72_0.18_150_/_0.4)] text-[oklch(0.82_0.18_150)]" : "glass border-white/8 text-muted-foreground"}`}>
              {ETHICS_SCENARIOS[id].title}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={active} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
            className="glass rounded-2xl p-6 border border-white/8 space-y-4">
            <h3 className="font-semibold text-foreground">{sc.title}</h3>
            <div className="glass rounded-xl p-4 border border-[oklch(0.72_0.18_150_/_0.15)]">
              <div className="text-xs font-semibold text-[oklch(0.82_0.18_150)] mb-2">THE SITUATION</div>
              <p className="text-sm text-muted-foreground leading-relaxed">{sc.setup}</p>
            </div>

            <div>
              <div className="text-sm font-semibold text-foreground mb-2">Who is affected?</div>
              <div className="space-y-2">
                {sc.stakeholders.map((s, i) => (
                  <div key={i} className="glass rounded-xl border border-white/8 overflow-hidden">
                    <button onClick={() => setExpanded(expanded === i ? null : i)}
                      className="w-full flex items-center justify-between p-3 hover:bg-white/3 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[oklch(0.72_0.18_150_/_0.15)] border border-[oklch(0.72_0.18_150_/_0.3)] flex items-center justify-center text-xs font-bold text-[oklch(0.82_0.18_150)]">{s.name.charAt(0)}</div>
                        <span className="text-sm font-medium text-foreground">{s.name}</span>
                      </div>
                      <ChevronDown size={13} className={`text-muted-foreground transition-transform ${expanded === i ? "rotate-180" : ""}`} />
                    </button>
                    <AnimatePresence>
                      {expanded === i && (
                        <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                          <p className="px-4 pb-3 pt-2 text-sm text-muted-foreground border-t border-white/5 leading-relaxed">{s.concern}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>

            {/* Regulatory framework — shown at depth 2+ */}
            {seed.depthTier >= 2 && (
              <div className="glass rounded-xl p-4 border border-[oklch(0.78_0.16_30_/_0.2)]">
                <div className="text-xs font-semibold text-[oklch(0.88_0.16_30)] mb-2">REGULATORY FRAMEWORK</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{sc.framework}</p>
              </div>
            )}

            <div className="glass rounded-xl p-5 border border-[oklch(0.72_0.18_150_/_0.2)]">
              <div className="text-xs font-semibold text-[oklch(0.82_0.18_150)] mb-2">DISCUSSION</div>
              <p className="text-sm text-muted-foreground mb-3">{sc.discussion}</p>
              <label className="text-xs font-medium text-foreground mb-2 block">Your perspective:</label>
              <textarea
                value={state.ethicsReflections[sc.id] ?? ""}
                onChange={e => setState({ ...state, ethicsReflections: { ...state.ethicsReflections, [sc.id]: e.target.value } })}
                placeholder="Reason through it. Who bears the greatest responsibility? What safeguards would you require? There's no single right answer."
                rows={4} className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[oklch(0.72_0.18_150_/_0.5)] resize-none" />
              <button onClick={saveReflection}
                className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[oklch(0.72_0.18_150_/_0.2)] border border-[oklch(0.72_0.18_150_/_0.3)] text-sm text-[oklch(0.82_0.18_150)]">
                <MessageSquare size={13} /> Save Reflection
              </button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </LessonShell>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LESSON 5 — Capstone (AI-graded)
// ═══════════════════════════════════════════════════════════════════════════

function Lesson5({ seed, state, setState, meta, onComplete, completed, onBack }: {
  seed: LessonSeed; state: CourseState; setState: (s: CourseState) => void;
  meta: LessonMeta; onComplete: () => void; completed: boolean;
  onBack: () => void;
}) {
  const [step, setStep] = useState(0);
  const [grading, setGrading] = useState(false);
  const [feedback, setFeedback] = useState<string>("");

  const prevCount = state.completedLessons.filter(l => l < 5).length;
  const allDone = prevCount >= 4;

  const PROMPTS_BY_MOTIVATION: Record<Motivation, Array<{ label: string; q: string; ph: string }>> = {
    career: [
      { label: "Real-World Application", q: "Name one AI tool or system used at your workplace (or one you'd realistically adopt). How does it work, what data does it use, and who benefits — your team, the company, you personally?", ph: "e.g., Microsoft Copilot is used across our team for email drafts and meeting summaries. It uses our tenant data — kept inside the org. Benefits: I reclaim 5 hours/week. Risks: colleagues trust drafts without editing them..." },
      { label: "Myth Identification", q: "A headline reads: 'AI Coder Outperforms Senior Engineers — Layoffs Next.' Using what you learned, dismantle what is misleading here.", ph: "e.g., 'Outperforms' on what benchmark? Coding LLMs handle specific isolated problems well, but software engineering is mostly debugging, architecture, and communication — none of which is measured by code-generation benchmarks..." },
      { label: "Ethical Reasoning", q: "Your company wants to use AI to score employees on 'productivity' using keystroke and calendar data. Name two serious concerns and one safeguard you'd require before deployment.", ph: "e.g., Concern 1: keystrokes don't measure knowledge work — thinking time looks like idleness. Concern 2: power asymmetry — employees can't audit the system that judges them. Safeguard: right to contest with human review..." },
    ],
    civic: [
      { label: "Real-World Application", q: "Name one AI system being used by a government or public institution today. How does it work, what data does it need, and who benefits — citizens, the state, a vendor?", ph: "e.g., Predictive policing software flags 'hot spots' for patrol. It ingests historical arrest data — which reflects past policing decisions. Benefits: the department claims efficiency. Risks: residents in over-policed areas get more policing, creating a feedback loop..." },
      { label: "Myth Identification", q: "A headline reads: 'AI-Powered Benefits System to Eliminate Fraud.' Using what you learned, break down what is misleading.", ph: "e.g., 'Eliminate' is too strong — these systems shift error patterns, they don't remove them. 'Fraud' framing obscures that most denials are of legitimate claimants with irregular paperwork..." },
      { label: "Ethical Reasoning", q: "A city proposes AI-driven pre-trial risk scoring. Name two serious concerns and one safeguard you would require before deployment.", ph: "e.g., Concern 1: historical arrest data encodes biased policing — not actual risk. Concern 2: opacity — defendants can't contest what they can't see. Safeguard: right to challenge scores, independent audit of outcomes by demographic..." },
    ],
    curiosity: [
      { label: "Real-World Application", q: "Pick any AI system you interact with. Explain how it works using concepts from this course — training data, narrow capability, the plausibility-vs-truth gap.", ph: "e.g., Netflix's recommender is ML on viewing behavior from millions of users. It predicts what I'd enjoy — narrow task. It has no concept of what's 'good' for me; it optimizes engagement. That gap (plausible-next-watch vs. actually-good-for-me) is the Lesson 2 insight..." },
      { label: "Myth Identification", q: "A headline reads: 'AI Develops New Language Humans Can't Understand.' Using what you learned, explain what is actually going on.", ph: "e.g., This was a 2017 paper where chatbots optimized for a reward ended up producing token sequences that maximized score. It wasn't a 'language' — it was symbol-optimization without grammar. The viral framing was wrong in its key claim..." },
      { label: "Ethical Reasoning", q: "Name an AI capability that concerns you philosophically and explain why — then steel-man the case that we should develop it anyway.", ph: "e.g., Synthetic voice cloning worries me because consent to future audio becomes impossible to withdraw. Steel-man: voice-cloning restores speech to ALS patients and reduces voiceover costs for small creators. The tension is real..." },
    ],
    parent_educator: [
      { label: "Real-World Application", q: "Name one AI your child or student interacts with. How does it work, what data does it collect, and what are the costs and benefits you should weigh?", ph: "e.g., My 14yo uses ChatGPT for homework. Trained on internet text; may log their conversations. Benefit: she gets a tutor at 11pm. Cost: she may stop struggling productively with hard material — the struggle is where learning happens..." },
      { label: "Myth Identification", q: "A headline reads: 'AI Tutors Lift Student Test Scores 40%.' Using what you learned, dismantle what is misleading.", ph: "e.g., 40% on what measure? Which students — motivated ones who chose to use it, or a random sample? How long was the study? 'Test scores' can be gamed by teaching to the test without learning. The specific conditions matter enormously..." },
      { label: "Ethical Reasoning", q: "A school wants to deploy AI that flags 'at-risk' students using attendance, grades, and messaging patterns. Name two concerns and one safeguard.", ph: "e.g., Concern 1: false positives label kids unfairly, and those labels stick in teacher perceptions. Concern 2: surveillance normalizes monitoring of minors. Safeguard: flagged students must be reviewed by a human before any intervention..." },
    ],
  };

  const PROMPTS = PROMPTS_BY_MOTIVATION[seed.framingTheme];

  const gradeMutation = trpc.ai.explainConcept.useMutation({
    onSuccess: (d) => { setFeedback(d.explanation); setGrading(false); },
    onError: (e: { message: string }) => { toast.error(e.message); setGrading(false); },
  });

  const submit = () => {
    const filled = state.capstoneAnswers.filter(a => a.length > 20).length;
    if (filled < 3) { toast.error(`Complete all 3 parts (${filled}/3 done).`); return; }
    setGrading(true);
    const rubricLines = [
      "Response 1 addresses a real AI system and correctly identifies mechanism + data + stakeholder.",
      "Response 2 correctly identifies at least two misleading elements in the headline.",
      "Response 3 names two substantive ethical concerns and proposes a realistic safeguard.",
    ];
    gradeMutation.mutate({
      concept: `You are grading an AI Literacy capstone. Apply this rubric rigorously:\n${rubricLines.map((r, i) => `${i + 1}. ${r}`).join("\n")}\n\nLEARNER RESPONSES:\n1) ${state.capstoneAnswers[0]}\n\n2) ${state.capstoneAnswers[1]}\n\n3) ${state.capstoneAnswers[2]}\n\nFor each response give a score (0, 1, or 2), a one-sentence strength, and a one-sentence growth point. Then give an overall band: FOUNDATION / DEVELOPING / PROFICIENT / DISTINGUISHED. Be direct — flattery is not useful.`,
      level: "student",
    });
    setState({ ...state, capstoneSubmitted: true });
  };

  return (
    <LessonShell meta={meta} seed={seed} onComplete={onComplete} completed={completed} onBack={onBack}>
      <div className="space-y-5">
        {!allDone && (
          <div className="glass rounded-xl p-5 border border-[oklch(0.78_0.16_30_/_0.3)]">
            <div className="flex items-start gap-3">
              <Lock size={16} className="text-[oklch(0.88_0.16_30)] mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-foreground mb-1">Consider completing earlier lessons first</h4>
                <p className="text-sm text-muted-foreground">The capstone builds on all four. You've completed {prevCount}/4. You can attempt anyway — this is your course.</p>
              </div>
            </div>
          </div>
        )}

        <div className="glass rounded-2xl p-6 border border-white/8">
          <Narrator text="This capstone applies everything — definitions, myth-busting, prompt engineering, and ethical reasoning — to real-world situations. Be specific. Specific answers are the mark of genuine understanding. You will receive AI-graded feedback." />
        </div>

        <div className="flex gap-2">
          {PROMPTS.map((p, i) => (
            <button key={i} onClick={() => setStep(i)}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all border text-center ${step === i ? "bg-[oklch(0.78_0.16_30_/_0.15)] border-[oklch(0.78_0.16_30_/_0.4)] text-[oklch(0.88_0.16_30)]" : "glass border-white/8 text-muted-foreground"}`}>
              {p.label} {state.capstoneAnswers[i].length > 20 && <span className="text-[oklch(0.72_0.18_150)]">✓</span>}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
            className="glass rounded-2xl p-6 border border-[oklch(0.78_0.16_30_/_0.15)]">
            <div className="text-xs font-semibold text-[oklch(0.88_0.16_30)] mb-3">CAPSTONE · {PROMPTS[step].label.toUpperCase()}</div>
            <p className="text-sm font-medium text-foreground mb-4 leading-snug">{PROMPTS[step].q}</p>
            <textarea value={state.capstoneAnswers[step]}
              onChange={e => { const u = [...state.capstoneAnswers]; u[step] = e.target.value; setState({ ...state, capstoneAnswers: u }); }}
              placeholder={PROMPTS[step].ph} rows={7}
              className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[oklch(0.78_0.16_30_/_0.5)] resize-none leading-relaxed" />
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-muted-foreground">{state.capstoneAnswers[step].length} characters</span>
              <div className="flex gap-2">
                {step > 0 && <button onClick={() => setStep(step - 1)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg glass border border-white/8 text-xs text-muted-foreground"><ChevronLeft size={12} /> Previous</button>}
                {step < PROMPTS.length - 1
                  ? <button onClick={() => setStep(step + 1)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[oklch(0.78_0.16_30_/_0.2)] border border-[oklch(0.78_0.16_30_/_0.3)] text-xs text-[oklch(0.88_0.16_30)]">Next <ChevronRight size={12} /></button>
                  : !state.capstoneSubmitted && (
                    <motion.button onClick={submit} disabled={grading} whileHover={{ scale: 1.02 }}
                      className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-black text-xs font-semibold disabled:opacity-50"
                      style={{ background: "linear-gradient(to right, oklch(0.78 0.16 30), oklch(0.85 0.18 55))" }}>
                      {grading ? <><RefreshCw size={12} className="animate-spin" /> Grading...</> : <><Trophy size={12} /> Submit for AI Grading</>}
                    </motion.button>
                  )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {feedback && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6 border border-[oklch(0.72_0.18_150_/_0.3)]">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={15} className="text-[oklch(0.82_0.18_150)]" />
              <div className="text-xs font-semibold text-[oklch(0.82_0.18_150)]">AI-GRADED FEEDBACK</div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{feedback}</p>
            <p className="text-xs text-muted-foreground italic mt-3">Remember: AI grading is a useful signal, not a final verdict. Re-read the rubric and your own responses.</p>
          </motion.div>
        )}

        {completed && (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-2xl p-8 border border-[oklch(0.75_0.18_55_/_0.3)] text-center">
            <Trophy size={36} className="mx-auto mb-3 text-[oklch(0.85_0.18_55)]" />
            <h3 className="text-2xl font-bold text-foreground mb-2">Module 1 Complete</h3>
            <p className="text-muted-foreground mb-4 max-w-lg mx-auto">You've earned your <strong className="text-foreground">AI Literacy · Module 1</strong> badge. {CLOSING_CTAS[seed.framingTheme]}</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {["AI Definitions", "Myth Buster", "Prompt Engineer", "Ethics Reasoning", "Capstone"].map(b => (
                <span key={b} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[oklch(0.75_0.18_55_/_0.12)] border border-[oklch(0.75_0.18_55_/_0.3)] text-[oklch(0.85_0.18_55)]">
                  <CheckCircle2 size={11} className="inline mr-1" />{b}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </LessonShell>
  );
}
