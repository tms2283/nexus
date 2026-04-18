import React from 'react';
import { trpc } from '../lib/trpc';
import { Brain, Focus, Compass, ShieldAlert, HeartPulse } from 'lucide-react';

export function LearningProfile() {
  const { data: profile, isLoading, error } = trpc.behavioral.getProfile.useQuery({});
  
  if (isLoading) return <div className="animate-pulse bg-slate-800 rounded-xl h-64 w-full" />;
  if (error || !profile) return null;

  const traits = [
    { name: 'Exploration Breadth', value: profile.trait_exploration_breadth, icon: Compass, color: 'text-blue-400', bg: 'bg-blue-500' },
    { name: 'Focus Consistency', value: profile.trait_focus_consistency, icon: Focus, color: 'text-emerald-400', bg: 'bg-emerald-500' },
    { name: 'Social Orientation', value: profile.trait_social_orientation, icon: Brain, color: 'text-purple-400', bg: 'bg-purple-500' },
    { name: 'Friction Tolerance', value: profile.trait_friction_tolerance, icon: ShieldAlert, color: 'text-orange-400', bg: 'bg-orange-500' },
    { name: 'Emotional Volatility', value: profile.trait_emotional_volatility, icon: HeartPulse, color: 'text-rose-400', bg: 'bg-rose-500' },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl overflow-hidden relative group">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      <div className="relative z-10">
        <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <Brain className="w-6 h-6 text-indigo-400" />
          Behavioral Learning Profile
        </h3>
        
        <div className="space-y-5">
          {traits.map((trait) => (
            <div key={trait.name} className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2 text-slate-300">
                  <trait.icon className={`w-4 h-4 ${trait.color}`} />
                  {trait.name}
                </div>
                <span className="text-slate-400 font-mono">
                  {Math.round(trait.value * 100)}%
                </span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${trait.bg} transition-all duration-1000 ease-out rounded-full`}
                  style={{ width: `${trait.value * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        
        {/* Aggregates Summary */}
        <div className="mt-8 pt-6 border-t border-slate-800 grid grid-cols-2 gap-4">
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Avg Focus Score</div>
            <div className="text-2xl font-bold text-emerald-400">
              {Math.round(profile.avg_focus_score * 100)}
            </div>
          </div>
          <div className="bg-slate-800/50 rounded-lg p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Avg Struggle Score</div>
            <div className="text-2xl font-bold text-orange-400">
              {Math.round(profile.avg_struggle_score * 100)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
