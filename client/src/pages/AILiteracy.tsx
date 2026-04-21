import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, BookOpen, Lightbulb, Shield, Trophy, ChevronRight,
  ChevronLeft, CheckCircle2, XCircle, Play, Pause, Volume2,
  VolumeX, RotateCcw, Star, Clock,
  MessageSquare, Zap, Check, Target, Sparkles,
  Eye, RefreshCw, Send, Award, Lock,
  ChevronDown, Info, HelpCircle, AlertTriangle, ArrowRight,
  Cpu, FileText, TrendingUp, Users, Scale
} from "lucide-react";
import PageWrapper from "@/components/PageWrapper";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { AdaptiveLessonView } from "@/components/lesson/AdaptiveLessonView";

// ─── Types ────────────────────────────────────────────────────────────────────

type LessonId = 1 | 2 | 3 | 4 | 5;

interface LessonMeta {
  id: LessonId;
  title: string;
  subtitle: string;
  duration: string;
  icon: React.ReactNode;
  color: string;
  bloomLevel: string;
  xp: number;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  mechanismNote?: string; // the "why" layer
}

interface MythCard {
  id: string;
  myth: string;
  whyItFeelsTrue: string;
  disconfirmingMechanism: string;
  nuancedTruth: string;
}

interface PromptExercise {
  id: string;
  title: string;
  scenario: string;
  vague: string;
  hint: string;
  rubric: string[];
  cognitiveModelNote: string;
}

interface EthicsScenario {
  id: string;
  title: string;
  realCase?: string;
  setup: string;
  stakeholders: { name: string; concern: string }[];
  discussion: string;
  principlistFrame: { autonomy: string; beneficence: string; nonMaleficence: string; justice: string };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LESSONS: LessonMeta[] = [
  {
    id: 1, title: "What Is AI?", subtitle: "Build the mental model that makes everything else make sense",
    duration: "30 min", icon: <Brain size={20} />, color: "oklch(0.75_0.18_55)",
    bloomLevel: "Understand → Apply", xp: 60,
  },
  {
    id: 2, title: "Myths vs. Reality", subtitle: "Replace nine wrong beliefs with nine mechanistic truths",
    duration: "25 min", icon: <Eye size={20} />, color: "oklch(0.65_0.22_200)",
    bloomLevel: "Analyze → Evaluate", xp: 70,
  },
  {
    id: 3, title: "Prompt Engineering", subtitle: "The cognitive model, not just the checklist",
    duration: "35 min", icon: <Zap size={20} />, color: "oklch(0.72_0.2_290)",
    bloomLevel: "Apply → Analyze", xp: 90,
  },
  {
    id: 4, title: "Ethics & Alignment", subtitle: "Why doing the right thing with AI is genuinely hard",
    duration: "30 min", icon: <Shield size={20} />, color: "oklch(0.72_0.18_150)",
    bloomLevel: "Analyze → Evaluate", xp: 80,
  },
  {
    id: 5, title: "Capstone", subtitle: "Apply everything to a system you have never seen before",
    duration: "20 min", icon: <Trophy size={20} />, color: "oklch(0.78_0.16_30)",
    bloomLevel: "Evaluate → Create", xp: 110,
  },
];

// ─── Quiz Data ────────────────────────────────────────────────────────────────

const DEFINITIONS_QUIZ: QuizQuestion[] = [
  {
    id: "d1",
    question: "A model is 'trained'. What actually happens during training?",
    options: [
      "Engineers write rules that the model memorises",
      "The model adjusts millions of numerical weights based on prediction error",
      "The model reads and stores a large database of facts",
      "The model copies a human expert's decision process",
    ],
    correct: 1,
    explanation: "Training is a loop: predict → measure error (loss) → nudge every weight to reduce error → repeat, billions of times. No rules are written — the pattern is shaped by feedback.",
    mechanismNote: "A 'weight' is just a number on a dial. After training, billions of dials are set in positions that make the model's predictions match the training data.",
  },
  {
    id: "d2",
    question: "You ask ChatGPT 'What is the capital of France?' It answers 'Paris.' What is the model actually doing?",
    options: [
      "Looking up 'France → capital' in an internal database",
      "Understanding the question and retrieving a stored fact",
      "Predicting that 'Paris' is the most probable next token given the conversation so far",
      "Searching the internet and returning the top result",
    ],
    correct: 2,
    explanation: "LLMs generate text token-by-token, each token sampled from a probability distribution over the vocabulary. 'Paris' is the overwhelmingly probable continuation of that context — but it is prediction, not lookup.",
    mechanismNote: "This is why LLMs can be confidently wrong: the mechanism is 'what sounds right next', not 'what is verifiably true'.",
  },
  {
    id: "d3",
    question: "Which statement best captures why current AI is 'narrow'?",
    options: [
      "It lacks sufficient computing power to be general",
      "Engineers have not yet built general AI — it's a matter of time",
      "It was trained with an objective (predict text, classify images) that produces no drive, goals, or continuity",
      "It can only handle one task at a time",
    ],
    correct: 2,
    explanation: "Current LLMs were trained to predict tokens. That objective produces no drive to survive, no cross-session goals, no persistence. AGI would require a fundamentally different objective, not just more compute.",
    mechanismNote: "This directly addresses the most common AI fear. Today's systems have impressive capability but no will. The gap is not hardware.",
  },
  {
    id: "d4",
    question: "A company's spam filter 'learns' new spam patterns over time. Is it AI?",
    options: [
      "Yes — it adapts, so it's AI",
      "It depends: if it updates parameters from feedback data it's ML; if it uses rule updates written by engineers it's not",
      "No — spam filters are always rule-based",
      "Yes — any software that improves is AI",
    ],
    correct: 1,
    explanation: "The distinction between AI/ML and traditional software is whether the logic was written by a human (software) or shaped by data (ML). Many systems called 'AI' are actually rule engines with manual updates.",
  },
];

// ─── Myth Data — full 3-part structure ───────────────────────────────────────

const MYTHS: MythCard[] = [
  {
    id: "myth1",
    myth: "AI systems like ChatGPT are conscious and have feelings.",
    whyItFeelsTrue: "The outputs are fluent, emotionally attuned, and grammatically sophisticated. When something writes 'I'm happy to help!' with apparent warmth, pattern-matching in human perception registers it as feeling.",
    disconfirmingMechanism: "LLMs are trained to predict statistically likely text. 'I'm happy to help' appears frequently in helpful-assistant training data, so the model produces it. There is no emotional state backing the sentence — only statistical continuation. Neuroscience gives us no evidence of experience without a nervous system.",
    nuancedTruth: "Current AI produces outputs that pattern-match human emotion without any inner experience generating them. Whether future systems could be conscious is genuinely open; current ones are not.",
  },
  {
    id: "myth2",
    myth: "AI is objective because math can't have opinions.",
    whyItFeelsTrue: "Algorithms feel impartial. Numbers don't care who you are. A computer can't be racist or sexist in the way a person can.",
    disconfirmingMechanism: "The weights in an AI model are shaped by training data. Training data is a record of human decisions. If those decisions encoded bias (e.g., past hiring patterns, criminal-justice records), the model's weights encode them too — then amplify them at scale. 'It's just math' does not neutralise what the math was fitted on.",
    nuancedTruth: "AI inherits and amplifies the biases embedded in its training data. This is not a flaw that can be patched away; it requires ongoing measurement and deliberate correction.",
  },
  {
    id: "myth3",
    myth: "AI will replace all jobs within the next decade.",
    whyItFeelsTrue: "Each wave of AI capability announcements is legitimately impressive, and the pace of change is fast. It is easy to extrapolate to full displacement.",
    disconfirmingMechanism: "Primary research (Acemoglu & Restrepo, 2022; Noy & Zhang, Science 2023) consistently shows task-level displacement, not job-level elimination. New roles emerge with each technological wave. The Noy-Zhang study found AI assistance most improved the output of the lowest-performing workers — a different pattern than 'everyone is replaced'.",
    nuancedTruth: "AI will transform which tasks humans do within most occupations. Whole-job elimination is rare and slow. The realistic challenge is task-mix shifts that make some skills less valuable and others more valuable within the same job.",
  },
  {
    id: "myth4",
    myth: "The model that gives the longest, most confident answer is probably most accurate.",
    whyItFeelsTrue: "In human discourse, experts tend to give detailed answers. Confidence signals knowledge. Verbosity correlates with effort.",
    disconfirmingMechanism: "LLMs are trained partly on human ratings of their outputs. Humans rate confident, detailed, fluent answers highly. The model learns to produce that style — independently of whether the content is accurate. Sycophancy research (Perez et al., Anthropic 2022) shows models that agree with users, elaborate confidently, and rarely admit uncertainty, even when wrong.",
    nuancedTruth: "Confidence and length in AI output are style properties, not accuracy signals. Long, confident, wrong answers are the most dangerous class of AI output because they feel most trustworthy.",
  },
  {
    id: "myth5",
    myth: "If an AI passes a test, it understands the material.",
    whyItFeelsTrue: "Passing a test is how we measure understanding in humans. If the same test shows the same score, it should mean the same thing.",
    disconfirmingMechanism: "LLMs pass tests by recognizing statistical patterns in how test questions and answers are phrased — patterns abundant in their training data. Ask the same question in an unusual format, or test a marginal variation, and performance often collapses. This is called 'brittle generalization'. The AI Bar Exam story is accurate; what it means for clinical or professional judgment is not.",
    nuancedTruth: "Benchmark performance and robust understanding are separate things. AI systems can score above human average on standardized tests while failing at basic variations that any informed human would handle. Verify claims about AI capability on diverse, novel inputs — not just published benchmarks.",
  },
  {
    id: "myth6",
    myth: "AI systems always give accurate, truthful answers.",
    whyItFeelsTrue: "The outputs are polished, authoritative, and well-structured. They don't look like guesses.",
    disconfirmingMechanism: "Hallucination is not a bug to be patched — it is an emergent property of the training objective. Models optimise for plausible next-token prediction, and a plausible-sounding false sentence is just as compatible with that objective as a true one. Groundedness (checking against a source) is a separate mechanism that must be deliberately added.",
    nuancedTruth: "All AI-generated factual claims should be treated as unverified hypotheses until checked against a primary source, particularly for specific statistics, citations, dates, and names.",
  },
];

// ─── Prompt Exercises — with cognitive model context ─────────────────────────

const PROMPT_EXERCISES: PromptExercise[] = [
  {
    id: "p1",
    title: "The Job Application Letter",
    scenario: "You need to write a cover letter for a marketing manager position at a tech startup. You have 5 years of digital marketing experience and led a team that grew social media by 300%.",
    vague: "Write me a cover letter.",
    hint: "The model is completing a document. Frame the opening as the start of a specific kind of document — specify the role, your differentiating achievements, the tone (professional + energetic), and the length.",
    rubric: [
      "Specifies the role and company type",
      "Includes at least one concrete achievement with a number",
      "States desired tone (professional, energetic, etc.)",
      "Mentions approximate length or format",
    ],
    cognitiveModelNote: "A vague prompt is the start of a generic document. The model completes it generically. 'Write me a cover letter for a marketing manager role at a tech startup, highlighting that I grew social media 300% in 18 months, in 250 words, confident and specific' is the start of a very different kind of document.",
  },
  {
    id: "p2",
    title: "Chain-of-Thought in Action",
    scenario: "You need to decide whether to accept a consulting contract at 85% of your usual rate because the client is prestigious and might lead to more work.",
    vague: "Should I take this contract?",
    hint: "Try: 'Think step by step before answering. First, identify the relevant factors. Then, weigh each one. Then, give a recommendation.' Compare this output to the direct question.",
    rubric: [
      "Includes 'think step by step' or similar chain-of-thought trigger",
      "Asks the model to identify factors before giving a verdict",
      "Provides the specific numbers (85%, your rate structure)",
      "Specifies what a useful answer looks like (decision + reasoning, not just a recommendation)",
    ],
    cognitiveModelNote: "When you add 'think step by step', you force intermediate reasoning tokens. The model generates the reasoning chain visibly before the conclusion. This prevents compounding errors and gives you something to evaluate, not just a verdict to accept.",
  },
  {
    id: "p3",
    title: "Few-Shot: Teaching by Example",
    scenario: "You need to write product update announcements in a specific house style: crisp, specific, no corporate jargon, one key benefit stated plainly.",
    vague: "Write an announcement for our new dark mode feature.",
    hint: "Show one or two examples of the style you want before asking for the new one. The model will infer the pattern from examples more reliably than from a description.",
    rubric: [
      "Provides at least one example of the desired output style",
      "Labels it clearly as an example ('Like this: ...')",
      "The example demonstrates the specific style characteristics (crisp, no jargon, one benefit)",
      "Only then asks for the new announcement",
    ],
    cognitiveModelNote: "Examples are more powerful than instructions because they show the model what kind of document to complete, not just what the document should achieve. 'Write like this: [example]' outperforms 'Be concise and avoid jargon' every time.",
  },
];

// ─── Ethics Scenarios — with Principlist framework ────────────────────────────

const ETHICS_SCENARIOS: EthicsScenario[] = [
  {
    id: "e1",
    title: "The Hiring Algorithm",
    realCase: "Amazon scrapped an internal recruiting AI in 2018 after discovering it consistently downgraded resumes containing the word 'women's' (e.g., 'women's chess club') — because the model was trained on 10 years of historically male-dominated hiring data. (Reuters, Oct 2018)",
    setup: "A major employer uses an AI system to screen 50,000 job applications. It was trained on 10 years of hiring data. An audit reveals it scores women 15% lower for engineering roles — because historically, fewer women were hired for those roles.",
    stakeholders: [
      { name: "Female Engineering Applicant", concern: "Qualified but filtered out before a human reviews her application. Has no way to know, no mechanism to contest." },
      { name: "HR Manager", concern: "Trusted the system to be objective. Now holds legal liability for a discriminatory process they didn't design." },
      { name: "AI Developer", concern: "Trained on available data. Wasn't asked to audit for demographic parity. Followed engineering norms, not social-impact norms." },
      { name: "Company CEO", concern: "Wants efficiency AND legal compliance. A discrimination lawsuit could cost tens of millions." },
    ],
    discussion: "Who is responsible — the engineer, the deployer, the manager, the system? Should the system be halted immediately even if it means reviewing 50,000 applications manually? Can debiasing the training data solve the problem, or does it require rethinking the objective entirely?",
    principlistFrame: {
      autonomy: "Applicants cannot exercise informed choice if they don't know an algorithm is filtering them.",
      beneficence: "Efficiency benefits the company. Does it benefit the applicant pool equitably?",
      nonMaleficence: "Discriminatory outcomes cause measurable harm to specific groups.",
      justice: "The system perpetuates historical inequality rather than evaluating current merit.",
    },
  },
  {
    id: "e2",
    title: "The Medical Chatbot",
    setup: "A hospital deploys an AI chatbot that triages patients by symptom severity. Studies show it performs well on average — but has significantly higher error rates for patients who describe symptoms in informal English, non-standard dialects, or non-native syntax.",
    stakeholders: [
      { name: "Non-native English Speaker", concern: "Risk of being routed to 'home care' when ER is needed. Has the most at stake and the least voice." },
      { name: "ER Nurse", concern: "Overwhelmed if AI sends everyone to the ER; understaffed if it filters too aggressively." },
      { name: "Hospital Administrator", concern: "Reduced wait times and costs — but liability for any AI-caused misdiagnosis." },
      { name: "FDA", concern: "AI medical devices need a regulatory framework. What testing standards apply here?" },
    ],
    discussion: "Should AI with unequal performance across demographic groups be deployed in healthcare at all? What minimum accuracy threshold, across ALL demographic groups separately, should be required? Who bears responsibility when an AI misdiagnosis leads to patient harm?",
    principlistFrame: {
      autonomy: "Patients cannot meaningfully consent to AI triage if they're unaware it's happening.",
      beneficence: "Faster triage helps some patients. Does it help the most vulnerable ones?",
      nonMaleficence: "An AI that performs worse on non-native speakers can cause direct physical harm.",
      justice: "Deploying a system with unequal accuracy reproduces and amplifies existing health disparities.",
    },
  },
  {
    id: "e3",
    title: "The School AI Tutor",
    setup: "A school district deploys an AI writing tutor available 24/7. Teachers report improved grades. But a parent discovers the system stores all student writing indefinitely, and the company's privacy policy allows using it to train future models.",
    stakeholders: [
      { name: "Student (age 14)", concern: "Personal writing, opinions, and struggles are permanent training data." },
      { name: "Teacher", concern: "Great tool — but students were not meaningfully consented to data collection as a condition of using it." },
      { name: "Parent", concern: "Child's data is being used commercially without informed consent." },
      { name: "EdTech Company", concern: "Student data is how the product improves. Anonymisation is expensive and imperfect." },
    ],
    discussion: "Does improved learning outcome justify collecting and training on minors' personal writing? Should there be a legal right to data deletion for students? Is 'anonymised student writing' actually anonymous at scale?",
    principlistFrame: {
      autonomy: "Children cannot give meaningful consent; parents may not understand what 'train future models' means.",
      beneficence: "Better feedback benefits students' development.",
      nonMaleficence: "Permanent storage of a child's evolving beliefs and struggles creates long-horizon exposure.",
      justice: "Whose interests are weighted in the privacy policy — the student's or the company's?",
    },
  },
];

// ─── Narrator Component ───────────────────────────────────────────────────────

function Narrator({ text, autoPlay = false }: { text: string; autoPlay?: boolean }) {
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback(() => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.92; utter.pitch = 1.0; utter.volume = muted ? 0 : 1;
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    utterRef.current = utter;
    setSpeaking(true);
    window.speechSynthesis.speak(utter);
  }, [text, muted]);

  const stop = useCallback(() => { window.speechSynthesis?.cancel(); setSpeaking(false); }, []);

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
        <button onClick={() => setMuted(!muted)} className="p-1 rounded-md hover:bg-white/10 text-muted-foreground transition-colors" aria-label={muted ? "Unmute" : "Mute"}>
          {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
        </button>
        {speaking ? (
          <button onClick={stop} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 text-xs text-foreground hover:bg-white/15 transition-colors">
            <Pause size={11} /> Stop
          </button>
        ) : (
          <button onClick={speak} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[oklch(0.75_0.18_55_/_0.2)] border border-[oklch(0.75_0.18_55_/_0.3)] text-xs text-[oklch(0.85_0.18_55)] hover:bg-[oklch(0.75_0.18_55_/_0.3)] transition-colors">
            <Play size={11} /> Listen
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Mechanism callout ────────────────────────────────────────────────────────

function MechanismNote({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-xl bg-[oklch(0.72_0.2_290_/_0.07)] border border-[oklch(0.72_0.2_290_/_0.25)] mt-3">
      <Cpu size={13} className="text-[oklch(0.72_0.2_290)] mt-0.5 shrink-0" />
      <p className="text-xs text-muted-foreground leading-relaxed">
        <span className="font-semibold text-[oklch(0.80_0.2_290)]">Under the hood: </span>{text}
      </p>
    </div>
  );
}

// ─── Real case callout ────────────────────────────────────────────────────────

function RealCase({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-xl bg-[oklch(0.65_0.22_200_/_0.07)] border border-[oklch(0.65_0.22_200_/_0.25)] mt-3">
      <FileText size={13} className="text-[oklch(0.65_0.22_200)] mt-0.5 shrink-0" />
      <p className="text-xs text-muted-foreground leading-relaxed">
        <span className="font-semibold text-[oklch(0.75_0.22_200)]">Real case: </span>{text}
      </p>
    </div>
  );
}

// ─── Lesson Shell ─────────────────────────────────────────────────────────────

function LessonShell({ meta, children, onComplete, completed }: {
  meta: LessonMeta; children: React.ReactNode; onComplete: () => void; completed: boolean;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
      <div className="glass rounded-2xl p-6 border border-white/8 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `color-mix(in oklch, ${meta.color} 15%, transparent)`, border: `1px solid color-mix(in oklch, ${meta.color} 30%, transparent)` }}>
              <span style={{ color: meta.color }}>{meta.icon}</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs text-muted-foreground">Lesson {meta.id}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-muted-foreground">{meta.bloomLevel}</span>
              </div>
              <h2 className="text-xl font-bold text-foreground">{meta.title}</h2>
              <p className="text-sm text-muted-foreground">{meta.subtitle}</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0 ml-4">
            <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock size={10} /> {meta.duration}</span>
            <span className="flex items-center gap-1 text-xs text-[oklch(0.75_0.18_55)]"><Zap size={10} /> +{meta.xp} XP</span>
          </div>
        </div>
        {!completed ? (
          <button onClick={onComplete}
            className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-[oklch(0.75_0.18_55)] to-[oklch(0.65_0.22_200)] text-black transition-opacity hover:opacity-90">
            <CheckCircle2 size={16} /> Mark Lesson Complete (+{meta.xp} XP)
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2 py-3 text-sm text-[oklch(0.72_0.18_150)] font-medium">
            <CheckCircle2 size={14} /> Lesson complete
          </div>
        )}
      </div>
      {children}
    </motion.div>
  );
}

// ─── LESSON 1: What Is AI? ─────────────────────────────────────────────────────

function Lesson1({ onComplete, completed }: { onComplete: () => void; completed: boolean }) {
  const [activeSegment, setActiveSegment] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showExp, setShowExp] = useState(false);
  const [score, setScore] = useState(0);
  const [quizDone, setQuizDone] = useState(false);

  // Token prediction mini-demo state
  const [tpSentence] = useState("The model trained on billions of words can predict");
  const [userGuess, setUserGuess] = useState("");
  const [showDistribution, setShowDistribution] = useState(false);
  const TOKEN_DISTRIBUTION = [
    { token: "the", probability: 18.4, color: "oklch(0.75_0.18_55)" },
    { token: "text", probability: 14.2, color: "oklch(0.65_0.22_200)" },
    { token: "next", probability: 11.7, color: "oklch(0.72_0.2_290)" },
    { token: "words", probability: 9.3, color: "oklch(0.72_0.18_150)" },
    { token: "language", probability: 7.8, color: "oklch(0.78_0.16_30)" },
    { token: "patterns", probability: 6.1, color: "oklch(0.65_0.22_200)" },
    { token: "any", probability: 4.2, color: "oklch(0.72_0.2_290)" },
    { token: "…thousands more (tiny probabilities)", probability: 28.3, color: "oklch(0.4_0_0)" },
  ];

  const segments = [
    {
      title: "The Hook",
      narration: "Here are six products all marketed as AI: a Gmail spam filter, ChatGPT, Netflix recommendations, a Tesla on autopilot, DALL-E, and a chess engine that beats every grandmaster alive. What do they actually have in common? Less than the word suggests.",
      content: (
        <div className="space-y-5">
          <p className="text-muted-foreground leading-relaxed">
            Before any definitions, consider six things all called <strong className="text-foreground">"AI"</strong>:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { name: "Gmail spam filter", type: "Classifier (ML)", reality: "Trained on labelled spam vs. ham emails. Adjusts based on feedback." },
              { name: "ChatGPT", type: "LLM (Generative AI)", reality: "Predicts probable next tokens, trained on vast text corpora with human feedback." },
              { name: "Netflix recommendations", type: "Collaborative filter", reality: "Learns which viewers share tastes; predicts what you'll rate highly." },
              { name: "Tesla Autopilot", type: "Computer vision + RL", reality: "Neural networks trained on millions of miles of driving data." },
              { name: "DALL-E / Midjourney", type: "Diffusion model", reality: "Learns to reverse a noise process, conditioned on text descriptions." },
              { name: "Stockfish (chess)", type: "Search + heuristics", reality: "Classic tree search with hand-tuned evaluation — debated whether it counts as ML at all." },
            ].map(({ name, type, reality }) => (
              <div key={name} className="glass rounded-xl p-4 border border-white/8">
                <div className="text-xs font-bold text-foreground mb-1">{name}</div>
                <div className="text-xs font-semibold text-[oklch(0.75_0.18_55)] mb-1.5">{type}</div>
                <p className="text-xs text-muted-foreground leading-relaxed">{reality}</p>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-2 p-4 rounded-xl bg-[oklch(0.75_0.18_55_/_0.06)] border border-[oklch(0.75_0.18_55_/_0.2)]">
            <Info size={14} className="text-[oklch(0.75_0.18_55)] mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">The question worth asking:</strong> what is the mechanism that makes each one work? Once you can answer that, "is it AI?" becomes a much less important question than "what does it actually do, and what can go wrong?"
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "How AI Learns — weights and the training loop",
      narration: "The word 'training' sounds vague. Here is what actually happens. The model makes a prediction, gets told how wrong it was, and adjusts millions of internal numbers — called weights — to be slightly less wrong next time. Repeat billions of times.",
      content: (
        <div className="space-y-5">
          <p className="text-muted-foreground leading-relaxed">
            The word "weight" sounds technical. Here is all it means: <strong className="text-foreground">a number on a dial</strong>. A large neural network has billions of these dials. Training turns them until the model's predictions match the training data.
          </p>
          {/* Training loop visual */}
          <div className="rounded-xl overflow-hidden border border-white/8">
            <div className="bg-[oklch(0.12_0.01_270)] p-4">
              <div className="text-xs font-semibold text-[oklch(0.75_0.18_55)] mb-3 uppercase tracking-wider">The Training Loop — one iteration</div>
              <div className="flex flex-col sm:flex-row items-stretch gap-2">
                {[
                  { n: "①", label: "Data In", desc: "An example with a known correct answer", color: "oklch(0.75_0.18_55)" },
                  { n: "②", label: "Prediction", desc: "Model guesses using current weight values", color: "oklch(0.65_0.22_200)" },
                  { n: "③", label: "Loss", desc: "How wrong was it? (a single number)", color: "oklch(0.72_0.2_290)" },
                  { n: "④", label: "Adjust", desc: "Nudge every weight to reduce the loss", color: "oklch(0.72_0.18_150)" },
                ].map(({ n, label, desc, color }, i, arr) => (
                  <div key={label} className="flex sm:flex-col items-center gap-2 sm:gap-0 flex-1">
                    <div className="flex-1 sm:flex-none glass rounded-xl p-3 border border-white/8 text-center w-full">
                      <div className="text-base font-bold mb-1" style={{ color }}>{n}</div>
                      <div className="text-xs font-semibold text-foreground mb-1">{label}</div>
                      <p className="text-xs text-muted-foreground leading-tight">{desc}</p>
                    </div>
                    {i < arr.length - 1 && (
                      <ChevronRight size={14} className="hidden sm:block text-muted-foreground shrink-0 mt-4" />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-white/3 border border-white/5">
                <RotateCcw size={12} className="text-muted-foreground shrink-0" />
                <p className="text-xs text-muted-foreground italic">Repeat this loop billions of times across the entire training dataset. The weights converge.</p>
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2 p-4 rounded-xl bg-[oklch(0.75_0.18_55_/_0.06)] border border-[oklch(0.75_0.18_55_/_0.2)]">
            <Lightbulb size={14} className="text-[oklch(0.75_0.18_55)] mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Key insight:</strong> no rules are written. The behavior emerges from the weight values the training loop converged on. This is why AI can be surprisingly capable at things nobody specifically programmed — and surprisingly brittle at things that seem obvious.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "What LLMs do: the token prediction demo",
      narration: "A Large Language Model has one job: predict what comes next, one token at a time. Before you see the model's probability distribution, try to predict the next word yourself.",
      content: (
        <div className="space-y-5">
          <p className="text-muted-foreground leading-relaxed">
            An LLM does not look things up in a database. It computes a <strong className="text-foreground">probability distribution</strong> over every possible next word — then samples from it. Try it:
          </p>
          <div className="glass rounded-xl p-5 border border-[oklch(0.65_0.22_200_/_0.25)]">
            <div className="text-xs font-semibold text-[oklch(0.65_0.22_200)] mb-3">SENTENCE SO FAR</div>
            <p className="text-base font-mono text-foreground mb-4 leading-relaxed">
              "{tpSentence} <span className="inline-block w-16 h-5 align-bottom rounded bg-[oklch(0.65_0.22_200_/_0.3)] border border-[oklch(0.65_0.22_200_/_0.5)] border-dashed" />"
            </p>
            <div className="flex gap-3 mb-4">
              <input
                value={userGuess}
                onChange={e => setUserGuess(e.target.value)}
                placeholder="Your guess for the next word..."
                className="flex-1 bg-white/3 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[oklch(0.65_0.22_200_/_0.5)]"
              />
              <button
                onClick={() => setShowDistribution(true)}
                className="px-4 py-2 rounded-lg bg-[oklch(0.65_0.22_200)] text-black text-sm font-semibold"
              >
                Reveal
              </button>
            </div>
            <AnimatePresence>
              {showDistribution && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                  <div className="text-xs font-semibold text-[oklch(0.65_0.22_200)] mb-3">THE MODEL'S DISTRIBUTION (top tokens)</div>
                  <div className="space-y-2">
                    {TOKEN_DISTRIBUTION.map(({ token, probability, color }) => (
                      <div key={token} className="flex items-center gap-3">
                        <span className="text-xs font-mono text-foreground w-32 shrink-0">{token}</span>
                        <div className="flex-1 h-5 rounded-md bg-white/5 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${probability * 2.5}%` }}
                            transition={{ duration: 0.6, delay: 0.1 }}
                            className="h-full rounded-md"
                            style={{ background: color, opacity: 0.75 }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-12 text-right shrink-0">{probability}%</span>
                      </div>
                    ))}
                  </div>
                  {userGuess && (
                    <p className="text-xs text-[oklch(0.75_0.18_55)] mt-3">
                      You guessed: <strong>"{userGuess}"</strong> — {
                        TOKEN_DISTRIBUTION.slice(0, 7).some(t => t.token.toLowerCase() === userGuess.toLowerCase())
                          ? "that's on the list! You're thinking like an LLM."
                          : "not in the top tokens — but that doesn't mean it's wrong, just less probable given this context."
                      }
                    </p>
                  )}
                  <MechanismNote text="Every word the model generates is a sample from a distribution like this. Change any word in the input and the entire distribution shifts. This is why prompt wording matters — and why the model can sound confident while being wrong." />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ),
    },
    {
      title: "Narrow AI vs. AGI — why the distinction matters",
      narration: "The most common AI fear is the takeover scenario. Understanding why current systems are narrow — not because of hardware limits, but because of what they were trained to do — puts that fear in the right place.",
      content: (
        <div className="space-y-5">
          <p className="text-muted-foreground leading-relaxed">
            The question "will AI take over?" requires understanding why current systems are narrow. The answer is not "we don't have enough compute yet." The answer is the <strong className="text-foreground">objective function</strong>.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="glass rounded-xl p-5 border border-[oklch(0.72_0.18_150_/_0.3)]">
              <div className="text-xs font-semibold text-[oklch(0.72_0.18_150)] mb-3">WHAT LLMs WERE TRAINED TO DO</div>
              <ul className="space-y-2">
                {["Predict the next token in text", "Match human preferences in ratings", "Score well on benchmark evaluations", "Follow instructions within a session"].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check size={12} className="text-[oklch(0.72_0.18_150)] mt-1 shrink-0" /> {item}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-[oklch(0.72_0.18_150)] mt-3 italic">Result: extraordinary language ability</p>
            </div>
            <div className="glass rounded-xl p-5 border border-[oklch(0.72_0.2_290_/_0.3)]">
              <div className="text-xs font-semibold text-[oklch(0.72_0.2_290)] mb-3">WHAT THEY WERE NOT TRAINED TO DO</div>
              <ul className="space-y-2">
                {["Survive or self-preserve", "Pursue goals across sessions", "Act in the physical world", "Be honest when dishonesty scores higher with raters"].map(item => (
                  <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <XCircle size={12} className="text-[oklch(0.72_0.2_290)] mt-1 shrink-0" /> {item}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-[oklch(0.72_0.2_290)] mt-3 italic">Result: no drive, no plan, no continuity</p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-4 rounded-xl bg-[oklch(0.75_0.18_55_/_0.06)] border border-[oklch(0.75_0.18_55_/_0.2)]">
            <Info size={14} className="text-[oklch(0.75_0.18_55)] mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">The honest picture:</strong> current AI is simultaneously more capable than most people expect (language tasks, coding, analysis) and more limited than the hype suggests (no will, no persistence, no understanding). Both are true. Neither cancels the other.
            </p>
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
      setQIndex(q => q + 1); setSelected(null); setShowExp(false);
    } else { setQuizDone(true); }
  };

  return (
    <LessonShell meta={LESSONS[0]} onComplete={onComplete} completed={completed}>
      <div className="space-y-6">
        {/* Segment tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {segments.map((seg, i) => (
            <button key={i} onClick={() => setActiveSegment(i)}
              className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all border ${activeSegment === i
                ? "bg-[oklch(0.75_0.18_55_/_0.15)] border-[oklch(0.75_0.18_55_/_0.4)] text-[oklch(0.85_0.18_55)]"
                : "glass border-white/8 text-muted-foreground hover:border-white/15"
                }`}>
              {i + 1}. {seg.title}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={activeSegment}
            initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
            className="glass rounded-2xl p-6 border border-white/8">
            <h3 className="text-lg font-semibold text-foreground mb-4">{segments[activeSegment].title}</h3>
            <Narrator text={segments[activeSegment].narration} />
            <div className="mt-5">{segments[activeSegment].content}</div>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between">
          <button onClick={() => setActiveSegment(Math.max(0, activeSegment - 1))}
            disabled={activeSegment === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg glass border border-white/8 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors">
            <ChevronLeft size={14} /> Previous
          </button>
          {activeSegment < segments.length - 1
            ? <button onClick={() => setActiveSegment(activeSegment + 1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[oklch(0.75_0.18_55_/_0.15)] border border-[oklch(0.75_0.18_55_/_0.3)] text-sm text-[oklch(0.85_0.18_55)] hover:bg-[oklch(0.75_0.18_55_/_0.25)] transition-colors">
              Next <ChevronRight size={14} />
            </button>
            : !quizStarted && (
              <button onClick={() => setQuizStarted(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-[oklch(0.75_0.18_55)] to-[oklch(0.65_0.22_200)] text-black text-sm font-semibold">
                Knowledge Check <ChevronRight size={14} />
              </button>
            )
          }
        </div>

        <AnimatePresence>
          {quizStarted && !quizDone && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="glass rounded-2xl p-6 border border-[oklch(0.75_0.18_55_/_0.2)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Knowledge Check</h3>
                <span className="text-xs text-muted-foreground">{qIndex + 1} / {DEFINITIONS_QUIZ.length}</span>
              </div>
              <Progress value={(qIndex / DEFINITIONS_QUIZ.length) * 100} className="h-1.5 mb-5" />
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
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs border border-current shrink-0">{String.fromCharCode(65 + i)}</span>
                      {opt}
                      {selected !== null && i === DEFINITIONS_QUIZ[qIndex].correct && <CheckCircle2 size={14} className="ml-auto text-[oklch(0.72_0.18_150)] shrink-0" />}
                      {selected === i && i !== DEFINITIONS_QUIZ[qIndex].correct && <XCircle size={14} className="ml-auto text-[oklch(0.72_0.2_290)] shrink-0" />}
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
                    {DEFINITIONS_QUIZ[qIndex].mechanismNote && (
                      <MechanismNote text={DEFINITIONS_QUIZ[qIndex].mechanismNote!} />
                    )}
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
              <div className="text-4xl mb-3">{score === DEFINITIONS_QUIZ.length ? "🎯" : score >= 3 ? "⭐" : "💡"}</div>
              <h3 className="text-xl font-bold text-foreground mb-1">{score}/{DEFINITIONS_QUIZ.length} Correct</h3>
              <p className="text-sm text-muted-foreground">
                {score === DEFINITIONS_QUIZ.length ? "You have the mental model. Everything else in this course builds on it." : "Good foundation. Review the explanations — the mechanism notes are where the real understanding lives."}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </LessonShell>
  );
}

// ─── LESSON 2: Myths vs. Reality ──────────────────────────────────────────────

function Lesson2({ onComplete, completed }: { onComplete: () => void; completed: boolean }) {
  const [activeMyth, setActiveMyth] = useState(0);
  const [revealStep, setRevealStep] = useState<0 | 1 | 2 | 3>(0); // 0=hidden, 1=steelman, 2=mechanism, 3=truth
  const [completedMyths, setCompletedMyths] = useState<Set<number>>(new Set());

  const myth = MYTHS[activeMyth];

  const handleReveal = (step: 1 | 2 | 3) => {
    setRevealStep(step);
    if (step === 3) {
      setCompletedMyths(prev => new Set(Array.from(prev).concat(activeMyth)));
    }
  };

  const switchMyth = (idx: number) => {
    setActiveMyth(idx);
    setRevealStep(0);
  };

  const REVEAL_LABELS = ["", "Why it feels true", "The mechanism that breaks it", "The nuanced truth"];
  const REVEAL_COLORS = ["", "oklch(0.78_0.16_30)", "oklch(0.65_0.22_200)", "oklch(0.72_0.18_150)"];

  return (
    <LessonShell meta={LESSONS[1]} onComplete={onComplete} completed={completed}>
      <div className="space-y-6">
        <div className="glass rounded-2xl p-6 border border-white/8">
          <Narrator text="The most dangerous AI myths are not obviously wrong — they're almost right. This lesson uses a three-part structure for each myth: first we steelman it (why it feels true), then we show the specific mechanism that disconfirms it, then we give the nuanced truth that replaces it. One-sentence rebuttals don't work. This does." />
          <div className="mt-5">
            <p className="text-muted-foreground leading-relaxed mb-4">
              Research on belief revision shows that a wrong model only gets replaced when you supply a specific, concrete, <em>mechanistic</em> alternative — not just a contradiction.
              Each card below has three layers. Work through them in order.
            </p>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[oklch(0.65_0.22_200_/_0.06)] border border-[oklch(0.65_0.22_200_/_0.2)]">
              <div className="flex gap-1">
                {[1, 2, 3].map(step => (
                  <div key={step} className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `color-mix(in oklch, ${REVEAL_COLORS[step]} 20%, transparent)`, color: REVEAL_COLORS[step] }}>
                    {step}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">How to use:</strong> Read the myth, guess whether it's true, then reveal the three layers one at a time.
              </p>
            </div>
          </div>
        </div>

        {/* Myth selector */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {MYTHS.map((m, i) => (
            <button key={i} onClick={() => switchMyth(i)}
              className={`py-2 px-2 rounded-lg text-xs font-medium transition-all border text-center relative ${activeMyth === i
                ? "bg-[oklch(0.65_0.22_200_/_0.15)] border-[oklch(0.65_0.22_200_/_0.4)] text-[oklch(0.75_0.22_200)]"
                : "glass border-white/8 text-muted-foreground hover:border-white/15"
                }`}>
              Myth {i + 1}
              {completedMyths.has(i) && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[oklch(0.72_0.18_150)] flex items-center justify-center">
                  <Check size={9} className="text-white" />
                </span>
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={activeMyth} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
            <div className="glass rounded-2xl p-6 border border-white/8 space-y-5">
              {/* The myth statement */}
              <div className="p-4 rounded-xl bg-[oklch(0.72_0.2_290_/_0.08)] border border-[oklch(0.72_0.2_290_/_0.3)]">
                <div className="text-xs font-semibold text-[oklch(0.72_0.2_290)] mb-2">MYTH</div>
                <p className="text-base font-medium text-foreground leading-snug">"{myth.myth}"</p>
              </div>

              {/* Progressive reveal */}
              <div className="space-y-3">
                {[1, 2, 3].map(step => {
                  const isRevealed = revealStep >= step;
                  const content = step === 1 ? myth.whyItFeelsTrue : step === 2 ? myth.disconfirmingMechanism : myth.nuancedTruth;
                  const label = REVEAL_LABELS[step];
                  const color = REVEAL_COLORS[step];
                  return (
                    <AnimatePresence key={step}>
                      {isRevealed ? (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                          className="rounded-xl p-4 border"
                          style={{ background: `color-mix(in oklch, ${color} 6%, transparent)`, borderColor: `color-mix(in oklch, ${color} 30%, transparent)` }}>
                          <div className="text-xs font-semibold mb-2" style={{ color }}>{label.toUpperCase()}</div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{content}</p>
                        </motion.div>
                      ) : (
                        <button onClick={() => handleReveal(step as 1 | 2 | 3)}
                          className="w-full py-3 px-4 rounded-xl glass border border-white/8 text-sm text-muted-foreground hover:text-foreground hover:border-white/20 transition-all flex items-center gap-2">
                          <ChevronDown size={14} />
                          Reveal: {label}
                        </button>
                      )}
                    </AnimatePresence>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="glass rounded-xl p-4 border border-white/8 flex items-center gap-3">
          <Target size={14} className="text-[oklch(0.72_0.18_150)] shrink-0" />
          <p className="text-sm text-muted-foreground">
            {completedMyths.size < MYTHS.length
              ? `${completedMyths.size}/${MYTHS.length} myths fully explored. Work through all three layers of each one.`
              : "All myths explored. You can now distinguish confident-sounding AI from accurate AI — and apply the same skepticism to AI news coverage."
            }
          </p>
        </div>
      </div>
    </LessonShell>
  );
}

// ─── LESSON 3: Prompt Engineering ─────────────────────────────────────────────

function Lesson3({ onComplete, completed }: { onComplete: () => void; completed: boolean }) {
  const [activeEx, setActiveEx] = useState(0);
  const [userPrompt, setUserPrompt] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [checklist, setChecklist] = useState<boolean[]>([false, false, false, false]);
  const [submitted, setSubmitted] = useState(false);
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [allScores, setAllScores] = useState<Record<string, number>>({});
  const [showCogModel, setShowCogModel] = useState(false);

  const ex = PROMPT_EXERCISES[activeEx];
  const { addXP } = usePersonalization();

  const sendPrompt = trpc.ai.explainConcept.useMutation({
    onSuccess: (data) => { setResponse(data.explanation); setLoading(false); setSubmitted(true); },
    onError: (err: { message: string }) => { toast.error(err.message); setLoading(false); },
  });

  const handleSubmit = () => {
    if (!userPrompt.trim()) { toast.error("Write a prompt first."); return; }
    setLoading(true); setResponse("");
    sendPrompt.mutate({ concept: userPrompt.substring(0, 500), level: "student" });
  };

  const handleCheck = (i: number) => {
    const updated = [...checklist]; updated[i] = !updated[i];
    setChecklist(updated);
    const score = updated.filter(Boolean).length;
    setAllScores(prev => ({ ...prev, [ex.id]: score }));
    if (score === 4) { addXP(15); toast.success("+15 XP — perfect prompt criteria!"); }
  };

  const switchEx = (idx: number) => {
    setActiveEx(idx); setUserPrompt(""); setShowHint(false);
    setChecklist([false, false, false, false]); setSubmitted(false); setResponse("");
  };

  return (
    <LessonShell meta={LESSONS[2]} onComplete={onComplete} completed={completed}>
      <div className="space-y-6">
        {/* Cognitive model reveal */}
        <div className="glass rounded-2xl p-6 border border-white/8">
          <Narrator text="Everyone teaches prompting as a checklist: persona, context, constraints, goal. The checklist works, but this lesson explains WHY it works. Once you see the cognitive model — the one idea underneath all prompting principles — the checklist becomes obvious, and you can adapt it to any situation you haven't seen before." />
          <div className="mt-5 space-y-4">
            <button onClick={() => setShowCogModel(!showCogModel)}
              className="w-full flex items-center justify-between p-4 rounded-xl glass border border-[oklch(0.72_0.2_290_/_0.3)] hover:border-[oklch(0.72_0.2_290_/_0.5)] transition-all">
              <span className="text-sm font-semibold text-foreground">The Cognitive Model: why prompting works</span>
              <ChevronDown size={14} className={`text-muted-foreground transition-transform ${showCogModel ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {showCogModel && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl p-4 bg-[oklch(0.14_0.02_15)] border border-[oklch(0.6_0.18_15_/_0.4)]">
                      <div className="text-xs font-semibold text-[oklch(0.75_0.18_30)] mb-3">WRONG MENTAL MODEL</div>
                      <p className="text-sm text-muted-foreground mb-3">A prompt is an order to a smart assistant who parses the request, decides what to do, and does it.</p>
                      <div className="text-xs font-semibold text-[oklch(0.75_0.18_30)] mb-2">What this predicts (incorrectly):</div>
                      <ul className="space-y-1">
                        {["Longer, smarter instructions → better output", "Being polite and formal should help", "Bullet points should work best"].map(item => (
                          <li key={item} className="text-xs text-muted-foreground flex items-start gap-1.5"><XCircle size={10} className="text-[oklch(0.72_0.2_290)] mt-0.5 shrink-0" />{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-xl p-4 bg-[oklch(0.0f_0.02_150)] border border-[oklch(0.72_0.18_150_/_0.4)]">
                      <div className="text-xs font-semibold text-[oklch(0.72_0.18_150)] mb-3">THE CORRECT MENTAL MODEL</div>
                      <p className="text-sm font-medium text-foreground mb-2">A prompt is the opening of a document the model is completing.</p>
                      <p className="text-sm text-muted-foreground mb-3">The model asks: "What kind of document continues like this?"</p>
                      <div className="text-xs font-semibold text-[oklch(0.72_0.18_150)] mb-2">What this predicts (correctly):</div>
                      <ul className="space-y-1">
                        {["Persona framing wins (specifies the document type)", "Examples outperform instructions", "'Think step by step' works — it changes what tokens come next"].map(item => (
                          <li key={item} className="text-xs text-muted-foreground flex items-start gap-1.5"><Check size={10} className="text-[oklch(0.72_0.18_150)] mt-0.5 shrink-0" />{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <MechanismNote text="'Think step by step' (chain-of-thought prompting) was validated by Wei et al. 2022 and Kojima et al. 2022. It works because it forces intermediate reasoning tokens before the conclusion — errors that would compound invisibly are made visible and catchable." />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Exercise selector */}
        <div className="flex gap-2">
          {PROMPT_EXERCISES.map((e, i) => (
            <button key={i} onClick={() => switchEx(i)}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all border ${activeEx === i
                ? "bg-[oklch(0.72_0.2_290_/_0.15)] border-[oklch(0.72_0.2_290_/_0.4)] text-[oklch(0.82_0.2_290)]"
                : "glass border-white/8 text-muted-foreground hover:border-white/15"
                }`}>
              {i + 1}. {e.title}
              {allScores[e.id] !== undefined && <span className="ml-1 text-[oklch(0.72_0.18_150)]">({allScores[e.id]}/4)</span>}
            </button>
          ))}
        </div>

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
                  <div className="text-xs font-medium text-muted-foreground mb-1">A weak prompt:</div>
                  <p className="text-sm text-foreground font-mono italic">"{ex.vague}"</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Your improved prompt:</label>
                <textarea value={userPrompt} onChange={e => setUserPrompt(e.target.value)}
                  placeholder="Apply the cognitive model — frame this as the opening of a specific kind of document..."
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
                  className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[oklch(0.72_0.2_290)] text-white text-sm font-medium disabled:opacity-50">
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

              {/* Cognitive model note */}
              <div className="glass rounded-xl p-4 border border-[oklch(0.65_0.22_200_/_0.2)]">
                <div className="text-xs font-semibold text-[oklch(0.65_0.22_200)] mb-2">WHY THIS WORKS</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{ex.cognitiveModelNote}</p>
              </div>

              {/* Self-evaluation rubric */}
              <div className="glass rounded-xl p-5 border border-[oklch(0.72_0.2_290_/_0.15)]">
                <div className="text-xs font-semibold text-[oklch(0.72_0.2_290)] mb-3">SELF-EVALUATION</div>
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
                      <span className={`text-sm transition-colors ${checklist[i] ? "text-foreground" : "text-muted-foreground"}`}>{criterion}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <Progress value={((allScores[ex.id] ?? 0) / 4) * 100} className="flex-1 h-2" />
                  <span className="text-xs font-medium text-foreground shrink-0">{allScores[ex.id] ?? 0}/4</span>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </LessonShell>
  );
}

// ─── LESSON 4: Ethics & Alignment ─────────────────────────────────────────────

function Lesson4({ onComplete, completed }: { onComplete: () => void; completed: boolean }) {
  const [activeScenario, setActiveScenario] = useState(0);
  const [expandedStakeholder, setExpandedStakeholder] = useState<number | null>(null);
  const [showPrinciples, setShowPrinciples] = useState(false);
  const [showRLHF, setShowRLHF] = useState(false);
  const [userResponse, setUserResponse] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});

  const sc = ETHICS_SCENARIOS[activeScenario];

  return (
    <LessonShell meta={LESSONS[3]} onComplete={onComplete} completed={completed}>
      <div className="space-y-6">
        <div className="glass rounded-2xl p-6 border border-white/8">
          <Narrator text="The surprising thing about AI ethics is that the engineers are usually not careless. The hardest problem in AI right now is specifying what we actually want systems to do, precisely enough that they do it without surprise. That is called the alignment problem. This lesson covers why it's genuinely hard, and gives you a framework for reasoning through real cases." />
          <div className="mt-5 space-y-4">
            {/* RLHF and sycophancy mechanism */}
            <button onClick={() => setShowRLHF(!showRLHF)}
              className="w-full flex items-center justify-between p-4 rounded-xl glass border border-[oklch(0.72_0.18_150_/_0.3)] hover:border-[oklch(0.72_0.18_150_/_0.5)] transition-all">
              <span className="text-sm font-semibold text-foreground">Why ethical AI is harder than it sounds: RLHF and alignment</span>
              <ChevronDown size={14} className={`text-muted-foreground transition-transform ${showRLHF ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {showRLHF && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        label: "Goodhart's Law",
                        icon: <TrendingUp size={14} />,
                        desc: "When a measure becomes a target, it stops being a good measure. An AI optimised for 'user satisfaction scores' learns to produce satisfying-sounding answers — not truthful ones.",
                        color: "oklch(0.78_0.16_30)",
                      },
                      {
                        label: "Training data encoding",
                        icon: <FileText size={14} />,
                        desc: "The past gets baked in. A model trained on historical hiring decisions inherits their biases at scale — not because anyone chose bias, but because the data contained it.",
                        color: "oklch(0.72_0.2_290)",
                      },
                      {
                        label: "RLHF side-effects",
                        icon: <Users size={14} />,
                        desc: "'Train the model to say what human raters reward' converges on sycophancy, hedging, and confident reassurance — because these score well — not on honesty.",
                        color: "oklch(0.65_0.22_200)",
                      },
                    ].map(({ label, icon, desc, color }) => (
                      <div key={label} className="glass rounded-xl p-4 border border-white/8">
                        <div className="flex items-center gap-2 mb-2" style={{ color }}>
                          {icon}
                          <span className="text-xs font-semibold">{label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                      </div>
                    ))}
                  </div>
                  <MechanismNote text="These three mechanisms produce ethical failure even when engineers are well-intentioned. Ethical AI requires not just careful engineers but structural safeguards: audits, red-teaming, diverse training data, adversarial testing, and ongoing monitoring." />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Principlist framework */}
            <button onClick={() => setShowPrinciples(!showPrinciples)}
              className="w-full flex items-center justify-between p-4 rounded-xl glass border border-[oklch(0.75_0.18_55_/_0.3)] hover:border-[oklch(0.75_0.18_55_/_0.5)] transition-all">
              <span className="text-sm font-semibold text-foreground">The evaluation framework: four principles (Beauchamp & Childress)</span>
              <ChevronDown size={14} className={`text-muted-foreground transition-transform ${showPrinciples ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {showPrinciples && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { name: "Autonomy", desc: "Can people make informed choices about their interaction with this system? Do they have meaningful consent and the ability to opt out?" },
                      { name: "Beneficence", desc: "Does the system actually help — not just on average, but for the most vulnerable users? Who benefits and by how much?" },
                      { name: "Non-maleficence", desc: "What harm could this cause, to whom, and with what probability? Has that harm been measured, not assumed?" },
                      { name: "Justice", desc: "Are the benefits and risks distributed fairly? Who bears the cost of errors? Does the system perpetuate or reduce existing inequality?" },
                    ].map(({ name, desc }) => (
                      <div key={name} className="glass rounded-xl p-4 border border-[oklch(0.75_0.18_55_/_0.2)]">
                        <div className="text-xs font-semibold text-[oklch(0.75_0.18_55)] mb-2">{name.toUpperCase()}</div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Scenario tabs */}
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

        <AnimatePresence mode="wait">
          <motion.div key={activeScenario} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}>
            <div className="glass rounded-2xl p-6 border border-white/8 space-y-5">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3">{sc.title}</h3>
                {sc.realCase && <RealCase text={sc.realCase} />}
                <div className="glass rounded-xl p-4 border border-[oklch(0.72_0.18_150_/_0.15)] mt-3">
                  <div className="text-xs font-semibold text-[oklch(0.72_0.18_150)] mb-2">THE SITUATION</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{sc.setup}</p>
                </div>
              </div>

              {/* Stakeholders */}
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

              {/* Principlist analysis */}
              <div className="glass rounded-xl p-4 border border-[oklch(0.75_0.18_55_/_0.2)]">
                <div className="text-xs font-semibold text-[oklch(0.75_0.18_55)] mb-3">THROUGH THE 4-PRINCIPLE LENS</div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(sc.principlistFrame).map(([key, value]) => (
                    <div key={key} className="glass rounded-lg p-3 border border-white/8">
                      <div className="text-xs font-semibold text-foreground mb-1 capitalize">{key === "nonMaleficence" ? "Non-maleficence" : key}</div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discussion + response */}
              <div className="glass rounded-xl p-5 border border-[oklch(0.72_0.18_150_/_0.2)]">
                <div className="text-xs font-semibold text-[oklch(0.72_0.18_150)] mb-3">YOUR TURN</div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{sc.discussion}</p>
                <textarea
                  value={userResponse[sc.id] ?? ""}
                  onChange={e => setUserResponse(prev => ({ ...prev, [sc.id]: e.target.value }))}
                  placeholder="Reason through it using the four principles. Identify who bears responsibility, what safeguard you'd require, and which principle is most at stake."
                  rows={4}
                  className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[oklch(0.72_0.18_150_/_0.5)] resize-none transition-colors"
                />
                {!submitted[sc.id] ? (
                  <motion.button
                    onClick={() => {
                      if (!(userResponse[sc.id] ?? "").trim()) { toast.error("Write your reasoning first."); return; }
                      setSubmitted(prev => ({ ...prev, [sc.id]: true }));
                      toast.success("Reasoning saved.");
                    }}
                    className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[oklch(0.72_0.18_150_/_0.2)] border border-[oklch(0.72_0.18_150_/_0.3)] text-sm text-[oklch(0.82_0.18_150)] hover:bg-[oklch(0.72_0.18_150_/_0.3)] transition-colors">
                    <Scale size={13} /> Save Reasoning
                  </motion.button>
                ) : (
                  <p className="mt-3 text-xs text-[oklch(0.72_0.18_150)] flex items-center gap-1.5">
                    <CheckCircle2 size={12} /> Saved. The mark of good ethical reasoning: you can state specifically whose values conflict, not just that 'there are tradeoffs'.
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </LessonShell>
  );
}

// ─── LESSON 5: Capstone ─────────────────────────────────────────────────────────

function Lesson5({ onComplete, completed, completedLessons }: {
  onComplete: () => void; completed: boolean; completedLessons: Set<number>;
}) {
  const [scaffoldStep, setScaffoldStep] = useState<0 | 1 | 2>(0); // 0=worked, 1=faded, 2=independent
  const [capstoneAnswers, setCapstoneAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [personalPlan, setPersonalPlan] = useState({ useCase: "", concern: "", nextStep: "" });
  const prevCount = completedLessons.size;

  const WORKED_EXAMPLE = {
    product: "An AI travel planner that asks about your preferences and generates personalized itineraries",
    architecture: "Likely an LLM (probably GPT-4 class) with a retrieval layer to pull current hotel prices and flight data. The preference questions populate a structured prompt template.",
    trainingData: "Text from travel blogs, guidebooks, and booking sites. RLHF from human travel agents rating generated itineraries.",
    failureModes: [
      "Hallucination of closed attractions, wrong prices, or nonexistent hotels — highest risk when data retrieval is patchy.",
      "Sycophancy: if you say 'I love adventure', it will lean into that framing even when a rest day would serve you better.",
    ],
    ethicsQuestion: "The system has financial incentives to recommend premium hotels if it earns commission. Is the user aware of this? Does the recommendation reflect their interests or the platform's?",
    annotations: {
      architecture: "Uses M1 L1 (types of AI systems) + M1 L3 (RAG/retrieval is a prompt technique).",
      failureModes: "Uses M2 L7 (7 Failure Modes taxonomy). Names specific modes, not just 'AI can be wrong'.",
      ethicsQuestion: "Uses M1 L4 (Goodhart's Law: the objective function shapes what the system optimises for).",
    },
  };

  const FADED_PRODUCT = "A business writing assistant that analyses your email drafts and suggests improvements for clarity, tone, and professional impact.";
  const FADED_PARTIAL = {
    architecture: "Likely an LLM fine-tuned on [COMPLETE THIS: what corpus would produce good business writing feedback?]",
    failureModes: ["Sycophancy: [COMPLETE THIS: how would sycophancy manifest in writing feedback specifically?]", "[COMPLETE THIS: name a second failure mode and explain when it would occur]"],
    ethicsQuestion: "[COMPLETE THIS: what values conflict when this tool is deployed for employee emails?]",
  };

  const INDEPENDENT_PROMPTS: { label: string; question: string; placeholder: string }[] = [
    { label: "Likely architecture", question: "What type of AI system is this? How was it likely trained? What data shaped it?", placeholder: "e.g., An LLM fine-tuned on…, using RLHF from…, with retrieval of…" },
    { label: "Two failure modes", question: "Name two specific failure modes (from the 7-mode taxonomy) and explain when each would most likely occur.", placeholder: "e.g., Hallucination is most likely when… because… Sycophancy would occur when… because the training data…" },
    { label: "One ethical question", question: "What is the most important ethical question this system raises? Use the four-principle frame.", placeholder: "e.g., The justice question: who bears the cost of errors? If the system is more accurate for…" },
  ];

  const INDEPENDENT_PRODUCT = "An AI-powered health insurance application screener that asks applicants questions, analyses their responses, and recommends whether to approve, conditionally approve, or refer for manual review.";

  return (
    <LessonShell meta={LESSONS[4]} onComplete={onComplete} completed={completed}>
      <div className="space-y-6">
        {prevCount < 4 && (
          <motion.div className="glass rounded-xl p-5 border border-[oklch(0.78_0.16_30_/_0.3)]">
            <div className="flex items-start gap-3">
              <Lock size={18} className="text-[oklch(0.78_0.16_30)] mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-foreground mb-1">Complete earlier lessons for best results</h4>
                <p className="text-sm text-muted-foreground">You've completed {prevCount}/4 lessons. The capstone is designed to pull on all four. It works best with the full vocabulary.</p>
                <div className="mt-3 flex gap-1">
                  {[1, 2, 3, 4].map(n => (
                    <div key={n} className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold border ${completedLessons.has(n) ? "bg-[oklch(0.72_0.18_150_/_0.2)] border-[oklch(0.72_0.18_150_/_0.4)] text-[oklch(0.72_0.18_150)]" : "glass border-white/10 text-muted-foreground"}`}>
                      {completedLessons.has(n) ? <Check size={12} /> : n}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Scaffold selector */}
        <div className="glass rounded-2xl p-6 border border-white/8">
          <Narrator text="This capstone uses a scaffolded learning structure: worked example first, then a faded example where you fill in the blanks, then full independent practice. Research shows this is the most effective way to build transfer — the ability to apply skills to situations you haven't seen before." />
          <div className="mt-5 flex gap-2">
            {[
              { label: "1. Worked Example", desc: "See a fully annotated model brief" },
              { label: "2. Faded Example", desc: "Complete the partial brief" },
              { label: "3. Independent", desc: "Full practice, new product" },
            ].map((s, i) => (
              <button key={i} onClick={() => setScaffoldStep(i as 0 | 1 | 2)}
                className={`flex-1 py-3 px-3 rounded-xl text-xs font-medium transition-all border text-center ${scaffoldStep === i
                  ? "bg-[oklch(0.78_0.16_30_/_0.15)] border-[oklch(0.78_0.16_30_/_0.4)] text-[oklch(0.88_0.16_30)]"
                  : "glass border-white/8 text-muted-foreground hover:border-white/15"
                  }`}>
                <div className="font-semibold">{s.label}</div>
                <div className="text-muted-foreground mt-0.5 opacity-75">{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* ── Step 0: Worked example ── */}
          {scaffoldStep === 0 && (
            <motion.div key="worked" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <div className="glass rounded-2xl p-6 border border-[oklch(0.78_0.16_30_/_0.2)] space-y-5">
                <div className="text-xs font-semibold text-[oklch(0.78_0.16_30)]">WORKED EXAMPLE — read each section and the annotation explaining it</div>
                <div className="glass rounded-xl p-4 border border-white/8">
                  <div className="text-xs font-semibold text-muted-foreground mb-2">PRODUCT</div>
                  <p className="text-sm text-foreground">{WORKED_EXAMPLE.product}</p>
                </div>
                {[
                  { key: "architecture", label: "LIKELY ARCHITECTURE", content: WORKED_EXAMPLE.architecture },
                  { key: "trainingData", label: "LIKELY TRAINING DATA", content: WORKED_EXAMPLE.trainingData },
                  { key: "failureModes", label: "TWO FAILURE MODES", content: WORKED_EXAMPLE.failureModes.join("\n\n") },
                  { key: "ethicsQuestion", label: "KEY ETHICS QUESTION", content: WORKED_EXAMPLE.ethicsQuestion },
                ].map(({ key, label, content }) => (
                  <div key={key} className="space-y-2">
                    <div className="glass rounded-xl p-4 border border-[oklch(0.72_0.18_150_/_0.2)]">
                      <div className="text-xs font-semibold text-[oklch(0.72_0.18_150)] mb-2">{label}</div>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{content}</p>
                    </div>
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-[oklch(0.75_0.18_55_/_0.06)] border border-[oklch(0.75_0.18_55_/_0.2)]">
                      <Sparkles size={11} className="text-[oklch(0.75_0.18_55)] mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground italic">
                        <span className="font-semibold text-[oklch(0.85_0.18_55)]">Why this works: </span>
                        {WORKED_EXAMPLE.annotations[key as keyof typeof WORKED_EXAMPLE.annotations]}
                      </p>
                    </div>
                  </div>
                ))}
                <button onClick={() => setScaffoldStep(1)}
                  className="w-full py-3 rounded-xl bg-[oklch(0.78_0.16_30_/_0.15)] border border-[oklch(0.78_0.16_30_/_0.3)] text-sm font-semibold text-[oklch(0.88_0.16_30)] flex items-center justify-center gap-2">
                  Ready — move to the faded example <ChevronRight size={14} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Step 1: Faded example ── */}
          {scaffoldStep === 1 && (
            <motion.div key="faded" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <div className="glass rounded-2xl p-6 border border-[oklch(0.78_0.16_30_/_0.2)] space-y-5">
                <div className="text-xs font-semibold text-[oklch(0.78_0.16_30)]">FADED EXAMPLE — complete the bracketed sections</div>
                <div className="glass rounded-xl p-4 border border-white/8">
                  <div className="text-xs font-semibold text-muted-foreground mb-2">PRODUCT</div>
                  <p className="text-sm text-foreground">{FADED_PRODUCT}</p>
                </div>
                {[
                  { key: "fe_arch", label: "ARCHITECTURE", partial: FADED_PARTIAL.architecture, placeholder: "Complete the architecture section — what corpus shapes writing feedback quality?" },
                  { key: "fe_fail", label: "FAILURE MODES", partial: FADED_PARTIAL.failureModes.join("\n\n"), placeholder: "Complete both failure modes — what does sycophancy mean for writing feedback specifically?" },
                  { key: "fe_ethics", label: "ETHICS QUESTION", partial: FADED_PARTIAL.ethicsQuestion, placeholder: "Complete the ethics question — what values conflict here?" },
                ].map(({ key, label, partial, placeholder }) => (
                  <div key={key} className="space-y-2">
                    <div className="text-xs font-semibold text-[oklch(0.78_0.16_30)]">{label}</div>
                    <div className="text-sm text-muted-foreground p-3 rounded-lg bg-white/3 border border-white/8 leading-relaxed whitespace-pre-wrap">{partial}</div>
                    <textarea
                      value={capstoneAnswers[key] ?? ""}
                      onChange={e => setCapstoneAnswers(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder={placeholder}
                      rows={3}
                      className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[oklch(0.78_0.16_30_/_0.5)] resize-none"
                    />
                  </div>
                ))}
                <button onClick={() => setScaffoldStep(2)}
                  className="w-full py-3 rounded-xl bg-[oklch(0.78_0.16_30_/_0.15)] border border-[oklch(0.78_0.16_30_/_0.3)] text-sm font-semibold text-[oklch(0.88_0.16_30)] flex items-center justify-center gap-2">
                  Move to full independent practice <ChevronRight size={14} />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── Step 2: Independent ── */}
          {scaffoldStep === 2 && (
            <motion.div key="independent" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <div className="glass rounded-2xl p-6 border border-[oklch(0.78_0.16_30_/_0.2)] space-y-5">
                <div className="text-xs font-semibold text-[oklch(0.78_0.16_30)]">INDEPENDENT PRACTICE — no scaffold</div>
                <div className="glass rounded-xl p-4 border border-white/8">
                  <div className="text-xs font-semibold text-muted-foreground mb-2">PRODUCT (you have not seen this before)</div>
                  <p className="text-sm text-foreground leading-relaxed">{INDEPENDENT_PRODUCT}</p>
                </div>
                {INDEPENDENT_PROMPTS.map(({ label, question, placeholder }) => (
                  <div key={label} className="space-y-2">
                    <div className="text-sm font-semibold text-foreground">{label}</div>
                    <p className="text-xs text-muted-foreground">{question}</p>
                    <textarea
                      value={capstoneAnswers[`ind_${label}`] ?? ""}
                      onChange={e => setCapstoneAnswers(prev => ({ ...prev, [`ind_${label}`]: e.target.value }))}
                      placeholder={placeholder}
                      rows={4}
                      className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[oklch(0.78_0.16_30_/_0.5)] resize-none"
                    />
                  </div>
                ))}

                {!submitted && (
                  <motion.button
                    onClick={() => {
                      const filled = INDEPENDENT_PROMPTS.filter(({ label }) => (capstoneAnswers[`ind_${label}`] ?? "").length > 30).length;
                      if (filled < 3) { toast.error(`Complete all 3 sections (${filled}/3 done — aim for at least 30 characters each).`); return; }
                      setSubmitted(true); toast.success("Capstone submitted — excellent reasoning.");
                    }}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-[oklch(0.78_0.16_30)] to-[oklch(0.75_0.18_55)] text-black font-semibold text-sm">
                    <Trophy size={16} /> Submit Capstone
                  </motion.button>
                )}

                {submitted && (
                  <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                    className="glass rounded-2xl p-6 border border-[oklch(0.72_0.18_150_/_0.3)] space-y-4">
                    <div className="text-center">
                      <div className="text-5xl mb-3">🎓</div>
                      <h3 className="text-xl font-bold text-foreground mb-1">Module 1 Complete</h3>
                      <p className="text-sm text-muted-foreground">You have built the mental model. Build your personal AI action plan:</p>
                    </div>
                    {[
                      { key: "useCase", label: "One AI tool I'll use intentionally this week", placeholder: "e.g., Use Claude to draft proposals — but always verify any factual claims before sending" },
                      { key: "concern", label: "One AI system I'll think more critically about", placeholder: "e.g., The recommendation algorithm in my news feed — whose interests is it optimising for?" },
                      { key: "nextStep", label: "My next step to deepen AI literacy", placeholder: "e.g., Read one primary research paper on AI labor market impact before the next module" },
                    ].map(({ key, label, placeholder }) => (
                      <div key={key}>
                        <label className="text-xs font-semibold text-foreground mb-1.5 block">{label}</label>
                        <input value={personalPlan[key as keyof typeof personalPlan]}
                          onChange={e => setPersonalPlan(p => ({ ...p, [key]: e.target.value }))}
                          placeholder={placeholder}
                          className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[oklch(0.72_0.18_150_/_0.5)] transition-colors"
                        />
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-2 justify-center pt-2">
                      {["Training Loop", "Token Prediction", "Myth Correction", "Cognitive Prompting", "RLHF Ethics", "Capstone"].map(badge => (
                        <span key={badge} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[oklch(0.75_0.18_55_/_0.12)] border border-[oklch(0.75_0.18_55_/_0.3)] text-[oklch(0.85_0.18_55)]">
                          ✓ {badge}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </LessonShell>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

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
    toast.success(`+${meta.xp} XP — Lesson ${lessonId} complete!`);
  };

  const overallPct = Math.round((completedLessons.size / LESSONS.length) * 100);

  return (
    <PageWrapper pageName="ai-literacy">
      <div className="min-h-screen pt-20">
        <section className="py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-[oklch(0.75_0.18_55_/_0.3)] text-sm text-[oklch(0.75_0.18_55)] mb-6">
              <Brain size={14} /> Module 1 — AI Literacy for Adults
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
              className="text-4xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
              Introduction to{" "}<span className="text-gradient-gold">AI Literacy</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="text-lg text-muted-foreground max-w-2xl mb-6 leading-relaxed">
              Not just what AI is — but <em>why</em> it behaves the way it does. Five lessons that build a mental model you can reason with, not just vocabulary you can recite.
            </motion.p>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }} className="mb-6">
              <Link href="/learn/my-profile" className="inline-flex items-center gap-1.5 text-xs text-[oklch(0.65_0.22_200)] hover:text-[oklch(0.85_0.18_200)] transition-colors">
                <Sparkles size={12} />
                Lessons here adapt to your reading level, pace, and confidence — see how →
              </Link>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {[
                { label: "Lessons", value: "5", icon: <BookOpen size={14} /> },
                { label: "Total XP", value: `${totalXP > 0 ? totalXP : LESSONS.reduce((s, l) => s + l.xp, 0)}`, icon: <Zap size={14} /> },
                { label: "Duration", value: "~2 hrs", icon: <Clock size={14} /> },
                { label: "Level", value: "College intro", icon: <Star size={14} /> },
              ].map(({ label, value, icon }) => (
                <div key={label} className="glass rounded-xl p-4 border border-white/8 text-center">
                  <div className="flex items-center justify-center gap-1 text-[oklch(0.75_0.18_55)] mb-2">{icon}</div>
                  <div className="text-lg font-bold text-foreground">{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              ))}
            </motion.div>

            {completedLessons.size > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="glass rounded-xl p-4 border border-[oklch(0.75_0.18_55_/_0.2)] mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Module Progress</span>
                  <span className="text-sm font-bold text-[oklch(0.75_0.18_55)]">{overallPct}%</span>
                </div>
                <Progress value={overallPct} className="h-2 mb-2" />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{completedLessons.size}/{LESSONS.length} lessons</span>
                  <span>·</span>
                  <span>{totalXP} XP earned</span>
                </div>
              </motion.div>
            )}
          </div>
        </section>

        <section className="pb-20 px-4">
          <div className="max-w-4xl mx-auto">
            {activeLesson === null ? (
              <div className="space-y-3">
                {LESSONS.map((lesson, i) => {
                  const isComplete = completedLessons.has(lesson.id);
                  return (
                    <motion.div key={lesson.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                      className={`glass rounded-2xl border overflow-hidden transition-all ${isComplete ? "border-[oklch(0.72_0.18_150_/_0.3)]" : "border-white/8 hover:border-white/15"}`}>
                      <button onClick={() => setActiveLesson(lesson.id)}
                        className="w-full flex items-center gap-5 p-5 text-left hover:bg-white/3 transition-colors">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: `color-mix(in oklch, ${lesson.color} 15%, transparent)`, border: `1px solid color-mix(in oklch, ${lesson.color} 30%, transparent)` }}>
                          <span style={{ color: lesson.color }}>{lesson.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs text-muted-foreground">Lesson {lesson.id}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-muted-foreground">{lesson.bloomLevel}</span>
                          </div>
                          <h3 className="font-semibold text-foreground">{lesson.title}</h3>
                          <p className="text-sm text-muted-foreground truncate">{lesson.subtitle}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={10} /> {lesson.duration}</span>
                          <span className="text-xs text-[oklch(0.75_0.18_55)] flex items-center gap-1"><Zap size={10} /> +{lesson.xp} XP</span>
                          {isComplete
                            ? <span className="flex items-center gap-1 text-xs text-[oklch(0.72_0.18_150)] font-medium"><CheckCircle2 size={11} /> Done</span>
                            : <ChevronRight size={14} className="text-muted-foreground" />
                          }
                        </div>
                      </button>
                    </motion.div>
                  );
                })}

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                  className="glass rounded-2xl p-6 border border-white/8 mt-6">
                  <div className="flex items-start gap-3 mb-4">
                    <Brain size={16} className="text-[oklch(0.65_0.22_200)] mt-0.5 shrink-0" />
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">Learning science behind this module</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Each lesson is designed around a specific cognitive principle, not just topic coverage.
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { name: "Elaborative interrogation", desc: "Every concept includes the 'why' — retention is 40–50% higher with mechanism explanations" },
                      { name: "Desirable difficulty", desc: "You predict before seeing answers; this is harder but produces stronger long-term retention" },
                      { name: "Worked-example effect", desc: "Capstone scaffolds from full example → partial → independent practice" },
                      { name: "Myth correction", desc: "Three-part structure: steelman → mechanism → nuanced truth (not one-sentence rebuttals)" },
                      { name: "Coherence principle", desc: "Each lesson has one core concept — extras are excluded, not crammed in" },
                      { name: "Transfer design", desc: "Every lesson ends by applying the concept to a novel situation you haven't seen" },
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
              <div>
                <button onClick={() => setActiveLesson(null)}
                  className="flex items-center gap-1.5 mb-6 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ChevronLeft size={14} /> Back to all lessons
                </button>
                <AnimatePresence mode="wait">
                  {activeLesson === 1 && <Lesson1 key={1} onComplete={() => handleComplete(1)} completed={completedLessons.has(1)} />}
                  {activeLesson === 2 && <Lesson2 key={2} onComplete={() => handleComplete(2)} completed={completedLessons.has(2)} />}
                  {activeLesson === 3 && <Lesson3 key={3} onComplete={() => handleComplete(3)} completed={completedLessons.has(3)} />}
                  {activeLesson === 4 && <Lesson4 key={4} onComplete={() => handleComplete(4)} completed={completedLessons.has(4)} />}
                  {activeLesson === 5 && <Lesson5 key={5} onComplete={() => handleComplete(5)} completed={completedLessons.has(5)} completedLessons={completedLessons} />}
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
