import React, { createContext, useContext, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { usePersonalization } from "./PersonalizationContext";
import {
  DEFAULT_LEARNER_PROFILE,
  type LearnerProfile,
} from "@shared/types/learnerProfile";

interface LearnerProfileContextValue {
  profile: LearnerProfile;
  isLoaded: boolean;
  refetch: () => void;
}

const Ctx = createContext<LearnerProfileContextValue>({
  profile: DEFAULT_LEARNER_PROFILE,
  isLoaded: false,
  refetch: () => {},
});

export function LearnerProfileProvider({ children }: { children: React.ReactNode }) {
  const { cookieId } = usePersonalization();
  const query = trpc.learner.getProfile.useQuery(
    { cookieId },
    { enabled: !!cookieId, staleTime: 60_000 }
  );

  const value = useMemo<LearnerProfileContextValue>(
    () => ({
      profile: query.data ?? { ...DEFAULT_LEARNER_PROFILE, cookieId },
      isLoaded: query.isFetched,
      refetch: () => {
        void query.refetch();
      },
    }),
    [query.data, query.isFetched, cookieId, query.refetch]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLearnerProfile() {
  return useContext(Ctx);
}
