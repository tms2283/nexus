import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookMarked, Trash2, ExternalLink, Tag, Loader2, BookOpen,
  CheckCircle2, ArrowRight, BookMarked as BookSaved,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import PageWrapper from "@/components/PageWrapper";
import { toast } from "sonner";
import { Link } from "wouter";

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
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[oklch(0.65_0.22_200_/_0.15)] border border-[oklch(0.65_0.22_200_/_0.3)] flex items-center justify-center">
              <BookMarked size={18} className="text-[oklch(0.65_0.22_200)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Reading List</h1>
              <p className="text-sm text-muted-foreground">
                {byStatus("want").length} to read · {byStatus("reading").length} in progress · {byStatus("finished").length} finished
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground ml-13 pl-1">
            Bookmark resources from the{" "}
            <Link href="/library"><span className="text-[oklch(0.65_0.22_200)] hover:underline cursor-pointer">Library</span></Link>
            {" "}or{" "}
            <Link href="/research"><span className="text-[oklch(0.65_0.22_200)] hover:underline cursor-pointer">Research Forge</span></Link>
            {" "}to save them here.
          </p>
        </motion.div>

        {isLoading ? (
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
                  {/* Column header */}
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                    <h2 className="text-sm font-semibold text-foreground">{col.label}</h2>
                    <span className="ml-auto text-xs text-muted-foreground bg-white/5 px-2 py-0.5 rounded-full">
                      {colItems.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="flex flex-col gap-3 min-h-[120px]">
                    <AnimatePresence>
                      {colItems.map(item => (
                        <KanbanCard
                          key={item.id}
                          item={item}
                          cookieId={cookieId ?? ""}
                          onMove={handleMove}
                          onRemove={handleRemove}
                        />
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
        )}
      </div>
    </PageWrapper>
  );
}
