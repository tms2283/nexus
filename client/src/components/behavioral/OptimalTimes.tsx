import React from 'react';
import { trpc } from '../../lib/trpc';
import { Clock, Zap } from 'lucide-react';

export function OptimalTimes() {
  const { data, isLoading, error } = trpc.behavioral.getOptimalTimes.useQuery();
  
  if (isLoading) return <div className="animate-pulse bg-slate-800 rounded-xl h-48 w-full" />;
  if (error || !data || data.optimal_times.length === 0) return null;

  // Find the highest probability for scaling the UI
  const maxProb = Math.max(...data.optimal_times.map(t => t.focus_probability));

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-32 bg-amber-500/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2 group-hover:bg-amber-500/10 transition-colors duration-700" />
      
      <div className="relative z-10">
        <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
          <Clock className="w-6 h-6 text-amber-400" />
          Peak Focus Windows
        </h3>
        <p className="text-sm text-slate-400 mb-6">
          Based on your behavioral history, you learn most effectively during these hours.
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data.optimal_times.slice(0, 4).map((time, idx) => {
            const formatHour = (hour: number) => {
              const ampm = hour >= 12 ? 'PM' : 'AM';
              const h = hour % 12 || 12;
              return `${h}:00 ${ampm}`;
            };
            
            const intensityScale = time.focus_probability / maxProb;
            
            return (
              <div 
                key={`${time.day}-${time.hour}-${idx}`} 
                className="bg-slate-800/80 backdrop-blur-sm border border-slate-700/50 rounded-lg p-4 flex flex-col items-center justify-center relative overflow-hidden group-hover:border-amber-500/30 transition-colors"
              >
                <div 
                  className="absolute bottom-0 left-0 w-full bg-amber-500/20 transition-all duration-1000"
                  style={{ height: `${intensityScale * 100}%` }}
                />
                <Zap 
                  className={`w-5 h-5 mb-2 relative z-10 ${intensityScale > 0.8 ? 'text-amber-400' : 'text-slate-500'}`} 
                />
                <span className="text-white font-medium relative z-10">
                  {formatHour(time.hour)}
                </span>
                <span className="text-xs text-slate-400 relative z-10 uppercase tracking-wider mt-1">
                  {time.day || 'Any Day'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
