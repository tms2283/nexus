import { motion } from "framer-motion";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import { LessonSeedRenderer } from "./LessonSeedRenderer";

/**
 * AdaptiveLessonView — the canonical lesson surface for the platform.
 * Calls trpc.lesson.getSeededLesson to fetch a LearnerProfile-personalised
 * LessonSeed, then dispatches each section to LessonSeedRenderer.
 *
 * Every adaptive course should render its lesson body through this component.
 */
export function AdaptiveLessonView({
  lessonId,
  completed,
  onComplete,
}: {
  lessonId: string;
  completed: boolean;
  onComplete: () => void;
}) {
  const { cookieId } = usePersonalization();
  const seedQuery = trpc.lesson.getSeededLesson.useQuery(
    { lessonId, cookieId: cookieId || undefined },
    { enabled: true, staleTime: 60_000, retry: 1 }
  );

  if (seedQuery.isLoading) {
    return (
      <div className="glass rounded-2xl p-10 border border-white/10 flex flex-col items-center gap-3">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Personalising this lesson for you…</p>
      </div>
    );
  }

  if (seedQuery.isError || !seedQuery.data) {
    return (
      <div className="glass rounded-2xl p-6 border border-[oklch(0.65_0.22_30_/_0.3)] flex items-start gap-3">
        <AlertCircle size={18} className="text-[oklch(0.72_0.22_30)] mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-foreground mb-1">We couldn't load this lesson.</p>
          <p className="text-xs text-muted-foreground">
            {seedQuery.error?.message ?? "Try refreshing the page in a moment."}
          </p>
        </div>
      </div>
    );
  }

  const seed = seedQuery.data;

  return (
    <motion.div
      key={lessonId}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="space-y-6"
    >
      <LessonSeedRenderer seed={seed} />
      <div className="glass rounded-2xl p-5 border border-white/10 flex items-center justify-between gap-4">
        <div className="text-xs text-muted-foreground">
          Finished the section above? Mark this lesson complete to bank your XP and unlock the next one.
        </div>
        <button
          onClick={onComplete}
          disabled={completed}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[oklch(0.72_0.18_150_/_0.18)] border border-[oklch(0.72_0.18_150_/_0.4)] text-sm text-[oklch(0.85_0.18_150)] hover:bg-[oklch(0.72_0.18_150_/_0.28)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
        >
          <CheckCircle2 size={14} />
          {completed ? "Completed" : `Mark complete · +${seed.xpReward} XP`}
        </button>
      </div>
    </motion.div>
  );
}
