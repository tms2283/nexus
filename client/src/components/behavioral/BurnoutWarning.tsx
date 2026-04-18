import React from 'react';
import { useBehavioralContext } from '../contexts/BehavioralProvider';
import { trpc } from '../lib/trpc';
import { AlertTriangle, Coffee } from 'lucide-react';

export function BurnoutWarning() {
  const { data: profile } = trpc.behavioral.getProfile.useQuery();
  const { liveInsights } = useBehavioralContext();

  // Determine burnout risk based on profile and recent live insights
  const struggleEvents = liveInsights.filter(i => i.type === 'HIGH_STRUGGLE_DETECTED').length;
  
  const burnoutRisk = (profile?.avg_struggle_score || 0) * 0.7 + (struggleEvents * 0.05);

  if (burnoutRisk < 0.6) return null;

  return (
    <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 flex items-start gap-4 shadow-lg animate-fade-in">
      <div className="bg-orange-500/20 p-2 rounded-lg">
        {burnoutRisk > 0.8 ? (
          <AlertTriangle className="w-6 h-6 text-orange-500 animate-pulse" />
        ) : (
          <Coffee className="w-6 h-6 text-amber-500" />
        )}
      </div>
      
      <div className="flex-1">
        <h4 className="text-orange-400 font-semibold mb-1">
          {burnoutRisk > 0.8 ? "High Cognitive Load Detected" : "Consider a Break"}
        </h4>
        <p className="text-sm text-slate-300 leading-relaxed">
          {burnoutRisk > 0.8 
            ? "Your behavioral markers indicate elevated friction and struggle. Taking a 15-minute break now will improve your long-term retention and focus."
            : "You've been focused for a while and your efficiency might be dipping. A quick stretch or coffee break could help!"}
        </p>
      </div>
      
      <button className="text-sm px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-700">
        Dismiss
      </button>
    </div>
  );
}
