import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME, UNAUTHED_ERR_MSG, NOT_ADMIN_ERR_MSG } from "../shared/const";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    openId: "user-open-id-1",
    email: "alice@example.com",
    name: "Alice",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  };
}

function createUnauthenticatedContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createAuthenticatedContext(user?: Partial<User>): TrpcContext {
  return {
    user: makeUser(user),
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// ─── Auth / Session Tests ────────────────────────────────────────────────────

describe("auth.me", () => {
  it("should return null for unauthenticated requests", async () => {
    const ctx = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("should return the user object for authenticated requests", async () => {
    const ctx = createAuthenticatedContext({ email: "bob@example.com", name: "Bob" });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.email).toBe("bob@example.com");
    expect(result?.name).toBe("Bob");
    expect(result?.openId).toBe("user-open-id-1");
  });

  it("should return user role correctly", async () => {
    const ctx = createAuthenticatedContext({ role: "admin" });
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result?.role).toBe("admin");
  });
});

describe("auth.logout", () => {
  it("should clear the session cookie on logout", async () => {
    const ctx = createAuthenticatedContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(ctx.res.clearCookie).toHaveBeenCalledWith(
      COOKIE_NAME,
      expect.objectContaining({
        maxAge: -1,
        httpOnly: true,
        path: "/",
        sameSite: "none",
        secure: true,
      }),
    );
  });

  it("should still succeed for an unauthenticated user calling logout", async () => {
    const ctx = createUnauthenticatedContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
  });
});

describe("IDOR prevention — user isolation", () => {
  it("should not expose another user's data through auth.me", async () => {
    const ctxAlice = createAuthenticatedContext({ id: 1, openId: "alice-id", email: "alice@test.com" });
    const ctxBob = createAuthenticatedContext({ id: 2, openId: "bob-id", email: "bob@test.com" });

    const callerAlice = appRouter.createCaller(ctxAlice);
    const callerBob = appRouter.createCaller(ctxBob);

    const aliceResult = await callerAlice.auth.me();
    const bobResult = await callerBob.auth.me();

    expect(aliceResult?.openId).toBe("alice-id");
    expect(bobResult?.openId).toBe("bob-id");
    expect(aliceResult?.email).not.toBe(bobResult?.email);
  });
});
