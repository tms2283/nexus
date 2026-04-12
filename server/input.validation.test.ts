import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      cookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

// ─── Contact Form Validation ─────────────────────────────────────────────────

describe("contact.submit — input validation", () => {
  it("should reject empty name", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.contact.submit({
        name: "",
        email: "valid@test.com",
        message: "This is a valid message that is long enough.",
      }),
    ).rejects.toThrow();
  });

  it("should reject invalid email format", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.contact.submit({
        name: "Test User",
        email: "not-an-email",
        message: "This is a valid message that is long enough.",
      }),
    ).rejects.toThrow();
  });

  it("should reject empty email", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.contact.submit({
        name: "Test User",
        email: "",
        message: "This is a valid message that is long enough.",
      }),
    ).rejects.toThrow();
  });

  it("should reject message shorter than 10 characters", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.contact.submit({
        name: "Test User",
        email: "valid@test.com",
        message: "Short",
      }),
    ).rejects.toThrow();
  });

  it("should reject message longer than 5000 characters", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.contact.submit({
        name: "Test User",
        email: "valid@test.com",
        message: "x".repeat(5001),
      }),
    ).rejects.toThrow();
  });

  it("should reject name longer than 256 characters", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.contact.submit({
        name: "A".repeat(257),
        email: "valid@test.com",
        message: "This is a valid message that is long enough.",
      }),
    ).rejects.toThrow();
  });

  it("should reject subject longer than 512 characters", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.contact.submit({
        name: "Test User",
        email: "valid@test.com",
        subject: "S".repeat(513),
        message: "This is a valid message that is long enough.",
      }),
    ).rejects.toThrow();
  });
});

// ─── Visitor addXP Validation ────────────────────────────────────────────────

describe("visitor.addXP — edge case validation", () => {
  it("should reject negative XP amounts", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.visitor.addXP({ cookieId: "test", amount: -1 }),
    ).rejects.toThrow();
  });

  it("should reject zero XP amount", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.visitor.addXP({ cookieId: "test", amount: 0 }),
    ).rejects.toThrow();
  });

  it("should reject fractional XP that resolves to non-positive", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.visitor.addXP({ cookieId: "test", amount: -0.5 }),
    ).rejects.toThrow();
  });
});

// ─── Flashcard Router Validation ─────────────────────────────────────────────

describe("flashcards.generateDeck — input validation", () => {
  it("should reject card count below 5", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.flashcards.generateDeck({
        cookieId: "test",
        topic: "Machine Learning",
        count: 2,
      }),
    ).rejects.toThrow();
  });

  it("should reject card count above 30", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.flashcards.generateDeck({
        cookieId: "test",
        topic: "Machine Learning",
        count: 50,
      }),
    ).rejects.toThrow();
  });
});

describe("flashcards.review — input validation", () => {
  it("should reject invalid rating value", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.flashcards.review({
        cardId: 1,
        deckId: 1,
        cookieId: "test",
        rating: "terrible" as "again",
      }),
    ).rejects.toThrow();
  });
});

// ─── Testing Center Validation ───────────────────────────────────────────────

describe("testing.saveResult — input validation", () => {
  it("should reject empty cookieId", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.testing.saveResult({
        cookieId: "",
        testId: "science",
        score: 8,
        totalQuestions: 10,
        answers: { "0": 1 },
        timeTakenSeconds: 60,
      }),
    ).rejects.toThrow();
  });

  it("should reject empty testId", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.testing.saveResult({
        cookieId: "valid-cookie",
        testId: "",
        score: 8,
        totalQuestions: 10,
        answers: { "0": 1 },
        timeTakenSeconds: 60,
      }),
    ).rejects.toThrow();
  });
});

describe("testing.saveIQResult — input validation", () => {
  it("should reject empty cookieId", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.testing.saveIQResult({
        cookieId: "",
        iqScore: 100,
        percentile: 50,
        rawScore: 10,
        categoryScores: {},
      }),
    ).rejects.toThrow();
  });
});

// ─── Leaderboard Validation ──────────────────────────────────────────────────

describe("leaderboard.getTopUsers — input validation", () => {
  it("should reject limit below 1", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.leaderboard.getTopUsers({ limit: 0, metric: "xp" }),
    ).rejects.toThrow();
  });

  it("should reject limit above 50", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.leaderboard.getTopUsers({ limit: 100, metric: "xp" }),
    ).rejects.toThrow();
  });

  it("should reject invalid metric value", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.leaderboard.getTopUsers({ limit: 10, metric: "invalid" as "xp" }),
    ).rejects.toThrow();
  });
});

// ─── Dashboard Validation ────────────────────────────────────────────────────

describe("dashboard.getActivity — input validation", () => {
  it("should reject empty cookieId", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.dashboard.getActivity({ cookieId: "" }),
    ).rejects.toThrow();
  });
});

// ─── Skills Validation ───────────────────────────────────────────────────────

describe("skills.updateFromTopics — input validation", () => {
  it("should reject scorePercent below 0", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.skills.updateFromTopics({
        cookieId: "test",
        topics: ["ml"],
        scorePercent: -10,
      }),
    ).rejects.toThrow();
  });

  it("should reject scorePercent above 100", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.skills.updateFromTopics({
        cookieId: "test",
        topics: ["ml"],
        scorePercent: 150,
      }),
    ).rejects.toThrow();
  });
});
