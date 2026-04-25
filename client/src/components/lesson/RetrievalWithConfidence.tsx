import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Gauge, Lightbulb, ChevronRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import type { RetrievalBlock } from "@shared/types/lessonSeed";

/**
 * Retrieval practice with confidence calibration. The learner rates
 * confidence (1-5) before submitting; the gap between confidence and
 * correctness updates their LearnerProfile.calibrationGap.
 */
export function RetrievalWithConfidence({
  block,
  lessonId,
}: {
  block: RetrievalBlock;
  lessonId: string;
}) {
  const [confidence, setConfidence] = useState<number | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [remediationConceptId, setRemediationConceptId] = useState<string | null>(null);
  const [remediationDismissed, setRemediationDismissed] = useState(false);
  const { cookieId } = usePersonalization();
  const recordSignalMutation = trpc.learner.recordRetrievalAttempt.useMutation();
  const recordAssessmentMutation = trpc.lesson.recordAssessment.useMutation();
  const recordAttemptMutation = trpc.curriculum.recordAttempt.useMutation({
    onSuccess: (data) => {
      if (data.remediationConceptId) setRemediationConceptId(data.remediationConceptId);
    },
  });

  const snippetQuery = trpc.curriculum.getConceptSnippet.useQuery(
    { conceptId: remediationConceptId! },
    { enabled: !!remediationConceptId && !remediationDismissed }
  );

  const submit = () => {
    if (!picked || (block.requireConfidence && confidence == null)) return;
    setSubmitted(true);
    const choice = block.choices.find(c => c.id === picked);
    if (!choice) return;
    // Auth-required psych signal — silent for guests.
    recordSignalMutation.mutate(
      {
        lessonId,
        itemId: block.id,
        correct: choice.correct,
        confidence: confidence ?? 3,
        tags: block.tags,
      },
      { onError: () => {} }
    );
    // Public assessment persistence — works for guests too.
    if (cookieId) {
      recordAssessmentMutation.mutate(
        {
          cookieId,
          lessonId,
          itemId: block.id,
          itemKind: "retrieval",
          correct: choice.correct,
          confidence: confidence ?? undefined,
          responsePayload: { choiceId: picked, tags: block.tags },
        },
        { onError: () => {} }
      );
      // Also update BKT mastery if this block has a concept tag
      if (block.tags?.[0]) {
        recordAttemptMutation.mutate({
          cookieId,
          conceptId: block.tags[0],
          correct: choice.correct,
          confidence: confidence ?? undefined,
          itemId: block.id,
          lessonKey: lessonId,
          misconceptionTag: (!choice.correct && choice.misconceptionTag) ? choice.misconceptionTag : undefined,
        });
      }
    }
  };

  const pickedChoice = picked ? block.choices.find(c => c.id === picked) : null;

  return (
    <div className="glass rounded-2xl p-5 border border-white/10">
      <p className="text-sm text-foreground font-medium mb-3">{block.prompt}</p>
      <div className="space-y-2 mb-4">
        {block.choices.map(choice => {
          const isPicked = picked === choice.id;
          const showResult = submitted && isPicked;
          return (
            <button
              key={choice.id}
              onClick={() => !submitted && setPicked(choice.id)}
              disabled={submitted}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                showResult
                  ? choice.correct
                    ? "bg-[oklch(0.72_0.18_150_/_0.12)] border-[oklch(0.72_0.18_150_/_0.45)] text-foreground"
                    : "bg-[oklch(0.65_0.22_30_/_0.12)] border-[oklch(0.65_0.22_30_/_0.45)] text-foreground"
                  : isPicked
                  ? "bg-white/5 border-white/25 text-foreground"
                  : "bg-white/3 border-white/10 text-muted-foreground hover:border-white/20"
              } disabled:cursor-not-allowed`}
            >
              <div className="flex items-start gap-2">
                {showResult &&
                  (choice.correct ? (
                    <CheckCircle2 size={16} className="text-[oklch(0.78_0.18_150)] mt-0.5 shrink-0" />
                  ) : (
                    <XCircle size={16} className="text-[oklch(0.72_0.22_30)] mt-0.5 shrink-0" />
                  ))}
                <span>{choice.text}</span>
              </div>
            </button>
          );
        })}
      </div>

      {block.requireConfidence && !submitted && (
        <div className="mb-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <Gauge size={13} />
            <span>How confident are you? (1 = guessing, 5 = certain)</span>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => setConfidence(n)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  confidence === n
                    ? "bg-[oklch(0.65_0.22_200_/_0.18)] border-[oklch(0.65_0.22_200_/_0.45)] text-[oklch(0.85_0.18_200)]"
                    : "bg-white/3 border-white/10 text-muted-foreground hover:border-white/20"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {!submitted && (
        <button
          onClick={submit}
          disabled={!picked || (block.requireConfidence && confidence == null)}
          className="px-4 py-2 rounded-xl bg-[oklch(0.65_0.22_200_/_0.18)] border border-[oklch(0.65_0.22_200_/_0.4)] text-sm text-[oklch(0.85_0.18_200)] hover:bg-[oklch(0.65_0.22_200_/_0.28)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Submit answer
        </button>
      )}

      <AnimatePresence>
        {submitted && pickedChoice && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-3 rounded-xl bg-white/3 border border-white/10"
          >
            <p className="text-xs text-muted-foreground leading-relaxed">{pickedChoice.rationale}</p>
            {confidence != null && (
              <p className="text-xs text-muted-foreground/70 mt-2 italic">
                You said confidence {confidence}/5 — {pickedChoice.correct ? "correct" : "incorrect"}.
                {pickedChoice.correct
                  ? confidence <= 2
                    ? " You knew more than you trusted."
                    : ""
                  : confidence >= 4
                  ? " That's the most useful kind of mistake — high confidence on a wrong answer reveals where your model needs updating."
                  : ""}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Misconception remediation card */}
      <AnimatePresence>
        {submitted && remediationConceptId && !remediationDismissed && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-3 p-4 rounded-xl border border-[oklch(0.75_0.18_55_/_0.35)] bg-[oklch(0.75_0.18_55_/_0.06)]"
          >
            <div className="flex items-center gap-2 text-[oklch(0.75_0.18_55)] mb-2">
              <Lightbulb size={14} />
              <span className="text-xs font-semibold uppercase tracking-wide">Let's unpack that</span>
            </div>
            {snippetQuery.data ? (
              <>
                <p className="text-sm font-medium text-foreground mb-1">{snippetQuery.data.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                  {snippetQuery.data.summary}
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground mb-3">
                This mistake points to a specific gap — reviewing the underlying concept will help.
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setRemediationDismissed(true)}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-[oklch(0.75_0.18_55_/_0.15)] border border-[oklch(0.75_0.18_55_/_0.3)] hover:bg-[oklch(0.75_0.18_55_/_0.25)] transition-colors"
              >
                <ChevronRight size={12} /> Continue lesson
              </button>
              <button
                onClick={() => setRemediationDismissed(true)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
