import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Github, Tag, ArrowRight } from "lucide-react";
import PageWrapper from "@/components/PageWrapper";
import { usePersonalization } from "@/contexts/PersonalizationContext";

interface Project {
  id: string;
  title: string;
  description: string;
  longDesc: string;
  category: string;
  tags: string[];
  year: string;
  status: "live" | "archived" | "in-progress";
  color: string;
  highlights: string[];
  demoUrl?: string;
  githubUrl?: string;
}

const projects: Project[] = [
  {
    id: "p1", title: "Nexus Intelligence Platform", description: "Enterprise AI document analysis platform with real-time extraction, semantic search, and multi-model orchestration.",
    longDesc: "A production-grade document intelligence system processing 50,000+ documents daily. Built with a multi-model orchestration layer that routes queries to the optimal LLM based on task type, cost, and latency requirements. Features semantic chunking, vector search, and a custom fine-tuned extraction model.",
    category: "AI Systems", tags: ["Python", "FastAPI", "LangChain", "PostgreSQL", "React", "OpenAI"], year: "2024", status: "live", color: "oklch(0.75 0.18 55)",
    highlights: ["50K+ documents processed daily", "Multi-model LLM orchestration", "Sub-200ms semantic search", "99.7% uptime SLA"],
    demoUrl: "https://example.com", githubUrl: "https://github.com",
  },
  {
    id: "p2", title: "Realtime Collaborative Canvas", description: "Multiplayer design tool with CRDT-based conflict resolution, WebRTC cursors, and AI-assisted layout suggestions.",
    longDesc: "A Figma-inspired collaborative canvas built from scratch with operational transformation and CRDT algorithms for conflict-free real-time editing. Supports 100+ simultaneous users per canvas with sub-50ms sync latency using WebSockets and a custom diff engine.",
    category: "Web Platform", tags: ["TypeScript", "React", "WebSockets", "CRDT", "Canvas API", "Redis"], year: "2023", status: "live", color: "oklch(0.65 0.22 200)",
    highlights: ["100+ simultaneous users", "Sub-50ms sync latency", "CRDT conflict resolution", "AI layout suggestions"],
  },
  {
    id: "p3", title: "DataVerse Analytics", description: "Real-time analytics dashboard with custom visualization engine, anomaly detection, and natural language querying.",
    longDesc: "An analytics platform that replaces SQL queries with natural language. Users describe what they want to see, and the system generates the query, executes it, and renders the optimal visualization. Built with a custom charting engine on top of D3.js for performance with large datasets.",
    category: "Data Visualization", tags: ["D3.js", "Python", "PostgreSQL", "React", "NLP", "WebGL"], year: "2023", status: "live", color: "oklch(0.65 0.22 290)",
    highlights: ["Natural language to SQL", "Custom WebGL renderer", "Anomaly detection ML", "10M+ data points rendered"],
  },
  {
    id: "p4", title: "Adaptive Learning Engine", description: "Personalized education platform that adjusts difficulty, pacing, and content based on learner cognitive patterns.",
    longDesc: "An edtech platform that models each learner's knowledge state using a Bayesian knowledge tracing algorithm. The system dynamically selects the next learning item to maximize knowledge gain while minimizing cognitive load. Integrated with spaced repetition and active recall techniques.",
    category: "AI Systems", tags: ["Python", "scikit-learn", "React", "PostgreSQL", "FastAPI"], year: "2022", status: "live", color: "oklch(0.70 0.20 150)",
    highlights: ["Bayesian knowledge tracing", "40% faster learning outcomes", "Spaced repetition engine", "Adaptive difficulty"],
  },
  {
    id: "p5", title: "Distributed Event Mesh", description: "High-throughput event streaming infrastructure handling 2M events/second with guaranteed delivery and replay.",
    longDesc: "A custom event streaming system built for a fintech client requiring sub-millisecond latency and guaranteed message delivery. Implements a log-structured storage engine with compaction, consumer groups, and exactly-once semantics without Kafka's operational overhead.",
    category: "Infrastructure", tags: ["Go", "gRPC", "RocksDB", "Kubernetes", "Prometheus"], year: "2022", status: "archived", color: "oklch(0.75 0.18 55)",
    highlights: ["2M events/second throughput", "Sub-1ms p99 latency", "Exactly-once semantics", "Zero data loss guarantee"],
  },
  {
    id: "p6", title: "Generative UI System", description: "LLM-powered component generation system that creates production-ready React components from natural language descriptions.",
    longDesc: "A developer tool that bridges the gap between design intent and implementation. Describe a UI component in plain English, and the system generates typed React + Tailwind code, renders a live preview, and iterates based on feedback. Includes a constraint system to enforce design tokens.",
    category: "Developer Tools", tags: ["TypeScript", "React", "GPT-4", "AST", "Tailwind"], year: "2024", status: "in-progress", color: "oklch(0.65 0.22 200)",
    highlights: ["Natural language to React", "Design token enforcement", "Live preview rendering", "Iterative refinement"],
  },
  {
    id: "p7", title: "Nexus Learning Platform", description: "This site — an AI-powered learning platform that adapts to every visitor, teaches through Socratic dialogue, and fills real gaps in EdTech.",
    longDesc: "Nexus — built with React 19, TypeScript, tRPC, and Gemini AI. Features cookie-based behavioral tracking, personalized AI greetings, a gamification layer with XP and badges, a Depth Engine for multi-level concept explanation, Research Forge for document analysis, and an adaptive curriculum generator. Every session is unique.",
    category: "Web Platform", tags: ["React", "TypeScript", "tRPC", "Gemini AI", "Framer Motion", "MySQL"], year: "2024", status: "live", color: "oklch(0.65 0.22 290)",
    highlights: ["Gemini AI integration", "Cookie-based personalization", "Gamification system", "Adaptive content"],
    demoUrl: "/",
  },
  {
    id: "p8", title: "Neural Code Review", description: "AI-powered code review system that understands context, suggests refactors, and learns from team preferences.",
    longDesc: "A GitHub integration that goes beyond linting. The system understands the semantic intent of code changes, identifies architectural anti-patterns, suggests refactors with explanations, and learns from which suggestions the team accepts or rejects over time.",
    category: "Developer Tools", tags: ["Python", "TypeScript", "GitHub API", "LLM", "AST Analysis"], year: "2023", status: "archived", color: "oklch(0.70 0.20 150)",
    highlights: ["Semantic code understanding", "Team preference learning", "Architectural pattern detection", "GitHub native integration"],
  },
];

const categories = ["All", ...Array.from(new Set(projects.map(p => p.category)))];

const statusColors: Record<string, string> = {
  live: "oklch(0.70 0.20 150)",
  archived: "oklch(0.60 0.05 260)",
  "in-progress": "oklch(0.75 0.18 55)",
};

export default function Portfolio() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const { addXP } = usePersonalization();

  const filtered = activeCategory === "All" ? projects : projects.filter(p => p.category === activeCategory);

  const openProject = (project: Project) => {
    setSelectedProject(project);
    addXP(5);
  };

  return (
    <PageWrapper pageName="portfolio">
      {/* Header */}
      <section className="py-24 border-b border-white/5">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-8">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[oklch(0.75_0.18_55)]" />
            <span className="text-[oklch(0.75_0.18_55)] text-sm font-medium tracking-widest uppercase">Portfolio</span>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            The <span className="text-gradient-gold">Work.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-lg text-muted-foreground max-w-2xl">
            24+ projects spanning AI systems, distributed infrastructure, data visualization, and next-generation web experiences.
          </motion.p>
        </div>
      </section>

      {/* Filter */}
      <section className="py-8 border-b border-white/5 sticky top-16 z-20 glass-strong">
        <div className="container">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map(cat => (
              <motion.button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeCategory === cat ? "bg-[oklch(0.75_0.18_55_/_0.15)] text-[oklch(0.85_0.18_55)] border border-[oklch(0.75_0.18_55_/_0.4)]" : "text-muted-foreground hover:text-foreground glass border border-white/10 hover:border-white/20"}`}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              >
                {cat}
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="py-16">
        <div className="container">
          <motion.div layout className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filtered.map((project, i) => (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  onClick={() => openProject(project)}
                  className="group glass rounded-2xl border border-white/10 hover:border-white/25 cursor-pointer overflow-hidden transition-all"
                  whileHover={{ scale: 1.02, y: -3 }}
                  whileTap={{ scale: 0.99 }}
                >
                  {/* Color bar */}
                  <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${project.color}, transparent)` }} />

                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground font-mono">{project.year}</span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-xs" style={{ color: project.color }}>{project.category}</span>
                        </div>
                        <h3 className="font-bold text-lg text-foreground leading-tight">{project.title}</h3>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: statusColors[project.status], boxShadow: `0 0 6px ${statusColors[project.status]}` }} />
                        <span className="text-xs text-muted-foreground capitalize">{project.status}</span>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">{project.description}</p>

                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {project.tags.slice(0, 4).map(tag => (
                        <span key={tag} className="px-2 py-0.5 rounded-lg text-xs glass border border-white/10 text-muted-foreground">{tag}</span>
                      ))}
                      {project.tags.length > 4 && <span className="px-2 py-0.5 rounded-lg text-xs glass border border-white/10 text-muted-foreground">+{project.tags.length - 4}</span>}
                    </div>

                    <div className="flex items-center gap-1 text-xs" style={{ color: project.color }}>
                      <span>View details</span>
                      <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </section>

      {/* Project Modal */}
      <AnimatePresence>
        {selectedProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setSelectedProject(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", bounce: 0.2 }}
              className="glass-strong rounded-3xl border border-white/15 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="h-1.5 w-full rounded-t-3xl" style={{ background: `linear-gradient(90deg, ${selectedProject.color}, transparent)` }} />
              <div className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-muted-foreground font-mono">{selectedProject.year}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-xs font-medium" style={{ color: selectedProject.color }}>{selectedProject.category}</span>
                      <div className="flex items-center gap-1 ml-2">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: statusColors[selectedProject.status] }} />
                        <span className="text-xs text-muted-foreground capitalize">{selectedProject.status}</span>
                      </div>
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">{selectedProject.title}</h2>
                  </div>
                  <button onClick={() => setSelectedProject(null)} className="p-2 rounded-xl hover:bg-white/10 transition-colors text-muted-foreground">
                    <X size={20} />
                  </button>
                </div>

                <p className="text-muted-foreground leading-relaxed mb-6">{selectedProject.longDesc}</p>

                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">Highlights</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedProject.highlights.map(h => (
                      <div key={h} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="w-1 h-1 rounded-full shrink-0" style={{ background: selectedProject.color }} />
                        {h}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wider">Technologies</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedProject.tags.map(tag => (
                      <span key={tag} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs glass border border-white/10 text-muted-foreground">
                        <Tag size={10} />{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {(selectedProject.demoUrl || selectedProject.githubUrl) && (
                  <div className="flex gap-3">
                    {selectedProject.demoUrl && (
                      <a href={selectedProject.demoUrl} target="_blank" rel="noopener noreferrer">
                        <motion.button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium" style={{ background: `${selectedProject.color.replace(")", " / 0.15)")}`, border: `1px solid ${selectedProject.color.replace(")", " / 0.4)")}`, color: selectedProject.color }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <ExternalLink size={14} /> Live Demo
                        </motion.button>
                      </a>
                    )}
                    {selectedProject.githubUrl && (
                      <a href={selectedProject.githubUrl} target="_blank" rel="noopener noreferrer">
                        <motion.button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium glass border border-white/15 text-muted-foreground hover:text-foreground" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Github size={14} /> Source
                        </motion.button>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}
