import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScanSearch } from "lucide-react";
import type { SpanSelectBlock as SpanSelectBlockType } from "@shared/types/lessonSeed";

/**
 * Span-selection exercise: ask the learner to highlight the hallucinated
 * portion of a paragraph. Trains the most important skill in working with
 * LLMs — verifying outputs sentence by sentence.
 */
export function SpanSelectBlock({ block }: { block: SpanSelectBlockType }) {
  const [selection, setSelection] = useState<[number, number] | null>(null);
  const [revealed, setRevealed] = useState(false);

  const handleMouseUp = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    const container = document.getElementById(`span-target-${block.id}`);
    if (!container) return;
    if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) {
      return;
    }
    const fullText = block.paragraph;
    const start = fullText.indexOf(sel.toString());
    if (start < 0 || sel.toString().length === 0) return;
    setSelection([start, start + sel.toString().length]);
  };

  const overlap = useMemo(() => {
    if (!selection) return 0;
    let total = 0;
    for (const [s, e] of block.hallucinatedSpans) {
      const lo = Math.max(s, selection[0]);
      const hi = Math.min(e, selection[1]);
      if (hi > lo) total += hi - lo;
    }
    const denom = block.hallucinatedSpans.reduce((acc, [s, e]) => acc + (e - s), 0);
    return denom > 0 ? total / denom : 0;
  }, [selection, block.hallucinatedSpans]);

  const renderRevealed = () => {
    const segments: Array<{ text: string; flagged: boolean }> = [];
    let cursor = 0;
    const sorted = [...block.hallucinatedSpans].sort((a, b) => a[0] - b[0]);
    for (const [s, e] of sorted) {
      if (s > cursor) segments.push({ text: block.paragraph.slice(cursor, s), flagged: false });
      segments.push({ text: block.paragraph.slice(s, e), flagged: true });
      cursor = e;
    }
    if (cursor < block.paragraph.length) {
      segments.push({ text: block.paragraph.slice(cursor), flagged: false });
    }
    return segments;
  };

  return (
    <div className="glass rounded-2xl p-5 border border-white/10">
      <div className="flex items-center gap-2 text-[oklch(0.72_0.22_30)] mb-2">
        <ScanSearch size={16} />
        <span className="text-xs font-semibold uppercase tracking-wide">Spot the hallucination</span>
      </div>
      <p className="text-sm text-muted-foreground mb-3">{block.instructions}</p>
      <div
        id={`span-target-${block.id}`}
        onMouseUp={handleMouseUp}
        className={`p-4 rounded-xl bg-white/3 border border-white/10 text-sm text-foreground leading-relaxed cursor-text ${
          revealed ? "select-none" : "select-text"
        }`}
      >
        {revealed
          ? renderRevealed().map((seg, i) =>
              seg.flagged ? (
                <mark
                  key={i}
                  className="bg-[oklch(0.72_0.22_30_/_0.25)] text-foreground rounded px-0.5"
                >
                  {seg.text}
                </mark>
              ) : (
                <span key={i}>{seg.text}</span>
              )
            )
          : block.paragraph}
      </div>

      {!revealed && (
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={() => setRevealed(true)}
            className="px-4 py-2 rounded-xl bg-[oklch(0.72_0.22_30_/_0.18)] border border-[oklch(0.72_0.22_30_/_0.4)] text-sm text-[oklch(0.85_0.2_30)] hover:bg-[oklch(0.72_0.22_30_/_0.28)] transition-colors"
          >
            Reveal correct spans
          </button>
          {selection && (
            <span className="text-xs text-muted-foreground">
              You selected {selection[1] - selection[0]} characters
            </span>
          )}
        </div>
      )}

      <AnimatePresence>
        {revealed && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-xl bg-[oklch(0.72_0.22_30_/_0.06)] border border-[oklch(0.72_0.22_30_/_0.2)]"
          >
            <p className="text-xs font-semibold text-[oklch(0.85_0.2_30)] uppercase tracking-wide mb-1">
              Why this is a hallucination
            </p>
            <p className="text-sm text-foreground">{block.explanation}</p>
            {selection && (
              <p className="text-xs text-muted-foreground mt-2">
                Your selection overlapped {Math.round(overlap * 100)}% of the hallucinated spans.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
