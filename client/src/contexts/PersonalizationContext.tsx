import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { nanoid } from "nanoid";

const COOKIE_KEY = "tv_visitor_id";
const COOKIE_EXPIRY_DAYS = 365;

function getCookieId(): string {
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_KEY}=([^;]*)`));
  if (match) return decodeURIComponent(match[1]);
  const id = nanoid(24);
  const expires = new Date(Date.now() + COOKIE_EXPIRY_DAYS * 86400000).toUTCString();
  document.cookie = `${COOKIE_KEY}=${encodeURIComponent(id)}; expires=${expires}; path=/; SameSite=Lax`;
  return id;
}

export interface VisitorProfile {
  cookieId: string;
  visitCount: number;
  pagesVisited: string[];
  interests: string[];
  preferredTopics: string[];
  quizCompleted: boolean;
  quizResults: Record<string, string>;
  xp: number;
  level: number;
  streak: number;
  badges: string[];
  aiInteractions: number;
}

interface PersonalizationContextType {
  profile: VisitorProfile;
  cookieId: string;
  isLoaded: boolean;
  recordVisit: (page: string) => void;
  addXP: (amount: number) => void;
  updateProfile: (updates: Partial<VisitorProfile>) => void;
  newBadges: string[];
  clearNewBadges: () => void;
  xpAnimation: { show: boolean; amount: number };
}

const defaultProfile: VisitorProfile = {
  cookieId: "",
  visitCount: 0,
  pagesVisited: [],
  interests: [],
  preferredTopics: [],
  quizCompleted: false,
  quizResults: {},
  xp: 0,
  level: 1,
  streak: 0,
  badges: [],
  aiInteractions: 0,
};

const PersonalizationContext = createContext<PersonalizationContextType>({
  profile: defaultProfile,
  cookieId: "",
  isLoaded: false,
  recordVisit: () => {},
  addXP: () => {},
  updateProfile: () => {},
  newBadges: [],
  clearNewBadges: () => {},
  xpAnimation: { show: false, amount: 0 },
});

export function PersonalizationProvider({ children }: { children: React.ReactNode }) {
  const [cookieId] = useState(() => getCookieId());
  const [profile, setProfile] = useState<VisitorProfile>({ ...defaultProfile, cookieId });
  const [isLoaded, setIsLoaded] = useState(false);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const [xpAnimation, setXpAnimation] = useState({ show: false, amount: 0 });
  const xpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Use a ref for current XP so recordVisit callback never goes stale
  const xpRef = useRef<number>(0);
  useEffect(() => { xpRef.current = profile.xp; }, [profile.xp]);

  const recordVisitMutation = trpc.visitor.recordVisit.useMutation();
  const addXPMutation = trpc.visitor.addXP.useMutation();

  const { data: serverProfile } = trpc.visitor.getProfile.useQuery(
    { cookieId },
    { enabled: !!cookieId, staleTime: 30000 }
  );

  useEffect(() => {
    if (serverProfile) {
      setProfile({
        cookieId,
        visitCount: serverProfile.visitCount,
        pagesVisited: serverProfile.pagesVisited ?? [],
        interests: serverProfile.interests ?? [],
        preferredTopics: serverProfile.preferredTopics ?? [],
        quizCompleted: serverProfile.quizCompleted,
        quizResults: (serverProfile.quizResults as Record<string, string>) ?? {},
        xp: serverProfile.xp,
        level: serverProfile.level,
        streak: serverProfile.streak,
        badges: serverProfile.badges ?? [],
        aiInteractions: serverProfile.aiInteractions,
      });
      setIsLoaded(true);
    }
  }, [serverProfile, cookieId]);

  const showXPAnimation = useCallback((amount: number) => {
    setXpAnimation({ show: true, amount });
    if (xpTimerRef.current) clearTimeout(xpTimerRef.current);
    xpTimerRef.current = setTimeout(() => setXpAnimation({ show: false, amount: 0 }), 2000);
  }, []);

  const recordVisit = useCallback((page: string) => {
    recordVisitMutation.mutate(
      { cookieId, page },
      {
        onSuccess: (data) => {
          if (data) {
            const xpGain = data.xp - xpRef.current;
            setProfile(prev => ({
              ...prev,
              xp: data.xp,
              level: data.level,
              streak: data.streak,
              visitCount: prev.visitCount + 1,
              pagesVisited: prev.pagesVisited.includes(page) ? prev.pagesVisited : [...prev.pagesVisited, page],
            }));
            if (xpGain > 0) showXPAnimation(xpGain);
            if (data.newBadges && data.newBadges.length > 0) {
              setNewBadges(prev => [...prev, ...data.newBadges]);
            }
          }
        },
      }
    );
  }, [cookieId, recordVisitMutation, showXPAnimation]);

  const addXP = useCallback((amount: number) => {
    addXPMutation.mutate(
      { cookieId, amount },
      {
        onSuccess: (data) => {
          if (data) {
            setProfile(prev => ({ ...prev, xp: data.xp, level: data.level }));
            showXPAnimation(amount);
            if (data.newBadges && data.newBadges.length > 0) {
              setNewBadges(prev => [...prev, ...data.newBadges]);
            }
          }
        },
      }
    );
  }, [cookieId, addXPMutation, showXPAnimation]);

  const updateProfile = useCallback((updates: Partial<VisitorProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  }, []);

  const clearNewBadges = useCallback(() => setNewBadges([]), []);

  return (
    <PersonalizationContext.Provider value={{
      profile, cookieId, isLoaded, recordVisit, addXP,
      updateProfile, newBadges, clearNewBadges, xpAnimation,
    }}>
      {children}
    </PersonalizationContext.Provider>
  );
}

export function usePersonalization() {
  return useContext(PersonalizationContext);
}
