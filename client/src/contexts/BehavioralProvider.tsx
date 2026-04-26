import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { BehavioralTracker } from '../components/behavioral/BehavioralTracker';

interface LiveInsight {
  type: string;
  message: string;
  confidence: number;
  data?: any;
}

interface BehavioralContextType {
  liveInsights: LiveInsight[];
  latestInsight: LiveInsight | null;
  isConnected: boolean;
}

const BehavioralContext = createContext<BehavioralContextType>({
  liveInsights: [],
  latestInsight: null,
  isConnected: false,
});

export const useBehavioralContext = () => useContext(BehavioralContext);

export function BehavioralProvider({ children }: { children: ReactNode }) {
  const [liveInsights, setLiveInsights] = useState<LiveInsight[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // In production, this would be an environment variable.
    // Assuming PBSP is deployed alongside Nexus on the VPS or via an API gateway.
    const wsUrl = import.meta.env.VITE_PBSP_WS_URL || 'ws://localhost:8002/api/ws/live';
    
    // Add user_id or session token if auth is implemented
    const ws = new WebSocket(`${wsUrl}?user_id=nexus_user_id`);

    ws.onopen = () => setIsConnected(true);
    
    ws.onclose = () => setIsConnected(false);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && data.type) {
          const insight: LiveInsight = {
            type: data.type,
            message: data.message || '',
            confidence: data.confidence || 1.0,
            data: data
          };
          
          setLiveInsights(prev => [insight, ...prev].slice(0, 50)); // keep last 50
          
          // Optionally trigger global toast notifications or UI hints based on insight type
          if (insight.type === 'HIGH_STRUGGLE_DETECTED') {
            // TODO: toast.info("Are you stuck? Try reviewing the previous section.");
          }
        }
      } catch (e) {
        console.error("Failed to parse behavioral WS message", e);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <BehavioralContext.Provider value={{ liveInsights, latestInsight: liveInsights[0] || null, isConnected }}>
      {/* Invisible tracker attached globally */}
      <BehavioralTracker />
      {children}
    </BehavioralContext.Provider>
  );
}
