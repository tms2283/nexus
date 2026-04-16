import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Sparkles, Target, ChevronRight, Loader2,
  Brain, MessageSquare, CheckCircle2, ArrowRight,
  GraduationCap, Zap, RotateCcw, Send, ChevronDown,
  Clock, Star, Play, Lock, ChevronLeft, XCircle, Check,
  Volume2, VolumeX, Pause, HelpCircle, Shield, Trophy,
  Eye, Info, Award, RefreshCw, Lightbulb, AlertTriangle,
  Scale, Search, FlaskConical, Flame, Users, TrendingUp
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

// ─── SegmentFooter ─────────────────────────────────────────────────────────────────
// topics: 2–4 short strings specific to the segment just shown
// onReady: called when the learner taps "Got it" (e.g. advance to next segment)
function SegmentFooter({ topics, onReady, accentColor = "oklch(0.75_0.18_55)" }: {
  topics: string[];
  onReady?: () => void;
  accentColor?: string;
}) {
  const [mode, setMode] = useState<"idle" | "picking" | "loading" | "done">("idle");
  const [pickedTopic, setPickedTopic] = useState<string | null>(null);
  const [expansion, setExpansion] = useState("");

  const expandMutation = trpc.ai.explainConcept.useMutation({
    onSuccess: (data) => { setExpansion(data.explanation); setMode("done"); },
    onError: (err: { message: string }) => { toast.error(err.message); setMode("picking"); },
  });

  const handlePickTopic = (topic: string) => {
    setPickedTopic(topic);
    setMode("loading");
    setExpansion("");
    expandMutation.mutate({
      concept: `Explain "${topic}" in plain language for an adult learner who just encountered it in an AI literacy course. Be concise but thorough — 3 to 5 short paragraphs. Use concrete examples and avoid jargon.`,
      level: "student",
    });
  };

  const reset = () => { setMode("idle"); setPickedTopic(null); setExpansion(""); };

  return (
    <div className="mt-5 pt-4 border-t border-white/8">
      <AnimatePresence mode="wait">
        {mode === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <p className="text-xs text-muted-foreground">How are you feeling about this section?</p>
            <div className="flex gap-2">
              {onReady && (
                <motion.button onClick={onReady} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-black"
                  style={{ background: `linear-gradient(to right, ${accentColor}, oklch(0.65_0.22_200))` }}>
                  <Check size={13} /> Got it, move on
                </motion.button>
              )}
              <button onClick={() => setMode("picking")}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm border glass border-white/10 text-muted-foreground hover:text-foreground transition-colors">
                <HelpCircle size={13} /> Tell me more about…
              </button>
            </div>
          </motion.div>
        )}

        {mode === "picking" && (
          <motion.div key="picking" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-3">
            <p className="text-xs font-medium text-foreground">Which part do you want to dig deeper on?</p>
            <div className="flex flex-wrap gap-2">
              {topics.map((t) => (
                <button key={t} onClick={() => handlePickTopic(t)}
                  className="px-3 py-2 rounded-xl text-sm border glass border-white/10 text-muted-foreground hover:text-foreground hover:border-white/25 transition-colors text-left">
                  {t}
                </button>
              ))}
            </div>
            <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Never mind, I'm good
            </button>
          </motion.div>
        )}

        {mode === "loading" && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-center gap-3 p-4 rounded-xl glass border border-white/8">
            <RefreshCw size={14} className="animate-spin shrink-0" style={{ color: accentColor }} />
            <span className="text-sm text-muted-foreground">Expanding on <em className="text-foreground">{pickedTopic}</em>…</span>
          </motion.div>
        )}

        {mode === "done" && expansion && (
          <motion.div key="done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="space-y-3">
            <div className="p-5 rounded-2xl glass border" style={{ borderColor: `color-mix(in oklch, ${accentColor} 30%, transparent)` }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold" style={{ color: accentColor }}>DEEPER DIVE — {pickedTopic?.toUpperCase()}</span>
                <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  <XCircle size={12} /> Close
                </button>
              </div>
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap space-y-2">{expansion}</div>
            </div>
            {onReady && (
              <div className="flex items-center gap-3">
                <motion.button onClick={onReady} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-black"
                  style={{ background: `linear-gradient(to right, ${accentColor}, oklch(0.65_0.22_200))` }}>
                  <Check size={13} /> Got it, move on
                </motion.button>
                <button onClick={() => setMode("picking")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  Explore another topic
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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
              <SegmentFooter accentColor="oklch(0.72_0.2_260)"
                topics={["How to evaluate an AI tool's data privacy", "What 'foundation models' vs. specialized tools means", "Why AI tools give different answers to the same question", "How to run a low-risk AI pilot at work"]} />
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
              <SegmentFooter accentColor="oklch(0.68_0.22_20)"
                topics={["How to reverse-search a statistic to verify it", "What deepfakes are and how to detect them", "Why AI-generated text is hard to detect reliably", "How to fact-check AI output in under 2 minutes"]} />
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
            <SegmentFooter accentColor="oklch(0.72_0.2_290)"
              topics={["How to write a STAR-format prompt for a workplace task", "How to give AI your 'voice' so outputs sound like you", "What prompt chaining is and when to use it", "How to evaluate whether an AI-generated work product is submission-ready"]} />
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
            <SegmentFooter accentColor="oklch(0.72_0.18_150)"
              topics={["Which AI skills are most in-demand across industries right now", "How to add AI experience to a resume or LinkedIn profile", "What 'AI-augmented' roles look like in healthcare, education, and law", "How to self-teach AI fluency in 30 minutes a day"]} />
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
                <SegmentFooter
                  accentColor="oklch(0.75_0.18_55)"
                  onReady={seg1 < segments1.length - 1 ? () => setSeg1(seg1 + 1) : undefined}
                  topics={[
                    ["What narrow AI means in practice", "How neural networks actually work", "The difference between AI, ML, and deep learning", "Why LLMs predict text token by token"],
                    ["How loss functions guide training", "What 'weights' are in a neural network", "Why AI can be brilliant and wrong at the same time", "How much data does training actually require"],
                    ["Real examples of AI in healthcare today", "How AI is already changing the workforce", "What AI literacy means for everyday life", "Why civic AI literacy matters"],
                  ][seg1]}
                />
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
              <SegmentFooter accentColor="oklch(0.65_0.22_200)"
                topics={["Why AI hallucination happens", "How media coverage distorts AI reality", "What AI consciousness actually means (or doesn't)", "Why 'AI is objective' is a myth"]} />
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
              <SegmentFooter accentColor="oklch(0.72_0.2_290)"
                topics={["Why persona instructions change AI output so much", "How to write effective context for AI", "What 'temperature' and model settings mean", "Why constraints produce better results than freedom"]} />
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
              <SegmentFooter accentColor="oklch(0.72_0.18_150)"
                topics={["What algorithmic fairness actually means", "How AI accountability is handled legally", "Why AI transparency is harder than it sounds", "Real examples of AI bias causing harm"]} />
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

// ─── Clear Thinking Data ───────────────────────────────────────────────────────
type CTLessonId = "ct1" | "ct2" | "ct3" | "ct4" | "ct5";

interface Fallacy {
  id: string;
  name: string;
  definition: string;
  example: string;
  rebuttal: string;
}

interface Bias {
  id: string;
  name: string;
  definition: string;
  trigger: string;
  antidote: string;
}

interface EvidenceItem {
  id: string;
  label: string;
  description: string;
  strength: number; // 1 (weak) to 5 (strong)
}

const CT_LESSON_META = [
  { id: "ct1" as CTLessonId, title: "What Makes an Argument?", subtitle: "The anatomy of every claim worth listening to", duration: "20 min", color: "oklch(0.72_0.2_260)", xp: 50 },
  { id: "ct2" as CTLessonId, title: "Logical Fallacies", subtitle: "The tricks bad arguments use — and how to name them", duration: "25 min", color: "oklch(0.68_0.22_20)", xp: 60 },
  { id: "ct3" as CTLessonId, title: "Evidence & Sources", subtitle: "Not all evidence is created equal", duration: "25 min", color: "oklch(0.72_0.18_150)", xp: 60 },
  { id: "ct4" as CTLessonId, title: "Cognitive Biases", subtitle: "The mental shortcuts that make us predictably wrong", duration: "25 min", color: "oklch(0.78_0.16_30)", xp: 70 },
  { id: "ct5" as CTLessonId, title: "Capstone", subtitle: "Tear apart a real argument — then rebuild it", duration: "20 min", color: "oklch(0.75_0.18_55)", xp: 100 },
];

const FALLACIES: Fallacy[] = [
  { id: "f1", name: "Ad Hominem", definition: "Attacking the person making the argument instead of the argument itself.", example: "\"You can't trust his views on climate policy — he's been divorced twice.\"", rebuttal: "A person's character or personal life is irrelevant to whether their argument is logically sound. Address the claim, not the claimant." },
  { id: "f2", name: "Straw Man", definition: "Misrepresenting someone's position to make it easier to attack.", example: "Person A: 'We should reduce military spending.' Person B: 'So you want to leave the country completely defenseless?'", rebuttal: "Person A never said that. Identify the misrepresentation and restate the actual position before responding to it." },
  { id: "f3", name: "False Dilemma", definition: "Presenting only two options when more exist.", example: "\"You're either with us or against us.\"", rebuttal: "Ask: are these really the only options? Almost always, there are middle positions, third paths, or more nuanced stances available." },
  { id: "f4", name: "Appeal to Authority", definition: "Using an authority's endorsement as a substitute for evidence — especially when the authority is outside their area of expertise.", example: "\"This celebrity doctor says vaccines cause autism, so it must be true.\"", rebuttal: "Expertise is domain-specific. Evaluate the actual evidence, not just who endorses it. Even credible experts can be wrong." },
  { id: "f5", name: "Slippery Slope", definition: "Claiming that one event will inevitably lead to extreme consequences, without evidence of that chain.", example: "\"If we allow same-sex marriage, next people will want to marry animals.\"", rebuttal: "Each step in a chain requires its own evidence. Naming the slope doesn't prove you'll slide all the way down it." },
  { id: "f6", name: "Circular Reasoning", definition: "Using the conclusion as a premise — the argument assumes what it's trying to prove.", example: "\"The Bible is true because the Bible says it is true.\"", rebuttal: "Ask: what independent evidence supports the premise? If the only support is the conclusion itself, the argument is circular." },
  { id: "f7", name: "Bandwagon", definition: "Arguing something is true or good because many people believe or do it.", example: "\"A billion people can't be wrong — this must be the best diet.\"", rebuttal: "Popular belief is not evidence of truth. Historical consensus has been wrong repeatedly. Evaluate the evidence independently." },
  { id: "f8", name: "Appeal to Nature", definition: "Claiming something is good or safe because it is 'natural,' or bad because it is 'artificial.'", example: "\"This herbal remedy is completely natural, so it can't hurt you.\"", rebuttal: "Natural does not mean safe (arsenic is natural; penicillin is synthetic). Judge by evidence, not origin." },
];

const BIASES: Bias[] = [
  { id: "b1", name: "Confirmation Bias", definition: "The tendency to search for, interpret, and remember information in a way that confirms what we already believe.", trigger: "You read three articles supporting your existing view and feel vindicated — but you didn't notice the seven that challenged it.", antidote: "Deliberately seek out the strongest counterargument to your position. If you can't steelman the other side, you don't understand the issue yet." },
  { id: "b2", name: "Availability Heuristic", definition: "Judging how likely something is based on how easily an example comes to mind — usually because it was recent or dramatic.", trigger: "Plane crashes dominate the news, so you overestimate flying risk while underestimating car crash risk, which kills far more people.", antidote: "Ask: am I relying on vivid examples or actual statistics? Look up base rates before forming probability judgments." },
  { id: "b3", name: "Anchoring Bias", definition: "Over-relying on the first piece of information you encounter when making decisions.", trigger: "A jacket is 'on sale' from $300 to $150. It feels like a deal — even if $150 is still overpriced for what it is.", antidote: "Establish your own reference point before receiving external information. Ask: what would I pay for this if I saw no original price?" },
  { id: "b4", name: "Dunning-Kruger Effect", definition: "People with limited knowledge in a domain overestimate their competence; genuine experts often underestimate theirs.", trigger: "After reading one article on economics, you feel confident debating professional economists.", antidote: "Calibrate confidence to actual evidence of competence. Track your predictions and see how they land. Expertise is earned, not felt." },
  { id: "b5", name: "Sunk Cost Fallacy", definition: "Continuing a course of action because of past investment (time, money, effort) rather than future value.", trigger: "You stay in a bad job for two more years because 'I've already given them six years of my life.'", antidote: "Ask: if I were deciding today from scratch — with no past investment — would I still choose this? Only future value should drive future decisions." },
  { id: "b6", name: "In-Group Bias", definition: "Favoring members of your own group and viewing their actions more charitably than those of outsiders.", trigger: "When your team makes a mistake, it's a misunderstanding. When the rival team does the same thing, it reveals their true character.", antidote: "Apply the same evaluative standard to both groups. Ask: would I interpret this action the same way if the other group did it?" },
];

const EVIDENCE_ITEMS: EvidenceItem[] = [
  { id: "ev1", label: "Systematic Review / Meta-Analysis", description: "Combines results from dozens of studies on the same question, controlled for quality. The gold standard.", strength: 5 },
  { id: "ev2", label: "Randomized Controlled Trial (RCT)", description: "Participants randomly assigned to treatment/control groups. Eliminates many confounding variables.", strength: 4 },
  { id: "ev3", label: "Peer-Reviewed Observational Study", description: "Tracks real-world populations without intervention. Can show correlation but not always causation.", strength: 3 },
  { id: "ev4", label: "Expert Opinion / Position Statement", description: "What credentialed experts believe based on their training. Useful context — not a substitute for primary data.", strength: 2 },
  { id: "ev5", label: "Anecdote / Personal Story", description: "One person's experience. Vivid and compelling — but tells us nothing about frequency or causation.", strength: 1 },
];

const CT_ARG_FLAWED = {
  title: "The 4-Day Work Week Argument",
  text: `A recent blog post by productivity influencer @WorkSmarter argued:

"Every employee I've interviewed loves the idea of a 4-day work week, so it clearly increases productivity. Besides, everyone is talking about it — it's obviously the future of work. Companies that don't adopt it are run by out-of-touch executives who just want to control their employees. Studies show output goes up 20% when teams switch. And honestly, if working less were bad for the economy, it would already be illegal."`,
  errors: [
    { id: "ce1", label: "Bandwagon fallacy", explanation: "'Everyone is talking about it' is not evidence it works." },
    { id: "ce2", label: "Ad hominem", explanation: "Dismissing opponents as 'out-of-touch' instead of addressing their concerns." },
    { id: "ce3", label: "Unverified statistic", explanation: "'Studies show 20%' — which studies? This needs a citation." },
    { id: "ce4", label: "Appeal to anecdote", explanation: "Interviewing a self-selected group of enthusiasts is not representative research." },
    { id: "ce5", label: "False reasoning", explanation: "'If it were bad, it would be illegal' — legality has nothing to do with economic impact." },
  ],
};

const CT_QUIZ_L1: QuizQuestion[] = [
  { id: "ct1q1", question: "An argument requires which three components?", options: ["Opinion, feeling, and tone", "Claim, evidence, and inference", "Introduction, body, and conclusion", "Facts, statistics, and examples"], correct: 1, explanation: "Every argument has a claim (what you're asserting), evidence (the support for it), and an inference (the logical bridge connecting the two). Without all three, something may sound persuasive without actually being an argument." },
  { id: "ct1q2", question: "What is the difference between a claim and a fact?", options: ["Claims are always false; facts are always true", "A claim requires acceptance; a fact is independently verifiable", "They mean the same thing in formal logic", "Claims are shorter than facts"], correct: 1, explanation: "A fact can be verified independently of who asserts it. A claim requires someone to accept it — it may be true or false, and requires evidence and reasoning to evaluate." },
  { id: "ct1q3", question: "Which of these is a conclusion, not a premise?", options: ["Studies show a link between sleep and memory", "Therefore, improving sleep should be a health priority", "The average adult sleeps 6.8 hours per night", "Chronic sleep deprivation raises disease risk"], correct: 1, explanation: "The conclusion is what the premises are trying to establish — it follows from the evidence. 'Therefore' is a classic conclusion indicator. The other three are premises (evidence/reasons)." },
];

const CT_QUIZ_L2: QuizQuestion[] = [
  { id: "ct2q1", question: "Which fallacy is this? 'You shouldn't listen to her argument about tax policy — she's never even run a business.'", options: ["Straw Man", "Ad Hominem", "Appeal to Authority", "Bandwagon"], correct: 1, explanation: "Ad hominem attacks the person rather than the argument. Whether she's run a business is irrelevant to whether her reasoning about tax policy is correct — evaluate the argument on its merits." },
  { id: "ct2q2", question: "'If we legalize marijuana, next everyone will be doing heroin.' This is:", options: ["A valid causal chain", "Slippery Slope fallacy", "False Dilemma", "Appeal to Nature"], correct: 1, explanation: "Slippery slope assumes a chain of inevitable consequences without providing evidence for each step. Naming a possible downstream outcome doesn't prove it will occur." },
  { id: "ct2q3", question: "'Nine out of ten dentists recommend this toothpaste.' Even if true, what makes this potentially misleading?", options: ["Dentists aren't experts in toothpaste", "We don't know what question was asked, or which toothpaste alternatives they compared it to", "Nine is not a significant sample size", "Appeal to authority is always a fallacy"], correct: 1, explanation: "Statistics can be technically true but deeply misleading depending on framing. 'Recommend' could mean 'over no toothpaste at all,' not 'over all competing brands.' Context and methodology matter enormously." },
];

const CT_QUIZ_L3: QuizQuestion[] = [
  { id: "ct3q1", question: "A single dramatic personal story is shared to oppose a vaccine. Why is this weak evidence?", options: ["Personal stories are always fabricated", "Anecdotes tell us nothing about frequency, causation, or whether the event was typical", "The person sharing it isn't a doctor", "It's strong evidence — lived experience counts"], correct: 1, explanation: "Anecdotes are real and emotionally compelling, but they tell us nothing about how common an outcome is, what caused it, or whether millions of other people had the opposite experience. Evidence quality requires data at scale, not individual cases." },
  { id: "ct3q2", question: "Which type of study provides the strongest evidence that X causes Y?", options: ["A survey of public opinion", "An expert panel consensus statement", "A randomized controlled trial with a large sample", "A compelling case study"], correct: 2, explanation: "RCTs randomly assign participants to conditions, which controls for confounding variables that observational studies cannot eliminate. They are the closest we can get to demonstrating causation rather than correlation." },
  { id: "ct3q3", question: "A study shows that people who drink coffee live longer. The best conclusion is:", options: ["Coffee causes longevity", "There is an association between coffee drinking and longevity that warrants further investigation", "Everyone should drink more coffee", "The study is wrong"], correct: 1, explanation: "Correlation does not imply causation. Coffee drinkers may have other lifestyle factors (income, health habits) that explain the difference. Association is a starting point for investigation, not a conclusion." },
];

const CT_QUIZ_L4: QuizQuestion[] = [
  { id: "ct4q1", question: "You've been working on a failing project for 18 months. The rational reason to continue is:", options: ["The 18 months of work already invested", "Evidence that future effort will produce future value", "Your team's emotional attachment to it", "Fairness to past effort"], correct: 1, explanation: "The sunk cost fallacy causes people to continue losing endeavors because of past investment. Rational decision-making is forward-looking — only future costs and future benefits should drive future choices." },
  { id: "ct4q2", question: "Which describes the Dunning-Kruger effect?", options: ["Experts overestimate how much others know", "Low-knowledge individuals overestimate their own competence", "Competent people refuse to share their knowledge", "Learning reduces confidence permanently"], correct: 1, explanation: "People with limited knowledge in a domain often lack the metacognitive ability to recognize what they don't know — producing unearned confidence. Expertise develops alongside the ability to recognize complexity and uncertainty." },
  { id: "ct4q3", question: "Your political party's candidate makes a mistake. You call it a misunderstanding. The rival party's candidate makes the same mistake. You call it incompetence. This illustrates:", options: ["Confirmation Bias", "Availability Heuristic", "In-Group Bias", "Anchoring"], correct: 2, explanation: "In-group bias causes us to apply different interpretive standards to the same behavior depending on who performs it. Recognizing this requires deliberately applying consistent standards regardless of group membership." },
];

const CT_CAPSTONE_STEPS = [
  { label: "Spot the Errors", q: "Read the argument above carefully. List every logical error, fallacy, or unsupported claim you can find. Be specific — name the problem and quote the exact phrase it applies to.", ph: "e.g., 1. Bandwagon fallacy — 'everyone is talking about it' treats popularity as evidence of effectiveness. 2. Ad hominem — 'out-of-touch executives' dismisses opponents without addressing their concerns. 3. Unverified statistic — '20% output increase' cites no study, no author, no sample size..." },
  { label: "Steelman It", q: "Now argue the best possible version of the 4-day work week case — using only claims you could actually support with real evidence. No fallacies, no unsourced statistics, no personal attacks.", ph: "e.g., The strongest case for a 4-day work week rests on a growing body of controlled trials. Microsoft Japan's 2019 pilot reported a 40% productivity increase (measured by output per hour, not total output). Iceland's 2015–2019 trial — the largest of its kind — found sustained or improved productivity in most sectors. The mechanism is plausible: cognitive fatigue reduces output quality; recovery time improves focus..." },
  { label: "Your Verdict", q: "Based only on evidence you trust — do you think 4-day work weeks are beneficial? State your position, the two strongest pieces of evidence for it, and one significant counterargument you genuinely cannot dismiss.", ph: "e.g., My position: likely beneficial in knowledge-work sectors, with important caveats. Evidence for: (1) Iceland trial — large scale, government-coordinated, found sustained productivity. (2) Reduced burnout is well-documented in the literature, and burnout has measurable productivity costs. Counterargument I can't dismiss: manufacturing and client-service sectors face genuine output constraints that hourly workers can't absorb without overtime pay shifts — the research on these sectors is weaker..." },
];

// ─── Clear Thinking Tab ────────────────────────────────────────────────────────
function ClearThinkingTab() {
  const [activeLesson, setActiveLesson] = useState<CTLessonId | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [activeModule, setActiveModule] = useState<1 | 2>(1);
  const { addXP } = usePersonalization();

  // L1 state — segmented
  const [ct1Seg, setCt1Seg] = useState(0);

  // L2 state — fallacy explorer + identifier game
  const [activeFallacy, setActiveFallacy] = useState<string | null>(null);
  const [gameStatement, setGameStatement] = useState("");
  const [gameResult, setGameResult] = useState("");
  const [gameLoading, setGameLoading] = useState(false);
  const [selectedGuess, setSelectedGuess] = useState<string | null>(null);

  // L3 state — evidence ranking
  const [ranked, setRanked] = useState<string[]>([]);
  const [rankRevealed, setRankRevealed] = useState(false);
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceResult, setSourceResult] = useState("");
  const [sourceLoading, setSourceLoading] = useState(false);

  // L4 state — bias self-assessment
  const [activeBias, setActiveBias] = useState<string | null>(null);
  const [biasReflections, setBiasReflections] = useState<Record<string, string>>({});
  const [savedBiasReflections, setSavedBiasReflections] = useState<Set<string>>(new Set());

  // L5 capstone state
  const [ctStep, setCtStep] = useState(0);
  const [ctAnswers, setCtAnswers] = useState(["", "", ""]);
  const [ctDone, setCtDone] = useState(false);
  const [errorChecks, setErrorChecks] = useState<Record<string, boolean>>({});

  const analyzeMutation = trpc.ai.explainConcept.useMutation({
    onSuccess: (data) => { setGameResult(data.explanation); setGameLoading(false); },
    onError: (err: { message: string }) => { toast.error(err.message); setGameLoading(false); },
  });

  const sourceMutation = trpc.ai.explainConcept.useMutation({
    onSuccess: (data) => { setSourceResult(data.explanation); setSourceLoading(false); },
    onError: (err: { message: string }) => { toast.error(err.message); setSourceLoading(false); },
  });

  const handleCTComplete = (id: CTLessonId) => {
    if (completedLessons.has(id)) return;
    const meta = CT_LESSON_META.find((l) => l.id === id)!;
    setCompletedLessons((prev) => new Set(Array.from(prev).concat(id)));
    addXP(meta.xp);
    toast.success(`+${meta.xp} XP — Lesson complete!`);
  };

  const handleAnalyzeFallacy = () => {
    if (!gameStatement.trim()) { toast.error("Enter a statement first."); return; }
    setGameLoading(true); setGameResult(""); setSelectedGuess(null);
    analyzeMutation.mutate({
      concept: `Analyze this statement for logical fallacies: "${gameStatement}". Identify any fallacies present (or confirm it's a sound argument). Name each fallacy, quote the exact part of the statement that contains it, and briefly explain why it qualifies. Be direct and educational.`,
      level: "student",
    });
  };

  const handleSourceCheck = () => {
    if (!sourceUrl.trim()) { toast.error("Paste a claim or URL first."); return; }
    setSourceLoading(true); setSourceResult("");
    sourceMutation.mutate({
      concept: `Evaluate the credibility of this source or claim: "${sourceUrl}". Apply the SIFT method (Stop, Investigate the source, Find better coverage, Trace claims). Rate its credibility (High / Medium / Low / Unknown) and explain what signals you used to reach that judgment. Be specific and educational.`,
      level: "student",
    });
  };

  const overallPct = Math.round((completedLessons.size / CT_LESSON_META.length) * 100);

  const ct1Segments = [
    {
      title: "Claims, Evidence & Inference",
      narration: "Every argument — whether it's a news headline, a friend's opinion, or a policy debate — has the same three parts: a claim, evidence, and an inference. Learning to spot all three is the foundation of clear thinking.",
      body: (
        <div className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground leading-relaxed">An argument is not a fight. It is a structured attempt to show that a <strong className="text-foreground">claim</strong> is true, supported by <strong className="text-foreground">evidence</strong>, connected by <strong className="text-foreground">inference</strong>.</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Claim", def: "What you're asserting is true.", ex: "\"Regular exercise improves mood.\"", color: "oklch(0.72_0.2_260)", icon: <Target size={18} /> },
              { label: "Evidence", def: "The support for the claim — data, studies, observations.", ex: "\"A meta-analysis of 49 RCTs found exercise reduces depression symptoms.\"", color: "oklch(0.72_0.18_150)", icon: <FlaskConical size={18} /> },
              { label: "Inference", def: "The logical bridge from evidence to claim.", ex: "\"Since the evidence shows reduced symptoms, the claim about mood is supported.\"", color: "oklch(0.78_0.16_30)", icon: <ArrowRight size={18} /> },
            ].map(({ label, def, ex, color, icon }) => (
              <div key={label} className="glass rounded-xl p-4 border border-white/8">
                <div className="flex items-center gap-2 mb-2" style={{ color }}>{icon}<span className="font-bold text-sm">{label}</span></div>
                <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{def}</p>
                <div className="text-xs italic text-foreground/70 leading-relaxed border-l-2 pl-2" style={{ borderColor: color }}>{ex}</div>
              </div>
            ))}
          </div>
          <div className="glass rounded-xl p-4 border border-white/10">
            <div className="flex items-start gap-2"><Info size={13} className="text-[oklch(0.72_0.2_260)] mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground"><strong className="text-foreground">Key insight:</strong> A claim can sound like evidence ("studies show...") but still require you to ask: which studies? How rigorous? What did they actually measure? The structure of an argument is just the starting point — quality of evidence is where critical thinking begins.</p>
            </div>
          </div>
        </div>
      ),
      topics: ["What makes a claim falsifiable", "The difference between deductive and inductive reasoning", "How to identify hidden premises in an argument", "What 'burden of proof' actually means"],
    },
    {
      title: "Valid vs. Sound Arguments",
      narration: "An argument can be perfectly logical in structure and still lead you to a false conclusion. Validity and soundness are different — and confusing them is one of the most common reasoning errors people make.",
      body: (
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Valid", color: "oklch(0.78_0.16_30)", desc: "The conclusion follows logically from the premises — IF the premises were true, the conclusion must be true.", example: "All cats are reptiles. (False)\nMy pet is a cat. (True)\n∴ My pet is a reptile. (Logically valid — but unsound!)", verdict: "Valid but NOT sound" },
              { label: "Sound", color: "oklch(0.72_0.18_150)", desc: "Valid structure AND true premises. Both requirements must be met for an argument to be genuinely convincing.", example: "All mammals have hearts. (True)\nDogs are mammals. (True)\n∴ Dogs have hearts. (True)", verdict: "Valid AND sound" },
            ].map(({ label, color, desc, example, verdict }) => (
              <div key={label} className="glass rounded-xl p-4 border border-white/8 space-y-2">
                <div className="text-sm font-bold" style={{ color }}>{label}</div>
                <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                <div className="font-mono text-xs text-foreground/70 bg-white/3 rounded-lg p-3 whitespace-pre leading-relaxed">{example}</div>
                <div className="text-xs font-semibold" style={{ color }}>{verdict}</div>
              </div>
            ))}
          </div>
          <div className="glass rounded-xl p-4 border border-white/10">
            <div className="flex items-start gap-2"><AlertTriangle size={13} className="text-[oklch(0.78_0.16_30)] mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground"><strong className="text-foreground">Why this matters:</strong> Propaganda and misinformation often use valid logical structures with false premises. The argument sounds airtight — but only if you never question the starting assumptions. Always examine the premises, not just the logic.</p>
            </div>
          </div>
        </div>
      ),
      topics: ["What a syllogism is and why it matters", "How to spot false premises disguised as facts", "The difference between correlation and causation in arguments", "How to construct a deductively valid argument"],
    },
    {
      title: "Spotting Arguments in the Wild",
      narration: "Arguments don't announce themselves. They show up in news articles, social media posts, conversations, and product marketing — often dressed as facts. The skill is learning to pause and ask: is this an argument or just an assertion?",
      body: (
        <div className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground leading-relaxed">An <strong className="text-foreground">assertion</strong> is a statement made without support. An <strong className="text-foreground">argument</strong> attempts to provide reasons. In everyday discourse, the two are constantly confused.</p>
          <div className="space-y-3">
            {[
              { type: "Assertion", text: "\"Social media is destroying young people's mental health.\"", verdict: "No evidence, no inference — this is a claim presented as established fact.", color: "oklch(0.68_0.22_20)" },
              { type: "Weak Argument", text: "\"Social media is harmful because I can see teenagers are unhappy and they're all on their phones.\"", verdict: "Has a reason, but it's anecdotal and conflates correlation with causation.", color: "oklch(0.78_0.16_30)" },
              { type: "Proper Argument", text: "\"A 2022 systematic review of 72 studies found significant associations between heavy social media use and depression in adolescents, though the effect size varies by platform and usage type.\"", verdict: "Cites specific evidence, acknowledges nuance, and draws a proportionate conclusion.", color: "oklch(0.72_0.18_150)" },
            ].map(({ type, text, verdict, color }) => (
              <div key={type} className="glass rounded-xl p-4 border border-white/8">
                <div className="text-xs font-semibold mb-2" style={{ color }}>{type}</div>
                <p className="text-sm text-foreground italic mb-2">{text}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{verdict}</p>
              </div>
            ))}
          </div>
        </div>
      ),
      topics: ["What indicator words signal conclusions vs. premises", "How to diagram a complex argument", "Why appeals to emotion aren't inherently fallacious", "The difference between an argument and an explanation"],
    },
  ];

  function CTLessonShell({ id, children }: { id: CTLessonId; children: React.ReactNode }) {
    const meta = CT_LESSON_META.find((l) => l.id === id)!;
    const done = completedLessons.has(id);
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
        <button onClick={() => setActiveLesson(null)} className="flex items-center gap-1.5 mb-5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={14} /> Back to all lessons
        </button>
        <div className="glass rounded-2xl p-5 border border-white/8 mb-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Clear Thinking · Module 1 · The Architecture of an Argument</div>
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
            : <motion.button onClick={() => handleCTComplete(id)} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 text-black"
                style={{ background: `linear-gradient(to right, ${meta.color}, oklch(0.72_0.18_150))` }}>
                <CheckCircle2 size={15} /> Mark Complete & Earn {meta.xp} XP
              </motion.button>
          }
        </div>
        {id !== "ct5" && (
          <div className="mt-4 flex justify-end">
            <button onClick={() => { const ids: CTLessonId[] = ["ct1","ct2","ct3","ct4","ct5"]; const idx = ids.indexOf(id); setActiveLesson(ids[idx + 1]); }}
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

      {/* ── Lesson 1: What Makes an Argument? ── */}
      {activeLesson === "ct1" && (
        <CTLessonShell key="ct1" id="ct1">
          <div className="space-y-4">
            {/* Segment tabs */}
            <div className="flex gap-2">
              {ct1Segments.map((s, i) => (
                <button key={i} onClick={() => setCt1Seg(i)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all border ${
                    ct1Seg === i ? "bg-[oklch(0.72_0.2_260_/_0.15)] border-[oklch(0.72_0.2_260_/_0.4)] text-[oklch(0.82_0.2_260)]" : "glass border-white/8 text-muted-foreground"
                  }`}>{i + 1}. {s.title}</button>
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={ct1Seg} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                className="glass rounded-2xl p-6 border border-white/8">
                <h3 className="font-semibold text-foreground mb-3">{ct1Segments[ct1Seg].title}</h3>
                <Narrator text={ct1Segments[ct1Seg].narration} />
                {ct1Segments[ct1Seg].body}
                <SegmentFooter
                  accentColor="oklch(0.72_0.2_260)"
                  onReady={ct1Seg < ct1Segments.length - 1 ? () => setCt1Seg(ct1Seg + 1) : undefined}
                  topics={ct1Segments[ct1Seg].topics}
                />
              </motion.div>
            </AnimatePresence>
            <div className="flex justify-between">
              <button onClick={() => setCt1Seg(Math.max(0, ct1Seg - 1))} disabled={ct1Seg === 0}
                className="flex items-center gap-1 px-4 py-2 rounded-lg glass border border-white/8 text-sm text-muted-foreground disabled:opacity-40">
                <ChevronLeft size={13} /> Previous
              </button>
              {ct1Seg < ct1Segments.length - 1 && (
                <button onClick={() => setCt1Seg(ct1Seg + 1)}
                  className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[oklch(0.72_0.2_260_/_0.15)] border border-[oklch(0.72_0.2_260_/_0.3)] text-sm text-[oklch(0.82_0.2_260)]">
                  Next <ChevronRight size={13} />
                </button>
              )}
            </div>
            <div className="glass rounded-2xl p-5 border border-white/8">
              <h4 className="font-semibold text-foreground mb-3">Knowledge Check</h4>
              <QuizBlock questions={CT_QUIZ_L1} accentColor="oklch(0.72_0.2_260)" />
            </div>
          </div>
        </CTLessonShell>
      )}

      {/* ── Lesson 2: Logical Fallacies ── */}
      {activeLesson === "ct2" && (
        <CTLessonShell key="ct2" id="ct2">
          <div className="space-y-5">
            <div className="glass rounded-2xl p-6 border border-white/8">
              <Narrator text="A logical fallacy is a flaw in reasoning that makes an argument invalid — even when the conclusion might happen to be true. Learning to name fallacies gives you the vocabulary to dismantle bad arguments without losing your temper." />
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: "Attack the person", name: "Ad Hominem", icon: <Users size={14} /> },
                  { label: "Misrepresent position", name: "Straw Man", icon: <Flame size={14} /> },
                  { label: "Only two options", name: "False Dilemma", icon: <Scale size={14} /> },
                  { label: "Popular = true", name: "Bandwagon", icon: <TrendingUp size={14} /> },
                ].map(({ label, name, icon }) => (
                  <div key={name} className="glass rounded-xl p-3 border border-white/8 text-center">
                    <div className="flex justify-center mb-1.5 text-[oklch(0.68_0.22_20)]">{icon}</div>
                    <div className="text-xs font-semibold text-foreground">{name}</div>
                    <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
              <SegmentFooter accentColor="oklch(0.68_0.22_20)"
                topics={["Why fallacies can still lead to true conclusions", "The difference between informal and formal fallacies", "How to respond to a fallacy without sounding condescending", "Why ad hominem is sometimes relevant (character witnesses)"]} />
            </div>

            {/* Fallacy explorer */}
            <div className="text-sm font-semibold text-foreground">Click any fallacy to study it in depth:</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FALLACIES.map((f) => (
                <button key={f.id} onClick={() => setActiveFallacy(activeFallacy === f.id ? null : f.id)}
                  className={`py-2.5 px-3 rounded-xl text-xs font-medium transition-all border text-left ${
                    activeFallacy === f.id
                      ? "bg-[oklch(0.68_0.22_20_/_0.15)] border-[oklch(0.68_0.22_20_/_0.4)] text-[oklch(0.78_0.22_20)]"
                      : "glass border-white/8 text-muted-foreground hover:border-white/20"
                  }`}>{f.name}</button>
              ))}
            </div>

            <AnimatePresence>
              {activeFallacy && (() => {
                const f = FALLACIES.find((x) => x.id === activeFallacy)!;
                return (
                  <motion.div key={activeFallacy} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
                    className="glass rounded-2xl p-6 border border-[oklch(0.68_0.22_20_/_0.3)] space-y-3">
                    <h3 className="font-bold text-foreground text-lg">{f.name}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.definition}</p>
                    <div className="glass rounded-xl p-4 border border-[oklch(0.68_0.22_20_/_0.2)]">
                      <div className="text-xs font-semibold text-[oklch(0.68_0.22_20)] mb-2">EXAMPLE</div>
                      <p className="text-sm text-foreground italic leading-relaxed">{f.example}</p>
                    </div>
                    <div className="glass rounded-xl p-4 border border-[oklch(0.72_0.18_150_/_0.2)]">
                      <div className="text-xs font-semibold text-[oklch(0.72_0.18_150)] mb-2">HOW TO RESPOND</div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{f.rebuttal}</p>
                    </div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>

            {/* Live fallacy detector */}
            <div className="glass rounded-2xl p-5 border border-[oklch(0.68_0.22_20_/_0.2)]">
              <div className="text-xs font-semibold text-[oklch(0.68_0.22_20)] mb-1">FALLACY DETECTOR</div>
              <p className="text-xs text-muted-foreground mb-3">Paste any argument, headline, or statement. The AI will identify any fallacies present.</p>
              <textarea value={gameStatement} onChange={(e) => setGameStatement(e.target.value)}
                placeholder="e.g., 'You can't criticize the government's climate policy — you drive a car.'"
                rows={3} className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[oklch(0.68_0.22_20_/_0.5)] resize-none mb-3" />
              <motion.button onClick={handleAnalyzeFallacy} disabled={gameLoading || !gameStatement.trim()}
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                style={{ background: "oklch(0.68_0.22_20)" }}>
                {gameLoading ? <><RefreshCw size={13} className="animate-spin" /> Analyzing…</> : <><Search size={13} /> Detect Fallacies</>}
              </motion.button>
              <AnimatePresence>
                {gameResult && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 rounded-xl bg-[oklch(0.68_0.22_20_/_0.08)] border border-[oklch(0.68_0.22_20_/_0.25)]">
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{gameResult}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="glass rounded-2xl p-5 border border-white/8">
              <h4 className="font-semibold text-foreground mb-3">Knowledge Check</h4>
              <QuizBlock questions={CT_QUIZ_L2} accentColor="oklch(0.68_0.22_20)" />
            </div>
          </div>
        </CTLessonShell>
      )}

      {/* ── Lesson 3: Evidence & Sources ── */}
      {activeLesson === "ct3" && (
        <CTLessonShell key="ct3" id="ct3">
          <div className="space-y-5">
            <div className="glass rounded-2xl p-6 border border-white/8">
              <Narrator text="The quality of an argument is only as good as its evidence. Not all evidence is created equal. A personal story and a randomized controlled trial can both support the same claim — but they carry very different weight." />
              <div className="mt-4 space-y-2">
                {EVIDENCE_ITEMS.map((ev) => (
                  <div key={ev.id} className="glass rounded-xl p-4 border border-white/8 flex items-center gap-4">
                    <div className="flex gap-1 shrink-0">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className={`w-2.5 h-6 rounded-sm ${i < ev.strength ? "bg-[oklch(0.72_0.18_150)]" : "bg-white/10"}`} />
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground">{ev.label}</div>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{ev.description}</p>
                    </div>
                    <div className="shrink-0 text-xs font-bold text-[oklch(0.72_0.18_150)]">{ev.strength}/5</div>
                  </div>
                ))}
              </div>
              <SegmentFooter accentColor="oklch(0.72_0.18_150)"
                topics={["What makes an RCT more reliable than an observational study", "Why meta-analyses can still be flawed", "How publication bias distorts scientific literature", "What 'peer review' actually means — and its limits"]} />
            </div>

            {/* Ranking game */}
            <div className="glass rounded-2xl p-5 border border-[oklch(0.72_0.18_150_/_0.2)]">
              <div className="text-xs font-semibold text-[oklch(0.72_0.18_150)] mb-1">RANKING CHALLENGE</div>
              <p className="text-xs text-muted-foreground mb-4">Rank these five evidence types from strongest (1) to weakest (5) — tap in order.</p>
              {!rankRevealed ? (
                <>
                  <div className="space-y-2 mb-4">
                    {EVIDENCE_ITEMS.map((ev) => {
                      const pos = ranked.indexOf(ev.id);
                      return (
                        <button key={ev.id} onClick={() => {
                          if (pos >= 0) setRanked(ranked.filter((r) => r !== ev.id));
                          else if (ranked.length < 5) setRanked([...ranked, ev.id]);
                        }}
                          className={`w-full flex items-center gap-3 p-3 rounded-xl text-sm border transition-all text-left ${
                            pos >= 0
                              ? "bg-[oklch(0.72_0.18_150_/_0.15)] border-[oklch(0.72_0.18_150_/_0.4)] text-foreground"
                              : "glass border-white/8 text-muted-foreground hover:border-white/20"
                          }`}>
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border ${
                            pos >= 0 ? "bg-[oklch(0.72_0.18_150)] border-[oklch(0.72_0.18_150)] text-white" : "border-white/20 text-muted-foreground"
                          }`}>{pos >= 0 ? pos + 1 : ""}</span>
                          <span className="flex-1">{ev.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-3">
                    <motion.button onClick={() => setRankRevealed(true)} disabled={ranked.length < 5}
                      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                      className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-medium text-black disabled:opacity-40"
                      style={{ background: "linear-gradient(to right, oklch(0.72_0.18_150), oklch(0.72_0.2_260))" }}>
                      <CheckCircle2 size={13} /> Reveal answer
                    </motion.button>
                    {ranked.length > 0 && (
                      <button onClick={() => setRanked([])} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Reset</button>
                    )}
                  </div>
                </>
              ) : (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                  {EVIDENCE_ITEMS.slice().sort((a, b) => b.strength - a.strength).map((ev, i) => {
                    const userPos = ranked.indexOf(ev.id);
                    const correct = userPos === i;
                    return (
                      <div key={ev.id} className={`flex items-center gap-3 p-3 rounded-xl border text-sm ${
                        correct ? "bg-[oklch(0.72_0.18_150_/_0.1)] border-[oklch(0.72_0.18_150_/_0.3)] text-foreground" : "glass border-white/8 text-muted-foreground"
                      }`}>
                        <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-[oklch(0.72_0.18_150)] text-white">{i + 1}</span>
                        <span className="flex-1">{ev.label}</span>
                        {correct ? <CheckCircle2 size={13} className="text-[oklch(0.72_0.18_150)] shrink-0" /> : <span className="text-xs text-muted-foreground shrink-0">You ranked: {userPos + 1}</span>}
                      </div>
                    );
                  })}
                  <button onClick={() => { setRanked([]); setRankRevealed(false); }} className="text-xs text-muted-foreground hover:text-foreground transition-colors mt-2">Try again</button>
                </motion.div>
              )}
            </div>

            {/* Live source evaluator */}
            <div className="glass rounded-2xl p-5 border border-[oklch(0.72_0.18_150_/_0.2)]">
              <div className="text-xs font-semibold text-[oklch(0.72_0.18_150)] mb-1">SOURCE EVALUATOR</div>
              <p className="text-xs text-muted-foreground mb-3">Paste a claim, headline, or URL. Get a credibility analysis using the SIFT method.</p>
              <div className="flex gap-2">
                <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSourceCheck()}
                  placeholder="e.g., 'Scientists say coffee prevents cancer' or paste a URL…"
                  className="flex-1 bg-white/3 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[oklch(0.72_0.18_150_/_0.5)] transition-colors" />
                <motion.button onClick={handleSourceCheck} disabled={sourceLoading || !sourceUrl.trim()}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                  style={{ background: "oklch(0.72_0.18_150)" }}>
                  {sourceLoading ? <><RefreshCw size={13} className="animate-spin" /> Checking…</> : <><Search size={13} /> Evaluate</>}
                </motion.button>
              </div>
              <AnimatePresence>
                {sourceResult && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 rounded-xl bg-[oklch(0.72_0.18_150_/_0.08)] border border-[oklch(0.72_0.18_150_/_0.2)]">
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{sourceResult}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="glass rounded-2xl p-5 border border-white/8">
              <h4 className="font-semibold text-foreground mb-3">Knowledge Check</h4>
              <QuizBlock questions={CT_QUIZ_L3} accentColor="oklch(0.72_0.18_150)" />
            </div>
          </div>
        </CTLessonShell>
      )}

      {/* ── Lesson 4: Cognitive Biases ── */}
      {activeLesson === "ct4" && (
        <CTLessonShell key="ct4" id="ct4">
          <div className="space-y-5">
            <div className="glass rounded-2xl p-6 border border-white/8">
              <Narrator text="Cognitive biases are systematic errors in thinking that affect everyone — regardless of intelligence. They aren't character flaws, they are features of how the human brain processes information efficiently. Understanding them is the first step to overriding them when it counts." />
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { label: "Social", d: "Biases from group dynamics", icon: <Users size={16} className="text-[oklch(0.72_0.2_260)]" /> },
                  { label: "Memory", d: "Biases in what we remember", icon: <Brain size={16} className="text-[oklch(0.78_0.16_30)]" /> },
                  { label: "Decision", d: "Biases in how we choose", icon: <Scale size={16} className="text-[oklch(0.72_0.18_150)]" /> },
                ].map(({ label, d, icon }) => (
                  <div key={label} className="glass rounded-xl p-3 border border-white/8 text-center">
                    <div className="flex justify-center mb-2">{icon}</div>
                    <div className="text-xs font-semibold text-foreground">{label}</div>
                    <p className="text-xs text-muted-foreground mt-1 leading-snug">{d}</p>
                  </div>
                ))}
              </div>
              <SegmentFooter accentColor="oklch(0.78_0.16_30)"
                topics={["Why intelligent people are just as biased as everyone else", "What System 1 vs System 2 thinking means", "How biases interact and amplify each other", "Whether cognitive biases can actually be eliminated"]} />
            </div>

            <div className="text-sm font-medium text-foreground">Select a bias to explore it — and reflect on when it's affected you:</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {BIASES.map((b) => (
                <button key={b.id} onClick={() => setActiveBias(activeBias === b.id ? null : b.id)}
                  className={`py-3 px-4 rounded-xl text-sm font-medium transition-all border text-left ${
                    activeBias === b.id
                      ? "bg-[oklch(0.78_0.16_30_/_0.15)] border-[oklch(0.78_0.16_30_/_0.4)] text-[oklch(0.88_0.16_30)]"
                      : "glass border-white/8 text-muted-foreground hover:border-white/20"
                  }`}>{b.name}</button>
              ))}
            </div>

            <AnimatePresence>
              {activeBias && (() => {
                const b = BIASES.find((x) => x.id === activeBias)!;
                const saved = savedBiasReflections.has(b.id);
                return (
                  <motion.div key={activeBias} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="glass rounded-2xl p-6 border border-[oklch(0.78_0.16_30_/_0.3)] space-y-4">
                    <h3 className="font-bold text-foreground text-lg">{b.name}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{b.definition}</p>
                    <div className="glass rounded-xl p-4 border border-[oklch(0.78_0.16_30_/_0.2)]">
                      <div className="text-xs font-semibold text-[oklch(0.78_0.16_30)] mb-2">REAL-WORLD TRIGGER</div>
                      <p className="text-sm text-muted-foreground italic leading-relaxed">{b.trigger}</p>
                    </div>
                    <div className="glass rounded-xl p-4 border border-[oklch(0.72_0.18_150_/_0.2)]">
                      <div className="text-xs font-semibold text-[oklch(0.72_0.18_150)] mb-2">ANTIDOTE</div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{b.antidote}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-foreground mb-2 block">Has this bias affected a decision you've made? Describe it briefly:</label>
                      <textarea value={biasReflections[b.id] ?? ""} onChange={(e) => setBiasReflections((prev) => ({ ...prev, [b.id]: e.target.value }))}
                        placeholder="Think of a specific moment — a purchase, an opinion you held, a conflict…"
                        rows={3} className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[oklch(0.78_0.16_30_/_0.5)] resize-none" />
                      {!saved
                        ? <button onClick={() => { if (!(biasReflections[b.id] ?? "").trim()) { toast.error("Write something first."); return; } setSavedBiasReflections((prev) => new Set(Array.from(prev).concat(b.id))); addXP(5); toast.success("+5 XP — reflection saved!"); }}
                            className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[oklch(0.78_0.16_30_/_0.2)] border border-[oklch(0.78_0.16_30_/_0.3)] text-sm text-[oklch(0.88_0.16_30)]">
                            <Check size={13} /> Save Reflection
                          </button>
                        : <p className="mt-2 text-xs text-[oklch(0.72_0.18_150)] flex items-center gap-1"><CheckCircle2 size={11} /> Saved — +5 XP</p>
                      }
                    </div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>

            <div className="glass rounded-2xl p-5 border border-white/8">
              <h4 className="font-semibold text-foreground mb-3">Knowledge Check</h4>
              <QuizBlock questions={CT_QUIZ_L4} accentColor="oklch(0.78_0.16_30)" />
            </div>
          </div>
        </CTLessonShell>
      )}

      {/* ── Lesson 5: Capstone ── */}
      {activeLesson === "ct5" && (
        <CTLessonShell key="ct5" id="ct5">
          <div className="space-y-5">
            {completedLessons.size < 4 && (
              <div className="glass rounded-xl p-5 border border-[oklch(0.75_0.18_55_/_0.3)]">
                <div className="flex items-start gap-3">
                  <Lock size={16} className="text-[oklch(0.75_0.18_55)] mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Complete Earlier Lessons First</h4>
                    <p className="text-sm text-muted-foreground">Completed {completedLessons.size}/4 lessons. The capstone requires all four skills working together.</p>
                    <div className="flex gap-1 mt-2">
                      {(["ct1","ct2","ct3","ct4"] as CTLessonId[]).map((id) => (
                        <div key={id} className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold border ${
                          completedLessons.has(id) ? "bg-[oklch(0.72_0.18_150_/_0.2)] border-[oklch(0.72_0.18_150_/_0.4)] text-[oklch(0.72_0.18_150)]" : "glass border-white/10 text-muted-foreground"
                        }`}>{completedLessons.has(id) ? <Check size={12} /> : id.replace("ct","")}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="glass rounded-2xl p-6 border border-white/8">
              <Narrator text="This capstone puts all four skills to work on a single flawed argument. You'll identify the errors, construct the strongest possible version of the argument, then deliver your own reasoned verdict." />
              <div className="mt-4 glass rounded-xl p-5 border border-white/10">
                <div className="text-xs font-semibold text-[oklch(0.75_0.18_55)] mb-2">{CT_ARG_FLAWED.title.toUpperCase()}</div>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap italic">{CT_ARG_FLAWED.text}</p>
              </div>
            </div>

            {/* Error checklist — interactive pre-work for step 1 */}
            {ctStep === 0 && (
              <div className="glass rounded-2xl p-5 border border-white/8">
                <div className="text-xs font-semibold text-foreground mb-3">QUICK SCAN — Check any errors you can already spot before writing:</div>
                <div className="space-y-2">
                  {CT_ARG_FLAWED.errors.map((e) => (
                    <label key={e.id} className="flex items-start gap-3 cursor-pointer">
                      <div onClick={() => setErrorChecks((prev) => ({ ...prev, [e.id]: !prev[e.id] }))}
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                          errorChecks[e.id] ? "bg-[oklch(0.75_0.18_55)] border-[oklch(0.75_0.18_55)]" : "border-white/20"
                        }`}>
                        {errorChecks[e.id] && <Check size={11} className="text-white" />}
                      </div>
                      <div>
                        <div className={`text-sm font-medium ${errorChecks[e.id] ? "text-foreground" : "text-muted-foreground"}`}>{e.label}</div>
                        {errorChecks[e.id] && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{e.explanation}</p>}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {CT_CAPSTONE_STEPS.map((p, i) => (
                <button key={i} onClick={() => setCtStep(i)}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all border text-center ${
                    ctStep === i ? "bg-[oklch(0.75_0.18_55_/_0.15)] border-[oklch(0.75_0.18_55_/_0.4)] text-[oklch(0.85_0.18_55)]" : "glass border-white/8 text-muted-foreground"
                  }`}>
                  {p.label} {ctAnswers[i].length > 20 && <CheckCircle2 size={11} className="inline text-[oklch(0.72_0.18_150)]" />}
                </button>
              ))}
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={ctStep} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                className="glass rounded-2xl p-6 border border-[oklch(0.75_0.18_55_/_0.15)]">
                <div className="text-xs font-semibold text-[oklch(0.75_0.18_55)] mb-3">CAPSTONE — {CT_CAPSTONE_STEPS[ctStep].label.toUpperCase()}</div>
                <p className="text-sm font-medium text-foreground mb-4 leading-snug">{CT_CAPSTONE_STEPS[ctStep].q}</p>
                <textarea value={ctAnswers[ctStep]}
                  onChange={(e) => { const u = [...ctAnswers]; u[ctStep] = e.target.value; setCtAnswers(u); }}
                  placeholder={CT_CAPSTONE_STEPS[ctStep].ph} rows={7}
                  className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[oklch(0.75_0.18_55_/_0.5)] resize-none leading-relaxed" />
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-muted-foreground">{ctAnswers[ctStep].length} chars</span>
                  <div className="flex gap-2">
                    {ctStep > 0 && (
                      <button onClick={() => setCtStep(ctStep - 1)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg glass border border-white/8 text-xs text-muted-foreground">
                        <ChevronLeft size={12} /> Previous
                      </button>
                    )}
                    {ctStep < CT_CAPSTONE_STEPS.length - 1
                      ? <button onClick={() => setCtStep(ctStep + 1)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[oklch(0.75_0.18_55_/_0.2)] border border-[oklch(0.75_0.18_55_/_0.3)] text-xs text-[oklch(0.85_0.18_55)]">
                          Next <ChevronRight size={12} />
                        </button>
                      : !ctDone && (
                          <motion.button
                            onClick={() => {
                              if (ctAnswers.filter((a) => a.length > 20).length < 3) { toast.error(`Complete all 3 parts (${ctAnswers.filter((a) => a.length > 20).length}/3 done).`); return; }
                              setCtDone(true); handleCTComplete("ct5"); toast.success("Module 1 complete!");
                            }}
                            whileHover={{ scale: 1.02 }}
                            className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-black text-xs font-semibold"
                            style={{ background: "linear-gradient(to right, oklch(0.75_0.18_55), oklch(0.72_0.2_260))" }}>
                            <Trophy size={12} /> Submit
                          </motion.button>
                        )
                    }
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
            {ctDone && (
              <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                className="glass rounded-2xl p-8 border border-[oklch(0.75_0.18_55_/_0.3)] text-center">
                <Lightbulb size={40} className="mx-auto mb-3 text-[oklch(0.75_0.18_55)]" />
                <h3 className="text-2xl font-bold text-foreground mb-2">Module 1 Complete!</h3>
                <p className="text-muted-foreground mb-4 max-w-lg mx-auto">You have earned your <strong className="text-foreground">Clear Thinking Certificate — Module 1</strong>.</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {["Argument Analysis", "Fallacy Spotter", "Evidence Ranker", "Bias Aware", "Capstone"].map((b) => (
                    <span key={b} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[oklch(0.75_0.18_55_/_0.12)] border border-[oklch(0.75_0.18_55_/_0.3)] text-[oklch(0.85_0.18_55)]">
                      <CheckCircle2 size={11} className="inline mr-1" />{b}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </CTLessonShell>
      )}
    </AnimatePresence>
  );

  // ── Module switcher + overview ──
  if (activeModule === 2) {
    return <ClearThinkingModule2 onBack={() => setActiveModule(1)} />;
  }

  return (
    <div className="space-y-4">
      {/* Module switcher */}
      <div className="flex gap-2 p-1 glass rounded-xl border border-white/8">
        {([{ n: 1, label: "Module 1", sub: "The Architecture of an Argument" }, { n: 2, label: "Module 2", sub: "Thinking in Real Life" }] as const).map(({ n, label, sub }) => (
          <button key={n} onClick={() => setActiveModule(n)}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm transition-all text-left ${ activeModule === n ? "bg-[oklch(0.72_0.2_260_/_0.15)] text-[oklch(0.82_0.2_260)] font-semibold" : "text-muted-foreground hover:text-foreground" }`}>
            <div className="font-medium">{label}</div>
            <div className="text-xs opacity-70 mt-0.5">{sub}</div>
          </button>
        ))}
      </div>

      <div className="glass rounded-2xl p-6 border border-[oklch(0.72_0.2_260_/_0.2)]">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[oklch(0.72_0.2_260_/_0.15)] text-[oklch(0.82_0.2_260)] border border-[oklch(0.72_0.2_260_/_0.3)]">Clear Thinking</span>
              <span className="px-2.5 py-1 rounded-full text-xs bg-white/5 border border-white/10 text-muted-foreground">Beginner · ~2 hrs · 340 XP</span>
            </div>
            <h3 className="text-lg font-bold text-foreground">Module 1: The Architecture of an Argument</h3>
            <p className="text-sm text-muted-foreground">Arguments, fallacies, evidence, and the biases that trip us all up</p>
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
        {CT_LESSON_META.map((lesson, i) => {
          const done = completedLessons.has(lesson.id);
          return (
            <motion.div key={lesson.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`glass rounded-2xl border overflow-hidden transition-all ${done ? "border-[oklch(0.72_0.18_150_/_0.3)]" : "border-white/8 hover:border-white/15"}`}>
              <button onClick={() => setActiveLesson(lesson.id)} className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/3 transition-colors">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
                  style={{ background: `color-mix(in oklch, ${lesson.color} 15%, transparent)`, border: `1px solid color-mix(in oklch, ${lesson.color} 30%, transparent)`, color: lesson.color }}>
                  {i + 1}
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
          <Scale size={15} className="text-[oklch(0.72_0.2_260)] mt-0.5 shrink-0" />
          <div>
            <h4 className="font-semibold text-foreground mb-1 text-sm">What you will be able to do after Module 1</h4>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[
                { n: "Argument Analysis", d: "Identify claim, evidence, and inference in any text" },
                { n: "Fallacy Detection", d: "Name and counter 8 common logical fallacies" },
                { n: "Evidence Evaluation", d: "Rank sources by reliability and spot weak evidence" },
                { n: "Bias Awareness", d: "Recognize 6 biases in your own and others' thinking" },
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

      {/* Module 2 teaser */}
      <motion.button onClick={() => setActiveModule(2)} whileHover={{ scale: 1.005, x: 4 }}
        className="w-full glass rounded-2xl p-5 border border-[oklch(0.72_0.2_290_/_0.25)] hover:border-[oklch(0.72_0.2_290_/_0.5)] transition-all text-left">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[oklch(0.72_0.2_290_/_0.15)] border border-[oklch(0.72_0.2_290_/_0.3)]">
            <ArrowRight size={18} className="text-[oklch(0.82_0.2_290)]" />
          </div>
          <div className="flex-1">
            <div className="text-xs text-[oklch(0.72_0.2_290)] font-semibold mb-0.5">NEXT — MODULE 2</div>
            <div className="font-semibold text-foreground">Thinking in Real Life</div>
            <p className="text-xs text-muted-foreground mt-0.5">Misinformation, statistical traps, persuasion, and decisions under uncertainty · 380 XP</p>
          </div>
          <ChevronRight size={16} className="text-[oklch(0.72_0.2_290)] shrink-0" />
        </div>
      </motion.button>
    </div>
  );
}

// ─── Clear Thinking Module 2 Data ──────────────────────────────────────────────
type CT2LessonId = "ct6" | "ct7" | "ct8" | "ct9" | "ct10";

interface StatTrap {
  id: string;
  title: string;
  misleading: string;
  reveal: string;
  lesson: string;
}

interface PersuasionTechnique {
  id: string;
  name: string;
  definition: string;
  ethical: string;
  manipulative: string;
  signal: string;
}

interface DecisionScenario {
  id: string;
  title: string;
  situation: string;
  options: { label: string; pros: string[]; cons: string[] }[];
  pmPrompt: string; // pre-mortem prompt
}

interface MisInfoVector {
  id: string;
  name: string;
  howItSpreads: string;
  whyItWorks: string;
  counter: string;
}

const CT2_LESSON_META = [
  { id: "ct6" as CT2LessonId, title: "How Misinformation Spreads", subtitle: "Why false beliefs are stickier than true ones — and what to do about it", duration: "25 min", color: "oklch(0.72_0.2_290)", xp: 60 },
  { id: "ct7" as CT2LessonId, title: "Statistical Traps", subtitle: "The numbers that lie without technically lying", duration: "25 min", color: "oklch(0.68_0.22_20)", xp: 65 },
  { id: "ct8" as CT2LessonId, title: "Persuasion vs. Manipulation", subtitle: "Where ethical influence ends and exploitation begins", duration: "25 min", color: "oklch(0.72_0.18_150)", xp: 65 },
  { id: "ct9" as CT2LessonId, title: "Deciding Under Uncertainty", subtitle: "How to make good calls when you can't know for sure", duration: "30 min", color: "oklch(0.75_0.18_55)", xp: 70 },
  { id: "ct10" as CT2LessonId, title: "Capstone: Real-World Case", subtitle: "Apply everything — M1 + M2 — to a live argument you choose", duration: "25 min", color: "oklch(0.78_0.16_30)", xp: 120 },
];

const MISINFO_VECTORS: MisInfoVector[] = [
  { id: "mv1", name: "Emotional Contagion", howItSpreads: "Content that triggers strong emotions (outrage, fear, pride) is shared 6x more often than neutral information, regardless of accuracy.", whyItWorks: "The brain's threat-detection system prioritizes emotional salience over fact-checking. Sharing feels like action — it relieves the emotional charge without requiring verification.", counter: "When you feel a strong urge to share immediately, treat it as a warning sign. Slow down: strong emotion is the misinformation's delivery mechanism." },
  { id: "mv2", name: "The Illusory Truth Effect", howItSpreads: "Repeated exposure to a false claim increases how true it feels — even when people know it's contested. Repetition alone creates a sense of familiarity that the brain interprets as credibility.", whyItWorks: "Processing fluency: when something is easy to recall, the brain shortcut-labels it as 'true.' Misinformation campaigns exploit this deliberately through coordinated repetition.", counter: "Track how many times you've seen a claim, not just whether it feels familiar. Familiarity is not evidence." },
  { id: "mv3", name: "Source Laundering", howItSpreads: "A false claim is seeded in a fringe outlet, picked up by a slightly less fringe outlet, then referenced by a mainstream outlet reporting on 'the controversy' — giving the original claim apparent legitimacy.", whyItWorks: "Audiences see a major outlet's name and stop tracing the origin. The number of citations looks like independent corroboration but is really one claim amplified through a chain.", counter: "Trace claims to their primary source. Ask: what is the original study, quote, or event? How many outlets are reporting this independently versus citing each other?" },
  { id: "mv4", name: "Context Collapse", howItSpreads: "Real images, videos, or quotes are stripped of their original context and reused to support a completely different narrative. The content is technically genuine — the framing is false.", whyItWorks: "People extend trust from verified content to the frame around it. Seeing an actual photo activates 'this is real' processing, which spills over to whatever caption accompanies it.", counter: "Reverse image search photos. Look up quotes in full. The question isn't whether the content is real — it's whether it means what this specific post claims it means." },
];

const STAT_TRAPS: StatTrap[] = [
  { id: "st1", title: "Relative vs. Absolute Risk", misleading: "\"New drug reduces cancer risk by 50%!\"", reveal: "If baseline risk is 2%, a 50% reduction means it drops to 1% — a 1 percentage-point absolute difference. Both statements are technically accurate. The relative number sounds transformative; the absolute number sounds modest.", lesson: "Always ask: 50% of what? Relative numbers without baselines are nearly meaningless for real-world decisions." },
  { id: "st2", title: "Survivorship Bias", misleading: "\"Entrepreneurs who dropped out of college became billionaires — so college isn't worth it.\"", reveal: "We see Gates, Zuckerberg, and Dell. We don't see the millions who also dropped out and failed — they don't make headlines. We're only counting the survivors of a massive selection process.", lesson: "Ask: where is the evidence of people who took the same path and failed? Invisible failures are still data." },
  { id: "st3", title: "Simpson's Paradox", misleading: "\"Treatment A has a higher success rate than Treatment B overall.\"", reveal: "When broken down by severity of condition, Treatment B outperforms Treatment A in every subgroup. The aggregate is misleading because Treatment A was used more often on mild cases, inflating its overall average.", lesson: "Aggregate statistics can reverse when broken into subgroups. Always ask: are the groups being compared truly comparable?" },
  { id: "st4", title: "Cherry-Picked Timeframes", misleading: "\"Violent crime has been rising for three years!\"", reveal: "Violent crime peaked in 1991, fell 50% over 25 years, briefly rose in 2020–22, and remains far below historical highs. Selecting a 3-year window from a 30-year trend is technically accurate but deeply misleading.", lesson: "Zoom out. Three-year trends are almost always less meaningful than 20-year trends. Ask what the full historical context looks like." },
  { id: "st5", title: "Percentage of a Percentage", misleading: "\"Salaries for women grew 15% faster than men's last year!\"", reveal: "If women's median salary grew 3% and men's grew 2.6%, the difference is 0.4 percentage points — a 15% relative difference, but nearly imperceptible in real income.", lesson: "When you see a percentage of a percentage, convert to absolute numbers to feel the real magnitude." },
];

const PERSUASION_TECHNIQUES: PersuasionTechnique[] = [
  { id: "pt1", name: "Social Proof", definition: "Using evidence that others have done or endorsed something to influence a decision.", ethical: "A restaurant showing verified customer reviews so diners can make informed choices.", manipulative: "Faking review counts, astroturfing forums, or presenting a vocal minority as mainstream consensus.", signal: "Ask: are these real, independent endorsements — or manufactured?" },
  { id: "pt2", name: "Scarcity & Urgency", definition: "Creating the impression that time or availability is limited to pressure faster decisions.", ethical: "A genuine sale ending Sunday, communicated clearly with no artificial deadline.", manipulative: "Fake countdown timers, 'Only 2 left!' on infinite-inventory items, manufactured crises.", signal: "Ask: is this deadline real and verifiable — or designed to prevent you from thinking?" },
  { id: "pt3", name: "Authority Signaling", definition: "Invoking credentials, titles, or institutional affiliation to increase persuasive weight.", ethical: "A cardiologist explaining evidence-based guidance on heart disease prevention.", manipulative: "Using scientific language without scientific method, or citing credentials in unrelated domains.", signal: "Ask: is this person an expert in this specific topic — and are they citing evidence or just credentials?" },
  { id: "pt4", name: "Reciprocity", definition: "Giving something first to create a felt obligation to give back.", ethical: "Free educational content that genuinely helps, with a non-coercive offer to purchase more.", manipulative: "Unsolicited 'gifts' paired with high-pressure asks, or manufactured obligation in one-sided relationships.", signal: "Ask: did I request this? Does refusing it make me a bad person — or just someone who said no?" },
  { id: "pt5", name: "Identity Appeals", definition: "Framing a choice as consistent with who the audience believes themselves to be.", ethical: "Connecting environmental action to a genuine sense of community responsibility.", manipulative: "Tribal messaging that equates product choices with political identity, or attacks group belonging to create fear of exclusion.", signal: "Ask: is my reasoning about the actual merits of this — or about who I want to be seen as?" },
];

const CT2_DECISION_SCENARIOS: DecisionScenario[] = [
  {
    id: "ds1",
    title: "The Job Offer",
    situation: "You have a stable job you find tolerable. A startup offers you 30% more pay but no benefits, a 6-month runway, and an equity stake worth a lot if it succeeds. You have a mortgage and young children.",
    options: [
      { label: "Take the startup offer", pros: ["Higher salary now", "Equity upside", "More growth potential"], cons: ["No benefits", "Company may fail in 6 months", "Financial risk with dependents"] },
      { label: "Stay at current job", pros: ["Stability", "Benefits", "Predictable income"], cons: ["Lower ceiling", "Potential regret", "Same tolerable situation"] },
    ],
    pmPrompt: "Assume you took the startup offer and it went badly wrong. It's 18 months from now. What specifically happened? What warning signs did you miss? What would you wish you had done differently?",
  },
  {
    id: "ds2",
    title: "The Medical Treatment",
    situation: "You're diagnosed with a condition. Treatment A has a 70% success rate with mild side effects. Treatment B has an 85% success rate but causes severe side effects in 40% of patients. Without treatment, the condition will worsen over 2 years.",
    options: [
      { label: "Choose Treatment A", pros: ["Lower risk of severe side effects", "Proven track record", "More comfortable recovery"], cons: ["Lower success rate (70%)", "May need to try B anyway if A fails"] },
      { label: "Choose Treatment B", pros: ["Higher success rate (85%)", "One course of treatment likely sufficient", "Less chance of long-term worsening"], cons: ["40% chance of severe side effects", "Higher short-term disruption to life"] },
    ],
    pmPrompt: "Assume you chose Treatment B and experienced severe side effects that lasted 4 months. What do you wish you had considered beforehand? What questions should you have asked the doctor? What support would you have needed?",
  },
  {
    id: "ds3",
    title: "The Investment",
    situation: "You have $15,000 saved. An opportunity arises: invest it in a friend's restaurant (you believe in them, but restaurants fail 60% of the time in year 1) or put it in an index fund (historical average ~7% annual return, boring, no story).",
    options: [
      { label: "Invest in friend's restaurant", pros: ["Potentially higher return", "Supporting someone you believe in", "Exciting, tangible involvement"], cons: ["60% failure rate", "Relationship risk if it fails", "Money is illiquid for years"] },
      { label: "Index fund", pros: ["Diversified, lower risk", "Liquid", "Historical data supports long-term growth"], cons: ["Lower ceiling", "No personal connection", "Misses potential upside"] },
    ],
    pmPrompt: "The restaurant closes 8 months in. The money is gone. Walk through exactly what went wrong from a decision-making perspective — not from bad luck, but from what you knew or could have known at decision time. What reasoning errors did you make?",
  },
];

const CT2_QUIZ_L6: QuizQuestion[] = [
  { id: "ct6q1", question: "The Illusory Truth Effect means:", options: ["People believe things that are told to them by authority figures", "Repeated exposure to a false claim makes it feel more true over time", "Emotional content is more likely to be remembered", "Misinformation only affects people with low education"], correct: 1, explanation: "The Illusory Truth Effect is one of the most robustly replicated findings in cognitive psychology: repeated exposure increases processing fluency, which the brain interprets as a signal of truth. This is why propaganda relies on repetition rather than argument." },
  { id: "ct6q2", question: "Source laundering works because:", options: ["People are too lazy to read original sources", "A chain of citations creates an appearance of independent corroboration even when all sources trace back to one original claim", "Mainstream media outlets deliberately spread misinformation", "False claims are more interesting than true ones"], correct: 1, explanation: "When multiple outlets report on something, readers assume independent verification has occurred. Source laundering exploits this by seeding a single claim that gets amplified up through a citation chain — giving one claim the appearance of many." },
  { id: "ct6q3", question: "When you feel a strong urge to share something immediately because it's outrageous, the critical thinking response is:", options: ["Share it — if it feels true, it probably is", "Check whether the emotional response is the content's delivery mechanism, not evidence of its accuracy", "Only share if you personally agree with it", "Share with a disclaimer"], correct: 1, explanation: "Misinformation is engineered to trigger emotional responses that bypass deliberate reasoning. The intensity of your emotional reaction is not correlated with the accuracy of the content — it's correlated with how viral it was designed to be." },
];

const CT2_QUIZ_L7: QuizQuestion[] = [
  { id: "ct7q1", question: "A drug 'reduces risk by 50%.' Without knowing the baseline risk, this statistic is:", options: ["Highly informative — 50% is significant", "Meaningless — a 50% reduction of 0.2% is a different outcome than 50% of 20%", "Misleading only if the drug has side effects", "Acceptable shorthand in scientific communication"], correct: 1, explanation: "Relative risk reductions without baselines are one of the most common statistical deceptions in health journalism. A 50% reduction of a 0.1% risk (to 0.05%) is nearly irrelevant clinically. Context determines significance." },
  { id: "ct7q2", question: "Survivorship bias causes us to:", options: ["Overestimate how often survivors make good decisions", "Systematically overestimate success rates because failures are invisible", "Underestimate the value of perseverance", "Correctly identify patterns in outcomes"], correct: 1, explanation: "We study and celebrate visible successes while the much larger population of similar failures remains invisible. This distorts our picture of which strategies actually work — we're only seeing the tip of the iceberg." },
  { id: "ct7q3", question: "Simpson's Paradox demonstrates that:", options: ["Simple statistics are more reliable than complex ones", "Aggregate data can show the opposite trend of every subgroup it contains", "Statistical analysis always requires large sample sizes", "Averages are never accurate"], correct: 1, explanation: "Simpson's Paradox is a real phenomenon with major real-world implications — including in clinical trials, hiring discrimination cases, and educational data. Aggregating across non-comparable groups can produce conclusions that reverse entirely when examined properly." },
];

const CT2_QUIZ_L8: QuizQuestion[] = [
  { id: "ct8q1", question: "Ethical persuasion differs from manipulation in that:", options: ["Ethical persuasion uses emotions; manipulation uses facts", "Ethical persuasion respects the audience's ability to reason and choose freely; manipulation exploits cognitive vulnerabilities", "Manipulation is always illegal", "Ethical persuasion never uses social proof"], correct: 1, explanation: "The core ethical distinction is consent and autonomy. Ethical persuasion provides accurate information and legitimate emotional appeals — it works with the audience's reasoning. Manipulation bypasses reasoning by exploiting cognitive shortcuts, fear, or social pressure." },
  { id: "ct8q2", question: "A countdown timer on a purchase page is manipulative when:", options: ["The deadline is real and clearly communicated", "The timer resets after it reaches zero — creating artificial urgency where none exists", "It causes you to decide quickly", "The product is genuinely limited"], correct: 1, explanation: "Artificial urgency is designed to prevent deliberate reasoning. When a countdown is fake (it resets, or the 'sale' is permanent), it's not providing information — it's exploiting the fear of missing out to override your rational decision-making process." },
  { id: "ct8q3", question: "Identity appeals become manipulative when they:", options: ["Connect a product to values the audience genuinely holds", "Frame a choice as a test of group loyalty to prevent independent evaluation of the merits", "Use testimonials from people in the target group", "Acknowledge that other groups may prefer different options"], correct: 1, explanation: "Connecting choices to genuine values is legitimate. Using tribal identity to short-circuit reasoning — 'real patriots buy X' — is manipulation because it substitutes group belonging for evidence. It makes you afraid to evaluate independently." },
];

const CT2_QUIZ_L9: QuizQuestion[] = [
  { id: "ct9q1", question: "A pre-mortem is most useful because it:", options: ["Helps you feel more confident about a decision", "Forces explicit consideration of failure modes before they happen, while there's still time to act on that analysis", "Identifies the single most likely cause of failure", "Is performed after a project fails"], correct: 1, explanation: "The pre-mortem (imagining the project has already failed and asking why) bypasses the optimism bias that causes teams to underweight failure scenarios. It produces specific, actionable risks — not vague concerns — when you can still adjust the plan." },
  { id: "ct9q2", question: "Calibrated uncertainty means:", options: ["Always saying 'I'm not sure' to avoid being wrong", "Your confidence in a belief should match the actual evidence for it — neither overconfident nor underconfident", "Making decisions only when you have more than 90% certainty", "Expressing all beliefs as probability percentages"], correct: 1, explanation: "Good decision-making requires calibration: 70% confident beliefs should be right about 70% of the time. Overconfidence and underconfidence are both calibration errors. Tracking predictions and outcomes is the only reliable way to improve calibration." },
  { id: "ct9q3", question: "When two options have similar expected values, the rational tiebreaker is usually:", options: ["Go with your gut — intuition knows things analysis misses", "Choose the option with lower variance (more predictable outcomes), especially under resource constraints", "Flip a coin — expected values are equal so it doesn't matter", "Always choose the higher-upside option regardless of downside"], correct: 1, explanation: "When expected values are equal, variance matters enormously — especially when you can't afford the downside. A coin flip between $100 and $0 has the same expected value as $50 guaranteed, but if you need at least $50 to survive the month, the guaranteed option is rationally superior." },
];

const CT2_CAPSTONE_CASES = [
  {
    id: "case1",
    title: "The Supplement Ad",
    label: "Health Claim",
    scenario: `A full-page ad in a health magazine reads:

"NEUROFOCUS PRO — Clinically Proven to Boost Memory by 47%

Thousands of customers report sharper thinking in just 14 days. Our proprietary NeuroBlend formula uses 12 all-natural ingredients including Lion's Mane mushroom, trusted for centuries in traditional medicine. Dr. Elena Marsh — former neuroscience researcher — says: 'I've never seen results like this.'

⚡ WARNING: Due to unprecedented demand, we can only guarantee your supply if you order TODAY.
★★★★★ from 14,847 verified customers

Because your brain deserves better — and because you care about staying sharp — you owe it to yourself to try it risk-free."`,
    checklist: [
      { id: "cs1a", label: "Unverified claim: 'Clinically proven' — no study cited, no methodology, no peer review" },
      { id: "cs1b", label: "Misleading statistic: '47% boost' — boost in what? Measured how? By whom?" },
      { id: "cs1c", label: "Appeal to Nature fallacy: 'all-natural' implies safe, which is not valid logic" },
      { id: "cs1d", label: "Authority misuse: 'former neuroscience researcher' — in which domain? Which institution? Is this even verifiable?" },
      { id: "cs1e", label: "Artificial urgency (manipulation): 'order TODAY' — classic fake scarcity" },
      { id: "cs1f", label: "Social proof inflation: 14,847 'verified' reviews — verified by whom? What is their methodology?" },
      { id: "cs1g", label: "Identity appeal (manipulation): 'you care about staying sharp' — frames refusing as self-neglect" },
    ],
  },
  {
    id: "case2",
    title: "The Policy Debate",
    label: "Political Argument",
    scenario: `A social media post goes viral:

"NEW STUDY: Universal Basic Income DESTROYS work ethic — 73% of recipients stopped actively seeking employment.

This is what happens when you pay people to do nothing. Every economist who supports UBI has clearly never run a business. Meanwhile, the Scandinavian countries that tried it had to abandon the experiment because it FAILED.

The real data shows: work is the foundation of human dignity. Giving people 'free money' is not compassion — it's dependency. The millions of working Americans who get up every day are the backbone of this country, and policies like this are a slap in the face to all of them.

Retweet if you believe in REAL work."`,
    checklist: [
      { id: "cs2a", label: "Unverified statistic: '73%' — which study? What population? What definition of 'stopped seeking employment'?" },
      { id: "cs2b", label: "Ad hominem: 'never run a business' attacks economists personally rather than addressing their arguments" },
      { id: "cs2c", label: "False claim: Scandinavian UBI pilots were discontinued due to political changes, not failure — the data actually showed positive outcomes" },
      { id: "cs2d", label: "False framing: presenting UBI as 'paying people to do nothing' is a straw man of how advocates describe it" },
      { id: "cs2e", label: "Identity appeal: 'slap in the face to working Americans' uses group identity to prevent engagement with evidence" },
      { id: "cs2f", label: "Appeal to emotion: 'human dignity' and 'backbone of this country' are emotional appeals without evidentiary weight" },
      { id: "cs2g", label: "Bandwagon call: 'Retweet if you believe in REAL work' pressures sharing without evaluation" },
    ],
  },
  {
    id: "case3",
    title: "The Tech CEO Interview",
    label: "Business Argument",
    scenario: `A transcript excerpt from a tech podcast:

"Look, our AI system has a 94% accuracy rate — that's just a fact. It's trained on more data than any competitor. Our team of 200 engineers works around the clock to make sure it's safe and responsible. 

Critics who say there are bias problems are mostly academics who've never shipped a real product. The real-world feedback we're getting from our 3 million users is overwhelmingly positive.

Could there be edge cases? Sure, in any complex system there will be. But the overwhelming consensus in the industry is that we're setting the gold standard.

The alternative — not deploying AI — means falling behind China. At some point, you have to trust the engineers who built the system."`,
    checklist: [
      { id: "cs3a", label: "Decontextualized statistic: '94% accuracy' — on which task? On which population? False positive vs. false negative breakdown?" },
      { id: "cs3b", label: "Non sequitur: training data volume doesn't determine safety or fairness" },
      { id: "cs3c", label: "Ad hominem: dismissing critics as 'never shipped a product' ignores whether their bias findings are methodologically valid" },
      { id: "cs3d", label: "Survivorship bias in feedback: '3 million users overwhelmingly positive' — users who are harmed by bias are the least likely to be heard in user surveys" },
      { id: "cs3e", label: "False Dilemma: 'deploy or fall behind China' ignores middle-ground options (slower rollout, more auditing, domain restrictions)" },
      { id: "cs3f", label: "Appeal to authority: 'trust the engineers who built it' — creators are the least objective evaluators of their own work's harms" },
      { id: "cs3g", label: "Bandwagon: 'industry consensus' — industry consensus in technology has been wrong repeatedly about safety (see: social media + teen mental health)" },
    ],
  },
];

const CT2_CAPSTONE_STEPS = [
  { label: "Identify Problems", q: "Read your chosen case carefully. List every logical error, fallacy, statistical trap, and manipulation technique you can identify. Quote the exact phrase and name the specific problem. Aim for at least 5.", ph: "e.g., 1. Unverified statistic — '47% boost in memory' — no study cited, no methodology explained, no peer review. A claim that specific requires a specific citation...\n2. Appeal to Nature fallacy — 'all-natural ingredients' — natural ≠ safe or effective. Arsenic is natural. The word is doing emotional work, not evidentiary work...\n3. Authority appeal (questionable) — 'former neuroscience researcher' — which institution? What is her domain expertise in supplements specifically?..." },
  { label: "Steelman It", q: "Now make the strongest possible version of this argument — removing all fallacies and replacing unsupported claims with what actual evidence would need to say. What would this argument look like if it were honest?", ph: "e.g., A legitimate case for NeuropFocus Pro would require: a published, peer-reviewed RCT (not a paid study) showing statistically significant improvement on validated cognitive tests, with full methodology, sample size, and effect sizes disclosed. The endorsement would name the specific researcher, institution, and the precise nature of their review. Urgency would be absent unless supply were genuinely constrained with verifiable data..." },
  { label: "Your Assessment", q: "What is your overall verdict on this argument's credibility? What single change would make it most credible? And — most importantly — what is one way a reasonable person could still disagree with your analysis?", ph: "e.g., Overall credibility: very low. The argument relies almost entirely on emotional manipulation and unverifiable claims rather than transparent evidence.\n\nSingle change for most improvement: publish the full clinical trial methodology and let independent researchers replicate the results.\n\nReasonable disagreement: a defender could argue that testimonials represent real outcomes for real people, and that dismissing lived experience as 'anecdote' is itself a form of elitism..." },
];

// ─── Clear Thinking Module 2 Tab ────────────────────────────────────────────────
function ClearThinkingModule2({ onBack }: { onBack: () => void }) {
  const [activeLesson, setActiveLesson] = useState<CT2LessonId | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const { addXP } = usePersonalization();

  // L6 — misinformation
  const [activeMV, setActiveMV] = useState<string | null>(null);
  const [newsInput, setNewsInput] = useState("");
  const [newsResult, setNewsResult] = useState("");
  const [newsLoading, setNewsLoading] = useState(false);

  // L7 — stat traps
  const [activeTrap, setActiveTrap] = useState<string | null>(null);
  const [statInput, setStatInput] = useState("");
  const [statResult, setStatResult] = useState("");
  const [statLoading, setStatLoading] = useState(false);

  // L8 — persuasion
  const [activePT, setActivePT] = useState<string | null>(null);
  const [adInput, setAdInput] = useState("");
  const [adResult, setAdResult] = useState("");
  const [adLoading, setAdLoading] = useState(false);

  // L9 — decision making
  const [activeScenario, setActiveScenario] = useState<number | null>(null);
  const [activeOptionTab, setActiveOptionTab] = useState<number>(0);
  const [pmAnswer, setPmAnswer] = useState("");
  const [pmSaved, setPmSaved] = useState(false);
  const [calibrationInput, setCalibrationInput] = useState("");
  const [calibrationResult, setCalibrationResult] = useState("");
  const [calibrationLoading, setCalibrationLoading] = useState(false);

  // L10 — capstone
  const [selectedCase, setSelectedCase] = useState<number | null>(null);
  const [ct2Checks, setCt2Checks] = useState<Record<string, boolean>>({});
  const [ct2Step, setCt2Step] = useState(0);
  const [ct2Answers, setCt2Answers] = useState(["", "", ""]);
  const [ct2Done, setCt2Done] = useState(false);

  const newsMutation = trpc.ai.explainConcept.useMutation({
    onSuccess: (data) => { setNewsResult(data.explanation); setNewsLoading(false); },
    onError: (err: { message: string }) => { toast.error(err.message); setNewsLoading(false); },
  });
  const statMutation = trpc.ai.explainConcept.useMutation({
    onSuccess: (data) => { setStatResult(data.explanation); setStatLoading(false); },
    onError: (err: { message: string }) => { toast.error(err.message); setStatLoading(false); },
  });
  const adMutation = trpc.ai.explainConcept.useMutation({
    onSuccess: (data) => { setAdResult(data.explanation); setAdLoading(false); },
    onError: (err: { message: string }) => { toast.error(err.message); setAdLoading(false); },
  });
  const calibMutation = trpc.ai.explainConcept.useMutation({
    onSuccess: (data) => { setCalibrationResult(data.explanation); setCalibrationLoading(false); },
    onError: (err: { message: string }) => { toast.error(err.message); setCalibrationLoading(false); },
  });

  const handleCT2Complete = (id: CT2LessonId) => {
    if (completedLessons.has(id)) return;
    const meta = CT2_LESSON_META.find((l) => l.id === id)!;
    setCompletedLessons((prev) => new Set(Array.from(prev).concat(id)));
    addXP(meta.xp);
    toast.success(`+${meta.xp} XP — Lesson complete!`);
  };

  const overallPct = Math.round((completedLessons.size / CT2_LESSON_META.length) * 100);

  // Section-type badge helper (blueprint signaling principle)
  const SectionBadge = ({ type, color }: { type: string; color: string }) => (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase mb-3"
      style={{ background: `${color.replace(")", "_/_0.15)").replace("oklch(", "oklch(")}`, color }}>
      {type}
    </span>
  );

  function CT2Shell({ id, children }: { id: CT2LessonId; children: React.ReactNode }) {
    const meta = CT2_LESSON_META.find((l) => l.id === id)!;
    const done = completedLessons.has(id);
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
        <button onClick={() => setActiveLesson(null)} className="flex items-center gap-1.5 mb-5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={14} /> Back to all lessons
        </button>
        <div className="glass rounded-2xl p-5 border border-white/8 mb-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Clear Thinking · Module 2 · Thinking in Real Life</div>
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
            : <motion.button onClick={() => handleCT2Complete(id)} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 text-black"
                style={{ background: `linear-gradient(to right, ${meta.color}, oklch(0.72_0.18_150))` }}>
                <CheckCircle2 size={15} /> Mark Complete & Earn {meta.xp} XP
              </motion.button>
          }
        </div>
        {id !== "ct10" && (
          <div className="mt-4 flex justify-end">
            <button onClick={() => { const ids: CT2LessonId[] = ["ct6","ct7","ct8","ct9","ct10"]; const idx = ids.indexOf(id); setActiveLesson(ids[idx + 1]); }}
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

      {/* ── Lesson 6: How Misinformation Spreads ── */}
      {activeLesson === "ct6" && (
        <CT2Shell key="ct6" id="ct6">
          <div className="space-y-5">

            {/* Hook — why this matters */}
            <div className="glass rounded-2xl p-6 border border-white/8" style={{ borderLeft: "3px solid oklch(0.75_0.18_55)" }}>
              <SectionBadge type="Hook" color="oklch(0.75_0.18_55)" />
              <Narrator text="A false story spreads six times faster on social media than a true one. That's not a guess — it's a finding from an MIT study of 126,000 stories over a decade. This lesson explains exactly why that happens, and what it means for every piece of information you encounter." />
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { stat: "6×", label: "Faster spread for false stories", color: "oklch(0.68_0.22_20)" },
                  { stat: "70%", label: "More likely to be retweeted", color: "oklch(0.78_0.16_30)" },
                  { stat: "20×", label: "Deeper retweet cascade depth", color: "oklch(0.72_0.2_290)" },
                ].map(({ stat, label, color }) => (
                  <div key={stat} className="glass rounded-xl p-4 border border-white/8 text-center">
                    <div className="text-2xl font-bold mb-1" style={{ color }}>{stat}</div>
                    <p className="text-xs text-muted-foreground leading-snug">{label}</p>
                  </div>
                ))}
              </div>
              <SegmentFooter accentColor="oklch(0.75_0.18_55)"
                topics={["Why novelty makes false stories spread faster", "What the MIT Vosoughi study actually found and its limitations", "How social media algorithms amplify emotional content", "What 'epistemic cowardice' is and why it makes misinformation worse"]} />
            </div>

            {/* Concept — the 4 vectors */}
            <div className="glass rounded-2xl p-6 border border-white/8" style={{ borderLeft: "3px solid oklch(0.72_0.2_290)" }}>
              <SectionBadge type="Core Concept" color="oklch(0.72_0.2_290)" />
              <h3 className="font-semibold text-foreground mb-1">The 4 Mechanisms</h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">False information doesn't spread because people are stupid. It spreads because it exploits specific, predictable features of human cognition. Understanding the mechanism is how you become resistant to it.</p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {MISINFO_VECTORS.map((mv) => (
                  <button key={mv.id} onClick={() => setActiveMV(activeMV === mv.id ? null : mv.id)}
                    className={`p-4 rounded-xl text-left border transition-all ${ activeMV === mv.id ? "bg-[oklch(0.72_0.2_290_/_0.15)] border-[oklch(0.72_0.2_290_/_0.4)]" : "glass border-white/8 hover:border-white/20" }`}>
                    <div className="text-sm font-semibold text-foreground mb-1">{mv.name}</div>
                    <p className="text-xs text-muted-foreground leading-snug line-clamp-2">{mv.howItSpreads}</p>
                  </button>
                ))}
              </div>
              <AnimatePresence>
                {activeMV && (() => {
                  const mv = MISINFO_VECTORS.find((x) => x.id === activeMV)!;
                  return (
                    <motion.div key={activeMV} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="glass rounded-2xl p-5 border border-[oklch(0.72_0.2_290_/_0.3)] space-y-3 mb-2">
                      <h4 className="font-bold text-foreground">{mv.name}</h4>
                      <div>
                        <div className="text-xs font-semibold text-[oklch(0.72_0.2_290)] mb-1">HOW IT SPREADS</div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{mv.howItSpreads}</p>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[oklch(0.68_0.22_20)] mb-1">WHY IT WORKS COGNITIVELY</div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{mv.whyItWorks}</p>
                      </div>
                      <div className="glass rounded-xl p-4 border border-[oklch(0.72_0.18_150_/_0.2)]">
                        <div className="text-xs font-semibold text-[oklch(0.72_0.18_150)] mb-1">YOUR COUNTER-MOVE</div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{mv.counter}</p>
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
              <SegmentFooter accentColor="oklch(0.72_0.2_290)"
                topics={["What 'prebunking' is and how it reduces susceptibility to misinformation", "How the backfire effect works (and whether it's real)", "Why corrections often fail to update beliefs", "What media literacy education actually teaches"]} />
            </div>

            {/* Activity — live news analyzer */}
            <div className="glass rounded-2xl p-5 border border-[oklch(0.72_0.2_290_/_0.2)]" style={{ borderLeft: "3px solid oklch(0.78_0.16_30)" }}>
              <SectionBadge type="Try It" color="oklch(0.78_0.16_30)" />
              <div className="text-xs font-semibold text-[oklch(0.78_0.16_30)] mb-1">MISINFORMATION ANALYZER</div>
              <p className="text-xs text-muted-foreground mb-3">Paste a headline, social post, or claim. The AI will identify which misinformation mechanisms it uses and how to evaluate it.</p>
              <textarea value={newsInput} onChange={(e) => setNewsInput(e.target.value)}
                placeholder="e.g., 'SHOCKING: Scientists admit vaccines contain microchips — 4 whistleblowers speak out'" rows={3}
                className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[oklch(0.72_0.2_290_/_0.5)] resize-none mb-3" />
              <motion.button onClick={() => {
                if (!newsInput.trim()) { toast.error("Paste a claim first."); return; }
                setNewsLoading(true); setNewsResult("");
                newsMutation.mutate({ concept: `Analyze this claim for misinformation patterns: "${newsInput}". Identify: (1) Which of these mechanisms it uses: emotional contagion, illusory truth effect, source laundering, or context collapse. (2) Specific red flags in the language or framing. (3) What a critical thinker should do before accepting or sharing this. Be specific, educational, and direct.`, level: "student" });
              }} disabled={newsLoading || !newsInput.trim()} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                style={{ background: "oklch(0.72_0.2_290)" }}>
                {newsLoading ? <><RefreshCw size={13} className="animate-spin" /> Analyzing…</> : <><Search size={13} /> Analyze Claim</>}
              </motion.button>
              <AnimatePresence>
                {newsResult && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 rounded-xl bg-[oklch(0.72_0.2_290_/_0.08)] border border-[oklch(0.72_0.2_290_/_0.25)]">
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{newsResult}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="glass rounded-2xl p-5 border border-white/8">
              <h4 className="font-semibold text-foreground mb-3">Knowledge Check</h4>
              <QuizBlock questions={CT2_QUIZ_L6} accentColor="oklch(0.72_0.2_290)" />
            </div>
          </div>
        </CT2Shell>
      )}

      {/* ── Lesson 7: Statistical Traps ── */}
      {activeLesson === "ct7" && (
        <CT2Shell key="ct7" id="ct7">
          <div className="space-y-5">

            <div className="glass rounded-2xl p-6 border border-white/8" style={{ borderLeft: "3px solid oklch(0.75_0.18_55)" }}>
              <SectionBadge type="Hook" color="oklch(0.75_0.18_55)" />
              <Narrator text="Statistics are the language of evidence — and one of the most powerful tools for misleading you without technically lying. You don't need to be a mathematician to spot the most common traps. You need to know which questions to ask." />
              <div className="mt-4 glass rounded-xl p-4 border border-[oklch(0.68_0.22_20_/_0.2)]">
                <div className="text-xs font-semibold text-[oklch(0.68_0.22_20)] mb-2">THE THREE QUESTIONS THAT DEFEAT MOST STATISTICAL CLAIMS</div>
                <div className="space-y-2">
                  {[
                    { q: "Compared to what?", d: "Every number needs a baseline. 50% of nothing is nothing." },
                    { q: "Who is missing from this data?", d: "Survivorship, selection, and publication bias all hide evidence that would change your conclusion." },
                    { q: "What does this actually measure?", d: "The metric used may not measure what you think it measures." },
                  ].map(({ q, d }) => (
                    <div key={q} className="flex items-start gap-3 p-3 rounded-lg glass border border-white/8">
                      <div className="text-xs font-bold text-[oklch(0.68_0.22_20)] shrink-0 mt-0.5">{q}</div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{d}</p>
                    </div>
                  ))}
                </div>
              </div>
              <SegmentFooter accentColor="oklch(0.68_0.22_20)"
                topics={["What p-values actually mean (and don't mean)", "How to read a forest plot from a meta-analysis", "What 'confidence interval' means in plain English", "Why large sample sizes don't fix bad methodology"]} />
            </div>

            {/* Statistical trap explorer */}
            <div className="glass rounded-2xl p-6 border border-white/8" style={{ borderLeft: "3px solid oklch(0.68_0.22_20)" }}>
              <SectionBadge type="Core Concept" color="oklch(0.68_0.22_20)" />
              <h3 className="font-semibold text-foreground mb-1">5 Traps in Detail</h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">Each of these traps has caused real harm in real decisions — in medicine, business, and policy. Click each one to see the trap, the reveal, and the lesson.</p>
              <div className="space-y-2 mb-2">
                {STAT_TRAPS.map((trap) => (
                  <div key={trap.id}>
                    <button onClick={() => setActiveTrap(activeTrap === trap.id ? null : trap.id)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl text-left border transition-all ${ activeTrap === trap.id ? "bg-[oklch(0.68_0.22_20_/_0.15)] border-[oklch(0.68_0.22_20_/_0.4)]" : "glass border-white/8 hover:border-white/20" }`}>
                      <span className="font-semibold text-sm text-foreground">{trap.title}</span>
                      <ChevronRight size={14} className={`text-muted-foreground transition-transform ${activeTrap === trap.id ? "rotate-90" : ""}`} />
                    </button>
                    <AnimatePresence>
                      {activeTrap === trap.id && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden">
                          <div className="p-4 space-y-3 glass rounded-b-xl border-x border-b border-[oklch(0.68_0.22_20_/_0.3)]">
                            <div className="glass rounded-lg p-3 border border-[oklch(0.68_0.22_20_/_0.2)]">
                              <div className="text-xs font-semibold text-[oklch(0.68_0.22_20)] mb-1">THE CLAIM</div>
                              <p className="text-sm text-foreground italic">{trap.misleading}</p>
                            </div>
                            <div className="glass rounded-lg p-3 border border-[oklch(0.72_0.18_150_/_0.2)]">
                              <div className="text-xs font-semibold text-[oklch(0.72_0.18_150)] mb-1">THE REVEAL</div>
                              <p className="text-sm text-muted-foreground leading-relaxed">{trap.reveal}</p>
                            </div>
                            <div className="glass rounded-lg p-3 border border-[oklch(0.75_0.18_55_/_0.2)]">
                              <div className="text-xs font-semibold text-[oklch(0.75_0.18_55)] mb-1">THE LESSON</div>
                              <p className="text-sm text-muted-foreground leading-relaxed">{trap.lesson}</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
              <SegmentFooter accentColor="oklch(0.68_0.22_20)"
                topics={["How to identify Simpson's Paradox in real data", "What absolute vs. relative risk means in drug trials", "How to find the original data behind a headline statistic", "What makes a graph visually misleading"]} />
            </div>

            {/* Live stat checker */}
            <div className="glass rounded-2xl p-5 border border-[oklch(0.68_0.22_20_/_0.2)]" style={{ borderLeft: "3px solid oklch(0.78_0.16_30)" }}>
              <SectionBadge type="Try It" color="oklch(0.78_0.16_30)" />
              <div className="text-xs font-semibold text-[oklch(0.78_0.16_30)] mb-1">STATISTIC DECODER</div>
              <p className="text-xs text-muted-foreground mb-3">Paste any statistic or data claim. The AI will explain what questions to ask and what context is missing.</p>
              <textarea value={statInput} onChange={(e) => setStatInput(e.target.value)}
                placeholder="e.g., 'Coffee drinkers have a 23% lower risk of dying from heart disease'" rows={2}
                className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[oklch(0.68_0.22_20_/_0.5)] resize-none mb-3" />
              <motion.button onClick={() => {
                if (!statInput.trim()) { toast.error("Enter a statistic first."); return; }
                setStatLoading(true); setStatResult("");
                statMutation.mutate({ concept: `Analyze this statistical claim: "${statInput}". Identify: (1) What type of statistical trap it might contain (relative vs. absolute, survivorship, Simpson's, cherry-picked timeframe, etc.). (2) What critical questions a reader should ask — be specific. (3) What additional context would be needed to properly evaluate this claim. Be educational and direct.`, level: "student" });
              }} disabled={statLoading || !statInput.trim()} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                style={{ background: "oklch(0.68_0.22_20)" }}>
                {statLoading ? <><RefreshCw size={13} className="animate-spin" /> Analyzing…</> : <><Search size={13} /> Decode Statistic</>}
              </motion.button>
              <AnimatePresence>
                {statResult && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 rounded-xl bg-[oklch(0.68_0.22_20_/_0.08)] border border-[oklch(0.68_0.22_20_/_0.25)]">
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{statResult}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="glass rounded-2xl p-5 border border-white/8">
              <h4 className="font-semibold text-foreground mb-3">Knowledge Check</h4>
              <QuizBlock questions={CT2_QUIZ_L7} accentColor="oklch(0.68_0.22_20)" />
            </div>
          </div>
        </CT2Shell>
      )}

      {/* ── Lesson 8: Persuasion vs. Manipulation ── */}
      {activeLesson === "ct8" && (
        <CT2Shell key="ct8" id="ct8">
          <div className="space-y-5">

            <div className="glass rounded-2xl p-6 border border-white/8" style={{ borderLeft: "3px solid oklch(0.75_0.18_55)" }}>
              <SectionBadge type="Hook" color="oklch(0.75_0.18_55)" />
              <Narrator text="Every advertisement, every political speech, every fundraiser, and every sales conversation is an attempt to change your behavior. Some of them are ethical. Some of them are not. The line between persuasion and manipulation isn't always obvious — but it's one of the most important distinctions a clear thinker can make." />
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  { label: "Persuasion", def: "Works through the audience's own reasoning. Provides accurate information and legitimate emotional appeals. Respects the person's ability to reach their own conclusions.", color: "oklch(0.72_0.18_150)" },
                  { label: "Manipulation", def: "Bypasses reasoning by exploiting cognitive vulnerabilities, emotional triggers, or social pressure. Achieves compliance without genuine understanding or free choice.", color: "oklch(0.68_0.22_20)" },
                ].map(({ label, def, color }) => (
                  <div key={label} className="glass rounded-xl p-4 border border-white/8" style={{ borderLeft: `3px solid ${color}` }}>
                    <div className="text-sm font-bold mb-2" style={{ color }}>{label}</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{def}</p>
                  </div>
                ))}
              </div>
              <SegmentFooter accentColor="oklch(0.72_0.18_150)"
                topics={["What Robert Cialdini's 6 principles of influence are", "When emotional appeals in arguments are legitimate vs. manipulative", "How dark patterns in UX design exploit cognitive biases", "What 'informed consent' means beyond medicine"]} />
            </div>

            {/* Technique explorer */}
            <div className="glass rounded-2xl p-6 border border-white/8" style={{ borderLeft: "3px solid oklch(0.72_0.18_150)" }}>
              <SectionBadge type="Core Concept" color="oklch(0.72_0.18_150)" />
              <h3 className="font-semibold text-foreground mb-1">5 Techniques — Ethical or Not?</h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">Every technique below has a legitimate ethical version and a manipulative one. The technique itself is often neutral — the ethics depend on how it's used.</p>
              <div className="space-y-2">
                {PERSUASION_TECHNIQUES.map((pt) => (
                  <div key={pt.id}>
                    <button onClick={() => setActivePT(activePT === pt.id ? null : pt.id)}
                      className={`w-full flex items-center justify-between p-4 rounded-xl text-left border transition-all ${ activePT === pt.id ? "bg-[oklch(0.72_0.18_150_/_0.12)] border-[oklch(0.72_0.18_150_/_0.4)]" : "glass border-white/8 hover:border-white/20" }`}>
                      <div>
                        <span className="font-semibold text-sm text-foreground">{pt.name}</span>
                        <p className="text-xs text-muted-foreground mt-0.5">{pt.definition}</p>
                      </div>
                      <ChevronRight size={14} className={`text-muted-foreground shrink-0 ml-3 transition-transform ${activePT === pt.id ? "rotate-90" : ""}`} />
                    </button>
                    <AnimatePresence>
                      {activePT === pt.id && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden">
                          <div className="p-4 space-y-3 glass rounded-b-xl border-x border-b border-[oklch(0.72_0.18_150_/_0.3)]">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="glass rounded-lg p-3 border border-[oklch(0.72_0.18_150_/_0.2)]">
                                <div className="text-xs font-semibold text-[oklch(0.72_0.18_150)] mb-1">ETHICAL USE</div>
                                <p className="text-xs text-muted-foreground leading-relaxed">{pt.ethical}</p>
                              </div>
                              <div className="glass rounded-lg p-3 border border-[oklch(0.68_0.22_20_/_0.2)]">
                                <div className="text-xs font-semibold text-[oklch(0.68_0.22_20)] mb-1">MANIPULATIVE USE</div>
                                <p className="text-xs text-muted-foreground leading-relaxed">{pt.manipulative}</p>
                              </div>
                            </div>
                            <div className="glass rounded-lg p-3 border border-[oklch(0.75_0.18_55_/_0.2)]">
                              <div className="text-xs font-semibold text-[oklch(0.75_0.18_55)] mb-1">YOUR SIGNAL TO WATCH FOR</div>
                              <p className="text-xs text-muted-foreground leading-relaxed">{pt.signal}</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
              <SegmentFooter accentColor="oklch(0.72_0.18_150)"
                topics={["What 'dark patterns' are and examples from major apps", "How to identify manipulation in political advertising", "Why manufactured urgency is one of the most common online tactics", "What Cialdini found about reciprocity in field experiments"]} />
            </div>

            {/* Live ad deconstructor */}
            <div className="glass rounded-2xl p-5 border border-[oklch(0.72_0.18_150_/_0.2)]" style={{ borderLeft: "3px solid oklch(0.78_0.16_30)" }}>
              <SectionBadge type="Try It" color="oklch(0.78_0.16_30)" />
              <div className="text-xs font-semibold text-[oklch(0.78_0.16_30)] mb-1">INFLUENCE DECODER</div>
              <p className="text-xs text-muted-foreground mb-3">Paste any ad, social post, email, or sales message. The AI will identify which persuasion or manipulation techniques it uses.</p>
              <textarea value={adInput} onChange={(e) => setAdInput(e.target.value)}
                placeholder="e.g., 'Only 3 spots left in our exclusive community! Thousands of members are already transforming their lives…'"
                rows={3} className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[oklch(0.72_0.18_150_/_0.5)] resize-none mb-3" />
              <motion.button onClick={() => {
                if (!adInput.trim()) { toast.error("Paste a message first."); return; }
                setAdLoading(true); setAdResult("");
                adMutation.mutate({ concept: `Analyze this message for persuasion and manipulation techniques: "${adInput}". For each technique identified: (1) Name it precisely (e.g., 'artificial scarcity', 'social proof', 'identity appeal'). (2) Quote the exact phrase using it. (3) Say whether this specific use is ethical persuasion or manipulative — and why. End with an overall assessment of whether this message respects the reader's autonomy.`, level: "student" });
              }} disabled={adLoading || !adInput.trim()} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                style={{ background: "oklch(0.72_0.18_150)" }}>
                {adLoading ? <><RefreshCw size={13} className="animate-spin" /> Analyzing…</> : <><Search size={13} /> Decode Influence</>}
              </motion.button>
              <AnimatePresence>
                {adResult && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 rounded-xl bg-[oklch(0.72_0.18_150_/_0.08)] border border-[oklch(0.72_0.18_150_/_0.25)]">
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{adResult}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="glass rounded-2xl p-5 border border-white/8">
              <h4 className="font-semibold text-foreground mb-3">Knowledge Check</h4>
              <QuizBlock questions={CT2_QUIZ_L8} accentColor="oklch(0.72_0.18_150)" />
            </div>
          </div>
        </CT2Shell>
      )}

      {/* ── Lesson 9: Deciding Under Uncertainty ── */}
      {activeLesson === "ct9" && (
        <CT2Shell key="ct9" id="ct9">
          <div className="space-y-5">

            <div className="glass rounded-2xl p-6 border border-white/8" style={{ borderLeft: "3px solid oklch(0.75_0.18_55)" }}>
              <SectionBadge type="Hook" color="oklch(0.75_0.18_55)" />
              <Narrator text="Every important decision is made with incomplete information. The question is never 'do I have enough data?' — it's 'how do I make the best call with what I actually have?' Professionals who make better decisions under uncertainty share a specific set of mental tools. This lesson teaches them." />
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { name: "Pre-Mortem", def: "Assume failure before it happens. Ask: why did this go wrong?", icon: <AlertTriangle size={16} />, color: "oklch(0.68_0.22_20)" },
                  { name: "Calibration", def: "Match confidence to evidence. 70% certain should mean right 70% of the time.", icon: <Scale size={16} />, color: "oklch(0.72_0.2_260)" },
                  { name: "Decision Journal", def: "Record your reasoning before outcomes are known. The only way to learn from decisions.", icon: <FlaskConical size={16} />, color: "oklch(0.72_0.18_150)" },
                ].map(({ name, def, icon, color }) => (
                  <div key={name} className="glass rounded-xl p-4 border border-white/8">
                    <div className="flex items-center gap-2 mb-2" style={{ color }}>{icon}<span className="font-bold text-xs">{name}</span></div>
                    <p className="text-xs text-muted-foreground leading-snug">{def}</p>
                  </div>
                ))}
              </div>
              <SegmentFooter accentColor="oklch(0.75_0.18_55)"
                topics={["What Bayesian reasoning is and a simple example", "How superforecasters make better predictions than experts", "What the 'reference class' is and why it matters in planning", "How to use a decision matrix for high-stakes choices"]} />
            </div>

            {/* Concept — pre-mortem method */}
            <div className="glass rounded-2xl p-6 border border-white/8" style={{ borderLeft: "3px solid oklch(0.72_0.2_260)" }}>
              <SectionBadge type="Core Concept" color="oklch(0.72_0.2_260)" />
              <h3 className="font-semibold text-foreground mb-3">Practice Scenario: The Pre-Mortem</h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">The pre-mortem technique (developed by psychologist Gary Klein) reverses the typical planning question. Instead of "what could go wrong?" — which produces polite, optimism-biased answers — you assume the project has already failed and ask "what happened?"</p>

              <div className="flex gap-2 mb-4">
                {CT2_DECISION_SCENARIOS.map((s, i) => (
                  <button key={s.id} onClick={() => { setActiveScenario(i); setActiveOptionTab(0); setPmAnswer(""); setPmSaved(false); }}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all border text-center ${ activeScenario === i ? "bg-[oklch(0.72_0.2_260_/_0.15)] border-[oklch(0.72_0.2_260_/_0.4)] text-[oklch(0.82_0.2_260)]" : "glass border-white/8 text-muted-foreground hover:border-white/20" }`}>
                    {s.title}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {activeScenario !== null && (() => {
                  const sc = CT2_DECISION_SCENARIOS[activeScenario];
                  return (
                    <motion.div key={activeScenario} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                      className="space-y-4">
                      <div className="glass rounded-xl p-4 border border-[oklch(0.72_0.2_260_/_0.2)]">
                        <div className="text-xs font-semibold text-[oklch(0.72_0.2_260)] mb-2">SCENARIO</div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{sc.situation}</p>
                      </div>
                      <div className="flex gap-1 p-1 glass rounded-xl border border-white/8">
                        {sc.options.map((opt, i) => (
                          <button key={i} onClick={() => setActiveOptionTab(i)}
                            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${ activeOptionTab === i ? "bg-[oklch(0.72_0.2_260_/_0.15)] text-[oklch(0.82_0.2_260)]" : "text-muted-foreground" }`}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <AnimatePresence mode="wait">
                        <motion.div key={activeOptionTab} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }}>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="glass rounded-xl p-4 border border-[oklch(0.72_0.18_150_/_0.2)]">
                              <div className="text-xs font-semibold text-[oklch(0.72_0.18_150)] mb-2">PROS</div>
                              <div className="space-y-1.5">
                                {sc.options[activeOptionTab].pros.map((p, i) => (
                                  <div key={i} className="flex items-start gap-2">
                                    <Check size={11} className="text-[oklch(0.72_0.18_150)] mt-0.5 shrink-0" />
                                    <p className="text-xs text-muted-foreground leading-snug">{p}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="glass rounded-xl p-4 border border-[oklch(0.68_0.22_20_/_0.2)]">
                              <div className="text-xs font-semibold text-[oklch(0.68_0.22_20)] mb-2">CONS</div>
                              <div className="space-y-1.5">
                                {sc.options[activeOptionTab].cons.map((c, i) => (
                                  <div key={i} className="flex items-start gap-2">
                                    <AlertTriangle size={11} className="text-[oklch(0.68_0.22_20)] mt-0.5 shrink-0" />
                                    <p className="text-xs text-muted-foreground leading-snug">{c}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      </AnimatePresence>

                      <div className="glass rounded-xl p-4 border border-[oklch(0.72_0.2_260_/_0.15)]">
                        <div className="text-xs font-semibold text-[oklch(0.72_0.2_260)] mb-2">PRE-MORTEM EXERCISE</div>
                        <p className="text-sm text-muted-foreground mb-3 leading-relaxed italic">{sc.pmPrompt}</p>
                        <textarea value={pmAnswer} onChange={(e) => setPmAnswer(e.target.value)}
                          placeholder="Imagine the worst outcome has happened. Walk through exactly what went wrong from a decision-making perspective…"
                          rows={5} className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[oklch(0.72_0.2_260_/_0.4)] resize-none" />
                        {!pmSaved
                          ? <button onClick={() => {
                              if (!pmAnswer.trim()) { toast.error("Write your pre-mortem first."); return; }
                              setPmSaved(true); addXP(10); toast.success("+10 XP — pre-mortem saved!");
                            }} className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[oklch(0.72_0.2_260_/_0.2)] border border-[oklch(0.72_0.2_260_/_0.3)] text-sm text-[oklch(0.82_0.2_260)]">
                              <Check size={13} /> Save Pre-Mortem (+10 XP)
                            </button>
                          : <p className="mt-3 text-xs text-[oklch(0.72_0.18_150)] flex items-center gap-1"><CheckCircle2 size={11} /> Saved — +10 XP</p>
                        }
                      </div>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
              <SegmentFooter accentColor="oklch(0.72_0.2_260)"
                topics={["How to run a pre-mortem with a team (not just alone)", "What the 'planning fallacy' is and how it distorts time and cost estimates", "How to use base rates to calibrate your expectations", "What 'expected value' means and when to use it"]} />
            </div>

            {/* Live calibration tool */}
            <div className="glass rounded-2xl p-5 border border-[oklch(0.75_0.18_55_/_0.2)]" style={{ borderLeft: "3px solid oklch(0.78_0.16_30)" }}>
              <SectionBadge type="Try It" color="oklch(0.78_0.16_30)" />
              <div className="text-xs font-semibold text-[oklch(0.78_0.16_30)] mb-1">DECISION ADVISOR</div>
              <p className="text-xs text-muted-foreground mb-3">Describe a real decision you're facing. The AI will apply pre-mortem, calibrated uncertainty, and decision-quality frameworks to help you think it through.</p>
              <textarea value={calibrationInput} onChange={(e) => setCalibrationInput(e.target.value)}
                placeholder="e.g., 'I'm deciding whether to go back to school for a master's degree at 35. I have a stable job, two kids, and $40k saved.'"
                rows={3} className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[oklch(0.75_0.18_55_/_0.5)] resize-none mb-3" />
              <motion.button onClick={() => {
                if (!calibrationInput.trim()) { toast.error("Describe your decision first."); return; }
                setCalibrationLoading(true); setCalibrationResult("");
                calibMutation.mutate({ concept: `Apply decision-analysis frameworks to this situation: "${calibrationInput}". Structure your response as: (1) PRE-MORTEM: Assume the main choice failed — what specifically went wrong? (2) BASE RATE: What does the relevant evidence say about how often this kind of decision works out? (3) KEY UNCERTAINTIES: What are the 2-3 things you don't yet know that would most change the decision? (4) DECISION QUALITY CHECK: Is there additional information worth getting before deciding? Be specific and practical, not generic.`, level: "student" });
              }} disabled={calibrationLoading || !calibrationInput.trim()} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-medium text-black disabled:opacity-50"
                style={{ background: "linear-gradient(to right, oklch(0.75_0.18_55), oklch(0.72_0.18_150))" }}>
                {calibrationLoading ? <><RefreshCw size={13} className="animate-spin" /> Analyzing…</> : <><Lightbulb size={13} /> Analyze My Decision</>}
              </motion.button>
              <AnimatePresence>
                {calibrationResult && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-4 rounded-xl bg-[oklch(0.75_0.18_55_/_0.08)] border border-[oklch(0.75_0.18_55_/_0.25)]">
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{calibrationResult}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="glass rounded-2xl p-5 border border-white/8">
              <h4 className="font-semibold text-foreground mb-3">Knowledge Check</h4>
              <QuizBlock questions={CT2_QUIZ_L9} accentColor="oklch(0.75_0.18_55)" />
            </div>
          </div>
        </CT2Shell>
      )}

      {/* ── Lesson 10: Capstone ── */}
      {activeLesson === "ct10" && (
        <CT2Shell key="ct10" id="ct10">
          <div className="space-y-5">
            {completedLessons.size < 4 && (
              <div className="glass rounded-xl p-5 border border-[oklch(0.78_0.16_30_/_0.3)]">
                <div className="flex items-start gap-3">
                  <Lock size={16} className="text-[oklch(0.78_0.16_30)] mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-foreground mb-1">Complete Earlier Lessons First</h4>
                    <p className="text-sm text-muted-foreground">You've completed {completedLessons.size}/4 lessons. The capstone requires the full Module 2 toolkit.</p>
                    <div className="flex gap-1 mt-2">
                      {(["ct6","ct7","ct8","ct9"] as CT2LessonId[]).map((id) => (
                        <div key={id} className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold border ${ completedLessons.has(id) ? "bg-[oklch(0.72_0.18_150_/_0.2)] border-[oklch(0.72_0.18_150_/_0.4)] text-[oklch(0.72_0.18_150)]" : "glass border-white/10 text-muted-foreground" }`}>
                          {completedLessons.has(id) ? <Check size={12} /> : id.replace("ct","")}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="glass rounded-2xl p-6 border border-white/8" style={{ borderLeft: "3px solid oklch(0.78_0.16_30)" }}>
              <SectionBadge type="Capstone" color="oklch(0.78_0.16_30)" />
              <Narrator text="This capstone applies all eight lessons — argument structure, fallacies, evidence quality, cognitive biases, misinformation mechanics, statistical traps, persuasion versus manipulation, and decision-making under uncertainty. Choose a real-world case and take it apart." />
            </div>

            {/* Case selector */}
            <div>
              <div className="text-sm font-semibold text-foreground mb-3">Choose your case:</div>
              <div className="grid grid-cols-3 gap-2">
                {CT2_CAPSTONE_CASES.map((c, i) => (
                  <button key={c.id} onClick={() => { setSelectedCase(i); setCt2Checks({}); setCt2Step(0); setCt2Answers(["","",""]); setCt2Done(false); }}
                    className={`py-3 px-4 rounded-xl text-sm font-medium transition-all border text-left ${ selectedCase === i ? "bg-[oklch(0.78_0.16_30_/_0.15)] border-[oklch(0.78_0.16_30_/_0.4)] text-[oklch(0.88_0.16_30)]" : "glass border-white/8 text-muted-foreground hover:border-white/20" }`}>
                    <div className="font-semibold text-xs text-muted-foreground mb-1">{c.label}</div>
                    {c.title}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {selectedCase !== null && (() => {
                const cs = CT2_CAPSTONE_CASES[selectedCase];
                const checkedCount = Object.values(ct2Checks).filter(Boolean).length;
                return (
                  <motion.div key={selectedCase} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="space-y-4">

                    {/* The case text */}
                    <div className="glass rounded-2xl p-5 border border-[oklch(0.78_0.16_30_/_0.2)]">
                      <div className="text-xs font-semibold text-[oklch(0.78_0.16_30)] mb-3">THE CASE — {cs.title.toUpperCase()}</div>
                      <pre className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap font-sans">{cs.scenario}</pre>
                    </div>

                    {/* Interactive error checklist */}
                    <div className="glass rounded-2xl p-5 border border-white/8">
                      <div className="text-sm font-semibold text-foreground mb-1">Step 1 — Error Hunt</div>
                      <p className="text-xs text-muted-foreground mb-4">Check off each problem as you find it in the text above. You should find all {cs.checklist.length}.</p>
                      <div className="space-y-2 mb-3">
                        {cs.checklist.map((item) => (
                          <label key={item.id} className="flex items-start gap-3 cursor-pointer group">
                            <div onClick={() => setCt2Checks((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                              className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all ${ ct2Checks[item.id] ? "bg-[oklch(0.72_0.18_150)] border-[oklch(0.72_0.18_150)]" : "border-white/20 group-hover:border-white/40" }`}>
                              {ct2Checks[item.id] && <Check size={11} className="text-white" />}
                            </div>
                            <span className={`text-sm leading-snug transition-colors ${ ct2Checks[item.id] ? "text-foreground" : "text-muted-foreground" }`}>{item.label}</span>
                          </label>
                        ))}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 rounded-full bg-white/8">
                          <div className="h-full rounded-full bg-[oklch(0.72_0.18_150)] transition-all" style={{ width: `${(checkedCount / cs.checklist.length) * 100}%` }} />
                        </div>
                        <span className="text-xs font-medium text-foreground">{checkedCount}/{cs.checklist.length}</span>
                      </div>
                    </div>

                    {/* Written analysis steps */}
                    <div className="flex gap-2">
                      {CT2_CAPSTONE_STEPS.map((s, i) => (
                        <button key={i} onClick={() => setCt2Step(i)}
                          className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all border text-center ${ ct2Step === i ? "bg-[oklch(0.78_0.16_30_/_0.15)] border-[oklch(0.78_0.16_30_/_0.4)] text-[oklch(0.88_0.16_30)]" : "glass border-white/8 text-muted-foreground" }`}>
                          {s.label} {ct2Answers[i].length > 20 && <CheckCircle2 size={11} className="inline text-[oklch(0.72_0.18_150)]" />}
                        </button>
                      ))}
                    </div>
                    <AnimatePresence mode="wait">
                      <motion.div key={ct2Step} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
                        className="glass rounded-2xl p-6 border border-[oklch(0.78_0.16_30_/_0.15)]">
                        <div className="text-xs font-semibold text-[oklch(0.78_0.16_30)] mb-3">STEP {ct2Step + 1} — {CT2_CAPSTONE_STEPS[ct2Step].label.toUpperCase()}</div>
                        <p className="text-sm font-medium text-foreground mb-4 leading-snug">{CT2_CAPSTONE_STEPS[ct2Step].q}</p>
                        <textarea value={ct2Answers[ct2Step]}
                          onChange={(e) => { const u = [...ct2Answers]; u[ct2Step] = e.target.value; setCt2Answers(u); }}
                          placeholder={CT2_CAPSTONE_STEPS[ct2Step].ph} rows={7}
                          className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[oklch(0.78_0.16_30_/_0.5)] resize-none leading-relaxed" />
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs text-muted-foreground">{ct2Answers[ct2Step].length} chars</span>
                          <div className="flex gap-2">
                            {ct2Step > 0 && (
                              <button onClick={() => setCt2Step(ct2Step - 1)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg glass border border-white/8 text-xs text-muted-foreground">
                                <ChevronLeft size={12} /> Previous
                              </button>
                            )}
                            {ct2Step < CT2_CAPSTONE_STEPS.length - 1
                              ? <button onClick={() => setCt2Step(ct2Step + 1)}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[oklch(0.78_0.16_30_/_0.2)] border border-[oklch(0.78_0.16_30_/_0.3)] text-xs text-[oklch(0.88_0.16_30)]">
                                  Next <ChevronRight size={12} />
                                </button>
                              : !ct2Done && (
                                  <motion.button
                                    onClick={() => {
                                      const complete = ct2Answers.filter((a) => a.length > 20).length;
                                      if (complete < 3) { toast.error(`Complete all 3 steps (${complete}/3 done).`); return; }
                                      if (checkedCount < Math.ceil(cs.checklist.length * 0.7)) { toast.error(`Find at least ${Math.ceil(cs.checklist.length * 0.7)} errors first.`); return; }
                                      setCt2Done(true); handleCT2Complete("ct10");
                                    }}
                                    whileHover={{ scale: 1.02 }}
                                    className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-black text-xs font-semibold"
                                    style={{ background: "linear-gradient(to right, oklch(0.78_0.16_30), oklch(0.72_0.2_290))" }}>
                                    <Trophy size={12} /> Submit
                                  </motion.button>
                                )
                            }
                          </div>
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    {/* Completion certificate */}
                    <AnimatePresence>
                      {ct2Done && (
                        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                          className="glass rounded-2xl p-8 border border-[oklch(0.78_0.16_30_/_0.4)] text-center"
                          style={{ background: "linear-gradient(135deg, oklch(0.78_0.16_30_/_0.05), oklch(0.72_0.2_290_/_0.05))" }}>
                          <Trophy size={40} className="mx-auto mb-3" style={{ color: "oklch(0.78_0.16_30)" }} />
                          <h3 className="text-xl font-bold text-foreground mb-2">Clear Thinking — Module 2 Complete</h3>
                          <p className="text-sm text-muted-foreground mb-5 leading-relaxed max-w-md mx-auto">You've completed "Thinking in Real Life." You can now identify misinformation mechanisms, spot statistical traps, distinguish persuasion from manipulation, and apply structured decision-making under uncertainty.</p>
                          <div className="flex justify-center gap-2 flex-wrap">
                            {[
                              { label: "Misinformation-Aware", color: "oklch(0.72_0.2_290)" },
                              { label: "Stat Trapper", color: "oklch(0.68_0.22_20)" },
                              { label: "Influence Literate", color: "oklch(0.72_0.18_150)" },
                              { label: "Decision Analyst", color: "oklch(0.75_0.18_55)" },
                              { label: "Case Certified", color: "oklch(0.78_0.16_30)" },
                            ].map(({ label, color }) => (
                              <span key={label} className="px-3 py-1.5 rounded-full text-xs font-semibold border"
                                style={{ color, borderColor: color, background: `${color.replace("oklch(", "oklch(").replace(")", "_/_0.1)")}` }}>
                                {label}
                              </span>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </div>
        </CT2Shell>
      )}
    </AnimatePresence>
  );

  // Lesson grid
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <button onClick={onBack} className="flex items-center gap-1.5 mb-5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft size={14} /> Back to modules
      </button>
      <div className="glass rounded-2xl p-5 border border-white/8 mb-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Clear Thinking · Module 2</div>
            <h2 className="text-xl font-bold text-foreground">Thinking in Real Life</h2>
            <p className="text-sm text-muted-foreground">Applying critical reasoning to misinformation, statistics, persuasion, and decisions</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold text-foreground">{overallPct}%</div>
            <div className="text-xs text-muted-foreground">{completedLessons.size}/{CT2_LESSON_META.length} complete</div>
          </div>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/8">
          <div className="h-full rounded-full transition-all" style={{ width: `${overallPct}%`, background: "linear-gradient(to right, oklch(0.72_0.2_290), oklch(0.72_0.18_150))" }} />
        </div>
      </div>
      <div className="space-y-3">
        {CT2_LESSON_META.map((lesson, i) => {
          const done = completedLessons.has(lesson.id);
          const locked = i > 0 && !completedLessons.has(CT2_LESSON_META[i - 1].id);
          return (
            <motion.button key={lesson.id} onClick={() => !locked && setActiveLesson(lesson.id)}
              whileHover={!locked ? { scale: 1.005, x: 4 } : {}}
              className={`w-full glass rounded-2xl p-5 border text-left transition-all ${ done ? "border-[oklch(0.72_0.18_150_/_0.3)]" : locked ? "border-white/5 opacity-50 cursor-not-allowed" : "border-white/8 hover:border-white/20" }`}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm"
                  style={{ background: done ? `${lesson.color.replace(")", "_/_0.2)")}` : "oklch(1_0_0_/_0.04)", color: done ? lesson.color : "oklch(0.7_0_0)" }}>
                  {done ? <CheckCircle2 size={20} /> : locked ? <Lock size={16} /> : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-foreground text-sm">{lesson.title}</div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{lesson.subtitle}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={10} /> {lesson.duration}</span>
                  <span className="text-xs flex items-center gap-1" style={{ color: lesson.color }}><Zap size={10} /> +{lesson.xp}</span>
                  {!locked && <ChevronRight size={14} className="text-muted-foreground" />}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
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
  const [activeTab, setActiveTab] = useState<"ailiteracy" | "clearthinking" | "curriculum" | "socratic" | "paths">("ailiteracy");
  const [prefillGoal, setPrefillGoal] = useState("");
  const handleSelectPath = (pathTitle: string) => {
    setPrefillGoal(`I want to learn: ${pathTitle}`);
    setActiveTab("curriculum");
  };
  const tabs = [
    { id: "ailiteracy" as const, label: "AI Literacy", icon: BookOpen, desc: "Intro to AI for Adults" },
    { id: "clearthinking" as const, label: "Clear Thinking", icon: Lightbulb, desc: "Logic & critical reasoning" },
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
                {activeTab === "clearthinking" && <ClearThinkingTab />}
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
