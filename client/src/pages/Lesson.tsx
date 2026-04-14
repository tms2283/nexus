import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Clock, BookOpen, Loader2, Send, ExternalLink, ThumbsUp, Compass, Star, Volume2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { usePersonalization } from "@/contexts/PersonalizationContext";
import PageWrapper from "@/components/PageWrapper";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import { useEffect } from "react";
import { HeroSkeleton, TextBlockSkeleton } from "@/components/SkeletonLoaders";
import AudioPlayer from "@/components/AudioPlayer";

export default function LessonPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const [, setLocation] = useLocation();
  const { addXP, cookieId } = usePersonalization();
  const [isCompleting, setIsCompleting] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [isAskingQuestion, setIsAskingQuestion] = useState(false);
  const [helpfulAnswers, setHelpfulAnswers] = useState<Set<number>>(new Set());
  const [showExploreModal, setShowExploreModal] = useState(false);
  const [exploreTopic, setExploreTopic] = useState("");
  const [isExploring, setIsExploring] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("excellent");
  const [showRatingForm, setShowRatingForm] = useState(false);
  const [timeSpentSeconds, setTimeSpentSeconds] = useState(0);
  const [startTime] = useState(Date.now());
  const [audioOverview, setAudioOverview] = useState<{ audioUrl: string; transcript?: string; durationSeconds?: number } | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);

  const generateAudio = trpc.lesson.generateAudioOverview.useMutation({
    onSuccess: (data) => {
      setIsGeneratingAudio(false);
      if (data.success && data.audioUrl) {
        setAudioOverview({ audioUrl: data.audioUrl, transcript: data.transcript ?? undefined, durationSeconds: data.durationSeconds ?? undefined });
        toast.success("+20 XP — Audio overview generated!");
      } else {
        toast.error(data.error ?? "Audio generation failed.");
      }
    },
    onError: () => { setIsGeneratingAudio(false); toast.error("Audio generation failed."); },
  });

  const lessonQuery = trpc.ai.getLesson.useQuery(
    { lessonId: parseInt(lessonId || "0") },
    { enabled: !!lessonId }
  );

  const qaQuery = trpc.ai.getLessonQA.useQuery(
    { lessonId: parseInt(lessonId || "0") },
    { enabled: !!lessonId }
  );

  const askQuestion = trpc.ai.askLessonQuestion.useMutation({
    onSuccess: () => {
      toast.success("Question submitted! AI is generating an answer...");
      setQuestionText("");
      setIsAskingQuestion(false);
      qaQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message);
      setIsAskingQuestion(false);
    },
  });

  const markHelpful = trpc.ai.markAnswerHelpful.useMutation({
    onSuccess: () => {
      toast.success("Thanks for the feedback!");
    },
  });

  const ratingMutation = trpc.lesson.rateLessonAndFeedback.useMutation({
    onSuccess: () => {
      toast.success("Thank you for your feedback!");
      setShowRatingForm(false);
      setFeedbackText("");
      setUserRating(null);
    },
  });

  const statsQuery = trpc.lesson.getLessonStats.useQuery(
    { lessonId: parseInt(lessonId || "0") },
    { enabled: !!lessonId }
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeSpentSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const exploreOffTopic = trpc.ai.exploreOffTopic.useMutation({
    onSuccess: (newLesson) => {
      if (newLesson?.id) {
        toast.success("New lesson created! Navigating...");
        setTimeout(() => setLocation(`/lesson/${newLesson.id}`), 1000);
      }
    },
    onError: (err) => {
      toast.error(err.message);
      setIsExploring(false);
    },
  });

  const completeLesson = trpc.ai.completeLesson.useMutation({
    onSuccess: () => {
      toast.success("+25 XP — Lesson completed!");
      addXP(25);
      setIsCompleting(false);
      setTimeout(() => setLocation("/learn"), 1500);
    },
    onError: (err) => {
      toast.error(err.message);
      setIsCompleting(false);
    },
  });

  const handleComplete = () => {
    if (!lessonQuery.data || !cookieId) return;
    setIsCompleting(true);
    completeLesson.mutate({ lessonId: lessonQuery.data.id, cookieId });
  };

  const handleAskQuestion = () => {
    if (!questionText.trim() || !lessonQuery.data || !cookieId) return;
    setIsAskingQuestion(true);
    askQuestion.mutate({
      lessonId: lessonQuery.data.id,
      cookieId,
      question: questionText,
    });
  };

  const handleMarkHelpful = (answerId: number) => {
    if (helpfulAnswers.has(answerId)) return;
    setHelpfulAnswers(new Set([...Array.from(helpfulAnswers), answerId]));
    markHelpful.mutate({ answerId });
  };

  const handleExploreOffTopic = () => {
    if (!exploreTopic.trim() || !lessonQuery.data || !cookieId) return;
    setIsExploring(true);
    exploreOffTopic.mutate({
      cookieId,
      currentTopic: lessonQuery.data.title,
      relatedTopic: exploreTopic,
    });
  };

  if (lessonQuery.isLoading) {
    return (
      <PageWrapper pageName="Lesson">
        <div className="max-w-4xl mx-auto py-12">
          <HeroSkeleton />
          <div className="mt-12">
            <TextBlockSkeleton lines={5} />
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (!lessonQuery.data) {
    return (
      <PageWrapper pageName="Lesson">
        <div className="max-w-4xl mx-auto py-12 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Lesson not found</h1>
          <button
            onClick={() => setLocation("/learn")}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[oklch(0.75_0.18_55)] text-black font-medium hover:opacity-90 transition-opacity"
          >
            <ArrowLeft size={16} /> Back to Learn
          </button>
        </div>
      </PageWrapper>
    );
  }

  const lesson = lessonQuery.data;

  return (
    <PageWrapper pageName="Lesson">
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => setLocation("/learn")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft size={16} /> Back to Curriculum
          </button>

          <div className="glass rounded-2xl p-8 border border-white/8">
            <div className="flex items-start justify-between gap-4 mb-3">
              <h1 className="text-3xl font-bold text-foreground">{lesson.title}</h1>
              <motion.button
                onClick={() => {
                  if (!cookieId) return;
                  setIsGeneratingAudio(true);
                  generateAudio.mutate({ cookieId, lessonId: lesson.id });
                }}
                disabled={isGeneratingAudio || !!audioOverview}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[oklch(0.65_0.22_200_/_0.12)] border border-[oklch(0.65_0.22_200_/_0.3)] text-xs font-medium text-[oklch(0.75_0.22_200)] disabled:opacity-50 hover:bg-[oklch(0.65_0.22_200_/_0.2)] transition-colors flex-shrink-0"
                title="Generate a podcast-style audio overview of this lesson"
              >
                {isGeneratingAudio ? <Loader2 size={13} className="animate-spin" /> : <Volume2 size={13} />}
                {isGeneratingAudio ? "Generating…" : audioOverview ? "Audio Ready" : "Audio Overview"}
              </motion.button>
            </div>
            <p className="text-muted-foreground mb-6">{lesson.description}</p>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {lesson.estimatedMinutes && (
                <div className="flex items-center gap-2">
                  <Clock size={14} />
                  {lesson.estimatedMinutes} minutes
                </div>
              )}
              {lesson.difficulty && (
                <div className="flex items-center gap-2">
                  <BookOpen size={14} />
                  {lesson.difficulty.charAt(0).toUpperCase() + lesson.difficulty.slice(1)} level
                </div>
              )}
              {lesson.completed && (
                <div className="flex items-center gap-2 text-[oklch(0.65_0.22_200)]">
                  <CheckCircle2 size={14} />
                  Completed
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Learning Objectives */}
        {lesson.objectives && lesson.objectives.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8 glass rounded-2xl p-6 border border-white/8"
          >
            <h2 className="text-lg font-semibold text-foreground mb-4">Learning Objectives</h2>
            <ul className="space-y-2">
              {lesson.objectives.map((obj, i) => (
                <li key={i} className="flex items-start gap-3 text-muted-foreground">
                  <span className="w-5 h-5 rounded-full bg-[oklch(0.75_0.18_55_/_0.2)] flex items-center justify-center text-xs font-bold text-[oklch(0.75_0.18_55)] shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span>{obj}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Audio Overview Player */}
        {audioOverview && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <AudioPlayer
              audioUrl={audioOverview.audioUrl}
              transcript={audioOverview.transcript}
              durationSeconds={audioOverview.durationSeconds}
              title={lesson.title}
            />
          </motion.div>
        )}

        {/* Lesson Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8 glass rounded-2xl p-8 border border-white/8"
        >
          <div className="prose prose-invert max-w-none">
            <Streamdown>{lesson.content}</Streamdown>
          </div>
        </motion.div>

        {/* External Resources */}
        {lesson.externalResources && lesson.externalResources.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8 glass rounded-2xl p-6 border border-white/8"
          >
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <ExternalLink size={18} /> Further Resources
            </h2>
            <div className="space-y-3">
              {lesson.externalResources.map((resource, i) => (
                <a
                  key={i}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 rounded-lg bg-white/3 border border-white/8 hover:border-[oklch(0.75_0.18_55_/_0.5)] transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-foreground group-hover:text-[oklch(0.75_0.18_55)] transition-colors">
                        {resource.title}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{resource.source}</div>
                      {resource.description && (
                        <div className="text-sm text-muted-foreground mt-2">{resource.description}</div>
                      )}
                    </div>
                    <ExternalLink size={16} className="text-muted-foreground group-hover:text-[oklch(0.75_0.18_55)] transition-colors mt-1 shrink-0" />
                  </div>
                </a>
              ))}
            </div>
          </motion.div>
        )}

        {/* Key Points */}
        {lesson.keyPoints && lesson.keyPoints.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8 glass rounded-2xl p-6 border border-white/8"
          >
            <h2 className="text-lg font-semibold text-foreground mb-4">Key Takeaways</h2>
            <ul className="space-y-2">
              {lesson.keyPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-3 text-muted-foreground">
                  <span className="text-[oklch(0.65_0.22_200)] mt-1">✓</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Q&A Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8 glass rounded-2xl p-6 border border-white/8"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">Ask Questions</h2>
          
          {/* Question Input */}
          <div className="mb-6 p-4 rounded-lg bg-white/3 border border-white/8">
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Ask a question about this lesson..."
              className="w-full bg-transparent text-foreground placeholder-muted-foreground border-0 focus:outline-none resize-none"
              rows={3}
            />
            <div className="flex justify-end mt-3">
              <button
                onClick={handleAskQuestion}
                disabled={!questionText.trim() || isAskingQuestion}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[oklch(0.75_0.18_55)] text-black font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                {isAskingQuestion ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Generating answer...
                  </>
                ) : (
                  <>
                    <Send size={14} /> Ask
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Q&A Thread */}
          {qaQuery.data && qaQuery.data.length > 0 && (
            <div className="space-y-4">
              {qaQuery.data.map((qa, i) => (
                <div key={i} className="p-4 rounded-lg bg-white/3 border border-white/8">
                  <div className="mb-3">
                    <p className="font-medium text-foreground">Q: {qa.question.question}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Asked {new Date(qa.question.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {qa.answer && (
                    <div className="pl-4 border-l-2 border-[oklch(0.75_0.18_55_/_0.3)]">
                      <p className="text-sm text-muted-foreground mb-3">
                        <span className="text-[oklch(0.75_0.18_55)] font-medium">A:</span> {qa.answer.aiResponse}
                      </p>
                      <button
                        onClick={() => handleMarkHelpful(qa.answer!.id)}
                        disabled={helpfulAnswers.has(qa.answer!.id)}
                        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-[oklch(0.65_0.22_200)] transition-colors disabled:opacity-50"
                      >
                        <ThumbsUp size={12} /> Helpful ({qa.answer.helpfulCount + (helpfulAnswers.has(qa.answer.id) ? 1 : 0)})
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Explore Related Topic */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-8 glass rounded-2xl p-6 border border-white/8"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Compass size={18} /> Explore Related Topics
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            Curious about a related topic? Enter a topic and we'll generate a new lesson for you.
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              value={exploreTopic}
              onChange={(e) => setExploreTopic(e.target.value)}
              placeholder="e.g., Applications of this concept..."
              className="flex-1 px-4 py-2 rounded-lg bg-white/3 border border-white/8 text-foreground placeholder-muted-foreground focus:outline-none focus:border-[oklch(0.75_0.18_55_/_0.5)]"
            />
            <button
              onClick={handleExploreOffTopic}
              disabled={!exploreTopic.trim() || isExploring}
              className="px-4 py-2 rounded-lg bg-[oklch(0.65_0.22_200)] text-black font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              {isExploring ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <Compass size={14} /> Explore
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Complete Button */}
        {!lesson.completed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="flex gap-4"
          >
            <button
              onClick={handleComplete}
              disabled={isCompleting}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[oklch(0.75_0.18_55)] to-[oklch(0.65_0.22_200)] text-black font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              {isCompleting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Marking complete...
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} /> Mark as Complete
                </>
              )}
            </button>
            <button
              onClick={() => setLocation("/learn")}
              className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground font-semibold hover:bg-white/10 transition-colors"
            >
              Skip for now
            </button>
          </motion.div>
        )}
      </div>
    </PageWrapper>
  );
}
