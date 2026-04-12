import { useEffect } from "react";
import { motion } from "framer-motion";
import { usePersonalization } from "@/contexts/PersonalizationContext";

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

  useEffect(() => {
    if (isLoaded) {
      recordVisit(pageName);
    }
  }, [pageName, isLoaded]);

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`pt-16 min-h-screen ${className}`}
    >
      {children}
    </motion.div>
  );
}
