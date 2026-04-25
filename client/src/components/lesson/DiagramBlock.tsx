import { useEffect, useRef, useState } from "react";
import type { DiagramBlock as DiagramBlockType } from "@shared/types/lessonSeed";

let mermaidInitialized = false;

async function getMermaid() {
  const mermaid = (await import("mermaid")).default;
  if (!mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "dark",
    });
    mermaidInitialized = true;
  }
  return mermaid;
}

export function DiagramBlock({ block }: { block: DiagramBlockType }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = await getMermaid();
        await mermaid.parse(block.mermaid);
        const id = `mermaid-${block.id.replace(/[^a-z0-9]/gi, "_")}`;
        const { svg } = await mermaid.render(id, block.mermaid);
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [block.mermaid, block.id]);

  return (
    <div className="glass rounded-2xl p-5 border border-white/10">
      {block.title && (
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          {block.title}
        </p>
      )}
      {error ? (
        <pre className="text-xs text-muted-foreground bg-white/3 rounded-xl p-3 overflow-auto whitespace-pre-wrap">
          {block.mermaid}
          {"\n\n[Diagram could not be rendered]"}
        </pre>
      ) : (
        <div ref={ref} className="overflow-auto flex justify-center" />
      )}
      {block.caption && (
        <p className="text-xs text-muted-foreground mt-3 text-center italic">{block.caption}</p>
      )}
    </div>
  );
}
