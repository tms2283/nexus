import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Mail, LogOut, AlertCircle, Brain, Shield, Zap,
  Activity, BookOpen, TrendingUp, Flame, HeartPulse,
  ChevronDown, ChevronUp, Sparkles, FlaskConical, Target,
  Info, BarChart2, Clock, Award, RefreshCw,
} from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
  LineChart, Line,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import { trpc } from "@/lib/trpc";
import PageWrapper from "@/components/PageWrapper";
import { Link } from "wouter";
import { resetTour } from "@/components/TourOverlay";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProfileTab = "overview" | "mind" | "assessments" | "learning" | "progress";

const TABS: { id: ProfileTab; label: string; icon: typeof Brain }[] = [
  { id: "overview",    label: "Overview",    icon: User },
  { id: "mind",        label: "Mind Map",    icon: Brain },
  { id: "assessments", label: "Assessments", icon: HeartPulse },
  { id: "learning",    label: "Learning",    icon: BookOpen },
  { id: "progress",    label: "Progress",    icon: TrendingUp },
];

// ─── Colors ───────────────────────────────────────────────────────────────────
const PURPLE = "oklch(0.72 0.20 310)";
const GOLD   = "oklch(0.75 0.18 55)";
const TEAL   = "oklch(0.75 0.18 180)";
const RED    = "#ef4444";
const AMBER  = "#f59e0b";
const GREEN  = "#22c55e";

function scoreColor(v: number) {
  if (v >= 0.7) return GREEN;
  if (v >= 0.4) return AMBER;
  return RED;
}

// ─── Instrument Info Database ─────────────────────────────────────────────────

interface ScoreRange {
  max: number;
  label: string;
  color: string;
  interpretation: string;
}

interface InstrumentInfo {
  fullName: string;
  abbrev: string;
  category: string;
  measures: string;
  science: string;
  clinicalUse: string;
  scoreRanges: ScoreRange[];
  maxScore: number;
  reference: string;
  aiPrompt: string;
  subscaleLabels?: Record<string, string>;
}

const INSTRUMENT_INFO: Record<string, InstrumentInfo> = {
  "phq-9": {
    fullName: "Patient Health Questionnaire-9",
    abbrev: "PHQ-9",
    category: "Depression",
    measures: "Depression symptom severity over the past 2 weeks",
    science: "The PHQ-9 was developed by Drs. Robert Spitzer, Janet Williams, and Kurt Kroenke and published in 2001. It operationalizes the DSM-IV criteria for major depressive disorder into a 9-item self-report scale. Each item scores 0–3, yielding a total of 0–27. Validated across dozens of cultures and populations, it demonstrates a sensitivity of 88% and specificity of 88% for detecting major depression at a cut-off of ≥10.",
    clinicalUse: "Widely used in primary care and mental health settings worldwide. A score ≥10 typically warrants clinical attention. The tool tracks treatment response over time — a 5-point change is considered clinically meaningful.",
    scoreRanges: [
      { max: 4,  label: "Minimal",           color: GREEN,   interpretation: "Little to no depressive symptoms detected. Healthy baseline." },
      { max: 9,  label: "Mild",              color: "#84cc16", interpretation: "Mild symptoms present. Watchful waiting and lifestyle monitoring recommended." },
      { max: 14, label: "Moderate",          color: AMBER,   interpretation: "Moderate depression. A treatment plan — therapy or other support — is generally appropriate." },
      { max: 19, label: "Moderately Severe", color: "#f97316", interpretation: "Significant impact on daily functioning. Active treatment strongly recommended." },
      { max: 27, label: "Severe",            color: RED,     interpretation: "Severe symptoms. Immediate clinical evaluation and treatment indicated." },
    ],
    maxScore: 27,
    reference: "Kroenke K, Spitzer RL, Williams JBW. J Gen Intern Med. 2001;16(9):606–613.",
    aiPrompt: "Explain the PHQ-9 depression assessment: what it measures, the neuroscience of depression it captures, and how to interpret different score ranges in everyday terms.",
    subscaleLabels: {},
  },
  "gad-7": {
    fullName: "Generalized Anxiety Disorder Scale-7",
    abbrev: "GAD-7",
    category: "Anxiety",
    measures: "Generalized anxiety disorder symptom severity",
    science: "Developed alongside the PHQ-9 by the same research team, the GAD-7 maps directly onto DSM-IV diagnostic criteria for Generalized Anxiety Disorder. It captures the cognitive (worry, difficulty concentrating) and somatic (restlessness, fatigue, muscle tension) dimensions of anxiety. In validation studies, a cut-off of 10 showed 89% sensitivity and 82% specificity for GAD.",
    clinicalUse: "Used in primary care screening and to monitor anxiety treatment. Scores of 5, 10, and 15 correspond to mild, moderate, and severe anxiety thresholds. The GAD-7 is also sensitive to panic disorder, social anxiety, and PTSD.",
    scoreRanges: [
      { max: 4,  label: "Minimal",  color: GREEN,   interpretation: "Anxiety within normal range. No significant functional impairment expected." },
      { max: 9,  label: "Mild",     color: "#84cc16", interpretation: "Mild anxiety. Self-care strategies such as mindfulness or exercise may help." },
      { max: 14, label: "Moderate", color: AMBER,   interpretation: "Moderate anxiety affecting daily life. Therapy such as CBT is effective at this level." },
      { max: 21, label: "Severe",   color: RED,     interpretation: "Severe anxiety with significant functional impact. Professional evaluation recommended." },
    ],
    maxScore: 21,
    reference: "Spitzer RL, Kroenke K, Williams JBW, Löwe B. Arch Intern Med. 2006;166(10):1092–1097.",
    aiPrompt: "Explain the GAD-7 anxiety assessment: what generalized anxiety disorder is neurologically, how this scale detects it, and what different score levels mean for daily life.",
    subscaleLabels: {},
  },
  "pss": {
    fullName: "Perceived Stress Scale",
    abbrev: "PSS",
    category: "Stress",
    measures: "Subjective perception of stress over the past month",
    science: "Developed by Sheldon Cohen at Carnegie Mellon University in 1983, the PSS measures the degree to which situations in one's life are perceived as uncontrollable, unpredictable, and overwhelming. Unlike objective stressor counts, PSS captures the psychological appraisal of stress — the key variable linking stressful events to health outcomes. Research shows PSS predicts immune function, cardiovascular events, and mental health outcomes independently of objective life events.",
    clinicalUse: "Widely used in health psychology research and workplace wellness programs. The 10-item version (PSS-10) is most common, with scores 0–40. The scale is sensitive to changes from stress management interventions.",
    scoreRanges: [
      { max: 13, label: "Low Stress",      color: GREEN, interpretation: "Good perceived control over life demands. Resilient stress response." },
      { max: 26, label: "Moderate Stress", color: AMBER, interpretation: "Some difficulty managing demands. Stress management techniques may be beneficial." },
      { max: 40, label: "High Stress",     color: RED,   interpretation: "Feeling overwhelmed and out of control. Active stress reduction and support recommended." },
    ],
    maxScore: 40,
    reference: "Cohen S, Kamarck T, Mermelstein R. J Health Soc Behav. 1983;24(4):385–396.",
    aiPrompt: "Explain the Perceived Stress Scale: what it measures psychologically, how subjective stress appraisal affects health differently from objective stressors, and evidence-based strategies for each stress level.",
    subscaleLabels: {},
  },
  "ipip-50": {
    fullName: "IPIP Big Five Personality Inventory",
    abbrev: "IPIP-50",
    category: "Personality",
    measures: "The Five Factor Model of personality: Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism",
    science: "The Five Factor Model (Big Five) emerged from decades of psycholexical research — analyzing personality-descriptive words across languages. Lewis Goldberg, Paul Costa, and Robert McCrae independently converged on five robust dimensions that capture the bulk of personality variance. The IPIP (International Personality Item Pool) version by Goldberg (1999) is open-source and freely available. Each factor predicts meaningful life outcomes: Conscientiousness predicts academic and job performance; Neuroticism predicts mental health risk; Openness predicts creativity.",
    clinicalUse: "Used in career counseling, therapeutic conceptualization, research, and organizational psychology. Scores are most meaningful relative to population norms (mean ≈ 50 in standard T-scores), not in absolute terms.",
    scoreRanges: [
      { max: 20,  label: "Very Low",    color: "#6366f1", interpretation: "Substantially below average on this dimension relative to the general population." },
      { max: 40,  label: "Low",         color: "#818cf8", interpretation: "Below average. See subscale details for dimension-specific meaning." },
      { max: 60,  label: "Average",     color: GREEN,     interpretation: "Within the normal range for this personality dimension." },
      { max: 80,  label: "High",        color: AMBER,     interpretation: "Above average. See subscale details for what this predicts." },
      { max: 100, label: "Very High",   color: PURPLE,    interpretation: "Substantially above average on this dimension." },
    ],
    maxScore: 100,
    reference: "Goldberg LR. Int J Pers Assess. 1999;7:7–16.",
    aiPrompt: "Explain the Big Five personality model (IPIP-50): the scientific history of the Five Factor Model, what each dimension captures neurologically and behaviorally, and how personality traits influence learning and cognition.",
    subscaleLabels: {
      "openness": "Openness to Experience",
      "conscientiousness": "Conscientiousness",
      "extraversion": "Extraversion",
      "agreeableness": "Agreeableness",
      "neuroticism": "Neuroticism (Emotional Stability)",
    },
  },
  "riasec": {
    fullName: "Holland Occupational Themes (RIASEC)",
    abbrev: "RIASEC",
    category: "Interests",
    measures: "Career interest types: Realistic, Investigative, Artistic, Social, Enterprising, Conventional",
    science: "Developed by psychologist John L. Holland at Johns Hopkins University, the RIASEC model proposes that vocational interests reflect personality and that people seek environments that match their types. Decades of research support the hexagonal structure of the model — adjacent types are more similar. The theory predicts job satisfaction, career stability, and academic major choice. Person-environment fit (your type matching your environment) is a stronger predictor of satisfaction than ability alone.",
    clinicalUse: "Used in career counseling, educational planning, and organizational psychology. The three-letter Holland code (highest three types) describes the dominant interest profile. Most careers can be classified using these codes.",
    scoreRanges: [
      { max: 25,  label: "Low Interest",      color: "#94a3b8", interpretation: "This type is not a dominant interest for you." },
      { max: 50,  label: "Moderate Interest", color: TEAL,      interpretation: "Some affinity for this type — may play a supporting role in your ideal environment." },
      { max: 100, label: "Strong Interest",   color: PURPLE,    interpretation: "A dominant interest type. Look for environments where this type is well-represented." },
    ],
    maxScore: 100,
    reference: "Holland JL. Making Vocational Choices: A Theory of Vocational Personalities and Work Environments. 3rd ed. 1997.",
    aiPrompt: "Explain the RIASEC Holland career interest model: what each of the six types captures, the theory of person-environment fit, and how interest types relate to learning preferences and optimal learning environments.",
    subscaleLabels: {
      "R": "Realistic (doers)",
      "I": "Investigative (thinkers)",
      "A": "Artistic (creators)",
      "S": "Social (helpers)",
      "E": "Enterprising (persuaders)",
      "C": "Conventional (organizers)",
    },
  },
  "dass-21": {
    fullName: "Depression Anxiety Stress Scales-21",
    abbrev: "DASS-21",
    category: "Mental Health",
    measures: "Three distinct negative emotional states: depression, anxiety, and stress/tension",
    science: "Developed by Peter Lovibond at the University of New South Wales in 1995, the DASS-21 measures three related but distinct negative affect states. Importantly, it separates 'stress' (tension, irritability, difficulty relaxing) from 'anxiety' (physiological arousal, panic) and 'depression' (low mood, hopelessness). Scores are multiplied by 2 to convert from the 21-item to the 42-item equivalent for norming. Factor analyses consistently recover the three-factor structure across cultures.",
    clinicalUse: "Scores are normed with clinical cut-offs. Because it differentiates the three states, DASS-21 is useful for tailoring treatment — e.g., high stress but normal anxiety suggests different interventions than the reverse. Widely used in clinical research and practice.",
    scoreRanges: [
      { max: 9,   label: "Normal",  color: GREEN, interpretation: "Scores in the normal range for the general population." },
      { max: 13,  label: "Mild",    color: "#84cc16", interpretation: "Mild elevation across one or more subscales." },
      { max: 20,  label: "Moderate", color: AMBER, interpretation: "Moderate — daily functioning may be affected." },
      { max: 27,  label: "Severe",  color: "#f97316", interpretation: "Severe — active management recommended." },
      { max: 42,  label: "Extremely Severe", color: RED, interpretation: "Clinical-level symptoms. Professional support strongly advised." },
    ],
    maxScore: 42,
    reference: "Lovibond SH, Lovibond PF. Manual for the Depression Anxiety Stress Scales. 2nd ed. 1995.",
    aiPrompt: "Explain the DASS-21: what distinguishes depression, anxiety, and stress as psychological constructs, the neuroscience behind each, and evidence-based approaches to managing each dimension.",
    subscaleLabels: {
      "depression": "Depression",
      "anxiety": "Anxiety",
      "stress": "Stress",
    },
  },
  "isi": {
    fullName: "Insomnia Severity Index",
    abbrev: "ISI",
    category: "Sleep",
    measures: "Nature, severity, and impact of insomnia over the past 2 weeks",
    science: "Developed by Charles Morin at Laval University, the ISI has 7 items covering sleep onset, sleep maintenance, early awakening, sleep satisfaction, daytime functioning, noticeability, and distress. It is sensitive to treatment effects and is a gold standard self-report instrument in sleep medicine. Insomnia is highly comorbid with depression and anxiety — treating insomnia often improves other mental health outcomes through sleep's role in emotional regulation and memory consolidation.",
    clinicalUse: "A score ≥15 indicates clinical insomnia warranting treatment. Cognitive Behavioral Therapy for Insomnia (CBT-I) is the first-line treatment, outperforming sleep medication in long-term outcomes.",
    scoreRanges: [
      { max: 7,  label: "No Insomnia",      color: GREEN,    interpretation: "Sleep quality within normal range. Good sleep hygiene is maintaining healthy patterns." },
      { max: 14, label: "Subthreshold",     color: "#84cc16", interpretation: "Some sleep difficulty but not clinical insomnia. Sleep hygiene improvements may help." },
      { max: 21, label: "Moderate Insomnia", color: AMBER,   interpretation: "Clinically significant insomnia. CBT-I or consultation with a sleep specialist is recommended." },
      { max: 28, label: "Severe Insomnia",  color: RED,      interpretation: "Severe insomnia with significant daytime impairment. Clinical evaluation strongly recommended." },
    ],
    maxScore: 28,
    reference: "Morin CM, et al. Sleep. 2011;34(5):601–608.",
    aiPrompt: "Explain the Insomnia Severity Index: the neuroscience of sleep and why insomnia affects cognition, learning, and mood, plus evidence-based treatments like CBT-I.",
    subscaleLabels: {},
  },
  "brs": {
    fullName: "Brief Resilience Scale",
    abbrev: "BRS",
    category: "Resilience",
    measures: "The ability to recover from stress",
    science: "Developed by Bruce Smith at the University of New Mexico, the BRS uniquely measures resilience as a recovery process rather than a static trait. Unlike scales that measure 'resources' (optimism, social support), BRS directly assesses the tendency to bounce back after adversity. Research links resilience to reduced burnout, better health recovery after illness, and maintained performance under chronic stress. Resilience is malleable and can be cultivated through mindfulness, social connection, and purpose.",
    clinicalUse: "Mean score of 3.0 = average resilience. Scores below 3.0 suggest vulnerability to prolonged stress reactions. Used in military, healthcare worker, and student populations.",
    scoreRanges: [
      { max: 2.99, label: "Low Resilience",     color: RED,   interpretation: "Difficulty bouncing back from setbacks. Targeted resilience-building may be beneficial." },
      { max: 4.29, label: "Normal Resilience",  color: GREEN, interpretation: "Average ability to recover from stress. Resilience practices can strengthen this further." },
      { max: 5.0,  label: "High Resilience",    color: TEAL,  interpretation: "Strong recovery capacity. You tend to adapt well to adversity." },
    ],
    maxScore: 5,
    reference: "Smith BW, et al. Int J Behav Med. 2008;15(3):194–200.",
    aiPrompt: "Explain the Brief Resilience Scale: what psychological resilience is neurologically, how it protects against burnout and mental health decline, and evidence-based ways to build it.",
    subscaleLabels: {},
  },
  "swls": {
    fullName: "Satisfaction with Life Scale",
    abbrev: "SWLS",
    category: "Well-being",
    measures: "Global cognitive judgment of life satisfaction",
    science: "Created by Ed Diener at the University of Illinois in 1985, the SWLS is a cornerstone instrument in positive psychology and well-being research. It captures eudaimonic (meaning-based) well-being through cognitive appraisal of life, distinct from hedonic mood measures. Cross-cultural research shows life satisfaction predicts health outcomes, longevity, productivity, and social relationships. Diener's research established that life satisfaction is relatively stable but malleable to circumstances — relationships and purpose matter more than income beyond a threshold.",
    clinicalUse: "Normative scores vary by population. Scores below 20 suggest areas for life satisfaction intervention. Used extensively in positive psychology interventions and quality of life research.",
    scoreRanges: [
      { max: 9,  label: "Extremely Dissatisfied", color: RED,     interpretation: "Significant dissatisfaction across life domains. Well-being interventions could be transformative." },
      { max: 14, label: "Dissatisfied",           color: "#f97316", interpretation: "Below average life satisfaction. Identifying and addressing key domains may help." },
      { max: 19, label: "Slightly Below Average", color: AMBER,   interpretation: "Slightly below average. Minor improvements in key areas could shift this meaningfully." },
      { max: 24, label: "Average",                color: "#84cc16", interpretation: "Average life satisfaction. Most areas are going reasonably well." },
      { max: 29, label: "Satisfied",              color: GREEN,   interpretation: "High life satisfaction. Strong sense of meaning and contentment." },
      { max: 35, label: "Extremely Satisfied",    color: TEAL,    interpretation: "Exceptional life satisfaction — top 10–15% of the population." },
    ],
    maxScore: 35,
    reference: "Diener E, et al. J Pers Assess. 1985;49(1):71–75.",
    aiPrompt: "Explain the Satisfaction with Life Scale and positive psychology research on well-being: what drives life satisfaction, the difference between hedonic and eudaimonic well-being, and evidence-based ways to increase life satisfaction.",
    subscaleLabels: {},
  },
  "maas": {
    fullName: "Mindful Attention Awareness Scale",
    abbrev: "MAAS",
    category: "Mindfulness",
    measures: "Dispositional mindfulness — the tendency to be attentive and aware in daily life",
    science: "Developed by Kirk Warren Brown and Richard Ryan at the University of Rochester in 2003, the MAAS measures trait mindfulness as a dispositional quality (not just during meditation). Higher MAAS scores predict greater emotional well-being, less psychological distress, and better physical health. Neuroscience research shows mindful individuals show greater prefrontal cortex activation and reduced amygdala reactivity — correlated with better emotional regulation. Mindfulness is trainable: 8-week MBSR programs reliably increase MAAS scores.",
    clinicalUse: "Used in clinical and research contexts to measure baseline mindfulness and track changes from mindfulness-based interventions (MBSR, MBCT). Average community score is approximately 4.0.",
    scoreRanges: [
      { max: 2.5, label: "Low Mindfulness",    color: RED,   interpretation: "Operating largely on autopilot. Mindfulness training could significantly benefit attention and emotional regulation." },
      { max: 3.5, label: "Below Average",      color: AMBER, interpretation: "Some mindful moments but mostly habitual responding. Mindfulness practice recommended." },
      { max: 4.5, label: "Average",            color: GREEN, interpretation: "Average dispositional mindfulness. Regular practice can deepen awareness further." },
      { max: 6.0, label: "High Mindfulness",   color: TEAL,  interpretation: "Strong present-moment awareness. Associated with greater emotional resilience and well-being." },
    ],
    maxScore: 6,
    reference: "Brown KW, Ryan RM. J Pers Soc Psychol. 2003;84(4):822–848.",
    aiPrompt: "Explain dispositional mindfulness as measured by the MAAS: the neuroscience of mindful attention, how it differs from meditation practice, and evidence-based methods to cultivate present-moment awareness.",
    subscaleLabels: {},
  },
  "pcss": {
    fullName: "Post-Concussion Symptom Scale",
    abbrev: "PCSS",
    category: "Cognitive",
    measures: "Cognitive and somatic symptoms following head injury or cognitive overload",
    science: "Originally developed for sports concussion assessment, PCSS captures 22 symptoms across cognitive (attention, memory, concentration), somatic (headache, nausea, vision), emotional (anxiety, irritability), and sleep domains. In the context of cognitive wellness, it detects cognitive fatigue and overload symptoms. Cognitive resilience research shows these symptoms respond to graded return-to-activity protocols.",
    clinicalUse: "Total scores above 12–20 suggest clinically significant symptom burden. Used in sports medicine, neurology, and cognitive rehabilitation.",
    scoreRanges: [
      { max: 12, label: "Minimal",  color: GREEN, interpretation: "Little to no significant cognitive or somatic symptoms." },
      { max: 28, label: "Mild",     color: "#84cc16", interpretation: "Mild symptom burden. Rest and reduced cognitive load may help." },
      { max: 52, label: "Moderate", color: AMBER, interpretation: "Moderate symptoms affecting daily functioning. Activity modification recommended." },
      { max: 132, label: "Severe",  color: RED,   interpretation: "Significant symptom burden. Medical evaluation recommended." },
    ],
    maxScore: 132,
    reference: "Lovell MR, Collins MW. J Head Trauma Rehabil. 1998;13(2):1–9.",
    aiPrompt: "Explain the post-concussion symptom scale and cognitive fatigue: what happens neurologically during cognitive overload, why these symptoms emerge, and evidence-based recovery approaches.",
    subscaleLabels: {
      "cognitive": "Cognitive",
      "somatic": "Somatic",
      "emotional": "Emotional",
      "sleep": "Sleep",
    },
  },
};

function getInstrumentInfo(id: string): InstrumentInfo | null {
  const normalized = id.toLowerCase().replace(/\s+/g, "-");
  if (INSTRUMENT_INFO[normalized]) return INSTRUMENT_INFO[normalized];
  for (const key of Object.keys(INSTRUMENT_INFO)) {
    if (normalized.includes(key) || key.includes(normalized)) return INSTRUMENT_INFO[key];
  }
  return null;
}

function getScoreRange(info: InstrumentInfo, score: number): ScoreRange | null {
  return info.scoreRanges.find((r) => score <= r.max) ?? info.scoreRanges[info.scoreRanges.length - 1];
}

// ─── Trait Descriptions ───────────────────────────────────────────────────────

const TRAIT_DESCRIPTIONS: Record<string, { desc: string; high: string; low: string; science: string }> = {
  "Exploration": {
    desc: "How broadly you explore topics and seek new information",
    high: "You explore widely, sampling many topics and approaches. Strong breadth of engagement.",
    low: "You prefer depth over breadth — focused, targeted learning rather than wide exploration.",
    science: "Related to 'Openness to Experience' in the Big Five model. High exploration correlates with intellectual curiosity, creativity, and stronger long-term memory formation through diverse encoding.",
  },
  "Focus": {
    desc: "Consistency and depth of attention during learning sessions",
    high: "You sustain deep focus across sessions. Strong concentration and follow-through.",
    low: "You tend toward shorter, more fragmented attention spans. Structured techniques like Pomodoro may help.",
    science: "Focus consistency maps to 'Conscientiousness' and executive function. Prefrontal cortex engagement during sustained attention predicts learning efficiency. Trainable through deliberate practice.",
  },
  "Social": {
    desc: "Tendency to engage with collaborative and social learning features",
    high: "You learn well in social contexts. Collaborative discussion and peer learning are your strengths.",
    low: "You prefer independent study. Solitary, self-directed learning suits your style.",
    science: "Social orientation in learning activates the reward system differently from solo work. Social learning (observational learning, collaborative sense-making) leverages mirror neuron systems and can deepen encoding.",
  },
  "Persistence": {
    desc: "How long you continue when facing challenging or frustrating content",
    high: "High frustration tolerance. You persist through difficulty — a major predictor of mastery.",
    low: "You tend to disengage when content becomes challenging. Metacognitive strategies may help.",
    science: "Maps to 'grit' (Duckworth) and 'growth mindset' (Dweck). Friction tolerance predicts achievement beyond IQ or prior knowledge. Trainable through deliberate exposure to productive struggle.",
  },
  "Stability": {
    desc: "Emotional consistency during learning — inverse of emotional volatility",
    high: "Emotionally stable learning pattern. Consistent performance across varied content types.",
    low: "Emotional volatility during learning. Performance varies with mood and content difficulty.",
    science: "Inverse of Neuroticism (Big Five). Emotional stability during learning protects working memory from anxiety-related interference. High-stakes contexts increase volatility in lower-stability learners.",
  },
  "Confidence": {
    desc: "Self-efficacy in learning tasks — belief in ability to succeed",
    high: "Strong self-efficacy. You approach new material believing you can master it — a powerful predictor of success.",
    low: "Lower confidence may lead to avoidance or self-handicapping. Building small wins helps scaffold confidence.",
    science: "Bandura's self-efficacy theory (1977). Confidence directly affects task choice, effort level, and persistence. Neurologically, confident learning states activate the dopaminergic reward prediction circuitry differently.",
  },
};

// ─── Shared Components ────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Brain; label: string; value: string | number; color: string }) {
  return (
    <div className="card-nexus p-4 text-center">
      <Icon size={20} className="mx-auto mb-2" style={{ color }} />
      <div className="text-xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-bold text-foreground">{title}</h2>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="card-nexus p-6 text-center text-muted-foreground text-sm">{message}</div>
  );
}

// ─── AI Dive Deeper Panel ─────────────────────────────────────────────────────

function AIDiveDeeper({ concept, cookieId, color = PURPLE }: { concept: string; cookieId?: string; color?: string }) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const mut = trpc.ai.explainConcept.useMutation({
    onSuccess: (d) => setResult(d.explanation),
  });

  function handleDive() {
    if (!open) {
      setOpen(true);
      if (!result) mut.mutate({ concept, cookieId, level: "expert" });
    } else {
      setOpen(false);
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <button
        onClick={handleDive}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
          background: `oklch(0.72 0.20 310 / 0.10)`, color,
          border: `1px solid oklch(0.72 0.20 310 / 0.25)`, cursor: "pointer",
          transition: "all 0.15s",
        }}
      >
        <Sparkles size={13} />
        {open ? "Hide AI Insight" : "Dive Deeper with AI"}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ marginTop: 10, padding: "14px 16px", borderRadius: 10, background: "oklch(0.72 0.20 310 / 0.06)", border: "1px solid oklch(0.72 0.20 310 / 0.15)" }}>
              {mut.isPending ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--muted-foreground)", fontSize: 13 }}>
                  <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid oklch(0.72 0.20 310 / 0.3)", borderTopColor: PURPLE, animation: "spin 0.8s linear infinite" }} />
                  <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                  Generating insight…
                </div>
              ) : result ? (
                <p style={{ fontSize: 13, color: "var(--foreground)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{result}</p>
              ) : (
                <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>Could not load AI insight. Please try again.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Burnout Gauge ────────────────────────────────────────────────────────────
function BurnoutGauge({ score, label }: { score: number; label: string }) {
  const pct = Math.round(score * 100);
  const color = score < 0.35 ? GREEN : score < 0.65 ? AMBER : RED;
  const circumference = 2 * Math.PI * 42;

  return (
    <div style={{ textAlign: "center" }}>
      <svg width={120} height={80} viewBox="0 0 120 80">
        <path d="M 16 72 A 52 52 0 0 1 104 72" fill="none" stroke="var(--surface-2)" strokeWidth={10} strokeLinecap="round" />
        <path
          d="M 16 72 A 52 52 0 0 1 104 72"
          fill="none" stroke={color} strokeWidth={10} strokeLinecap="round"
          strokeDasharray={`${circumference * 0.75}`}
          strokeDashoffset={`${circumference * 0.75 * (1 - pct / 100)}`}
        />
        <text x={60} y={68} textAnchor="middle" fontSize={18} fontWeight={700} fill="currentColor">{pct}%</text>
      </svg>
      <p style={{ fontSize: 13, fontWeight: 600, color, marginTop: -8 }}>{label}</p>
    </div>
  );
}

// ─── Optimal Times Heatmap ────────────────────────────────────────────────────
function OptimalTimesHeatmap({ data }: { data: Array<{ hour: number; day: number; focus_probability: number }> }) {
  const DAYS  = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const HOURS = Array.from({ length: 24 }, (_, i) => i);
  const lookup = new Map<string, number>();
  data.forEach((d) => lookup.set(`${d.day}-${d.hour}`, d.focus_probability));

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "36px repeat(24, 1fr)", gap: 3, minWidth: 600 }}>
        <div />
        {HOURS.map((h) => (
          <div key={h} style={{ fontSize: 9, color: "var(--muted-foreground)", textAlign: "center" }}>{h}</div>
        ))}
        {DAYS.map((day, di) => (
          <>
            <div key={day} style={{ fontSize: 10, color: "var(--muted-foreground)", display: "flex", alignItems: "center" }}>{day}</div>
            {HOURS.map((h) => {
              const val = lookup.get(`${di}-${h}`) ?? 0;
              return (
                <div
                  key={`${di}-${h}`}
                  title={`${day} ${h}:00 — ${Math.round(val * 100)}% focus`}
                  style={{
                    height: 14, borderRadius: 2,
                    background: val > 0 ? `oklch(0.72 0.20 310 / ${0.15 + val * 0.85})` : "var(--surface-2)",
                  }}
                />
              );
            })}
          </>
        ))}
      </div>
      <p style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 8 }}>Darker = higher predicted focus probability · Hours 0–23</p>
    </div>
  );
}

// ─── Score Arc Gauge ──────────────────────────────────────────────────────────
function ScoreArc({ score, maxScore, color }: { score: number; maxScore: number; color: string }) {
  const pct = Math.min(score / maxScore, 1);
  const circumference = 2 * Math.PI * 30;
  return (
    <svg width={80} height={54} viewBox="0 0 80 54">
      <path d="M 8 50 A 35 35 0 0 1 72 50" fill="none" stroke="var(--surface-2)" strokeWidth={7} strokeLinecap="round" />
      <path
        d="M 8 50 A 35 35 0 0 1 72 50"
        fill="none" stroke={color} strokeWidth={7} strokeLinecap="round"
        strokeDasharray={`${circumference * 0.75}`}
        strokeDashoffset={`${circumference * 0.75 * (1 - pct)}`}
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      <text x={40} y={47} textAnchor="middle" fontSize={13} fontWeight={700} fill="currentColor">{score}</text>
    </svg>
  );
}

// ─── Trait Expandable Card ────────────────────────────────────────────────────
function TraitCard({ trait, value, cookieId }: { trait: string; value: number; cookieId?: string }) {
  const [expanded, setExpanded] = useState(false);
  const info = TRAIT_DESCRIPTIONS[trait];
  const pct = Math.round(value * 100);
  const color = scoreColor(value);

  return (
    <div className="card-nexus" style={{ overflow: "hidden" }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{ width: "100%", padding: "14px 16px", textAlign: "left", background: "transparent", border: "none", cursor: "pointer" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--foreground)" }}>{trait}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color }}>{pct}%</span>
            {expanded ? <ChevronUp size={14} style={{ color: "var(--muted-foreground)" }} /> : <ChevronDown size={14} style={{ color: "var(--muted-foreground)" }} />}
          </div>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: "var(--surface-2)" }}>
          <div style={{ height: "100%", width: `${pct}%`, borderRadius: 3, background: color, transition: "width 0.6s ease" }} />
        </div>
        {info && (
          <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 6 }}>{info.desc}</p>
        )}
      </button>

      <AnimatePresence>
        {expanded && info && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "0 16px 16px" }}>
              <div style={{ padding: "12px 14px", borderRadius: 10, background: "var(--surface-2)", marginBottom: 10 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 4 }}>
                  {pct >= 60 ? "Your profile:" : pct >= 40 ? "Your profile:" : "Your profile:"}
                </p>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.6 }}>
                  {pct >= 60 ? info.high : info.low}
                </p>
              </div>
              <div style={{ padding: "12px 14px", borderRadius: 10, background: "oklch(0.65 0.20 200 / 0.06)", border: "1px solid oklch(0.65 0.20 200 / 0.12)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                  <FlaskConical size={12} style={{ color: TEAL }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: TEAL, textTransform: "uppercase", letterSpacing: 0.8 }}>The Science</span>
                </div>
                <p style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.6 }}>{info.science}</p>
              </div>
              <AIDiveDeeper
                concept={`${trait} as a learning trait: ${info.science} My score is ${pct}%. ${pct >= 60 ? info.high : info.low}`}
                cookieId={cookieId}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Assessment Expandable Card ───────────────────────────────────────────────

type AssessmentRecord = {
  instrumentId: string;
  severity?: string;
  totalScore?: number;
  subscales?: Record<string, number>;
  createdAt: string;
};

function AssessmentCard({ record, cookieId }: { record: AssessmentRecord; cookieId?: string }) {
  const [expanded, setExpanded] = useState(false);
  const info = getInstrumentInfo(record.instrumentId);
  const range = info && record.totalScore !== undefined ? getScoreRange(info, record.totalScore) : null;

  const subscaleData = record.subscales
    ? Object.entries(record.subscales).map(([k, v]) => ({
        name: info?.subscaleLabels?.[k] ?? k,
        value: Math.round(v),
      }))
    : [];

  return (
    <div className="card-nexus" style={{ overflow: "hidden" }}>
      {/* Header row — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{ width: "100%", padding: "16px 18px", textAlign: "left", background: "transparent", border: "none", cursor: "pointer" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Mini score arc */}
          {info && record.totalScore !== undefined && range && (
            <div style={{ flexShrink: 0 }}>
              <ScoreArc score={record.totalScore} maxScore={info.maxScore} color={range.color} />
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)" }}>
                  {info?.fullName ?? record.instrumentId.toUpperCase()}
                </p>
                <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 2 }}>
                  {info?.category} · {new Date(record.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {range && (
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                    background: range.color + "20", color: range.color,
                  }}>
                    {range.label}
                  </span>
                )}
                {expanded
                  ? <ChevronUp size={15} style={{ color: "var(--muted-foreground)" }} />
                  : <ChevronDown size={15} style={{ color: "var(--muted-foreground)" }} />
                }
              </div>
            </div>

            {/* Score interpretation one-liner */}
            {range && (
              <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 6, lineHeight: 1.5 }}>
                {range.interpretation}
              </p>
            )}
          </div>
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "0 18px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Score range legend */}
              {info && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Score Ranges</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {info.scoreRanges.map((r) => (
                      <div
                        key={r.label}
                        style={{
                          display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", borderRadius: 8,
                          background: record.totalScore !== undefined && record.totalScore <= r.max && (info.scoreRanges.findIndex(x => x.label === r.label) === (info.scoreRanges.findIndex(x => record.totalScore! <= x.max)))
                            ? `${r.color}18` : "var(--surface-2)",
                          border: record.totalScore !== undefined && record.totalScore <= r.max && (info.scoreRanges.findIndex(x => x.label === r.label) === (info.scoreRanges.findIndex(x => record.totalScore! <= x.max)))
                            ? `1px solid ${r.color}35` : "1px solid transparent",
                        }}
                      >
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: r.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: r.color, minWidth: 120 }}>{r.label}</span>
                        <span style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{r.interpretation}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Subscale breakdown */}
              {subscaleData.length > 0 && (
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Subscale Breakdown</p>
                  <ResponsiveContainer width="100%" height={subscaleData.length * 36 + 20}>
                    <BarChart layout="vertical" data={subscaleData} margin={{ top: 0, right: 20, bottom: 0, left: 100 }}>
                      <XAxis type="number" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={100} />
                      <Tooltip contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {subscaleData.map((_, i) => (
                          <Cell key={i} fill={PURPLE} fillOpacity={0.75} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* What this measures */}
              {info && (
                <div style={{ padding: "12px 14px", borderRadius: 10, background: "var(--surface-2)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <Info size={12} style={{ color: GOLD }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: GOLD, textTransform: "uppercase", letterSpacing: 0.8 }}>What This Measures</span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.6 }}>{info.measures}</p>
                </div>
              )}

              {/* Science background */}
              {info && (
                <div style={{ padding: "12px 14px", borderRadius: 10, background: "oklch(0.65 0.20 200 / 0.06)", border: "1px solid oklch(0.65 0.20 200 / 0.12)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <FlaskConical size={12} style={{ color: TEAL }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: TEAL, textTransform: "uppercase", letterSpacing: 0.8 }}>The Science</span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.7 }}>{info.science}</p>
                  {info.clinicalUse && (
                    <>
                      <div style={{ height: 1, background: "var(--border)", margin: "10px 0" }} />
                      <p style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.7 }}><strong>Clinical use:</strong> {info.clinicalUse}</p>
                    </>
                  )}
                  <p style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 8, fontStyle: "italic" }}>Ref: {info.reference}</p>
                </div>
              )}

              {/* AI Dive Deeper */}
              <AIDiveDeeper
                concept={info
                  ? `${info.aiPrompt} The user scored ${record.totalScore ?? "N/A"} out of ${info.maxScore} (${range?.label ?? record.severity ?? "unknown"} range).`
                  : `Explain the ${record.instrumentId} psychological assessment and what a score of ${record.totalScore} means.`}
                cookieId={cookieId}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ user, profile, psychProfile, traitsData, burnout, assessmentHistory, cookieId }: {
  user: ReturnType<typeof useAuth>["user"];
  profile: ReturnType<typeof usePersonalization>["profile"];
  psychProfile: Record<string, unknown> | null;
  traitsData: Array<{ trait: string; value: number }> | null;
  burnout: { score: number; label: string } | null;
  assessmentHistory: AssessmentRecord[] | null;
  cookieId?: string;
}) {
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "Recently";

  const radarData = traitsData?.map(({ trait, value }) => ({ trait, value: Math.round(value * 100) })) ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Identity card */}
      <div className="card-nexus p-5 flex items-center gap-5">
        <div style={{ width: 60, height: 60, borderRadius: "50%", background: "oklch(0.75 0.18 55 / 0.15)", border: "2px solid oklch(0.75 0.18 55 / 0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {user?.avatarUrl
            ? <img src={user.avatarUrl} alt="" style={{ width: 60, height: 60, borderRadius: "50%", objectFit: "cover" }} />
            : <User size={26} style={{ color: GOLD }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: 18 }}>{user?.name ?? "Anonymous"}</p>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{user?.email ?? "Not provided"}</p>
          <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 3 }}>Member since {memberSince}</p>
        </div>
        {psychProfile && (
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p style={{ fontSize: 10, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Learn style</p>
            <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, background: "oklch(0.72 0.20 310 / 0.15)", color: PURPLE, fontWeight: 600 }}>
              {String(psychProfile.inferredLearnStyle ?? "—").replace(/-/g, " ")}
            </span>
          </div>
        )}
      </div>

      {/* Key metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 12 }}>
        <StatCard icon={Zap}        label="XP Earned"      value={profile.xp.toLocaleString()} color={GOLD} />
        <StatCard icon={Brain}      label="Level"          value={profile.level}               color={PURPLE} />
        <StatCard icon={Flame}      label="Streak"         value={`${profile.streak}d`}        color={TEAL} />
        {assessmentHistory && <StatCard icon={HeartPulse} label="Assessments" value={assessmentHistory.length} color={GREEN} />}
      </div>

      {/* Radar snapshot */}
      <TraitRadarCard data={radarData} subtitle="Tap 'Mind Map' tab for detailed trait explanations" />

      {/* Burnout quick-view */}
      {burnout && (
        <div className="card-nexus p-5">
          <div style={{ display: "flex", alignItems: "flex-start", gap: 20 }}>
            <BurnoutGauge score={burnout.score} label={burnout.label} />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Burnout Risk Index</p>
              <p style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.6 }}>
                {burnout.score < 0.35
                  ? "You're in good shape. Your learning pace and recovery appear balanced."
                  : burnout.score < 0.65
                  ? "Moderate risk detected. Consider shorter sessions and more recovery time between intense learning blocks."
                  : "High risk. Prioritize rest, reduce session length, and take deliberate breaks. Burnout significantly impairs memory consolidation."}
              </p>
              <AIDiveDeeper
                concept={`Burnout risk in learning contexts: what causes cognitive burnout, how it impairs memory and performance, and evidence-based recovery strategies. Current risk level: ${burnout.label} (${Math.round(burnout.score * 100)}%).`}
                cookieId={cookieId}
              />
            </div>
          </div>
        </div>
      )}

      {/* Quick nav to sections */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
        {[
          { icon: Brain, label: "View detailed trait analysis", tab: "mind", color: PURPLE },
          { icon: HeartPulse, label: "Explore all assessments", tab: "assessments", color: "#ef4444" },
          { icon: BookOpen, label: "See your learning patterns", tab: "learning", color: TEAL },
          { icon: TrendingUp, label: "Check XP & badges", tab: "progress", color: GOLD },
        ].map(({ icon: Icon, label, tab, color }) => (
          <div key={tab} style={{ padding: "14px 16px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--border)", cursor: "default" }}>
            <Icon size={18} style={{ color, marginBottom: 8 }} />
            <p style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Shared Radar ─────────────────────────────────────────────────────────────
function TraitRadarCard({ data, subtitle }: { data: Array<{ trait: string; value: number }>; subtitle: string }) {
  if (data.length === 0) return null;
  return (
    <div className="card-nexus p-5">
      <SectionHeader title="Behavioral Trait Radar" subtitle={subtitle} />
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis dataKey="trait" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
          <Radar name="You" dataKey="value" stroke={PURPLE} fill={PURPLE} fillOpacity={0.22} strokeWidth={2} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Mind Map Tab ─────────────────────────────────────────────────────────────

function MindTab({ psychProfile, traitsData, cookieId }: {
  psychProfile: Record<string, unknown> | null;
  traitsData: Array<{ trait: string; value: number }> | null;
  cookieId?: string;
}) {
  const radarData: Array<{ trait: string; value: number }> = traitsData?.map(({ trait, value }) => ({ trait, value: Math.round(value * 100) })) ?? [];
  const quizAnswers = (psychProfile?.quizAnswers ?? null) as Record<string, string> | null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Psych profile card */}
      {psychProfile ? (
        <div className="card-nexus p-5">
          <SectionHeader title="Your Psychological Profile" subtitle="Inferred from onboarding quiz responses and behavioral signals" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
            {[
              { label: "Background", value: String(psychProfile.inferredBackground ?? "—"), color: GOLD },
              { label: "Primary Goal", value: String(psychProfile.inferredGoal ?? "—"), color: PURPLE },
              { label: "Learning Style", value: String(psychProfile.inferredLearnStyle ?? "—").replace(/-/g, " "), color: TEAL },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ padding: "14px 16px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                <p style={{ fontSize: 10, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{label}</p>
                <p style={{ fontSize: 15, fontWeight: 700, color, textTransform: "capitalize" }}>{value}</p>
              </div>
            ))}
          </div>
          {Array.isArray(psychProfile.inferredInterests) && (psychProfile.inferredInterests as string[]).length > 0 && (
            <div style={{ marginTop: 14 }}>
              <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 600 }}>Inferred Interests</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {(psychProfile.inferredInterests as string[]).map((interest) => (
                  <span key={interest} style={{ padding: "4px 12px", borderRadius: 20, background: "oklch(0.72 0.20 310 / 0.12)", color: PURPLE, fontSize: 12, fontWeight: 500 }}>{interest}</span>
                ))}
              </div>
            </div>
          )}
          <AIDiveDeeper
            concept={`Psychological learning profile analysis: background=${psychProfile.inferredBackground}, goal=${psychProfile.inferredGoal}, learning style=${psychProfile.inferredLearnStyle}, interests=${JSON.stringify(psychProfile.inferredInterests)}. Explain what this profile suggests about optimal learning approaches, potential challenges, and strategies to maximize learning effectiveness.`}
            cookieId={cookieId}
          />
        </div>
      ) : (
        <EmptyState message="Complete your onboarding quiz to unlock your psychological profile." />
      )}

      {/* Behavioral trait radar */}
      <TraitRadarCard data={radarData} subtitle="6 cognitive-behavioral dimensions tracked from your activity · Click any card below to explore" />

      {/* Trait cards — expandable */}
      {traitsData && traitsData.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SectionHeader title="Trait Deep-Dives" subtitle="Expand any trait to see the science and personalized insight" />
          {traitsData.map(({ trait, value }) => (
            <TraitCard key={trait} trait={trait} value={value} cookieId={cookieId} />
          ))}
        </div>
      )}

      {/* Quiz answers */}
      {quizAnswers && Object.keys(quizAnswers).length > 0 && (
        <div className="card-nexus p-5">
          <SectionHeader title="Your Onboarding Responses" subtitle={`${Object.keys(quizAnswers).length} questions answered`} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
            {Object.entries(quizAnswers).map(([qId, answer]) => (
              <div key={qId} style={{ padding: "10px 12px", borderRadius: 10, background: "var(--surface-2)", textAlign: "center" }}>
                <p style={{ fontSize: 10, color: "var(--muted-foreground)", marginBottom: 4 }}>{qId.toUpperCase()}</p>
                <p style={{ fontSize: 18, fontWeight: 900, color: PURPLE }}>{answer}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Assessments Tab ──────────────────────────────────────────────────────────

function AssessmentsTab({ assessmentHistory, cogHistory, cookieId }: {
  assessmentHistory: AssessmentRecord[] | null;
  cogHistory: Array<{ exerciseId: string; accuracyPct: number; createdAt: string }> | null;
  cookieId?: string;
}) {
  const [showAll, setShowAll] = useState(false);

  const assessmentBarData = assessmentHistory
    ? Object.entries(
        assessmentHistory.reduce<Record<string, number[]>>((acc, r) => {
          if (r.totalScore !== undefined) {
            acc[r.instrumentId] = [...(acc[r.instrumentId] ?? []), r.totalScore];
          }
          return acc;
        }, {})
      ).map(([name, scores]) => ({
        name: name.toUpperCase(),
        avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        info: getInstrumentInfo(name),
      }))
    : [];

  const cogBarData = cogHistory
    ? Object.entries(
        cogHistory.reduce<Record<string, number[]>>((acc, r) => {
          acc[r.exerciseId] = [...(acc[r.exerciseId] ?? []), r.accuracyPct];
          return acc;
        }, {})
      ).map(([name, scores]) => ({ name, avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) }))
    : [];

  const displayed = assessmentHistory
    ? (showAll ? assessmentHistory : assessmentHistory.slice(0, 5))
    : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Summary bar chart */}
      {assessmentBarData.length > 0 && (
        <div className="card-nexus p-5">
          <SectionHeader title="Assessment Score Overview" subtitle="Average score per instrument — expand cards below for detailed breakdowns" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={assessmentBarData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <Tooltip
                contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [`${v}`, "Avg Score"]}
              />
              <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                {assessmentBarData.map((d, i) => <Cell key={i} fill={PURPLE} fillOpacity={0.8} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <AIDiveDeeper
            concept={`Psychological assessment summary: ${assessmentBarData.map(d => `${d.name}: ${d.avg}/${d.info?.maxScore ?? "?"}`).join(", ")}. Provide an integrated interpretation of what these scores collectively suggest about mental health, cognitive wellness, and optimal learning conditions.`}
            cookieId={cookieId}
          />
        </div>
      )}

      {/* Individual assessment cards */}
      {displayed.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SectionHeader
            title="Assessment History"
            subtitle="Expand each assessment for score breakdown, clinical context, and AI analysis"
          />
          {displayed.map((r, i) => (
            <AssessmentCard key={`${r.instrumentId}-${i}`} record={r} cookieId={cookieId} />
          ))}
          {assessmentHistory && assessmentHistory.length > 5 && (
            <button
              onClick={() => setShowAll(!showAll)}
              style={{ padding: "10px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, background: "var(--surface-2)", border: "1px solid var(--border)", cursor: "pointer", color: "var(--muted-foreground)" }}
            >
              {showAll ? "Show Less" : `Show All ${assessmentHistory.length} Assessments`}
            </button>
          )}
        </div>
      )}

      {!assessmentHistory || assessmentHistory.length === 0 ? (
        <div className="card-nexus p-6 text-center">
          <HeartPulse size={32} className="mx-auto mb-3" style={{ color: PURPLE, opacity: 0.5 }} />
          <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No assessments yet</p>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)", marginBottom: 16 }}>Complete psychological assessments in Clarity to unlock detailed insights, science-backed explanations, and AI analysis.</p>
          <Link href="/clarity" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 10, background: "oklch(0.72 0.20 310 / 0.15)", color: PURPLE, fontSize: 13, fontWeight: 600, border: "1px solid oklch(0.72 0.20 310 / 0.3)" }}>
            Go to Clarity Assessments
          </Link>
        </div>
      ) : null}

      {/* Cognitive training */}
      <div className="card-nexus p-5">
        <SectionHeader title="Cognitive Training Accuracy" subtitle="Per exercise, averaged across all sessions" />
        {cogBarData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={Math.max(180, cogBarData.length * 38)}>
              <BarChart layout="vertical" data={cogBarData} margin={{ top: 4, right: 16, bottom: 0, left: 100 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} domain={[0, 100]} unit="%" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} width={100} />
                <Tooltip contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => `${v}%`} />
                <Bar dataKey="avg" radius={[0, 4, 4, 0]}>
                  {cogBarData.map((d, i) => <Cell key={i} fill={d.avg >= 70 ? GREEN : d.avg >= 50 ? AMBER : RED} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <AIDiveDeeper
              concept={`Cognitive training performance: ${cogBarData.map(d => `${d.name}: ${d.avg}% accuracy`).join(", ")}. Explain what each cognitive exercise targets neurologically and what these accuracy levels suggest about cognitive strengths and areas for development.`}
              cookieId={cookieId}
            />
          </>
        ) : <EmptyState message="No cognitive training sessions yet. Visit Clarity → Cognitive Training to begin." />}
      </div>
    </div>
  );
}

// ─── Learning Tab ─────────────────────────────────────────────────────────────

function LearningTab({ interests, struggles, optimalTimes, recommendations, cookieId }: {
  interests: Array<{ topic: string; confidence: number; trend?: string }> | null;
  struggles: Array<{ topic: string; frequency: number }> | null;
  optimalTimes: Array<{ hour: number; day: number; focus_probability: number }> | null;
  recommendations: string[] | null;
  cookieId?: string;
}) {
  const interestBarData = interests?.slice(0, 12).map((i) => ({ name: i.topic, value: Math.round(i.confidence * 100) })) ?? [];
  const struggleBarData = struggles?.slice(0, 8).map((s) => ({ name: s.topic, value: s.frequency })) ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Optimal study times */}
      <div className="card-nexus p-5">
        <SectionHeader title="Optimal Study Times" subtitle="Purple = high predicted focus · Based on your session history and performance patterns" />
        {optimalTimes && optimalTimes.length > 0
          ? <OptimalTimesHeatmap data={optimalTimes} />
          : <EmptyState message="Not enough session data yet. Keep studying and this heatmap will fill in." />}
        {optimalTimes && optimalTimes.length > 0 && (
          <AIDiveDeeper
            concept="Circadian rhythms and optimal cognitive performance: how the brain's natural cycles affect learning, memory consolidation, and focus — and how to structure study sessions to match peak cognitive windows."
            cookieId={cookieId}
          />
        )}
      </div>

      {/* Interest map */}
      <div className="card-nexus p-5">
        <SectionHeader title="Interest Map" subtitle="Topics you engage with most, by confidence level" />
        {interestBarData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={Math.max(200, interestBarData.length * 30)}>
              <BarChart layout="vertical" data={interestBarData} margin={{ top: 0, right: 20, bottom: 0, left: 100 }}>
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} unit="%" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={100} />
                <Tooltip contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => `${v}%`} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {interestBarData.map((_, i) => <Cell key={i} fill={PURPLE} fillOpacity={0.65 + (i / interestBarData.length) * 0.35} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </>
        ) : <EmptyState message="Your interest map builds up as you explore content. Check back after a few sessions." />}
      </div>

      {/* Struggle areas */}
      {struggleBarData.length > 0 && (
        <div className="card-nexus p-5">
          <SectionHeader title="Challenge Areas" subtitle="Topics where you've needed more time or retries" />
          <ResponsiveContainer width="100%" height={Math.max(160, struggleBarData.length * 34)}>
            <BarChart layout="vertical" data={struggleBarData} margin={{ top: 0, right: 20, bottom: 0, left: 100 }}>
              <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={100} />
              <Tooltip contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" fill={AMBER} fillOpacity={0.8} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <AIDiveDeeper
            concept={`Learning struggle analysis: topics where I need more time are ${struggleBarData.map(d => d.name).join(", ")}. Explain evidence-based strategies for overcoming difficulty in these areas, including spaced repetition, interleaving, and metacognitive techniques.`}
            cookieId={cookieId}
          />
        </div>
      )}

      {/* AI Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div className="card-nexus p-5">
          <SectionHeader title="Personalized Recommendations" subtitle="AI-generated based on your behavioral patterns" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recommendations.map((r, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "12px 14px", borderRadius: 10, background: "var(--surface-2)", alignItems: "flex-start" }}>
                <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>💡</span>
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.6 }}>{r}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Progress Tab ─────────────────────────────────────────────────────────────

function ProgressTab({ profile, badges }: {
  profile: ReturnType<typeof usePersonalization>["profile"];
  badges: string[];
}) {
  const levelPct = ((profile.xp % 1000) / 1000) * 100;
  const xpToNext = 1000 - (profile.xp % 1000);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* XP / Level */}
      <div className="card-nexus p-6">
        <SectionHeader title="Experience & Level" subtitle="Your Nexus progression" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
          <StatCard icon={Zap}   label="Total XP" value={profile.xp.toLocaleString()} color={GOLD} />
          <StatCard icon={Brain} label="Level"     value={profile.level}               color={PURPLE} />
          <StatCard icon={Flame} label="Streak"    value={`${profile.streak}d`}        color={TEAL} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Level {profile.level}</span>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{xpToNext} XP to Level {profile.level + 1}</span>
          </div>
          <div style={{ height: 10, borderRadius: 5, background: "var(--surface-2)" }}>
            <div style={{ height: "100%", width: `${levelPct}%`, borderRadius: 5, background: GOLD, transition: "width 0.6s ease" }} />
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="card-nexus p-5">
        <SectionHeader title="Badges Earned" subtitle={`${badges.length} badge${badges.length !== 1 ? "s" : ""} collected`} />
        {badges.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {badges.map((badge) => (
              <div key={badge} style={{ padding: "8px 14px", borderRadius: 20, background: "oklch(0.75 0.18 55 / 0.12)", border: "1px solid oklch(0.75 0.18 55 / 0.25)", fontSize: 13, color: GOLD, fontWeight: 600 }}>
                🏅 {badge}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="No badges yet — keep learning and engaging to earn them!" />
        )}
      </div>

      {/* How to earn XP */}
      <div className="card-nexus p-5">
        <SectionHeader title="How to Earn XP" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
          {[
            { action: "Complete a lesson",      xp: "+25 XP" },
            { action: "Pass a quiz",            xp: "+50 XP" },
            { action: "Daily streak",           xp: "+10 XP" },
            { action: "Complete onboarding",    xp: "+50 XP" },
            { action: "Use AI assistant",       xp: "+5 XP" },
            { action: "Clarity assessment",     xp: "+30 XP" },
            { action: "Cognitive training",     xp: "+20 XP" },
            { action: "Socratic session",       xp: "+15 XP" },
          ].map(({ action, xp }) => (
            <div key={action} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 10, background: "var(--surface-2)" }}>
              <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{action}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: GOLD }}>{xp}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const { profile } = usePersonalization();
  const [tab, setTab] = useState<ProfileTab>("overview");

  const psychProfileQ = trpc.auth.getMyPsychProfile.useQuery(undefined, { enabled: isAuthenticated });
  const traitsQ       = trpc.behavioral.getTraits.useQuery(undefined, { retry: false });
  const burnoutQ      = trpc.behavioral.getBurnoutRisk.useQuery(undefined, { retry: false });
  const optimalQ      = trpc.behavioral.getOptimalTimes.useQuery(undefined, { retry: false });
  const interestsQ    = trpc.behavioral.getInterests.useQuery(undefined, { retry: false });
  const strugglesQ    = trpc.behavioral.getStruggles.useQuery(undefined, { retry: false });
  const insightsQ     = trpc.behavioral.getLearningInsights.useQuery(undefined, { retry: false });
  const assessHistQ   = trpc.clarity.getAssessmentHistory.useQuery({ cookieId: profile.cookieId, limit: 50 }, { enabled: !!profile.cookieId });
  const cogHistQ      = trpc.clarity.getCogTrainingHistory.useQuery({ cookieId: profile.cookieId, limit: 100 }, { enabled: !!profile.cookieId });

  if (isLoading) {
    return (
      <PageWrapper pageName="Profile">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: GOLD }} />
        </div>
      </PageWrapper>
    );
  }

  if (!isAuthenticated) {
    return (
      <PageWrapper pageName="Profile">
        <div className="max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-nexus p-8 text-center">
            <AlertCircle size={48} className="mx-auto mb-4" style={{ color: GOLD }} />
            <h1 className="text-2xl font-bold text-foreground mb-2">You're browsing as a guest</h1>
            <p className="text-muted-foreground mb-6">Create an account to save your progress and unlock your full psychological profile.</p>
            <div className="flex gap-3 justify-center">
              <Link href="/register" className="px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity" style={{ background: GOLD, color: "#000" }}>Create Account</Link>
              <Link href="/login" className="btn-ghost">Sign In</Link>
            </div>
          </motion.div>
        </div>
      </PageWrapper>
    );
  }

  // ── Transform data ──────────────────────────────────────────────────────────

  const TRAIT_LABELS: Record<string, string> = {
    exploration_breadth: "Exploration",
    focus_consistency: "Focus",
    social_orientation: "Social",
    friction_tolerance: "Persistence",
    emotional_volatility: "Stability",
    confidence: "Confidence",
  };
  const rawTraits = (traitsQ.data as { traits?: Record<string, number> } | null)?.traits;
  const traitsData = rawTraits
    ? Object.entries(rawTraits).map(([k, v]) => ({ trait: TRAIT_LABELS[k] ?? k, value: v }))
    : null;

  const burnout = (burnoutQ.data as unknown as { score: number; label: string } | null) ?? null;

  const DAY_MAP: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
  const rawOptimal = (optimalQ.data as unknown as { optimal_times?: Array<{ hour: number; day: number | string; focus_probability: number }> } | null)?.optimal_times;
  const optimalTimes = rawOptimal
    ? rawOptimal.map((t) => ({ hour: t.hour, day: typeof t.day === "string" ? (DAY_MAP[t.day] ?? 0) : t.day, focus_probability: t.focus_probability }))
    : null;

  const interests    = (interestsQ.data as unknown as { interests?: Array<{ topic: string; confidence: number; trend?: string }> } | null)?.interests ?? null;
  const struggles    = (strugglesQ.data as unknown as { struggles?: Array<{ topic: string; frequency: number }> } | null)?.struggles ?? null;

  const rawRecs      = (insightsQ.data as unknown as { recommendations?: Array<{ message: string } | string> } | null)?.recommendations;
  const recommendations = rawRecs ? rawRecs.map((r) => (typeof r === "string" ? r : r.message)) : null;

  const assessHistory: AssessmentRecord[] | null = assessHistQ.data
    ? assessHistQ.data.map((r) => ({
        instrumentId: r.instrumentId,
        severity: r.severity ?? undefined,
        totalScore: r.totalScore ?? undefined,
        subscales: (r as { subscales?: Record<string, number> }).subscales,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      }))
    : null;

  const cogHistory = cogHistQ.data
    ? cogHistQ.data.map((r) => ({
        exerciseId: r.exerciseId,
        accuracyPct: r.accuracyPct,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      }))
    : null;

  const psychProfile = psychProfileQ.data as Record<string, unknown> | null;
  const cookieId = profile.cookieId;

  return (
    <PageWrapper pageName="Profile">
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Your Profile</h1>
              <p className="text-muted-foreground text-sm mt-1">Psychological insights, behavioral traits, and learning patterns</p>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                onClick={() => { resetTour(); window.location.reload(); }}
                style={{ fontSize: 12, color: "var(--muted-foreground)", background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}
                title="Replay the onboarding tour"
              >
                🗺️ Restart Tour
              </button>
              <button onClick={logout} className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors">
                <LogOut size={15} /> Sign Out
              </button>
            </div>
          </div>
        </motion.div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, overflowX: "auto", padding: "2px 0" }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10,
                fontSize: 13, fontWeight: tab === id ? 700 : 500, whiteSpace: "nowrap",
                background: tab === id ? "oklch(0.72 0.20 310 / 0.15)" : "transparent",
                color: tab === id ? PURPLE : "var(--muted-foreground)",
                border: tab === id ? "1px solid oklch(0.72 0.20 310 / 0.3)" : "1px solid transparent",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          {tab === "overview" && (
            <OverviewTab user={user} profile={profile} psychProfile={psychProfile} traitsData={traitsData} burnout={burnout} assessmentHistory={assessHistory} cookieId={cookieId} />
          )}
          {tab === "mind" && (
            <MindTab psychProfile={psychProfile} traitsData={traitsData} cookieId={cookieId} />
          )}
          {tab === "assessments" && (
            <AssessmentsTab assessmentHistory={assessHistory} cogHistory={cogHistory} cookieId={cookieId} />
          )}
          {tab === "learning" && (
            <LearningTab interests={interests} struggles={struggles} optimalTimes={optimalTimes} recommendations={recommendations} cookieId={cookieId} />
          )}
          {tab === "progress" && (
            <ProgressTab profile={profile} badges={profile.badges ?? []} />
          )}
        </motion.div>
      </div>
    </PageWrapper>
  );
}
