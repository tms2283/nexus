import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Flame, Trophy, ChevronUp, Star } from "lucide-react";
import { usePersonalization } from "@/contexts/PersonalizationContext";

const BADGE_META: Record<string, { label: string; icon: string; color: string }> = {
  "explorer": { label: "Explorer", icon: "🗺️", color: "oklch(0.75 0.18 55)" },
  "curious-mind": { label: "Curious Mind", icon: "🧠", color: "oklch(0.65 0.22 200)" },
  "deep-diver": { label: "Deep Diver", icon: "🌊", color: "oklch(0.65 0.22 220)" },
  "ai-whisperer": { label: "AI Whisperer", icon: "🤖", color: "oklch(0.65 0.22 290)" },
  "nexus-scholar": { label: "Nexus Scholar", icon: "⭐", color: "oklch(0.75 0.18 55)" },
  "ai-conversationalist": { label: "AI Conversationalist", icon: "💬", color: "oklch(0.70 0.20 150)" },
  "streak-3": { label: "3-Day Streak", icon: "🔥", color: "oklch(0.70 0.22 30)" },
  "streak-7": { label: "7-Day Streak", icon: "⚡", color: "oklch(0.75 0.18 55)" },
};

export default function GamificationHUD() {
  const { profile, newBadges, clearNewBadges, xpAnimation } = usePersonalization();
  const [expanded, setExpanded] = useState(false);
  const [badgeNotification, setBadgeNotification] = useState<string | null>(null);

  const xpPercent = ((profile.xp % 100) / 100) * 100;
  const nextLevelXp = profile.level * 100;

  useEffect(() => {
    if (newBadges.length > 0) {
      setBadgeNotification(newBadges[0]);
      const timer = setTimeout(() => {
        setBadgeNotification(null);
        clearNewBadges();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [newBadges, clearNewBadges]);

  if (profile.xp === 0 && !profile.visitCount) return null;

  return (
    <>
      {/* Badge notification */}
      <AnimatePresence>
        {badgeNotification && BADGE_META[badgeNotification] && (
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.8 }}
            transition={{ type: "spring", bounce: 0.4 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 glass-strong rounded-2xl px-6 py-4 flex items-center gap-3 border border-[oklch(0.75_0.18_55_/_0.4)] shadow-2xl"
          >
            <span className="text-3xl">{BADGE_META[badgeNotification].icon}</span>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-widest">Badge Unlocked</div>
              <div className="font-bold text-[oklch(0.85_0.18_55)]">{BADGE_META[badgeNotification].label}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* XP gain animation */}
      <AnimatePresence>
        {xpAnimation.show && (
          <motion.div
            initial={{ opacity: 0, y: 0, x: 0 }}
            animate={{ opacity: 1, y: -40, x: 10 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="fixed bottom-20 left-20 z-50 text-[oklch(0.85_0.18_55)] font-bold text-sm pointer-events-none"
          >
            +{xpAnimation.amount} XP
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main HUD */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="fixed bottom-6 left-6 z-40"
      >
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="mb-3 glass-strong rounded-2xl p-4 w-64 border border-[oklch(0.75_0.18_55_/_0.2)]"
            >
              <div className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Achievements</div>
              {profile.badges.length === 0 ? (
                <p className="text-xs text-muted-foreground">Explore the site to earn badges.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {profile.badges.map((badge) => {
                    const meta = BADGE_META[badge];
                    if (!meta) return null;
                    return (
                      <div
                        key={badge}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs glass border border-white/10"
                        title={meta.label}
                      >
                        <span>{meta.icon}</span>
                        <span className="text-foreground/70">{meta.label}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-[oklch(0.75_0.18_55)] font-bold text-sm">{profile.visitCount}</div>
                  <div className="text-muted-foreground text-xs">Visits</div>
                </div>
                <div>
                  <div className="text-[oklch(0.65_0.22_200)] font-bold text-sm">{profile.pagesVisited.length}</div>
                  <div className="text-muted-foreground text-xs">Pages</div>
                </div>
                <div>
                  <div className="text-[oklch(0.70_0.22_30)] font-bold text-sm">{profile.streak}</div>
                  <div className="text-muted-foreground text-xs">Streak</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Compact HUD bar */}
        <motion.button
          onClick={() => setExpanded(!expanded)}
          className="glass-strong rounded-2xl px-4 py-3 flex items-center gap-3 border border-[oklch(0.75_0.18_55_/_0.2)] hover:border-[oklch(0.75_0.18_55_/_0.4)] transition-all group"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {/* Level badge */}
          <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-[oklch(0.75_0.18_55_/_0.3)] to-[oklch(0.65_0.22_200_/_0.2)] border border-[oklch(0.75_0.18_55_/_0.3)]">
            <span className="text-[oklch(0.85_0.18_55)] font-bold text-xs">{profile.level}</span>
          </div>

          {/* XP bar */}
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2">
              <Zap size={11} className="text-[oklch(0.75_0.18_55)] shrink-0" />
              <span className="text-[oklch(0.85_0.18_55)] font-semibold text-xs">{profile.xp} XP</span>
              {profile.streak > 0 && (
                <>
                  <span className="text-muted-foreground text-xs">·</span>
                  <Flame size={11} className="text-[oklch(0.70_0.22_30)] shrink-0" />
                  <span className="text-[oklch(0.80_0.22_30)] text-xs">{profile.streak}</span>
                </>
              )}
            </div>
            <div className="w-28 h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[oklch(0.75_0.18_55)] to-[oklch(0.65_0.22_200)] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${xpPercent}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Badges count */}
          {profile.badges.length > 0 && (
            <div className="flex items-center gap-1">
              <Trophy size={11} className="text-muted-foreground" />
              <span className="text-muted-foreground text-xs">{profile.badges.length}</span>
            </div>
          )}

          <ChevronUp
            size={14}
            className={`text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </motion.button>
      </motion.div>
    </>
  );
}
