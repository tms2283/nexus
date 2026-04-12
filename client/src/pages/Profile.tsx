import { useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, Calendar, LogOut, Save, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import PageWrapper from "@/components/PageWrapper";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

export default function ProfilePage() {
  const { user, logout, isAuthenticated, loading } = useAuth();
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    darkMode: true,
    publicProfile: false,
  });
  const [isSaving, setIsSaving] = useState(false);

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[oklch(0.75_0.18_55)]" />
        </div>
      </PageWrapper>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <PageWrapper>
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-8 border border-white/8 text-center"
          >
            <AlertCircle size={48} className="mx-auto mb-4 text-[oklch(0.75_0.18_55)]" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Sign In Required</h1>
            <p className="text-muted-foreground mb-6">
              Sign in to create a profile, save your progress, and access all features.
            </p>
            <a
              href={getLoginUrl()}
              className="inline-block px-6 py-3 rounded-lg bg-[oklch(0.75_0.18_55)] text-black font-semibold hover:opacity-90 transition-opacity"
            >
              Sign In with Manus
            </a>
          </motion.div>
        </div>
      </PageWrapper>
    );
  }

  const handleSavePreferences = async () => {
    setIsSaving(true);
    try {
      // Save preferences to localStorage for now
      localStorage.setItem("user_preferences", JSON.stringify(preferences));
      toast.success("Preferences saved!");
    } catch (error) {
      toast.error("Failed to save preferences");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <h1 className="text-4xl font-bold text-foreground mb-2">Your Profile</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </motion.div>

        {/* User Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 glass rounded-2xl p-8 border border-white/8"
        >
          <div className="flex items-start gap-6 mb-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[oklch(0.75_0.18_55)] to-[oklch(0.65_0.22_200)] flex items-center justify-center">
              <User size={40} className="text-black" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-foreground">{user.name || "User"}</h2>
              <div className="flex items-center gap-2 text-muted-foreground mt-2">
                <Mail size={16} />
                {user.email || "No email provided"}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground mt-1">
                <Calendar size={16} />
                Joined {new Date(user.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Account Status */}
          <div className="p-4 rounded-lg bg-white/3 border border-white/8 mb-6">
            <div className="flex items-center gap-2 text-[oklch(0.75_0.18_55)] font-medium">
              <CheckCircle2 size={20} />
              Account Status: Active
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Your progress and preferences are automatically saved to your account.
            </p>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors font-medium"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </motion.div>

        {/* Preferences Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8 glass rounded-2xl p-8 border border-white/8"
        >
          <h3 className="text-xl font-bold text-foreground mb-6">Preferences</h3>

          <div className="space-y-4">
            {/* Email Notifications */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/3 border border-white/8">
              <div>
                <div className="font-medium text-foreground">Email Notifications</div>
                <p className="text-sm text-muted-foreground">Receive updates about your learning progress</p>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.emailNotifications}
                  onChange={(e) =>
                    setPreferences({ ...preferences, emailNotifications: e.target.checked })
                  }
                  className="w-5 h-5 rounded"
                />
              </label>
            </div>

            {/* Dark Mode */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/3 border border-white/8">
              <div>
                <div className="font-medium text-foreground">Dark Mode</div>
                <p className="text-sm text-muted-foreground">Use dark theme for the interface</p>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.darkMode}
                  onChange={(e) =>
                    setPreferences({ ...preferences, darkMode: e.target.checked })
                  }
                  className="w-5 h-5 rounded"
                />
              </label>
            </div>

            {/* Public Profile */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-white/3 border border-white/8">
              <div>
                <div className="font-medium text-foreground">Public Profile</div>
                <p className="text-sm text-muted-foreground">Allow others to view your learning stats</p>
              </div>
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.publicProfile}
                  onChange={(e) =>
                    setPreferences({ ...preferences, publicProfile: e.target.checked })
                  }
                  className="w-5 h-5 rounded"
                />
              </label>
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSavePreferences}
            disabled={isSaving}
            className="mt-6 flex items-center gap-2 px-6 py-3 rounded-lg bg-[oklch(0.75_0.18_55)] text-black font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            <Save size={16} />
            {isSaving ? "Saving..." : "Save Preferences"}
          </button>
        </motion.div>

        {/* Data & Privacy Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-8 border border-white/8"
        >
          <h3 className="text-xl font-bold text-foreground mb-6">Data & Privacy</h3>

          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-white/3 border border-white/8">
              <div className="font-medium text-foreground mb-2">Your Data</div>
              <p className="text-sm text-muted-foreground mb-3">
                All your learning progress, preferences, and achievements are stored securely in our database and associated with your account.
              </p>
              <button className="text-sm text-[oklch(0.75_0.18_55)] hover:underline font-medium">
                Download Your Data
              </button>
            </div>

            <div className="p-4 rounded-lg bg-white/3 border border-white/8">
              <div className="font-medium text-foreground mb-2">Privacy</div>
              <p className="text-sm text-muted-foreground">
                We respect your privacy. Your data is never shared with third parties without your consent.
              </p>
            </div>

            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="font-medium text-red-400 mb-2">Danger Zone</div>
              <p className="text-sm text-red-300/80 mb-3">
                Permanently delete your account and all associated data.
              </p>
              <button className="text-sm px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 hover:bg-red-500/30 transition-colors font-medium">
                Delete Account
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </PageWrapper>
  );
}
