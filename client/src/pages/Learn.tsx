import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Sparkles, Target, ChevronRight, Loader2,
  Brain, MessageSquare, CheckCircle2, ArrowRight,
  GraduationCap, Zap, RotateCcw, Send, ChevronDown,
  Clock, Star, Play, Lock, ChevronLeft, XCircle, Check,
  Volume2, VolumeX, Pause, HelpCircle, Shield, Trophy,
  Eye, Info, Award, RefreshCw
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import PageWrapper from "@/components/PageWrapper";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { useLocation } from "wouter";

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

interface SocraticMessage {
  role: "tutor" | "student";
  content: string;
}

// ─── AI Literacy Types & Data ────────────────────────────────────────────────
type LessonId = 1 | 2 | 3 | 4 | 5;

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
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

const LESSON_META = [
  { id: 1 as LessonId, title: "What Is AI?", subtitle: "A stable mental model — no buzzwords", duration: "25 min", color: "oklch(0.75_0.18_55)", xp: 50 },
  { id: 2 as LessonId, title: "Myths vs. Reality", subtitle: "Separate hype and fear from fact", duration: "20 min", color: "oklch(0.65_0.22_200)", xp: 60 },
  { id: 3 as LessonId, title: "Prompt Engineering", subtitle: "Speak AI fluently — craft prompts that work", duration: "30 min", color: "oklch(0.72_0.2_290)", xp: 80 },
  { id: 4 as LessonId, title: "Ethics & Society", subtitle: "Navigate the human side of AI", duration: "25 min", color: "oklch(0.72_0.18_150)", xp: 70 },
  { id: 5 as LessonId, title: "Capstone", subtitle: "Apply everything you've learned", duration: "20 min", color: "oklch(0.78_0.16_30)", xp: 100 },
];

const MYTH_QUIZ: QuizQuestion[] = [
  { id: "m1", question: "AI systems like ChatGPT are conscious and have feelings.", options: ["True — they learn from human emotion", "False — they process patterns, not feelings", "Partly true", "Scientists disagree"], correct: 1, explanation: "LLMs are statistical pattern-matchers. They predict likely next tokens. There is no subjective experience or consciousness — however convincing the output feels." },
  { id: "m2", question: "AI will replace ALL jobs within the next decade.", options: ["True — automation eliminates everything", "False — it transforms and creates new roles too", "Only blue-collar jobs", "Only white-collar jobs"], correct: 1, explanation: "History shows automation displaces tasks, not entire occupations. New jobs emerge. The risk is real for some roles but 'all jobs' is unsupported by any economic consensus." },
  { id: "m3", question: "What does 'machine learning' actually mean?", options: ["A robot physically learning to walk", "Algorithms improving from data without explicit rules", "A computer memorizing a textbook", "Software that mimics human thought step by step"], correct: 1, explanation: "Machine learning finds patterns in data to make predictions — without being explicitly programmed with every rule. It's statistics at scale." },
  { id: "m4", question: "AI is 100% objective because it's just math.", options: ["True — algorithms can't be biased", "False — AI inherits bias from training data and designers", "True — bias is human only", "Partially true"], correct: 1, explanation: "AI reflects its training data. If historical data encodes racial, gender, or socioeconomic bias, the model will too. 'It's just math' doesn't eliminate bias — it can amplify it at scale." },
  { id: "m5", question: "Which best describes a Large Language Model (LLM)?", options: ["A database that looks up answers", "A model trained to predict the next most likely token", "Software that understands language like a human", "A search engine with a chat interface"], correct: 1, explanation: "LLMs are trained to predict what comes next, token by token. They don't 'understand' in a human sense — they model statistical relationships between words." },
  { id: "m6", question: "AI systems always give accurate, truthful answers.", options: ["True — trained on verified data", "False — they can 'hallucinate' plausible-sounding falsehoods", "True if premium tier", "Only false for open-source models"], correct: 1, explanation: "AI hallucination is well-documented: models produce confident-sounding but factually wrong answers because they optimize for plausibility, not truth." },
];

const DEF_QUIZ: QuizQuestion[] = [
  { id: "d1", question: "AI stands for:", options: ["Automated Intelligence", "Artificial Intelligence", "Advanced Integration", "Algorithmic Interface"], correct: 1, explanation: "Artificial Intelligence — the simulation of human-like reasoning by machines, encompassing machine learning, NLP, computer vision, and more." },
  { id: "d2", question: "Which term describes AI that can perform any intellectual task a human can?", options: ["Narrow AI", "Strong AI / AGI", "Supervised Learning", "Neural Network"], correct: 1, explanation: "AGI is hypothetical AI matching human cognitive flexibility across all domains. Today's AI is narrow — excellent at specific tasks, brittle outside them." },
  { id: "d3", question: "A 'neural network' in AI is inspired by:", options: ["Internet networks", "Electrical grids", "The human brain's neuron structure", "Social networks"], correct: 2, explanation: "Neural networks use layers of interconnected nodes loosely inspired by neurons and synapses that learn to recognize patterns through training." },
  { id: "d4", question: "When an AI is 'trained', what happens?", options: ["It reads a manual", "It adjusts its parameters by processing large amounts of data", "It copies a human's behavior", "Engineers manually program every rule"], correct: 1, explanation: "Training is where a model processes data, makes predictions, receives feedback via loss functions, and adjusts millions of weights to improve future predictions." },
];

const PROMPT_EXERCISES: PromptExercise[] = [
  { id: "p1", title: "Job Application Letter", scenario: "You need to write a cover letter for a marketing manager position at a tech startup. You have 5 years of experience and led a team that grew social media by 300%.", vague: "Write me a cover letter.", hint: "Add: role + company type, your specific achievements, desired tone, length, and what to emphasize.", rubric: ["Specifies the role and company type", "Includes at least one concrete achievement with a number", "States desired tone (professional, energetic, etc.)", "Mentions approximate length or format"] },
  { id: "p2", title: "Explaining to Family", scenario: "Your 70-year-old grandmother asks you to have AI explain what a 'blockchain' is. She's comfortable with everyday technology but not technical jargon.", vague: "Explain blockchain.", hint: "Use: persona instruction, audience description, analogy request, length limit, and plain language requirement.", rubric: ["Specifies the audience (older adult, non-technical)", "Requests an analogy or comparison", "Sets a length limit (e.g., 3 sentences)", "Explicitly says 'no jargon' or 'plain language'"] },
  { id: "p3", title: "Business Name Ideas", scenario: "You're starting a local bakery that specializes in sourdough bread and pastries. You want a name that feels warm, artisan, and slightly whimsical — not corporate.", vague: "Give me bakery names.", hint: "Specify: specialty, tone/mood, style, and ask for a certain number with brief reasoning.", rubric: ["Describes the bakery's specialty", "Describes the desired tone or mood", "Specifies how many options", "Asks for a brief reason per name"] },
];

const ETHICS_SCENARIOS: EthicsScenario[] = [
  { id: "e1", title: "The Hiring Algorithm", setup: "A major employer uses an AI system to screen 50,000 job applications. An audit reveals it consistently scores women 15% lower for engineering roles — because historically, fewer women were hired for those roles.", stakeholders: [{ name: "Job Applicant", concern: "Qualified but unfairly filtered out before a human sees her application." }, { name: "HR Manager", concern: "Trusted the system to be objective; now liable." }, { name: "AI Developer", concern: "Trained on available data; wasn't asked to audit for demographic parity." }, { name: "Company CEO", concern: "Wants efficiency AND legal compliance. A lawsuit could cost millions." }], discussion: "Who is responsible? Should the system be halted immediately? Can debiasing the data solve it — or does it require rethinking from scratch? What oversight should exist before AI makes high-stakes decisions?" },
  { id: "e2", title: "The Medical Chatbot", setup: "A hospital deploys an AI chatbot that triages patients. Studies show it performs well on average — but has higher error rates for patients who describe symptoms in non-standard dialects.", stakeholders: [{ name: "Patient", concern: "Risk of being incorrectly triaged to home care when ER is needed." }, { name: "ER Nurse", concern: "Overtaxed if AI sends everyone to ER; undertrained if it filters too aggressively." }, { name: "Hospital Administrator", concern: "Reduced wait times — but liability for AI errors." }, { name: "Regulator", concern: "AI medical devices need approval. What testing standard applies?" }], discussion: "Should language-unequal AI be deployed in healthcare at all? What minimum accuracy threshold across all demographic groups should be required? Who bears responsibility when an AI misdiagnosis causes harm?" },
  { id: "e3", title: "The AI School Tutor", setup: "A school district deploys an AI writing tutor. Teachers report improved grades. But a parent discovers the system stores all student writing indefinitely and the privacy policy allows using this data to train future models.", stakeholders: [{ name: "Student (14 yrs)", concern: "Their personal writing and struggles are data — forever." }, { name: "Teacher", concern: "Great tool, but didn't consent students to data collection." }, { name: "Parent", concern: "Their child's data is used commercially without informed consent." }, { name: "EdTech Company", concern: "Student data is core to improving the product. Anonymization is expensive." }], discussion: "Does 'better outcomes' justify data collection from minors? Should there be a legal right to be forgotten for student data? What's the difference between anonymized and de-identified — and does it matter?" },
];

// ─── Module 2 Types & Data ────────────────────────────────────────────────────
type M2LessonId = 6 | 7 | 8 | 9 | 10;

interface ToolCard {
  id: string;
  name: string;
  category: string;
  useCases: string[];
  bestFor: string;
  caution: string;
}

interface OutputSample {
  id: string;
  label: string;
  text: string;
  issues: string[];
  score: "strong" | "mixed" | "weak";
}

interface CareerScenario {
  id: string;
  field: string;
  icon: string;
  aiImpact: string;
  tasksAutomated: string[];
  tasksAugmented: string[];
  newOpportunities: string[];
  advice: string;
}

const M2_LESSON_META = [
  { id: 6 as M2LessonId, title: "AI Tools Landscape", subtitle: "Know your toolkit before you pick it up", duration: "20 min", color: "oklch(0.72_0.2_260)", xp: 50 },
  { id: 7 as M2LessonId, title: "Evaluating AI Output", subtitle: "The critical skill no one talks about", duration: "25 min", color: "oklch(0.68_0.22_20)", xp: 60 },
  { id: 8 as M2LessonId, title: "Prompting for Work", subtitle: "Workplace prompts that actually deliver", duration: "30 min", color: "oklch(0.72_0.2_290)", xp: 80 },
  { id: 9 as M2LessonId, title: "AI & Your Career", subtitle: "Navigate the shift before it navigates you", duration: "25 min", color: "oklch(0.72_0.18_150)", xp: 70 },
  { id: 10 as M2LessonId, title: "Workplace Capstone", subtitle: "Apply Module 2 to a real scenario", duration: "20 min", color: "oklch(0.78_0.16_30)", xp: 100 },
];

const AI_TOOLS: ToolCard[] = [
  { id: "t1", name: "ChatGPT / Claude", category: "Writing & Chat", useCases: ["Draft emails", "Summarize documents", "Brainstorm ideas", "Explain complex topics"], bestFor: "Anything text-based: drafting, editing, Q&A, research support", caution: "Verify facts independently. Confident ≠ correct." },
  { id: "t2", name: "Copilot (Microsoft 365)", category: "Productivity Suite", useCases: ["Summarize Word docs", "Draft PowerPoint slides", "Analyze Excel data", "Recap Teams meetings"], bestFor: "People already deep in the Microsoft ecosystem", caution: "Data stays inside your Microsoft tenant — check your org's Copilot license." },
  { id: "t3", name: "Gemini (Google Workspace)", category: "Productivity Suite", useCases: ["Write in Docs", "Summarize Gmail threads", "Build Sheets formulas", "Generate Slides content"], bestFor: "Google Workspace users who want AI inside their existing apps", caution: "Review privacy settings — by default, your data may train Google models." },
  { id: "t4", name: "Perplexity", category: "Research", useCases: ["Cited web research", "Competitive analysis", "Fact-checking", "Up-to-date answers"], bestFor: "Research tasks where source citations matter", caution: "Still hallucinate-prone. Always click through to the cited source." },
  { id: "t5", name: "Otter.ai / Fireflies", category: "Meetings", useCases: ["Transcribe meetings", "Generate action items", "Create meeting summaries", "Search past meetings"], bestFor: "Teams with lots of meetings and inadequate note-taking", caution: "Participants must consent to being recorded. Check local laws." },
  { id: "t6", name: "Midjourney / DALL·E", category: "Image Generation", useCases: ["Marketing visuals", "Presentation graphics", "Concept mockups", "Social media assets"], bestFor: "Creating draft visuals fast when a designer isn't available", caution: "Review copyright rules — generated images may have usage restrictions." },
  { id: "t7", name: "GitHub Copilot", category: "Coding", useCases: ["Code completion", "Explain legacy code", "Generate tests", "Debug errors"], bestFor: "Developers — dramatically speeds up routine coding tasks", caution: "Review every suggestion. Copilot can suggest insecure or incorrect code." },
  { id: "t8", name: "Zapier / Make AI", category: "Automation", useCases: ["Automate repetitive workflows", "Connect apps via AI logic", "Trigger actions from emails", "Build no-code pipelines"], bestFor: "Operations teams who want to eliminate manual data-shuffling tasks", caution: "Test automations thoroughly before deploying to production data." },
];

const OUTPUT_SAMPLES: OutputSample[] = [
  { id: "o1", label: "Meeting Summary", score: "strong",
    text: "Meeting summary (April 15 — Q2 Planning):\n\nDecisions made:\n• Budget for Q2 marketing approved at $45,000\n• Sarah will lead the redesign project, deadline June 1\n• Weekly check-ins moved to Thursdays at 2pm\n\nAction items:\n• Marcus: send vendor quotes by April 22\n• Priya: draft redesign brief by April 19\n• All: review attached Q1 analytics before Thursday",
    issues: [] },
  { id: "o2", label: "Research Summary", score: "mixed",
    text: "According to recent studies, remote work increases productivity by up to 47% across all industries. Employees who work from home report higher job satisfaction and companies save an average of $11,000 per employee annually. All major tech companies now offer permanent remote options, and most HR experts agree remote work is the future of employment.",
    issues: ["'Up to 47%' cherry-picks one outlier study — most research shows 0–15% variation depending on role type", "'All major tech companies' is false — Apple, Amazon, and others have mandated returns to office", "'Most HR experts agree' is an unverifiable appeal to authority — no source cited", "Presents a nuanced, contested topic as settled fact"] },
  { id: "o3", label: "Policy Explanation", score: "weak",
    text: "The new data privacy regulation that was enacted in 2019 requires all companies with more than 250 employees to appoint a Data Protection Officer and submit annual compliance reports to the Federal Privacy Commission. Violations result in fines of up to $50,000 per incident. The regulation also gives consumers the right to request deletion of their data within 30 days.",
    issues: ["Mixes details from GDPR (EU, 2018), CCPA (California, 2020), and possibly fictional elements", "'Federal Privacy Commission' does not exist in US law — this is fabricated", "The 250-employee threshold and $50k fine figures are invented", "High-confidence legal claims with zero citations — classic hallucination pattern"] },
];

const CAREER_SCENARIOS: CareerScenario[] = [
  { id: "cs1", field: "Administrative & Office", icon: "office",
    aiImpact: "AI is automating routine data entry, scheduling, and standard document drafting — but human judgment, relationship management, and complex coordination remain irreplaceable.",
    tasksAutomated: ["Data entry and form processing", "Meeting scheduling and calendar management", "Standard email acknowledgments", "Basic report generation"],
    tasksAugmented: ["Drafting complex correspondence (with AI as first draft)", "Research and competitive analysis", "Preparing executive briefings", "Managing multi-party coordination"],
    newOpportunities: ["AI workflow coordinator", "Prompt specialist for office tools", "Process automation analyst", "AI output reviewer / quality assurance"],
    advice: "Master AI tools in your current stack (Copilot, Gemini). The people who survive this shift are those who become the bridge between AI capabilities and human needs." },
  { id: "cs2", field: "Healthcare & Social Work", icon: "health",
    aiImpact: "AI is entering diagnostics, documentation, and triage — but clinical judgment, emotional support, and ethical decision-making require human professionals more than ever.",
    tasksAutomated: ["Clinical documentation (AI scribes)", "Medical image pre-screening", "Insurance pre-authorization research", "Appointment scheduling and reminders"],
    tasksAugmented: ["Diagnosis support (AI flags, human decides)", "Treatment research and literature review", "Patient communication drafting", "Care plan coordination"],
    newOpportunities: ["Clinical AI validator", "Health informatics specialist", "AI ethics reviewer for medical tools", "Patient AI literacy educator"],
    advice: "AI will be your colleague, not your replacement. The critical skill is knowing when to trust AI suggestions and when to override them — that requires deep domain knowledge." },
  { id: "cs3", field: "Education & Training", icon: "education",
    aiImpact: "AI personalizes learning content and automates grading — but teaching, mentorship, and the human relationship at the core of education cannot be replicated.",
    tasksAutomated: ["Multiple choice grading", "Generating first-draft lesson materials", "Answering factual student questions", "Tracking student progress data"],
    tasksAugmented: ["Personalized content scaffolding", "Identifying struggling students earlier", "Creating differentiated learning materials", "Parent communication drafting"],
    newOpportunities: ["AI curriculum designer", "EdTech implementation specialist", "Learning analytics interpreter", "AI literacy educator (like this course!)"],
    advice: "Your relationship with students is the moat. Invest in becoming the expert at using AI tools to save time on tasks, so you can spend more time on what humans do best — mentorship and inspiration." },
  { id: "cs4", field: "Business, Finance & Marketing", icon: "business",
    aiImpact: "AI is transforming analysis, content creation, and customer service — accelerating output while raising the bar on strategic thinking and creative judgment.",
    tasksAutomated: ["Routine financial reporting", "First-draft marketing copy", "Social media content calendars", "Standard customer service responses"],
    tasksAugmented: ["Market research and competitive analysis", "Data visualization and insight framing", "Personalized customer outreach", "Financial modeling and scenario analysis"],
    newOpportunities: ["AI marketing strategist", "Prompt engineer for business applications", "AI risk and compliance analyst", "Revenue operations with AI tooling"],
    advice: "The new skill premium is judgment + AI fluency. Anyone can run an AI tool. The value is in knowing which output is right, which is wrong, and how to direct AI toward business outcomes." },
];

const WORK_PROMPT_EXERCISES: PromptExercise[] = [
  { id: "wp1", title: "Professional Email",
    scenario: "Your team missed a deadline that affects a client. You need to write an email to the client acknowledging the delay, explaining briefly what happened (server migration took longer than expected), and proposing a new delivery date of Friday EOD. Tone should be professional but human — not robotic.",
    vague: "Write an apology email to a client.",
    hint: "Include: recipient context (client relationship), specific reason, new commitment with date, tone guidance, and any action you want from the client.",
    rubric: ["Specifies the type of client relationship", "Includes the specific reason for delay", "States a concrete new deadline", "Requests a specific response or confirmation from client"] },
  { id: "wp2", title: "Data Insight Summary",
    scenario: "You have Q1 sales data showing: total revenue $1.2M (up 18% YoY), but unit sales dropped 3%. Average order value rose 22%. Your top 3 products account for 71% of revenue. You need a 3-bullet executive summary for a leadership slide.",
    vague: "Summarize my sales data.",
    hint: "Provide all the numbers directly in the prompt. Specify format (3 bullets), audience (executives), and ask for insight framing not just raw repetition of numbers.",
    rubric: ["Includes all relevant numbers in the prompt", "Specifies bullet-point format and count", "States the audience (executives / leadership)", "Asks for insight framing, not just data restatement"] },
  { id: "wp3", title: "Meeting Action Items",
    scenario: "You attended a 45-minute planning meeting. You paste the rough transcript below and want AI to extract a clean action items list with owner names, tasks, and due dates. The transcript has crosstalk and filler words.",
    vague: "Get action items from this meeting.",
    hint: "Tell AI the format you want (table or bullets), what fields to extract (owner, task, deadline), how to handle uncertainty (flag unclear owners), and what to ignore (small talk).",
    rubric: ["Specifies output format (table or bullet list)", "Lists the fields needed (owner, task, deadline)", "Instructs AI on how to handle unclear or missing owners", "Tells AI to ignore filler conversation"] },
];

const M2_CAPSTONE_PROMPTS = [
  { label: "Tool Selection", q: "Your manager asks you to recommend one AI tool the team should adopt in the next 90 days. Describe the tool, what specific problem it solves, and two risks your team should mitigate before using it.", ph: "e.g., I'd recommend Copilot for Microsoft 365. Our team spends ~6 hours/week on meeting notes and status emails — Copilot's summarization can reclaim at least half that. Two risks: (1) people may trust summaries without reading them — mitigate with a 'verify before sending' policy; (2) sensitive data may be processed outside our security perimeter — we need IT to confirm tenant data boundaries first..." },
  { label: "Output Audit", q: "You receive this AI-generated paragraph from a colleague who plans to use it in a client proposal: 'Our approach is based on the McKinsey 2024 Global Productivity Report, which found that AI adoption increases team output by 73% within 6 months for companies with 100+ employees.' What questions do you ask before approving it?", ph: "e.g., First: does this report exist? I'd search McKinsey's publication database directly — AI frequently cites plausible-sounding but nonexistent reports. Second: even if the report exists, '73%' is a very specific number — I'd check what it actually measured (self-reported perception vs. objective metrics), for what type of work, and what the full context is. Third: 'within 6 months' is a strong causal claim — most productivity research is correlational..." },
  { label: "Career Strategy", q: "Based on your own field or the one you're targeting: name two specific AI tools entering your industry, one task category you expect to decrease in demand, and one new skill you plan to develop to stay competitive. Be specific.", ph: "e.g., In marketing, Jasper and Adobe Firefly are already replacing entry-level copywriting and basic image creation work. I expect junior content creation roles to shrink significantly. The skill I'm building is AI campaign strategy — knowing how to direct AI tools, evaluate output quality, and translate business goals into effective AI workflows. I'm also prioritizing client relationship skills since that's the human layer AI can't replace..." },
];

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

// ─── Quiz Block ───────────────────────────────────────────────────────────────
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
      <div className="text-4xl mb-3">{score === questions.length ? "🌟" : score >= questions.length / 2 ? "✅" : "📚"}</div>
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

// ─── Module 2 Component ───────────────────────────────────────────────────────
function AILiteracyModule2() {
  const [activeLesson, setActiveLesson] = useState<M2LessonId | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<number>>(new Set());
  const { addXP, profile } = usePersonalization();

  // Lesson 6 state
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [toolFilter, setToolFilter] = useState("All");
  const [matchTask, setMatchTask] = useState("");
  const [matchResult, setMatchResult] = useState("");
  const [matchLoading, setMatchLoading] = useState(false);

  // Lesson 7 state
  const [activeSample, setActiveSample] = useState(0);
  const [userVerdict, setUserVerdict] = useState<Record<string, string>>({});
  const [revealedIssues, setRevealedIssues] = useState<Record<string, boolean>>({});

  // Lesson 8 state
  const [activeWorkEx, setActiveWorkEx] = useState(0);
  const [workPrompt, setWorkPrompt] = useState("");
  const [workHint, setWorkHint] = useState(false);
  const [workChecklist, setWorkChecklist] = useState<boolean[]>([false, false, false, false]);
  const [workResponse, setWorkResponse] = useState("");
  const [workLoading, setWorkLoading] = useState(false);
  const [workSubmitted, setWorkSubmitted] = useState(false);
  const [workScores, setWorkScores] = useState<Record<string, number>>({});

  // Lesson 9 state
  const [activeCareer, setActiveCareer] = useState<number | null>(null);
  const [careerTab, setCareerTab] = useState<"automated" | "augmented" | "opportunities">("automated");
  const [careerReflection, setCareerReflection] = useState("");
  const [careerReflectionSaved, setCareerReflectionSaved] = useState(false);

  // Lesson 10 state
  const [m2Step, setM2Step] = useState(0);
  const [m2Answers, setM2Answers] = useState(["", "", ""]);
  const [m2Done, setM2Done] = useState(false);

  const matchMutation = trpc.ai.explainConcept.useMutation({
    onSuccess: (data) => { setMatchResult(data.explanation); setMatchLoading(false); },
    onError: (err: { message: string }) => { toast.error(err.message); setMatchLoading(false); },
  });

  const workMutation = trpc.ai.explainConcept.useMutation({
    onSuccess: (data) => { setWorkResponse(data.explanation); setWorkLoading(false); setWorkSubmitted(true); },
    onError: (err: { message: string }) => { toast.error(err.message); setWorkLoading(false); },
  });

  const handleM2Complete = (id: M2LessonId) => {
    if (completedLessons.has(id)) return;
    const meta = M2_LESSON_META.find((l) => l.id === id)!;
    setCompletedLessons((prev) => new Set(Array.from(prev).concat(id)));
    addXP(meta.xp);
    toast.success(`+${meta.xp} XP — Lesson ${id - 5} complete!`);
  };

  const switchWorkEx = (idx: number) => {
    setActiveWorkEx(idx); setWorkPrompt(""); setWorkHint(false);
    setWorkChecklist([false, false, false, false]); setWorkSubmitted(false); setWorkResponse("");
  };

  const handleWorkCheck = (i: number) => {
    const updated = [...workChecklist]; updated[i] = !updated[i]; setWorkChecklist(updated);
    const score = updated.filter(Boolean).length;
    setWorkScores((prev) => ({ ...prev, [WORK_PROMPT_EXERCISES[activeWorkEx].id]: score }));
    if (score === 4) { addXP(15); toast.success("+15 XP — perfect work prompt!"); }
  };

  const handleMatchTask = () => {
    if (!matchTask.trim()) { toast.error("Describe your task first."); return; }
    setMatchLoading(true); setMatchResult("");
    const ctx = profile.preferredTopics?.length ? ` The user's interests include: ${profile.preferredTopics.join(", ")}.` : "";
    matchMutation.mutate({
      concept: `I need to pick the best AI tool for this task: "${matchTask}".${ctx} Available tools: ChatGPT/Claude (writing, summarization, Q&A), Microsoft Copilot (Word/Excel/Teams/PowerPoint), Google Gemini (Docs/Gmail/Sheets), Perplexity (cited research), Otter.ai/Fireflies (meeting transcription), Midjourney/DALL-E (image generation), GitHub Copilot (coding), Zapier/Make (workflow automation). Recommend the 1-2 best fits with a short explanation tailored to the task.`,
      level: "student",
    });
  };

  const overallPct = Math.round((completedLessons.size / M2_LESSON_META.length) * 100);
  const toolCategories = ["All", ...Array.from(new Set(AI_TOOLS.map((t) => t.category)))];
  const filteredTools = toolFilter === "All" ? AI_TOOLS : AI_TOOLS.filter((t) => t.category === toolFilter);

  const scoreMeta = {
    strong: { label: "Strong Output", textCls: "text-[oklch(0.72_0.18_150)]", bgCls: "bg-[oklch(0.72_0.18_150_/_0.1)] border-[oklch(0.72_0.18_150_/_0.3)]" },
    mixed:  { label: "Review Carefully", textCls: "text-[oklch(0.78_0.16_30)]",  bgCls: "bg-[oklch(0.78_0.16_30_/_0.1)] border-[oklch(0.78_0.16_30_/_0.3)]" },
    weak:   { label: "High Risk — Verify", textCls: "text-[oklch(0.68_0.22_20)]", bgCls: "bg-[oklch(0.68_0.22_20_/_0.1)] border-[oklch(0.68_0.22_20_/_0.3)]" },
  };

  // Shell shared by all Module 2 lessons
  function M2Shell({ id, children }: { id: M2LessonId; children: React.ReactNode }) {
    const meta = M2_LESSON_META.find((l) => l.id === id)!;
    const done = completedLessons.has(id);
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
        <button onClick={() => setActiveLesson(null)} className="flex items-center gap-1.5 mb-5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={14} /> Back to lessons
        </button>
        <div className="glass rounded-2xl p-5 border border-white/8 mb-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Module 2 · Lesson {id - 5} · AI in the Workplace</div>
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
            : <motion.button onClick={() => handleM2Complete(id)} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 text-black"
                style={{ background: `linear-gradient(to right, ${meta.color}, oklch(0.65_0.22_200))` }}>
                <CheckCircle2 size={15} /> Mark Complete & Earn {meta.xp} XP
              </motion.button>
          }
        </div>
        {id < 10 && (
          <div className="mt-4 flex justify-end">
            <button onClick={() => setActiveLesson((id + 1) as M2LessonId)}
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

      {/* ── Lesson 6: AI Tools Landscape ── */}
      {activeLesson === 6 && (
        <M2Shell key={6} id={6}>
          <div className="space-y-5">
            <div className="glass rounded-2xl p-6 border border-white/8">
              <Narrator text="Every AI tool is built for a different job. Picking the wrong one is like using a screwdriver to cut wood. This lesson gives you a map of the AI tools landscape so you can match the right tool to any task — and know what to watch out for." />
              <div className="mt-4 grid grid-cols-4 gap-2">
                {[{ l: "Writing", icon: <MessageSquare size={16} /> }, { l: "Research", icon: <BookOpen size={16} /> }, { l: "Meetings", icon: <GraduationCap size={16} /> }, { l: "Automation", icon: <Zap size={16} /> }].map(({ l, icon }) => (
                  <div key={l} className="glass rounded-xl p-3 border border-white/8 flex flex-col items-center gap-1.5 text-center">
                    <span className="text-[oklch(0.72_0.2_260)]">{icon}</span>
                    <span className="text-xs font-medium text-foreground">{l}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Category filter */}
            <div className="flex flex-wrap gap-2">
              {toolCategories.map((cat) => (
                <button key={cat} onClick={() => setToolFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    toolFilter === cat
                      ? "bg-[oklch(0.72_0.2_260_/_0.15)] border-[oklch(0.72_0.2_260_/_0.4)] text-[oklch(0.82_0.2_260)]"
                      : "glass border-white/8 text-muted-foreground"
                  }`}>{cat}</button>
              ))}
            </div>

            {/* Tool grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredTools.map((tool) => (
                <motion.div key={tool.id} layout
                  onClick={() => setSelectedTool(selectedTool === tool.id ? null : tool.id)}
                  className={`glass rounded-xl border cursor-pointer transition-all overflow-hidden ${
                    selectedTool === tool.id ? "border-[oklch(0.72_0.2_260_/_0.5)]" : "border-white/8 hover:border-white/20"
                  }`}>
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-sm text-foreground">{tool.name}</div>
                        <div className="text-xs text-[oklch(0.72_0.2_260)] mt-0.5">{tool.category}</div>
                      </div>
                      <ChevronDown size={13} className={`text-muted-foreground mt-1 shrink-0 transition-transform ${selectedTool === tool.id ? "rotate-180" : ""}`} />
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {tool.useCases.map((uc) => (
                        <span key={uc} className="px-2 py-0.5 rounded-md text-xs bg-white/5 border border-white/8 text-muted-foreground">{uc}</span>
                      ))}
                    </div>
                  </div>
                  <AnimatePresence>
                    {selectedTool === tool.id && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-2">
                          <p className="text-xs"><span className="font-semibold text-[oklch(0.72_0.18_150)]">Best for: </span><span className="text-muted-foreground">{tool.bestFor}</span></p>
                          <p className="text-xs"><span className="font-semibold text-[oklch(0.68_0.22_20)]">Watch out: </span><span className="text-muted-foreground">{tool.caution}</span></p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>

            {/* AI-powered task matcher */}
            <div className="glass rounded-2xl p-5 border border-[oklch(0.72_0.2_260_/_0.2)]">
              <div className="text-xs font-semibold text-[oklch(0.72_0.2_260)] mb-1">ADAPTIVE TOOL MATCHER</div>
              <p className="text-xs text-muted-foreground mb-3">Describe your actual work task and get a personalized recommendation.</p>
              <div className="flex gap-2">
                <input value={matchTask} onChange={(e) => setMatchTask(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleMatchTask()}
                  placeholder="e.g., I need to summarize 3 hours of weekly team meetings…"
                  className="flex-1 bg-white/3 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[oklch(0.72_0.2_260_/_0.5)] transition-colors" />
                <motion.button onClick={handleMatchTask} disabled={matchLoading || !matchTask.trim()}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                  style={{ background: "oklch(0.72_0.2_260)" }}>
                  {matchLoading ? <><RefreshCw size={13} className="animate-spin" /> Matching…</> : <><Sparkles size={13} /> Match</>}
                </motion.button>
              </div>
              <AnimatePresence>
                {matchResult && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-3 p-4 rounded-xl bg-[oklch(0.72_0.2_260_/_0.08)] border border-[oklch(0.72_0.2_260_/_0.2)]">
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{matchResult}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="glass rounded-2xl p-5 border border-white/8">
              <h4 className="font-semibold text-foreground mb-3">Knowledge Check</h4>
              <QuizBlock accentColor="oklch(0.72_0.2_260)" questions={[
                { id: "l6q1", question: "You need to transcribe and summarize weekly stakeholder meetings. Which tool category fits best?", options: ["Image generation (Midjourney / DALL·E)", "Meeting transcription AI (Otter.ai / Fireflies)", "Code assistant (GitHub Copilot)", "General chat AI with no integrations"], correct: 1, explanation: "Meeting transcription tools join calls live, identify speakers, and generate summaries and action items automatically. A general chat AI needs the transcript first — an extra manual step that these tools eliminate." },
                { id: "l6q2", question: "Before using any AI tool for work, the most important question is:", options: ["How many parameters does the model have?", "Is it free or paid?", "What data does it collect, and where does it go?", "Which company built it?"], correct: 2, explanation: "Data privacy is the top professional concern. Sensitive company information entered into AI tools may leave your organization, be used for model training, or violate client confidentiality agreements. Check before you paste." },
                { id: "l6q3", question: "Your org uses Google Workspace. You want AI to help draft documents and summarize email threads inside the apps you already use. The best-integrated option is:", options: ["GitHub Copilot", "Gemini for Google Workspace", "Zapier", "Midjourney"], correct: 1, explanation: "Gemini is built directly into Google Workspace apps — Docs, Gmail, Sheets, Slides. It surfaces inline, no copy-pasting required. When you already live in Google's ecosystem, Gemini is the lowest-friction choice." },
              ]} />
            </div>
          </div>
        </M2Shell>
      )}

      {/* ── Lesson 7: Evaluating AI Output ── */}
      {activeLesson === 7 && (
        <M2Shell key={7} id={7}>
          <div className="space-y-5">
            <div className="glass rounded-2xl p-6 border border-white/8">
              <Narrator text="The most dangerous moment with AI isn't when it's obviously wrong — it's when it sounds completely right, but isn't. Learning to audit AI output before you act on it is the highest-value skill this course will give you." />
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { label: "Plausibility", d: "Does it sound right?", icon: <HelpCircle size={18} className="text-[oklch(0.72_0.2_260)]" /> },
                  { label: "Verifiability", d: "Can claims be checked?", icon: <Eye size={18} className="text-[oklch(0.78_0.16_30)]" /> },
                  { label: "Source Quality", d: "Are citations real?", icon: <Shield size={18} className="text-[oklch(0.68_0.22_20)]" /> },
                ].map(({ label, d, icon }) => (
                  <div key={label} className="glass rounded-xl p-3 border border-white/8 text-center">
                    <div className="flex justify-center mb-2">{icon}</div>
                    <div className="text-xs font-semibold text-foreground">{label}</div>
                    <p className="text-xs text-muted-foreground mt-1 leading-snug">{d}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-sm font-semibold text-foreground">Audit these 3 AI-generated outputs. Spot the problems before the reveal.</div>
            <div className="flex gap-2">
              {OUTPUT_SAMPLES.map((s, i) => (
                <button key={i} onClick={() => setActiveSample(i)}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all border text-center ${
                    activeSample === i ? `${scoreMeta[s.score].bgCls} text-foreground` : "glass border-white/8 text-muted-foreground"
                  }`}>{s.label}</button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={activeSample} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                className="glass rounded-2xl p-6 border border-white/8 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">{OUTPUT_SAMPLES[activeSample].label}</h3>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${scoreMeta[OUTPUT_SAMPLES[activeSample].score].bgCls} ${scoreMeta[OUTPUT_SAMPLES[activeSample].score].textCls}`}>
                    {scoreMeta[OUTPUT_SAMPLES[activeSample].score].label}
                  </span>
                </div>
                <div className="glass rounded-xl p-4 border border-white/10 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap font-mono">
                  {OUTPUT_SAMPLES[activeSample].text}
                </div>
                <div>
                  <label className="text-xs font-semibold text-foreground mb-2 block">What issues do you spot? What would you verify?</label>
                  <textarea value={userVerdict[OUTPUT_SAMPLES[activeSample].id] ?? ""}
                    onChange={(e) => setUserVerdict((prev) => ({ ...prev, [OUTPUT_SAMPLES[activeSample].id]: e.target.value }))}
                    placeholder="Note any claims that seem suspicious, vague, or unverifiable…"
                    rows={4} className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[oklch(0.68_0.22_20_/_0.5)] resize-none" />
                </div>
                <button onClick={() => setRevealedIssues((prev) => ({ ...prev, [OUTPUT_SAMPLES[activeSample].id]: true }))}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[oklch(0.68_0.22_20_/_0.12)] border border-[oklch(0.68_0.22_20_/_0.3)] text-sm text-[oklch(0.78_0.22_20)] font-medium">
                  <Eye size={13} /> Reveal expert analysis
                </button>
                <AnimatePresence>
                  {revealedIssues[OUTPUT_SAMPLES[activeSample].id] && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      {OUTPUT_SAMPLES[activeSample].issues.length === 0 ? (
                        <div className="p-4 rounded-xl bg-[oklch(0.72_0.18_150_/_0.1)] border border-[oklch(0.72_0.18_150_/_0.3)]">
                          <div className="flex items-center gap-2 text-sm font-semibold text-[oklch(0.72_0.18_150)] mb-1"><CheckCircle2 size={14} /> This output is clean</div>
                          <p className="text-xs text-muted-foreground">Well-structured, specific, and actionable — no unsupported claims. This is what good AI output looks like. Use it as your benchmark.</p>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-[oklch(0.68_0.22_20_/_0.08)] border border-[oklch(0.68_0.22_20_/_0.25)] space-y-2">
                          <div className="text-xs font-semibold text-[oklch(0.68_0.22_20)] mb-2">ISSUES FOUND ({OUTPUT_SAMPLES[activeSample].issues.length})</div>
                          {OUTPUT_SAMPLES[activeSample].issues.map((issue, i) => (
                            <div key={i} className="flex items-start gap-2">
                              <XCircle size={13} className="text-[oklch(0.68_0.22_20)] mt-0.5 shrink-0" />
                              <p className="text-xs text-muted-foreground leading-relaxed">{issue}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </AnimatePresence>

            {/* CRAAP test */}
            <div className="glass rounded-2xl p-5 border border-white/8">
              <div className="text-xs font-semibold text-foreground mb-3">THE CRAAP TEST — A verification framework you can apply to any AI output</div>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { letter: "C", word: "Currency", q: "Is this up to date?" },
                  { letter: "R", word: "Relevance", q: "Does it fit my context?" },
                  { letter: "A", word: "Authority", q: "Is there a real source?" },
                  { letter: "A", word: "Accuracy", q: "Is it verifiable?" },
                  { letter: "P", word: "Purpose", q: "Any bias or agenda?" },
                ].map(({ letter, word, q }) => (
                  <div key={word} className="glass rounded-xl p-3 border border-white/8 text-center">
                    <div className="text-lg font-bold text-[oklch(0.68_0.22_20)] mb-1">{letter}</div>
                    <div className="text-xs font-semibold text-foreground mb-1">{word}</div>
                    <p className="text-xs text-muted-foreground leading-snug">{q}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass rounded-2xl p-5 border border-white/8">
              <h4 className="font-semibold text-foreground mb-3">Quick Check</h4>
              <QuizBlock accentColor="oklch(0.68_0.22_20)" questions={[
                { id: "l7q1", question: "An AI confidently states: 'Harvard University published a 2023 study showing X.' Your first move is:", options: ["Trust it — Harvard is reputable", "Search Harvard's actual publications for the study", "Ask a second AI if it's true", "Quote it and add a disclaimer"], correct: 1, explanation: "AI tools routinely fabricate academic citations. The study title, authors, journal, and year can all sound perfectly plausible but be completely invented. Always locate the primary source before quoting it." },
                { id: "l7q2", question: "Which AI output type carries the highest risk of silent error?", options: ["A bulleted brainstorm with no external claims", "A confident statistic with no source cited", "A creative tagline list", "A summary of text you wrote yourself"], correct: 1, explanation: "Unsourced statistics are the highest-risk AI output. Models optimize for plausibility, not truth — they predict likely-sounding numbers, not real ones. A specific figure with no citation is a red flag requiring independent verification." },
                { id: "l7q3", question: "AI summarizes a legal contract for you and the summary looks clean. What's still required?", options: ["Nothing — AI legal summaries are reliable", "Compare the summary against the original clause by clause", "Run it through a second AI", "Ask a lawyer to review just the summary"], correct: 1, explanation: "AI summaries of contracts can omit key terms, misstate obligations, or introduce inaccuracies. For any legal or financial document, compare the summary to the source material before relying on it — the stakes are too high to skip." },
              ]} />
            </div>
          </div>
        </M2Shell>
      )}

      {/* ── Lesson 8: Prompting for Work ── */}
      {activeLesson === 8 && (
        <M2Shell key={8} id={8}>
          <div className="space-y-5">
            <div className="glass rounded-2xl p-6 border border-white/8">
              <Narrator text="Workplace prompts require a different mindset than casual AI use. You're writing for specific professional outcomes — precision directly determines the quality of the deliverable. Let's practice with real work scenarios." />
              <div className="mt-4 glass rounded-xl p-4 border border-[oklch(0.72_0.2_290_/_0.2)]">
                <div className="text-xs font-semibold text-[oklch(0.72_0.2_290)] mb-3">THE WORK PROMPT FORMULA</div>
                <div className="grid grid-cols-3 gap-2">
                  {[{ n: "Role", d: "Who should AI act as?" }, { n: "Context", d: "Background AI needs" }, { n: "Task", d: "Exactly what to produce" }, { n: "Format", d: "Length, structure, style" }, { n: "Audience", d: "Who reads the output?" }, { n: "Constraints", d: "What to avoid or include" }].map(({ n, d }) => (
                    <div key={n} className="glass rounded-lg p-3 border border-white/8">
                      <div className="text-xs font-bold text-foreground mb-1">{n}</div>
                      <p className="text-xs text-muted-foreground">{d}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              {WORK_PROMPT_EXERCISES.map((ex, i) => (
                <button key={i} onClick={() => switchWorkEx(i)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all border ${
                    activeWorkEx === i ? "bg-[oklch(0.72_0.2_290_/_0.15)] border-[oklch(0.72_0.2_290_/_0.4)] text-[oklch(0.82_0.2_290)]" : "glass border-white/8 text-muted-foreground"
                  }`}>
                  {i + 1}. {ex.title}
                  {workScores[ex.id] !== undefined && <span className="text-[oklch(0.72_0.18_150)]"> ({workScores[ex.id]}/4)</span>}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={activeWorkEx} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                className="glass rounded-2xl p-6 border border-white/8 space-y-4">
                <h3 className="font-semibold text-foreground">{WORK_PROMPT_EXERCISES[activeWorkEx].title}</h3>
                <div className="glass rounded-xl p-4 border border-[oklch(0.72_0.2_290_/_0.15)]">
                  <div className="text-xs font-semibold text-[oklch(0.72_0.2_290)] mb-1.5">SCENARIO</div>
                  <p className="text-sm text-muted-foreground">{WORK_PROMPT_EXERCISES[activeWorkEx].scenario}</p>
                </div>
                <div className="glass rounded-xl p-3 border border-white/8">
                  <div className="text-xs text-muted-foreground mb-1">A weak prompt:</div>
                  <p className="text-sm text-foreground font-mono italic">"{WORK_PROMPT_EXERCISES[activeWorkEx].vague}"</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Your improved prompt:</label>
                  <textarea value={workPrompt} onChange={(e) => setWorkPrompt(e.target.value)}
                    placeholder="Use the formula: Role, Context, Task, Format, Audience, Constraints…"
                    rows={5} className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[oklch(0.72_0.2_290_/_0.5)] resize-none font-mono" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setWorkHint(!workHint)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg glass border border-white/8 text-xs text-muted-foreground">
                    <HelpCircle size={12} /> {workHint ? "Hide hint" : "Show hint"}
                  </button>
                  <motion.button
                    onClick={() => {
                      if (!workPrompt.trim()) { toast.error("Write a prompt first."); return; }
                      setWorkLoading(true); setWorkResponse("");
                      workMutation.mutate({ concept: workPrompt.substring(0, 500), level: "student" });
                    }}
                    disabled={workLoading || !workPrompt.trim()} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[oklch(0.72_0.2_290)] text-white text-sm font-medium disabled:opacity-50">
                    {workLoading ? <><RefreshCw size={13} className="animate-spin" /> Sending…</> : <><Send size={13} /> Test Prompt</>}
                  </motion.button>
                </div>
                <AnimatePresence>
                  {workHint && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                      className="px-4 py-3 rounded-xl bg-[oklch(0.72_0.2_290_/_0.08)] border border-[oklch(0.72_0.2_290_/_0.2)] text-sm text-muted-foreground">
                      <strong className="text-foreground">Hint: </strong>{WORK_PROMPT_EXERCISES[activeWorkEx].hint}
                    </motion.div>
                  )}
                  {workSubmitted && workResponse && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="glass rounded-xl p-5 border border-[oklch(0.72_0.2_290_/_0.2)]">
                      <div className="text-xs font-semibold text-[oklch(0.72_0.2_290)] mb-2">AI RESPONSE</div>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{workResponse}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="glass rounded-xl p-5 border border-[oklch(0.72_0.2_290_/_0.15)]">
                  <div className="text-xs font-semibold text-[oklch(0.72_0.2_290)] mb-2">SELF-EVALUATION RUBRIC</div>
                  <div className="space-y-2">
                    {WORK_PROMPT_EXERCISES[activeWorkEx].rubric.map((criterion, i) => (
                      <label key={i} className="flex items-start gap-3 cursor-pointer">
                        <div onClick={() => handleWorkCheck(i)}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                            workChecklist[i] ? "bg-[oklch(0.72_0.18_150)] border-[oklch(0.72_0.18_150)]" : "border-white/20"
                          }`}>
                          {workChecklist[i] && <Check size={11} className="text-white" />}
                        </div>
                        <span className={`text-sm ${workChecklist[i] ? "text-foreground" : "text-muted-foreground"}`}>{criterion}</span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-white/8">
                      <div className="h-full rounded-full bg-[oklch(0.72_0.18_150)] transition-all"
                        style={{ width: `${((workScores[WORK_PROMPT_EXERCISES[activeWorkEx].id] ?? 0) / 4) * 100}%` }} />
                    </div>
                    <span className="text-xs font-medium text-foreground">{workScores[WORK_PROMPT_EXERCISES[activeWorkEx].id] ?? 0}/4</span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </M2Shell>
      )}

      {/* ── Lesson 9: AI & Your Career ── */}
      {activeLesson === 9 && (
        <M2Shell key={9} id={9}>
          <div className="space-y-5">
            <div className="glass rounded-2xl p-6 border border-white/8">
              <Narrator text="AI won't replace you. But someone who uses AI well might. The best career move you can make right now is understanding exactly how AI is entering your field — and getting ahead of it." />
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { label: "Automated", d: "Tasks AI fully handles", color: "oklch(0.68_0.22_20)", icon: <Zap size={16} /> },
                  { label: "Augmented", d: "AI supports, humans decide", color: "oklch(0.78_0.16_30)", icon: <ArrowRight size={16} /> },
                  { label: "New Roles", d: "Opportunities AI is creating", color: "oklch(0.72_0.18_150)", icon: <Star size={16} /> },
                ].map(({ label, d, color, icon }) => (
                  <div key={label} className="glass rounded-xl p-3 border border-white/8 text-center">
                    <div className="flex justify-center mb-2" style={{ color }}>{icon}</div>
                    <div className="text-xs font-semibold text-foreground">{label}</div>
                    <p className="text-xs text-muted-foreground mt-1 leading-snug">{d}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-sm font-medium text-foreground">Select your field to see the AI impact breakdown:</div>
            <div className="grid grid-cols-2 gap-2">
              {CAREER_SCENARIOS.map((s, i) => (
                <button key={i} onClick={() => { setActiveCareer(i); setCareerTab("automated"); }}
                  className={`py-3 px-4 rounded-xl text-sm font-medium transition-all border text-left ${
                    activeCareer === i
                      ? "bg-[oklch(0.72_0.18_150_/_0.15)] border-[oklch(0.72_0.18_150_/_0.4)] text-[oklch(0.82_0.18_150)]"
                      : "glass border-white/8 text-muted-foreground hover:border-white/20"
                  }`}>{s.field}</button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {activeCareer !== null && (
                <motion.div key={activeCareer} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="glass rounded-2xl p-6 border border-white/8 space-y-4">
                  <h3 className="font-semibold text-foreground">{CAREER_SCENARIOS[activeCareer].field}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{CAREER_SCENARIOS[activeCareer].aiImpact}</p>
                  <div className="flex gap-1 p-1 glass rounded-xl border border-white/8">
                    {(["automated", "augmented", "opportunities"] as const).map((tab) => (
                      <button key={tab} onClick={() => setCareerTab(tab)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all capitalize ${
                          careerTab === tab ? "bg-[oklch(0.72_0.18_150_/_0.15)] text-[oklch(0.82_0.18_150)]" : "text-muted-foreground"
                        }`}>{tab}</button>
                    ))}
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div key={careerTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
                      {careerTab === "automated" && (
                        <div className="space-y-2">
                          {CAREER_SCENARIOS[activeCareer].tasksAutomated.map((t, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl glass border border-[oklch(0.68_0.22_20_/_0.2)]">
                              <Zap size={13} className="text-[oklch(0.68_0.22_20)] shrink-0" />
                              <span className="text-sm text-muted-foreground">{t}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {careerTab === "augmented" && (
                        <div className="space-y-2">
                          {CAREER_SCENARIOS[activeCareer].tasksAugmented.map((t, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl glass border border-[oklch(0.78_0.16_30_/_0.2)]">
                              <ArrowRight size={13} className="text-[oklch(0.78_0.16_30)] shrink-0" />
                              <span className="text-sm text-muted-foreground">{t}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {careerTab === "opportunities" && (
                        <div className="space-y-2">
                          {CAREER_SCENARIOS[activeCareer].newOpportunities.map((t, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl glass border border-[oklch(0.72_0.18_150_/_0.2)]">
                              <Star size={13} className="text-[oklch(0.72_0.18_150)] shrink-0" />
                              <span className="text-sm text-muted-foreground">{t}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                  <div className="glass rounded-xl p-4 border border-[oklch(0.72_0.18_150_/_0.2)]">
                    <div className="text-xs font-semibold text-[oklch(0.72_0.18_150)] mb-2">STRATEGIC ADVICE</div>
                    <p className="text-sm text-muted-foreground leading-relaxed italic">"{CAREER_SCENARIOS[activeCareer].advice}"</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="glass rounded-2xl p-5 border border-white/8">
              <div className="text-sm font-semibold text-foreground mb-1">Your 30-Day Action Plan</div>
              <p className="text-xs text-muted-foreground mb-3">Based on what you just read: what is one concrete action you will take in the next 30 days to stay ahead in your field?</p>
              <textarea value={careerReflection} onChange={(e) => setCareerReflection(e.target.value)}
                placeholder="e.g., I'll spend 30 minutes this week exploring Copilot in my current apps. I'll also subscribe to one newsletter covering AI in my industry…"
                rows={4} className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[oklch(0.72_0.18_150_/_0.5)] resize-none" />
              {!careerReflectionSaved
                ? <button onClick={() => { if (!careerReflection.trim()) { toast.error("Write your action plan first."); return; } setCareerReflectionSaved(true); addXP(10); toast.success("+10 XP — action plan saved!"); }}
                    className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[oklch(0.72_0.18_150_/_0.2)] border border-[oklch(0.72_0.18_150_/_0.3)] text-sm text-[oklch(0.82_0.18_150)]">
                    <Check size={13} /> Save My Action Plan
                  </button>
                : <p className="mt-3 text-xs text-[oklch(0.72_0.18_150)] flex items-center gap-1"><CheckCircle2 size={11} /> Saved — +10 XP</p>
              }
            </div>

            <div className="glass rounded-2xl p-5 border border-white/8">
              <h4 className="font-semibold text-foreground mb-3">Quick Check</h4>
              <QuizBlock accentColor="oklch(0.72_0.18_150)" questions={[
                { id: "l9q1", question: "Which task is MOST likely to be fully automated by AI in the near term?", options: ["Negotiating a contract with a difficult client", "Categorizing and routing 500 expense receipts", "Leading a team through organizational change", "Counseling someone through a mental health crisis"], correct: 1, explanation: "High-volume, rule-based data processing — like categorizing receipts — is exactly what current AI excels at and is already replacing. Tasks requiring relationship, judgment, and emotional intelligence remain deeply human." },
                { id: "l9q2", question: "AI 'augmentation' at work means:", options: ["AI fully takes over a job function", "AI handles repetitive parts so humans can focus on higher-judgment work", "Installing AI hardware in the office", "Avoiding AI to preserve human skills"], correct: 1, explanation: "Augmentation means AI accelerates the routine parts of your work — so you can spend more time on the high-judgment, creative, and relational elements that machines can't replicate." },
                { id: "l9q3", question: "The most career-resilient combination in an AI-heavy workplace is:", options: ["Advanced Python coding skills", "A large social media following", "Deep domain expertise plus the ability to direct and evaluate AI", "Avoiding AI tools to stay sharp"], correct: 2, explanation: "The new premium is judgment plus AI fluency. Anyone can run an AI tool. The value is in knowing your field well enough to direct AI toward the right outcomes — and catch it when it's wrong." },
              ]} />
            </div>
          </div>
        </M2Shell>
      )}

      {/* ── Lesson 10: Workplace Capstone ── */}
      {activeLesson === 10 && (
        <M2Shell key={10} id={10}>
          <div className="space-y-5">
            {completedLessons.size < 4 && (
              <div className="glass rounded-xl p-5 border border-[oklch(0.78_0.16_30_/_0.3)]">
                <div className="flex items-start gap-3">
                  <Lock size={16} className="text-[oklch(0.78_0.16_30)] mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Complete Earlier Lessons First</h4>
                    <p className="text-sm text-muted-foreground">You have completed {completedLessons.size}/4 previous lessons. The capstone builds on all four.</p>
                    <div className="flex gap-1 mt-2">
                      {[6, 7, 8, 9].map((n) => (
                        <div key={n} className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold border ${
                          completedLessons.has(n) ? "bg-[oklch(0.72_0.18_150_/_0.2)] border-[oklch(0.72_0.18_150_/_0.4)] text-[oklch(0.72_0.18_150)]" : "glass border-white/10 text-muted-foreground"
                        }`}>{completedLessons.has(n) ? <Check size={12} /> : n - 5}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="glass rounded-2xl p-6 border border-white/8">
              <Narrator text="This capstone applies all four Module 2 skills: picking the right tool, auditing AI output, crafting work prompts, and thinking strategically about your career. Be specific — specific answers are the mark of genuine understanding." />
            </div>
            <div className="flex gap-2">
              {M2_CAPSTONE_PROMPTS.map((p, i) => (
                <button key={i} onClick={() => setM2Step(i)}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all border text-center ${
                    m2Step === i ? "bg-[oklch(0.78_0.16_30_/_0.15)] border-[oklch(0.78_0.16_30_/_0.4)] text-[oklch(0.88_0.16_30)]" : "glass border-white/8 text-muted-foreground"
                  }`}>
                  {p.label} {m2Answers[i].length > 20 && <CheckCircle2 size={11} className="inline text-[oklch(0.72_0.18_150)]" />}
                </button>
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={m2Step} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                className="glass rounded-2xl p-6 border border-[oklch(0.78_0.16_30_/_0.15)]">
                <div className="text-xs font-semibold text-[oklch(0.78_0.16_30)] mb-3">CAPSTONE — {M2_CAPSTONE_PROMPTS[m2Step].label.toUpperCase()}</div>
                <p className="text-sm font-medium text-foreground mb-4 leading-snug">{M2_CAPSTONE_PROMPTS[m2Step].q}</p>
                <textarea value={m2Answers[m2Step]}
                  onChange={(e) => { const u = [...m2Answers]; u[m2Step] = e.target.value; setM2Answers(u); }}
                  placeholder={M2_CAPSTONE_PROMPTS[m2Step].ph} rows={6}
                  className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[oklch(0.78_0.16_30_/_0.5)] resize-none leading-relaxed" />
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-muted-foreground">{m2Answers[m2Step].length} chars</span>
                  <div className="flex gap-2">
                    {m2Step > 0 && (
                      <button onClick={() => setM2Step(m2Step - 1)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg glass border border-white/8 text-xs text-muted-foreground">
                        <ChevronLeft size={12} /> Previous
                      </button>
                    )}
                    {m2Step < M2_CAPSTONE_PROMPTS.length - 1
                      ? <button onClick={() => setM2Step(m2Step + 1)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[oklch(0.78_0.16_30_/_0.2)] border border-[oklch(0.78_0.16_30_/_0.3)] text-xs text-[oklch(0.88_0.16_30)]">
                          Next <ChevronRight size={12} />
                        </button>
                      : !m2Done && (
                          <motion.button
                            onClick={() => {
                              if (m2Answers.filter((a) => a.length > 20).length < 3) {
                                toast.error(`Complete all 3 parts (${m2Answers.filter((a) => a.length > 20).length}/3 done).`); return;
                              }
                              setM2Done(true); handleM2Complete(10);
                              toast.success("Module 2 complete!");
                            }}
                            whileHover={{ scale: 1.02 }}
                            className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-black text-xs font-semibold"
                            style={{ background: "linear-gradient(to right, oklch(0.78_0.16_30), oklch(0.72_0.2_260))" }}>
                            <Trophy size={12} /> Submit
                          </motion.button>
                        )
                    }
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
            {m2Done && (
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                className="glass rounded-2xl p-8 border border-[oklch(0.72_0.2_260_/_0.3)] text-center">
                <Trophy size={40} className="mx-auto mb-3 text-[oklch(0.72_0.2_260)]" />
                <h3 className="text-2xl font-bold text-foreground mb-2">Module 2 Complete!</h3>
                <p className="text-muted-foreground mb-4 max-w-lg mx-auto">You have earned your <strong className="text-foreground">AI in the Workplace Certificate</strong>.</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {["Tool Expert", "Output Auditor", "Work Prompter", "Career Navigator", "Capstone"].map((b) => (
                    <span key={b} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[oklch(0.72_0.2_260_/_0.12)] border border-[oklch(0.72_0.2_260_/_0.3)] text-[oklch(0.82_0.2_260)]">
                      <CheckCircle2 size={11} className="inline mr-1" />{b}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </M2Shell>
      )}
    </AnimatePresence>
  );

  // ── Module 2 lesson overview ──
  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-6 border border-[oklch(0.72_0.2_260_/_0.2)]">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[oklch(0.72_0.2_260_/_0.15)] text-[oklch(0.82_0.2_260)] border border-[oklch(0.72_0.2_260_/_0.3)]">Module 2</span>
              <span className="px-2.5 py-1 rounded-full text-xs bg-white/5 border border-white/10 text-muted-foreground">Intermediate · ~2 hrs · 360 XP</span>
            </div>
            <h3 className="text-lg font-bold text-foreground">AI in the Workplace</h3>
            <p className="text-sm text-muted-foreground">Tools, critical evaluation, prompting, and career strategy</p>
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
        {M2_LESSON_META.map((lesson, i) => {
          const done = completedLessons.has(lesson.id);
          return (
            <motion.div key={lesson.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`glass rounded-2xl border overflow-hidden transition-all ${done ? "border-[oklch(0.72_0.18_150_/_0.3)]" : "border-white/8 hover:border-white/15"}`}>
              <button onClick={() => setActiveLesson(lesson.id)} className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/3 transition-colors">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
                  style={{ background: `color-mix(in oklch, ${lesson.color} 15%, transparent)`, border: `1px solid color-mix(in oklch, ${lesson.color} 30%, transparent)`, color: lesson.color }}>
                  {lesson.id - 5}
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
          <GraduationCap size={15} className="text-[oklch(0.72_0.2_260)] mt-0.5 shrink-0" />
          <div>
            <h4 className="font-semibold text-foreground mb-1 text-sm">What you will be able to do after Module 2</h4>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[
                { n: "Tool Selection", d: "Pick the right AI for any task" },
                { n: "Output Auditing", d: "Catch errors before they cost you" },
                { n: "Work Prompting", d: "Get professional-grade results" },
                { n: "Career Navigation", d: "Stay ahead of the AI shift" },
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
    </div>
  );
}

// ─── AI Literacy Tab (replaces Nexus Foundation) ──────────────────────────────
function AILiteracyTab() {
  const [activeModule, setActiveModule] = useState<1 | 2>(1);
  const [activeLesson, setActiveLesson] = useState<LessonId | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<number>>(new Set());
  const { addXP } = usePersonalization();

  // ── Lesson 3 prompt exercise state ──
  const [activeEx, setActiveEx] = useState(0);
  const [userPrompt, setUserPrompt] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [checklist, setChecklist] = useState<boolean[]>([false, false, false, false]);
  const [promptResponse, setPromptResponse] = useState("");
  const [promptLoading, setPromptLoading] = useState(false);
  const [promptSubmitted, setPromptSubmitted] = useState(false);
  const [allScores, setAllScores] = useState<Record<string, number>>({});

  // ── Lesson 4 ethics state ──
  const [activeScenario, setActiveScenario] = useState(0);
  const [expandedStakeholder, setExpandedStakeholder] = useState<number | null>(null);
  const [userReflections, setUserReflections] = useState<Record<string, string>>({});
  const [savedReflections, setSavedReflections] = useState<Record<string, boolean>>({});

  // ── Lesson 5 capstone ──
  const [capstoneStep, setCapstoneStep] = useState(0);
  const [capstoneAnswers, setCapstoneAnswers] = useState(["", "", ""]);
  const [capstoneDone, setCapstoneDone] = useState(false);

  const explainMutation = trpc.ai.explainConcept.useMutation({
    onSuccess: (data) => {
      setPromptResponse(data.explanation);
      setPromptLoading(false);
      setPromptSubmitted(true);
    },
    onError: (err: { message: string }) => { toast.error(err.message); setPromptLoading(false); },
  });

  const handleComplete = (id: LessonId) => {
    if (completedLessons.has(id)) return;
    const meta = LESSON_META.find(l => l.id === id)!;
    setCompletedLessons(prev => new Set(Array.from(prev).concat(id)));
    addXP(meta.xp);
    toast.success(`+${meta.xp} XP — Lesson ${id} complete!`);
  };

  const handlePromptSubmit = () => {
    if (!userPrompt.trim()) { toast.error("Write a prompt first."); return; }
    setPromptLoading(true);
    setPromptResponse("");
    explainMutation.mutate({ concept: userPrompt.substring(0, 500), level: "student" });
  };

  const handleCheck = (i: number) => {
    const updated = [...checklist];
    updated[i] = !updated[i];
    setChecklist(updated);
    const score = updated.filter(Boolean).length;
    const ex = PROMPT_EXERCISES[activeEx];
    setAllScores(prev => ({ ...prev, [ex.id]: score }));
    if (score === 4) { addXP(15); toast.success("+15 XP — perfect prompt!"); }
  };

  const switchEx = (idx: number) => {
    setActiveEx(idx);
    setUserPrompt("");
    setShowHint(false);
    setChecklist([false, false, false, false]);
    setPromptSubmitted(false);
    setPromptResponse("");
  };

  const overallPct = Math.round((completedLessons.size / LESSON_META.length) * 100);

  const CAPSTONE_PROMPTS = [
    { label: "Real-World AI", q: "Identify one AI system you encounter daily (recommendations, search, voice assistant, etc.). How does it work? What data does it need? Who benefits and who might be harmed?", ph: "e.g., Netflix's recommendation algorithm uses viewing history from millions of users to predict what I'll watch next. Netflix benefits from longer engagement; I benefit from discovery but risk a filter bubble..." },
    { label: "Myth Detection", q: 'A headline reads: "AI Chatbot Passes Medical Board Exam — Human Doctors Now Obsolete." Using what you learned, break down what is misleading about this framing.', ph: "e.g., Passing a multiple-choice exam tests pattern recognition on a static dataset, not clinical judgment in ambiguous real-world situations. 'Obsolete' overstates the case — doctors do far more than answer exam questions..." },
    { label: "Ethical Reasoning", q: "A city plans to use AI to predict which neighborhoods need more police patrols. Identify at least two ethical concerns and one safeguard you would require before deployment.", ph: "e.g., Concern 1: Predictive policing can amplify historical bias — past over-policing creates more data from those areas, producing a self-fulfilling loop. Concern 2: Lack of transparency — residents can't contest an algorithmic decision they can't see..." },
  ];

  // ── Lesson shells ──
  function LessonShell({ id, children }: { id: LessonId; children: React.ReactNode }) {
    const meta = LESSON_META.find(l => l.id === id)!;
    const done = completedLessons.has(id);
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
        <button onClick={() => setActiveLesson(null)} className="flex items-center gap-1.5 mb-5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={14} /> Back to all lessons
        </button>
        <div className="glass rounded-2xl p-5 border border-white/8 mb-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Lesson {id} · Mayer Multimedia Principles</div>
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
            : <motion.button onClick={() => handleComplete(id)} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 text-black"
                style={{ background: `linear-gradient(to right, ${meta.color}, oklch(0.65_0.22_200))` }}>
                <CheckCircle2 size={15} /> Mark Complete & Earn {meta.xp} XP
              </motion.button>
          }
        </div>
        {id < 5 && (
          <div className="mt-4 flex justify-end">
            <button onClick={() => setActiveLesson((id + 1) as LessonId)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg glass border border-white/10 text-sm text-muted-foreground hover:text-foreground transition-colors">
              Next lesson <ChevronRight size={13} />
            </button>
          </div>
        )}
      </motion.div>
    );
  }

  // ── Lesson 1 ──
  const [seg1, setSeg1] = useState(0);
  const segments1 = [
    { title: "The 60-Second Definition", narration: "Artificial Intelligence is the ability of a computer system to perform tasks that typically require human intelligence — understanding language, recognizing patterns, making decisions, and learning from experience.",
      body: (
        <div className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground leading-relaxed"><strong className="text-foreground">Artificial Intelligence</strong> is the ability of a computer system to perform tasks that typically require human intelligence — recognizing patterns, making decisions, and learning from experience.</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { l: "Narrow AI", d: "Excels at one task (chess, translation, image recognition). All AI today is narrow.", icon: <Target size={22} className="text-violet-400" /> },
              { l: "Machine Learning", d: "A subfield where systems learn from data rather than explicit rules.", icon: <Zap size={22} className="text-blue-400" /> },
              { l: "Deep Learning", d: "ML using layered neural networks — the engine behind LLMs and image AI.", icon: <Brain size={22} className="text-pink-400" /> },
              { l: "LLMs", d: "Large Language Models like ChatGPT — trained on vast text to generate and understand language.", icon: <MessageSquare size={22} className="text-emerald-400" /> },
            ].map(({ l, d, icon }) => (
              <div key={l} className="glass rounded-xl p-4 border border-white/8"><div className="mb-2">{icon}</div><div className="font-semibold text-sm text-foreground mb-1">{l}</div><p className="text-xs text-muted-foreground leading-relaxed">{d}</p></div>
            ))}
          </div>
        </div>
      )
    },
    { title: "How AI Actually Learns", narration: "Training is the core process. The model sees data, makes a prediction, gets feedback on how wrong it was, and adjusts millions of internal numbers to improve. Repeat billions of times.",
      body: (
        <div className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground leading-relaxed">Training is the core process: the model sees data, makes a prediction, receives feedback on how wrong it was (the loss), and adjusts millions of internal weights to improve. Repeat billions of times.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            {[{ n: "1", l: "Data In", d: "Text, images, audio" }, { n: "→", l: "", d: "" }, { n: "2", l: "Prediction", d: "Model guesses" }, { n: "→", l: "", d: "" }, { n: "3", l: "Feedback", d: "Loss score" }, { n: "→", l: "", d: "" }, { n: "4", l: "Adjust", d: "Update weights" }].map(({ n, l, d }, i) => (
              n === "→" ? <div key={i} className="hidden sm:flex items-center justify-center text-muted-foreground self-center"><ChevronRight size={14} /></div>
              : <div key={i} className="flex-1 glass rounded-xl p-3 border border-white/8 text-center"><div className="text-base font-bold text-[oklch(0.75_0.18_55)] mb-1">{n}</div><div className="text-xs font-semibold text-foreground">{l}</div><p className="text-xs text-muted-foreground">{d}</p></div>
            ))}
          </div>
          <div className="glass rounded-xl p-4 border border-white/10">
            <div className="flex items-start gap-2"><Info size={13} className="text-[oklch(0.75_0.18_55)] mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground"><strong className="text-foreground">Key insight:</strong> AI doesn't "understand" the way humans do. It finds statistical patterns so strong that outputs look like understanding — which is why it can be brilliant at some things and completely wrong about others.</p>
            </div>
          </div>
        </div>
      )
    },
    { title: "The AI Landscape Today", narration: "We are living through the most rapid technological transition in history. Understanding what AI is, and what it isn't, is now a basic literacy skill — as important as understanding how to evaluate a news source.",
      body: (
        <div className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground leading-relaxed">In 2024, over <strong className="text-foreground">200 million people</strong> used AI writing tools. Hospitals use AI for diagnosis. Courts use it for recommendations. AI literacy isn't just for technologists — it's civic literacy.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[{ dom: "Healthcare", uses: "Medical imaging, drug discovery, symptom triage", risk: "Misdiagnosis at scale, dataset bias" }, { dom: "Education", uses: "Personalized tutoring, essay feedback, accessibility", risk: "Over-reliance, academic dishonesty" }, { dom: "Work", uses: "Code generation, document drafting, logistics", risk: "Job displacement, deskilling" }].map(({ dom, uses, risk }) => (
              <div key={dom} className="glass rounded-xl p-4 border border-white/8">
                <div className="font-semibold text-sm text-foreground mb-2">{dom}</div>
                <p className="text-xs text-muted-foreground mb-2"><strong>Uses:</strong> {uses}</p>
                <p className="text-xs text-[oklch(0.72_0.18_150)]"><strong>Risks:</strong> {risk}</p>
              </div>
            ))}
          </div>
        </div>
      )
    },
  ];

  if (activeLesson !== null) return (
    <AnimatePresence mode="wait">
      {activeLesson === 1 && (
        <LessonShell key={1} id={1}>
          <div className="space-y-4">
            <div className="flex gap-2">
              {segments1.map((s, i) => (
                <button key={i} onClick={() => setSeg1(i)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all border ${
                    seg1 === i ? "bg-[oklch(0.75_0.18_55_/_0.15)] border-[oklch(0.75_0.18_55_/_0.4)] text-[oklch(0.85_0.18_55)]" : "glass border-white/8 text-muted-foreground"
                  }`}>{i + 1}. {s.title}</button>
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={seg1} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                className="glass rounded-2xl p-6 border border-white/8">
                <h3 className="font-semibold text-foreground mb-3">{segments1[seg1].title}</h3>
                <Narrator text={segments1[seg1].narration} />
                {segments1[seg1].body}
              </motion.div>
            </AnimatePresence>
            <div className="flex justify-between">
              <button onClick={() => setSeg1(Math.max(0, seg1 - 1))} disabled={seg1 === 0}
                className="flex items-center gap-1 px-4 py-2 rounded-lg glass border border-white/8 text-sm text-muted-foreground disabled:opacity-40">
                <ChevronLeft size={13} /> Previous
              </button>
              {seg1 < segments1.length - 1
                ? <button onClick={() => setSeg1(seg1 + 1)} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[oklch(0.75_0.18_55_/_0.15)] border border-[oklch(0.75_0.18_55_/_0.3)] text-sm text-[oklch(0.85_0.18_55)]">
                    Next <ChevronRight size={13} />
                  </button>
                : null
              }
            </div>
            <div className="glass rounded-2xl p-5 border border-white/8">
              <h4 className="font-semibold text-foreground mb-3">Knowledge Check</h4>
              <QuizBlock questions={DEF_QUIZ} accentColor="oklch(0.75_0.18_55)" />
            </div>
          </div>
        </LessonShell>
      )}

      {activeLesson === 2 && (
        <LessonShell key={2} id={2}>
          <div className="space-y-4">
            <div className="glass rounded-2xl p-6 border border-white/8">
              <Narrator text="This lesson debunks the most common AI myths. For each statement, decide: fact or fiction? The explanation afterward is where the real learning happens." />
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[{ l: "Media Fear", t: "'Robots will take over.' 'AI is sentient.' 'AI never makes mistakes.'", c: "oklch(0.72_0.2_290)" }, { l: "Reality", t: "Narrow tools, statistical patterns, useful but brittle, trained — not conscious.", c: "oklch(0.72_0.18_150)" }, { l: "Media Hype", t: "'AI will solve cancer.' 'AI reads minds.' 'AI is 100% objective.'", c: "oklch(0.78_0.16_30)" }].map(({ l, t, c }) => (
                  <div key={l} className="glass rounded-xl p-4 border border-white/8">
                    <div className="text-xs font-semibold mb-2" style={{ color: c }}>{l}</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{t}</p>
                  </div>
                ))}
              </div>
            </div>
            <QuizBlock questions={MYTH_QUIZ} accentColor="oklch(0.65_0.22_200)" />
          </div>
        </LessonShell>
      )}

      {activeLesson === 3 && (
        <LessonShell key={3} id={3}>
          <div className="space-y-5">
            <div className="glass rounded-2xl p-6 border border-white/8">
              <Narrator text="Prompt engineering is communication design. You're writing instructions for a capable but literal assistant with no context about you. Precision wins." />
              <div className="mt-4 glass rounded-xl p-4 border border-[oklch(0.72_0.2_290_/_0.2)]">
                <div className="text-xs font-semibold text-[oklch(0.72_0.2_290)] mb-3">5 PROMPT PRINCIPLES</div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[{ n: "Persona", d: "Tell AI who to act as" }, { n: "Context", d: "Provide background" }, { n: "Specifics", d: "Concrete details & numbers" }, { n: "Constraints", d: "Length, format, tone" }, { n: "Goal", d: "State desired outcome" }].map(({ n, d }) => (
                    <div key={n} className="glass rounded-lg p-3 border border-white/8"><div className="text-xs font-bold text-foreground mb-1">{n}</div><p className="text-xs text-muted-foreground leading-snug">{d}</p></div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {PROMPT_EXERCISES.map((e, i) => (
                <button key={i} onClick={() => switchEx(i)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all border ${
                    activeEx === i ? "bg-[oklch(0.72_0.2_290_/_0.15)] border-[oklch(0.72_0.2_290_/_0.4)] text-[oklch(0.82_0.2_290)]" : "glass border-white/8 text-muted-foreground"
                  }`}>
                  {i + 1}. {e.title} {allScores[e.id] !== undefined ? <span className="text-[oklch(0.72_0.18_150)]">({allScores[e.id]}/4)</span> : null}
                </button>
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={activeEx} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                className="glass rounded-2xl p-6 border border-white/8 space-y-4">
                <h3 className="font-semibold text-foreground">{PROMPT_EXERCISES[activeEx].title}</h3>
                <div className="glass rounded-xl p-4 border border-[oklch(0.72_0.2_290_/_0.15)]">
                  <div className="text-xs font-semibold text-[oklch(0.72_0.2_290)] mb-1.5">SCENARIO</div>
                  <p className="text-sm text-muted-foreground">{PROMPT_EXERCISES[activeEx].scenario}</p>
                </div>
                <div className="glass rounded-xl p-3 border border-white/8">
                  <div className="text-xs text-muted-foreground mb-1">A weak prompt:</div>
                  <p className="text-sm text-foreground font-mono italic">"{PROMPT_EXERCISES[activeEx].vague}"</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Your improved prompt:</label>
                  <textarea value={userPrompt} onChange={e => setUserPrompt(e.target.value)}
                    placeholder="Write a detailed, specific prompt using the 5 principles..."
                    rows={5} className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[oklch(0.72_0.2_290_/_0.5)] resize-none font-mono transition-colors" />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowHint(!showHint)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg glass border border-white/8 text-xs text-muted-foreground">
                    <HelpCircle size={12} /> {showHint ? "Hide hint" : "Show hint"}
                  </button>
                  <motion.button onClick={handlePromptSubmit} disabled={promptLoading || !userPrompt.trim()}
                    whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[oklch(0.72_0.2_290)] text-white text-sm font-medium disabled:opacity-50">
                    {promptLoading ? <><RefreshCw size={13} className="animate-spin" /> Sending...</> : <><Send size={13} /> Test Prompt</>}
                  </motion.button>
                </div>
                <AnimatePresence>
                  {showHint && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                      className="px-4 py-3 rounded-xl bg-[oklch(0.72_0.2_290_/_0.08)] border border-[oklch(0.72_0.2_290_/_0.2)] text-sm text-muted-foreground">
                      <strong className="text-foreground">Hint: </strong>{PROMPT_EXERCISES[activeEx].hint}
                    </motion.div>
                  )}
                  {promptSubmitted && promptResponse && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="glass rounded-xl p-5 border border-[oklch(0.72_0.2_290_/_0.2)]">
                      <div className="text-xs font-semibold text-[oklch(0.72_0.2_290)] mb-2">AI RESPONSE</div>
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{promptResponse}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="glass rounded-xl p-5 border border-[oklch(0.72_0.2_290_/_0.15)]">
                  <div className="text-xs font-semibold text-[oklch(0.72_0.2_290)] mb-2">SELF-EVALUATION RUBRIC</div>
                  <div className="space-y-2">
                    {PROMPT_EXERCISES[activeEx].rubric.map((criterion, i) => (
                      <label key={i} className="flex items-start gap-3 cursor-pointer">
                        <div onClick={() => handleCheck(i)}
                          className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                            checklist[i] ? "bg-[oklch(0.72_0.18_150)] border-[oklch(0.72_0.18_150)]" : "border-white/20"
                          }`}>
                          {checklist[i] && <Check size={11} className="text-white" />}
                        </div>
                        <span className={`text-sm ${checklist[i] ? "text-foreground" : "text-muted-foreground"}`}>{criterion}</span>
                      </label>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-white/8">
                      <div className="h-full rounded-full bg-[oklch(0.72_0.18_150)] transition-all" style={{ width: `${((allScores[PROMPT_EXERCISES[activeEx].id] ?? 0) / 4) * 100}%` }} />
                    </div>
                    <span className="text-xs font-medium text-foreground">{allScores[PROMPT_EXERCISES[activeEx].id] ?? 0}/4</span>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </LessonShell>
      )}

      {activeLesson === 4 && (
        <LessonShell key={4} id={4}>
          <div className="space-y-5">
            <div className="glass rounded-2xl p-6 border border-white/8">
              <Narrator text="AI ethics is not about being anti-technology. It's about asking: Who benefits? Who bears the risk? Who decides? These scenarios have no single correct answer — the point is to reason carefully through competing values." />
              <div className="mt-4 grid grid-cols-3 gap-3">
                {([
                { l: "Fairness", d: "Does the system treat all groups equitably?", icon: <Shield size={20} className="text-[oklch(0.72_0.18_150)]" /> },
                { l: "Accountability", d: "When AI causes harm, who is responsible?", icon: <Eye size={20} className="text-[oklch(0.65_0.22_200)]" /> },
                { l: "Transparency", d: "Can people understand how decisions are made?", icon: <Info size={20} className="text-[oklch(0.75_0.18_55)]" /> },
              ] as { l: string; d: string; icon: React.ReactNode }[]).map(({ l, d, icon }) => (
                  <div key={l} className="glass rounded-xl p-3 border border-white/8 text-center">
                    <div className="flex justify-center mb-2">{icon}</div>
                    <div className="text-xs font-semibold text-foreground mb-1">{l}</div>
                    <p className="text-xs text-muted-foreground leading-snug">{d}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              {ETHICS_SCENARIOS.map((s, i) => (
                <button key={i} onClick={() => { setActiveScenario(i); setExpandedStakeholder(null); }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all border ${
                    activeScenario === i ? "bg-[oklch(0.72_0.18_150_/_0.15)] border-[oklch(0.72_0.18_150_/_0.4)] text-[oklch(0.82_0.18_150)]" : "glass border-white/8 text-muted-foreground"
                  }`}>{s.title}</button>
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={activeScenario} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                className="glass rounded-2xl p-6 border border-white/8 space-y-4">
                <h3 className="font-semibold text-foreground">{ETHICS_SCENARIOS[activeScenario].title}</h3>
                <div className="glass rounded-xl p-4 border border-[oklch(0.72_0.18_150_/_0.15)]">
                  <div className="text-xs font-semibold text-[oklch(0.72_0.18_150)] mb-2">THE SITUATION</div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{ETHICS_SCENARIOS[activeScenario].setup}</p>
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground mb-2">Who is affected?</div>
                  <div className="space-y-2">
                    {ETHICS_SCENARIOS[activeScenario].stakeholders.map((s, i) => (
                      <div key={i} className="glass rounded-xl border border-white/8 overflow-hidden">
                        <button onClick={() => setExpandedStakeholder(expandedStakeholder === i ? null : i)}
                          className="w-full flex items-center justify-between p-3 hover:bg-white/3 transition-colors">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[oklch(0.72_0.18_150_/_0.15)] border border-[oklch(0.72_0.18_150_/_0.3)] flex items-center justify-center text-xs font-bold text-[oklch(0.72_0.18_150)]">{s.name.charAt(0)}</div>
                            <span className="text-sm font-medium text-foreground">{s.name}</span>
                          </div>
                          <ChevronDown size={13} className={`text-muted-foreground transition-transform ${expandedStakeholder === i ? "rotate-180" : ""}`} />
                        </button>
                        <AnimatePresence>
                          {expandedStakeholder === i && (
                            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                              <p className="px-4 pb-3 pt-2 text-sm text-muted-foreground border-t border-white/5 leading-relaxed">{s.concern}</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="glass rounded-xl p-5 border border-[oklch(0.72_0.18_150_/_0.2)]">
                  <div className="text-xs font-semibold text-[oklch(0.72_0.18_150)] mb-2">DISCUSSION</div>
                  <p className="text-sm text-muted-foreground mb-3">{ETHICS_SCENARIOS[activeScenario].discussion}</p>
                  <label className="text-xs font-medium text-foreground mb-2 block">Your perspective:</label>
                  <textarea
                    value={userReflections[ETHICS_SCENARIOS[activeScenario].id] ?? ""}
                    onChange={e => setUserReflections(prev => ({ ...prev, [ETHICS_SCENARIOS[activeScenario].id]: e.target.value }))}
                    placeholder="Reason through it — there's no single right answer..."
                    rows={4} className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[oklch(0.72_0.18_150_/_0.5)] resize-none" />
                  {!savedReflections[ETHICS_SCENARIOS[activeScenario].id]
                    ? <button onClick={() => { if (!(userReflections[ETHICS_SCENARIOS[activeScenario].id] ?? "").trim()) { toast.error("Write your perspective first."); return; } setSavedReflections(prev => ({ ...prev, [ETHICS_SCENARIOS[activeScenario].id]: true })); toast.success("Reflection saved!"); }}
                        className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[oklch(0.72_0.18_150_/_0.2)] border border-[oklch(0.72_0.18_150_/_0.3)] text-sm text-[oklch(0.82_0.18_150)]">
                        <MessageSquare size={13} /> Save Reflection
                      </button>
                    : <p className="mt-3 text-xs text-[oklch(0.72_0.18_150)] flex items-center gap-1"><CheckCircle2 size={11} /> Reflection saved.</p>
                  }
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </LessonShell>
      )}

      {activeLesson === 5 && (
        <LessonShell key={5} id={5}>
          <div className="space-y-5">
            {completedLessons.size < 4 && (
              <div className="glass rounded-xl p-5 border border-[oklch(0.78_0.16_30_/_0.3)]">
                <div className="flex items-start gap-3">
                  <Lock size={16} className="text-[oklch(0.78_0.16_30)] mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Complete Earlier Lessons First</h4>
                    <p className="text-sm text-muted-foreground">You've completed {completedLessons.size}/4 previous lessons. The capstone works best after building the full foundation.</p>
                    <div className="flex gap-1 mt-2">
                      {[1, 2, 3, 4].map(n => (
                        <div key={n} className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold border ${
                          completedLessons.has(n) ? "bg-[oklch(0.72_0.18_150_/_0.2)] border-[oklch(0.72_0.18_150_/_0.4)] text-[oklch(0.72_0.18_150)]" : "glass border-white/10 text-muted-foreground"
                        }`}>{completedLessons.has(n) ? <Check size={12} /> : n}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="glass rounded-2xl p-6 border border-white/8">
              <Narrator text="This capstone applies everything: AI definitions, myth-busting, prompt engineering, and ethical reasoning to real-world situations. Write your answers thoughtfully — this is your AI literacy demonstration." />
            </div>
            <div className="flex gap-2">
              {CAPSTONE_PROMPTS.map((p, i) => (
                <button key={i} onClick={() => setCapstoneStep(i)}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all border text-center ${
                    capstoneStep === i ? "bg-[oklch(0.78_0.16_30_/_0.15)] border-[oklch(0.78_0.16_30_/_0.4)] text-[oklch(0.88_0.16_30)]" : "glass border-white/8 text-muted-foreground"
                  }`}>
                  {p.label} {capstoneAnswers[i].length > 20 && <span className="text-[oklch(0.72_0.18_150)]">✓</span>}
                </button>
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={capstoneStep} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                className="glass rounded-2xl p-6 border border-[oklch(0.78_0.16_30_/_0.15)]">
                <div className="text-xs font-semibold text-[oklch(0.78_0.16_30)] mb-3">CAPSTONE — {CAPSTONE_PROMPTS[capstoneStep].label.toUpperCase()}</div>
                <p className="text-sm font-medium text-foreground mb-4 leading-snug">{CAPSTONE_PROMPTS[capstoneStep].q}</p>
                <textarea value={capstoneAnswers[capstoneStep]}
                  onChange={e => { const u = [...capstoneAnswers]; u[capstoneStep] = e.target.value; setCapstoneAnswers(u); }}
                  placeholder={CAPSTONE_PROMPTS[capstoneStep].ph} rows={6}
                  className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[oklch(0.78_0.16_30_/_0.5)] resize-none leading-relaxed" />
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-muted-foreground">{capstoneAnswers[capstoneStep].length} chars</span>
                  <div className="flex gap-2">
                    {capstoneStep > 0 && <button onClick={() => setCapstoneStep(capstoneStep - 1)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg glass border border-white/8 text-xs text-muted-foreground"><ChevronLeft size={12} /> Previous</button>}
                    {capstoneStep < CAPSTONE_PROMPTS.length - 1
                      ? <button onClick={() => setCapstoneStep(capstoneStep + 1)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[oklch(0.78_0.16_30_/_0.2)] border border-[oklch(0.78_0.16_30_/_0.3)] text-xs text-[oklch(0.88_0.16_30)]">Next <ChevronRight size={12} /></button>
                      : !capstoneDone && <motion.button onClick={() => { if (capstoneAnswers.filter(a => a.length > 20).length < 3) { toast.error(`Complete all 3 parts (${capstoneAnswers.filter(a => a.length > 20).length}/3 done).`); return; } setCapstoneDone(true); toast.success("Capstone submitted!"); }} whileHover={{ scale: 1.02 }} className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-black text-xs font-semibold" style={{ background: "linear-gradient(to right, oklch(0.78_0.16_30), oklch(0.75_0.18_55))" }}><Trophy size={12} /> Submit</motion.button>
                    }
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
            {capstoneDone && (
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                className="glass rounded-2xl p-8 border border-[oklch(0.75_0.18_55_/_0.3)] text-center">
                <div className="text-5xl mb-3">🏆</div>
                <h3 className="text-2xl font-bold text-foreground mb-2">Module 1 Complete!</h3>
                <p className="text-muted-foreground mb-4 max-w-lg mx-auto">You've earned your <strong className="text-foreground">AI Literacy Certificate — Module 1</strong>.</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {["AI Definitions", "Myth Buster", "Prompt Engineer", "Ethics Reasoning", "Capstone"].map(b => (
                    <span key={b} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[oklch(0.75_0.18_55_/_0.12)] border border-[oklch(0.75_0.18_55_/_0.3)] text-[oklch(0.85_0.18_55)]">✓ {b}</span>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </LessonShell>
      )}
    </AnimatePresence>
  );

  // ── Lesson list (overview) ──
  if (activeModule === 2) return <AILiteracyModule2 />;

  return (
    <div className="space-y-4">
      {/* Module switcher */}
      <div className="flex gap-2 p-1 glass rounded-xl border border-white/8">
        {([1, 2] as const).map((m) => (
          <button key={m} onClick={() => setActiveModule(m)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
              activeModule === m
                ? "bg-[oklch(0.75_0.18_55_/_0.12)] border border-[oklch(0.75_0.18_55_/_0.25)] text-[oklch(0.85_0.18_55)]"
                : "text-muted-foreground hover:text-foreground hover:bg-white/3"
            }`}>
            <span>Module {m}</span>
            <span className="text-xs opacity-60">{m === 1 ? "Intro to AI" : "AI at Work"}</span>
          </button>
        ))}
      </div>

      <div className="glass rounded-2xl p-6 border border-[oklch(0.75_0.18_55_/_0.2)]">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[oklch(0.75_0.18_55_/_0.15)] text-[oklch(0.85_0.18_55)] border border-[oklch(0.75_0.18_55_/_0.3)]">Module 1</span>
              <span className="px-2.5 py-1 rounded-full text-xs bg-white/5 border border-white/10 text-muted-foreground">Beginner · ~2 hrs · 360 XP</span>
            </div>
            <h3 className="text-lg font-bold text-foreground">Introduction to AI for Adults</h3>
            <p className="text-sm text-muted-foreground">Built on Mayer's 12 Multimedia Learning Principles</p>
          </div>
          {completedLessons.size > 0 && <span className="text-sm font-bold shrink-0" style={{ color: "oklch(0.75_0.18_55)" }}>{overallPct}%</span>}
        </div>
        {completedLessons.size > 0 && (
          <div className="w-full h-2 rounded-full bg-white/8 mt-2">
            <div className="h-full rounded-full bg-gradient-to-r from-[oklch(0.75_0.18_55)] to-[oklch(0.65_0.22_200)] transition-all" style={{ width: `${overallPct}%` }} />
          </div>
        )}
      </div>

      <div className="space-y-2">
        {LESSON_META.map((lesson, i) => {
          const done = completedLessons.has(lesson.id);
          return (
            <motion.div key={lesson.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`glass rounded-2xl border overflow-hidden transition-all ${
                done ? "border-[oklch(0.72_0.18_150_/_0.3)]" : "border-white/8 hover:border-white/15"
              }`}>
              <button onClick={() => setActiveLesson(lesson.id)} className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/3 transition-colors">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
                  style={{ background: `color-mix(in oklch, ${lesson.color} 15%, transparent)`, border: `1px solid color-mix(in oklch, ${lesson.color} 30%, transparent)`, color: lesson.color }}>
                  {lesson.id}
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
          <Brain size={15} className="text-[oklch(0.65_0.22_200)] mt-0.5 shrink-0" />
          <div>
            <h4 className="font-semibold text-foreground mb-1 text-sm">Built on Mayer's Multimedia Learning Theory</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
              {[{ n: "Coherence", d: "No extraneous content" }, { n: "Segmenting", d: "Learner-paced chunks" }, { n: "Personalization", d: "Conversational tone" }, { n: "Modality", d: "Audio narration + visual" }, { n: "Signaling", d: "Clear structure & cues" }, { n: "Interactivity", d: "Active exercises" }].map(({ n, d }) => (
                <div key={n} className="glass rounded-lg p-3 border border-white/8"><div className="text-xs font-semibold text-foreground mb-0.5">{n}</div><p className="text-xs text-muted-foreground">{d}</p></div>
              ))}
            </div>
          </div>
        </div>
      </div>
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

// FoundationTrackTab removed — replaced by AILiteracyTab above

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
  const [activeTab, setActiveTab] = useState<"ailiteracy" | "curriculum" | "socratic" | "paths">("ailiteracy");
  const [prefillGoal, setPrefillGoal] = useState("");
  const handleSelectPath = (pathTitle: string) => {
    setPrefillGoal(`I want to learn: ${pathTitle}`);
    setActiveTab("curriculum");
  };
  const tabs = [
    { id: "ailiteracy" as const, label: "AI Literacy", icon: BookOpen, desc: "Intro to AI for Adults" },
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
                {activeTab === "ailiteracy" && <AILiteracyTab />}
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
