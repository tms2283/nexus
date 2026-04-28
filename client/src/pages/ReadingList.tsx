import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookMarked, Trash2, ExternalLink, Tag, Loader2, BookOpen,
  CheckCircle2, ArrowRight, BookMarked as BookSaved, Star,
  Brain, MessageSquare, FlaskConical,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import PageWrapper from "@/components/PageWrapper";
import { toast } from "sonner";
import { Link } from "wouter";
import { useBookmarks, type Bookmark } from "@/hooks/useBookmarks";

type Status = "want" | "reading" | "finished";

const COLUMNS: { id: Status; label: string; color: string; emptyMsg: string }[] = [
  { id: "want",     label: "Want to Read",  color: "oklch(0.65 0.22 200)",  emptyMsg: "Bookmark resources from the Library to add them here." },
  { id: "reading",  label: "Reading Now",   color: "oklch(0.75 0.18 55)",   emptyMsg: "Move a card here when you start reading." },
  { id: "finished", label: "Finished",      color: "oklch(0.72 0.18 150)",  emptyMsg: "Finished items will appear here." },
];

function statusFromItem(item: { isRead: boolean; status?: string | null }): Status {
  if (item.status === "finished" || item.isRead) return "finished";
  if (item.status === "reading") return "reading";
  return "want";
}

function KanbanCard({
  item,
  cookieId,
  onMove,
  onRemove,
}: {
  item: any;
  cookieId: string;
  onMove: (id: number, status: Status) => void;
  onRemove: (id: number) => void;
}) {
  const currentStatus = statusFromItem(item);
  const nextMap: Record<Status, Status | null> = {
    want: "reading",
    reading: "finished",
    finished: null,
  };
  const next = nextMap[currentStatus];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="glass rounded-xl border border-white/8 p-4 group"
    >
      {/* Title */}
      <div className="flex items-start gap-2 mb-2">
        <div className="flex-1 min-w-0">
          {item.url ? (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-foreground hover:text-[oklch(0.75_0.18_55)] transition-colors flex items-center gap-1 leading-snug"
            >
              <span className="line-clamp-2">{item.title}</span>
              <ExternalLink size={10} className="opacity-40 flex-shrink-0 mt-0.5" />
            </a>
          ) : (
            <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{item.title}</p>
          )}
        </div>
      </div>

      {item.description && (
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">{item.description}</p>
      )}

      {item.category && (
        <div className="flex items-center gap-1 mb-3">
          <Tag size={9} className="text-muted-foreground/40" />
          <span className="text-xs text-muted-foreground/60">{item.category}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        {next ? (
          <button
            onClick={() => onMove(item.id, next)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowRight size={11} />
            {next === "reading" ? "Start reading" : "Mark finished"}
          </button>
        ) : (
          <div className="flex items-center gap-1 text-xs text-[oklch(0.72_0.18_150)]">
            <CheckCircle2 size={11} />
            Done
          </div>
        )}
        <button
          onClick={() => onRemove(item.id)}
          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all"
          title="Remove"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </motion.div>
  );
}

export default function ReadingList() {
  const { cookieId } = usePersonalization();
  const [tab, setTab] = useState<"list" | "starred">("list");
  const { bookmarks, remove: removeBookmark } = useBookmarks();

  const { data, refetch, isLoading } = trpc.library.getReadingList.useQuery(
    { cookieId: cookieId ?? "" },
    { enabled: !!cookieId }
  );

  const moveMutation = trpc.library.moveToStatus.useMutation({
    onSuccess: () => refetch(),
    onError: () => toast.error("Failed to update item"),
  });

  const removeMutation = trpc.library.removeFromReadingList.useMutation({
    onSuccess: () => { refetch(); toast.success("Removed"); },
  });

  const handleMove = (id: number, status: Status) => {
    if (!cookieId) return;
    moveMutation.mutate({ id, cookieId, status });
    if (status === "finished") toast.success("+5 XP — Marked as finished!");
  };

  const handleRemove = (id: number) => {
    if (!cookieId) return;
    removeMutation.mutate({ id, cookieId });
  };

  const items = data?.items ?? [];
  const byStatus = (s: Status) => items.filter(i => statusFromItem(i) === s);
  const totalCount = items.length;

  return (
    <PageWrapper pageName="reading-list">
      <div className="max-w-6xl mx-auto px-4 pt-16 pb-12">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[oklch(0.65_0.22_200_/_0.15)] border border-[oklch(0.65_0.22_200_/_0.3)] flex items-center justify-center">
              <BookMarked size={18} className="text-[oklch(0.65_0.22_200)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Reading List</h1>
              <p className="text-sm text-muted-foreground">
                {byStatus("want").length} to read · {byStatus("reading").length} in progress · {byStatus("finished").length} finished · {bookmarks.length} starred
              </p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 p-1 rounded-xl card-nexus w-fit">
          {([["list", BookMarked, "Reading List"], ["starred", Star, `Starred Topics (${bookmarks.length})`]] as const).map(([id, Icon, label]) => (
            <button key={id} onClick={() => setTab(id)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
              style={tab === id
                ? { background: "oklch(0.65 0.22 200 / 0.15)", color: "oklch(0.75 0.22 200)", border: "1px solid oklch(0.65 0.22 200 / 0.3)" }
                : { color: "oklch(0.52 0.010 255)", border: "1px solid transparent" }}>
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* ── Reading List Tab ── */}
        {tab === "list" && (
          isLoading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
              <Loader2 size={18} className="animate-spin" />
              <span>Loading your reading list...</span>
            </div>
          ) : totalCount === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <BookOpen size={44} className="mx-auto mb-4 text-muted-foreground/20" />
              <p className="text-muted-foreground mb-1">Your reading list is empty.</p>
              <p className="text-sm text-muted-foreground/60">
                Use the <BookSaved size={12} className="inline mb-0.5" /> bookmark button on any Library resource to save it here.
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {COLUMNS.map(col => {
                const colItems = byStatus(col.id);
                return (
                  <div key={col.id} className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                      <h2 className="text-sm font-semibold text-foreground">{col.label}</h2>
                      <span className="ml-auto text-xs text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full">{colItems.length}</span>
                    </div>
                    <div className="flex flex-col gap-3 min-h-[120px]">
                      <AnimatePresence>
                        {colItems.map(item => (
                          <KanbanCard key={item.id} item={item} cookieId={cookieId ?? ""} onMove={handleMove} onRemove={handleRemove} />
                        ))}
                      </AnimatePresence>
                      {colItems.length === 0 && (
                        <div className="glass rounded-xl border border-dashed border-white/8 p-5 text-center">
                          <p className="text-xs text-muted-foreground/50">{col.emptyMsg}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ── Starred Topics Tab ── */}
        {tab === "starred" && (
          bookmarks.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <Star size={44} className="mx-auto mb-4 text-muted-foreground/20" />
              <p className="text-muted-foreground mb-1">No starred topics yet.</p>
              <p className="text-sm text-muted-foreground/60">
                Click the ☆ star icon on any question, lesson, or topic to save it here. Missed test answers are auto-starred.
              </p>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              {bookmarks.map((bm: Bookmark) => (
                <motion.div key={bm.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="card-nexus p-4 flex items-start gap-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: bm.type === "question" ? "oklch(0.65 0.22 25 / 0.12)" : "oklch(0.78 0.16 52 / 0.12)" }}>
                    <Star size={14} style={{ color: bm.type === "question" ? "oklch(0.75 0.22 25)" : "oklch(0.78 0.16 52)" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground leading-snug mb-0.5">{bm.topic}</p>
                    {bm.context && <p className="text-xs text-muted-foreground mb-1.5">{bm.context}</p>}
                    {bm.source && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: "oklch(0.18 0.016 255)", color: "oklch(0.52 0.010 255)" }}>{bm.source}</span>}
                    {/* Quick actions */}
                    <div className="flex items-center gap-2 mt-3">
                      <Link href={`/depth?q=${encodeURIComponent(bm.topic)}`}>
                        <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors"
                          style={{ background: "oklch(0.72 0.20 290 / 0.12)", color: "oklch(0.80 0.20 290)", border: "1px solid oklch(0.72 0.20 290 / 0.25)" }}>
                          <Brain size={11} /> Explain
                        </button>
                      </Link>
                      <Link href={`/study-buddy?q=${encodeURIComponent(bm.topic)}`}>
                        <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors"
                          style={{ background: "oklch(0.65 0.22 200 / 0.12)", color: "oklch(0.75 0.22 200)", border: "1px solid oklch(0.65 0.22 200 / 0.25)" }}>
                          <MessageSquare size={11} /> Study
                        </button>
                      </Link>
                      <Link href={`/research?q=${encodeURIComponent(bm.topic)}`}>
                        <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-colors"
                          style={{ background: "oklch(0.72 0.18 150 / 0.12)", color: "oklch(0.78 0.18 150)", border: "1px solid oklch(0.72 0.18 150 / 0.25)" }}>
                          <FlaskConical size={11} /> Research
                        </button>
                      </Link>
                    </div>
                  </div>
                  <button onClick={() => removeBookmark(bm.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/8 transition-colors shrink-0"
                    title="Remove bookmark">
                    <Trash2 size={13} />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )
        )}
      </div>
    </PageWrapper>
  );
}
