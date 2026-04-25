import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import PageWrapper from "@/components/PageWrapper";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  BookOpen, Plus, Brain, RotateCcw, ChevronRight,
  Trophy, Zap, Clock, CheckCircle, XCircle, Layers,
  Sparkles, ArrowLeft, BarChart3
} from "lucide-react";

type Flashcard = {
  id: number;
  deckId: number;
  front: string;
  back: string;
  easeFactor: number;
  repetitions: number;
  interval: number;
  dueDate: Date | string;
};

type Deck = {
  id: number;
  title: string;
  description: string | null;
  cardCount: number;
  sourceType: string;
  createdAt: Date | string;
};

type ReviewRating = "again" | "hard" | "good" | "easy";

type SessionStats = {
  reviewed: number;
  again: number;
  hard: number;
  good: number;
  easy: number;
  startTime: number;
};

export default function Flashcards() {
  const { cookieId, addXP } = usePersonalization();
  const [view, setView] = useState<"decks" | "review" | "generate" | "complete">("decks");
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionStats, setSessionStats] = useState<SessionStats>({ reviewed: 0, again: 0, hard: 0, good: 0, easy: 0, startTime: Date.now() });
  const [generateTopic, setGenerateTopic] = useState("");
  const [generateCount, setGenerateCount] = useState(10);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: decks, refetch: refetchDecks } = trpc.flashcards.getDecks.useQuery(
    { cookieId },
    { enabled: !!cookieId }
  );

  const reviewMutation = trpc.flashcards.review.useMutation();
  const completeMutation = trpc.flashcards.completeSession.useMutation();
  const generateMutation = trpc.flashcards.generateDeck.useMutation();

  const { data: deckCards, refetch: refetchCards } = trpc.flashcards.getCards.useQuery(
    { deckId: selectedDeck?.id ?? 0, cookieId: cookieId ?? "" },
    { enabled: !!selectedDeck && !!cookieId }
  );

  useEffect(() => {
    if (deckCards) setCards(deckCards as Flashcard[]);
  }, [deckCards]);

  const startReview = useCallback((deck: Deck) => {
    setSelectedDeck(deck);
    setCurrentIndex(0);
    setIsFlipped(false);
    setSessionStats({ reviewed: 0, again: 0, hard: 0, good: 0, easy: 0, startTime: Date.now() });
    setView("review");
  }, []);

  const handleRate = useCallback(async (rating: ReviewRating) => {
    if (!selectedDeck || !cards[currentIndex]) return;
    const card = cards[currentIndex];

    await reviewMutation.mutateAsync({
      cardId: card.id,
      deckId: selectedDeck.id,
      cookieId,
      rating,
    });

    setSessionStats(prev => ({
      ...prev,
      reviewed: prev.reviewed + 1,
      [rating]: prev[rating] + 1,
    }));

    if (currentIndex + 1 >= cards.length) {
      // Session complete
      const xpResult = await completeMutation.mutateAsync({
        cookieId,
        cardsReviewed: sessionStats.reviewed + 1,
      });
      if (xpResult && typeof xpResult === 'object' && 'xpGained' in xpResult) {
        addXP((xpResult as { xpGained: number }).xpGained);
      }
      setView("complete");
    } else {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(i => i + 1), 150);
    }
  }, [selectedDeck, cards, currentIndex, cookieId, sessionStats.reviewed, reviewMutation, completeMutation, addXP]);

  const handleGenerate = async () => {
    if (!generateTopic.trim()) return;
    setIsGenerating(true);
    try {
      const result = await generateMutation.mutateAsync({
        cookieId,
        topic: generateTopic,
        count: generateCount,
      });
      toast.success(`Generated ${result.cardCount} flashcards!`);
      addXP(15);
      await refetchDecks();
      setGenerateTopic("");
      setView("decks");
    } catch (err) {
      toast.error("Failed to generate flashcards. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const currentCard = cards[currentIndex];
  const progress = cards.length > 0 ? ((currentIndex) / cards.length) * 100 : 0;
  const elapsed = Math.floor((Date.now() - sessionStats.startTime) / 1000);
  const elapsedStr = elapsed < 60 ? `${elapsed}s` : `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;

  const ratingColors: Record<ReviewRating, string> = {
    again: "border-red-500/50 hover:bg-red-500/10 hover:border-red-400 text-red-400",
    hard: "border-orange-500/50 hover:bg-orange-500/10 hover:border-orange-400 text-orange-400",
    good: "border-emerald-500/50 hover:bg-emerald-500/10 hover:border-emerald-400 text-emerald-400",
    easy: "border-cyan-500/50 hover:bg-cyan-500/10 hover:border-cyan-400 text-cyan-400",
  };

  return (
    <PageWrapper pageName="flashcards">
      <div className="min-h-screen pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto">

          {/* ── Decks View ─────────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            {view === "decks" && (
              <motion.div key="decks" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                {/* Header */}
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <h1 className="text-4xl font-bold text-white mb-2">
                      Flashcard <span className="text-gradient">Decks</span>
                    </h1>
                    <p className="text-white/50">Spaced repetition powered by the SM-2 algorithm</p>
                  </div>
                  <Button
                    onClick={() => setView("generate")}
                    className="bg-violet-600 hover:bg-violet-500 text-white gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Generate with AI
                  </Button>
                </div>

                {/* Stats bar */}
                {decks && decks.length > 0 && (
                  <div className="card-nexus p-4 mb-8 flex gap-6">
                    <div className="flex items-center gap-2 text-white/70">
                      <Layers className="w-4 h-4 text-violet-400" />
                      <span className="text-sm">{decks.length} decks</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/70">
                      <BookOpen className="w-4 h-4 text-cyan-400" />
                      <span className="text-sm">{decks.reduce((a, d) => a + (d.cardCount ?? 0), 0)} total cards</span>
                    </div>
                  </div>
                )}

                {/* Deck grid */}
                {!decks || decks.length === 0 ? (
                  <div className="text-center py-20">
                    <Brain className="w-16 h-16 text-white/20 mx-auto mb-4" />
                    <p className="text-white/40 text-lg mb-2">No flashcard decks yet</p>
                    <p className="text-white/30 text-sm mb-6">Generate a deck with AI or create one from a Research session</p>
                    <Button onClick={() => setView("generate")} className="bg-violet-600 hover:bg-violet-500 text-white gap-2">
                      <Sparkles className="w-4 h-4" />
                      Generate Your First Deck
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(decks as Deck[]).map((deck) => (
                      <motion.div
                        key={deck.id}
                        className="glass rounded-xl p-6 border border-border/60 hover:border-violet-500/30 transition-all cursor-pointer group"
                        whileHover={{ scale: 1.01 }}
                        onClick={() => startReview(deck)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="p-2 rounded-lg bg-violet-500/10">
                            <BookOpen className="w-5 h-5 text-violet-400" />
                          </div>
                          <span className="text-xs text-white/30 capitalize">{deck.sourceType?.replace("_", " ")}</span>
                        </div>
                        <h3 className="text-white font-semibold mb-1 group-hover:text-violet-300 transition-colors">{deck.title}</h3>
                        {deck.description && <p className="text-white/40 text-sm mb-3 line-clamp-2">{deck.description}</p>}
                        <div className="flex items-center justify-between">
                          <span className="text-white/50 text-sm">{deck.cardCount} cards</span>
                          <Button size="sm" className="bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-500/30 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            Study <ChevronRight className="w-3 h-3" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Generate View ─────────────────────────────────────── */}
            {view === "generate" && (
              <motion.div key="generate" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                <button onClick={() => setView("decks")} className="flex items-center gap-2 text-white/50 hover:text-white mb-8 transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Back to Decks
                </button>
                <div className="max-w-lg mx-auto">
                  <div className="text-center mb-10">
                    <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
                      <Sparkles className="w-8 h-8 text-violet-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">AI Flashcard Generator</h2>
                    <p className="text-white/50">Enter any topic and AI will generate a complete study deck</p>
                  </div>
                  <div className="card-nexus p-8 space-y-6">
                    <div>
                      <label className="text-white/70 text-sm font-medium block mb-2">Topic or Concept</label>
                      <input
                        value={generateTopic}
                        onChange={e => setGenerateTopic(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleGenerate()}
                        placeholder="e.g. Transformer architecture, React hooks, Stoic philosophy..."
                        className="w-full bg-[var(--surface-1)] border border-border/60 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-white/70 text-sm font-medium block mb-2">Number of Cards: {generateCount}</label>
                      <input
                        type="range" min={5} max={30} value={generateCount}
                        onChange={e => setGenerateCount(Number(e.target.value))}
                        className="w-full accent-violet-500"
                      />
                      <div className="flex justify-between text-white/30 text-xs mt-1">
                        <span>5 (quick)</span><span>30 (comprehensive)</span>
                      </div>
                    </div>
                    <Button
                      onClick={handleGenerate}
                      disabled={!generateTopic.trim() || isGenerating}
                      className="w-full bg-violet-600 hover:bg-violet-500 text-white py-3 gap-2"
                    >
                      {isGenerating ? (
                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</>
                      ) : (
                        <><Sparkles className="w-4 h-4" /> Generate {generateCount} Flashcards</>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Review View ───────────────────────────────────────── */}
            {view === "review" && currentCard && (
              <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Session header */}
                <div className="flex items-center justify-between mb-6">
                  <button onClick={() => setView("decks")} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4" /> {selectedDeck?.title}
                  </button>
                  <div className="flex items-center gap-4 text-white/50 text-sm">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {elapsedStr}</span>
                    <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" /> {sessionStats.reviewed}/{cards.length}</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1 bg-[var(--surface-2)] rounded-full mb-8 overflow-hidden">
                  <motion.div className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
                </div>

                {/* Card counter */}
                <p className="text-center text-white/30 text-sm mb-4">{currentIndex + 1} of {cards.length}</p>

                {/* Flip card */}
                <div className="relative h-64 mb-8 cursor-pointer" onClick={() => setIsFlipped(f => !f)} style={{ perspective: "1000px" }}>
                  <motion.div
                    className="relative w-full h-full"
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.4, type: "spring", stiffness: 300, damping: 30 }}
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    {/* Front */}
                    <div className="absolute inset-0 card-nexus flex flex-col items-center justify-center p-8 text-center" style={{ backfaceVisibility: "hidden" }}>
                      <div className="text-xs text-violet-400 font-mono uppercase tracking-widest mb-4">Question</div>
                      <p className="text-white text-xl font-medium leading-relaxed">{currentCard.front}</p>
                      <p className="text-white/30 text-sm mt-6">Click to reveal answer</p>
                    </div>
                    {/* Back */}
                    <div className="absolute inset-0 card-nexus border-[var(--nexus-purple-border)] bg-[var(--nexus-purple-fill)] flex flex-col items-center justify-center p-8 text-center" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                      <div className="text-xs text-cyan-400 font-mono uppercase tracking-widest mb-4">Answer</div>
                      <p className="text-white text-xl font-medium leading-relaxed">{currentCard.back}</p>
                    </div>
                  </motion.div>
                </div>

                {/* Rating buttons */}
                <AnimatePresence>
                  {isFlipped && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-4 gap-3">
                      {(["again", "hard", "good", "easy"] as ReviewRating[]).map((rating) => (
                        <button
                          key={rating}
                          onClick={() => handleRate(rating)}
                          className={`py-3 rounded-xl border bg-transparent font-medium text-sm capitalize transition-all ${ratingColors[rating]}`}
                        >
                          {rating === "again" && <XCircle className="w-4 h-4 mx-auto mb-1" />}
                          {rating === "hard" && <RotateCcw className="w-4 h-4 mx-auto mb-1" />}
                          {rating === "good" && <CheckCircle className="w-4 h-4 mx-auto mb-1" />}
                          {rating === "easy" && <Zap className="w-4 h-4 mx-auto mb-1" />}
                          {rating}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {!isFlipped && (
                  <p className="text-center text-white/20 text-sm mt-4">Rate your recall after flipping the card</p>
                )}
              </motion.div>
            )}

            {/* ── Complete View ─────────────────────────────────────── */}
            {view === "complete" && (
              <motion.div key="complete" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center py-10">
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center mx-auto mb-6"
                >
                  <Trophy className="w-12 h-12 text-white" />
                </motion.div>
                <h2 className="text-3xl font-bold text-white mb-2">Session Complete!</h2>
                <p className="text-white/50 mb-8">You reviewed {sessionStats.reviewed} cards in {elapsedStr}</p>

                <div className="card-nexus p-6 max-w-sm mx-auto mb-8">
                  <div className="grid grid-cols-4 gap-4 text-center">
                    {[
                      { label: "Again", value: sessionStats.again, color: "text-red-400" },
                      { label: "Hard", value: sessionStats.hard, color: "text-orange-400" },
                      { label: "Good", value: sessionStats.good, color: "text-emerald-400" },
                      { label: "Easy", value: sessionStats.easy, color: "text-cyan-400" },
                    ].map(s => (
                      <div key={s.label}>
                        <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                        <div className="text-white/40 text-xs">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 justify-center">
                  <Button onClick={() => { setView("decks"); refetchDecks(); }} variant="outline" className="border-white/10 text-white/70 hover:text-white">
                    Back to Decks
                  </Button>
                  <Button onClick={() => { startReview(selectedDeck!); refetchCards(); }} className="bg-violet-600 hover:bg-violet-500 text-white gap-2">
                    <RotateCcw className="w-4 h-4" /> Review Again
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </PageWrapper>
  );
}
