import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import { AdaptiveLessonView } from "@/components/lesson/AdaptiveLessonView";

export default function AdaptiveLesson() {
  const { lessonKey } = useParams<{ lessonKey: string }>();
  const [, navigate] = useLocation();
  const { addXP } = usePersonalization();
  const [completed, setCompleted] = useState(false);

  if (!lessonKey) return <div className="p-8 text-muted-foreground">Invalid lesson.</div>;

  const handleComplete = () => {
    setCompleted(true);
    addXP(50);
  };

  return (
    <div className="min-h-screen pt-16 pb-24">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate(-1 as never)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft size={13} /> Back to path
        </button>
        <AdaptiveLessonView
          lessonId={lessonKey}
          completed={completed}
          onComplete={handleComplete}
        />
      </div>
    </div>
  );
}
