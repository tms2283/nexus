import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb } from "lucide-react";
import type { ProductiveFailureBlock as ProductiveFailureBlockType } from "@shared/types/lessonSeed";

/**
 * Productive failure pedagogy: ask the learner to commit to an answer
 * before any instruction. The act of attempting + being wrong primes
 * deeper encoding when the canonical insight is revealed (Kapur 2008).
 */
export function ProductiveFailureBlock({ block }: { block: ProductiveFailureBlockType }) {
  const [draft, setDraft] = useState("");
  const [committed, setCommitted] = useState(false);

  return (
    <div className="glass rounded-2xl p-5 border border-[oklch(0.72_0.18_290_/_0.3)]">
      <div className="flex items-center gap-2 text-[oklch(0.78_0.18_290)] mb-2">
        <Lightbulb size={16} />
        <span className="text-xs font-semibold uppercase tracking-wide">Try first, learn deeper</span>
      </div>
      <p className="text-sm text-foreground mb-3">{block.scenario}</p>
      <p className="text-sm text-muted-foreground mb-3">{block.learnerPrompt}</p>
      <textarea
        value={draft}
        onChange={e => setDraft(e.target.value)}
        disabled={committed}
        rows={3}
        placeholder="Your current best guess…"
        className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-[oklch(0.72_0.18_290_/_0.5)] transition-colors disabled:opacity-60"
      />
      {!committed && (
        <button
          onClick={() => draft.trim().length > 0 && setCommitted(true)}
          disabled={draft.trim().length === 0}
          className="mt-3 px-4 py-2 rounded-xl bg-[oklch(0.72_0.18_290_/_0.18)] border border-[oklch(0.72_0.18_290_/_0.4)] text-sm text-[oklch(0.85_0.15_290)] hover:bg-[oklch(0.72_0.18_290_/_0.28)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Commit my answer
        </button>
      )}
      <AnimatePresence>
        {committed && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-xl bg-[oklch(0.72_0.18_290_/_0.08)] border border-[oklch(0.72_0.18_290_/_0.25)]"
          >
            <p className="text-xs font-semibold text-[oklch(0.85_0.15_290)] uppercase tracking-wide mb-1">
              The canonical answer
            </p>
            <p className="text-sm text-foreground">{block.canonicalInsight}</p>
            <p className="text-xs text-muted-foreground mt-2">
              The gap between your attempt and this is the most valuable learning moment in the lesson — sit with it.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
