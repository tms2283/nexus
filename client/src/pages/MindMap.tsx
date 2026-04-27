import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import PageWrapper from "@/components/PageWrapper";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Network, Plus, Sparkles, Save, Trash2, ZoomIn, ZoomOut,
  RotateCcw, ArrowLeft, ChevronRight, Maximize2, Download
} from "lucide-react";

type MindMapNode = {
  id: string;
  label: string;
  parentId: string | null;
  category?: string;
  x: number;
  y: number;
  color?: string;
  notes?: string;
};

type SavedMap = {
  id: number;
  title: string;
  rootTopic: string;
  nodesJson: MindMapNode[];
  createdAt: Date | string;
  updatedAt: Date | string;
};

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  root:      { bg: "#7c3aed", border: "#a78bfa", text: "#fff", glow: "rgba(124,58,237,0.6)" },
  primary:   { bg: "#0e7490", border: "#22d3ee", text: "#fff", glow: "rgba(14,116,144,0.5)" },
  secondary: { bg: "#065f46", border: "#34d399", text: "#fff", glow: "rgba(6,95,70,0.4)" },
  tertiary:  { bg: "#1e1b4b", border: "#818cf8", text: "#e0e7ff", glow: "rgba(30,27,75,0.4)" },
};

const NODE_SIZES: Record<string, { w: number; h: number; fontSize: number }> = {
  root:      { w: 160, h: 56, fontSize: 15 },
  primary:   { w: 140, h: 48, fontSize: 13 },
  secondary: { w: 120, h: 40, fontSize: 12 },
  tertiary:  { w: 110, h: 36, fontSize: 11 },
};

export function MindMapCore() {
  const { cookieId, addXP } = usePersonalization();
  const [view, setView] = useState<"list" | "canvas" | "new">("list");
  const [topic, setTopic] = useState("");
  const [depth, setDepth] = useState(2);
  const [isGenerating, setIsGenerating] = useState(false);
  const [nodes, setNodes] = useState<MindMapNode[]>([]);
  const [currentMapId, setCurrentMapId] = useState<number | null>(null);
  const [currentTitle, setCurrentTitle] = useState("");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [expandingNode, setExpandingNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const { data: savedMaps, refetch: refetchMaps } = trpc.mindmap.list.useQuery(
    { cookieId },
    { enabled: !!cookieId }
  );

  const generateMutation = trpc.mindmap.generate.useMutation();
  const expandMutation = trpc.mindmap.expandNode.useMutation();
  const saveMutation = trpc.mindmap.save.useMutation();
  const updateMutation = trpc.mindmap.update.useMutation();
  const deleteMutation = trpc.mindmap.delete.useMutation();

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    try {
      const result = await generateMutation.mutateAsync({ cookieId, topic, depth });
      setNodes(result.nodes as MindMapNode[]);
      setCurrentMapId(result.mapId);
      setCurrentTitle(topic);
      setZoom(0.8);
      setPan({ x: 0, y: 0 });
      addXP(15);
      setView("canvas");
      toast.success("Mind map generated!");
    } catch {
      toast.error("Failed to generate mind map.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExpandNode = async (node: MindMapNode) => {
    if (!currentMapId || expandingNode) return;
    setExpandingNode(node.id);
    try {
      const result = await expandMutation.mutateAsync({
        cookieId,
        mapId: currentMapId,
        nodeId: node.id,
        nodeLabel: node.label,
        existingNodes: nodes.map(n => ({ id: n.id, label: n.label, parentId: n.parentId, category: n.category, x: n.x, y: n.y })),
      });
      const newNodes = result.newNodes as MindMapNode[];
      // Position new nodes around the expanded node
      const angle = (2 * Math.PI) / newNodes.length;
      const radius = 180;
      const positioned = newNodes.map((n, i) => ({
        ...n,
        x: node.x + Math.cos(angle * i) * radius,
        y: node.y + Math.sin(angle * i) * radius,
      }));
      setNodes(prev => [...prev, ...positioned]);
      addXP(5);
      toast.success(`Expanded "${node.label}"`);
    } catch {
      toast.error("Failed to expand node.");
    } finally {
      setExpandingNode(null);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (currentMapId) {
        await updateMutation.mutateAsync({ id: currentMapId, cookieId: cookieId ?? "", nodesJson: nodes });
      } else {
        const result = await saveMutation.mutateAsync({ cookieId, title: currentTitle, rootTopic: currentTitle, nodesJson: nodes });
        setCurrentMapId(result.mapId);
      }
      await refetchMaps();
      toast.success("Mind map saved!");
    } catch {
      toast.error("Failed to save.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMap = async (id: number) => {
    await deleteMutation.mutateAsync({ id, cookieId: cookieId ?? "" });
    await refetchMaps();
    toast.success("Map deleted.");
  };

  const openMap = (map: SavedMap) => {
    setNodes(map.nodesJson as MindMapNode[]);
    setCurrentMapId(map.id);
    setCurrentTitle(map.title);
    setZoom(0.8);
    setPan({ x: 0, y: 0 });
    setView("canvas");
  };

  // Canvas pan handlers
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === svgRef.current) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && !draggingNode) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
    if (draggingNode) {
      const svgRect = svgRef.current?.getBoundingClientRect();
      if (!svgRect) return;
      const x = (e.clientX - svgRect.left - pan.x) / zoom;
      const y = (e.clientY - svgRect.top - pan.y) / zoom;
      setNodes(prev => prev.map(n => n.id === draggingNode ? { ...n, x, y } : n));
    }
  }, [isDragging, draggingNode, dragStart, pan, zoom]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsDragging(false);
    setDraggingNode(null);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.max(0.3, Math.min(2.5, z * delta)));
  }, []);

  const resetView = () => { setZoom(0.8); setPan({ x: 0, y: 0 }); };

  // Draw edges between connected nodes
  const edges = nodes.filter(n => n.parentId).map(n => {
    const parent = nodes.find(p => p.id === n.parentId);
    if (!parent) return null;
    return { from: parent, to: n, id: `${parent.id}-${n.id}` };
  }).filter(Boolean) as Array<{ from: MindMapNode; to: MindMapNode; id: string }>;

  const getNodeSize = (category?: string) => NODE_SIZES[category ?? "secondary"] ?? NODE_SIZES.secondary;
  const getNodeColor = (category?: string) => CATEGORY_COLORS[category ?? "secondary"] ?? CATEGORY_COLORS.secondary;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-hidden flex flex-col">

        {/* ── List View ──────────────────────────────────────────── */}
        <AnimatePresence mode="wait">
          {view === "list" && (
            <motion.div key="list" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="px-4 max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <h1 className="text-4xl font-bold text-foreground mb-2">
                    Mind <span className="text-gradient">Maps</span>
                  </h1>
                  <p className="text-white/50">AI-generated interactive concept maps — expand any node to go deeper</p>
                </div>
                <Button onClick={() => setView("new")} className="bg-violet-600 hover:bg-violet-500 text-white gap-2">
                  <Plus className="w-4 h-4" /> New Map
                </Button>
              </div>

              {!savedMaps || savedMaps.length === 0 ? (
                <div className="text-center py-20">
                  <Network className="w-16 h-16 text-white/20 mx-auto mb-4" />
                  <p className="text-white/40 text-lg mb-2">No mind maps yet</p>
                  <p className="text-white/30 text-sm mb-6">Generate your first map from any topic</p>
                  <Button onClick={() => setView("new")} className="bg-violet-600 hover:bg-violet-500 text-white gap-2">
                    <Sparkles className="w-4 h-4" /> Create Your First Map
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(savedMaps as SavedMap[]).map(map => (
                    <motion.div
                      key={map.id}
                      className="glass rounded-xl p-6 border border-white/5 hover:border-violet-500/30 transition-all group cursor-pointer"
                      whileHover={{ scale: 1.01 }}
                      onClick={() => openMap(map)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="p-2 rounded-lg bg-violet-500/10">
                          <Network className="w-5 h-5 text-violet-400" />
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); handleDeleteMap(map.id); }}
                          className="text-white/20 hover:text-red-400 transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <h3 className="text-foreground font-semibold mb-1 group-hover:text-violet-300 transition-colors">{map.title}</h3>
                      <p className="text-white/40 text-sm mb-3">{(map.nodesJson as MindMapNode[]).length} nodes</p>
                      <div className="flex items-center justify-between">
                        <span className="text-white/30 text-xs">{new Date(map.updatedAt).toLocaleDateString()}</span>
                        <Button size="sm" className="bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-500/30 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          Open <ChevronRight className="w-3 h-3" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── New Map View ──────────────────────────────────────── */}
          {view === "new" && (
            <motion.div key="new" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="px-4 max-w-lg mx-auto">
              <button onClick={() => setView("list")} className="flex items-center gap-2 text-white/50 hover:text-white mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <div className="text-center mb-10">
                <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
                  <Network className="w-8 h-8 text-violet-400" />
                </div>
                <h2 className="text-3xl font-bold text-foreground mb-2">Generate Mind Map</h2>
                <p className="text-white/50">AI will create a comprehensive concept map for any topic</p>
              </div>
              <div className="glass rounded-2xl p-8 space-y-6">
                <div>
                  <label className="text-white/70 text-sm font-medium block mb-2">Topic</label>
                  <input
                    value={topic}
                    onChange={e => setTopic(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleGenerate()}
                    placeholder="e.g. Machine Learning, Renaissance Art, Quantum Computing..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-foreground placeholder-white/30 focus:outline-none focus:border-violet-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-white/70 text-sm font-medium block mb-2">
                    Depth: {depth === 1 ? "Overview" : depth === 2 ? "Detailed" : "Expert"}
                  </label>
                  <div className="flex gap-3">
                    {[1, 2, 3].map(d => (
                      <button
                        key={d}
                        onClick={() => setDepth(d)}
                        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${depth === d ? "bg-violet-600 border-violet-500 text-white" : "bg-white/5 border-white/10 text-white/50 hover:border-white/20"}`}
                      >
                        {d === 1 ? "Overview" : d === 2 ? "Detailed" : "Expert"}
                      </button>
                    ))}
                  </div>
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={!topic.trim() || isGenerating}
                  className="w-full bg-violet-600 hover:bg-violet-500 text-white py-3 gap-2"
                >
                  {isGenerating ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating Map...</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Generate Mind Map</>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── Canvas View ───────────────────────────────────────── */}
          {view === "canvas" && (
            <motion.div key="canvas" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="relative flex-1 flex flex-col">
              {/* Toolbar */}
              <div className="flex-none flex items-center justify-between px-6 py-3 bg-black/40 backdrop-blur-sm border-b border-white/5 z-20">
                <div className="flex items-center gap-3">
                  <button onClick={() => setView("list")} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm">
                    <ArrowLeft className="w-4 h-4" /> Maps
                  </button>
                  <span className="text-white/20">|</span>
                  <span className="text-foreground font-medium text-sm">{currentTitle}</span>
                  <span className="text-white/30 text-xs">{nodes.length} nodes</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setZoom(z => Math.min(2.5, z * 1.2))} className="p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button onClick={() => setZoom(z => Math.max(0.3, z * 0.8))} className="p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button onClick={resetView} className="p-2 text-white/50 hover:text-white hover:bg-white/5 rounded-lg transition-all">
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <span className="text-white/20">|</span>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    size="sm"
                    className="bg-violet-600 hover:bg-violet-500 text-white gap-2"
                  >
                    {isSaving ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-3 h-3" />}
                    Save
                  </Button>
                </div>
              </div>

              {/* Instructions */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 text-white/30 text-xs flex items-center gap-4">
                <span>Scroll to zoom</span>
                <span>·</span>
                <span>Drag canvas to pan</span>
                <span>·</span>
                <span>Double-click node to expand</span>
              </div>

              {/* SVG Canvas */}
              <svg
                ref={svgRef}
                className="w-full cursor-grab active:cursor-grabbing select-none"
                style={{ flex: 1, background: "transparent" }}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                onWheel={handleWheel}
              >
                <defs>
                  {Object.entries(CATEGORY_COLORS).map(([cat, colors]) => (
                    <filter key={cat} id={`glow-${cat}`}>
                      <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                      <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  ))}
                </defs>

                <g transform={`translate(${pan.x + (svgRef.current?.clientWidth ?? 800) / 2}, ${pan.y + (svgRef.current?.clientHeight ?? 600) / 2}) scale(${zoom})`}>
                  {/* Edges */}
                  {edges.map(edge => (
                    <line
                      key={edge.id}
                      x1={edge.from.x} y1={edge.from.y}
                      x2={edge.to.x} y2={edge.to.y}
                      stroke="rgba(255,255,255,0.12)"
                      strokeWidth={edge.from.category === "root" ? 2 : 1.5}
                      strokeDasharray={edge.to.category === "tertiary" ? "4,4" : "none"}
                    />
                  ))}

                  {/* Nodes */}
                  {nodes.map(node => {
                    const size = getNodeSize(node.category);
                    const color = getNodeColor(node.category);
                    const isSelected = selectedNode === node.id;
                    const isExpanding = expandingNode === node.id;

                    return (
                      <g
                        key={node.id}
                        transform={`translate(${node.x - size.w / 2}, ${node.y - size.h / 2})`}
                        className="cursor-pointer"
                        onClick={() => setSelectedNode(isSelected ? null : node.id)}
                        onDoubleClick={() => handleExpandNode(node)}
                        onMouseDown={e => { e.stopPropagation(); setDraggingNode(node.id); }}
                      >
                        {/* Glow effect */}
                        {isSelected && (
                          <rect
                            x={-4} y={-4} width={size.w + 8} height={size.h + 8}
                            rx={14} fill="none"
                            stroke={color.border}
                            strokeWidth={2}
                            opacity={0.6}
                            filter={`url(#glow-${node.category ?? "secondary"})`}
                          />
                        )}
                        {/* Node background */}
                        <rect
                          width={size.w} height={size.h}
                          rx={10}
                          fill={color.bg}
                          stroke={isSelected ? color.border : "rgba(255,255,255,0.1)"}
                          strokeWidth={isSelected ? 2 : 1}
                          opacity={0.9}
                        />
                        {/* Expanding indicator */}
                        {isExpanding && (
                          <rect
                            width={size.w} height={size.h} rx={10}
                            fill="none" stroke={color.border} strokeWidth={2}
                            opacity={0.8}
                          >
                            <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1s" repeatCount="indefinite" />
                          </rect>
                        )}
                        {/* Label */}
                        <text
                          x={size.w / 2} y={size.h / 2}
                          textAnchor="middle" dominantBaseline="middle"
                          fill={color.text}
                          fontSize={size.fontSize}
                          fontFamily="'Space Grotesk', sans-serif"
                          fontWeight={node.category === "root" ? "700" : "500"}
                          style={{ pointerEvents: "none" }}
                        >
                          {node.label.length > 18 ? node.label.slice(0, 16) + "…" : node.label}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>

              {/* Selected node panel */}
              <AnimatePresence>
                {selectedNode && (() => {
                  const node = nodes.find(n => n.id === selectedNode);
                  if (!node) return null;
                  return (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="absolute top-16 right-4 w-64 glass rounded-xl p-4 border border-white/10 z-20"
                    >
                      <p className="text-foreground font-semibold mb-1">{node.label}</p>
                      <p className="text-white/40 text-xs capitalize mb-3">{node.category} node</p>
                      <Button
                        size="sm"
                        onClick={() => handleExpandNode(node)}
                        disabled={!!expandingNode}
                        className="w-full bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-500/30 gap-2 text-xs"
                      >
                        {expandingNode === node.id ? (
                          <><div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" /> Expanding...</>
                        ) : (
                          <><Plus className="w-3 h-3" /> Expand Node</>
                        )}
                      </Button>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function MindMap() {
  return (
    <PageWrapper pageName="mindmap">
      <div className="min-h-screen pt-24 pb-16 flex flex-col">
        <MindMapCore />
      </div>
    </PageWrapper>
  );
}
