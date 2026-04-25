import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { usePersonalization } from "../contexts/PersonalizationContext";
import { CheckCircle, Clock, BookOpen, ChevronRight, AlertCircle, Loader2 } from "lucide-react";
import type { GoalPathNodeView } from "@shared/types/goalPath";

// ─── Path building skeleton ───────────────────────────────────────────────────
function BuildingSkeleton() {
  const stages = [
    "Analysing your goal…",
    "Mapping learning outcomes…",
    "Matching curated resources…",
    "Building your concept sequence…",
  ];
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 px-4">
      <div className="glass rounded-2xl p-8 border border-white/10 max-w-md w-full text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[oklch(0.65_0.22_200)] mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-foreground mb-2">Designing your path…</h2>
        <div className="space-y-2 mt-4">
          {stages.map((s, i) => (
            <motion.p
              key={s}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.8 }}
              className="text-sm text-muted-foreground"
            >
              {s}
            </motion.p>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Path node card ───────────────────────────────────────────────────────────
interface NodeCardProps {
  node: {
    sequenceNumber: number;
    conceptId: string;
    conceptTitle: string;
    conceptSummary: string;
    estimatedMinutes: number;
    lessonStatus: "queued" | "generating" | "ready" | "failed";
    lessonKey?: string;
    masteryPKnown: number;
    mastered: boolean;
  };
  pathId: string;
  cookieId: string;
}

function NodeCard({ node, pathId, cookieId }: NodeCardProps) {
  const [, navigate] = useLocation();
  const [waitingForLesson, setWaitingForLesson] = useState(false);
  const advanceMutation = trpc.curriculum.advancePath.useMutation();

  // Auto-navigate the moment this node's lesson becomes ready
  useEffect(() => {
    if (waitingForLesson && node.lessonStatus === "ready" && node.lessonKey) {
      navigate(`/lesson/${node.lessonKey}`);
    }
  }, [waitingForLesson, node.lessonStatus, node.lessonKey, navigate]);

  const handleOpen = async () => {
    if (node.lessonStatus === "ready" && node.lessonKey) {
      navigate(`/lesson/${node.lessonKey}`);
      return;
    }
    if (node.lessonStatus === "generating") {
      setWaitingForLesson(true);
      return;
    }
    if (node.lessonStatus === "queued") {
      const result = await advanceMutation.mutateAsync({
        pathId,
        conceptId: node.conceptId,
        cookieId,
      });
      if (result.status === "ready" && result.lessonKey) {
        navigate(`/lesson/${result.lessonKey}`);
      } else {
        setWaitingForLesson(true);
      }
    }
  };

  const masteryPercent = Math.round(node.masteryPKnown * 100);
  const isReady = node.lessonStatus === "ready";
  const isGenerating = node.lessonStatus === "generating" || advanceMutation.isPending || waitingForLesson;
  const isFailed = node.lessonStatus === "failed";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: node.sequenceNumber * 0.06 }}
      className={`glass rounded-2xl p-5 border transition-colors ${
        node.mastered
          ? "border-[oklch(0.7_0.2_145_/_0.4)]"
          : "border-white/10 hover:border-white/20"
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Sequence badge */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
          node.mastered
            ? "bg-[oklch(0.7_0.2_145_/_0.2)] text-[oklch(0.7_0.2_145)]"
            : "bg-white/5 text-muted-foreground"
        }`}>
          {node.mastered ? <CheckCircle size={16} /> : node.sequenceNumber + 1}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground mb-1">{node.conceptTitle}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">
            {node.conceptSummary}
          </p>

          {/* Mastery bar — only shown after at least one attempt */}
          {node.masteryPKnown > 0 && (
            <div className="mb-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-muted-foreground">Mastery</span>
                <span className="text-xs text-muted-foreground">{masteryPercent}%</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    node.mastered
                      ? "bg-[oklch(0.7_0.2_145)]"
                      : "bg-[oklch(0.65_0.22_200)]"
                  }`}
                  style={{ width: `${masteryPercent}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock size={12} />
              <span>~{node.estimatedMinutes} min</span>
            </div>

            {isFailed ? (
              <div className="flex items-center gap-1 text-xs text-red-400">
                <AlertCircle size={12} />
                <span>Generation failed</span>
              </div>
            ) : isGenerating ? (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 size={12} className="animate-spin" />
                <span>{waitingForLesson ? "Opening when ready…" : "Generating…"}</span>
              </div>
            ) : (
              <button
                onClick={handleOpen}
                disabled={advanceMutation.isPending}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/15 hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                <BookOpen size={12} />
                <span>{node.lessonStatus === "queued" ? "Start" : "Continue"}</span>
                <ChevronRight size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function PathView() {
  const { pathId } = useParams<{ pathId: string }>();
  const { cookieId } = usePersonalization();

  const { data: path, isLoading, refetch } = trpc.curriculum.getPath.useQuery(
    { pathId: pathId ?? "", cookieId },
    { enabled: !!pathId && !!cookieId, refetchInterval: false }
  );

  // Poll while building or while any node lesson is being generated
  const hasGeneratingNode = path?.nodes.some((n: GoalPathNodeView) => n.lessonStatus === "generating") ?? false;
  useEffect(() => {
    if (!path) return;
    if (path.status !== "building" && !hasGeneratingNode) return;
    const id = setInterval(() => refetch(), 3000);
    return () => clearInterval(id);
  }, [path?.status, hasGeneratingNode, refetch]);

  if (!pathId) return <div className="p-8 text-muted-foreground">Invalid path.</div>;
  if (isLoading || !path) return <BuildingSkeleton />;
  if (path.status === "building") return <BuildingSkeleton />;

  if (path.status === "abandoned") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass rounded-2xl p-8 border border-red-400/20 max-w-md text-center">
          <AlertCircle className="w-8 h-8 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Path couldn't be built</h2>
          <p className="text-sm text-muted-foreground">{path.pitch || "Try rephrasing your goal to be more specific."}</p>
        </div>
      </div>
    );
  }

  const masteredCount = path.nodes.filter((n: GoalPathNodeView) => n.mastered).length;
  const totalMinutes = path.estimatedTotalMinutes;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  return (
    <div className="min-h-screen pt-16 pb-24">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <BookOpen size={12} />
            <span>Learning Path</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">{path.goalSummary}</h1>
          {path.pitch && (
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">{path.pitch}</p>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{path.nodes.length} concepts</span>
            <span>·</span>
            <span>{masteredCount} mastered</span>
            <span>·</span>
            <span>~{hours > 0 ? `${hours}h ` : ""}{mins > 0 ? `${mins}min` : ""} total</span>
          </div>

          {/* Overall progress bar */}
          <div className="mt-4">
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-[oklch(0.65_0.22_200)] transition-all duration-700"
                style={{ width: path.nodes.length ? `${(masteredCount / path.nodes.length) * 100}%` : "0%" }}
              />
            </div>
          </div>
        </motion.div>

        {/* Node list */}
        <div className="space-y-3">
          {path.nodes.map((node: GoalPathNodeView) => (
            <NodeCard
              key={node.conceptId}
              node={node}
              pathId={pathId}
              cookieId={cookieId}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
