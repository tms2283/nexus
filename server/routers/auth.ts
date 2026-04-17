import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc";
import {
  createUser, getUserByEmail,
  updateUserLastSignedIn, markOnboardingComplete,
  savePsychProfile, upsertGoogleUser,
} from "../db";
import {
  hashPassword, verifyPassword, createSessionToken,
  setAuthCookie, clearAuthCookie,
} from "../auth";
import { OAuth2Client } from "google-auth-library";
import { ENV } from "../_core/env";

const googleClient = new OAuth2Client(ENV.googleClientId);

function tryDecodeJwtPayload(token: string) {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

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
    if (!ctx.user) return null;
    const { passwordHash: _, ...safeUser } = ctx.user;
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
    setAuthCookie(ctx.req, ctx.res, token);
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
    setAuthCookie(ctx.req, ctx.res, token);
    const { passwordHash: _, ...safeUser } = user;
    return { user: safeUser };
  }),

  // Logout
  logout: publicProcedure.mutation(async ({ ctx }) => {
    clearAuthCookie(ctx.req, ctx.res);
    return { success: true };
  }),

  // Complete onboarding quiz — saves psych profile, marks onboarding done
  completeOnboarding: publicProcedure.input(onboardingSchema).mutation(async ({ input, ctx }) => {
    // Use the user already resolved by context.ts from the JWT cookie
    if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Not logged in." });

    const inferred = inferProfile(input.quizAnswers);
    await savePsychProfile(ctx.user.id, { quizAnswers: input.quizAnswers, ...inferred });
    await markOnboardingComplete(ctx.user.id);
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
        setAuthCookie(ctx.req, ctx.res, token);
        const { passwordHash: _, ...safeUser } = user;
        return { user: safeUser };
      } catch (e) {
        const decodedPayload = tryDecodeJwtPayload(input.idToken);
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error("[auth.googleSignIn] verification failed", {
          message: errorMessage,
          host: ctx.req.headers.host,
          origin: ctx.req.headers.origin,
          referer: ctx.req.headers.referer,
          secure: ctx.req.secure,
          forwardedProto: ctx.req.headers["x-forwarded-proto"],
          configuredAudience: ENV.googleClientId,
          tokenAudience: decodedPayload?.aud ?? null,
          tokenAuthorizedParty: decodedPayload?.azp ?? null,
          tokenIssuer: decodedPayload?.iss ?? null,
          tokenPrefix: input.idToken.slice(0, 16),
        });
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Google sign-in failed. Please try again." });
      }
    }),

  // Facebook — stub
  facebookSignIn: publicProcedure.mutation(async () => {
    throw new TRPCError({ code: "NOT_IMPLEMENTED", message: "Facebook login is coming soon!" });
  }),
});
