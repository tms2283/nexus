import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Library as LibraryIcon, Search, ExternalLink, Sparkles, Loader2,
  BookOpen, Star, Tag, Filter, ChevronDown, Brain, Zap,
  Globe, Code2, Cpu, BarChart2, Palette, Lightbulb, ArrowRight, Users, Clock,
  Bookmark, BookmarkCheck, Eye
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import PageWrapper from "@/components/PageWrapper";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Resource {
  id: number;
  title: string;
  description: string;
  url: string;
  category: string;
  tags: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  featured: boolean;
}

// ─── Category Config ──────────────────────────────────────────────────────────
const CATEGORIES = [
  { label: "All", icon: Globe, color: "oklch(0.75 0.15 200)" },
  { label: "AI & Machine Learning", icon: Cpu, color: "oklch(0.75 0.18 55)" },
  { label: "Web Development", icon: Code2, color: "oklch(0.65 0.22 200)" },
  { label: "Software Engineering", icon: Brain, color: "oklch(0.72 0.2 290)" },
  { label: "Design", icon: Palette, color: "oklch(0.72 0.18 150)" },
  { label: "Data Science", icon: BarChart2, color: "oklch(0.78 0.16 30)" },
];

const DIFFICULTY_STYLES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  beginner: { label: "Beginner", color: "oklch(0.70 0.20 150)", bg: "oklch(0.70 0.20 150 / 0.1)", border: "oklch(0.70 0.20 150 / 0.25)" },
  intermediate: { label: "Intermediate", color: "oklch(0.75 0.18 55)", bg: "oklch(0.75 0.18 55 / 0.1)", border: "oklch(0.75 0.18 55 / 0.25)" },
  advanced: { label: "Advanced", color: "oklch(0.65 0.22 20)", bg: "oklch(0.65 0.22 20 / 0.1)", border: "oklch(0.65 0.22 20 / 0.25)" },
};

// ─── AI Explain Panel ─────────────────────────────────────────────────────────
function AIExplainPanel({ resource, onClose }: { resource: Resource; onClose: () => void }) {
  const [explanation, setExplanation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { addXP } = usePersonalization();

  const explain = trpc.ai.explainConcept.useMutation({
    onSuccess: (data) => {
      setExplanation(data.explanation);
      setLoading(false);
      addXP(15);
    },
    onError: (err: { message: string }) => {
      toast.error(err.message);
      setLoading(false);
    },
  });

  const handleExplain = () => {
    setLoading(true);
    explain.mutate({ concept: resource.title, level: "student" });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="card-nexus border-[var(--nexus-blue-border)] p-5 mt-3"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain size={14} className="text-[oklch(0.65_0.22_200)]" />
          <span className="text-sm font-medium text-foreground">AI Context</span>
        </div>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Close
        </button>
      </div>

      {!explanation ? (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Get a concise AI-generated explanation of what <strong className="text-foreground">{resource.title}</strong> is about and why it matters.
          </p>
          <button
            onClick={handleExplain}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[oklch(0.65_0.22_200_/_0.15)] border border-[oklch(0.65_0.22_200_/_0.25)] text-sm text-[oklch(0.75_0.22_200)] hover:bg-[oklch(0.65_0.22_200_/_0.22)] transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {loading ? "Generating..." : "Explain this resource"}
          </button>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground leading-relaxed">
          <Streamdown>{explanation}</Streamdown>
        </div>
      )}
    </motion.div>
  );
}

// ─── Resource Card ────────────────────────────────────────────────────────────
function ResourceCard({ resource, index }: { resource: Resource & { ratingSum?: number; ratingCount?: number; viewCount?: number }; index: number }) {
  const [showAI, setShowAI] = useState(false);
  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const diff = DIFFICULTY_STYLES[resource.difficulty] ?? DIFFICULTY_STYLES.beginner;
  const avgRating = resource.ratingCount && resource.ratingCount > 0 ? (resource.ratingSum ?? 0) / resource.ratingCount : 0;
  const { cookieId } = usePersonalization();

  const rateResource = trpc.library.rateResource.useMutation({
    onSuccess: () => { setHasRated(true); },
    onError: () => toast.error("Failed to submit rating"),
  });
  const trackView = trpc.library.trackView.useMutation();
  const addToReadingList = trpc.library.addToReadingList.useMutation({
    onError: () => {},
  });

  useEffect(() => {
    const bookmarks = JSON.parse(localStorage.getItem("nexus_bookmarks") ?? "[]") as number[];
    setIsBookmarked(bookmarks.includes(resource.id));
    const rated = JSON.parse(localStorage.getItem("nexus_rated") ?? "[]") as number[];
    setHasRated(rated.includes(resource.id));
  }, [resource.id]);

  const toggleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    const bookmarks = JSON.parse(localStorage.getItem("nexus_bookmarks") ?? "[]") as number[];
    const updated = isBookmarked ? bookmarks.filter(id => id !== resource.id) : [...bookmarks, resource.id];
    localStorage.setItem("nexus_bookmarks", JSON.stringify(updated));
    setIsBookmarked(!isBookmarked);
    if (!isBookmarked && cookieId) {
      addToReadingList.mutate({ cookieId, resourceId: resource.id, url: resource.url, title: resource.title, description: resource.description, category: resource.category });
      toast.success("Added to Reading List!");
    } else {
      toast.success("Bookmark removed");
    }
  };

  const handleRate = (rating: number) => {
    if (hasRated) return;
    setUserRating(rating);
    rateResource.mutate({ resourceId: resource.id, rating });
    const rated = JSON.parse(localStorage.getItem("nexus_rated") ?? "[]") as number[];
    localStorage.setItem("nexus_rated", JSON.stringify([...rated, resource.id]));
  };

  const handleOpenLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    trackView.mutate({ resourceId: resource.id });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4 }}
      className={`glass rounded-xl border p-5 flex flex-col gap-3 group transition-all hover:border-border/60 ${
        resource.featured ? "border-[oklch(0.75_0.18_55_/_0.25)]" : "border-white/8"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {resource.featured && (
              <Star size={11} className="text-[oklch(0.75_0.18_55)] fill-[oklch(0.75_0.18_55)] shrink-0" />
            )}
            <h3 className="font-semibold text-sm text-foreground truncate">{resource.title}</h3>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{resource.description}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={toggleBookmark}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
              isBookmarked ? "bg-[oklch(0.75_0.18_55_/_0.15)] text-[oklch(0.75_0.18_55)]" : "bg-[var(--surface-1)] text-muted-foreground hover:text-foreground hover:bg-[var(--surface-2)]"
            }`}
            title={isBookmarked ? "Remove bookmark" : "Bookmark"}
          >
            {isBookmarked ? <BookmarkCheck size={12} /> : <Bookmark size={12} />}
          </button>
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 w-7 h-7 rounded-lg bg-[var(--surface-1)] border border-border/60 flex items-center justify-center hover:bg-white/10 hover:border-border/60 transition-all group/link"
            onClick={handleOpenLink}
          >
            <ExternalLink size={13} className="text-muted-foreground group-hover/link:text-foreground transition-colors" />
          </a>
        </div>
      </div>

      {/* Tags & Difficulty */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="px-2 py-0.5 rounded-full text-xs font-medium border"
          style={{ color: diff.color, backgroundColor: diff.bg, borderColor: diff.border }}
        >
          {diff.label}
        </span>
        {resource.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-[var(--surface-1)] border border-border/60 text-muted-foreground">
            {tag}
          </span>
        ))}
      </div>

      {/* Rating & Stats */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-0.5">
          {[1,2,3,4,5].map(star => (
            <button
              key={star}
              onClick={() => handleRate(star)}
              onMouseEnter={() => !hasRated && setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              disabled={hasRated}
              className="transition-transform hover:scale-110 disabled:cursor-default"
            >
              <Star
                size={12}
                className={`transition-colors ${
                  star <= (hoverRating || userRating || Math.round(avgRating))
                    ? "text-[oklch(0.75_0.18_55)] fill-[oklch(0.75_0.18_55)]"
                    : "text-white/20"
                }`}
              />
            </button>
          ))}
        </div>
        {resource.ratingCount && resource.ratingCount > 0 ? (
          <span className="text-xs text-muted-foreground">{avgRating.toFixed(1)} ({resource.ratingCount})</span>
        ) : (
          <span className="text-xs text-muted-foreground">{hasRated ? "Thanks!" : "Rate this"}</span>
        )}
        {resource.viewCount && resource.viewCount > 0 ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground ml-auto"><Eye size={10} />{resource.viewCount}</span>
        ) : null}
      </div>

      {/* AI Explain Toggle */}
      <button
        onClick={() => setShowAI(!showAI)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[oklch(0.65_0.22_200)] transition-colors w-fit"
      >
        <Sparkles size={11} />
        {showAI ? "Hide AI context" : "Get AI context"}
        <ChevronDown size={11} className={`transition-transform ${showAI ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {showAI && <AIExplainPanel resource={resource} onClose={() => setShowAI(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Library() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [aiSearchQuery, setAiSearchQuery] = useState("");
  const [aiSearchResult, setAiSearchResult] = useState<string | null>(null);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [activeView, setActiveView] = useState<"curated" | "community" | "bookmarks">("curated");
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>([]);
  const { addXP } = usePersonalization();

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("nexus_bookmarks") ?? "[]") as number[];
    setBookmarkedIds(stored);
    const handleStorage = () => {
      const updated = JSON.parse(localStorage.getItem("nexus_bookmarks") ?? "[]") as number[];
      setBookmarkedIds(updated);
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const resources = trpc.codex.list.useQuery(
    { category: activeCategory === "All" ? undefined : activeCategory },
    { staleTime: 60_000 }
  );
  const communityResources = trpc.library.listCommunity.useQuery(
    { limit: 30, offset: 0 },
    { staleTime: 30_000, enabled: activeView === "community" }
  );

  const aiSearch = trpc.ai.explainConcept.useMutation({
    onSuccess: (data) => {
      setAiSearchResult(data.explanation);
      setIsAiSearching(false);
      addXP(10);
    },
    onError: (err: { message: string }) => {
      toast.error(err.message);
      setIsAiSearching(false);
    },
  });

  const handleAiSearch = () => {
    if (!aiSearchQuery.trim()) return;
    setIsAiSearching(true);
    setAiSearchResult(null);
    aiSearch.mutate({ concept: aiSearchQuery, level: "student" });
  };

  const filtered = (resources.data ?? []).filter((r) => {
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase()) || (r.description ?? "").toLowerCase().includes(search.toLowerCase()) || (r.tags ?? []).some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchDiff = !selectedDifficulty || r.difficulty === selectedDifficulty;
    return matchSearch && matchDiff;
  });

  const featured = filtered.filter((r) => r.featured);
  const regular = filtered.filter((r) => !r.featured);

  return (
    <PageWrapper pageName="library">
      <div className="min-h-screen pt-20">
        {/* Hero */}
        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--nexus-green-fill)] border border-[var(--nexus-green-border)] text-sm text-[var(--nexus-green)] mb-6"
              >
                <LibraryIcon size={14} />
                <span>Knowledge Library</span>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl md:text-5xl font-bold text-foreground mb-4"
              >
                Curated resources,{" "}
                <span className="text-gradient-gold">AI-explained</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-lg text-muted-foreground max-w-2xl mx-auto"
              >
                A hand-curated library of the most valuable papers, tools, and resources across technology, science, and design — each with on-demand AI context.
              </motion.p>
            </div>

            {/* AI Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card-nexus border-[var(--nexus-blue-border)] p-6 mb-8"
            >
              <div className="flex items-center gap-2 mb-3">
                <Brain size={15} className="text-[oklch(0.65_0.22_200)]" />
                <span className="text-sm font-medium text-foreground">Ask the AI Librarian</span>
                <span className="text-xs text-muted-foreground">— get an explanation of any topic</span>
              </div>
              <div className="flex gap-3">
                <input
                  value={aiSearchQuery}
                  onChange={(e) => setAiSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAiSearch()}
                  placeholder="e.g., 'What is attention in transformers?' or 'Explain gradient descent'"
                  className="flex-1 bg-[var(--surface-2)] border border-border/60 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[oklch(0.65_0.22_200_/_0.5)] transition-colors"
                />
                <motion.button
                  onClick={handleAiSearch}
                  disabled={isAiSearching || !aiSearchQuery.trim()}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-[oklch(0.65_0.22_200)] to-[oklch(0.72_0.2_290)] text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50 shrink-0"
                >
                  {isAiSearching ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  Ask
                </motion.button>
              </div>
              <AnimatePresence>
                {aiSearchResult && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 pt-4 border-t border-border/60"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Zap size={12} className="text-[oklch(0.75_0.18_55)]" />
                      <span className="text-xs font-medium text-[oklch(0.75_0.18_55)]">AI Response</span>
                    </div>
                    <div className="text-sm text-muted-foreground leading-relaxed">
                      <Streamdown>{aiSearchResult}</Streamdown>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </section>

        {/* Main Content */}
        <section className="pb-16 px-4">
          <div className="max-w-5xl mx-auto">
            {/* View Toggle */}
            <div className="flex items-center gap-2 mb-6">
              <button
                onClick={() => setActiveView("curated")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                  activeView === "curated"
                    ? "bg-[var(--surface-2)] border-border/60 text-foreground"
                    : "bg-[var(--surface-2)] border-border/30 text-muted-foreground hover:border-white/12 hover:text-foreground"
                }`}
              >
                <Star size={13} className={activeView === "curated" ? "text-[oklch(0.75_0.18_55)]" : ""} />
                Curated Library
              </button>
              <button
                onClick={() => setActiveView("community")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                  activeView === "community"
                    ? "bg-[var(--surface-2)] border-border/60 text-foreground"
                    : "bg-[var(--surface-2)] border-border/30 text-muted-foreground hover:border-white/12 hover:text-foreground"
                }`}
              >
                <Users size={13} className={activeView === "community" ? "text-[oklch(0.65_0.22_200)]" : ""} />
                Community Feed
                {(communityResources.data?.total ?? 0) > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-[oklch(0.65_0.22_200_/_0.15)] text-[oklch(0.65_0.22_200)] border border-[oklch(0.65_0.22_200_/_0.25)]">
                    {communityResources.data?.total}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveView("bookmarks")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                  activeView === "bookmarks"
                    ? "bg-[var(--surface-2)] border-border/60 text-foreground"
                    : "bg-[var(--surface-2)] border-border/30 text-muted-foreground hover:border-white/12 hover:text-foreground"
                }`}
              >
                <Bookmark size={13} className={activeView === "bookmarks" ? "text-[oklch(0.75_0.18_55)]" : ""} />
                My Bookmarks
                {bookmarkedIds.length > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-[oklch(0.75_0.18_55_/_0.15)] text-[oklch(0.75_0.18_55)] border border-[oklch(0.75_0.18_55_/_0.25)]">
                    {bookmarkedIds.length}
                  </span>
                )}
              </button>
            </div>
            {activeView === "community" && (
              <div>
                {communityResources.isLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 size={24} className="animate-spin text-muted-foreground" />
                  </div>
                ) : (communityResources.data?.items.length ?? 0) === 0 ? (
                  <div className="text-center py-20">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--surface-1)] border border-border/60 flex items-center justify-center mx-auto mb-4">
                      <Users size={24} className="text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground text-sm font-medium mb-1">No community contributions yet</p>
                    <p className="text-xs text-muted-foreground/60 max-w-xs mx-auto">Be the first! Use the Research Forge to analyze a resource and click "Contribute to Library" to share it here.</p>
                    <a href="/research" className="inline-flex items-center gap-1.5 mt-4 text-xs text-[oklch(0.65_0.22_200)] hover:underline">
                      Go to Research Forge <ArrowRight size={11} />
                    </a>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Users size={13} className="text-[oklch(0.65_0.22_200)]" />
                      <span className="text-sm font-semibold text-foreground">Community Contributions</span>
                      <span className="text-xs text-muted-foreground">({communityResources.data?.total} resources shared by learners)</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {communityResources.data?.items.map((r, i) => (
                        <motion.div
                          key={r.id}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="card-nexus p-5 flex flex-col gap-3 hover:border-border/60 transition-all"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-sm text-foreground truncate mb-1">{r.title}</h3>
                              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{r.description}</p>
                            </div>
                            <a href={r.url} target="_blank" rel="noopener noreferrer" className="shrink-0 w-8 h-8 rounded-lg bg-[var(--surface-1)] border border-border/60 flex items-center justify-center hover:bg-white/10 transition-all" onClick={e => e.stopPropagation()}>
                              <ExternalLink size={13} className="text-muted-foreground" />
                            </a>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-full text-xs bg-[oklch(0.65_0.22_200_/_0.1)] border border-[oklch(0.65_0.22_200_/_0.2)] text-[oklch(0.65_0.22_200)]">{r.category}</span>
                            {(r.tags ?? []).slice(0, 2).map(tag => (
                              <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-[var(--surface-1)] border border-border/60 text-muted-foreground">{tag}</span>
                            ))}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
                            <Clock size={10} />
                            <span>{new Date(r.addedAt).toLocaleDateString()}</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeView === "bookmarks" && (
              <div>
                {bookmarkedIds.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="w-16 h-16 rounded-2xl bg-[var(--surface-1)] border border-border/60 flex items-center justify-center mx-auto mb-4">
                      <Bookmark size={24} className="text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground text-sm font-medium mb-1">No bookmarks yet</p>
                    <p className="text-xs text-muted-foreground/60 max-w-xs mx-auto">Click the bookmark icon on any resource card to save it here for quick access.</p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <BookmarkCheck size={13} className="text-[oklch(0.75_0.18_55)]" />
                      <span className="text-sm font-semibold text-foreground">Saved Resources</span>
                      <span className="text-xs text-muted-foreground">({bookmarkedIds.length} bookmarked)</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {(resources.data ?? []).filter(r => bookmarkedIds.includes(r.id)).map((r, i) => (
                        <ResourceCard key={r.id} resource={{ ...r, url: r.url ?? "", tags: r.tags ?? [], difficulty: r.difficulty ?? "beginner", featured: r.featured ?? false }} index={i} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeView === "curated" && (
            <>
            {/* Category Tabs */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
              {CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.label;
                return (
                  <button
                    key={cat.label}
                    onClick={() => setActiveCategory(cat.label)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all border ${
                      isActive
                        ? "bg-[var(--surface-2)] border-border/60 text-foreground"
                        : "bg-[var(--surface-2)] border-border/30 text-muted-foreground hover:border-white/12 hover:text-foreground"
                    }`}
                  >
                    <Icon size={13} style={{ color: isActive ? cat.color : undefined }} />
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Search & Filter Bar */}
            <div className="flex items-center gap-3 mb-8">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search resources, tags, topics..."
                  className="w-full bg-[var(--surface-2)] border border-border/60 rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-white/20 transition-colors"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm border transition-all ${
                  showFilters || selectedDifficulty
                    ? "bg-[var(--surface-2)] border-border/60 text-foreground"
                    : "bg-[var(--surface-2)] border-border/30 text-muted-foreground hover:border-white/12"
                }`}
              >
                <Filter size={13} />
                Filter
                {selectedDifficulty && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[oklch(0.75_0.18_55)]" />
                )}
              </button>
            </div>

            {/* Filter Panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="card-nexus p-4 mb-6"
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-medium text-muted-foreground">Difficulty:</span>
                    {["beginner", "intermediate", "advanced"].map((d) => {
                      const style = DIFFICULTY_STYLES[d];
                      return (
                        <button
                          key={d}
                          onClick={() => setSelectedDifficulty(selectedDifficulty === d ? null : d)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                          style={{
                            color: selectedDifficulty === d ? style.color : undefined,
                            backgroundColor: selectedDifficulty === d ? style.bg : "rgba(255,255,255,0.03)",
                            borderColor: selectedDifficulty === d ? style.border : "rgba(255,255,255,0.08)",
                          }}
                        >
                          {style.label}
                        </button>
                      );
                    })}
                    {selectedDifficulty && (
                      <button
                        onClick={() => setSelectedDifficulty(null)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Loading */}
            {resources.isLoading && (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Featured Resources */}
            {featured.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Star size={13} className="text-[oklch(0.75_0.18_55)] fill-[oklch(0.75_0.18_55)]" />
                  <span className="text-sm font-semibold text-foreground">Featured</span>
                  <span className="text-xs text-muted-foreground">— Editor's picks</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {featured.map((r, i) => (
                    <ResourceCard key={r.id} resource={r as Resource} index={i} />
                  ))}
                </div>
              </div>
            )}

            {/* All Resources */}
            {regular.length > 0 && (
              <div>
                {featured.length > 0 && (
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen size={13} className="text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">All Resources</span>
                    <span className="text-xs text-muted-foreground">({regular.length})</span>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {regular.map((r, i) => (
                    <ResourceCard key={r.id} resource={r as Resource} index={i} />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!resources.isLoading && filtered.length === 0 && (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-[var(--surface-1)] border border-border/60 flex items-center justify-center mx-auto mb-4">
                  <Search size={24} className="text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">No resources match your search.</p>
                <button
                  onClick={() => { setSearch(""); setSelectedDifficulty(null); }}
                  className="mt-3 text-xs text-[oklch(0.65_0.22_200)] hover:underline"
                >
                  Clear filters
                </button>
              </div>
            )}

            {/* Suggest a Resource CTA */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-12 card-nexus p-6 flex flex-col md:flex-row items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[oklch(0.72_0.18_150_/_0.15)] border border-[oklch(0.72_0.18_150_/_0.3)] flex items-center justify-center shrink-0">
                  <Lightbulb size={18} className="text-[oklch(0.72_0.18_150)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Know a great resource?</p>
                  <p className="text-xs text-muted-foreground">The library grows through community contributions. Suggest a resource via the Contact page.</p>
                </div>
              </div>
              <a
                href="/contact"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--surface-1)] border border-border/60 text-sm text-muted-foreground hover:text-foreground hover:border-border/60 transition-all shrink-0"
              >
                Suggest a resource <ArrowRight size={13} />
              </a>
            </motion.div>
            </>
            )}
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}
