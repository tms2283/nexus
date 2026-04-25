import { useState } from "react";
import type { ComputationBlock as ComputationBlockType } from "@shared/types/lessonSeed";
import { Calculator, ChevronDown } from "lucide-react";

export function ComputationBlock({ block }: { block: ComputationBlockType }) {
  const [takeawayVisible, setTakeawayVisible] = useState(false);
  const wolframUrl = `https://www.wolframalpha.com/input?i=${encodeURIComponent(block.wolframQuery)}`;

  return (
    <div className="glass rounded-2xl p-5 border border-white/10 space-y-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Calculator size={14} />
        <span className="text-xs font-semibold uppercase tracking-wide">Computation</span>
      </div>

      <p className="text-sm text-foreground leading-relaxed">{block.prompt}</p>

      <div className="relative" style={{ paddingBottom: "50%", height: 0 }}>
        <iframe
          src={wolframUrl}
          title={block.prompt}
          className="absolute inset-0 w-full h-full rounded-xl border border-white/10"
          sandbox="allow-scripts allow-same-origin"
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      </div>

      {!takeawayVisible ? (
        <button
          onClick={() => setTakeawayVisible(true)}
          className="flex items-center gap-2 text-xs px-3 py-2 rounded-xl bg-white/5 border border-white/15 hover:bg-white/10 transition-colors"
        >
          <ChevronDown size={12} />
          I've explored — what should I notice?
        </button>
      ) : (
        <div className="p-3 rounded-xl bg-white/3 border border-white/10">
          <p className="text-sm text-foreground leading-relaxed">{block.takeaway}</p>
        </div>
      )}
    </div>
  );
}
