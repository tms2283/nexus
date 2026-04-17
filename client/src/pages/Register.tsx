import { useState } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { Brain, Eye, EyeOff, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { setUser, refreshUser } = useAuth();
  const [, setLocation] = useLocation();

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: ({ user }) => {
      setUser(user as any);
      // Always go to onboarding after registration
      setLocation("/onboarding");
    },
    onError: (e) => toast.error(e.message),
  });

  const googleMutation = trpc.auth.googleSignIn.useMutation({
    onSuccess: async ({ user }) => {
      const refreshedUser = await refreshUser();
      const nextUser = refreshedUser ?? (user as any);
      if (!refreshedUser) {
        toast.error("Google sign-in completed, but the app could not confirm your session. Please try again.");
        return;
      }
      setUser(nextUser);
      setLocation(nextUser.onboardingCompleted ? "/app" : "/onboarding");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    if (password.length < 8) { toast.error("Password must be at least 8 characters."); return; }
    registerMutation.mutate({ name, email, password });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-[oklch(0.75_0.18_55_/_0.05)] blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 text-muted-foreground hover:text-foreground transition-colors">
            <Brain size={20} className="text-[oklch(0.75_0.18_55)]" />
            <span className="font-semibold text-foreground">Nexus</span>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Create your account</h1>
          <p className="text-muted-foreground text-sm mt-1">Start your AI-powered learning journey</p>
        </div>

        <div className="glass rounded-2xl border border-white/8 p-6 flex flex-col gap-4">
          <GoogleSignInButton
            mode="signup"
            isLoading={googleMutation.isPending}
            onCredential={(idToken) => googleMutation.mutate({ idToken })}
          />

          <button disabled className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-white/8 text-muted-foreground text-sm opacity-40 cursor-not-allowed">
            <FacebookIcon /> Facebook (Coming Soon)
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-xs text-muted-foreground">or email</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              placeholder="Full name" required autoComplete="name"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[oklch(0.75_0.18_55_/_0.5)]"
            />
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="Email address" required autoComplete="email"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[oklch(0.75_0.18_55_/_0.5)]"
            />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Password (min 8 characters)" required autoComplete="new-password"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[oklch(0.75_0.18_55_/_0.5)]"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button type="submit" disabled={registerMutation.isPending}
              className="w-full py-2.5 rounded-lg bg-[oklch(0.75_0.18_55)] text-black font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60">
              {registerMutation.isPending && <Loader2 size={16} className="animate-spin" />}
              Create Account
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-[oklch(0.75_0.18_55)] hover:underline">Sign in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
function FacebookIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>;
}
