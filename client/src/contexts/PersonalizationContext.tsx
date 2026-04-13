import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { trpc } from "@/lib/trpc";
import { nanoid } from "nanoid";

const COOKIE_KEY = "nexus_visitor_id";
const COOKIE_EXPIRY_DAYS = 365;

function getCookieId(): string | null {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${COOKIE_KEY}=([^;]*)`)
  );
  if (match) return decodeURIComponent(match[1]);
  return null;
}

function generateCookieId(): string {
  return nanoid(24);
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

export function PersonalizationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [initialized, setInitialized] = useState(false);
  const [cookieId, setCookieId] = useState<string>("");
  const [profile, setProfile] = useState<VisitorProfile>(defaultProfile);
  const [isLoaded, setIsLoaded] = useState(false);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  const [xpAnimation, setXpAnimation] = useState({ show: false, amount: 0 });
  const xpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const xpRef = useRef<number>(0);
  useEffect(() => {
    xpRef.current = profile.xp;
  }, [profile.xp]);

  // Initialize visitor - call server to set cookie and get/create profile
  const initMutation = trpc.visitor.init.useMutation();

  useEffect(() => {
    // Try to get existing cookie or initialize new one
    let existingId = getCookieId();
    if (!existingId) {
      existingId = generateCookieId();
      // Set client-side as fallback
      const expires = new Date(
        Date.now() + COOKIE_EXPIRY_DAYS * 86400000
      ).toUTCString();
      document.cookie = `${COOKIE_KEY}=${encodeURIComponent(existingId)}; expires=${expires}; path=/; SameSite=Lax`;
    }
    setCookieId(existingId);

    // Initialize with server (sets httpOnly cookie and ensures profile exists)
    initMutation.mutate(
      { cookieId: existingId },
      {
        onSuccess: data => {
          if (data?.cookieId) {
            setCookieId(data.cookieId);
            setInitialized(true);
          }
        },
        onError: () => {
          // If server init fails, use client-side only
          setInitialized(true);
        },
      }
    );
  }, []);

  const recordVisitMutation = trpc.visitor.recordVisit.useMutation();
  const addXPMutation = trpc.visitor.addXP.useMutation();

  const { data: serverProfile } = trpc.visitor.getProfile.useQuery(undefined, {
    enabled: initialized && !!cookieId,
    staleTime: 30000,
  });

  useEffect(() => {
    if (serverProfile && cookieId) {
      setProfile({
        cookieId,
        visitCount: serverProfile.visitCount,
        pagesVisited: serverProfile.pagesVisited ?? [],
        interests: serverProfile.interests ?? [],
        preferredTopics: serverProfile.preferredTopics ?? [],
        quizCompleted: serverProfile.quizCompleted,
        quizResults:
          (serverProfile.quizResults as Record<string, string>) ?? {},
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
    xpTimerRef.current = setTimeout(
      () => setXpAnimation({ show: false, amount: 0 }),
      2000
    );
  }, []);

  const recordVisit = useCallback(
    (page: string) => {
      recordVisitMutation.mutate(
        { page },
        {
          onSuccess: data => {
            if (data) {
              const xpGain = data.xp - xpRef.current;
              setProfile(prev => ({
                ...prev,
                xp: data.xp,
                level: data.level,
                streak: data.streak,
                visitCount: prev.visitCount + 1,
                pagesVisited: prev.pagesVisited.includes(page)
                  ? prev.pagesVisited
                  : [...prev.pagesVisited, page],
              }));
              if (xpGain > 0) showXPAnimation(xpGain);
              if (data.newBadges && data.newBadges.length > 0) {
                setNewBadges(prev => [...prev, ...data.newBadges]);
              }
            }
          },
        }
      );
    },
    [recordVisitMutation, showXPAnimation]
  );

  const addXP = useCallback(
    (amount: number) => {
      addXPMutation.mutate(
        { amount },
        {
          onSuccess: data => {
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
    },
    [addXPMutation, showXPAnimation]
  );

  const updateProfile = useCallback((updates: Partial<VisitorProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  }, []);

  const clearNewBadges = useCallback(() => setNewBadges([]), []);

  return (
    <PersonalizationContext.Provider
      value={{
        profile,
        cookieId,
        isLoaded,
        recordVisit,
        addXP,
        updateProfile,
        newBadges,
        clearNewBadges,
        xpAnimation,
      }}
    >
      {children}
    </PersonalizationContext.Provider>
  );
}

export function usePersonalization() {
  return useContext(PersonalizationContext);
}
