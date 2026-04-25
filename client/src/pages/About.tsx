import { motion } from "framer-motion";
import {
  ArrowRight,
  Brain,
  BookOpen,
  Compass,
  FlaskConical,
  GraduationCap,
  Layers,
  LineChart,
  MessageSquare,
  Network,
  Shield,
  Sparkles,
  Target,
  Telescope,
  Zap,
} from "lucide-react";
import { Link } from "wouter";
import PageWrapper from "@/components/PageWrapper";

const features = [
  {
    icon: GraduationCap,
    title: "Adaptive Courses",
    desc: "Structured curricula — AI Literacy, Clear Thinking, Foundations — that reshape themselves around your prior knowledge, reading level, and learning goals. Every lesson is composed on the fly from a content bank so the same module looks different to a novice and a specialist.",
    color: "oklch(0.75 0.18 55)",
  },
  {
    icon: Telescope,
    title: "Research Workbench",
    desc: "Ask a question and watch the platform build a live concept graph around it, pulling from a growing knowledge base. Follow threads, expand nodes, and get explanations at whatever depth you need — from plain-English to technical.",
    color: "oklch(0.65 0.22 200)",
  },
  {
    icon: MessageSquare,
    title: "Socratic Dialogue",
    desc: "Every concept has a tutor attached to it. Not a chatbot that pastes definitions — a real Socratic partner that asks follow-up questions, catches misconceptions, and pushes you toward understanding rather than memorization.",
    color: "oklch(0.72 0.2 290)",
  },
  {
    icon: Network,
    title: "Mindmaps & Flashcards",
    desc: "Generate study tools from any lesson, article, or topic with one click. Flashcards use spaced repetition calibrated to your confidence ratings. Mindmaps show how concepts connect — because isolated facts are harder to remember and less useful to apply.",
    color: "oklch(0.72 0.18 150)",
  },
  {
    icon: FlaskConical,
    title: "The Lab",
    desc: "A hands-on sandbox for experimenting with AI primitives — prompting, retrieval, evaluation. Learn how these systems actually behave by driving them yourself, with guardrails and worked examples when you get stuck.",
    color: "oklch(0.78 0.16 30)",
  },
  {
    icon: LineChart,
    title: "Progress That Means Something",
    desc: "Your dashboard tracks retention curves, not just completion checkboxes. It knows which concepts you've mastered, which are decaying, and which you're avoiding — and schedules review before you forget.",
    color: "oklch(0.68 0.22 20)",
  },
];

const principles = [
  {
    icon: Brain,
    title: "Personalized by design",
    desc: "No two learners get the same lesson. Content, examples, difficulty, and pace all adapt to your profile — built on established learner-modeling research rather than arbitrary difficulty sliders.",
  },
  {
    icon: Shield,
    title: "Honest about AI",
    desc: "This platform uses AI heavily, and it tells you where and why. It also teaches you to evaluate AI output critically — because the goal is literacy, not dependence.",
  },
  {
    icon: Layers,
    title: "Depth over completion",
    desc: "Traditional courses optimize for finishing. Nexus optimizes for understanding. Productive failure, retrieval practice, and spaced review are baked into the lesson format — not bolted on as optional extras.",
  },
  {
    icon: Zap,
    title: "Built for lifelong learners",
    desc: "Courses are entry points, not destinations. The platform grows with you: start with AI Literacy at 40, move into Clear Thinking, then use the Research Workbench to explore whatever comes next. Your knowledge compounds instead of resetting.",
  },
];

const research = [
  { label: "Mayer's Multimedia Principles", desc: "Coherence, segmenting, signaling, and personalization baked into every lesson format." },
  { label: "Spaced Retrieval", desc: "Review scheduling follows the forgetting curve, not a fixed calendar." },
  { label: "Productive Failure", desc: "Learners work through deliberate struggle before being shown the answer — the format with the strongest transfer evidence." },
  { label: "Self-Determination Theory", desc: "Autonomy, competence, and relatedness cues built into the motivational layer." },
  { label: "Cognitive Load Theory", desc: "Content depth tiers calibrated so working memory isn't overloaded at any tier." },
  { label: "Metacognition", desc: "Confidence ratings on every retrieval question — so you learn what you actually know vs. what feels familiar." },
];

export default function About() {
  return (
    <PageWrapper pageName="about">
      {/* Hero */}
      <section className="py-32 border-b border-border/60">
        <div className="section-container">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex items-center gap-3 mb-8"
            >
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-[oklch(0.75_0.18_55)]" />
              <span className="text-[oklch(0.75_0.18_55)] text-sm font-medium tracking-widest uppercase">About Nexus</span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-5xl md:text-7xl font-bold tracking-tight mb-8 leading-tight"
            >
              Learning that
              <br />
              <span className="text-gradient-gold">actually adapts.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-muted-foreground leading-relaxed max-w-2xl mb-8"
            >
              Nexus is an AI-powered learning and research platform built around a simple idea: the future of
              education is not better videos or fancier quizzes — it is a tutor, a research assistant, and a
              study partner that shape themselves around the person using them.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-wrap gap-3"
            >
              <Link href="/learn">
                <span className="btn-primary cursor-pointer flex items-center gap-2">
                  Explore Courses <ArrowRight size={15} />
                </span>
              </Link>
              <Link href="/research">
                <span className="btn-ghost cursor-pointer flex items-center gap-2">
                  <Telescope size={15} /> Try the Workbench
                </span>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* What Nexus Is */}
      <section className="py-24 border-b border-border/60">
        <div className="section-container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">What Nexus is</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed text-base">
              <p>
                Most learning platforms are a flat catalog: pick a course, watch the videos, take a quiz, collect
                a certificate. The experience is basically identical for a curious beginner and a working
                professional with a decade of context. That is not how people actually learn.
              </p>
              <p>
                Nexus is different. Every lesson is generated from a content bank at the moment you open it,
                using a learner profile that tracks your goals, your reading level, your prior exposure to each
                concept, and what you have recently gotten right or wrong. Two people opening the same lesson
                get different examples, different depths, different vocabularies — because they are different
                learners.
              </p>
              <p>
                On top of the adaptive course layer, there is a Research Workbench for exploring ideas that do
                not live inside a curriculum, a Lab for experimenting with AI primitives directly, and a
                Socratic dialogue partner attached to every concept. The goal is a single coherent environment
                where learning, studying, and researching are the same activity — not three separate apps.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 border-b border-border/60">
        <div className="section-container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 max-w-2xl"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What you can do here</h2>
            <p className="text-muted-foreground">
              The platform is built around six core capabilities. They work together — the same concept flows
              between courses, research, flashcards, and the Lab without losing context.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="card-nexus p-6"
              >
                <div className="flex items-start gap-4">
                  <div
                    className="p-3 rounded-xl shrink-0"
                    style={{
                      background: `color-mix(in oklch, ${f.color} 12%, transparent)`,
                      border: `1px solid color-mix(in oklch, ${f.color} 25%, transparent)`,
                    }}
                  >
                    <f.icon size={20} style={{ color: f.color }} />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground mb-2 text-lg">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="py-24 border-b border-border/60">
        <div className="section-container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 max-w-2xl"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How Nexus is different</h2>
            <p className="text-muted-foreground">
              Four commitments that shape every product decision, from the lesson format down to the UI details.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-5">
            {principles.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="card-nexus p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-[oklch(0.75_0.18_55_/_0.1)] border border-[oklch(0.75_0.18_55_/_0.2)] shrink-0">
                    <p.icon size={18} className="text-[oklch(0.75_0.18_55)]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground mb-2">{p.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Research-Backed */}
      <section className="py-24 border-b border-border/60">
        <div className="section-container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 max-w-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-[oklch(0.65_0.22_200_/_0.12)] border border-[oklch(0.65_0.22_200_/_0.25)]">
                <BookOpen size={16} className="text-[oklch(0.65_0.22_200)]" />
              </div>
              <span className="text-[oklch(0.65_0.22_200)] text-sm font-medium tracking-wide uppercase">
                Research-Backed
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">The science underneath</h2>
            <p className="text-muted-foreground">
              Nexus is built on decades of learning-science research — not vibes. The mechanisms below are
              wired into the platform itself, not listed as bullet points on a marketing page.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {research.map((r, i) => (
              <motion.div
                key={r.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="card-nexus p-5"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={12} className="text-[oklch(0.65_0.22_200)]" />
                  <h4 className="font-semibold text-foreground text-sm">{r.label}</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{r.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Who It's For */}
      <section className="py-24 border-b border-border/60">
        <div className="section-container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Who it's for</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Nexus is built for <span className="text-foreground">curious adults</span> — people who want to
                understand the ideas shaping their world instead of just skimming headlines about them. That
                includes parents, professionals, students, and career-changers who know that "lifelong
                learning" is not a slogan but a daily practice.
              </p>
              <p>
                It is especially useful if you have tried other platforms and bounced off. If MOOCs felt too
                passive, textbooks felt too flat, and YouTube felt too scattered, you are the person Nexus was
                built for. The platform assumes you are intelligent, busy, and want depth without being
                condescended to.
              </p>
            </div>
            <div className="grid sm:grid-cols-3 gap-3 mt-8">
              {[
                { icon: Target, label: "Professionals leveling up" },
                { icon: Compass, label: "Career-changers orienting" },
                { icon: GraduationCap, label: "Lifelong learners going deep" },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="card-nexus p-4 flex items-center gap-3"
                >
                  <Icon size={16} className="text-[oklch(0.75_0.18_55)]" />
                  <span className="text-sm text-foreground">{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Start where it makes sense.</h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              You do not have to commit to anything to begin. Open a course, open the Workbench, or open the
              Lab — the platform will learn what you need as you use it.
            </p>
            <div className="flex justify-center gap-3 flex-wrap">
              <Link href="/learn">
                <motion.button
                  className="btn-primary flex items-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Browse Courses <ArrowRight size={15} />
                </motion.button>
              </Link>
              <Link href="/research">
                <motion.button
                  className="btn-ghost flex items-center gap-2"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Telescope size={15} /> Research Workbench
                </motion.button>
              </Link>
              <Link href="/contact">
                <motion.button
                  className="btn-ghost flex items-center gap-2 text-muted-foreground"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Contact
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </PageWrapper>
  );
}
