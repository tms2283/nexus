import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Home, AlertCircle } from "lucide-react";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-[var(--nexus-gold-fill)] blur-[100px]" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-nexus p-12 text-center max-w-md w-full relative z-10"
      >
        <div className="w-16 h-16 rounded-2xl bg-[var(--nexus-gold-fill)] border border-[var(--nexus-gold-border)] flex items-center justify-center mx-auto mb-6">
          <AlertCircle size={28} className="text-[var(--nexus-gold)]" />
        </div>
        <h1 className="text-6xl font-black text-foreground mb-2">404</h1>
        <h2 className="text-xl font-semibold text-foreground mb-3">Page Not Found</h2>
        <p className="text-muted-foreground text-sm leading-relaxed mb-8">
          The page you are looking for does not exist. It may have been moved or deleted.
        </p>
        <button
          onClick={() => setLocation("/")}
          className="btn-primary flex items-center gap-2 mx-auto"
        >
          <Home size={16} />
          Go Home
        </button>
      </motion.div>
    </div>
  );
}
