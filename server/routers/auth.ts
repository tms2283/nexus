import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  createUser, getUserByEmail, getUserById,
  updateUserLastSignedIn, markOnboardingComplete,
  savePsychProfile, getPsychProfile, upsertGoogleUser,
} from "../db";
import {
  hashPassword, verifyPassword, createSessionToken,
  setAuthCookie, clearAuthCookie, getSessionTokenFromRequest, verifySessionToken,
} from "../auth";
import { OAuth2Client } from "google-auth-library";
import { ENV } from "../_core/env";

const googleClient = new OAuth2Client(ENV.googleClientId);

// ─── Input schemas ────────────────────────────────────────────────────────────

const registerSchema = z.object({
  name: z.string().min(1).max(128),
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const onboardingSchema = z.object({
  quizAnswers: z.record(z.string(), z.string()),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inferProfile(answers: Record<string, string>) {
  const bg = answers.q1 ?? "";
  const interest = answers.q2 ?? "";
  const goal = answers.q3 ?? "";
  const style = answers.q4 ?? "";

  const backgroundMap: Record<string, string> = {
    "A": "developer", "B": "designer", "C": "business", "D": "curious learner",
  };
  const interestMap: Record<string, string> = {
    "A": "personalized learning", "B": "AI research", "C": "coding challenges", "D": "knowledge exploration",
  };
  const goalMap: Record<string, string> = {
    "A": "master a technical skill", "B": "understand a topic deeply",
    "C": "stay current with AI trends", "D": "explore broadly",
  };
  const styleMap: Record<string, string> = {
    "A": "deep dives", "B": "visual learning", "C": "Socratic discovery", "D": "hands-on building",
  };

  return {
    inferredBackground: backgroundMap[bg.charAt(0).toUpperCase()] ?? "curious learner",
    inferredInterests: [interestMap[interest.charAt(0).toUpperCase()] ?? "learning"].filter(Boolean),
    inferredGoal: goalMap[goal.charAt(0).toUpperCase()] ?? "explore broadly",
    inferredLearnStyle: styleMap[style.charAt(0).toUpperCase()] ?? "deep dives",
  };
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const authRouter = router({
  // Get current logged-in user (called on app load)
  me: publicProcedure.query(async ({ ctx }) => {
    const token = getSessionTokenFromRequest(ctx.req);
    if (!token) return null;
    const payload = verifySessionToken(token);
    if (!payload) return null;
    const user = await getUserById(payload.userId);
    if (!user) return null;
    // Never expose passwordHash
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }),

  // Email/password registration
  register: publicProcedure.input(registerSchema).mutation(async ({ input, ctx }) => {
    const existing = await getUserByEmail(input.email);
    if (existing) {
      throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists." });
    }
    const passwordHash = await hashPassword(input.password);
    const user = await createUser({
      email: input.email,
      passwordHash,
      name: input.name,
      loginMethod: "email",
    });
    if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create account." });
    const token = createSessionToken({ userId: user.id, email: user.email ?? null });
    setAuthCookie(ctx.res, token);
    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser };
  }),

  // Email/password login
  login: publicProcedure.input(loginSchema).mutation(async ({ input, ctx }) => {
    const user = await getUserByEmail(input.email);
    if (!user || !user.passwordHash) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
    }
    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
    }
    await updateUserLastSignedIn(user.id);
    const token = createSessionToken({ userId: user.id, email: user.email ?? null });
    setAuthCookie(ctx.res, token);
    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser };
  }),

  // Logout
  logout: publicProcedure.mutation(async ({ ctx }) => {
    clearAuthCookie(ctx.res);
    return { success: true };
  }),

  // Complete onboarding quiz — saves psych profile, marks onboarding done
  completeOnboarding: publicProcedure.input(onboardingSchema).mutation(async ({ input, ctx }) => {
    const token = getSessionTokenFromRequest(ctx.req);
    if (!token) throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in." });
    const payload = verifySessionToken(token);
    if (!payload) throw new TRPCError({ code: "UNAUTHORIZED", message: "Session expired." });

    const inferred = inferProfile(input.quizAnswers);
    await savePsychProfile(payload.userId, { quizAnswers: input.quizAnswers, ...inferred });
    await markOnboardingComplete(payload.userId);
    return { success: true };
  }),

  // Google OAuth — verifies ID token from frontend Google Sign-In
  googleSignIn: publicProcedure
    .input(z.object({ idToken: z.string() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: input.idToken,
          audience: ENV.googleClientId,
        });
        const payload = ticket.getPayload();
        if (!payload?.sub) throw new Error("Invalid Google token");

        const user = await upsertGoogleUser(payload.sub, {
          email: payload.email ?? "",
          name: payload.name ?? "",
          avatarUrl: payload.picture,
        });
        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create account." });

        const token = createSessionToken({ userId: user.id, email: user.email ?? null });
        setAuthCookie(ctx.res, token);
        const { passwordHash: _, ...safeUser } = user;
        return { user: safeUser };
      } catch (e) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Google sign-in failed. Please try again." });
      }
    }),

  // Facebook — stub
  facebookSignIn: publicProcedure.mutation(async () => {
    throw new TRPCError({ code: "NOT_IMPLEMENTED", message: "Facebook login is coming soon!" });
  }),
});
