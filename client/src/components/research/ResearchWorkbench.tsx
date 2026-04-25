/**
 * ResearchWorkbench — full research UI for the Nexus site.
 *
 * Tabs:
 *   • "Notebook"      → 3-panel: Sources | Chat | Studio/Create
 *   • "Knowledge Tree"→ D3 force-graph with collapsible, size-weighted nodes
 *   • "Charts"        → Topic heat-map / bar / bubble visualizations
 *   • "Rabbit Holes"  → Curated deep-dive rabbit holes with AI expansion
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AudioLines,
  BarChart2,
  BookOpen,
  Bot,
  ChevronDown,
  FileText,
  Globe,
  Loader2,
  Maximize2,
  Minimize2,
  Network,
  Plus,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
} from "d3-force";
import { Streamdown } from "streamdown";
import { trpc } from "@/lib/trpc";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import PageWrapper from "@/components/PageWrapper";
import AudioPlayer from "@/components/AudioPlayer";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

type ResearchTab = "notebook" | "kt" | "charts" | "rabbit-holes";

type ChatMsg = {
  role: "user" | "assistant";
  content: string;
  citations?: Array<{ title: string; url: string; excerpt?: string }>;
};

type StudioState =
  | { mode: "idle" }
  | { mode: "loading"; label: string }
  | { mode: "text"; type: string; label: string; content: string }
  | { mode: "audio"; audioUrl: string; title: string; durationSeconds?: number };

interface KTNode {
  id: number;
  topic: string;
  canonicalKey: string;
  state: "unexplored" | "loading" | "explored";
  collapsed: boolean;
  summary: string;
  subtopics: string[];
  depth: number;
  seenCount: number;
  discoveredFrom: Set<number>;
  neighbors: Set<number>;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number | null;
  fy?: number | null;
}

interface KTLink {
  id: string;
  sourceId: number;
  targetId: number;
  type: "seed" | "related" | "convergent";
  count: number;
  source?: KTNode | number;
  target?: KTNode | number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normTopic(t: string) {
  return t.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

/** Heat-map / bubble color based on 0-100 importance value */
function importanceColor(v: number): string {
  if (v >= 70) {
    const t = (v - 70) / 30;
    return `oklch(${(0.60 + t * 0.08).toFixed(2)} ${(0.22 + t * 0.06).toFixed(2)} ${(60 - t * 40).toFixed(0)})`;
  }
  if (v >= 35) {
    const t = (v - 35) / 35;
    return `oklch(${(0.50 + t * 0.10).toFixed(2)} 0.18 ${(230 - t * 170).toFixed(0)})`;
  }
  const t = v / 35;
  return `oklch(${(0.28 + t * 0.22).toFixed(2)} ${(0.06 + t * 0.12).toFixed(2)} 255)`;
}

const STUDIO_TILES = [
  { type: "study-guide", icon: "📚", label: "Study Guide" },
  { type: "briefing",    icon: "📋", label: "Briefing Doc" },
  { type: "mindmap",     icon: "🗺️", label: "Mind Map" },
  { type: "timeline",    icon: "📅", label: "Timeline" },
  { type: "faq",         icon: "❓", label: "FAQ" },
  { type: "summary",     icon: "📝", label: "Summary" },
] as const;

// ─── Curated Rabbit Holes ─────────────────────────────────────────────────────

const RABBIT_HOLES = [
  {
    id: "fermi-paradox",
    emoji: "👾",
    title: "The Fermi Paradox",
    domain: "cosmology",
    teaser: "The Milky Way has 400 billion stars, most older than Earth. Almost certainly, many orbit habitable planets. So where is everybody?",
    hook: "If even 0.01% of stars had planets with intelligent life, the galaxy should be visibly full of civilizations. We hear nothing. The silence is deafening.",
  },
  {
    id: "dark-forest",
    emoji: "🌑",
    title: "Dark Forest Theory",
    domain: "cosmology",
    teaser: "What if the cosmic silence isn't emptiness — but predation? Every civilization hides because exposure means death.",
    hook: "Liu Cixin's chilling answer to the Fermi Paradox: the universe is a dark forest full of hunters. Any civilization that reveals itself gets annihilated.",
  },
  {
    id: "overview-effect",
    emoji: "🌍",
    title: "The Overview Effect",
    domain: "psychology",
    teaser: "Astronauts who see Earth from space describe a permanent, irreversible shift in consciousness that cannot be explained.",
    hook: "Over 600 humans have left Earth. Almost all describe the same thing: borders disappear, petty conflicts seem absurd, and Earth's fragility becomes overwhelming.",
  },
  {
    id: "wood-wide-web",
    emoji: "🍄",
    title: "The Wood Wide Web",
    domain: "biology",
    teaser: "Forests aren't collections of competing trees. They are a single, communicating superorganism connected by underground fungal networks.",
    hook: "Mother trees recognize their own kin and send extra nutrients to seedlings. Dying trees transfer their carbon to neighbors. The forest mourns its dead.",
  },
  {
    id: "mandela-effect",
    emoji: "🧠",
    title: "The Mandela Effect",
    domain: "psychology",
    teaser: "Thousands of people share the exact same false memory — in precise, specific detail — about things that never happened.",
    hook: "The Monopoly man never had a monocle. Fruit of the Loom never had a cornucopia. But millions remember them clearly. What does this tell us about memory and reality?",
  },
  {
    id: "ant-superorganism",
    emoji: "🐜",
    title: "Ant Superorganism",
    domain: "biology",
    teaser: "Ant colonies have no leader, no central brain, and no blueprint. Yet they practice agriculture, run hospitals, and wage sophisticated warfare.",
    hook: "A lone ant is barely smarter than a simple program. A colony of millions exhibits collective intelligence that outperforms most vertebrates. Where does the mind live?",
  },
  {
    id: "simulation",
    emoji: "💻",
    title: "The Simulation Hypothesis",
    domain: "philosophy",
    teaser: "Nick Bostrom's trilemma: one of three things must be true about our reality. All three options are deeply unsettling.",
    hook: "Either advanced civilizations go extinct before running simulations, or they choose not to, or we are almost certainly living in a simulation right now.",
  },
  {
    id: "epigenetics",
    emoji: "🧬",
    title: "Inherited Trauma",
    domain: "biology",
    teaser: "Your ancestors' most traumatic experiences may have physically altered your DNA — and you were born carrying those changes.",
    hook: "Grandchildren of famine survivors show different metabolic patterns. Children of Holocaust survivors have measurably different stress hormone profiles. Trauma writes itself into the genome.",
  },
  {
    id: "banach-tarski",
    emoji: "∞",
    title: "The Banach-Tarski Paradox",
    domain: "mathematics",
    teaser: "A proven mathematical theorem states you can decompose a sphere into a finite number of pieces and reassemble them into two identical spheres.",
    hook: "This is not a trick or an approximation. It is a formal proof. It works because infinity is far stranger than our intuitions about physical objects can handle.",
  },
  {
    id: "hadal-zone",
    emoji: "🌊",
    title: "The Hadal Zone",
    domain: "exploration",
    teaser: "We have better maps of Mars than of Earth's ocean trenches. At 11km deep, evolution proceeded in total isolation for millions of years.",
    hook: "The Mariana Trench is so deep that Mount Everest would be fully submerged with a mile to spare. The creatures down there have never seen sunlight.",
  },
  {
    id: "kowloon",
    emoji: "🏙️",
    title: "Kowloon Walled City",
    domain: "history",
    teaser: "The densest human settlement in history: 50,000 people in 2.7 acres, completely ungoverned, for nearly 50 years.",
    hook: "Abandoned by both Britain and China, Kowloon became a self-governing micro-nation with its own dentists, restaurants, social norms, and criminal underworld — all in a single tower.",
  },
  {
    id: "sleep-paralysis",
    emoji: "😴",
    title: "The Universal Demon",
    domain: "neuroscience",
    teaser: "Every human culture on Earth, completely independently, describes the same entity: a dark figure sitting on your chest at night.",
    hook: "The 'Old Hag' of Newfoundland. The 'Kanashibari' of Japan. The 'Popobawa' of Zanzibar. Different continents, different centuries, identical experiences. Why?",
  },
] as const;

type RabbitHoleId = typeof RABBIT_HOLES[number]["id"];

// ─── Sub-component: SourcesPanel ─────────────────────────────────────────────

function SourcesPanel({
  sources,
  activeSourceId,
  onSelectSource,
  onAddSources,
  isLoading,
}: {
  sources: Array<{ id: number; title: string; url: string; summary?: string | null }>;
  activeSourceId: number | null;
  onSelectSource: (id: number) => void;
  onAddSources: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="flex w-64 flex-none flex-col border-r border-white/10 bg-[rgba(9,11,20,0.92)] overflow-hidden">
      <div className="border-b border-white/10 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Sources</span>
          <span className="text-xs text-muted-foreground">{sources.length}</span>
        </div>
        <button
          onClick={onAddSources}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[oklch(0.72_0.18_200_/_0.18)] px-3 py-2 text-sm font-semibold text-[oklch(0.83_0.15_200)] transition hover:bg-[oklch(0.72_0.18_200_/_0.26)]"
        >
          <Plus size={14} /> Add Sources
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : sources.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center text-muted-foreground">
            <FileText size={28} className="mb-2 opacity-40" />
            <p className="text-xs">No sources yet. Click Add Sources to discover.</p>
          </div>
        ) : (
          sources.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelectSource(s.id)}
              className={`mb-1 flex w-full items-start gap-3 rounded-xl p-3 text-left transition ${
                activeSourceId === s.id
                  ? "border border-[oklch(0.72_0.18_200_/_0.4)] bg-[oklch(0.72_0.18_200_/_0.12)]"
                  : "hover:bg-white/5"
              }`}
            >
              <Globe size={14} className="mt-0.5 flex-none text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-foreground">{s.title}</p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">{s.url}</p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Sub-component: ChatPanel ─────────────────────────────────────────────────

function ChatPanel({
  history,
  onSend,
  isSending,
}: {
  history: ChatMsg[];
  onSend: (q: string) => void;
  isSending: boolean;
}) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  function submit() {
    const q = input.trim();
    if (!q || isSending) return;
    setInput("");
    onSend(q);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden border-r border-white/10">
      <div className="border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Bot size={14} /> Ask your sources
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Bot size={36} className="mb-3 opacity-30" />
            <p className="text-sm">Ask grounded questions about your sources.</p>
            <p className="mt-1 text-xs opacity-60">Answers cite the sources they draw from.</p>
          </div>
        ) : (
          history.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-[oklch(0.72_0.18_200_/_0.22)] text-foreground"
                  : "bg-white/5 text-foreground border border-white/10"
              }`}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <Streamdown>{msg.content}</Streamdown>
                  </div>
                ) : (
                  <p>{msg.content}</p>
                )}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-2 border-t border-white/10 pt-2 text-xs text-muted-foreground space-y-1">
                    {msg.citations.map((c) => (
                      <a key={c.url} href={c.url} target="_blank" rel="noreferrer"
                        className="block truncate hover:text-[oklch(0.83_0.15_200)] transition">
                        ↗ {c.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-white/10 p-3">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
            placeholder="Ask anything about your sources…"
            rows={2}
            className="flex-1 resize-none rounded-xl border border-white/10 bg-[rgba(6,8,18,0.7)] px-3 py-2 text-sm text-foreground outline-none transition focus:border-[oklch(0.72_0.18_200_/_0.45)] placeholder:text-muted-foreground"
          />
          <button onClick={submit} disabled={isSending || !input.trim()}
            className="self-end rounded-xl bg-[oklch(0.72_0.18_200_/_0.18)] px-4 py-2 text-sm font-semibold text-[oklch(0.83_0.15_200)] transition hover:bg-[oklch(0.72_0.18_200_/_0.26)] disabled:opacity-40">
            {isSending ? <Loader2 size={14} className="animate-spin" /> : "Ask"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-component: StudioPanel ───────────────────────────────────────────────

function StudioPanel({
  studio,
  hasProject,
  onGenerate,
  onGenerateAudio,
  latestAudio,
  isGeneratingAudio,
}: {
  studio: StudioState;
  hasProject: boolean;
  onGenerate: (type: string, label: string) => void;
  onGenerateAudio: () => void;
  latestAudio: { audio_url: string; duration_seconds: number; title: string } | null;
  isGeneratingAudio: boolean;
}) {
  return (
    <div className="flex w-80 flex-none flex-col overflow-hidden bg-[rgba(5,7,16,0.88)]">
      <div className="border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Sparkles size={14} /> Create
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <button onClick={onGenerateAudio} disabled={!hasProject || isGeneratingAudio}
          className="flex w-full items-center gap-4 rounded-2xl border border-[oklch(0.72_0.18_200_/_0.3)] bg-[oklch(0.72_0.18_200_/_0.08)] px-4 py-3 text-left transition hover:bg-[oklch(0.72_0.18_200_/_0.14)] disabled:opacity-40">
          <span className="text-2xl">🎙</span>
          <div>
            <p className="text-sm font-semibold text-foreground">Audio Overview</p>
            <p className="text-xs text-muted-foreground">Two-host podcast · AI narration</p>
          </div>
          {isGeneratingAudio && <Loader2 size={14} className="ml-auto animate-spin text-muted-foreground" />}
        </button>

        <div className="grid grid-cols-2 gap-2">
          {STUDIO_TILES.map((tile) => (
            <button key={tile.type} onClick={() => onGenerate(tile.type, tile.label)}
              disabled={!hasProject || studio.mode === "loading"}
              className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/5 p-4 text-center transition hover:border-[oklch(0.72_0.18_200_/_0.3)] hover:bg-[oklch(0.72_0.18_200_/_0.08)] disabled:opacity-40">
              <span className="text-2xl">{tile.icon}</span>
              <span className="mt-2 text-xs font-semibold text-foreground">{tile.label}</span>
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 min-h-[120px]">
          {studio.mode === "idle" && (
            <div className="flex flex-col items-center justify-center h-24 text-muted-foreground text-center">
              <Sparkles size={24} className="mb-2 opacity-30" />
              <p className="text-xs">Click a tile above to generate content</p>
            </div>
          )}
          {studio.mode === "loading" && (
            <div className="flex flex-col items-center justify-center h-24 gap-2 text-muted-foreground">
              <Loader2 size={20} className="animate-spin" />
              <p className="text-xs">Generating {studio.label}…</p>
            </div>
          )}
          {studio.mode === "text" && (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{studio.label}</p>
              <div className="prose prose-invert prose-sm max-w-none text-sm">
                <Streamdown>{studio.content}</Streamdown>
              </div>
            </div>
          )}
          {studio.mode === "audio" && (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Audio Overview</p>
              <AudioPlayer audioUrl={studio.audioUrl} durationSeconds={studio.durationSeconds} title={studio.title} />
            </div>
          )}
        </div>

        {latestAudio && studio.mode !== "audio" && (
          <div>
            <p className="mb-2 text-xs text-muted-foreground">Previous Audio</p>
            <AudioPlayer audioUrl={latestAudio.audio_url} durationSeconds={latestAudio.duration_seconds} title={latestAudio.title} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-component: KnowledgeTreeView ────────────────────────────────────────

let _ktNextId = 0;

function KnowledgeTreeView({
  cookieId,
  onAddAsSource,
}: {
  cookieId: string;
  onAddAsSource: (topic: string, summary: string) => void;
}) {
  const nodesRef = useRef<KTNode[]>([]);
  const linksRef = useRef<KTLink[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const simRef = useRef<any>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [tick, setTick] = useState(0);
  const [topoVersion, setTopoVersion] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [rootId, setRootId] = useState<number | null>(null);
  const [seed, setSeed] = useState("");
  const [status, setStatus] = useState("Idle");
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const panRef = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const expandMutation = trpc.research.expandKnowledgeTopic.useMutation();

  // ── D3 simulation restart whenever topology changes ──────────────────────
  useEffect(() => {
    if (!nodesRef.current.length) return;
    if (simRef.current) simRef.current.stop();

    const nodes = nodesRef.current;
    const rId = rootId;
    nodes.forEach((n) => {
      if (n.id === rId) { n.fx = 0; n.fy = 0; }
      else { n.fx = undefined; n.fy = undefined; }
    });

    const simLinks = linksRef.current.map((l) => ({
      source: l.sourceId as unknown as KTNode,
      target: l.targetId as unknown as KTNode,
      ...l,
    }));

    const sim = forceSimulation<KTNode>(nodes)
      .force(
        "link",
        forceLink<KTNode, KTLink & { source: KTNode; target: KTNode }>(simLinks as any)
          .id((d: KTNode) => d.id)
          .distance((l: any) => l.type === "seed" ? 150 : 120)
          .strength(0.18),
      )
      .force("charge", forceManyBody<KTNode>().strength((d: KTNode | null) => d?.id === rId ? -520 : -240))
      .force("collide", forceCollide<KTNode>().radius((d: KTNode) => nodeRadius(d) + 6).iterations(2))
      .alphaDecay(0.07)
      .velocityDecay(0.35)
      .on("tick", () => setTick((t) => t + 1));

    simRef.current = sim;
    return () => { sim.stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topoVersion]);

  // ── SVG pan/zoom ──────────────────────────────────────────────────────────
  function handleSvgMouseDown(e: React.MouseEvent) {
    if ((e.target as SVGElement).closest("[data-node]")) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
  }
  function handleWindowMouseMove(e: MouseEvent) {
    if (!isDragging.current) return;
    panRef.current = { x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y };
    setPan({ ...panRef.current });
  }
  function handleWindowMouseUp() { isDragging.current = false; }
  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    scaleRef.current = Math.max(0.3, Math.min(3, scaleRef.current * factor));
    setScale(scaleRef.current);
  }

  useEffect(() => {
    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, []);

  // ── Node sizing: root > explored (weighted by importance) > frontier ──────
  function nodeRadius(n: KTNode): number {
    if (n.id === rootId) return 24;
    const base = n.state === "explored" ? 12 : 8;
    // Importance: neighbor connections + how many times discovered
    const importance = Math.min(n.neighbors.size * 1.4 + n.seenCount * 1.0, 18);
    return base + importance;
  }

  // ── Node operations ───────────────────────────────────────────────────────
  function createNode(topic: string, opts: { depth?: number; parentX?: number; parentY?: number; idx?: number; total?: number } = {}): KTNode {
    const angle = opts.total && opts.total > 1
      ? (-Math.PI / 2) + ((opts.idx ?? 0) / opts.total) * Math.PI * 2
      : Math.random() * Math.PI * 2;
    const dist = 140 + Math.random() * 40;
    return {
      id: _ktNextId++,
      topic,
      canonicalKey: normTopic(topic),
      state: "unexplored",
      collapsed: false,
      summary: "",
      subtopics: [],
      depth: opts.depth ?? 0,
      seenCount: 1,
      discoveredFrom: new Set(),
      neighbors: new Set(),
      x: (opts.parentX ?? 0) + Math.cos(angle) * dist,
      y: (opts.parentY ?? 0) + Math.sin(angle) * dist,
      vx: 0, vy: 0,
    };
  }

  function findNode(topic: string) {
    const key = normTopic(topic);
    return nodesRef.current.find((n) => n.canonicalKey === key) ?? null;
  }

  function upsertLink(sourceId: number, targetId: number, type: KTLink["type"]) {
    if (sourceId === targetId) return;
    const existing = linksRef.current.find((l) => l.sourceId === sourceId && l.targetId === targetId);
    if (existing) { existing.count += 1; return; }
    linksRef.current.push({ id: `${sourceId}:${targetId}`, sourceId, targetId, type, count: 1 });
    const src = nodesRef.current.find((n) => n.id === sourceId);
    const tgt = nodesRef.current.find((n) => n.id === targetId);
    if (src) src.neighbors.add(targetId);
    if (tgt) tgt.neighbors.add(sourceId);
  }

  async function expandNode(nodeId: number) {
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (!node || node.state === "loading") return;

    // Toggle collapse on an already-explored selected node
    if (node.state === "explored" && node.id === selectedId) {
      node.collapsed = !node.collapsed;
      setTick((t) => t + 1);
      return;
    }

    if (node.state === "explored") { setSelectedId(nodeId); return; }

    node.state = "loading";
    setStatus(`Exploring ${node.topic}…`);
    setTick((t) => t + 1);

    try {
      const data = await expandMutation.mutateAsync({
        cookieId,
        topic: node.topic,
        exclusions: nodesRef.current.map((n) => n.topic),
      });
      node.summary = data.summary ?? "";
      node.subtopics = (data.subtopics ?? []).slice(0, 7);
      node.state = "explored";

      node.subtopics.forEach((topic, idx) => {
        let child = findNode(topic);
        const existed = !!child;
        if (!child) {
          child = createNode(topic, { depth: node.depth + 1, parentX: node.x, parentY: node.y, idx, total: node.subtopics.length });
          nodesRef.current.push(child);
        } else {
          child.seenCount += 1;
          child.discoveredFrom.add(node.id);
        }
        upsertLink(node.id, child.id, existed ? "convergent" : node.id === rootId ? "seed" : "related");
      });

      setTopoVersion((v) => v + 1);
      setStatus("Ready");
    } catch {
      node.state = "unexplored";
      setStatus("Error — try again");
    }
    setSelectedId(nodeId);
    setTick((t) => t + 1);
  }

  async function startExplore() {
    const s = seed.trim();
    if (!s) return;
    if (simRef.current) simRef.current.stop();
    nodesRef.current = [];
    linksRef.current = [];
    _ktNextId = 0;
    setSelectedId(null);
    setRootId(null);
    panRef.current = { x: 0, y: 0 };
    scaleRef.current = 1;
    setPan({ x: 0, y: 0 });
    setScale(1);

    const root = createNode(s, { depth: 0 });
    root.x = 0; root.y = 0;
    nodesRef.current.push(root);
    setRootId(root.id);
    setTopoVersion((v) => v + 1);
    await expandNode(root.id);
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      panRef.current = { x: rect.width / 2, y: rect.height / 2 };
      setPan({ ...panRef.current });
    }
  }

  // ── Compute visible nodes (respects collapse) ─────────────────────────────
  const nodes = nodesRef.current;
  const links = linksRef.current;

  const hidden = new Set<number>();
  for (const n of nodes) {
    if (!n.collapsed) continue;
    const queue = [n.id];
    const visited = new Set<number>();
    while (queue.length) {
      const pid = queue.shift()!;
      for (const l of links) {
        if (l.sourceId === pid && !visited.has(l.targetId)) {
          visited.add(l.targetId);
          hidden.add(l.targetId);
          queue.push(l.targetId);
        }
      }
    }
  }
  const visibleNodes = nodes.filter((n) => !hidden.has(n.id));
  const visibleLinks = links.filter((l) => !hidden.has(l.sourceId) && !hidden.has(l.targetId));

  // ── Render helpers ────────────────────────────────────────────────────────
  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;

  function nodeColor(n: KTNode) {
    if (n.id === rootId) return "url(#ktSeed)";
    if (n.state === "loading") return "url(#ktLoading)";
    if (n.state === "explored") return n.collapsed ? "url(#ktCollapsed)" : "url(#ktExplored)";
    return "url(#ktFrontier)";
  }
  function wrapLabel(topic: string): string[] {
    const words = topic.split(" ");
    const lines: string[] = [];
    let cur = "";
    words.forEach((w) => {
      const next = cur ? `${cur} ${w}` : w;
      if (next.length <= 16 || !cur) cur = next;
      else { lines.push(cur); cur = w; }
    });
    if (cur) lines.push(cur);
    return lines.slice(0, 2);
  }

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* ── Graph panel ───────────────────────────────────────────────────── */}
      <div className="flex flex-col border-r border-white/10" style={{ flex: "1.4", minWidth: 0 }}>
        {/* Controls */}
        <div className="border-b border-white/10 p-4 space-y-3 bg-[rgba(9,11,20,0.95)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-foreground">Knowledge Graph</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Click nodes to expand. Click an explored node twice to collapse its branch.</p>
            </div>
            <span className="rounded-full border border-[oklch(0.72_0.18_200_/_0.3)] bg-[oklch(0.72_0.18_200_/_0.1)] px-3 py-1 text-xs font-bold text-[oklch(0.83_0.15_200)]">
              {status}
            </span>
          </div>
          <div className="flex gap-2">
            <input
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startExplore()}
              placeholder="Seed topic…"
              className="flex-1 rounded-xl border border-white/10 bg-[rgba(6,8,18,0.7)] px-3 py-2 text-sm text-foreground outline-none transition focus:border-[oklch(0.72_0.18_200_/_0.45)]"
            />
            <button onClick={startExplore} disabled={!seed.trim() || expandMutation.isPending}
              className="rounded-xl bg-[oklch(0.72_0.18_200_/_0.2)] px-4 py-2 text-sm font-semibold text-[oklch(0.83_0.15_200)] transition hover:bg-[oklch(0.72_0.18_200_/_0.3)] disabled:opacity-40">
              Explore
            </button>
          </div>
          <div className="flex gap-3">
            {[
              { label: "Topics", value: visibleNodes.length },
              { label: "Links", value: visibleLinks.length },
              { label: "Frontier", value: visibleNodes.filter((n) => n.state === "unexplored").length },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
                <p className="text-lg font-bold text-foreground">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* SVG */}
        <div className="relative flex-1 overflow-hidden bg-[radial-gradient(circle_at_center,oklch(0.18_0.04_220_/_0.4),transparent_60%),rgba(5,7,16,0.97)]">
          <svg
            ref={svgRef}
            className="h-full w-full"
            style={{ cursor: isDragging.current ? "grabbing" : "grab" }}
            onMouseDown={handleSvgMouseDown}
            onWheel={handleWheel}
            onClick={(e) => {
              if ((e.target as SVGElement).closest("[data-node]")) return;
              setSelectedId(null);
            }}
          >
            <defs>
              <radialGradient id="ktSeed" cx="35%" cy="35%">
                <stop offset="0%" stopColor="#93c5fd" />
                <stop offset="100%" stopColor="#2563eb" />
              </radialGradient>
              <radialGradient id="ktExplored" cx="35%" cy="35%">
                <stop offset="0%" stopColor="#6ee7b7" />
                <stop offset="100%" stopColor="#10b981" />
              </radialGradient>
              <radialGradient id="ktCollapsed" cx="35%" cy="35%">
                <stop offset="0%" stopColor="#a7f3d0" />
                <stop offset="100%" stopColor="#065f46" />
              </radialGradient>
              <radialGradient id="ktFrontier" cx="35%" cy="35%">
                <stop offset="0%" stopColor="#94a3b8" />
                <stop offset="100%" stopColor="#475569" />
              </radialGradient>
              <radialGradient id="ktLoading" cx="35%" cy="35%">
                <stop offset="0%" stopColor="#fcd34d" />
                <stop offset="100%" stopColor="#f59e0b" />
              </radialGradient>
            </defs>
            <g transform={`translate(${pan.x},${pan.y}) scale(${scale})`}>
              {/* Edges */}
              {visibleLinks.map((link) => {
                const src = visibleNodes.find((n) => n.id === link.sourceId);
                const tgt = visibleNodes.find((n) => n.id === link.targetId);
                if (!src || !tgt) return null;
                const stroke =
                  link.type === "convergent" ? "rgba(139,92,246,0.6)" :
                  link.type === "seed" ? "rgba(37,99,235,0.5)" : "rgba(148,163,184,0.3)";
                return (
                  <line key={link.id} x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                    stroke={stroke} strokeWidth={link.type === "convergent" ? 2 : 1.2} />
                );
              })}
              {/* Nodes */}
              {visibleNodes.map((node) => {
                const r = nodeRadius(node);
                const isSelected = node.id === selectedId;
                const labelLines = wrapLabel(node.topic);
                return (
                  <g key={node.id} data-node="1" style={{ cursor: "pointer" }}
                    onClick={(e) => { e.stopPropagation(); expandNode(node.id); }}>
                    {isSelected && (
                      <circle cx={node.x} cy={node.y} r={r + 12} fill="none"
                        stroke="rgba(245,158,11,0.8)" strokeWidth={2} strokeDasharray="2 4" />
                    )}
                    <circle cx={node.x} cy={node.y} r={r + 5} fill="rgba(15,23,42,0.15)" />
                    <circle cx={node.x} cy={node.y} r={r} fill={nodeColor(node)}
                      stroke="rgba(255,255,255,0.15)" strokeWidth={1.4} />
                    {/* Collapse indicator */}
                    {node.collapsed && (
                      <text x={node.x} y={node.y + 4} textAnchor="middle" fill="rgba(255,255,255,0.9)"
                        fontSize={r * 0.65} fontWeight={700} pointerEvents="none">+</text>
                    )}
                    {node.state === "loading" && (
                      <circle cx={node.x} cy={node.y} r={r + 8} fill="none" stroke="rgba(251,191,36,0.7)" strokeWidth={1.5}>
                        <animate attributeName="r" from={r + 5} to={r + 16} dur="1.2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" from="0.7" to="0" dur="1.2s" repeatCount="indefinite" />
                      </circle>
                    )}
                    {!node.collapsed && labelLines.map((line, li) => (
                      <text key={li} x={node.x} y={node.y + r + 14 + li * 12}
                        textAnchor="middle" fill="rgba(226,232,240,0.85)"
                        fontSize={isSelected ? 11 : 10} fontFamily="system-ui, sans-serif"
                        fontWeight={isSelected ? 700 : 600}
                        stroke="rgba(15,23,42,0.7)" strokeWidth={3} paintOrder="stroke" pointerEvents="none">
                        {line}
                      </text>
                    ))}
                    {node.collapsed && (
                      <text x={node.x} y={node.y + r + 14}
                        textAnchor="middle" fill="rgba(167,243,208,0.9)"
                        fontSize={10} fontFamily="system-ui, sans-serif" fontWeight={700}
                        stroke="rgba(15,23,42,0.7)" strokeWidth={3} paintOrder="stroke" pointerEvents="none">
                        {labelLines[0]}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Legend */}
          <div className="absolute bottom-3 left-3 flex gap-3 rounded-xl border border-white/10 bg-[rgba(9,11,20,0.75)] px-3 py-2 backdrop-blur text-xs text-muted-foreground">
            {[
              { color: "#2563eb", label: "Seed" },
              { color: "#10b981", label: "Explored" },
              { color: "#065f46", label: "Collapsed" },
              { color: "#475569", label: "Frontier" },
              { color: "#f59e0b", label: "Loading" },
            ].map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full flex-none" style={{ background: color }} />
                {label}
              </span>
            ))}
          </div>
          <div className="absolute bottom-3 right-3 rounded-xl border border-white/10 bg-[rgba(9,11,20,0.75)] px-3 py-2 backdrop-blur text-xs text-muted-foreground">
            Node size = topic importance · Scroll to zoom · Click explored = re-expand or collapse
          </div>
        </div>
      </div>

      {/* ── Wiki panel ────────────────────────────────────────────────────── */}
      <div className="flex flex-col overflow-hidden bg-[rgba(9,11,20,0.92)]" style={{ width: 360, flexShrink: 0 }}>
        {selectedNode ? (
          <>
            <div className="border-b border-white/10 p-5 bg-[rgba(9,11,20,0.95)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-foreground leading-tight">{selectedNode.topic}</h2>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">Depth {selectedNode.depth}</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">{selectedNode.neighbors.size} connections</span>
                    {selectedNode.seenCount > 1 && (
                      <span className="rounded-full border border-[oklch(0.7_0.18_280_/_0.4)] bg-[oklch(0.7_0.18_280_/_0.1)] px-2 py-0.5 text-[oklch(0.82_0.14_280)]">
                        ×{selectedNode.seenCount} paths
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {selectedNode.summary && (
                    <button onClick={() => onAddAsSource(selectedNode.topic, selectedNode.summary)}
                      className="flex-none rounded-xl bg-[oklch(0.72_0.18_140_/_0.18)] px-3 py-2 text-xs font-semibold text-[oklch(0.84_0.14_140)] transition hover:bg-[oklch(0.72_0.18_140_/_0.26)]">
                      + Add as Source
                    </button>
                  )}
                  {selectedNode.state === "explored" && (
                    <button onClick={() => { selectedNode.collapsed = !selectedNode.collapsed; setTick(t => t + 1); }}
                      className="flex-none flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-muted-foreground transition hover:text-foreground">
                      {selectedNode.collapsed ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
                      {selectedNode.collapsed ? "Expand" : "Collapse"}
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {selectedNode.state === "loading" ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Generating wiki page…</span>
                </div>
              ) : selectedNode.state === "unexplored" ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">Click this node in the graph to explore it.</p>
                </div>
              ) : (
                <>
                  <div className="prose prose-invert prose-sm max-w-none">
                    <Streamdown>{selectedNode.summary}</Streamdown>
                  </div>
                  {selectedNode.subtopics.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Subtopics</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedNode.subtopics.map((t) => (
                          <button key={t} onClick={() => { const n = findNode(t); if (n) expandNode(n.id); }}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground transition hover:border-[oklch(0.72_0.18_200_/_0.3)] hover:text-foreground">
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <button onClick={() => expandNode(selectedNode.id)}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-muted-foreground transition hover:text-foreground">
                    ↻ Grow neighborhood
                  </button>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
            <Network size={40} className="opacity-20" />
            <h3 className="text-base font-semibold text-foreground">Build a living knowledge map</h3>
            <p className="text-sm">Enter a seed topic and click Explore. Node size reflects importance — larger nodes have more connections.</p>
            <p className="text-xs opacity-50 mt-1">Click an explored node to see its wiki. Click it again to collapse its branch.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-component: ChartsView ────────────────────────────────────────────────

type ChartViewType = "heat" | "bars" | "bubbles";

function ChartsView({ cookieId }: { cookieId: string }) {
  const [topic, setTopic] = useState("");
  const [items, setItems] = useState<Array<{ label: string; value: number; category: string }>>([]);
  const [view, setView] = useState<ChartViewType>("heat");
  const [loading, setLoading] = useState(false);
  const expandMutation = trpc.research.expandKnowledgeTopic.useMutation();

  async function analyze() {
    const t = topic.trim();
    if (!t || loading) return;
    setLoading(true);
    setItems([]);
    try {
      const root = await expandMutation.mutateAsync({ cookieId, topic: t, exclusions: [] });
      const subs = (root.subtopics ?? []).slice(0, 10);
      const base = subs.map((label, i) => ({
        label,
        value: Math.round(95 - i * 6),
        category: "primary",
      }));
      setItems(base);
      // Expand top 4 subtopics for a second ring of data
      for (let i = 0; i < Math.min(4, subs.length); i++) {
        try {
          const sub = await expandMutation.mutateAsync({ cookieId, topic: subs[i], exclusions: [t, ...subs] });
          const secondary = (sub.subtopics ?? []).slice(0, 3).map((label, j) => ({
            label,
            value: Math.round(48 - j * 4),
            category: subs[i],
          }));
          setItems((prev) => [...prev, ...secondary]);
        } catch { /* non-fatal */ }
      }
    } finally {
      setLoading(false);
    }
  }

  const maxValue = Math.max(...items.map((i) => i.value), 1);
  const primaryItems = items.filter((i) => i.category === "primary");
  const secondaryItems = items.filter((i) => i.category !== "primary");

  const VIEW_TABS: [ChartViewType, string][] = [
    ["heat", "🔥 Heat Map"],
    ["bars", "📊 Bar Chart"],
    ["bubbles", "🫧 Bubbles"],
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto p-6 gap-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">Topic Analysis</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Visualize how a topic branches into subtopics. Node size and color reflect relative importance.
        </p>
        <div className="flex gap-2">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && analyze()}
            placeholder="Enter a topic to analyze…"
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-foreground outline-none focus:border-[oklch(0.72_0.18_200_/_0.45)] placeholder:text-muted-foreground"
          />
          <button onClick={analyze} disabled={loading || !topic.trim()}
            className="rounded-xl bg-[oklch(0.72_0.18_200_/_0.2)] px-5 py-2.5 text-sm font-semibold text-[oklch(0.83_0.15_200)] transition hover:bg-[oklch(0.72_0.18_200_/_0.3)] disabled:opacity-40">
            {loading ? <Loader2 size={14} className="animate-spin" /> : "Analyze"}
          </button>
        </div>
      </div>

      {loading && items.length === 0 && (
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Mapping topic space…</span>
        </div>
      )}

      {items.length > 0 && (
        <>
          {/* View switcher */}
          <div className="flex gap-2">
            {VIEW_TABS.map(([v, label]) => (
              <button key={v} onClick={() => setView(v)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  view === v
                    ? "bg-[oklch(0.72_0.18_200_/_0.18)] text-[oklch(0.83_0.15_200)]"
                    : "bg-white/5 text-muted-foreground hover:text-foreground"
                }`}>
                {label}
              </button>
            ))}
            {loading && <Loader2 size={14} className="ml-2 self-center animate-spin text-muted-foreground" />}
          </div>

          {/* ── Heat Map ────────────────────────────────────────────── */}
          {view === "heat" && (
            <div className="space-y-4">
              {primaryItems.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                    Primary Topics — <span className="normal-case font-normal">{topic}</span>
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                    {primaryItems.map((item, i) => (
                      <div key={i} className="rounded-2xl p-3 text-center transition hover:scale-105 cursor-default"
                        style={{ background: importanceColor(item.value) }}>
                        <p className="text-xs font-bold text-white/90 leading-tight">{item.label}</p>
                        <p className="mt-1 text-xs text-white/55">{item.value}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {secondaryItems.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Secondary Topics</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
                    {secondaryItems.map((item, i) => (
                      <div key={i} className="rounded-xl p-2 text-center transition hover:scale-105 cursor-default"
                        style={{ background: importanceColor(item.value) }}>
                        <p className="text-xs font-semibold text-white/80 leading-tight line-clamp-2">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Bar Chart ───────────────────────────────────────────── */}
          {view === "bars" && (
            <div className="space-y-1.5 max-w-2xl">
              {[...items].sort((a, b) => b.value - a.value).map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-36 truncate flex-none text-right leading-none">{item.label}</span>
                  <div className="flex-1 h-6 bg-white/5 rounded-lg overflow-hidden">
                    <div className="h-full rounded-lg flex items-center transition-all duration-700"
                      style={{ width: `${(item.value / maxValue) * 100}%`, background: importanceColor(item.value) }}>
                      <span className="text-xs text-white/75 font-semibold pl-2 whitespace-nowrap">{item.value}%</span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground w-14 flex-none capitalize">{item.category === "primary" ? "core" : item.category}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Bubble Chart ─────────────────────────────────────────── */}
          {view === "bubbles" && (
            <div className="flex flex-wrap gap-3 items-end justify-center py-6 min-h-[300px]">
              {[...items].sort((a, b) => b.value - a.value).map((item, i) => {
                const size = 38 + (item.value / maxValue) * 110;
                const fontSize = Math.max(8, size / 9);
                return (
                  <div key={i} title={item.label}
                    className="flex items-center justify-center rounded-full transition hover:scale-110 cursor-default flex-none"
                    style={{ width: size, height: size, background: importanceColor(item.value) }}>
                    <span className="text-white/90 font-semibold text-center px-1 leading-tight overflow-hidden"
                      style={{ fontSize, maxWidth: size - 8 }}>
                      {item.label.split(" ").slice(0, size > 80 ? 4 : 2).join(" ")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {!loading && items.length === 0 && (
        <div className="flex flex-col items-center justify-center flex-1 text-center text-muted-foreground gap-3 min-h-[300px]">
          <BarChart2 size={48} className="opacity-20" />
          <h3 className="text-base font-semibold text-foreground">Visualize any topic</h3>
          <p className="text-sm max-w-sm">
            Enter a topic above to generate heat maps, bar charts, and bubble diagrams showing how it branches into subtopics and related concepts.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Sub-component: RabbitHolesView ──────────────────────────────────────────

interface HoleContent {
  topic: string;
  summary: string;
  subtopics: string[];
}

function RabbitHolesView({ cookieId }: { cookieId: string }) {
  const [activeId, setActiveId] = useState<RabbitHoleId | null>(null);
  const [contentStack, setContentStack] = useState<HoleContent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const expandMutation = trpc.research.expandKnowledgeTopic.useMutation();

  const activeHole = RABBIT_HOLES.find((h) => h.id === activeId);
  const domains = ["all", ...Array.from(new Set(RABBIT_HOLES.map((h) => h.domain)))];
  const filtered = filter === "all" ? RABBIT_HOLES : RABBIT_HOLES.filter((h) => h.domain === filter);

  async function enterHole(id: RabbitHoleId) {
    const hole = RABBIT_HOLES.find((h) => h.id === id);
    if (!hole) return;
    setActiveId(id);
    setContentStack([]);
    setIsLoading(true);
    try {
      const data = await expandMutation.mutateAsync({ cookieId, topic: hole.title, exclusions: [] });
      setContentStack([{ topic: hole.title, summary: data.summary ?? "", subtopics: data.subtopics ?? [] }]);
    } finally {
      setIsLoading(false);
    }
  }

  async function goDeeper(subtopic: string) {
    if (!activeHole) return;
    setIsLoading(true);
    try {
      const exclusions = contentStack.map((c) => c.topic);
      const data = await expandMutation.mutateAsync({ cookieId, topic: subtopic, exclusions });
      setContentStack((prev) => [...prev, { topic: subtopic, summary: data.summary ?? "", subtopics: data.subtopics ?? [] }]);
    } finally {
      setIsLoading(false);
    }
  }

  function goBack() {
    if (contentStack.length > 1) {
      setContentStack((prev) => prev.slice(0, -1));
    } else {
      setActiveId(null);
      setContentStack([]);
    }
  }

  const currentContent = contentStack[contentStack.length - 1] ?? null;
  const depth = contentStack.length - 1;

  // ── Detail view ───────────────────────────────────────────────────────────
  if (activeHole) {
    return (
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Header */}
        <div className="border-b border-white/10 bg-[rgba(9,11,20,0.95)] px-6 py-4 flex-none">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={goBack}
              className="text-xs text-muted-foreground hover:text-foreground transition flex items-center gap-1">
              ← {contentStack.length > 1 ? "Back" : "All Rabbit Holes"}
            </button>
            {contentStack.length > 1 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {contentStack.map((c, i) => (
                  <span key={i} className="flex items-center gap-1">
                    {i > 0 && <span>›</span>}
                    <button onClick={() => setContentStack((prev) => prev.slice(0, i + 1))}
                      className={`hover:text-foreground transition ${i === contentStack.length - 1 ? "text-foreground font-semibold" : ""}`}>
                      {c.topic.split(" ").slice(0, 3).join(" ")}
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-start gap-4">
            <span className="text-4xl flex-none">{activeHole.emoji}</span>
            <div className="min-w-0">
              <h2 className="text-2xl font-bold text-foreground">
                {depth === 0 ? activeHole.title : currentContent?.topic ?? activeHole.title}
              </h2>
              {depth === 0 && (
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{activeHole.hook}</p>
              )}
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-0.5 text-xs text-muted-foreground capitalize">
                  {activeHole.domain}
                </span>
                {depth > 0 && (
                  <span className="rounded-full border border-[oklch(0.72_0.18_200_/_0.3)] bg-[oklch(0.72_0.18_200_/_0.1)] px-3 py-0.5 text-xs text-[oklch(0.83_0.15_200)]">
                    Depth {depth}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Going deeper…</span>
              </div>
            )}

            {currentContent && !isLoading && (
              <>
                <div className="prose prose-invert prose-sm max-w-none">
                  <Streamdown>{currentContent.summary}</Streamdown>
                </div>

                {currentContent.subtopics.length > 0 && (
                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Follow the Thread</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {currentContent.subtopics.slice(0, 6).map((subtopic, i) => (
                        <button key={i} onClick={() => goDeeper(subtopic)}
                          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-[oklch(0.72_0.18_200_/_0.35)] hover:bg-[oklch(0.72_0.18_200_/_0.08)] group">
                          <span className="block text-sm font-semibold text-foreground group-hover:text-[oklch(0.83_0.15_200)] transition mb-0.5">
                            {subtopic}
                          </span>
                          <span className="text-xs text-muted-foreground">Click to go deeper →</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button onClick={() => contentStack[0] && goDeeper(currentContent.subtopics[0] ?? activeHole.title)}
                  disabled={isLoading || currentContent.subtopics.length === 0}
                  className="flex items-center gap-2 rounded-2xl border border-[oklch(0.72_0.18_200_/_0.3)] bg-[oklch(0.72_0.18_200_/_0.08)] px-6 py-3 text-sm font-semibold text-[oklch(0.83_0.15_200)] transition hover:bg-[oklch(0.72_0.18_200_/_0.16)] disabled:opacity-40">
                  <Zap size={14} />
                  Go Even Deeper{depth > 0 ? ` (Level ${depth + 1})` : ""}
                </button>
              </>
            )}
          </div>

          {/* Sidebar: other holes */}
          <div className="w-72 flex-none border-l border-white/10 bg-[rgba(9,11,20,0.92)] overflow-y-auto p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Other Rabbit Holes</p>
            {RABBIT_HOLES.filter((h) => h.id !== activeId).map((h) => (
              <button key={h.id} onClick={() => enterHole(h.id)}
                className="flex w-full items-start gap-2 rounded-xl p-3 text-left transition hover:bg-white/5 group">
                <span className="text-xl flex-none">{h.emoji}</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground group-hover:text-[oklch(0.83_0.15_200)] transition truncate">{h.title}</p>
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">{h.domain}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Grid view ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto p-6 gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">🐇 Rabbit Holes</h2>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Twelve curated deep-dives into the most fascinating corners of human knowledge. Choose a hole and go as deep as you dare — each level reveals more, powered by AI exploration.
        </p>
      </div>

      {/* Domain filter */}
      <div className="flex gap-2 flex-wrap">
        {domains.map((d) => (
          <button key={d} onClick={() => setFilter(d)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition capitalize ${
              filter === d
                ? "bg-[oklch(0.72_0.18_200_/_0.2)] text-[oklch(0.83_0.15_200)]"
                : "border border-white/10 text-muted-foreground hover:text-foreground"
            }`}>
            {d}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((hole) => (
          <button key={hole.id} onClick={() => enterHole(hole.id)}
            className="glass rounded-2xl p-5 border border-white/10 text-left transition hover:border-[oklch(0.72_0.18_200_/_0.3)] hover:bg-[oklch(0.72_0.18_200_/_0.05)] group">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-3xl flex-none">{hole.emoji}</span>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-foreground group-hover:text-[oklch(0.83_0.15_200)] transition leading-snug">
                  {hole.title}
                </h3>
                <span className="text-xs text-muted-foreground capitalize">{hole.domain}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 mb-3">{hole.teaser}</p>
            <div className="flex items-center gap-1 text-xs text-[oklch(0.83_0.15_200)] opacity-0 group-hover:opacity-100 transition">
              <Zap size={11} /> Enter rabbit hole →
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Sub-component: DiscoverModal ─────────────────────────────────────────────

function DiscoverModal({
  onClose,
  onImport,
  cookieId,
}: {
  onClose: () => void;
  onImport: (topic: string, urls: string[]) => void;
  cookieId: string;
}) {
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(10);
  const [results, setResults] = useState<Array<{ title: string; url: string; description: string }>>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);

  const discoverMutation = trpc.research.discover.useMutation({
    onSuccess: (data) => {
      setResults((data.sources ?? []) as Array<{ title: string; url: string; description: string }>);
      setSelected(new Set((data.sources ?? []).map((s: any) => s.url)));
    },
    onError: (err) => toast.error(err.message),
    onSettled: () => setIsSearching(false),
  });

  function search() {
    if (!topic.trim()) return;
    setIsSearching(true);
    setResults([]);
    discoverMutation.mutate({ cookieId, topic: topic.trim(), maxResults: count });
  }

  function toggleAll() {
    if (selected.size === results.length) setSelected(new Set());
    else setSelected(new Set(results.map((r) => r.url)));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-2xl flex-col rounded-3xl border border-white/10 bg-[rgba(9,11,20,0.97)] shadow-2xl" style={{ maxHeight: "85vh" }}>
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Search size={16} /> Discover Sources
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:text-foreground transition">
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-white/10 p-4 space-y-3">
          <input value={topic} onChange={(e) => setTopic(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="What do you want to research?"
            className="w-full rounded-xl border border-white/10 bg-[rgba(6,8,18,0.7)] px-4 py-3 text-sm text-foreground outline-none transition focus:border-[oklch(0.72_0.18_200_/_0.45)]"
          />
          <div className="flex gap-3">
            <select value={count} onChange={(e) => setCount(Number(e.target.value))}
              className="flex-1 rounded-xl border border-white/10 bg-[rgba(6,8,18,0.7)] px-3 py-2 text-sm text-foreground outline-none">
              {[5, 10, 15, 20, 25].map((n) => (
                <option key={n} value={n}>{n} sources</option>
              ))}
            </select>
            <button onClick={search} disabled={isSearching || !topic.trim()}
              className="rounded-xl bg-[oklch(0.72_0.18_200_/_0.2)] px-6 py-2 text-sm font-semibold text-[oklch(0.83_0.15_200)] transition hover:bg-[oklch(0.72_0.18_200_/_0.3)] disabled:opacity-40">
              {isSearching ? <Loader2 size={14} className="animate-spin" /> : "Search"}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isSearching && (
            <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Searching for sources…</span>
            </div>
          )}
          {!isSearching && results.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">Results will appear here after searching.</div>
          )}
          {results.map((r, i) => (
            <label key={i} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${selected.has(r.url) ? "border-[oklch(0.72_0.18_200_/_0.4)] bg-[oklch(0.72_0.18_200_/_0.08)]" : "border-white/10 hover:border-white/20"}`}>
              <input type="checkbox" checked={selected.has(r.url)}
                onChange={() => setSelected((prev) => {
                  const next = new Set(prev);
                  if (next.has(r.url)) next.delete(r.url); else next.add(r.url);
                  return next;
                })}
                className="mt-0.5 flex-none"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">{r.title}</p>
                <p className="mt-0.5 truncate text-xs text-[oklch(0.72_0.18_200_/_0.8)]">{r.url}</p>
                {r.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{r.description}</p>}
              </div>
            </label>
          ))}
        </div>

        {results.length > 0 && (
          <div className="flex items-center justify-between border-t border-white/10 px-6 py-4">
            <button onClick={toggleAll} className="text-xs text-muted-foreground hover:text-foreground transition">
              {selected.size === results.length ? "Deselect All" : "Select All"}
            </button>
            <div className="flex gap-3">
              <button onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-muted-foreground transition hover:text-foreground">
                Cancel
              </button>
              <button onClick={() => { onImport(topic.trim(), Array.from(selected)); onClose(); }}
                disabled={selected.size === 0}
                className="rounded-xl bg-[oklch(0.72_0.18_140_/_0.2)] px-5 py-2 text-sm font-semibold text-[oklch(0.84_0.14_140)] transition hover:bg-[oklch(0.72_0.18_140_/_0.3)] disabled:opacity-40">
                Create Notebook ({selected.size})
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ResearchWorkbench() {
  const { cookieId, addXP } = usePersonalization();

  const [activeTab, setActiveTab] = useState<ResearchTab>("notebook");
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [activeSourceId, setActiveSourceId] = useState<number | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([]);
  const [showDiscover, setShowDiscover] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [studio, setStudio] = useState<StudioState>({ mode: "idle" });

  const projectsQuery = trpc.research.listProjects.useQuery(
    { cookieId: cookieId ?? "" },
    { enabled: !!cookieId },
  );
  const workspaceQuery = trpc.research.getProjectWorkspace.useQuery(
    { cookieId: cookieId ?? "", projectId: activeProjectId ?? 0 },
    { enabled: !!cookieId && !!activeProjectId },
  );
  const audioQuery = trpc.research.listProjectAudioOverviews.useQuery(
    { cookieId: cookieId ?? "", projectId: activeProjectId ?? 0 },
    { enabled: !!cookieId && !!activeProjectId },
  );

  const ingestMutation = trpc.research.ingest.useMutation({
    onSuccess: async (data) => {
      await projectsQuery.refetch();
      setActiveProjectId(data.projectId);
      setShowDiscover(false);
      addXP(25);
      toast.success(`Notebook created with ${data.sourceCount} sources.`);
    },
    onError: (err) => toast.error(err.message),
  });

  const chatMutation = trpc.research.ragChat.useMutation({
    onSuccess: (data) => {
      setChatHistory((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: data.answer, citations: data.citations },
      ]);
      addXP(3);
    },
    onError: (err) => {
      setChatHistory((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: `Sorry, something went wrong: ${err.message}` },
      ]);
    },
  });

  const generateContentMutation = trpc.research.generateContent.useMutation({
    onSuccess: (data) => {
      const found = STUDIO_TILES.find((t) => t.type === data.type);
      setStudio({ mode: "text", type: data.type, label: found?.label ?? data.type, content: data.content });
    },
    onError: (err) => {
      setStudio({ mode: "idle" });
      toast.error(err.message);
    },
  });

  const audioMutation = trpc.research.generateProjectAudioOverview.useMutation({
    onSuccess: async (data) => {
      await audioQuery.refetch();
      setStudio({ mode: "audio", audioUrl: data.audio_url, title: data.title, durationSeconds: data.duration_seconds });
      addXP(20);
      toast.success("Audio overview generated.");
    },
    onError: (err) => {
      setStudio({ mode: "idle" });
      toast.error(err.message);
    },
  });

  useEffect(() => {
    if (!activeProjectId && projectsQuery.data?.projects?.length) {
      setActiveProjectId(projectsQuery.data.projects[0].id);
    }
  }, [activeProjectId, projectsQuery.data]);

  useEffect(() => {
    setChatHistory([]);
    setActiveSourceId(null);
    setStudio({ mode: "idle" });
  }, [activeProjectId]);

  const workspace = workspaceQuery.data;
  const sources = useMemo(
    () => (workspace?.sources ?? []) as Array<{ id: number; title: string; url: string; summary?: string | null }>,
    [workspace],
  );
  const latestAudio = audioQuery.data?.items?.[0] ?? null;
  const projects = projectsQuery.data?.projects ?? [];

  function handleSendChat(question: string) {
    if (!activeProjectId || !cookieId) return;
    setChatHistory((prev) => [
      ...prev,
      { role: "user", content: question },
      { role: "assistant", content: "…" },
    ]);
    chatMutation.mutate({ cookieId, projectId: activeProjectId, question });
  }

  function handleGenerate(type: string, label: string) {
    if (!activeProjectId || !cookieId) return;
    setStudio({ mode: "loading", label });
    generateContentMutation.mutate({ cookieId, projectId: activeProjectId, type: type as any });
  }

  function handleGenerateAudio() {
    if (!activeProjectId || !cookieId) return;
    setStudio({ mode: "loading", label: "Audio Overview" });
    audioMutation.mutate({ cookieId, projectId: activeProjectId });
  }

  function handleImport(topic: string, urls: string[]) {
    if (!cookieId) return;
    ingestMutation.mutate({ cookieId, projectName: topic, sources: urls.map((url) => ({ url, title: url, description: "" })) });
  }

  function handleAddKTAsSource(topic: string, summary: string) {
    toast.info(`"${topic}" noted — open a notebook to add it as a source.`);
  }

  const TABS: [ResearchTab, string][] = [
    ["notebook", "📚 Notebook"],
    ["kt", "🌱 Knowledge Tree"],
    ["charts", "📊 Charts"],
    ["rabbit-holes", "🐇 Rabbit Holes"],
  ];

  return (
    <PageWrapper pageName="research">
      <div className="flex flex-col" style={{ height: "calc(100vh - 4rem)", paddingTop: "4rem" }}>
        {/* ── Tab bar ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 border-b border-white/10 bg-[rgba(5,7,16,0.95)] px-4 py-2 flex-none overflow-x-auto">
          {TABS.map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`rounded-xl px-4 py-1.5 text-sm font-semibold transition whitespace-nowrap ${
                activeTab === tab
                  ? "bg-[oklch(0.72_0.18_200_/_0.18)] text-[oklch(0.83_0.15_200)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}>
              {label}
            </button>
          ))}

          {/* Project selector (notebook tab only) */}
          {activeTab === "notebook" && projects.length > 0 && (
            <div className="ml-4 relative">
              <button onClick={() => setShowProjects((v) => !v)}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-foreground transition hover:border-white/20">
                <BookOpen size={13} />
                <span className="max-w-[140px] truncate">{projects.find((p) => p.id === activeProjectId)?.name ?? "Select notebook"}</span>
                <ChevronDown size={12} className="text-muted-foreground" />
              </button>
              {showProjects && (
                <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-2xl border border-white/10 bg-[rgba(9,11,20,0.97)] p-2 shadow-2xl">
                  {projects.map((p) => (
                    <button key={p.id} onClick={() => { setActiveProjectId(p.id); setShowProjects(false); }}
                      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                        p.id === activeProjectId ? "bg-[oklch(0.72_0.18_200_/_0.16)] text-[oklch(0.83_0.15_200)]" : "text-foreground hover:bg-white/5"
                      }`}>
                      <BookOpen size={12} className="flex-none text-muted-foreground" />
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button onClick={() => setShowDiscover(true)}
            className="ml-auto flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground whitespace-nowrap">
            <Plus size={12} /> New Notebook
          </button>
        </div>

        {/* ── Tab content ──────────────────────────────────────────────────── */}
        {activeTab === "notebook" ? (
          activeProjectId && workspace ? (
            <div className="flex flex-1 min-h-0">
              <SourcesPanel sources={sources} activeSourceId={activeSourceId} onSelectSource={setActiveSourceId}
                onAddSources={() => setShowDiscover(true)} isLoading={workspaceQuery.isLoading} />
              <ChatPanel history={chatHistory} onSend={handleSendChat} isSending={chatMutation.isPending} />
              <StudioPanel studio={studio} hasProject={!!activeProjectId} onGenerate={handleGenerate}
                onGenerateAudio={handleGenerateAudio} latestAudio={latestAudio} isGeneratingAudio={audioMutation.isPending} />
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center text-muted-foreground">
              {projectsQuery.isLoading || ingestMutation.isPending ? (
                <>
                  <Loader2 size={32} className="animate-spin" />
                  <p className="text-sm">{ingestMutation.isPending ? "Creating notebook…" : "Loading…"}</p>
                </>
              ) : (
                <>
                  <BookOpen size={40} className="opacity-20" />
                  <h3 className="text-lg font-semibold text-foreground">No notebook open</h3>
                  <p className="max-w-sm text-sm">Discover sources around a topic to create your first notebook.</p>
                  <button onClick={() => setShowDiscover(true)}
                    className="mt-2 rounded-2xl bg-[oklch(0.72_0.18_200_/_0.18)] px-6 py-3 text-sm font-semibold text-[oklch(0.83_0.15_200)] transition hover:bg-[oklch(0.72_0.18_200_/_0.26)]">
                    <Plus size={14} className="mr-2 inline" /> Discover Sources
                  </button>
                </>
              )}
            </div>
          )
        ) : activeTab === "kt" ? (
          <KnowledgeTreeView cookieId={cookieId ?? ""} onAddAsSource={handleAddKTAsSource} />
        ) : activeTab === "charts" ? (
          <ChartsView cookieId={cookieId ?? ""} />
        ) : (
          <RabbitHolesView cookieId={cookieId ?? ""} />
        )}

        {showDiscover && (
          <DiscoverModal onClose={() => setShowDiscover(false)} onImport={handleImport} cookieId={cookieId ?? ""} />
        )}
      </div>
    </PageWrapper>
  );
}
