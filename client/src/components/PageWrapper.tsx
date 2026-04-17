import { useEffect } from "react";
import { motion } from "framer-motion";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEditMode } from "@/contexts/EditModeContext";

interface PageWrapperProps {
  children: React.ReactNode;
  pageName: string;
  className?: string;
}

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export default function PageWrapper({ children, pageName, className = "" }: PageWrapperProps) {
  const { recordVisit, isLoaded } = usePersonalization();
  const { user } = useAuth();
  const { isEditMode } = useEditMode();
  const showEditChrome = isEditMode && user?.role === "admin";

  useEffect(() => {
    if (isLoaded) {
      recordVisit(pageName);
    }
  }, [pageName, isLoaded]);

  return (
    <motion.div
      variants={pageVariants}
      initial={false}
      animate="animate"
      exit="exit"
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`pt-16 min-h-screen ${showEditChrome ? "relative ring-1 ring-inset ring-[oklch(0.75_0.18_55_/_0.22)]" : ""} ${className}`}
    >
      {showEditChrome && (
        <div className="pointer-events-none absolute inset-x-4 top-20 z-20 rounded-2xl border border-dashed border-[oklch(0.75_0.18_55_/_0.4)] bg-[oklch(0.75_0.18_55_/_0.08)] px-4 py-2 text-xs uppercase tracking-[0.24em] text-[oklch(0.82_0.18_55)]">
          Edit mode active · browsing overlay attached to this page
        </div>
      )}
      {children}
    </motion.div>
  );
}
