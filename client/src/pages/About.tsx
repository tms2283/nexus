import { motion } from "framer-motion";
import { ArrowRight, Code2, Brain, Layers, Zap, MapPin, Github, Linkedin, Mail } from "lucide-react";
import { Link } from "wouter";
import PageWrapper from "@/components/PageWrapper";

const timeline = [
  { year: "2018", title: "First Line of Code", desc: "Wrote a Python script to automate a tedious data task. The feedback loop was immediate and addictive.", tag: "Origin" },
  { year: "2019", title: "Web Development", desc: "Built first production web app — a real-time dashboard. Discovered the power of full-stack architecture.", tag: "Growth" },
  { year: "2021", title: "Systems at Scale", desc: "Designed distributed systems handling millions of daily events. Learned that elegance under pressure is a discipline.", tag: "Scale" },
  { year: "2022", title: "AI Integration", desc: "Deep dive into machine learning and LLM integration. Built first production AI system — a document intelligence platform.", tag: "AI" },
  { year: "2024", title: "Building Nexus", desc: "Created Nexus — an AI-powered learning and research platform designed to fill real gaps in how people learn and do research.", tag: "Now" },
];

const principles = [
  { icon: Code2, title: "Precision over complexity", desc: "The best code is the code that doesn't need to exist. Every abstraction should earn its place." },
  { icon: Brain, title: "Intelligence as infrastructure", desc: "AI isn't a feature — it's a layer of the stack. Systems should learn, adapt, and improve by design." },
  { icon: Layers, title: "Design is engineering", desc: "The separation between design and engineering is a fiction. Great products require both disciplines to be inseparable." },
  { icon: Zap, title: "Speed with intention", desc: "Move fast, but never carelessly. Velocity without clarity creates technical debt that compounds like interest." },
];

export default function About() {
  return (
    <PageWrapper pageName="about">
      {/* Hero */}
      <section className="py-32 border-b border-white/5">
        <div className="container">
          <div className="max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="flex items-center gap-3 mb-8">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-[oklch(0.75_0.18_55)]" />
              <span className="text-[oklch(0.75_0.18_55)] text-sm font-medium tracking-widest uppercase">About</span>
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }} className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
              Tim Schmoyer
            </motion.h1>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }} className="flex items-center gap-2 text-muted-foreground mb-6">
              <MapPin size={15} />
              <span className="text-sm">Fredericksburg, Virginia</span>
            </motion.div>
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="text-lg text-muted-foreground leading-relaxed max-w-2xl mb-8">
              Software engineer and AI systems builder. I work at the intersection of technical rigor and human experience — building systems that are not just functional, but intelligent, adaptive, and genuinely useful. Nexus is my attempt to create the learning platform I wish had existed when I was teaching myself to code.
            </motion.p>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="flex flex-wrap gap-3">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-xl glass border border-white/10 text-sm text-muted-foreground hover:text-foreground hover:border-white/20 transition-all">
                <Github size={15} /> GitHub
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-xl glass border border-white/10 text-sm text-muted-foreground hover:text-foreground hover:border-white/20 transition-all">
                <Linkedin size={15} /> LinkedIn
              </a>
              <Link href="/contact">
                <span className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[oklch(0.75_0.18_55_/_0.12)] border border-[oklch(0.75_0.18_55_/_0.25)] text-sm text-[oklch(0.85_0.18_55)] hover:bg-[oklch(0.75_0.18_55_/_0.18)] transition-all cursor-pointer">
                  <Mail size={15} /> Get in Touch
                </span>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Why I Built This */}
      <section className="py-24 border-b border-white/5">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-3xl">
            <h2 className="text-3xl font-bold mb-6">Why I Built Nexus</h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                The best learning experiences I've had weren't courses or textbooks — they were conversations. A mentor who asked the right questions. A colleague who explained something three different ways until it clicked. A book that connected ideas I'd never thought to link.
              </p>
              <p>
                AI can now do all of that, at scale, personalized to each learner. But most platforms haven't caught up. They're still delivering static video lectures and multiple-choice quizzes. Nexus is built around what's actually possible: adaptive curricula, Socratic dialogue, multi-depth explanations, and research synthesis — all in one place.
              </p>
              <p>
                This is a living platform. It gets smarter the more you interact with it, remembers what you've learned, and adapts to how you think. That's the kind of tool I want to use — and the kind I want to build.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Philosophy */}
      <section className="py-24 border-b border-white/5">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16">
            <h2 className="text-3xl font-bold mb-4">Operating Principles</h2>
            <p className="text-muted-foreground max-w-xl">The beliefs that shape every decision, from architecture to pixel.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-6">
            {principles.map((p, i) => (
              <motion.div key={p.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="p-6 glass rounded-2xl border border-white/10">
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-[oklch(0.75_0.18_55_/_0.1)] border border-[oklch(0.75_0.18_55_/_0.2)]">
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

      {/* Timeline */}
      <section className="py-24 border-b border-white/5">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16">
            <h2 className="text-3xl font-bold mb-4">The Journey</h2>
            <p className="text-muted-foreground max-w-xl">From first script to AI-powered learning platform.</p>
          </motion.div>
          <div className="relative">
            <div className="absolute left-0 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-[oklch(0.75_0.18_55_/_0.4)] via-[oklch(0.65_0.22_200_/_0.3)] to-transparent" />
            <div className="space-y-12">
              {timeline.map((item, i) => (
                <motion.div key={item.year} initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: i * 0.08 }} className={`relative flex ${i % 2 === 0 ? "md:justify-end" : "md:justify-start"} pl-8 md:pl-0`}>
                  <div className="absolute left-0 md:left-1/2 top-3 w-3 h-3 rounded-full bg-[oklch(0.75_0.18_55)] border-2 border-background -translate-x-1/2 shadow-[0_0_12px_oklch(0.75_0.18_55_/_0.6)]" />
                  <div className={`glass rounded-2xl border border-white/10 p-6 max-w-sm ${i % 2 === 0 ? "md:mr-8" : "md:ml-8"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[oklch(0.75_0.18_55)] font-mono text-sm font-bold">{item.year}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs bg-[oklch(0.75_0.18_55_/_0.1)] text-[oklch(0.75_0.18_55)] border border-[oklch(0.75_0.18_55_/_0.2)]">{item.tag}</span>
                    </div>
                    <h3 className="font-bold text-foreground mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="container text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-3xl font-bold mb-4">Ready to start learning?</h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">Explore the platform — adaptive curricula, research tools, and AI-powered concept explanations.</p>
            <div className="flex justify-center gap-4 flex-wrap">
              <Link href="/learn">
                <motion.button className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[oklch(0.75_0.18_55)] text-[oklch(0.08_0.015_260)] font-semibold text-sm hover:bg-[oklch(0.80_0.18_55)] transition-colors" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  Start Learning <ArrowRight size={15} />
                </motion.button>
              </Link>
              <Link href="/contact">
                <motion.button className="flex items-center gap-2 px-7 py-3.5 rounded-xl glass border border-white/15 text-foreground font-medium text-sm hover:border-white/30 transition-all" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  Get in Touch
                </motion.button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </PageWrapper>
  );
}
