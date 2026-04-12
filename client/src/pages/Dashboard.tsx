import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Trophy, Zap, Flame, Star, Brain, BookOpen, FlaskConical,
  Target, Clock, TrendingUp, Award, BarChart3, Map, Layers,
  CheckCircle, Circle, ChevronDown, ChevronUp
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart, RadarChart,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from "recharts";
import { trpc } from "@/lib/trpc";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import PageWrapper from "@/components/PageWrapper";
import { Link } from "wouter";

// ─── XP Level thresholds ─────────────────────────────────────────────────────
const LEVEL_XP = [0, 100, 250, 500, 900, 1400, 2100, 3000, 4200, 5700, 7500];
function getLevelProgress(xp: number, level: number) {
  const current = LEVEL_XP[level - 1] ?? 0;
  const next = LEVEL_XP[level] ?? LEVEL_XP[LEVEL_XP.length - 1];
  const pct = Math.min(100, Math.round(((xp - current) / (next - current)) * 100));
  return { current, next, pct, remaining: next - xp };
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl border border-white/8 p-5"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}22`, color }}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-foreground mb-0.5">{value}</div>
      <div className="text-sm font-medium text-foreground/70">{label}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </motion.div>
  );
}

// ─── Badge Display ────────────────────────────────────────────────────────────
const BADGE_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  first_visit:    { label: "First Steps",      color: "oklch(0.72 0.18 150)", icon: <Star size={14} /> },
  explorer:       { label: "Explorer",         color: "oklch(0.65 0.22 200)", icon: <Map size={14} /> },
  researcher:     { label: "Researcher",       color: "oklch(0.75 0.2 280)",  icon: <FlaskConical size={14} /> },
  knowledge_seeker: { label: "Knowledge Seeker", color: "oklch(0.8 0.18 60)", icon: <Brain size={14} /> },
  streak_3:       { label: "3-Day Streak",     color: "oklch(0.75 0.22 30)",  icon: <Flame size={14} /> },
  streak_7:       { label: "Week Warrior",     color: "oklch(0.8 0.2 30)",    icon: <Flame size={14} /> },
  level_5:        { label: "Level 5",          color: "oklch(0.75 0.25 280)", icon: <Trophy size={14} /> },
  level_10:       { label: "Level 10",         color: "oklch(0.85 0.25 60)",  icon: <Trophy size={14} /> },
};

// ─── Activity Feed ────────────────────────────────────────────────────────────
const PAGE_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  home:       { label: "Home",           icon: <Star size={12} />,          color: "oklch(0.72 0.18 150)" },
  learn:      { label: "Learn",          icon: <BookOpen size={12} />,      color: "oklch(0.65 0.22 200)" },
  research:   { label: "Research Forge", icon: <FlaskConical size={12} />,  color: "oklch(0.75 0.2 280)" },
  depth:      { label: "Depth Engine",   icon: <Layers size={12} />,        color: "oklch(0.8 0.18 60)" },
  library:    { label: "Library",        icon: <BookOpen size={12} />,      color: "oklch(0.72 0.18 150)" },
  lab:        { label: "Lab",            icon: <FlaskConical size={12} />,  color: "oklch(0.75 0.22 30)" },
  mindmap:    { label: "Mind Map",       icon: <Map size={12} />,           color: "oklch(0.65 0.22 200)" },
  flashcards: { label: "Flashcards",     icon: <Brain size={12} />,         color: "oklch(0.75 0.2 280)" },
  testing:    { label: "Testing Center", icon: <Target size={12} />,        color: "oklch(0.8 0.18 60)" },
};

// ─── Activity Heatmap ───────────────────────────────────────────────────────
function ActivityHeatmap({ days }: { days: Array<{ date: string; count: number }> }) {
  const weeks: Array<Array<{ date: string; count: number }>> = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  const maxCount = Math.max(...days.map(d => d.count), 1);
  const getColor = (count: number) => {
    if (count === 0) return "oklch(0.15 0 0)";
    const intensity = Math.min(count / maxCount, 1);
    if (intensity < 0.25) return "oklch(0.35 0.15 200)";
    if (intensity < 0.5) return "oklch(0.5 0.2 200)";
    if (intensity < 0.75) return "oklch(0.65 0.22 200)";
    return "oklch(0.8 0.22 200)";
  };
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const dayLabels = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1 min-w-max">
        <div className="flex flex-col gap-1 mr-1">
          <div className="h-4" />
          {dayLabels.map((d, i) => (
            <div key={d} className="h-3 text-[9px] text-muted-foreground/50 flex items-center" style={{ display: i % 2 === 0 ? 'flex' : 'none' }}>{d}</div>
          ))}
        </div>
        {weeks.map((week, wi) => {
          const firstDay = week[0];
          const d = new Date(firstDay.date);
          const showMonth = d.getDate() <= 7;
          return (
            <div key={wi} className="flex flex-col gap-1">
              <div className="h-4 text-[9px] text-muted-foreground/50">
                {showMonth ? months[d.getMonth()] : ""}
              </div>
              {week.map((day) => (
                <div
                  key={day.date}
                  title={`${day.date}: ${day.count} action${day.count !== 1 ? 's' : ''}`}
                  className="w-3 h-3 rounded-sm cursor-default transition-opacity hover:opacity-80"
                  style={{ background: getColor(day.count) }}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const { cookieId, profile: localProfile } = usePersonalization();
  const xp = localProfile.xp;
  const level = localProfile.level;
  const streak = localProfile.streak;

  const profileQuery = trpc.visitor.getProfile.useQuery(
    { cookieId: cookieId ?? "" },
    { enabled: !!cookieId }
  );

  const researchQuery = trpc.research.getSessions.useQuery(
    { cookieId: cookieId ?? "" },
    { enabled: !!cookieId }
  );

  const flashcardDecksQuery = trpc.flashcards.getDecks.useQuery(
    { cookieId: cookieId ?? "" },
    { enabled: !!cookieId }
  );

  const testResultsQuery = trpc.testing.getResults.useQuery(
    { cookieId: cookieId ?? "" },
    { enabled: !!cookieId }
  );

  const scoreHistoryQuery = trpc.testing.getScoreHistory.useQuery(
    { cookieId: cookieId ?? "" },
    { enabled: !!cookieId }
  );

  const activityQuery = trpc.dashboard.getActivity.useQuery(
    { cookieId: cookieId ?? "" },
    { enabled: !!cookieId }
  );

  const insightQuery = trpc.dashboard.getInsight.useQuery(
    { cookieId: cookieId ?? "" },
    { enabled: !!cookieId }
  );

  const profile = profileQuery.data;
  const levelProgress = useMemo(() => getLevelProgress(xp, level), [xp, level]);

  const badges = (profile?.badges as string[] | null) ?? [];
  const pagesVisited = (profile?.pagesVisited as string[] | null) ?? [];
  const preferredTopics = (profile?.preferredTopics as string[] | null) ?? [];
  const researchSessions = researchQuery.data ?? [];
  const flashcardDecks = flashcardDecksQuery.data ?? [];
  const testResults = testResultsQuery.data?.testResults ?? [];
  const iqResults = testResultsQuery.data?.iqResults ?? [];

  const latestIQ = iqResults[0];
  const avgTestScore = testResults.length > 0
    ? Math.round(testResults.reduce((acc, r) => acc + (r.score / r.totalQuestions) * 100, 0) / testResults.length)
    : null;

  const scoreHistory = scoreHistoryQuery.data;
  const subjectHistory = scoreHistory?.subjects ?? {};
  const iqHistory = scoreHistory?.iqHistory ?? [];

  const activityDays = activityQuery.data?.days ?? [];
  const totalActions = activityQuery.data?.totalActions ?? 0;
  const avgPerDay = activityQuery.data?.avgPerDay ?? 0;
  const insight = insightQuery.data?.insight ?? null;

  // Subject display metadata
  const SUBJECT_META: Record<string, { label: string; color: string }> = {
    iq:       { label: "IQ Assessment",   color: "oklch(0.8 0.18 60)" },
    ai:       { label: "AI Knowledge",    color: "oklch(0.65 0.22 200)" },
    science:  { label: "Science",         color: "oklch(0.72 0.18 150)" },
    history:  { label: "World History",   color: "oklch(0.75 0.18 40)" },
    math:     { label: "Mathematics",     color: "oklch(0.7 0.2 0)" },
    logic:    { label: "Logic & Reasoning", color: "oklch(0.75 0.18 60)" },
  };

  // Subjects with at least 2 attempts (enough to show a trend)
  const subjectsWithTrend = Object.entries(subjectHistory).filter(([, attempts]) => attempts.length >= 1);
  const hasAnyHistory = subjectsWithTrend.length > 0 || iqHistory.length > 0;

  // Build combined overview data: latest score per subject for radar chart
  const radarData = Object.entries(subjectHistory)
    .filter(([id]) => id !== "iq")
    .map(([id, attempts]) => ({
      subject: SUBJECT_META[id]?.label ?? id,
      score: attempts[attempts.length - 1]?.pct ?? 0,
      fullMark: 100,
    }));
  const hasRadar = radarData.length >= 3;

  return (
    <PageWrapper pageName="dashboard">
      <div className="min-h-screen pt-24 pb-20 px-4">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-white/10 text-sm text-muted-foreground mb-4">
              <BarChart3 size={14} /> <span>Your Learning Journey</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">
              My <span className="gradient-text">Progress</span>
            </h1>
            <p className="text-lg text-muted-foreground">
              Track your learning milestones, test scores, and knowledge growth across the Nexus platform.
            </p>
          </motion.div>

          {/* XP & Level Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass rounded-2xl border border-white/10 p-6 mb-8"
          >
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              {/* Level Badge */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[oklch(0.65_0.22_200_/_0.3)] to-[oklch(0.75_0.2_280_/_0.3)] border border-[oklch(0.65_0.22_200_/_0.3)] flex items-center justify-center">
                  <span className="text-2xl font-black text-foreground">{level}</span>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Current Level</div>
                  <div className="text-xl font-bold text-foreground">{xp.toLocaleString()} XP</div>
                  <div className="text-sm text-muted-foreground">{levelProgress.remaining} XP to Level {level + 1}</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>Level {level}</span>
                  <span>{levelProgress.pct}%</span>
                  <span>Level {level + 1}</span>
                </div>
                <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[oklch(0.65_0.22_200)] to-[oklch(0.75_0.2_280)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${levelProgress.pct}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Streak */}
              <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-[oklch(0.75_0.22_30_/_0.1)] border border-[oklch(0.75_0.22_30_/_0.2)]">
                <Flame size={20} className="text-[oklch(0.8_0.22_30)]" />
                <div>
                  <div className="text-xl font-bold text-foreground">{streak}</div>
                  <div className="text-xs text-muted-foreground">Day Streak</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard
              icon={<FlaskConical size={18} />}
              label="Research Sessions"
              value={researchSessions.length}
              sub="Documents analyzed"
              color="oklch(0.75 0.2 280)"
            />
            <StatCard
              icon={<Brain size={18} />}
              label="Flashcard Decks"
              value={flashcardDecks.length}
              sub="Active decks"
              color="oklch(0.65 0.22 200)"
            />
            <StatCard
              icon={<Target size={18} />}
              label="Tests Taken"
              value={testResults.length}
              sub={avgTestScore !== null ? `Avg score: ${avgTestScore}%` : "No tests yet"}
              color="oklch(0.8 0.18 60)"
            />
            <StatCard
              icon={<BookOpen size={18} />}
              label="Pages Explored"
              value={pagesVisited.length}
              sub={`${profile?.visitCount ?? 0} total visits`}
              color="oklch(0.72 0.18 150)"
            />
          </div>

          {/* AI Insight Panel */}
          {insight && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="glass rounded-2xl border border-[oklch(0.65_0.22_200_/_0.3)] p-6 mb-8 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.65_0.22_200_/_0.05)] to-transparent pointer-events-none" />
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[oklch(0.65_0.22_200_/_0.15)] border border-[oklch(0.65_0.22_200_/_0.3)] flex items-center justify-center shrink-0">
                  <Brain size={18} className="text-[oklch(0.65_0.22_200)]" />
                </div>
                <div>
                  <div className="text-xs text-[oklch(0.65_0.22_200)] font-semibold uppercase tracking-wider mb-1">AI Learning Insight</div>
                  <p className="text-sm text-foreground/85 leading-relaxed">
                    {insight.split(/\*\*(.*?)\*\*/g).map((part, i) =>
                      i % 2 === 1 ? <strong key={i} className="text-foreground font-semibold">{part}</strong> : part
                    )}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Activity Heatmap */}
          {activityDays.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.09 }}
              className="glass rounded-2xl border border-white/8 p-6 mb-8"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-[oklch(0.65_0.22_200)]" />
                  <h2 className="text-lg font-bold text-foreground">Activity</h2>
                  <span className="text-xs text-muted-foreground ml-1">Last 12 weeks</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span><strong className="text-foreground">{totalActions}</strong> total actions</span>
                  <span><strong className="text-foreground">{avgPerDay}</strong>/day avg</span>
                </div>
              </div>
              <ActivityHeatmap days={activityDays} />
              <div className="flex items-center gap-2 mt-3 text-[10px] text-muted-foreground/50">
                <span>Less</span>
                {["oklch(0.15 0 0)","oklch(0.35 0.15 200)","oklch(0.5 0.2 200)","oklch(0.65 0.22 200)","oklch(0.8 0.22 200)"].map((c, i) => (
                  <div key={i} className="w-3 h-3 rounded-sm" style={{ background: c }} />
                ))}
                <span>More</span>
              </div>
            </motion.div>
          )}

          {/* Score Trends Section */}
          {hasAnyHistory && (
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-8"
            >
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp size={16} className="text-[oklch(0.65_0.22_200)]" />
                <h2 className="text-lg font-bold text-foreground">Score Trends</h2>
                <span className="text-xs text-muted-foreground ml-1">Track your improvement over time</span>
              </div>

              {/* Radar overview + IQ trend */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

                {/* Knowledge Radar */}
                {hasRadar && (
                  <div className="glass rounded-2xl border border-white/8 p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-1">Knowledge Profile</h3>
                    <p className="text-xs text-muted-foreground mb-4">Latest score per subject</p>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                          <PolarGrid stroke="oklch(0.3 0 0)" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: "oklch(0.6 0 0)", fontSize: 11 }} />
                          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "oklch(0.5 0 0)", fontSize: 9 }} tickCount={4} />
                          <Radar name="Score" dataKey="score" stroke="oklch(0.65 0.22 200)" fill="oklch(0.65 0.22 200)" fillOpacity={0.25} strokeWidth={2} />
                          <Tooltip
                            contentStyle={{ background: "oklch(0.12 0 0)", border: "1px solid oklch(0.25 0 0)", borderRadius: "8px", fontSize: "12px", color: "oklch(0.9 0 0)" }}
                            formatter={(v: number) => [`${v}%`, "Score"]}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* IQ Trend */}
                {iqHistory.length > 0 && (
                  <div className="glass rounded-2xl border border-white/8 p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-1">IQ Score Trend</h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      {iqHistory.length === 1 ? "First attempt — take more to see trend" : `${iqHistory.length} attempts`}
                    </p>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={iqHistory.map(r => ({ attempt: `#${r.attempt}`, iq: r.iqScore, pct: r.percentile }))}
                          margin={{ top: 10, right: 10, bottom: 0, left: -10 }}
                        >
                          <defs>
                            <linearGradient id="iqGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="oklch(0.8 0.18 60)" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="oklch(0.8 0.18 60)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.2 0 0)" />
                          <XAxis dataKey="attempt" tick={{ fill: "oklch(0.6 0 0)", fontSize: 11 }} />
                          <YAxis domain={[70, 145]} tick={{ fill: "oklch(0.6 0 0)", fontSize: 11 }} />
                          <ReferenceLine y={100} stroke="oklch(0.5 0 0)" strokeDasharray="4 4"
                            label={{ value: "Avg (100)", fill: "oklch(0.5 0 0)", fontSize: 10, position: "insideTopRight" }}
                          />
                          <Tooltip
                            contentStyle={{ background: "oklch(0.12 0 0)", border: "1px solid oklch(0.25 0 0)", borderRadius: "8px", fontSize: "12px", color: "oklch(0.9 0 0)" }}
                            formatter={(v: number, name: string) => [
                              name === "iq" ? `IQ ${v}` : `${v}th pct`,
                              name === "iq" ? "IQ Score" : "Percentile"
                            ]}
                          />
                          <Area type="monotone" dataKey="iq" stroke="oklch(0.8 0.18 60)" strokeWidth={2.5}
                            fill="url(#iqGrad)" dot={{ fill: "oklch(0.8 0.18 60)", r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>

              {/* Overall Progress Chart — all subjects on one multi-line chart */}
              {subjectsWithTrend.length >= 2 && (() => {
                // Build a unified timeline: collect all unique attempt labels across subjects
                const maxAttempts = Math.max(...subjectsWithTrend.map(([, a]) => a.length));
                const overallData = Array.from({ length: maxAttempts }, (_, i) => {
                  const point: Record<string, string | number> = { attempt: `#${i + 1}` };
                  for (const [sid, attempts] of subjectsWithTrend) {
                    if (attempts[i]) point[sid] = attempts[i].pct;
                  }
                  return point;
                });
                return (
                  <div className="glass rounded-2xl border border-white/8 p-5 mb-6">
                    <h3 className="text-sm font-semibold text-foreground mb-1">Overall Progress</h3>
                    <p className="text-xs text-muted-foreground mb-4">All subjects compared across attempts</p>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={overallData} margin={{ top: 10, right: 20, bottom: 0, left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.18 0 0)" />
                          <XAxis dataKey="attempt" tick={{ fill: "oklch(0.6 0 0)", fontSize: 11 }} />
                          <YAxis domain={[0, 100]} tick={{ fill: "oklch(0.6 0 0)", fontSize: 11 }} tickCount={6} />
                          <ReferenceLine y={70} stroke="oklch(0.35 0 0)" strokeDasharray="3 3"
                            label={{ value: "Pass (70%)", fill: "oklch(0.4 0 0)", fontSize: 10, position: "insideTopRight" }}
                          />
                          <Tooltip
                            contentStyle={{ background: "oklch(0.12 0 0)", border: "1px solid oklch(0.25 0 0)", borderRadius: "8px", fontSize: "11px", color: "oklch(0.9 0 0)" }}
                            formatter={(v: number, name: string) => [
                              `${v}%`,
                              (SUBJECT_META[name] ?? { label: name }).label
                            ]}
                          />
                          <Legend
                            formatter={(value) => (SUBJECT_META[value] ?? { label: value }).label}
                            wrapperStyle={{ fontSize: "11px", color: "oklch(0.65 0 0)", paddingTop: "8px" }}
                          />
                          {subjectsWithTrend.map(([sid]) => {
                            const meta = SUBJECT_META[sid] ?? { label: sid, color: "oklch(0.65 0.22 200)" };
                            return (
                              <Line
                                key={sid}
                                type="monotone"
                                dataKey={sid}
                                name={sid}
                                stroke={meta.color}
                                strokeWidth={2}
                                dot={{ fill: meta.color, r: 3, strokeWidth: 0 }}
                                activeDot={{ r: 5 }}
                                connectNulls
                              />
                            );
                          })}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })()}

              {/* Per-subject line charts */}
              {subjectsWithTrend.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {subjectsWithTrend.map(([subjectId, attempts]) => {
                    const meta = SUBJECT_META[subjectId] ?? { label: subjectId, color: "oklch(0.65 0.22 200)" };
                    const chartData = attempts.map(a => ({
                      attempt: `#${a.attempt}`,
                      score: a.pct,
                      date: new Date(a.completedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
                    }));
                    const first = attempts[0]?.pct ?? 0;
                    const last = attempts[attempts.length - 1]?.pct ?? 0;
                    const delta = last - first;
                    const best = Math.max(...attempts.map(a => a.pct));
                    return (
                      <motion.div
                        key={subjectId}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass rounded-2xl border border-white/8 p-5"
                      >
                        <div className="flex items-start justify-between mb-1">
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">{meta.label}</h3>
                            <p className="text-xs text-muted-foreground">{attempts.length} attempt{attempts.length !== 1 ? "s" : ""}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-black" style={{ color: meta.color }}>{last}%</div>
                            {attempts.length > 1 && (
                              <div className={`text-xs font-medium flex items-center gap-0.5 justify-end ${delta >= 0 ? "text-green-400" : "text-red-400"}`}>
                                {delta >= 0 ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                                {Math.abs(delta)}pp
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                          <span>Best: <span className="text-foreground font-medium">{best}%</span></span>
                          {attempts.length > 1 && (
                            <span>Trend: <span className={`font-medium ${delta > 5 ? "text-green-400" : delta < -5 ? "text-red-400" : "text-yellow-400"}`}>
                              {delta > 5 ? "Improving" : delta < -5 ? "Declining" : "Stable"}
                            </span></span>
                          )}
                        </div>
                        <div className="h-36">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
                              <defs>
                                <linearGradient id={`grad-${subjectId}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={meta.color} stopOpacity={0.3} />
                                  <stop offset="95%" stopColor={meta.color} stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.18 0 0)" />
                              <XAxis dataKey="attempt" tick={{ fill: "oklch(0.55 0 0)", fontSize: 10 }} />
                              <YAxis domain={[0, 100]} tick={{ fill: "oklch(0.55 0 0)", fontSize: 10 }} tickCount={5} />
                              <ReferenceLine y={70} stroke="oklch(0.4 0 0)" strokeDasharray="3 3" />
                              <Tooltip
                                contentStyle={{ background: "oklch(0.12 0 0)", border: "1px solid oklch(0.25 0 0)", borderRadius: "8px", fontSize: "11px", color: "oklch(0.9 0 0)" }}
                                formatter={(v: number) => [`${v}%`, "Score"]}
                                labelFormatter={(label, payload) => {
                                  const item = payload?.[0]?.payload as { date?: string } | undefined;
                                  return item?.date ?? label;
                                }}
                              />
                              <Area
                                type="monotone"
                                dataKey="score"
                                stroke={meta.color}
                                strokeWidth={2}
                                fill={`url(#grad-${subjectId})`}
                                dot={{ fill: meta.color, r: 3, strokeWidth: 0 }}
                                activeDot={{ r: 5 }}
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left: Test Results + IQ */}
            <div className="lg:col-span-2 space-y-6">

              {/* IQ Result */}
              {latestIQ && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-2xl border border-[oklch(0.8_0.18_60_/_0.3)] p-6"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[oklch(0.8_0.18_60_/_0.15)] flex items-center justify-center">
                      <Brain size={18} className="text-[oklch(0.8_0.18_60)]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">IQ Assessment Result</h3>
                      <p className="text-xs text-muted-foreground">{new Date(latestIQ.completedAt).toLocaleDateString()}</p>
                    </div>
                    <div className="ml-auto text-right">
                      <div className="text-3xl font-black text-[oklch(0.8_0.18_60)]">{latestIQ.iqScore}</div>
                      <div className="text-xs text-muted-foreground">IQ Score</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm mb-3">
                    <span className="text-muted-foreground">Percentile: <span className="text-foreground font-semibold">{latestIQ.percentile}th</span></span>
                    <span className="text-muted-foreground">Raw Score: <span className="text-foreground font-semibold">{latestIQ.rawScore}</span></span>
                    {latestIQ.timeTakenSeconds && (
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Clock size={12} /> {Math.round(latestIQ.timeTakenSeconds / 60)}m
                      </span>
                    )}
                  </div>
                  {latestIQ.categoryScores && Object.keys(latestIQ.categoryScores as Record<string, number>).length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Category Breakdown</p>
                      {Object.entries(latestIQ.categoryScores as Record<string, number>).map(([cat, pct]) => (
                        <div key={cat} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-36 truncate">{cat}</span>
                          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-[oklch(0.8_0.18_60)] rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-foreground font-medium w-8 text-right">{pct}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Subject Test History */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl border border-white/8 p-6"
              >
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <Target size={16} className="text-[oklch(0.65_0.22_200)]" />
                  Assessment History
                </h3>
                {testResults.length === 0 ? (
                  <div className="text-center py-8">
                    <Target size={32} className="text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-3">No assessments taken yet.</p>
                    <Link href="/testing" className="text-sm text-[oklch(0.65_0.22_200)] hover:underline">
                      Visit the Testing Center →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {testResults.slice(0, 8).map((result, i) => {
                      const pct = Math.round((result.score / result.totalQuestions) * 100);
                      const color = pct >= 80 ? "oklch(0.72 0.18 150)" : pct >= 60 ? "oklch(0.8 0.18 60)" : "oklch(0.7 0.2 30)";
                      return (
                        <motion.div
                          key={result.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="flex items-center gap-4 p-3 rounded-xl bg-white/3 border border-white/6"
                        >
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}22`, color }}>
                            {pct >= 80 ? <CheckCircle size={14} /> : <Circle size={14} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground capitalize">{result.testId.replace(/-/g, " ")}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <Clock size={10} /> {new Date(result.completedAt).toLocaleDateString()}
                              {result.timeTakenSeconds && <span>· {Math.round(result.timeTakenSeconds / 60)}m</span>}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-bold" style={{ color }}>{pct}%</div>
                            <div className="text-xs text-muted-foreground">{result.score}/{result.totalQuestions}</div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </motion.div>

              {/* Research Sessions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl border border-white/8 p-6"
              >
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <FlaskConical size={16} className="text-[oklch(0.75_0.2_280)]" />
                  Recent Research Sessions
                </h3>
                {researchSessions.length === 0 ? (
                  <div className="text-center py-8">
                    <FlaskConical size={32} className="text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-3">No research sessions yet.</p>
                    <Link href="/research" className="text-sm text-[oklch(0.75_0.2_280)] hover:underline">
                      Try the Research Forge →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {researchSessions.slice(0, 5).map((session, i) => (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-start gap-3 p-3 rounded-xl bg-white/3 border border-white/6"
                      >
                        <div className="w-8 h-8 rounded-lg bg-[oklch(0.75_0.2_280_/_0.15)] flex items-center justify-center shrink-0 mt-0.5">
                          <FlaskConical size={14} className="text-[oklch(0.75_0.2_280)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{session.title}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                            <Clock size={10} /> {new Date(session.createdAt).toLocaleDateString()}
                            {(session.keyInsights as string[])?.length > 0 && (
                              <span>· {(session.keyInsights as string[]).length} insights</span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>

            {/* Right: Badges + Topics + Pages */}
            <div className="space-y-6">

              {/* Badges */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl border border-white/8 p-6"
              >
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <Award size={16} className="text-[oklch(0.8_0.18_60)]" />
                  Badges Earned
                </h3>
                {badges.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Keep exploring to earn badges!</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {badges.map((badge) => {
                      const meta = BADGE_META[badge] ?? { label: badge, color: "oklch(0.65 0.22 200)", icon: <Star size={12} /> };
                      return (
                        <div
                          key={badge}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                          style={{ background: `${meta.color}22`, color: meta.color, border: `1px solid ${meta.color}44` }}
                        >
                          {meta.icon}
                          {meta.label}
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>

              {/* Topics of Interest */}
              {preferredTopics.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-2xl border border-white/8 p-6"
                >
                  <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                    <TrendingUp size={16} className="text-[oklch(0.72 0.18 150)]" />
                    Your Interests
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {preferredTopics.map((topic) => (
                      <span
                        key={topic}
                        className="px-3 py-1.5 rounded-full text-xs font-medium bg-[oklch(0.72_0.18_150_/_0.12)] border border-[oklch(0.72_0.18_150_/_0.25)] text-[oklch(0.82_0.18_150)]"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Pages Explored */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl border border-white/8 p-6"
              >
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <Map size={16} className="text-[oklch(0.65_0.22_200)]" />
                  Platform Explored
                </h3>
                <div className="space-y-2">
                  {Object.entries(PAGE_LABELS).map(([page, meta]) => {
                    const visited = pagesVisited.includes(page);
                    return (
                      <div key={page} className="flex items-center gap-3">
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                          style={visited
                            ? { background: `${meta.color}22`, color: meta.color }
                            : { background: "oklch(0.2 0 0)", color: "oklch(0.4 0 0)" }
                          }
                        >
                          {meta.icon}
                        </div>
                        <span className={`text-sm ${visited ? "text-foreground" : "text-muted-foreground/40"}`}>
                          {meta.label}
                        </span>
                        {visited && (
                          <CheckCircle size={12} className="ml-auto shrink-0" style={{ color: meta.color }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-2xl border border-white/8 p-6"
              >
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
                  <Zap size={16} className="text-[oklch(0.8_0.18_60)]" />
                  Continue Learning
                </h3>
                <div className="space-y-2">
                  {[
                    { to: "/testing", label: "Take an Assessment", icon: <Target size={14} />, color: "oklch(0.8 0.18 60)" },
                    { to: "/research", label: "Research Forge", icon: <FlaskConical size={14} />, color: "oklch(0.75 0.2 280)" },
                    { to: "/flashcards", label: "Review Flashcards", icon: <Brain size={14} />, color: "oklch(0.65 0.22 200)" },
                    { to: "/depth", label: "Depth Engine", icon: <Layers size={14} />, color: "oklch(0.72 0.18 150)" },
                  ].map(({ to, label, icon, color }) => (
                     <Link
                      href={to}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/3 border border-white/6 hover:border-white/15 hover:bg-white/5 transition-all group"
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}22`, color }}>
                        {icon}
                      </div>
                      <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground transition-colors">{label}</span>
                      <span className="ml-auto text-muted-foreground group-hover:text-foreground transition-colors">→</span>
                    </Link>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
