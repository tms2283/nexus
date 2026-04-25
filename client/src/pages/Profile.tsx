import { motion } from "framer-motion";
import {
  User,
  Mail,
  Calendar,
  LogOut,
  AlertCircle,
  Brain,
  Shield,
  Zap,
  BadgeCheck,
  KeyRound,
  UserCircle2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import PageWrapper from "@/components/PageWrapper";
import { Link } from "wouter";

export default function ProfilePage() {
  const { user, isAuthenticated, logout, isLoading } = useAuth();
  const { profile } = usePersonalization();

  if (isLoading) {
    return (
      <PageWrapper pageName="Profile">
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[oklch(0.75_0.18_55)]" />
        </div>
      </PageWrapper>
    );
  }

  // Guest state
  if (!isAuthenticated) {
    return (
      <PageWrapper pageName="Profile">
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-nexus p-8 text-center"
          >
            <AlertCircle
              size={48}
              className="mx-auto mb-4 text-[oklch(0.75_0.18_55)]"
            />
            <h1 className="text-2xl font-bold text-foreground mb-2">
              You're browsing as a guest
            </h1>
            <p className="text-muted-foreground mb-6">
              Create an account to save your progress, earn XP, and unlock
              personalized learning.
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/register"
                className="px-6 py-3 rounded-lg bg-[oklch(0.75_0.18_55)] text-black font-semibold hover:opacity-90 transition-opacity"
              >
                Create Account
              </Link>
              <Link
                href="/login"
                className="btn-ghost"
              >
                Sign In
              </Link>
            </div>
          </motion.div>
        </div>
      </PageWrapper>
    );
  }

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "Recently";

  const accountDetails = [
    {
      label: "Display name",
      value: user?.name ?? "Anonymous",
      icon: UserCircle2,
    },
    {
      label: "Email",
      value: user?.email ?? "Not provided",
      icon: Mail,
    },
    {
      label: "Login method",
      value: user?.loginMethod ?? "email",
      icon: KeyRound,
    },
    {
      label: "Email verified",
      value: user?.emailVerified ? "Verified" : "Not verified",
      icon: BadgeCheck,
    },
    {
      label: "Onboarding",
      value: user?.onboardingCompleted ? "Completed" : "Not completed",
      icon: Brain,
    },
    {
      label: "Member since",
      value: memberSince,
      icon: Calendar,
    },
  ];

  return (
    <PageWrapper pageName="Profile">
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-foreground">Your Profile</h1>
          <p className="text-muted-foreground mt-1">
            View your account profile, activity, and learning progress
          </p>
        </motion.div>

        {/* Avatar + identity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-nexus p-6 flex items-center gap-5"
        >
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name ?? ""}
              className="w-16 h-16 rounded-full object-cover ring-2 ring-[oklch(0.75_0.18_55_/_0.3)]"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[oklch(0.75_0.18_55_/_0.15)] border border-[oklch(0.75_0.18_55_/_0.3)] flex items-center justify-center">
              <User size={28} className="text-[oklch(0.75_0.18_55)]" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-lg font-semibold text-foreground truncate">
              {user?.name ?? "Anonymous"}
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
              <Mail size={13} />
              <span className="truncate">{user?.email ?? "Not provided"}</span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
              <Calendar size={12} />
              <span>Member since {memberSince}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Login method
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-[var(--surface-1)] border border-border/60 text-muted-foreground capitalize">
              {user?.loginMethod ?? "email"}
            </span>
          </div>
        </motion.div>

        {/* Regular profile */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
          className="card-nexus p-6"
        >
          <div className="mb-5">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Regular Profile
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              These are the account details visible to you. Psych-profile data remains backend-only unless you are an admin.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {accountDetails.map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="rounded-xl border border-border/60 bg-[var(--surface-1)] px-4 py-4"
              >
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Icon size={14} />
                  <span>{label}</span>
                </div>
                <div className="mt-2 text-sm font-medium text-foreground break-words capitalize">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* XP / Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-3 gap-3"
        >
          {[
            {
              label: "XP Earned",
              value: profile.xp.toLocaleString(),
              icon: Zap,
              color: "oklch(0.75_0.18_55)",
            },
            {
              label: "Level",
              value: profile.level,
              icon: Brain,
              color: "oklch(0.72_0.20_310)",
            },
            {
              label: "Streak",
              value: `${profile.streak}d`,
              icon: Shield,
              color: "oklch(0.75_0.18_180)",
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="card-nexus p-4 text-center"
            >
              <Icon size={20} className="mx-auto mb-2" style={{ color }} />
              <div className="text-xl font-bold text-foreground">{value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {label}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Account actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-nexus p-6 space-y-3"
        >
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            Account
          </h2>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-colors text-red-400 text-sm font-medium"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </motion.div>
      </div>
    </PageWrapper>
  );
}
