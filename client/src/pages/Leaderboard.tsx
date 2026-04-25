import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Zap, Flame, Eye, Crown, Medal, Award, Star, TrendingUp, Users } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import PageWrapper from "@/components/PageWrapper";
import { CardGridSkeleton, TableSkeleton } from "@/components/SkeletonLoaders";

const METRIC_OPTIONS = [
  { id: "xp" as const, label: "XP Points", icon: Zap, color: "oklch(0.75 0.18 55)", desc: "Total experience earned" },
  { id: "streak" as const, label: "Streak", icon: Flame, color: "oklch(0.65 0.22 20)", desc: "Consecutive days active" },
  { id: "visitCount" as const, label: "Visits", icon: Eye, color: "oklch(0.65 0.22 200)", desc: "Total platform visits" },
];

const RANK_BADGES = [
  { min: 1, max: 1, label: "Champion", color: "oklch(0.85 0.18 55)", icon: Crown },
  { min: 2, max: 3, label: "Elite", color: "oklch(0.75 0.15 200)", icon: Medal },
  { min: 4, max: 10, label: "Expert", color: "oklch(0.72 0.18 150)", icon: Award },
  { min: 11, max: 50, label: "Rising", color: "oklch(0.65 0.22 290)", icon: TrendingUp },
];

function getRankBadge(rank: number) {
  return RANK_BADGES.find(b => rank >= b.min && rank <= b.max) ?? RANK_BADGES[3];
}

function getLevelTitle(level: number) {
  if (level >= 20) return "Grandmaster";
  if (level >= 15) return "Master";
  if (level >= 10) return "Expert";
  if (level >= 7) return "Advanced";
  if (level >= 4) return "Intermediate";
  if (level >= 2) return "Apprentice";
  return "Novice";
}

function getMetricValue(user: { xp: number; streak: number; visitCount: number }, metric: "xp" | "streak" | "visitCount") {
  return metric === "xp" ? user.xp : metric === "streak" ? user.streak : user.visitCount;
}

export default function Leaderboard() {
  const [metric, setMetric] = useState<"xp" | "streak" | "visitCount">("xp");
  const { cookieId } = usePersonalization();

  const { data: topData, isLoading } = trpc.leaderboard.getTopUsers.useQuery({ limit: 20, metric });
  const { data: myRankData } = trpc.leaderboard.getMyRank.useQuery({ cookieId, metric }, { enabled: !!cookieId });

  const users = topData?.users ?? [];
  const myRank = myRankData?.rank;
  const myValue = myRankData?.value ?? 0;
  const total = myRankData?.total ?? 0;
  const activeMetric = METRIC_OPTIONS.find(m => m.id === metric)!;

  const top3 = users.slice(0, 3);
  const rest = users.slice(3);

  return (
    <PageWrapper pageName="leaderboard">
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full card-nexus text-xs font-medium text-muted-foreground">
            <Users size={12} /> Global Rankings
          </motion.div>
          <motion.h1 initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="text-4xl font-bold text-foreground">
            Leaderboard
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-muted-foreground">
            The top explorers on Nexus, ranked by their dedication to learning.
          </motion.p>
        </div>

        {/* Metric Selector */}
        <div className="flex justify-center gap-3 flex-wrap">
          {METRIC_OPTIONS.map(m => (
            <button
              key={m.id}
              onClick={() => setMetric(m.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${metric === m.id ? "" : "card-nexus text-muted-foreground hover:border-border/60"}`}
              style={metric === m.id ? { background: `${m.color}18`, border: `1px solid ${m.color}44`, color: m.color } : {}}
            >
              <m.icon size={14} />
              {m.label}
            </button>
          ))}
        </div>

        {/* My Rank Card */}
        {myRank && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="p-4 rounded-2xl card-nexus flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-3xl font-black" style={{ color: activeMetric.color }}>#{myRank}</div>
              <div>
                <div className="text-sm font-semibold text-foreground">Your Ranking</div>
                <div className="text-xs text-muted-foreground">Top {total > 0 ? Math.round((myRank / total) * 100) : 0}% of {total} explorers</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-foreground">{myValue.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">{activeMetric.label}</div>
            </div>
          </motion.div>
        )}

        {isLoading ? (
          <TableSkeleton rows={5} columns={3} />
        ) : users.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Trophy size={40} className="mx-auto mb-4 opacity-30" />
            <p>No rankings yet. Start exploring to appear here!</p>
          </div>
        ) : (
          <>
            {/* Podium — Top 3 */}
            {top3.length >= 3 && (
              <div className="grid grid-cols-3 gap-4 items-end">
                {[top3[1], top3[0], top3[2]].map((user, podiumIdx) => {
                  const actualRank = podiumIdx === 0 ? 2 : podiumIdx === 1 ? 1 : 3;
                  const heights = ["h-28", "h-36", "h-24"];
                  const badge = getRankBadge(actualRank);
                  const BadgeIcon = badge.icon;
                  return (
                    <motion.div
                      key={user.cookieId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: podiumIdx * 0.1 }}
                      className={`card-nexus flex flex-col items-center gap-2 p-4 ${actualRank === 1 ? "border-[oklch(0.85_0.18_55_/_0.3)]" : "border-white/8"}`}
                      style={actualRank === 1 ? { background: "oklch(0.85 0.18 55 / 0.06)" } : {}}
                    >
                      <BadgeIcon size={20} style={{ color: badge.color }} />
                      <div className="text-2xl font-black" style={{ color: badge.color }}>#{actualRank}</div>
                      <div className="text-center">
                        <div className="text-xs font-semibold text-foreground truncate max-w-[80px]">{user.displayName}</div>
                        <div className="text-xs text-muted-foreground">{getLevelTitle(user.level)} Lv.{user.level}</div>
                      </div>
                      <div className="text-lg font-bold text-foreground">{getMetricValue(user, metric).toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{activeMetric.label}</div>
                      {user.badges && user.badges.length > 0 && (
                        <div className="flex gap-1 flex-wrap justify-center">
                          {user.badges.slice(0, 3).map((b, i) => <span key={i} className="text-xs">{b}</span>)}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Ranks 4–20 */}
            {rest.length > 0 && (
              <div className="space-y-2">
                {rest.map((user, i) => {
                  const badge = getRankBadge(user.rank);
                  const BadgeIcon = badge.icon;
                  const isMe = user.cookieId === cookieId;
                  return (
                    <motion.div
                      key={user.cookieId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`flex items-center gap-4 p-4 rounded-xl transition-all ${isMe ? "border" : "card-nexus hover:border-border/60"}`}
                      style={isMe ? { background: `${activeMetric.color}0a`, border: `1px solid ${activeMetric.color}33` } : {}}
                    >
                      <div className="w-8 text-center">
                        <BadgeIcon size={14} style={{ color: badge.color }} className="mx-auto" />
                        <div className="text-xs font-bold text-muted-foreground">#{user.rank}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground truncate">{user.displayName}</span>
                          {isMe && <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: `${activeMetric.color}18`, color: activeMetric.color }}>You</span>}
                        </div>
                        <div className="text-xs text-muted-foreground">{getLevelTitle(user.level)} · Level {user.level}</div>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <div className="text-sm font-bold text-foreground">{getMetricValue(user, metric).toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">{activeMetric.label}</div>
                        </div>
                        {metric !== "xp" && (
                          <div>
                            <div className="text-sm font-bold" style={{ color: "oklch(0.75 0.18 55)" }}>{user.xp.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">XP</div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Achievement Legend */}
        <div className="p-5 rounded-2xl card-nexus">
          <div className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-2"><Star size={12} /> RANK TIERS</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {RANK_BADGES.map(b => {
              const Icon = b.icon;
              return (
                <div key={b.label} className="flex items-center gap-2">
                  <Icon size={14} style={{ color: b.color }} />
                  <div>
                    <div className="text-xs font-semibold" style={{ color: b.color }}>{b.label}</div>
                    <div className="text-xs text-muted-foreground">Rank {b.min}{b.max > b.min ? `–${b.max}` : ""}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
