import React from 'react';
import { trpc } from '../lib/trpc';
import { Sparkles, ArrowRight } from 'lucide-react';

export function RecommendedCourses({ availableCourses }: { availableCourses: Array<{id: string, name: string, category: string, difficulty: number, estimated_minutes: number}> }) {
  // Pass available courses to the behavioral recommendation engine
  const { data: recommendations, isLoading, error } = trpc.behavioral.getRecommendations.useQuery(
    { candidates: availableCourses },
    { enabled: availableCourses.length > 0 }
  );

  if (isLoading) return <div className="animate-pulse bg-slate-800 rounded-xl h-32 w-full" />;
  if (error || !recommendations || recommendations.length === 0) return null;

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
                  <h4 className="text-white font-medium text-lg">{rec.candidate_id}</h4>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-medium">
                    {Math.round(rec.match_score * 100)}% Match
                  </span>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {rec.reason}
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
