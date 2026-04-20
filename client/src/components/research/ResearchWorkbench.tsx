/**
 * ResearchWorkbench — NotebookLM-style research UI for the Nexus site.
 *
 * Layout:
 *   • "Notebook" tab  → 3-panel view (Sources | Chat | Studio/Create)
 *   • "Knowledge Tree" tab → D3 force-graph explorer + wiki pane
 *
 * Data:
 *   • Projects / sources / chat / audio  → tRPC (server-side, MySQL)
 *   • Knowledge-tree expansion           → tRPC.research.expandKnowledgeTopic
 *   • Studio content generation          → tRPC.research.generateContent
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
  BookOpen,
  Bot,
  ChevronDown,
  FileText,
  Globe,
  Loader2,
  Network,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
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
  // d3-force fills these:
  source?: KTNode | number;
  target?: KTNode | number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normTopic(t: string) {
  return t.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

const STUDIO_TILES = [
  { type: "study-guide", icon: "📚", label: "Study Guide" },
  { type: "briefing",    icon: "📋", label: "Briefing Doc" },
  { type: "mindmap",     icon: "🗺️", label: "Mind Map" },
  { type: "timeline",    icon: "📅", label: "Timeline" },
  { type: "faq",         icon: "❓", label: "FAQ" },
  { type: "summary",     icon: "📝", label: "Summary" },
] as const;

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
      {/* header */}
      <div className="border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Bot size={14} /> Ask your sources
        </div>
      </div>

      {/* messages */}
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
                      <a
                        key={c.url}
                        href={c.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate hover:text-[oklch(0.83_0.15_200)] transition"
                      >
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

      {/* input */}
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
          <button
            onClick={submit}
            disabled={isSending || !input.trim()}
            className="self-end rounded-xl bg-[oklch(0.72_0.18_200_/_0.18)] px-4 py-2 text-sm font-semibold text-[oklch(0.83_0.15_200)] transition hover:bg-[oklch(0.72_0.18_200_/_0.26)] disabled:opacity-40"
          >
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
        {/* Audio Overview */}
        <button
          onClick={onGenerateAudio}
          disabled={!hasProject || isGeneratingAudio}
          className="flex w-full items-center gap-4 rounded-2xl border border-[oklch(0.72_0.18_200_/_0.3)] bg-[oklch(0.72_0.18_200_/_0.08)] px-4 py-3 text-left transition hover:bg-[oklch(0.72_0.18_200_/_0.14)] disabled:opacity-40"
        >
          <span className="text-2xl">🎙</span>
          <div>
            <p className="text-sm font-semibold text-foreground">Audio Overview</p>
            <p className="text-xs text-muted-foreground">Two-host podcast · AI narration</p>
          </div>
          {isGeneratingAudio && <Loader2 size={14} className="ml-auto animate-spin text-muted-foreground" />}
        </button>

        {/* Content tiles grid */}
        <div className="grid grid-cols-2 gap-2">
          {STUDIO_TILES.map((tile) => (
            <button
              key={tile.type}
              onClick={() => onGenerate(tile.type, tile.label)}
              disabled={!hasProject || studio.mode === "loading"}
              className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/5 p-4 text-center transition hover:border-[oklch(0.72_0.18_200_/_0.3)] hover:bg-[oklch(0.72_0.18_200_/_0.08)] disabled:opacity-40"
            >
              <span className="text-2xl">{tile.icon}</span>
              <span className="mt-2 text-xs font-semibold text-foreground">{tile.label}</span>
            </button>
          ))}
        </div>

        {/* Generated output area */}
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

        {/* Latest audio if already generated */}
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
          .id((d) => d.id)
          .distance((l: any) => l.type === "seed" ? 140 : 110)
          .strength(0.18),
      )
      .force("charge", forceManyBody<KTNode>().strength((d) => d.id === rId ? -480 : -200))
      .force("collide", forceCollide<KTNode>().radius(30).iterations(2))
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

  // ── Node operations ───────────────────────────────────────────────────────
  function createNode(topic: string, opts: { depth?: number; parentX?: number; parentY?: number; idx?: number; total?: number } = {}): KTNode {
    const angle = opts.total && opts.total > 1
      ? (-Math.PI / 2) + ((opts.idx ?? 0) / opts.total) * Math.PI * 2
      : Math.random() * Math.PI * 2;
    const dist = 130 + Math.random() * 40;
    return {
      id: _ktNextId++,
      topic,
      canonicalKey: normTopic(topic),
      state: "unexplored",
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

      // Add subtopic nodes
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
    // Reset
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
    // Center camera
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      panRef.current = { x: rect.width / 2, y: rect.height / 2 };
      setPan({ ...panRef.current });
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────────
  const selectedNode = nodesRef.current.find((n) => n.id === selectedId) ?? null;
  const nodes = nodesRef.current;
  const links = linksRef.current;

  function nodeColor(n: KTNode) {
    if (n.id === rootId) return "url(#ktSeed)";
    if (n.state === "loading") return "url(#ktLoading)";
    if (n.state === "explored") return "url(#ktExplored)";
    return "url(#ktFrontier)";
  }
  function nodeRadius(n: KTNode) {
    return (n.id === rootId ? 20 : n.state === "explored" ? 14 : 10) + Math.min(n.neighbors.size, 8) * 0.7;
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
              <p className="mt-0.5 text-xs text-muted-foreground">Explore topics as a converging force-graph. Click nodes to expand.</p>
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
            <button
              onClick={startExplore}
              disabled={!seed.trim() || expandMutation.isPending}
              className="rounded-xl bg-[oklch(0.72_0.18_200_/_0.2)] px-4 py-2 text-sm font-semibold text-[oklch(0.83_0.15_200)] transition hover:bg-[oklch(0.72_0.18_200_/_0.3)] disabled:opacity-40"
            >
              Explore
            </button>
          </div>
          <div className="flex gap-3">
            {[
              { label: "Topics", value: nodes.length },
              { label: "Links", value: links.length },
              { label: "Frontier", value: nodes.filter((n) => n.state === "unexplored").length },
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
              {links.map((link) => {
                const src = nodes.find((n) => n.id === link.sourceId);
                const tgt = nodes.find((n) => n.id === link.targetId);
                if (!src || !tgt) return null;
                const stroke =
                  link.type === "convergent" ? "rgba(139,92,246,0.6)" :
                  link.type === "seed" ? "rgba(37,99,235,0.5)" : "rgba(148,163,184,0.3)";
                return (
                  <line
                    key={link.id}
                    x1={src.x} y1={src.y}
                    x2={tgt.x} y2={tgt.y}
                    stroke={stroke}
                    strokeWidth={link.type === "convergent" ? 2 : 1.2}
                  />
                );
              })}
              {/* Nodes */}
              {nodes.map((node) => {
                const r = nodeRadius(node);
                const isSelected = node.id === selectedId;
                const labelLines = wrapLabel(node.topic);
                return (
                  <g
                    key={node.id}
                    data-node="1"
                    style={{ cursor: "pointer" }}
                    onClick={(e) => { e.stopPropagation(); expandNode(node.id); }}
                  >
                    {isSelected && (
                      <circle cx={node.x} cy={node.y} r={r + 12} fill="none" stroke="rgba(245,158,11,0.8)" strokeWidth={2} strokeDasharray="2 4" />
                    )}
                    <circle cx={node.x} cy={node.y} r={r + 5} fill="rgba(15,23,42,0.15)" />
                    <circle cx={node.x} cy={node.y} r={r} fill={nodeColor(node)} stroke="rgba(255,255,255,0.15)" strokeWidth={1.4} />
                    {node.state === "loading" && (
                      <circle cx={node.x} cy={node.y} r={r + 8} fill="none" stroke="rgba(251,191,36,0.7)" strokeWidth={1.5}>
                        <animate attributeName="r" from={r + 5} to={r + 16} dur="1.2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" from="0.7" to="0" dur="1.2s" repeatCount="indefinite" />
                      </circle>
                    )}
                    {labelLines.map((line, li) => (
                      <text
                        key={li}
                        x={node.x}
                        y={node.y + r + 14 + li * 12}
                        textAnchor="middle"
                        fill="rgba(226,232,240,0.85)"
                        fontSize={isSelected ? 11 : 10}
                        fontFamily="system-ui, sans-serif"
                        fontWeight={isSelected ? 700 : 600}
                        stroke="rgba(15,23,42,0.7)"
                        strokeWidth={3}
                        paintOrder="stroke"
                        pointerEvents="none"
                      >
                        {line}
                      </text>
                    ))}
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Legend overlay */}
          <div className="absolute bottom-3 left-3 flex gap-3 rounded-xl border border-white/10 bg-[rgba(9,11,20,0.75)] px-3 py-2 backdrop-blur text-xs text-muted-foreground">
            {[
              { color: "#2563eb", label: "Seed" },
              { color: "#10b981", label: "Explored" },
              { color: "#475569", label: "Frontier" },
              { color: "#f59e0b", label: "Loading" },
            ].map(({ color, label }) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full flex-none" style={{ background: color }} />
                {label}
              </span>
            ))}
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
                  </div>
                </div>
                {selectedNode.summary && (
                  <button
                    onClick={() => onAddAsSource(selectedNode.topic, selectedNode.summary)}
                    className="flex-none rounded-xl bg-[oklch(0.72_0.18_140_/_0.18)] px-3 py-2 text-xs font-semibold text-[oklch(0.84_0.14_140)] transition hover:bg-[oklch(0.72_0.18_140_/_0.26)]"
                  >
                    + Add as Source
                  </button>
                )}
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
                          <button
                            key={t}
                            onClick={() => {
                              const n = findNode(t);
                              if (n) expandNode(n.id);
                            }}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-muted-foreground transition hover:border-[oklch(0.72_0.18_200_/_0.3)] hover:text-foreground"
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => expandNode(selectedNode.id)}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-muted-foreground transition hover:text-foreground"
                  >
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
            <p className="text-sm">Enter a seed topic and click Explore. Each node expands into subtopics as you click it.</p>
          </div>
        )}
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
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Search size={16} /> Discover Sources
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-muted-foreground hover:text-foreground transition">
            <X size={18} />
          </button>
        </div>

        {/* Search controls */}
        <div className="border-b border-white/10 p-4 space-y-3">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="What do you want to research?"
            className="w-full rounded-xl border border-white/10 bg-[rgba(6,8,18,0.7)] px-4 py-3 text-sm text-foreground outline-none transition focus:border-[oklch(0.72_0.18_200_/_0.45)]"
          />
          <div className="flex gap-3">
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="flex-1 rounded-xl border border-white/10 bg-[rgba(6,8,18,0.7)] px-3 py-2 text-sm text-foreground outline-none"
            >
              {[5, 10, 15, 20, 25].map((n) => (
                <option key={n} value={n}>{n} sources</option>
              ))}
            </select>
            <button
              onClick={search}
              disabled={isSearching || !topic.trim()}
              className="rounded-xl bg-[oklch(0.72_0.18_200_/_0.2)] px-6 py-2 text-sm font-semibold text-[oklch(0.83_0.15_200)] transition hover:bg-[oklch(0.72_0.18_200_/_0.3)] disabled:opacity-40"
            >
              {isSearching ? <Loader2 size={14} className="animate-spin" /> : "Search"}
            </button>
          </div>
        </div>

        {/* Results */}
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
              <input
                type="checkbox"
                checked={selected.has(r.url)}
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

        {/* Footer */}
        {results.length > 0 && (
          <div className="flex items-center justify-between border-t border-white/10 px-6 py-4">
            <button onClick={toggleAll} className="text-xs text-muted-foreground hover:text-foreground transition">
              {selected.size === results.length ? "Deselect All" : "Select All"}
            </button>
            <div className="flex gap-3">
              <button onClick={onClose} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-muted-foreground transition hover:text-foreground">
                Cancel
              </button>
              <button
                onClick={() => {
                  onImport(topic.trim(), Array.from(selected));
                  onClose();
                }}
                disabled={selected.size === 0}
                className="rounded-xl bg-[oklch(0.72_0.18_140_/_0.2)] px-5 py-2 text-sm font-semibold text-[oklch(0.84_0.14_140)] transition hover:bg-[oklch(0.72_0.18_140_/_0.3)] disabled:opacity-40"
              >
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

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"notebook" | "kt">("notebook");

  // ── Notebook state ─────────────────────────────────────────────────────────
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);
  const [activeSourceId, setActiveSourceId] = useState<number | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([]);
  const [showDiscover, setShowDiscover] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [studio, setStudio] = useState<StudioState>({ mode: "idle" });

  // ── tRPC queries ───────────────────────────────────────────────────────────
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
  const sourceDetailQuery = trpc.research.getSourceDetail.useQuery(
    { cookieId: cookieId ?? "", projectId: activeProjectId ?? 0, sourceId: activeSourceId ?? 0 },
    { enabled: !!cookieId && !!activeProjectId && !!activeSourceId },
  );

  // ── tRPC mutations ─────────────────────────────────────────────────────────
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

  // ── Auto-select first project ──────────────────────────────────────────────
  useEffect(() => {
    if (!activeProjectId && projectsQuery.data?.projects?.length) {
      setActiveProjectId(projectsQuery.data.projects[0].id);
    }
  }, [activeProjectId, projectsQuery.data]);

  // Reset chat when switching projects
  useEffect(() => {
    setChatHistory([]);
    setActiveSourceId(null);
    setStudio({ mode: "idle" });
  }, [activeProjectId]);

  // ── Derived data ───────────────────────────────────────────────────────────
  const workspace = workspaceQuery.data;
  const sources = useMemo(
    () => (workspace?.sources ?? []) as Array<{ id: number; title: string; url: string; summary?: string | null }>,
    [workspace],
  );
  const latestAudio = audioQuery.data?.items?.[0] ?? null;
  const projects = projectsQuery.data?.projects ?? [];

  // ── Handlers ──────────────────────────────────────────────────────────────
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
    generateContentMutation.mutate({
      cookieId,
      projectId: activeProjectId,
      type: type as any,
    });
  }

  function handleGenerateAudio() {
    if (!activeProjectId || !cookieId) return;
    setStudio({ mode: "loading", label: "Audio Overview" });
    audioMutation.mutate({ cookieId, projectId: activeProjectId });
  }

  function handleImport(topic: string, urls: string[]) {
    if (!cookieId) return;
    const selectedSources = urls.map((url) => ({ url, title: url, description: "" }));
    ingestMutation.mutate({ cookieId, projectName: topic, sources: selectedSources });
  }

  // Receive knowledge-tree node as a source
  function handleAddKTAsSource(topic: string, summary: string) {
    toast.info(`"${topic}" added as a source.`);
    // In a future version, this could create a source record in the active project
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <PageWrapper pageName="research">
      <div className="flex flex-col" style={{ height: "calc(100vh - 4rem)", paddingTop: "4rem" }}>
        {/* ── Secondary tab bar ──────────────────────────────────────────── */}
        <div className="flex items-center gap-1 border-b border-white/10 bg-[rgba(5,7,16,0.95)] px-4 py-2">
          {(["notebook", "kt"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-xl px-4 py-1.5 text-sm font-semibold transition ${
                activeTab === tab
                  ? "bg-[oklch(0.72_0.18_200_/_0.18)] text-[oklch(0.83_0.15_200)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "notebook" ? "📚 Notebook" : "🌱 Knowledge Tree"}
            </button>
          ))}

          {/* Project selector */}
          <div className="ml-4 flex items-center gap-2">
            {projects.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowProjects((v) => !v)}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-foreground transition hover:border-white/20"
                >
                  <BookOpen size={13} />
                  <span className="max-w-[140px] truncate">{projects.find((p) => p.id === activeProjectId)?.name ?? "Select notebook"}</span>
                  <ChevronDown size={12} className="text-muted-foreground" />
                </button>
                {showProjects && (
                  <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-2xl border border-white/10 bg-[rgba(9,11,20,0.97)] p-2 shadow-2xl">
                    {projects.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => { setActiveProjectId(p.id); setShowProjects(false); }}
                        className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                          p.id === activeProjectId ? "bg-[oklch(0.72_0.18_200_/_0.16)] text-[oklch(0.83_0.15_200)]" : "text-foreground hover:bg-white/5"
                        }`}
                      >
                        <BookOpen size={12} className="flex-none text-muted-foreground" />
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Add notebook shortcut */}
          <button
            onClick={() => setShowDiscover(true)}
            className="ml-auto flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-muted-foreground transition hover:text-foreground"
          >
            <Plus size={12} /> New Notebook
          </button>
        </div>

        {/* ── Tab content ──────────────────────────────────────────────────── */}
        {activeTab === "notebook" ? (
          activeProjectId && workspace ? (
            <div className="flex flex-1 min-h-0">
              <SourcesPanel
                sources={sources}
                activeSourceId={activeSourceId}
                onSelectSource={setActiveSourceId}
                onAddSources={() => setShowDiscover(true)}
                isLoading={workspaceQuery.isLoading}
              />
              <ChatPanel
                history={chatHistory}
                onSend={handleSendChat}
                isSending={chatMutation.isPending}
              />
              <StudioPanel
                studio={studio}
                hasProject={!!activeProjectId}
                onGenerate={handleGenerate}
                onGenerateAudio={handleGenerateAudio}
                latestAudio={latestAudio}
                isGeneratingAudio={audioMutation.isPending}
              />
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
                  <button
                    onClick={() => setShowDiscover(true)}
                    className="mt-2 rounded-2xl bg-[oklch(0.72_0.18_200_/_0.18)] px-6 py-3 text-sm font-semibold text-[oklch(0.83_0.15_200)] transition hover:bg-[oklch(0.72_0.18_200_/_0.26)]"
                  >
                    <Plus size={14} className="mr-2 inline" /> Discover Sources
                  </button>
                </>
              )}
            </div>
          )
        ) : (
          <KnowledgeTreeView
            cookieId={cookieId ?? ""}
            onAddAsSource={handleAddKTAsSource}
          />
        )}

        {/* ── Modals ───────────────────────────────────────────────────────── */}
        {showDiscover && (
          <DiscoverModal
            onClose={() => setShowDiscover(false)}
            onImport={handleImport}
            cookieId={cookieId ?? ""}
          />
        )}
      </div>
    </PageWrapper>
  );
}
