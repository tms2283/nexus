import { useState } from "react";
import { motion } from "framer-motion";
import {
  User, Mail, Calendar, LogOut, AlertCircle, Brain, Shield, Zap,
  BadgeCheck, KeyRound, UserCircle2, Activity, BookOpen, TrendingUp,
  Target, Clock, Flame, BarChart2, HeartPulse,
} from "lucide-react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid,
  Cell,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import { trpc } from "@/lib/trpc";
import PageWrapper from "@/components/PageWrapper";
import { Link } from "wouter";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProfileTab = "overview" | "mind" | "performance" | "learning" | "progress";

const TABS: { id: ProfileTab; label: string; icon: typeof Brain }[] = [
  { id: "overview", label: "Overview", icon: User },
  { id: "mind", label: "Mind", icon: Brain },
  { id: "performance", label: "Performance", icon: Activity },
  { id: "learning", label: "Learning", icon: BookOpen },
  { id: "progress", label: "Progress", icon: TrendingUp },
];

// ─── Color helpers ────────────────────────────────────────────────────────────
const PURPLE = "oklch(0.72 0.20 310)";
const GOLD = "oklch(0.75 0.18 55)";
const TEAL = "oklch(0.75 0.18 180)";
const RED = "#ef4444";
const AMBER = "#f59e0b";
const GREEN = "#22c55e";

function scoreColor(score: number) {
  if (score >= 0.7) return GREEN;
  if (score >= 0.4) return AMBER;
  return RED;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Brain; label: string; value: string | number; color: string }) {
  return (
    <div className="card-nexus p-4 text-center">
      <Icon size={20} className="mx-auto mb-2" style={{ color }} />
      <div className="text-xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-bold text-foreground">{title}</h2>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="card-nexus p-6 text-center text-muted-foreground text-sm">{message}</div>
  );
}

// ─── Burnout Gauge ────────────────────────────────────────────────────────────
function BurnoutGauge({ score, label }: { score: number; label: string }) {
  const pct = Math.round(score * 100);
  const color = score < 0.35 ? GREEN : score < 0.65 ? AMBER : RED;
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (pct / 100) * circumference * 0.75;

  return (
    <div style={{ textAlign: "center" }}>
      <svg width={120} height={80} viewBox="0 0 120 80">
        <path d="M 16 72 A 52 52 0 0 1 104 72" fill="none" stroke="var(--surface-2)" strokeWidth={10} strokeLinecap="round" />
        <path
          d="M 16 72 A 52 52 0 0 1 104 72"
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.75}`}
          strokeDashoffset={`${circumference * 0.75 * (1 - pct / 100)}`}
        />
        <text x={60} y={68} textAnchor="middle" fontSize={18} fontWeight={700} fill="currentColor">{pct}%</text>
      </svg>
      <p style={{ fontSize: 13, fontWeight: 600, color, marginTop: -8 }}>{label}</p>
    </div>
  );
}

// ─── Heatmap ─────────────────────────────────────────────────────────────────
function OptimalTimesHeatmap({ data }: { data: Array<{ hour: number; day: number; focus_probability: number }> }) {
  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const HOURS = Array.from({ length: 24 }, (_, i) => i);

  const lookup = new Map<string, number>();
  data.forEach((d) => lookup.set(`${d.day}-${d.hour}`, d.focus_probability));

  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: "36px repeat(24, 1fr)", gap: 3, minWidth: 600 }}>
        <div />
        {HOURS.map((h) => (
          <div key={h} style={{ fontSize: 9, color: "var(--muted-foreground)", textAlign: "center" }}>{h}</div>
        ))}
        {DAYS.map((day, di) => (
          <>
            <div key={day} style={{ fontSize: 10, color: "var(--muted-foreground)", display: "flex", alignItems: "center" }}>{day}</div>
            {HOURS.map((h) => {
              const val = lookup.get(`${di}-${h}`) ?? 0;
              return (
                <div
                  key={`${di}-${h}`}
                  title={`${day} ${h}:00 — ${Math.round(val * 100)}% focus`}
                  style={{
                    height: 14, borderRadius: 2,
                    background: val > 0 ? `oklch(0.72 0.20 310 / ${0.15 + val * 0.85})` : "var(--surface-2)",
                  }}
                />
              );
            })}
          </>
        ))}
      </div>
      <p style={{ fontSize: 10, color: "var(--muted-foreground)", marginTop: 8 }}>Darker = higher predicted focus probability · Hours 0–23</p>
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function OverviewTab({ user, profile, psychProfile, traitsData, burnout, assessmentHistory }: {
  user: ReturnType<typeof useAuth>["user"];
  profile: ReturnType<typeof usePersonalization>["profile"];
  psychProfile: Record<string, unknown> | null;
  traitsData: Array<{ trait: string; value: number }> | null;
  burnout: { score: number; label: string } | null;
  assessmentHistory: Array<{ instrumentId: string; severity?: string; createdAt: string }> | null;
}) {
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "Recently";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Identity card */}
      <div className="card-nexus p-5 flex items-center gap-5">
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "oklch(0.75 0.18 55 / 0.15)", border: "2px solid oklch(0.75 0.18 55 / 0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {user?.avatarUrl
            ? <img src={user.avatarUrl} alt="" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }} />
            : <User size={24} style={{ color: GOLD }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: 17 }}>{user?.name ?? "Anonymous"}</p>
          <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{user?.email ?? "Not provided"}</p>
          <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 3 }}>Member since {memberSince}</p>
        </div>
        {psychProfile && (
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <p style={{ fontSize: 10, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Learn style</p>
            <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 20, background: "oklch(0.72 0.20 310 / 0.15)", color: PURPLE, fontWeight: 600 }}>
              {String(psychProfile.inferredLearnStyle ?? "—").replace(/-/g, " ")}
            </span>
          </div>
        )}
      </div>

      {/* Key metrics row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
        <StatCard icon={Zap} label="XP Earned" value={profile.xp.toLocaleString()} color={GOLD} />
        <StatCard icon={Brain} label="Level" value={profile.level} color={PURPLE} />
        <StatCard icon={Flame} label="Streak" value={`${profile.streak}d`} color={TEAL} />
        {assessmentHistory && <StatCard icon={HeartPulse} label="Assessments" value={assessmentHistory.length} color="#22c55e" />}
      </div>

      {/* Traits snapshot */}
      {traitsData && traitsData.length > 0 && (
        <div className="card-nexus p-5">
          <SectionHeader title="Behavioral Traits" subtitle="Derived from your activity patterns" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
            {traitsData.map(({ trait, value }) => (
              <div key={trait} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{trait}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: scoreColor(value) }}>{Math.round(value * 100)}%</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "var(--surface-2)" }}>
                  <div style={{ height: "100%", width: `${value * 100}%`, borderRadius: 3, background: scoreColor(value), transition: "width 0.6s ease" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Burnout quick-view */}
      {burnout && (
        <div className="card-nexus p-5 flex items-center gap-6">
          <BurnoutGauge score={burnout.score} label={burnout.label} />
          <div>
            <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Burnout Risk</p>
            <p style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.5 }}>
              {burnout.score < 0.35
                ? "You're in good shape. Keep your current pace and rest when needed."
                : burnout.score < 0.65
                ? "Moderate risk detected. Consider shorter sessions and more recovery time."
                : "High risk. Prioritize rest, reduce session length, and take breaks."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function MindTab({ psychProfile, traitsData }: {
  psychProfile: Record<string, unknown> | null;
  traitsData: Array<{ trait: string; value: number }> | null;
}) {
  const radarData = traitsData?.map(({ trait, value }) => ({ trait, value: Math.round(value * 100) })) ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Psych profile */}
      {psychProfile ? (
        <>
          <div className="card-nexus p-5">
            <SectionHeader title="Your Psychological Profile" subtitle="Based on your onboarding quiz and behavioral signals" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {[
                { label: "Background", value: String(psychProfile.inferredBackground ?? "—") },
                { label: "Primary Goal", value: String(psychProfile.inferredGoal ?? "—") },
                { label: "Learning Style", value: String(psychProfile.inferredLearnStyle ?? "—").replace(/-/g, " ") },
              ].map(({ label, value }) => (
                <div key={label} style={{ padding: "14px 16px", borderRadius: 12, background: "var(--surface-2)", border: "1px solid var(--border)" }}>
                  <p style={{ fontSize: 10, color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{label}</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "var(--foreground)", textTransform: "capitalize" }}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Interests */}
          {Array.isArray(psychProfile.inferredInterests) && (psychProfile.inferredInterests as string[]).length > 0 && (
            <div className="card-nexus p-5">
              <SectionHeader title="Inferred Interests" subtitle="Detected from your learning behavior" />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {(psychProfile.inferredInterests as string[]).map((interest) => (
                  <span key={interest} style={{ padding: "4px 12px", borderRadius: 20, background: "oklch(0.72 0.20 310 / 0.12)", color: PURPLE, fontSize: 12, fontWeight: 500 }}>{interest}</span>
                ))}
              </div>
            </div>
          )}

          {/* Quiz answers */}
          {psychProfile.quizAnswers && Object.keys(psychProfile.quizAnswers as Record<string, string>).length > 0 && (
            <div className="card-nexus p-5">
              <SectionHeader title="Your Quiz Responses" subtitle={`${Object.keys(psychProfile.quizAnswers as Record<string, string>).length} questions answered`} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
                {Object.entries(psychProfile.quizAnswers as Record<string, string>).map(([qId, answer]) => (
                  <div key={qId} style={{ padding: "10px 12px", borderRadius: 10, background: "var(--surface-2)", textAlign: "center" }}>
                    <p style={{ fontSize: 10, color: "var(--muted-foreground)", marginBottom: 4 }}>{qId.toUpperCase()}</p>
                    <p style={{ fontSize: 18, fontWeight: 900, color: PURPLE }}>{answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <EmptyState message="Complete your onboarding quiz to unlock your psychological profile." />
      )}

      {/* Behavioral traits radar */}
      {radarData.length > 0 && (
        <div className="card-nexus p-5">
          <SectionHeader title="Behavioral Trait Radar" subtitle="6 cognitive-behavioral dimensions (0–100)" />
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="trait" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <Radar name="You" dataKey="value" stroke={PURPLE} fill={PURPLE} fillOpacity={0.25} strokeWidth={2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function PerformanceTab({ assessmentHistory, cogHistory }: {
  assessmentHistory: Array<{ instrumentId: string; severity?: string; totalScore?: number; createdAt: string }> | null;
  cogHistory: Array<{ exerciseId: string; accuracyPct: number; createdAt: string }> | null;
}) {
  const assessmentBarData = assessmentHistory
    ? Object.entries(
        assessmentHistory.reduce<Record<string, number[]>>((acc, r) => {
          if (r.totalScore !== undefined) {
            acc[r.instrumentId] = [...(acc[r.instrumentId] ?? []), r.totalScore];
          }
          return acc;
        }, {})
      ).map(([name, scores]) => ({ name: name.toUpperCase(), avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) }))
    : [];

  const cogBarData = cogHistory
    ? Object.entries(
        cogHistory.reduce<Record<string, number[]>>((acc, r) => {
          acc[r.exerciseId] = [...(acc[r.exerciseId] ?? []), r.accuracyPct];
          return acc;
        }, {})
      ).map(([name, scores]) => ({ name, avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) }))
    : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Assessment scores */}
      <div className="card-nexus p-5">
        <SectionHeader title="Psychological Assessments" subtitle="Average scores per instrument" />
        {assessmentBarData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={assessmentBarData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <Tooltip contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                {assessmentBarData.map((_, i) => <Cell key={i} fill={PURPLE} fillOpacity={0.8} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyState message="No assessments completed yet. Head to the Assessments tab to begin." />}
      </div>

      {/* Recent assessments list */}
      {assessmentHistory && assessmentHistory.length > 0 && (
        <div className="card-nexus p-5">
          <SectionHeader title="Recent Assessments" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {assessmentHistory.slice(0, 10).map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10, background: "var(--surface-2)" }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600 }}>{r.instrumentId.toUpperCase()}</p>
                  <p style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  {r.severity && <span style={{ fontSize: 12, padding: "2px 10px", borderRadius: 20, background: "oklch(0.72 0.20 310 / 0.12)", color: PURPLE }}>{r.severity}</span>}
                  {r.totalScore !== undefined && <p style={{ fontSize: 12, color: "var(--muted-foreground)", marginTop: 2 }}>Score: {r.totalScore}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cognitive training accuracy */}
      <div className="card-nexus p-5">
        <SectionHeader title="Cognitive Training — Average Accuracy" subtitle="Per exercise, all sessions" />
        {cogBarData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={cogBarData} margin={{ top: 4, right: 16, bottom: 30, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} angle={-30} textAnchor="end" />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => `${v}%`} />
              <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                {cogBarData.map((d, i) => <Cell key={i} fill={d.avg >= 70 ? GREEN : d.avg >= 50 ? AMBER : RED} fillOpacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyState message="No cognitive training sessions yet. Visit the Cognitive Training tab to begin." />}
      </div>
    </div>
  );
}

function LearningTab({ interests, struggles, optimalTimes, recommendations }: {
  interests: Array<{ topic: string; confidence: number; trend?: string }> | null;
  struggles: Array<{ topic: string; frequency: number }> | null;
  optimalTimes: Array<{ hour: number; day: number; focus_probability: number }> | null;
  recommendations: string[] | null;
}) {
  const interestBarData = interests?.slice(0, 10).map((i) => ({
    name: i.topic,
    value: Math.round(i.confidence * 100),
  })) ?? [];

  const struggleBarData = struggles?.slice(0, 10).map((s) => ({
    name: s.topic,
    value: s.frequency,
  })) ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Optimal study times */}
      <div className="card-nexus p-5">
        <SectionHeader title="Optimal Study Times" subtitle="Purple = high predicted focus · Based on your session history" />
        {optimalTimes && optimalTimes.length > 0
          ? <OptimalTimesHeatmap data={optimalTimes} />
          : <EmptyState message="Not enough session data yet. Keep studying and this heatmap will fill in." />}
      </div>

      {/* Interests */}
      <div className="card-nexus p-5">
        <SectionHeader title="Your Interest Map" subtitle="Topics you engage with most, by confidence" />
        {interestBarData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart layout="vertical" data={interestBarData} margin={{ top: 0, right: 16, bottom: 0, left: 80 }}>
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={80} />
              <Tooltip contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => `${v}%`} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {interestBarData.map((_, i) => <Cell key={i} fill={PURPLE} fillOpacity={0.7 + (i / interestBarData.length) * 0.3} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyState message="Interest map builds up as you explore content. Check back after a few sessions." />}
      </div>

      {/* Struggle areas */}
      {struggleBarData.length > 0 && (
        <div className="card-nexus p-5">
          <SectionHeader title="Struggle Areas" subtitle="Topics where you've needed more time or retries" />
          <ResponsiveContainer width="100%" height={180}>
            <BarChart layout="vertical" data={struggleBarData} margin={{ top: 0, right: 16, bottom: 0, left: 80 }}>
              <XAxis type="number" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} width={80} />
              <Tooltip contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="value" fill={AMBER} fillOpacity={0.8} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div className="card-nexus p-5">
          <SectionHeader title="AI Recommendations" subtitle="Personalized based on your patterns" />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recommendations.map((r, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "10px 14px", borderRadius: 10, background: "var(--surface-2)", alignItems: "flex-start" }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>💡</span>
                <p style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.5 }}>{r}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProgressTab({ profile, badges }: {
  profile: ReturnType<typeof usePersonalization>["profile"];
  badges: string[];
}) {
  const levelPct = ((profile.xp % 1000) / 1000) * 100;
  const xpToNext = 1000 - (profile.xp % 1000);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* XP / Level card */}
      <div className="card-nexus p-6">
        <SectionHeader title="Experience & Level" subtitle="Your Nexus progression" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
          <StatCard icon={Zap} label="Total XP" value={profile.xp.toLocaleString()} color={GOLD} />
          <StatCard icon={Brain} label="Level" value={profile.level} color={PURPLE} />
          <StatCard icon={Flame} label="Streak" value={`${profile.streak}d`} color={TEAL} />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>Level {profile.level}</span>
            <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{xpToNext} XP to Level {profile.level + 1}</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: "var(--surface-2)" }}>
            <div style={{ height: "100%", width: `${levelPct}%`, borderRadius: 4, background: GOLD, transition: "width 0.6s ease" }} />
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="card-nexus p-5">
        <SectionHeader title="Badges Earned" subtitle={`${badges.length} badge${badges.length !== 1 ? "s" : ""} collected`} />
        {badges.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {badges.map((badge) => (
              <div key={badge} style={{ padding: "8px 14px", borderRadius: 20, background: "oklch(0.75 0.18 55 / 0.12)", border: "1px solid oklch(0.75 0.18 55 / 0.25)", fontSize: 13, color: GOLD, fontWeight: 600 }}>
                🏅 {badge}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="No badges yet — keep learning and engaging to earn them!" />
        )}
      </div>

      {/* How to earn XP */}
      <div className="card-nexus p-5">
        <SectionHeader title="How to Earn XP" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
          {[
            { action: "Complete a lesson", xp: "+25 XP" },
            { action: "Pass a quiz", xp: "+50 XP" },
            { action: "Daily streak", xp: "+10 XP" },
            { action: "Complete onboarding", xp: "+50 XP" },
            { action: "Use AI assistant", xp: "+5 XP" },
            { action: "Clarity assessment", xp: "+30 XP" },
          ].map(({ action, xp }) => (
            <div key={action} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", borderRadius: 10, background: "var(--surface-2)" }}>
              <span style={{ fontSize: 12, color: "var(--muted-foreground)" }}>{action}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: GOLD }}>{xp}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const { profile } = usePersonalization();
  const [tab, setTab] = useState<ProfileTab>("overview");

  // Server queries
  const psychProfileQ = trpc.auth.getMyPsychProfile.useQuery(undefined, { enabled: isAuthenticated });
  const traitsQ = trpc.behavioral.getTraits.useQuery(undefined, { retry: false });
  const burnoutQ = trpc.behavioral.getBurnoutRisk.useQuery(undefined, { retry: false });
  const optimalQ = trpc.behavioral.getOptimalTimes.useQuery(undefined, { retry: false });
  const interestsQ = trpc.behavioral.getInterests.useQuery(undefined, { retry: false });
  const strugglesQ = trpc.behavioral.getStruggles.useQuery(undefined, { retry: false });
  const insightsQ = trpc.behavioral.getLearningInsights.useQuery(undefined, { retry: false });
  const assessHistQ = trpc.clarity.getAssessmentHistory.useQuery({ cookieId: profile.cookieId, limit: 50 }, { enabled: !!profile.cookieId });
  const cogHistQ = trpc.clarity.getCogTrainingHistory.useQuery({ cookieId: profile.cookieId, limit: 100 }, { enabled: !!profile.cookieId });

  if (isLoading) {
    return (
      <PageWrapper pageName="Profile">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: GOLD }} />
        </div>
      </PageWrapper>
    );
  }

  if (!isAuthenticated) {
    return (
      <PageWrapper pageName="Profile">
        <div className="max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-nexus p-8 text-center">
            <AlertCircle size={48} className="mx-auto mb-4" style={{ color: GOLD }} />
            <h1 className="text-2xl font-bold text-foreground mb-2">You're browsing as a guest</h1>
            <p className="text-muted-foreground mb-6">Create an account to save your progress and unlock your personal mind map.</p>
            <div className="flex gap-3 justify-center">
              <Link href="/register" className="px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity" style={{ background: GOLD, color: "#000" }}>Create Account</Link>
              <Link href="/login" className="btn-ghost">Sign In</Link>
            </div>
          </motion.div>
        </div>
      </PageWrapper>
    );
  }

  // Transform traits
  const TRAIT_LABELS: Record<string, string> = {
    exploration_breadth: "Exploration",
    focus_consistency: "Focus",
    social_orientation: "Social",
    friction_tolerance: "Persistence",
    emotional_volatility: "Stability",
    confidence: "Confidence",
  };
  const rawTraits = (traitsQ.data as { traits?: Record<string, number> } | null)?.traits;
  const traitsData = rawTraits
    ? Object.entries(rawTraits).map(([k, v]) => ({ trait: TRAIT_LABELS[k] ?? k, value: v }))
    : null;

  const burnout = (burnoutQ.data as unknown as { score: number; label: string } | null) ?? null;

  // PBSP day field may be a string name like "Monday"; convert to index
  const DAY_MAP: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
  const rawOptimal = (optimalQ.data as unknown as { optimal_times?: Array<{ hour: number; day: number | string; focus_probability: number }> } | null)?.optimal_times;
  const optimalTimes = rawOptimal
    ? rawOptimal.map((t) => ({ hour: t.hour, day: typeof t.day === "string" ? (DAY_MAP[t.day] ?? 0) : t.day, focus_probability: t.focus_probability }))
    : null;

  const interests = (interestsQ.data as unknown as { interests?: Array<{ topic: string; confidence: number; trend?: string }> } | null)?.interests ?? null;
  const struggles = (strugglesQ.data as unknown as { struggles?: Array<{ topic: string; frequency: number }> } | null)?.struggles ?? null;

  const rawRecs = (insightsQ.data as unknown as { recommendations?: Array<{ message: string } | string> } | null)?.recommendations;
  const recommendations = rawRecs
    ? rawRecs.map((r) => (typeof r === "string" ? r : r.message))
    : null;

  const assessHistory = assessHistQ.data
    ? assessHistQ.data.map((r) => ({
        instrumentId: r.instrumentId,
        severity: r.severity ?? undefined,
        totalScore: r.totalScore ?? undefined,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      }))
    : null;

  const cogHistory = cogHistQ.data
    ? cogHistQ.data.map((r) => ({
        exerciseId: r.exerciseId,
        accuracyPct: r.accuracyPct,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      }))
    : null;

  const psychProfile = psychProfileQ.data as Record<string, unknown> | null;

  return (
    <PageWrapper pageName="Profile">
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Your Profile</h1>
              <p className="text-muted-foreground text-sm mt-1">Mind map, behavioral insights, and progress</p>
            </div>
            <button onClick={logout} className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition-colors">
              <LogOut size={15} /> Sign Out
            </button>
          </div>
        </motion.div>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: 4, marginBottom: 24, overflowX: "auto", padding: "2px 0" }}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10,
                fontSize: 13, fontWeight: tab === id ? 700 : 500, whiteSpace: "nowrap",
                background: tab === id ? "oklch(0.72 0.20 310 / 0.15)" : "transparent",
                color: tab === id ? PURPLE : "var(--muted-foreground)",
                border: tab === id ? "1px solid oklch(0.72 0.20 310 / 0.3)" : "1px solid transparent",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
          {tab === "overview" && (
            <OverviewTab user={user} profile={profile} psychProfile={psychProfile} traitsData={traitsData} burnout={burnout} assessmentHistory={assessHistory} />
          )}
          {tab === "mind" && (
            <MindTab psychProfile={psychProfile} traitsData={traitsData} />
          )}
          {tab === "performance" && (
            <PerformanceTab assessmentHistory={assessHistory} cogHistory={cogHistory} />
          )}
          {tab === "learning" && (
            <LearningTab interests={interests} struggles={struggles} optimalTimes={optimalTimes} recommendations={recommendations} />
          )}
          {tab === "progress" && (
            <ProgressTab profile={profile} badges={profile.badges ?? []} />
          )}
        </motion.div>
      </div>
    </PageWrapper>
  );
}
