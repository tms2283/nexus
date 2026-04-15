import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock,
  Loader2,
  Send,
  Volume2,
  ExternalLink,
  MessageSquare,
  Compass,
  ChevronRight,
} from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import PageWrapper from "@/components/PageWrapper";
import AudioPlayer from "@/components/AudioPlayer";
import { HeroSkeleton, TextBlockSkeleton } from "@/components/SkeletonLoaders";

type AnswerState = Record<string, string>;

const SECTION_BADGES: Record<string, { label: string; border: string; badge: string }> = {
  hook: {
    label: "Hook",
    border: "border-l-[oklch(0.75_0.18_55)]",
    badge: "bg-[oklch(0.75_0.18_55_/_0.18)] text-[oklch(0.85_0.18_55)]",
  },
  concept: {
    label: "Core Concept",
    border: "border-l-[oklch(0.65_0.22_200)]",
    badge: "bg-[oklch(0.65_0.22_200_/_0.18)] text-[oklch(0.75_0.22_200)]",
  },
  example: {
    label: "Example",
    border: "border-l-[oklch(0.72_0.18_150)]",
    badge: "bg-[oklch(0.72_0.18_150_/_0.18)] text-[oklch(0.82_0.18_150)]",
  },
  visual_explainer: {
    label: "Visual Explainer",
    border: "border-l-[oklch(0.72_0.20_290)]",
    badge: "bg-[oklch(0.72_0.20_290_/_0.18)] text-[oklch(0.80_0.20_290)]",
  },
  analogy: {
    label: "Analogy",
    border: "border-l-[oklch(0.78_0.16_30)]",
    badge: "bg-[oklch(0.78_0.16_30_/_0.18)] text-[oklch(0.84_0.16_30)]",
  },
  activity: {
    label: "Try It",
    border: "border-l-[oklch(0.78_0.16_30)]",
    badge: "bg-[oklch(0.78_0.16_30_/_0.18)] text-[oklch(0.84_0.16_30)]",
  },
  recap: {
    label: "Recap",
    border: "border-l-[oklch(0.75_0.18_55)]",
    badge: "bg-[oklch(0.75_0.18_55_/_0.18)] text-[oklch(0.85_0.18_55)]",
  },
};

export default function LessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const [, setLocation] = useLocation();
  const { addXP, cookieId } = usePersonalization();

  const [questionText, setQuestionText] = useState("");
  const [answers, setAnswers] = useState<AnswerState>({});
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioOverview, setAudioOverview] = useState<{ audioUrl: string; transcript?: string; durationSeconds?: number } | null>(null);
  const [isBootstrappingSections, setIsBootstrappingSections] = useState(false);
  const [exploreTopic, setExploreTopic] = useState("");
  const videoRequestsRef = useRef<Set<string>>(new Set());

  const parsedLessonId = Number.parseInt(lessonId || "0", 10);

  const lessonBundleQuery = trpc.lesson.getLessonWithSections.useQuery(
    { lessonId: parsedLessonId, cookieId: cookieId || undefined },
    { enabled: !!parsedLessonId }
  );

  const fallbackLessonQuery = trpc.ai.getLesson.useQuery(
    { lessonId: parsedLessonId },
    { enabled: !!parsedLessonId && !lessonBundleQuery.data?.lesson }
  );

  const qaQuery = trpc.ai.getLessonQA.useQuery(
    { lessonId: parsedLessonId },
    { enabled: !!parsedLessonId }
  );

  const askQuestion = trpc.ai.askLessonQuestion.useMutation({
    onSuccess: () => {
      setQuestionText("");
      qaQuery.refetch();
      toast.success("Question submitted.");
    },
    onError: (err) => toast.error(err.message),
  });

  const exploreOffTopic = trpc.ai.exploreOffTopic.useMutation({
    onSuccess: (newLesson) => {
      if (newLesson?.id) {
        toast.success("New lesson generated.");
        setLocation(`/lesson/${newLesson.id}`);
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const generateAudio = trpc.lesson.generateAudioOverview.useMutation({
    onSuccess: (data) => {
      setIsGeneratingAudio(false);
      if (data.success && data.audioUrl) {
        setAudioOverview({
          audioUrl: data.audioUrl,
          transcript: data.transcript ?? undefined,
          durationSeconds: data.durationSeconds ?? undefined,
        });
        toast.success("Audio overview is ready.");
      } else {
        toast.error(data.error ?? "Audio generation failed.");
      }
    },
    onError: () => {
      setIsGeneratingAudio(false);
      toast.error("Audio generation failed.");
    },
  });

  const blueprintMutation = trpc.lesson.blueprintLesson.useMutation();
  const generateSectionsMutation = trpc.lesson.generateLessonSections.useMutation();

  const generateSectionImage = trpc.lesson.generateSectionImage.useMutation({
    onSuccess: () => lessonBundleQuery.refetch(),
  });
  const generateSectionVideo = trpc.lesson.generateSectionVideo.useMutation({
    onSuccess: () => lessonBundleQuery.refetch(),
  });

  const submitRetrieval = trpc.lesson.submitRetrievalAnswer.useMutation({
    onSuccess: (data) => {
      toast.success(data.correct ? "Correct. Section unlocked." : data.feedback || "Saved. Keep going.");
      lessonBundleQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const completeLesson = trpc.lesson.completeLesson.useMutation({
    onSuccess: (data) => {
      addXP(50);
      toast.success("Lesson completed. Flashcards scheduled.");
      if (data.synthesis) {
        toast.message("Personalized synthesis generated.");
      }
      lessonBundleQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const lesson = (lessonBundleQuery.data?.lesson ?? fallbackLessonQuery.data) as any;
  const sections = (lessonBundleQuery.data?.sections ?? []) as any[];
  const completions = (lessonBundleQuery.data?.completions ?? []) as any[];

  const completedSectionIds = useMemo(() => new Set(completions.map((c) => c.sectionId)), [completions]);
  const completionPct = sections.length > 0
    ? Math.round((completedSectionIds.size / sections.length) * 100)
    : lesson?.completed ? 100 : 0;

  useEffect(() => {
    if (!cookieId || !lesson || isBootstrappingSections || sections.length > 0) return;
    if (lesson.completed) return;

    let cancelled = false;

    async function bootstrapSections() {
      try {
        setIsBootstrappingSections(true);
        const bp = await blueprintMutation.mutateAsync({
          lessonId: lesson.id,
          cookieId,
          topic: lesson.title,
          depth: 3,
        });
        if (cancelled) return;
        await generateSectionsMutation.mutateAsync({
          lessonId: lesson.id,
          blueprintId: bp.blueprintId,
          cookieId,
        });
        if (cancelled) return;
        await lessonBundleQuery.refetch();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to build structured lesson.";
        toast.error(message);
      } finally {
        if (!cancelled) setIsBootstrappingSections(false);
      }
    }

    bootstrapSections();
    return () => {
      cancelled = true;
    };
  }, [cookieId, lesson, sections.length, isBootstrappingSections]);

  useEffect(() => {
    if (!sections.length || !cookieId || generateSectionImage.isPending) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const sectionId = (entry.target as HTMLElement).dataset.sectionId;
          if (!sectionId) return;
          const section = sections.find((s) => s.id === sectionId);
          if (!section) return;

          setActiveSectionId(sectionId);

          if (!section.imageUrl && section.visualAsset && section.visualAsset !== "none") {
            generateSectionImage.mutate({
              sectionId,
              cookieId,
              lessonTitle: lesson?.title || "Lesson",
              sectionTitle: section.title,
              sectionContent: String(section.content || "").slice(0, 600),
              assetType: section.visualAsset,
            });
          }

          const shouldHaveVideo = section.type === "concept" || section.type === "visual_explainer";
          if (shouldHaveVideo && !section.videoUrl && !section.videoGeneratedAt && !videoRequestsRef.current.has(sectionId)) {
            videoRequestsRef.current.add(sectionId);
            generateSectionVideo.mutate({
              sectionId,
              cookieId,
              conceptPrompt: `Generate a 45-second visual explainer for "${section.title}" in lesson "${lesson?.title || "Lesson"}".`,
            });
          }
        });
      },
      { threshold: 0.35 }
    );

    sections.forEach((s) => {
      const el = document.getElementById(`lesson-section-${s.id}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections, cookieId, lesson?.title]);

  const isLoading = lessonBundleQuery.isLoading || fallbackLessonQuery.isLoading;
  if (isLoading) {
    return (
      <PageWrapper pageName="Lesson">
        <div className="max-w-6xl mx-auto py-12 px-4">
          <HeroSkeleton />
          <div className="mt-8"><TextBlockSkeleton lines={7} /></div>
        </div>
      </PageWrapper>
    );
  }

  if (!lesson) {
    return (
      <PageWrapper pageName="Lesson">
        <div className="max-w-3xl mx-auto py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Lesson not found</h1>
          <button
            onClick={() => setLocation("/learn")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[oklch(0.75_0.18_55)] text-black font-medium"
          >
            <ArrowLeft size={16} /> Back to Learn
          </button>
        </div>
      </PageWrapper>
    );
  }

  const hasStructuredSections = sections.length > 0;

  return (
    <PageWrapper pageName="Lesson">
      <div className="max-w-7xl mx-auto py-6 px-4">
        <button
          onClick={() => setLocation("/learn")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-5"
        >
          <ArrowLeft size={16} /> Back to Learn
        </button>

        <div className="glass rounded-2xl border border-white/8 overflow-hidden mb-6">
          <div className="p-6 md:p-8">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">{lesson.title}</h1>
                <p className="text-muted-foreground">{lesson.description}</p>
              </div>
              <button
                onClick={() => {
                  if (!cookieId) return;
                  setIsGeneratingAudio(true);
                  generateAudio.mutate({ cookieId, lessonId: lesson.id });
                }}
                disabled={isGeneratingAudio || !!audioOverview}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[oklch(0.65_0.22_200_/_0.12)] border border-[oklch(0.65_0.22_200_/_0.3)] text-xs font-medium text-[oklch(0.75_0.22_200)] disabled:opacity-50"
              >
                {isGeneratingAudio ? <Loader2 size={13} className="animate-spin" /> : <Volume2 size={13} />}
                {isGeneratingAudio ? "Generating" : audioOverview ? "Audio Ready" : "Audio Overview"}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-5">
              <span className="inline-flex items-center gap-1.5"><Clock size={14} /> {lesson.estimatedMinutes || 20} min</span>
              <span className="inline-flex items-center gap-1.5"><BookOpen size={14} /> {lesson.difficulty || "intermediate"}</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 size={14} /> {completedSectionIds.size}/{sections.length || 1} checkpoints</span>
            </div>

            <div className="w-full bg-white/6 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[oklch(0.75_0.18_55)] to-[oklch(0.65_0.22_200)]" style={{ width: `${completionPct}%` }} />
            </div>
            <div className="text-xs text-muted-foreground mt-2">Progress based on retrieval checkpoints: {completionPct}%</div>
          </div>

          {!hasStructuredSections && !isBootstrappingSections && (
            <div className="px-6 pb-6 text-sm text-muted-foreground">
              Structured sections are not available for this lesson yet. A fallback text lesson is shown below.
            </div>
          )}
          {isBootstrappingSections && (
            <div className="px-6 pb-6 text-sm text-[oklch(0.75_0.18_55)] inline-flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> Building your section-by-section lesson blueprint...
            </div>
          )}
        </div>

        {audioOverview && (
          <div className="mb-6">
            <AudioPlayer
              audioUrl={audioOverview.audioUrl}
              transcript={audioOverview.transcript}
              durationSeconds={audioOverview.durationSeconds}
              title={lesson.title}
            />
          </div>
        )}

        {!hasStructuredSections && (
          <div className="glass rounded-2xl border border-white/8 p-8 mb-8">
            <div className="prose prose-invert max-w-none">
              <Streamdown>{lesson.content}</Streamdown>
            </div>
          </div>
        )}

        {hasStructuredSections && (
          <div className="grid grid-cols-1 xl:grid-cols-[240px_1fr_320px] gap-5">
            <aside className="hidden xl:block sticky top-24 h-fit glass rounded-2xl border border-white/8 p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Section Navigator</h3>
              <div className="space-y-2">
                {sections.map((section, idx) => {
                  const done = completedSectionIds.has(section.id);
                  const isActive = activeSectionId === section.id;
                  const badge = SECTION_BADGES[section.type] ?? SECTION_BADGES.concept;
                  return (
                    <button
                      key={section.id}
                      onClick={() => {
                        document.getElementById(`lesson-section-${section.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
                      }}
                      className={`w-full text-left rounded-xl border px-3 py-2 transition-colors ${
                        isActive ? "border-[oklch(0.75_0.18_55_/_0.5)] bg-white/10" : "border-white/10 bg-white/4 hover:bg-white/8"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">{idx + 1}</span>
                        {done ? <CheckCircle2 size={13} className="text-[oklch(0.72_0.18_150)]" /> : <ChevronRight size={13} className="text-muted-foreground" />}
                      </div>
                      <div className="text-sm font-medium text-foreground line-clamp-2">{section.title}</div>
                      <div className="text-[11px] text-muted-foreground mt-1">{badge.label}</div>
                    </button>
                  );
                })}
              </div>
            </aside>

            <main className="space-y-5">
              {sections.map((section) => {
                const done = completedSectionIds.has(section.id);
                const badge = SECTION_BADGES[section.type] ?? SECTION_BADGES.concept;
                const currentAnswer = answers[section.id] ?? "";
                const options = Array.isArray(section.questionOptions) ? section.questionOptions : [];
                return (
                  <article
                    key={section.id}
                    id={`lesson-section-${section.id}`}
                    data-section-id={section.id}
                    className={`glass rounded-2xl border border-white/8 border-l-4 p-6 ${badge.border}`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${badge.badge}`}>{badge.label}</span>
                      {done && <span className="inline-flex items-center gap-1 text-xs text-[oklch(0.72_0.18_150)]"><CheckCircle2 size={12} /> Completed</span>}
                    </div>

                    <h2 className="text-xl font-semibold text-foreground mb-3">{section.title}</h2>

                    {section.imageUrl && (
                      <div className="mb-4 rounded-xl overflow-hidden border border-white/8">
                        <img src={section.imageUrl} alt={section.title} className="w-full h-auto" />
                      </div>
                    )}

                    {section.svgContent && (
                      <div className="mb-4 rounded-xl overflow-hidden border border-white/8 bg-[oklch(0.23_0.02_250)] p-3" dangerouslySetInnerHTML={{ __html: section.svgContent }} />
                    )}

                    {!section.imageUrl && section.visualAsset !== "none" && (
                      <div className="mb-4 h-44 rounded-xl border border-white/8 bg-white/4 animate-pulse" />
                    )}

                    {section.videoUrl && (
                      <div className="mb-4 rounded-xl overflow-hidden border border-white/8 bg-black">
                        <video controls className="w-full h-auto" src={section.videoUrl} />
                      </div>
                    )}
                    {!section.videoUrl && (section.type === "concept" || section.type === "visual_explainer") && section.videoGeneratedAt && (
                      <div className="mb-4 rounded-xl border border-white/8 bg-white/4 p-3 text-xs text-muted-foreground">
                        Video generation started. Reload in a moment if it does not appear automatically.
                      </div>
                    )}

                    <div className="prose prose-invert max-w-none mb-5">
                      <Streamdown>{section.content}</Streamdown>
                    </div>

                    <div className="rounded-xl border border-[oklch(0.65_0.22_200_/_0.3)] bg-[oklch(0.65_0.22_200_/_0.08)] p-4">
                      <div className="text-xs uppercase tracking-wider text-[oklch(0.75_0.22_200)] mb-2">Retrieval Checkpoint</div>
                      <p className="text-sm text-foreground mb-3">{section.retrievalQuestion}</p>

                      {options.length > 0 ? (
                        <div className="space-y-2 mb-3">
                          {options.map((opt: string) => (
                            <label key={opt} className="flex items-start gap-2 text-sm text-muted-foreground">
                              <input
                                type="radio"
                                name={`q-${section.id}`}
                                checked={currentAnswer === opt}
                                onChange={() => setAnswers((prev) => ({ ...prev, [section.id]: opt }))}
                                className="mt-1"
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      ) : (
                        <textarea
                          value={currentAnswer}
                          onChange={(e) => setAnswers((prev) => ({ ...prev, [section.id]: e.target.value }))}
                          placeholder="Type your answer"
                          rows={3}
                          className="w-full mb-3 bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-[oklch(0.75_0.18_55_/_0.5)]"
                        />
                      )}

                      <button
                        disabled={done || !currentAnswer.trim() || submitRetrieval.isPending || !cookieId}
                        onClick={() => {
                          if (!cookieId) return;
                          submitRetrieval.mutate({
                            lessonId: lesson.id,
                            sectionId: section.id,
                            cookieId,
                            answer: currentAnswer,
                            questionType: section.questionType || undefined,
                          });
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[oklch(0.75_0.18_55)] text-black text-sm font-semibold disabled:opacity-50"
                      >
                        {submitRetrieval.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        {done ? "Completed" : "Submit Answer"}
                      </button>
                    </div>
                  </article>
                );
              })}

              {!lesson.completed && (
                <button
                  disabled={sections.length > 0 && completedSectionIds.size < sections.length}
                  onClick={() => {
                    if (!cookieId) return;
                    completeLesson.mutate({ lessonId: lesson.id, cookieId });
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[oklch(0.75_0.18_55)] to-[oklch(0.65_0.22_200)] text-black font-semibold disabled:opacity-50"
                >
                  {completeLesson.isPending ? "Completing lesson..." : "Complete Lesson"}
                </button>
              )}
            </main>

            <aside className="space-y-5">
              <div className="glass rounded-2xl border border-white/8 p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3 inline-flex items-center gap-2"><MessageSquare size={14} /> AI Tutor</h3>
                <textarea
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Ask about the current section..."
                  rows={3}
                  className="w-full mb-3 bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-[oklch(0.75_0.18_55_/_0.5)]"
                />
                <button
                  onClick={() => cookieId && askQuestion.mutate({ lessonId: lesson.id, cookieId, question: questionText })}
                  disabled={!questionText.trim() || askQuestion.isPending || !cookieId}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[oklch(0.65_0.22_200)] text-black text-sm font-semibold disabled:opacity-50"
                >
                  {askQuestion.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Ask
                </button>
                {qaQuery.data && qaQuery.data.length > 0 && (
                  <div className="mt-4 space-y-3 max-h-[320px] overflow-y-auto pr-1">
                    {qaQuery.data.slice(0, 5).map((qa, idx) => (
                      <div key={idx} className="rounded-lg border border-white/10 bg-white/4 p-3">
                        <p className="text-xs text-foreground mb-1">Q: {qa.question.question}</p>
                        {qa.answer && <p className="text-xs text-muted-foreground">A: {qa.answer.aiResponse}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="glass rounded-2xl border border-white/8 p-4">
                <h3 className="text-sm font-semibold text-foreground mb-2 inline-flex items-center gap-2"><Compass size={14} /> What's Next</h3>
                <p className="text-xs text-muted-foreground mb-3">Generate a related lesson instantly.</p>
                <input
                  value={exploreTopic}
                  onChange={(e) => setExploreTopic(e.target.value)}
                  placeholder="e.g., Advanced applications"
                  className="w-full mb-3 bg-white/6 border border-white/10 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-[oklch(0.75_0.18_55_/_0.5)]"
                />
                <button
                  onClick={() => cookieId && exploreOffTopic.mutate({ cookieId, currentTopic: lesson.title, relatedTopic: exploreTopic })}
                  disabled={!exploreTopic.trim() || exploreOffTopic.isPending || !cookieId}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-[oklch(0.75_0.18_55)] text-black text-sm font-semibold disabled:opacity-50"
                >
                  {exploreOffTopic.isPending ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />} Generate
                </button>
              </div>
            </aside>
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
