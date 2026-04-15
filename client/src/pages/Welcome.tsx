import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Brain, Sparkles, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Welcome() {
  const { isAuthenticated, isGuest, isLoading, continueAsGuest } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect if already authenticated or guest
  useEffect(() => {
    if (!isLoading && (isAuthenticated || isGuest)) setLocation("/app");
  }, [isAuthenticated, isGuest, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[oklch(0.75_0.18_55)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[oklch(0.75_0.18_55_/_0.06)] blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10 flex flex-col items-center gap-8"
      >
        {/* Logo + tagline */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-[oklch(0.75_0.18_55_/_0.15)] border border-[oklch(0.75_0.18_55_/_0.3)] flex items-center justify-center">
              <Brain size={26} className="text-[oklch(0.75_0.18_55)]" />
            </div>
            <h1 className="text-4xl font-bold text-foreground tracking-tight">
              Nexus
            </h1>
          </div>
          <p className="text-muted-foreground text-base leading-relaxed max-w-sm mx-auto">
            Your AI-powered learning platform. Adaptive curricula, deep research
            tools, and a knowledge engine built around how <em>you</em> think.
          </p>
        </div>

        {/* Auth buttons */}
        <div className="w-full flex flex-col gap-3">
          {/* Google */}
          <button
            onClick={() => setLocation("/login?method=google")}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition-colors text-foreground font-medium"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* Facebook stub */}
          <div className="relative group">
            <button
              disabled
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-white/8 bg-white/3 text-muted-foreground font-medium cursor-not-allowed opacity-50"
            >
              <FacebookIcon />
              Continue with Facebook
            </button>
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Coming soon
            </div>
          </div>

          {/* Email */}
          <button
            onClick={() => setLocation("/login")}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition-colors text-foreground font-medium"
          >
            <Sparkles size={18} className="text-[oklch(0.75_0.18_55)]" />
            Sign in with Email
          </button>

          {/* Create account */}
          <button
            onClick={() => setLocation("/register")}
            className="w-full px-4 py-3 rounded-xl bg-[oklch(0.75_0.18_55)] text-black font-semibold hover:opacity-90 transition-opacity"
          >
            Create Account
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          {/* Guest */}
          <button
            onClick={continueAsGuest}
            className="w-full px-4 py-3 rounded-xl border border-white/8 text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors text-sm font-medium"
          >
            Continue as Guest
          </button>

          {/* Guest warning */}
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/8 border border-amber-500/20">
            <AlertTriangle
              size={14}
              className="text-amber-400 mt-0.5 shrink-0"
            />
            <p className="text-xs text-amber-300/80 leading-relaxed">
              Guest progress and data are not saved. Create an account to keep
              your learning history, XP, and personalized curriculum.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}
