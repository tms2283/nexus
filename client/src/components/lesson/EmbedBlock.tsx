import { useState } from "react";
import { ExternalLink, Lock } from "lucide-react";
import type { EmbedBlock as EmbedBlockType } from "@shared/types/lessonSeed";

const ALLOWED_EMBED_HOSTS = new Set([
  "www.youtube.com", "youtube.com", "www.youtube-nocookie.com",
  "phet.colorado.edu",
  "ocw.mit.edu",
  "openstax.org", "cnx.org",
  "openlearn.open.ac.uk",
  "saylor.org",
  "libretexts.org", "math.libretexts.org", "chem.libretexts.org",
  "phys.libretexts.org", "bio.libretexts.org",
  "wolframalpha.com", "www.wolframalpha.com",
]);

const COMMERCIAL_MODE = import.meta.env.VITE_NEXUS_COMMERCIAL === "true";

function isHostAllowed(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return ALLOWED_EMBED_HOSTS.has(host);
  } catch {
    return false;
  }
}

function isYouTube(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host.includes("youtube") || host.includes("youtu.be");
  } catch {
    return false;
  }
}

export function EmbedBlock({ block }: { block: EmbedBlockType }) {
  const [afterRevealed, setAfterRevealed] = useState(false);

  if (COMMERCIAL_MODE && block.licenseCategory === "nc_only") {
    return (
      <div className="glass rounded-2xl p-5 border border-white/10 flex items-center gap-3">
        <Lock size={16} className="text-muted-foreground flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground">{block.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            This resource is unavailable in this deployment (non-commercial license).
          </p>
        </div>
      </div>
    );
  }

  const useIframe = block.displayMode === "iframe" && isHostAllowed(block.url);

  return (
    <div className="glass rounded-2xl overflow-hidden border border-white/10">
      {block.beforePrompt && (
        <div className="px-5 pt-5 pb-3">
          <p className="text-sm text-muted-foreground italic">{block.beforePrompt}</p>
        </div>
      )}

      <div className="px-5 pb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          {block.sourcePlatform} · {block.estimatedMinutes ? `~${block.estimatedMinutes} min` : "Resource"}
        </p>
        <p className="text-sm font-medium text-foreground mb-3">{block.title}</p>
      </div>

      {useIframe ? (
        <div className="relative" style={{ paddingBottom: "56.25%", height: 0 }}>
          <iframe
            src={block.url}
            title={block.title}
            className="absolute inset-0 w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
            referrerPolicy="no-referrer"
            loading="lazy"
            allow={isYouTube(block.url) ? "fullscreen" : undefined}
          />
        </div>
      ) : (
        <div className="px-5 pb-4">
          <a
            href={block.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-[oklch(0.65_0.22_200)] hover:underline"
          >
            <ExternalLink size={14} />
            Open resource in new tab
          </a>
        </div>
      )}

      {block.afterPrompt && (
        <div className="px-5 pb-5 pt-3 border-t border-white/10">
          {!afterRevealed ? (
            <button
              onClick={() => setAfterRevealed(true)}
              className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/15 hover:bg-white/10 transition-colors"
            >
              I've explored this — show reflection prompt
            </button>
          ) : (
            <p className="text-sm text-foreground leading-relaxed">{block.afterPrompt}</p>
          )}
        </div>
      )}
    </div>
  );
}
