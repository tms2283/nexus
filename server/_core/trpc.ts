import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "@shared/const";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

// ─── User-facing error messages keyed by tRPC error code ─────────────────────
// Raw tRPC errors (especially TOO_MANY_REQUESTS) contain internal stack traces
// or technical messages. This formatter replaces them with clean UI copy.
const USER_FACING_MESSAGES: Partial<Record<TRPCError["code"], string>> = {
  TOO_MANY_REQUESTS:
    "You've been sending a lot of requests. Please wait a minute before trying again.",
  UNAUTHORIZED: "You need to be signed in to do that.",
  FORBIDDEN: "You don't have permission to do that.",
  NOT_FOUND: "That resource doesn't exist.",
  TIMEOUT: "The request timed out. Please try again.",
  INTERNAL_SERVER_ERROR: "Something went wrong on our end. Please try again.",
  BAD_REQUEST: undefined, // pass through — BAD_REQUEST messages are usually already user-friendly
};

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const override = USER_FACING_MESSAGES[error.code];
    return {
      ...shape,
      message: override ?? shape.message,
      data: {
        ...shape.data,
        // Only expose stack trace in development
        stack:
          process.env.NODE_ENV === "development"
            ? shape.data?.stack
            : undefined,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireVisitor = t.middleware(async opts => {
  const { ctx, next } = opts;

  // Get the server-set visitor cookie
  const serverCookieId = ctx.visitorCookieId;

  // If no server cookie, this is a first visit - allow it
  // The init mutation should have set the cookie
  if (!serverCookieId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Visitor cookie not found. Please refresh the page.",
    });
  }

  return next({
    ctx: {
      ...ctx,
      visitorCookieId: serverCookieId,
    },
  });
});

/**
 * Visitor procedure for operations that need visitor authentication.
 * Automatically extracts visitor ID from the server-set HttpOnly cookie.
 * No client-side cookieId input required.
 */
export const visitorProcedure = t.procedure.use(requireVisitor);

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  })
);
