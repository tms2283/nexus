import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FlaskConical, Link2, FileText, Sparkles, Loader2,
  BookMarked, Lightbulb, Brain, Copy, Check, Plus,
  ChevronDown, ChevronUp, RotateCcw, Save, Trash2,
  ArrowRight, Tag, Clock, Library, X, Quote, GitCompare, ChevronRight,
  Volume2, Search, Globe, Download
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import PageWrapper from "@/components/PageWrapper";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import AudioPlayer from "@/components/AudioPlayer";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Flashcard {
  front: string;
  back: string;
}

interface ResearchResult {
  title: string;
  summary: string;
  keyInsights: string[];
  flashcards: Flashcard[];
  tags: string[];
}

interface SavedSession {
  id: number;
  title: string;
  summary: string;
  keyInsights: string[];
  tags: string[];
  notes: string;
  createdAt: Date;
}

// ─── Flashcard Component ──────────────────────────────────────────────────────
function FlashcardView({ cards }: { cards: Flashcard[] }) {
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());

  if (cards.length === 0) return null;

  const card = cards[current];
  const progress = (known.size / cards.length) * 100;

  const handleKnow = () => {
    setKnown((prev) => new Set(Array.from(prev).concat(current)));
    setFlipped(false);
    setTimeout(() => setCurrent((c) => (c + 1) % cards.length), 200);
  };

  const handleReview = () => {
    setFlipped(false);
    setTimeout(() => setCurrent((c) => (c + 1) % cards.length), 200);
  };

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
        <span>{current + 1} / {cards.length} cards</span>
        <span className="text-[oklch(0.72_0.18_150)]">{known.size} known</span>
      </div>
      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-[oklch(0.72_0.18_150)] to-[oklch(0.65_0.22_200)]"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      {/* Card */}
      <div
        className="relative h-44 cursor-pointer"
        style={{ perspective: "1000px" }}
        onClick={() => setFlipped(!flipped)}
      >
        <motion.div
          className="relative w-full h-full"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.4, type: "spring", stiffness: 200, damping: 20 }}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Front */}
          <div className="absolute inset-0 glass rounded-xl border border-white/10 flex flex-col items-center justify-center p-6 text-center" style={{ backfaceVisibility: "hidden" }}>
            <div className="text-xs text-muted-foreground mb-3 uppercase tracking-wider">Question</div>
            <p className="text-foreground font-medium">{card?.front}</p>
            <div className="mt-4 text-xs text-muted-foreground flex items-center gap-1">
              <RotateCcw size={10} /> tap to reveal
            </div>
          </div>
          {/* Back */}
          <div className="absolute inset-0 glass rounded-xl border border-[oklch(0.65_0.22_200_/_0.3)] flex flex-col items-center justify-center p-6 text-center" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
            <div className="text-xs text-[oklch(0.65_0.22_200)] mb-3 uppercase tracking-wider">Answer</div>
            <p className="text-foreground text-sm leading-relaxed">{card?.back}</p>
          </div>
        </motion.div>
      </div>

      {/* Controls */}
      {flipped && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-3"
        >
          <button
            onClick={handleReview}
            className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-muted-foreground hover:bg-white/8 transition-colors"
          >
            Review Again
          </button>
          <button
            onClick={handleKnow}
            className="flex-1 py-2.5 rounded-xl bg-[oklch(0.72_0.18_150_/_0.15)] border border-[oklch(0.72_0.18_150_/_0.3)] text-sm font-medium text-[oklch(0.82_0.18_150)] hover:bg-[oklch(0.72_0.18_150_/_0.2)] transition-colors"
          >
            Got It ✓
          </button>
        </motion.div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Research() {
  const [inputMode, setInputMode] = useState<"text" | "url">("text");
  const [textInput, setTextInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [notes, setNotes] = useState("");
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const [showSessions, setShowSessions] = useState(false);
  const [activeInsight, setActiveInsight] = useState<number | null>(null);
  const [copiedInsight, setCopiedInsight] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"summary" | "insights" | "flashcards">("summary");
  const [savedSessionId, setSavedSessionId] = useState<number | null>(null);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [contributeForm, setContributeForm] = useState({ title: "", url: "", description: "", category: "AI & Machine Learning", tags: "", type: "article" as "article" | "video" | "course" | "tool" | "paper" | "book" | "repo" });
  const [contributedSuccess, setContributedSuccess] = useState(false);
  // Citation generator state
  const [showCitationTool, setShowCitationTool] = useState(false);
  const [citationForm, setCitationForm] = useState({ title: "", url: "", author: "", year: "", publisher: "", format: "apa" as "apa" | "mla" | "chicago" | "harvard" });
  const [citationResult, setCitationResult] = useState<{ citation: string; inText: string; notes: string } | null>(null);
  const [copiedCitation, setCopiedCitation] = useState(false);
  // Topic comparison state
  const [showCompareTool, setShowCompareTool] = useState(false);
  const [compareForm, setCompareForm] = useState({ topicA: "", topicB: "", context: "" });
  const [compareResult, setCompareResult] = useState<{ title: string; overview: string; similarities: string[]; differences: Array<{ aspect: string; topicA: string; topicB: string }>; verdict: string; useCases: { topicA: string[]; topicB: string[] } } | null>(null);
  const [audioOverview, setAudioOverview] = useState<{ audioUrl: string; transcript?: string; durationSeconds?: number } | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);

  // Load existing audio overview when a session is saved/restored
  const existingAudio = trpc.research.getAudioOverviews.useQuery(
    { cookieId: cookieId ?? "", sourceType: "research_session", sourceId: savedSessionId ?? 0 },
    { enabled: !!savedSessionId && !!cookieId }
  );
  useEffect(() => {
    if (existingAudio.data?.overviews?.[0] && !audioOverview) {
      const ov = existingAudio.data.overviews[0];
      setAudioOverview({ audioUrl: ov.audioUrl, transcript: ov.transcript ?? undefined, durationSeconds: ov.durationSeconds ?? undefined });
    }
  }, [existingAudio.data, audioOverview]);
  const { cookieId, addXP } = usePersonalization();

  const generateAudio = trpc.research.generateAudioOverview.useMutation({
    onSuccess: (data) => {
      setIsGeneratingAudio(false);
      if (data.success && data.audioUrl) {
        setAudioOverview({ audioUrl: data.audioUrl, transcript: data.transcript ?? undefined, durationSeconds: data.durationSeconds ?? undefined });
        toast.success("+30 XP — Audio overview generated!");
      } else {
        toast.error(data.error ?? "Audio generation failed. Check ELEVENLABS_API_KEY in your .env");
      }
    },
    onError: () => { setIsGeneratingAudio(false); toast.error("Audio generation failed."); },
  });

  const analyzeContent = trpc.research.analyze.useMutation({
    onSuccess: (data: ResearchResult) => {
      setResult(data);
      setIsAnalyzing(false);
      addXP(30);
      toast.success("+30 XP — Research session complete!");
    },
    onError: (err: { message: string }) => {
      toast.error(err.message);
      setIsAnalyzing(false);
    },
  });

  const saveSession = trpc.research.save.useMutation({
    onSuccess: (data: { id: number }) => {
      setSavedSessionId(data.id);
      toast.success("Session saved to your Research Library");
      addXP(10);
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const loadSessions = trpc.research.getSessions.useQuery(
    { cookieId: cookieId ?? "" },
    { enabled: !!cookieId && showSessions }
  );

  const handleAnalyze = () => {
    const content = inputMode === "text" ? textInput : urlInput;
    if (!content.trim()) { toast.error("Please provide content to analyze."); return; }
    setIsAnalyzing(true);
    setResult(null);
    setSavedSessionId(null);
    analyzeContent.mutate({ content, mode: inputMode, cookieId: cookieId ?? undefined });
  };

  const handleSave = () => {
    if (!result || !cookieId) return;
    saveSession.mutate({
      cookieId,
      title: result.title,
      sourceText: inputMode === "text" ? textInput : undefined,
      sourceUrl: inputMode === "url" ? urlInput : undefined,
      summary: result.summary,
      keyInsights: result.keyInsights,
      notes,
      tags: result.tags,
    });
  };

  const contributeMutation = trpc.library.contribute.useMutation({
    onSuccess: () => {
      setContributedSuccess(true);
      setShowContributeModal(false);
      addXP(50);
      toast.success("Resource contributed to the Library! +50 XP");
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const handleContribute = () => {
    if (!cookieId || !result) return;
    const url = inputMode === "url" ? urlInput : "";
    if (!url) { toast.error("Contribution requires a URL source."); return; }
    contributeMutation.mutate({
      cookieId,
      title: contributeForm.title || result.title,
      url,
      description: contributeForm.description || result.summary.slice(0, 500),
      category: contributeForm.category,
      tags: contributeForm.tags.split(",").map((t: string) => t.trim()).filter(Boolean).slice(0, 8),
      type: contributeForm.type,
    });
  };

  const generateCitation = trpc.research.generateCitation.useMutation({
    onSuccess: (data) => { setCitationResult(data); },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const compareTopics = trpc.research.compareTopics.useMutation({
    onSuccess: (data) => { setCompareResult(data); addXP(15); },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const handleCopyInsight = (text: string, i: number) => {
    navigator.clipboard.writeText(text);
    setCopiedInsight(i);
    setTimeout(() => setCopiedInsight(null), 2000);
  };

  return (
    <PageWrapper pageName="research">
      <div className="min-h-screen pt-20">
        {/* Hero */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-[oklch(0.65_0.22_200_/_0.3)] text-sm text-[oklch(0.65_0.22_200)] mb-6"
            >
              <FlaskConical size={14} />
              <span>Research Forge</span>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold text-foreground mb-4"
            >
              Turn any content into{" "}
              <span className="text-gradient-gold">deep knowledge</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-muted-foreground max-w-2xl mx-auto"
            >
              Paste text or a URL. Nexus extracts key insights, generates a structured summary, and creates flashcards for spaced repetition — automatically.
            </motion.p>
          </div>
        </section>

        <section className="pb-16 px-4">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Input Panel */}
            <div className="glass rounded-2xl p-6 border border-white/8">
              {/* Mode toggle */}
              <div className="flex gap-2 p-1 bg-white/3 rounded-xl mb-6 w-fit">
                {(["text", "url"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setInputMode(mode)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      inputMode === mode
                        ? "bg-[oklch(0.65_0.22_200_/_0.15)] border border-[oklch(0.65_0.22_200_/_0.25)] text-[oklch(0.75_0.22_200)]"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {mode === "text" ? <FileText size={14} /> : <Link2 size={14} />}
                    {mode === "text" ? "Paste Text" : "From URL"}
                  </button>
                ))}
              </div>

              {inputMode === "text" ? (
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Paste any article, paper, documentation, transcript, or text you want to analyze and learn from..."
                  className="w-full h-48 bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[oklch(0.65_0.22_200_/_0.5)] resize-none transition-colors"
                />
              ) : (
                <div className="space-y-3">
                  <input
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://arxiv.org/abs/... or any article URL"
                    className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[oklch(0.65_0.22_200_/_0.5)] transition-colors"
                  />
                  <p className="text-xs text-muted-foreground">
                    Works with research papers, blog posts, documentation, Wikipedia articles, and most public web pages.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between mt-4">
                <div className="text-xs text-muted-foreground">
                  {inputMode === "text" && textInput && `${textInput.split(/\s+/).length} words`}
                </div>
                <motion.button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || (!textInput.trim() && !urlInput.trim())}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[oklch(0.65_0.22_200)] to-[oklch(0.72_0.2_290)] text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnalyzing ? (
                    <><Loader2 size={15} className="animate-spin" /> Analyzing...</>
                  ) : (
                    <><Sparkles size={15} /> Analyze & Extract</>
                  )}
                </motion.button>
              </div>
            </div>

            {/* Results */}
            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Title + tags */}
                  <div className="glass rounded-2xl p-6 border border-[oklch(0.65_0.22_200_/_0.2)]">
                    <h3 className="text-xl font-bold text-foreground mb-3">{result.title}</h3>
                    <div className="flex flex-wrap gap-2">
                      {result.tags.map((tag, i) => (
                        <span key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-white/5 border border-white/8 text-muted-foreground">
                          <Tag size={9} /> {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex gap-2 p-1 glass rounded-xl border border-white/8">
                    {([
                      { id: "summary" as const, label: "Summary", icon: BookMarked },
                      { id: "insights" as const, label: `Key Insights (${result.keyInsights.length})`, icon: Lightbulb },
                      { id: "flashcards" as const, label: `Flashcards (${result.flashcards.length})`, icon: Brain },
                    ]).map(({ id, label, icon: Icon }) => (
                      <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                          activeTab === id
                            ? "bg-[oklch(0.65_0.22_200_/_0.12)] border border-[oklch(0.65_0.22_200_/_0.25)] text-[oklch(0.75_0.22_200)]"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/3"
                        }`}
                      >
                        <Icon size={14} />
                        <span className="hidden sm:block">{label}</span>
                      </button>
                    ))}
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeTab}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                      className="glass rounded-2xl p-6 border border-white/8"
                    >
                      {activeTab === "summary" && (
                        <div className="prose prose-invert prose-sm max-w-none">
                          <Streamdown>{result.summary}</Streamdown>
                        </div>
                      )}

                      {activeTab === "insights" && (
                        <div className="space-y-3">
                          {result.keyInsights.map((insight, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.04 }}
                              className="group flex items-start gap-3 p-4 rounded-xl bg-white/3 border border-white/6 hover:border-white/12 transition-all cursor-pointer"
                              onClick={() => setActiveInsight(activeInsight === i ? null : i)}
                            >
                              <div className="w-6 h-6 rounded-full bg-[oklch(0.65_0.22_200_/_0.15)] border border-[oklch(0.65_0.22_200_/_0.25)] flex items-center justify-center shrink-0 mt-0.5">
                                <span className="text-xs font-bold text-[oklch(0.65_0.22_200)]">{i + 1}</span>
                              </div>
                              <p className="text-sm text-foreground leading-relaxed flex-1">{insight}</p>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleCopyInsight(insight, i); }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                              >
                                {copiedInsight === i ? <Check size={13} className="text-[oklch(0.72_0.18_150)]" /> : <Copy size={13} className="text-muted-foreground" />}
                              </button>
                            </motion.div>
                          ))}
                        </div>
                      )}

                      {activeTab === "flashcards" && (
                        <FlashcardView cards={result.flashcards} />
                      )}
                    </motion.div>
                  </AnimatePresence>

                  {/* Notes + Save */}
                  <div className="glass rounded-2xl p-6 border border-white/8">
                    <label className="text-sm font-medium text-muted-foreground mb-3 block flex items-center gap-2">
                      <BookMarked size={14} /> Your Notes
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add your own thoughts, connections, or questions about this content..."
                      className="w-full h-28 bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-[oklch(0.65_0.22_200_/_0.5)] resize-none transition-colors"
                    />
                    <div className="flex items-center justify-between mt-3 gap-3 flex-wrap">
                      <span className="text-xs text-muted-foreground">
                        {savedSessionId ? "✓ Saved to Research Library" : "Save to revisit later"}
                      </span>
                      <div className="flex items-center gap-2">
                        {inputMode === "url" && urlInput && !contributedSuccess && (
                          <motion.button
                            onClick={() => setShowContributeModal(true)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[oklch(0.65_0.22_200_/_0.12)] border border-[oklch(0.65_0.22_200_/_0.3)] text-sm font-medium text-[oklch(0.75_0.22_200)] hover:bg-[oklch(0.65_0.22_200_/_0.2)] transition-colors"
                          >
                            <Library size={14} />
                            Contribute to Library
                          </motion.button>
                        )}
                        {contributedSuccess && (
                          <span className="flex items-center gap-1 text-xs text-[oklch(0.72_0.18_150)]">
                            <Check size={12} /> Added to Library
                          </span>
                        )}
                        <motion.button
                          onClick={handleSave}
                          disabled={!!savedSessionId}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[oklch(0.72_0.18_150_/_0.15)] border border-[oklch(0.72_0.18_150_/_0.3)] text-sm font-medium text-[oklch(0.82_0.18_150)] disabled:opacity-50 hover:bg-[oklch(0.72_0.18_150_/_0.2)] transition-colors"
                        >
                          <Save size={14} />
                          {savedSessionId ? "Saved" : "Save Session"}
                        </motion.button>
                        <motion.button
                          onClick={() => {
                            if (!savedSessionId || !result || !cookieId) {
                              toast.error("Save the session first to generate audio.");
                              return;
                            }
                            setIsGeneratingAudio(true);
                            generateAudio.mutate({ cookieId, sessionId: savedSessionId, title: result.title, summary: result.summary, keyInsights: result.keyInsights });
                          }}
                          disabled={isGeneratingAudio}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[oklch(0.65_0.22_200_/_0.12)] border border-[oklch(0.65_0.22_200_/_0.3)] text-sm font-medium text-[oklch(0.75_0.22_200)] disabled:opacity-50 hover:bg-[oklch(0.65_0.22_200_/_0.2)] transition-colors"
                          title="Generate a podcast-style audio overview of this research"
                        >
                          {isGeneratingAudio ? <Loader2 size={14} className="animate-spin" /> : <Volume2 size={14} />}
                          {isGeneratingAudio ? "Generating…" : "Audio Overview"}
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ─── Audio Overview Player ──────────────────────────────────────── */}
            {audioOverview && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <AudioPlayer
                  audioUrl={audioOverview.audioUrl}
                  transcript={audioOverview.transcript}
                  durationSeconds={audioOverview.durationSeconds}
                  title={result?.title}
                />
              </motion.div>
            )}

            {/* ─── Citation Generator ─────────────────────────────────────────── */}
            <div className="glass rounded-2xl border border-white/8 overflow-hidden">
              <button
                onClick={() => setShowCitationTool(!showCitationTool)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/3 transition-colors"
              >
                <span className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Quote size={15} className="text-[oklch(0.75_0.20_280)]" /> Citation Generator
                  <span className="text-xs text-muted-foreground font-normal">APA · MLA · Chicago · Harvard</span>
                </span>
                {showCitationTool ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
              </button>
              <AnimatePresence>
                {showCitationTool && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-t border-white/5">
                    <div className="p-6 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Title *</label>
                          <input value={citationForm.title} onChange={e => setCitationForm(f => ({ ...f, title: e.target.value }))} placeholder="Source title" className="w-full bg-white/3 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[oklch(0.65_0.22_200_/_0.5)] transition-colors" />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Author</label>
                          <input value={citationForm.author} onChange={e => setCitationForm(f => ({ ...f, author: e.target.value }))} placeholder="Last, First" className="w-full bg-white/3 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[oklch(0.65_0.22_200_/_0.5)] transition-colors" />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">URL</label>
                          <input value={citationForm.url} onChange={e => setCitationForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." className="w-full bg-white/3 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[oklch(0.65_0.22_200_/_0.5)] transition-colors" />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Year</label>
                          <input value={citationForm.year} onChange={e => setCitationForm(f => ({ ...f, year: e.target.value }))} placeholder={new Date().getFullYear().toString()} className="w-full bg-white/3 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[oklch(0.65_0.22_200_/_0.5)] transition-colors" />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Publisher / Journal</label>
                          <input value={citationForm.publisher} onChange={e => setCitationForm(f => ({ ...f, publisher: e.target.value }))} placeholder="Publisher name" className="w-full bg-white/3 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[oklch(0.65_0.22_200_/_0.5)] transition-colors" />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Format</label>
                          <select value={citationForm.format} onChange={e => setCitationForm(f => ({ ...f, format: e.target.value as typeof f.format }))} className="w-full bg-white/3 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[oklch(0.65_0.22_200_/_0.5)] transition-colors">
                            {(["apa", "mla", "chicago", "harvard"] as const).map(fmt => <option key={fmt} value={fmt}>{fmt.toUpperCase()}</option>)}
                          </select>
                        </div>
                      </div>
                      <motion.button
                        onClick={() => { if (!citationForm.title.trim()) { toast.error("Title is required"); return; } setCitationResult(null); generateCitation.mutate({ ...citationForm, cookieId: cookieId ?? undefined }); }}
                        disabled={generateCitation.isPending}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[oklch(0.72_0.18_280_/_0.15)] border border-[oklch(0.72_0.18_280_/_0.3)] text-sm font-medium text-[oklch(0.82_0.18_280)] disabled:opacity-50 hover:bg-[oklch(0.72_0.18_280_/_0.2)] transition-colors"
                      >
                        {generateCitation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Quote size={14} />}
                        {generateCitation.isPending ? "Generating..." : "Generate Citation"}
                      </motion.button>
                      {citationResult && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                          <div className="p-4 rounded-xl bg-white/3 border border-white/8">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{citationForm.format.toUpperCase()} Citation</span>
                              <button onClick={() => { navigator.clipboard.writeText(citationResult.citation); setCopiedCitation(true); setTimeout(() => setCopiedCitation(false), 2000); }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                                {copiedCitation ? <Check size={12} className="text-green-400" /> : <Copy size={12} />} {copiedCitation ? "Copied" : "Copy"}
                              </button>
                            </div>
                            <p className="text-sm text-foreground font-mono leading-relaxed">{citationResult.citation}</p>
                          </div>
                          {citationResult.inText && (
                            <div className="p-3 rounded-xl bg-white/2 border border-white/6">
                              <span className="text-xs text-muted-foreground">In-text: </span>
                              <span className="text-sm text-foreground font-mono">{citationResult.inText}</span>
                            </div>
                          )}
                          {citationResult.notes && <p className="text-xs text-muted-foreground italic">{citationResult.notes}</p>}
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ─── Topic Comparison Tool ──────────────────────────────────────────── */}
            <div className="glass rounded-2xl border border-white/8 overflow-hidden">
              <button
                onClick={() => setShowCompareTool(!showCompareTool)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/3 transition-colors"
              >
                <span className="text-sm font-medium text-foreground flex items-center gap-2">
                  <GitCompare size={15} className="text-[oklch(0.75_0.20_40)]" /> Topic Comparison
                  <span className="text-xs text-muted-foreground font-normal">AI-powered side-by-side analysis</span>
                </span>
                {showCompareTool ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
              </button>
              <AnimatePresence>
                {showCompareTool && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden border-t border-white/5">
                    <div className="p-6 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Topic A *</label>
                          <input value={compareForm.topicA} onChange={e => setCompareForm(f => ({ ...f, topicA: e.target.value }))} placeholder="e.g. React" className="w-full bg-white/3 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[oklch(0.65_0.22_200_/_0.5)] transition-colors" />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Topic B *</label>
                          <input value={compareForm.topicB} onChange={e => setCompareForm(f => ({ ...f, topicB: e.target.value }))} placeholder="e.g. Vue" className="w-full bg-white/3 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[oklch(0.65_0.22_200_/_0.5)] transition-colors" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Context (optional)</label>
                        <input value={compareForm.context} onChange={e => setCompareForm(f => ({ ...f, context: e.target.value }))} placeholder="e.g. for building a large-scale SaaS app" className="w-full bg-white/3 border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-[oklch(0.65_0.22_200_/_0.5)] transition-colors" />
                      </div>
                      <motion.button
                        onClick={() => { if (!compareForm.topicA.trim() || !compareForm.topicB.trim()) { toast.error("Both topics are required"); return; } setCompareResult(null); compareTopics.mutate({ ...compareForm, cookieId: cookieId ?? undefined }); }}
                        disabled={compareTopics.isPending}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[oklch(0.72_0.18_40_/_0.15)] border border-[oklch(0.72_0.18_40_/_0.3)] text-sm font-medium text-[oklch(0.82_0.18_40)] disabled:opacity-50 hover:bg-[oklch(0.72_0.18_40_/_0.2)] transition-colors"
                      >
                        {compareTopics.isPending ? <Loader2 size={14} className="animate-spin" /> : <GitCompare size={14} />}
                        {compareTopics.isPending ? "Comparing..." : "Compare Topics (+15 XP)"}
                      </motion.button>
                      {compareResult && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                          <h3 className="text-base font-semibold text-foreground">{compareResult.title}</h3>
                          <p className="text-sm text-muted-foreground">{compareResult.overview}</p>
                          {compareResult.similarities.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Similarities</h4>
                              <ul className="space-y-1">{compareResult.similarities.map((s, i) => <li key={i} className="flex items-start gap-2 text-sm text-foreground"><Check size={12} className="text-green-400 mt-0.5 shrink-0" />{s}</li>)}</ul>
                            </div>
                          )}
                          {compareResult.differences.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Key Differences</h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead><tr><th className="text-left py-2 pr-4 text-muted-foreground font-medium text-xs">Aspect</th><th className="text-left py-2 pr-4 text-[oklch(0.75_0.20_200)] font-medium text-xs">{compareForm.topicA}</th><th className="text-left py-2 text-[oklch(0.75_0.20_40)] font-medium text-xs">{compareForm.topicB}</th></tr></thead>
                                  <tbody>{compareResult.differences.map((d, i) => <tr key={i} className="border-t border-white/5"><td className="py-2 pr-4 text-muted-foreground font-medium">{d.aspect}</td><td className="py-2 pr-4 text-foreground">{d.topicA}</td><td className="py-2 text-foreground">{d.topicB}</td></tr>)}</tbody>
                                </table>
                              </div>
                            </div>
                          )}
                          {compareResult.verdict && (
                            <div className="p-4 rounded-xl bg-white/3 border border-white/8">
                              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Verdict</h4>
                              <p className="text-sm text-foreground">{compareResult.verdict}</p>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Saved Sessions */}
            {cookieId && (
              <div className="glass rounded-2xl border border-white/8 overflow-hidden">
                <button
                  onClick={() => setShowSessions(!showSessions)}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/3 transition-colors"
                >
                  <span className="text-sm font-medium text-foreground flex items-center gap-2">
                    <BookMarked size={15} /> Your Research Library
                  </span>
                  {showSessions ? <ChevronUp size={15} className="text-muted-foreground" /> : <ChevronDown size={15} className="text-muted-foreground" />}
                </button>
                <AnimatePresence>
                  {showSessions && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden border-t border-white/5"
                    >
                      <div className="p-6">
                        {loadSessions.isLoading ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 size={14} className="animate-spin" /> Loading sessions...
                          </div>
                        ) : loadSessions.data && loadSessions.data.length > 0 ? (
                          <div className="space-y-3">
                            {loadSessions.data.map((session) => (
                              <div key={session.id} className="flex items-start justify-between p-4 rounded-xl bg-white/3 border border-white/6 hover:border-white/12 transition-all">
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-medium text-foreground truncate">{session.title}</h4>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1"><Clock size={10} /> {new Date(session.createdAt).toLocaleDateString()}</span>
                                    {session.tags && (session.tags as string[]).length > 0 && (
                                      <span className="flex items-center gap-1"><Tag size={10} /> {(session.tags as string[]).slice(0, 2).join(", ")}</span>
                                    )}
                                  </div>
                                </div>
                                <ArrowRight size={14} className="text-muted-foreground shrink-0 mt-1 ml-3" />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No saved sessions yet. Analyze some content and save it here.</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Contribute to Library Modal */}
      <AnimatePresence>
        {showContributeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowContributeModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass rounded-2xl border border-white/15 p-6 w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Library size={18} className="text-[oklch(0.65_0.22_200)]" />
                  Contribute to Library
                </h3>
                <button onClick={() => setShowContributeModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X size={18} />
                </button>
              </div>
              <p className="text-sm text-muted-foreground mb-5">Share this resource with the Nexus community. It will be added to the shared Library for everyone to discover. +50 XP</p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Title</label>
                  <input
                    value={contributeForm.title || result?.title || ""}
                    onChange={(e) => setContributeForm(f => ({ ...f, title: e.target.value }))}
                    className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-[oklch(0.65_0.22_200_/_0.5)] transition-colors"
                    placeholder="Resource title"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Description</label>
                  <textarea
                    value={contributeForm.description || result?.summary.slice(0, 200) || ""}
                    onChange={(e) => setContributeForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full h-20 bg-white/3 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-[oklch(0.65_0.22_200_/_0.5)] resize-none transition-colors"
                    placeholder="Brief description of this resource..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Category</label>
                    <select
                      value={contributeForm.category}
                      onChange={(e) => setContributeForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full bg-white/3 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-[oklch(0.65_0.22_200_/_0.5)] transition-colors"
                    >
                      {["AI & Machine Learning","Web Development","Computer Science","Data Science","Software Engineering","Research Methods","Productivity","Mathematics","Science","Other"].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Type</label>
                    <select
                      value={contributeForm.type}
                      onChange={(e) => setContributeForm(f => ({ ...f, type: e.target.value as typeof contributeForm.type }))}
                      className="w-full bg-white/3 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-[oklch(0.65_0.22_200_/_0.5)] transition-colors"
                    >
                      {["article","video","course","tool","paper","book","repo"].map(t => (
                        <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tags (comma-separated)</label>
                  <input
                    value={contributeForm.tags}
                    onChange={(e) => setContributeForm(f => ({ ...f, tags: e.target.value }))}
                    className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-[oklch(0.65_0.22_200_/_0.5)] transition-colors"
                    placeholder="e.g. ai, machine-learning, tutorial"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowContributeModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-muted-foreground hover:bg-white/8 transition-colors"
                >
                  Cancel
                </button>
                <motion.button
                  onClick={handleContribute}
                  disabled={contributeMutation.isPending}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 py-2.5 rounded-xl bg-[oklch(0.65_0.22_200_/_0.2)] border border-[oklch(0.65_0.22_200_/_0.4)] text-sm font-semibold text-[oklch(0.8_0.22_200)] disabled:opacity-50 hover:bg-[oklch(0.65_0.22_200_/_0.3)] transition-colors flex items-center justify-center gap-2"
                >
                  {contributeMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Library size={14} />}
                  {contributeMutation.isPending ? "Contributing..." : "Contribute (+50 XP)"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
}
