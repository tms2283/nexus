import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ExternalLink, Sparkles, Loader2, BookOpen, Star } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import PageWrapper from "@/components/PageWrapper";
import { Streamdown } from "streamdown";

const categories = ["All", "AI & Machine Learning", "Web Development", "Software Engineering", "Design"];

const difficultyColors = {
  beginner: "oklch(0.70 0.20 150)",
  intermediate: "oklch(0.75 0.18 55)",
  advanced: "oklch(0.65 0.22 20)",
};

interface CodexEntry {
  id: number;
  title: string;
  description: string;
  url: string;
  category: string;
  tags: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  featured: boolean;
}

export default function Codex() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [aiExplanations, setAiExplanations] = useState<Record<number, string>>({});
  const [loadingExplanation, setLoadingExplanation] = useState<number | null>(null);
  const { addXP, cookieId } = usePersonalization();

  const { data: entries = [], isLoading } = trpc.codex.list.useQuery(
    { category: activeCategory === "All" ? undefined : activeCategory },
    { staleTime: 60000 }
  );

  const explainMutation = trpc.ai.explainConcept.useMutation();

  const filtered = (entries as CodexEntry[]).filter(e => {
    if (!search) return true;
    const q = search.toLowerCase();
    return e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q) || e.tags.some(t => t.toLowerCase().includes(q));
  });

  const featured = filtered.filter(e => e.featured);
  const regular = filtered.filter(e => !e.featured);

  const getExplanation = async (entry: CodexEntry) => {
    if (aiExplanations[entry.id]) return;
    setLoadingExplanation(entry.id);
    explainMutation.mutate(
      { concept: `${entry.title}: ${entry.description}`, level: "student", cookieId: cookieId ?? undefined },
      {
        onSuccess: (data) => {
          setAiExplanations(prev => ({ ...prev, [entry.id]: data.explanation }));
          addXP(5);
          setLoadingExplanation(null);
        },
        onError: () => setLoadingExplanation(null),
      }
    );
  };

  const EntryCard = ({ entry }: { entry: CodexEntry }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="group glass rounded-2xl border border-white/10 hover:border-white/20 transition-all overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xs font-medium" style={{ color: difficultyColors[entry.difficulty] }}>{entry.difficulty}</span>
              <span className="text-muted-foreground text-xs">·</span>
              <span className="text-xs text-muted-foreground">{entry.category}</span>
              {entry.featured && <Star size={11} className="text-[oklch(0.75_0.18_55)]" />}
            </div>
            <h3 className="font-bold text-foreground leading-tight">{entry.title}</h3>
          </div>
          <a href={entry.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
            <motion.div className="p-2 rounded-xl hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground shrink-0" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <ExternalLink size={14} />
            </motion.div>
          </a>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mb-3">{entry.description}</p>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {entry.tags.map(tag => (
            <span key={tag} className="px-2 py-0.5 rounded-lg text-xs glass border border-white/10 text-muted-foreground">{tag}</span>
          ))}
        </div>

        {/* AI Explanation */}
        <AnimatePresence>
          {aiExplanations[entry.id] && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 p-3 glass rounded-xl border border-[oklch(0.65_0.22_290_/_0.2)] bg-[oklch(0.65_0.22_290_/_0.05)]"
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles size={11} className="text-[oklch(0.65_0.22_290)]" />
                <span className="text-xs text-[oklch(0.65_0.22_290)] font-medium">AI Insight</span>
              </div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                <Streamdown>{aiExplanations[entry.id]}</Streamdown>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => getExplanation(entry)}
          disabled={loadingExplanation === entry.id || !!aiExplanations[entry.id]}
          className="flex items-center gap-1.5 text-xs text-[oklch(0.65_0.22_290)] hover:text-[oklch(0.75_0.18_290)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loadingExplanation === entry.id ? (
            <><Loader2 size={11} className="animate-spin" /> Generating insight...</>
          ) : aiExplanations[entry.id] ? (
            <><Sparkles size={11} /> Insight loaded</>
          ) : (
            <><Sparkles size={11} /> Get AI insight</>
          )}
        </button>
      </div>
    </motion.div>
  );

  return (
    <PageWrapper pageName="codex">
      {/* Header */}
      <section className="py-24 border-b border-white/5">
        <div className="container">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-8">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[oklch(0.75_0.18_55)]" />
            <span className="text-[oklch(0.75_0.18_55)] text-sm font-medium tracking-widest uppercase">Codex</span>
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            The <span className="text-gradient-gold">Codex.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-lg text-muted-foreground max-w-2xl mb-8">
            A curated knowledge library. Every resource is hand-selected and AI-augmented — click the spark icon for an instant insight on any entry.
          </motion.p>

          {/* Search */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="relative max-w-xl">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search resources, topics, tags..."
              className="w-full pl-11 pr-4 py-3.5 glass rounded-xl border border-white/15 focus:border-white/30 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors"
            />
          </motion.div>
        </div>
      </section>

      {/* Category filter */}
      <section className="py-6 border-b border-white/5 sticky top-16 z-20 glass-strong">
        <div className="container flex gap-2 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)} className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${activeCategory === cat ? "bg-[oklch(0.75_0.18_55_/_0.15)] text-[oklch(0.85_0.18_55)] border border-[oklch(0.75_0.18_55_/_0.4)]" : "glass border border-white/10 text-muted-foreground hover:text-foreground"}`}>
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container">
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="animate-spin text-[oklch(0.75_0.18_55)]" size={32} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24">
              <BookOpen size={40} className="text-muted-foreground mx-auto mb-4 opacity-40" />
              <p className="text-muted-foreground">No resources found for "{search}"</p>
            </div>
          ) : (
            <>
              {featured.length > 0 && (
                <div className="mb-12">
                  <div className="flex items-center gap-2 mb-6">
                    <Star size={14} className="text-[oklch(0.75_0.18_55)]" />
                    <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Essential Reads</h2>
                  </div>
                  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {featured.map(entry => <EntryCard key={entry.id} entry={entry as CodexEntry} />)}
                  </div>
                </div>
              )}

              {regular.length > 0 && (
                <div>
                  {featured.length > 0 && (
                    <div className="flex items-center gap-2 mb-6">
                      <BookOpen size={14} className="text-muted-foreground" />
                      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">More Resources</h2>
                    </div>
                  )}
                  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {regular.map(entry => <EntryCard key={entry.id} entry={entry as CodexEntry} />)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </PageWrapper>
  );
}
