import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Lightbulb, MessageSquare } from "lucide-react";
import type { LessonSeed, LessonSection } from "@shared/types/lessonSeed";
import { ProductiveFailureBlock } from "./ProductiveFailureBlock";
import { RetrievalWithConfidence } from "./RetrievalWithConfidence";
import { SpanSelectBlock } from "./SpanSelectBlock";

/**
 * Renders any LessonSeed by dispatching each section to the appropriate
 * block component. This is the canonical rendering surface every adaptive
 * lesson on the platform should use.
 */
export function LessonSeedRenderer({ seed }: { seed: LessonSeed }) {
  return (
    <div className="space-y-4">
      <header className="mb-2">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">{seed.title}</h1>
        {seed.subtitle && (
          <p className="text-sm text-muted-foreground">{seed.subtitle}</p>
        )}
        <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
          <span>~{seed.estimatedMinutes} min</span>
          <span>·</span>
          <span>Tier: {seed.forProfile.suggestedTier}</span>
          <span>·</span>
          <span>Reading: {seed.forProfile.readingLevel}</span>
        </div>
      </header>
      {seed.sections.map((section, i) => (
        <motion.div
          key={section.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <SectionBlock section={section} lessonId={seed.lessonId} />
        </motion.div>
      ))}
    </div>
  );
}

function SectionBlock({ section, lessonId }: { section: LessonSection; lessonId: string }) {
  switch (section.kind) {
    case "narrative":
      return (
        <div className="glass rounded-2xl p-5 border border-white/10">
          {section.heading && (
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <BookOpen size={14} />
              <span className="text-xs font-semibold uppercase tracking-wide">{section.heading}</span>
            </div>
          )}
          <p className="text-sm text-foreground leading-relaxed">{section.body}</p>
        </div>
      );
    case "analogy":
      return (
        <div className="glass rounded-2xl p-5 border border-[oklch(0.72_0.18_290_/_0.25)]">
          <div className="flex items-center gap-2 text-[oklch(0.78_0.18_290)] mb-2">
            <Lightbulb size={14} />
            <span className="text-xs font-semibold uppercase tracking-wide">{section.title}</span>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{section.body}</p>
        </div>
      );
    case "example":
      return (
        <div className="glass rounded-2xl p-5 border border-white/10">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <span className="text-xs font-semibold uppercase tracking-wide">
              Example · {section.domain}
            </span>
          </div>
          <p className="text-sm font-medium text-foreground mb-1">{section.title}</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{section.body}</p>
        </div>
      );
    case "retrieval":
      return <RetrievalWithConfidence block={section} lessonId={lessonId} />;
    case "productive-failure":
      return <ProductiveFailureBlock block={section} />;
    case "span-select":
      return <SpanSelectBlock block={section} />;
    case "reflection":
      return <ReflectionBlockUI section={section} />;
    case "rubric":
      return (
        <div className="glass rounded-2xl p-5 border border-white/10">
          <p className="text-sm text-foreground mb-2">{section.prompt}</p>
          <p className="text-xs text-muted-foreground italic">
            Rubric grading not yet wired in this build.
          </p>
        </div>
      );
    default:
      return null;
  }
}

function ReflectionBlockUI({
  section,
}: {
  section: Extract<LessonSection, { kind: "reflection" }>;
}) {
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  return (
    <div className="glass rounded-2xl p-5 border border-white/10">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <MessageSquare size={14} />
        <span className="text-xs font-semibold uppercase tracking-wide">Reflection</span>
      </div>
      <p className="text-sm text-foreground mb-3">{section.prompt}</p>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        disabled={submitted}
        rows={3}
        className="w-full bg-white/3 border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-white/25 transition-colors disabled:opacity-60"
      />
      {!submitted && (
        <button
          onClick={() => text.trim().length > 0 && setSubmitted(true)}
          disabled={text.trim().length === 0}
          className="mt-3 px-4 py-2 rounded-xl bg-white/5 border border-white/15 text-sm text-foreground hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Save reflection
        </button>
      )}
      {submitted && section.cues && (
        <div className="mt-3 p-3 rounded-xl bg-white/3 border border-white/10 space-y-1">
          {section.cues.map((cue, i) => (
            <p key={i} className="text-xs text-muted-foreground leading-relaxed">
              · {cue}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
