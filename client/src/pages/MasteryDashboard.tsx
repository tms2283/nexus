import { motion } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import { CheckCircle2, BookOpen, Clock, ChevronRight, Layers } from "lucide-react";
import { useLocation } from "wouter";
import type { GoalPathCard } from "@shared/types/goalPath";

export default function MasteryDashboard() {
  const { cookieId } = usePersonalization();
  const [, navigate] = useLocation();

  const pathsQuery = trpc.curriculum.listMyPaths.useQuery(
    { cookieId: cookieId! },
    { enabled: !!cookieId }
  );
  const masteryQuery = trpc.curriculum.getMasterySummary.useQuery(
    { cookieId: cookieId! },
    { enabled: !!cookieId }
  );

  const paths: GoalPathCard[] = pathsQuery.data ?? [];
  const masteredByDomain = masteryQuery.data?.masteredByDomain ?? {};
  const reviewQueue = masteryQuery.data?.reviewQueue ?? [];
  const domains = Object.entries(masteredByDomain).sort((a, b) => b[1] - a[1]);
  const totalMastered = domains.reduce((acc, [, count]) => acc + count, 0);

  return (
    <div className="min-h-screen pt-16 pb-24">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <header>
          <h1 className="text-2xl font-bold text-foreground">Mastery Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {totalMastered} concept{totalMastered !== 1 ? "s" : ""} mastered · {reviewQueue.length} due for review
          </p>
        </header>

        {/* Overall mastery count */}
        {totalMastered > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-5 border border-white/10 flex items-center gap-4"
          >
            <CheckCircle2 size={28} className="text-[oklch(0.72_0.18_150)] shrink-0" />
            <div>
              <p className="text-2xl font-bold text-foreground">{totalMastered}</p>
              <p className="text-xs text-muted-foreground">concepts mastered</p>
            </div>
            {reviewQueue.length > 0 && (
              <div className="ml-auto text-right">
                <p className="text-lg font-bold text-[oklch(0.78_0.18_55)]">{reviewQueue.length}</p>
                <p className="text-xs text-muted-foreground">due for review</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Active goal paths */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
            <Layers size={13} /> Active Learning Paths
          </h2>
          {pathsQuery.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : paths.length === 0 ? (
            <div className="glass rounded-2xl p-6 border border-white/10 text-center">
              <p className="text-sm text-muted-foreground mb-3">No active paths yet.</p>
              <button
                onClick={() => navigate("/learn")}
                className="px-4 py-2 rounded-xl bg-[oklch(0.65_0.22_200_/_0.18)] border border-[oklch(0.65_0.22_200_/_0.4)] text-sm text-[oklch(0.85_0.18_200)] hover:bg-[oklch(0.65_0.22_200_/_0.28)] transition-colors"
              >
                Build a path →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {paths.map((path: GoalPathCard, i: number) => (
                <motion.div
                  key={path.pathId}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass rounded-2xl p-4 border border-white/10 cursor-pointer hover:border-white/20 transition-colors"
                  onClick={() => navigate(`/path/${path.pathId}`)}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground line-clamp-1">{path.goalSummary || path.goalText}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><CheckCircle2 size={11} /> {path.masteredCount}/{path.nodeCount} mastered</span>
                        <span className="flex items-center gap-1"><Clock size={11} /> {path.status}</span>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-muted-foreground shrink-0 mt-0.5" />
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-[oklch(0.72_0.18_150_/_0.7)]"
                      initial={{ width: 0 }}
                      animate={{ width: path.nodeCount > 0 ? `${path.masteredCount / path.nodeCount * 100}%` : "0%" }}
                      transition={{ duration: 0.6, ease: "easeOut", delay: i * 0.05 + 0.1 }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>

        {/* Domain mastery breakdown */}
        {domains.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-2">
              <BookOpen size={13} /> Mastery by Domain
            </h2>
            <div className="space-y-2">
              {domains.map(([domain, count], i) => (
                <motion.div
                  key={domain}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="glass rounded-xl px-4 py-3 border border-white/10 flex items-center justify-between"
                >
                  <span className="text-sm text-foreground capitalize">{domain}</span>
                  <span className="text-xs text-[oklch(0.72_0.18_150)] font-semibold">{count} mastered</span>
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
