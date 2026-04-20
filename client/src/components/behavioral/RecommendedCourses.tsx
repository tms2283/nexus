import React, { useEffect, useState } from 'react';
import { trpc } from '../../lib/trpc';
import { Sparkles, ArrowRight } from 'lucide-react';

type ContentCandidate = {
  content_id: string;
  title: string;
  topic_tags?: string[];
  difficulty?: number;
  content_type?: "video" | "article" | "quiz" | "exercise" | "lesson";
  estimated_minutes?: number;
  lesson_id?: string | null;
  course_id?: string | null;
};

type RecommendedItem = {
  content_id: string;
  title: string;
  score: number;
  reasons: string[];
  topic_tags: string[];
  difficulty: number;
  content_type: string;
  estimated_minutes: number;
  lesson_id: string | null;
  course_id: string | null;
};

export function RecommendedCourses({ availableCourses }: { availableCourses: ContentCandidate[] }) {
  const [recommendations, setRecommendations] = useState<RecommendedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const recommend = trpc.behavioral.getRecommendations.useMutation();

  useEffect(() => {
    if (availableCourses.length === 0) { setIsLoading(false); return; }
    recommend.mutateAsync({ candidates: availableCourses, top_n: 3 })
      .then(result => setRecommendations((result.recommendations ?? []) as unknown as RecommendedItem[]))
      .catch(() => setRecommendations([]))
      .finally(() => setIsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) return <div className="animate-pulse bg-slate-800 rounded-xl h-32 w-full" />;
  if (recommendations.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-indigo-900/50 to-slate-900 border border-indigo-500/30 rounded-xl p-6 shadow-2xl relative overflow-hidden group">
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay" />
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 blur-3xl rounded-full group-hover:bg-indigo-500/30 transition-all duration-700" />

      <div className="relative z-10">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          AI Curated for Your Learning Style
        </h3>

        <div className="space-y-4">
          {recommendations.slice(0, 3).map((rec, idx) => (
            <div key={idx} className="bg-slate-800/60 backdrop-blur-sm border border-slate-700 hover:border-indigo-500/50 rounded-lg p-4 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-white font-medium text-lg">{rec.title}</h4>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-medium">
                    {Math.round(rec.score * 100)}% Match
                  </span>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {rec.reasons.join(" · ")}
                </p>
              </div>

              <button className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors font-medium text-sm group/btn shrink-0">
                Start Now
                <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
