import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Clock, BookOpen, Zap, Award, Calendar, Target } from "lucide-react";
import { trpc } from "@/lib/trpc";
import PageWrapper from "@/components/PageWrapper";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import { StatCardSkeleton, ListSkeleton, CardGridSkeleton } from "@/components/SkeletonLoaders";

export default function ProgressPage() {
  const { profile, cookieId, isLoaded } = usePersonalization();

  const statsQuery = trpc.ai.getStudyStats.useQuery(
    { cookieId },
    { enabled: !!cookieId && isLoaded }
  );

  const progressQuery = trpc.ai.getUserProgress.useQuery(
    { cookieId },
    { enabled: !!cookieId && isLoaded }
  );

  const stats = statsQuery.data;
  const progress = progressQuery.data;

  const totalHours = stats ? Math.floor(stats.totalTimeSeconds / 3600) : 0;
  const totalMinutes = stats ? Math.floor((stats.totalTimeSeconds % 3600) / 60) : 0;
  const lessonsCompleted = stats?.lessonsCompleted || 0;
  const streak = stats?.streak || 0;

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const StatCard = ({ icon: Icon, label, value, unit, color }: any) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-6 border border-white/8"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-sm text-muted-foreground mb-1">{label}</div>
          <div className={`text-3xl font-bold ${color}`}>
            {value}
            <span className="text-lg text-muted-foreground ml-1">{unit}</span>
          </div>
        </div>
        <Icon size={24} className={color} />
      </div>
    </motion.div>
  );

  if (!isLoaded) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[oklch(0.75_0.18_55)]" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-4xl font-bold text-foreground mb-2">Your Learning Journey</h1>
          <p className="text-muted-foreground">Track your progress and celebrate your achievements</p>
        </motion.div>

        {/* Main Stats Grid */}
        {statsQuery.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[...Array(4)].map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <StatCard
              icon={Zap}
              label="Total XP"
              value={profile?.xp || 0}
              unit="XP"
              color="text-[oklch(0.75_0.18_55)]"
            />
            <StatCard
              icon={TrendingUp}
              label="Level"
              value={profile?.level || 1}
              unit=""
              color="text-[oklch(0.65_0.22_200)]"
            />
            <StatCard
              icon={Calendar}
              label="Streak"
              value={streak}
              unit="days"
              color="text-[oklch(0.75_0.18_55)]"
            />
            <StatCard
              icon={Clock}
              label="Study Time"
              value={totalHours}
              unit={`h ${totalMinutes}m`}
              color="text-[oklch(0.65_0.22_200)]"
            />
          </div>
        )}

        {/* Lessons Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12 glass rounded-2xl p-8 border border-white/8"
        >
          <h2 className="text-2xl font-bold text-foreground mb-6">Lessons Completed</h2>
          {progressQuery.isLoading ? (
            <ListSkeleton count={3} />
          ) : progress && progress.length > 0 ? (
            <div className="space-y-3">
              {progress.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-4 rounded-lg bg-white/3 border border-white/8">
                  <div className="flex items-center gap-3">
                    <BookOpen size={20} className="text-[oklch(0.75_0.18_55)]" />
                    <div>
                      <div className="font-medium text-foreground">{item.title || `Lesson ${idx + 1}`}</div>
                      <div className="text-sm text-muted-foreground">{formatTime(item.timeSpentSeconds || 0)} spent</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-[oklch(0.75_0.18_55)]">
                    {item.completedAt ? "✓ Complete" : "In Progress"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Target size={48} className="mx-auto mb-3 opacity-50" />
              <p>No lessons started yet. Begin your learning journey!</p>
            </div>
          )}
        </motion.div>

        {/* Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-8 border border-white/8"
        >
          <h2 className="text-2xl font-bold text-foreground mb-6">Achievements</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Award, label: "First Lesson", unlocked: lessonsCompleted >= 1 },
              { icon: Zap, label: "100 XP", unlocked: (profile?.xp || 0) >= 100 },
              { icon: Calendar, label: "7-Day Streak", unlocked: streak >= 7 },
              { icon: TrendingUp, label: "Level 5", unlocked: (profile?.level || 0) >= 5 },
            ].map((achievement, idx) => {
              const Icon = achievement.icon;
              return (
                <motion.div
                  key={idx}
                  whileHover={{ scale: 1.05 }}
                  className={`p-4 rounded-lg border text-center transition-all ${
                    achievement.unlocked
                      ? "bg-[oklch(0.75_0.18_55)]/10 border-[oklch(0.75_0.18_55)] text-foreground"
                      : "bg-white/3 border-white/8 text-muted-foreground opacity-50"
                  }`}
                >
                  <Icon size={32} className="mx-auto mb-2" />
                  <div className="text-sm font-medium">{achievement.label}</div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </PageWrapper>
  );
}
