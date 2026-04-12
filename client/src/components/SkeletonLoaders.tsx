import { motion } from "framer-motion";

/**
 * Shimmer animation for skeleton loaders
 */
const shimmerVariants = {
  initial: { backgroundPosition: "200% center" },
  animate: { backgroundPosition: "-200% center" },
};

/**
 * StatCard Skeleton - Matches StatCard component
 */
export function StatCardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 20 }}
      className="glass rounded-2xl p-6 border border-white/8 overflow-hidden"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <motion.div
            variants={shimmerVariants}
            initial="initial"
            animate="animate"
            transition={{ duration: 2, repeat: Infinity }}
            className="h-4 w-24 rounded bg-gradient-to-r from-white/10 via-white/20 to-white/10 mb-3"
            style={{ backgroundSize: "200% 100%" }}
          />
          <motion.div
            variants={shimmerVariants}
            initial="initial"
            animate="animate"
            transition={{ duration: 2, repeat: Infinity, delay: 0.1 }}
            className="h-8 w-32 rounded bg-gradient-to-r from-white/10 via-white/20 to-white/10"
            style={{ backgroundSize: "200% 100%" }}
          />
        </div>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="w-6 h-6 rounded-full bg-gradient-to-r from-[oklch(0.75_0.18_55)]/30 to-[oklch(0.65_0.22_200)]/30"
        />
      </div>
    </motion.div>
  );
}

/**
 * LessonCard Skeleton
 */
export function LessonCardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 20 }}
      className="glass rounded-2xl p-6 border border-white/8 overflow-hidden"
    >
      <div className="flex items-center gap-4 mb-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 rounded-lg bg-gradient-to-r from-[oklch(0.75_0.18_55)]/30 to-[oklch(0.65_0.22_200)]/30 flex-shrink-0"
        />
        <div className="flex-1">
          <motion.div
            variants={shimmerVariants}
            initial="initial"
            animate="animate"
            transition={{ duration: 2, repeat: Infinity }}
            className="h-4 w-40 rounded bg-gradient-to-r from-white/10 via-white/20 to-white/10 mb-2"
            style={{ backgroundSize: "200% 100%" }}
          />
          <motion.div
            variants={shimmerVariants}
            initial="initial"
            animate="animate"
            transition={{ duration: 2, repeat: Infinity, delay: 0.1 }}
            className="h-3 w-56 rounded bg-gradient-to-r from-white/10 via-white/20 to-white/10"
            style={{ backgroundSize: "200% 100%" }}
          />
        </div>
      </div>
    </motion.div>
  );
}

/**
 * ProgressBar Skeleton
 */
export function ProgressBarSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-4"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        className="w-8 h-8 rounded-full bg-gradient-to-r from-[oklch(0.75_0.18_55)]/30 to-[oklch(0.65_0.22_200)]/30 flex-shrink-0"
      />
      <div className="flex-1">
        <motion.div
          variants={shimmerVariants}
          initial="initial"
          animate="animate"
          transition={{ duration: 2, repeat: Infinity }}
          className="h-4 w-32 rounded bg-gradient-to-r from-white/10 via-white/20 to-white/10 mb-2"
          style={{ backgroundSize: "200% 100%" }}
        />
        <motion.div
          variants={shimmerVariants}
          initial="initial"
          animate="animate"
          transition={{ duration: 2, repeat: Infinity, delay: 0.1 }}
          className="h-2 w-full rounded-full bg-gradient-to-r from-white/10 via-white/20 to-white/10"
          style={{ backgroundSize: "200% 100%" }}
        />
      </div>
    </motion.div>
  );
}

/**
 * TextBlock Skeleton - For content areas
 */
export function TextBlockSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(lines)].map((_, i) => (
        <motion.div
          key={i}
          variants={shimmerVariants}
          initial="initial"
          animate="animate"
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
          className={`h-4 rounded bg-gradient-to-r from-white/10 via-white/20 to-white/10 ${
            i === lines - 1 ? "w-3/4" : "w-full"
          }`}
          style={{ backgroundSize: "200% 100%" }}
        />
      ))}
    </div>
  );
}

/**
 * Grid Skeleton - For grid layouts
 */
export function GridSkeleton({ columns = 4, count = 4 }: { columns?: number; count?: number }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-6`}>
      {[...Array(count)].map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * List Skeleton - For list layouts
 */
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <LessonCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Table Skeleton - For table layouts
 */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(rows)].map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4 p-4 rounded-lg bg-white/3 border border-white/8">
          {[...Array(columns)].map((_, colIdx) => (
            <motion.div
              key={colIdx}
              variants={shimmerVariants}
              initial="initial"
              animate="animate"
              transition={{ duration: 2, repeat: Infinity, delay: (rowIdx + colIdx) * 0.05 }}
              className={`h-4 rounded bg-gradient-to-r from-white/10 via-white/20 to-white/10 ${
                colIdx === 0 ? "w-32" : "flex-1"
              }`}
              style={{ backgroundSize: "200% 100%" }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Hero Skeleton - For full-page loading
 */
export function HeroSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <motion.div
          variants={shimmerVariants}
          initial="initial"
          animate="animate"
          transition={{ duration: 2, repeat: Infinity }}
          className="h-10 w-64 rounded bg-gradient-to-r from-white/10 via-white/20 to-white/10 mb-3"
          style={{ backgroundSize: "200% 100%" }}
        />
        <motion.div
          variants={shimmerVariants}
          initial="initial"
          animate="animate"
          transition={{ duration: 2, repeat: Infinity, delay: 0.1 }}
          className="h-5 w-96 rounded bg-gradient-to-r from-white/10 via-white/20 to-white/10"
          style={{ backgroundSize: "200% 100%" }}
        />
      </div>

      {/* Content */}
      <TextBlockSkeleton lines={4} />
    </div>
  );
}

/**
 * Card Grid Skeleton - Multiple cards in a grid
 */
export function CardGridSkeleton({ count = 6, columns = 3 }: { count?: number; columns?: number }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns} gap-6`}>
      {[...Array(count)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 20 }}
          transition={{ delay: i * 0.05 }}
          className="glass rounded-2xl p-6 border border-white/8 overflow-hidden"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 rounded-lg bg-gradient-to-r from-[oklch(0.75_0.18_55)]/30 to-[oklch(0.65_0.22_200)]/30 mb-4"
          />
          <motion.div
            variants={shimmerVariants}
            initial="initial"
            animate="animate"
            transition={{ duration: 2, repeat: Infinity }}
            className="h-4 w-32 rounded bg-gradient-to-r from-white/10 via-white/20 to-white/10 mb-3"
            style={{ backgroundSize: "200% 100%" }}
          />
          <motion.div
            variants={shimmerVariants}
            initial="initial"
            animate="animate"
            transition={{ duration: 2, repeat: Infinity, delay: 0.1 }}
            className="h-3 w-full rounded bg-gradient-to-r from-white/10 via-white/20 to-white/10"
            style={{ backgroundSize: "200% 100%" }}
          />
        </motion.div>
      ))}
    </div>
  );
}
