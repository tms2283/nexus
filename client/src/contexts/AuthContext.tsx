import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

export interface AuthUser {
  id: number;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  role: "user" | "admin";
  onboardingCompleted: boolean;
  emailVerified: boolean;
  loginMethod: string | null;
  createdAt: Date;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  isLoading: boolean;
  continueAsGuest: () => void;
  logout: () => void;
  setUser: (user: AuthUser | null) => void;
  refreshUser: () => Promise<AuthUser | null>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isGuest: false,
  isLoading: true,
  continueAsGuest: () => {},
  logout: () => {},
  setUser: () => {},
  refreshUser: async () => null,
});

const GUEST_KEY = "nexus_guest_mode";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      setUser(null);
      setIsGuest(false);
      localStorage.removeItem(GUEST_KEY);
      setLocation("/");
    },
  });

  useEffect(() => {
    if (meQuery.isLoading) return;
    if (meQuery.data) {
      setUser(meQuery.data as AuthUser);
      localStorage.removeItem(GUEST_KEY);
    } else {
      // Restore guest mode from localStorage
      if (localStorage.getItem(GUEST_KEY) === "true") setIsGuest(true);
    }
    setIsLoading(false);
  }, [meQuery.data, meQuery.isLoading]);

  const continueAsGuest = useCallback(() => {
    localStorage.setItem(GUEST_KEY, "true");
    setIsGuest(true);
  }, []);

  const logout = useCallback(() => {
    logoutMutation.mutate();
  }, [logoutMutation]);

  const refreshUser = useCallback(async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const result = await meQuery.refetch();
      const nextUser = (result.data ?? null) as AuthUser | null;

      if (nextUser) {
        setUser(nextUser);
        setIsGuest(false);
        localStorage.removeItem(GUEST_KEY);
        return nextUser;
      }

      if (attempt < 2) {
        // Give the browser a beat to persist the auth cookie after OAuth returns.
        await new Promise((resolve) => window.setTimeout(resolve, 250 * (attempt + 1)));
      }
    }

    setUser(null);
    return null;
  }, [meQuery]);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isGuest,
      isLoading,
      continueAsGuest,
      logout,
      setUser,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
