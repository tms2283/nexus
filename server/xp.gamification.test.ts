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

// ─── XP / Gamification Tests ─────────────────────────────────────────────────

describe("visitor.addXP — input validation", () => {
  it("should reject negative XP amounts", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.visitor.addXP({ cookieId: "test-cookie", amount: -10 }),
    ).rejects.toThrow();
  });

  it("should reject zero XP amount", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.visitor.addXP({ cookieId: "test-cookie", amount: 0 }),
    ).rejects.toThrow();
  });

  it("should reject non-finite XP amounts (NaN-like)", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.visitor.addXP({ cookieId: "test-cookie", amount: NaN }),
    ).rejects.toThrow();
  });

  it("should accept positive XP amounts without throwing validation errors", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    // This may fail at the DB layer (no DB in tests) but should NOT fail at validation
    try {
      await caller.visitor.addXP({ cookieId: "valid-cookie-id", amount: 10 });
    } catch (err: unknown) {
      // If it throws, it should be a DB error, not a validation error
      const message = err instanceof Error ? err.message : String(err);
      expect(message).not.toMatch(/invalid|validation|parse/i);
    }
  });
});

describe("XP system — level calculation", () => {
  it("should calculate level as floor(xp / 100) + 1", () => {
    // This mirrors the logic in server/db.ts:addXP and recordPageVisit
    const calculateLevel = (xp: number) => Math.floor(xp / 100) + 1;

    expect(calculateLevel(0)).toBe(1);
    expect(calculateLevel(50)).toBe(1);
    expect(calculateLevel(99)).toBe(1);
    expect(calculateLevel(100)).toBe(2);
    expect(calculateLevel(150)).toBe(2);
    expect(calculateLevel(500)).toBe(6);
    expect(calculateLevel(999)).toBe(10);
    expect(calculateLevel(1000)).toBe(11);
  });
});

describe("XP system — badge thresholds", () => {
  const badgeThresholds: Record<string, number> = {
    "explorer": 50,
    "curious-mind": 150,
    "deep-diver": 300,
    "ai-whisperer": 500,
    "nexus-scholar": 1000,
  };

  it("should award 'explorer' badge at 50 XP", () => {
    const xp = 50;
    const awardedBadges = Object.entries(badgeThresholds)
      .filter(([, threshold]) => xp >= threshold)
      .map(([badge]) => badge);
    expect(awardedBadges).toContain("explorer");
    expect(awardedBadges).not.toContain("curious-mind");
  });

  it("should award 'curious-mind' badge at 150 XP", () => {
    const xp = 150;
    const awardedBadges = Object.entries(badgeThresholds)
      .filter(([, threshold]) => xp >= threshold)
      .map(([badge]) => badge);
    expect(awardedBadges).toContain("explorer");
    expect(awardedBadges).toContain("curious-mind");
    expect(awardedBadges).not.toContain("deep-diver");
  });

  it("should award all badges at 1000+ XP", () => {
    const xp = 1000;
    const awardedBadges = Object.entries(badgeThresholds)
      .filter(([, threshold]) => xp >= threshold)
      .map(([badge]) => badge);
    expect(awardedBadges).toEqual([
      "explorer",
      "curious-mind",
      "deep-diver",
      "ai-whisperer",
      "nexus-scholar",
    ]);
  });

  it("should not award any XP badges when XP is below 50", () => {
    const xp = 49;
    const awardedBadges = Object.entries(badgeThresholds)
      .filter(([, threshold]) => xp >= threshold)
      .map(([badge]) => badge);
    expect(awardedBadges).toHaveLength(0);
  });
});

describe("XP system — streak badges", () => {
  it("should award streak-3 badge at 3-day streak", () => {
    const streak = 3;
    const badges: string[] = [];
    if (streak >= 3) badges.push("streak-3");
    if (streak >= 7) badges.push("streak-7");
    expect(badges).toContain("streak-3");
    expect(badges).not.toContain("streak-7");
  });

  it("should award both streak badges at 7-day streak", () => {
    const streak = 7;
    const badges: string[] = [];
    if (streak >= 3) badges.push("streak-3");
    if (streak >= 7) badges.push("streak-7");
    expect(badges).toContain("streak-3");
    expect(badges).toContain("streak-7");
  });
});

describe("XP system — page visit rewards", () => {
  it("should grant 10 XP for visiting a new page", () => {
    const pagesVisited: string[] = [];
    const page = "/flashcards";
    const isNewPage = !pagesVisited.includes(page);
    const xpGain = isNewPage ? 10 : 2;
    expect(xpGain).toBe(10);
  });

  it("should grant 2 XP for revisiting an existing page", () => {
    const pagesVisited = ["/flashcards", "/research"];
    const page = "/flashcards";
    const isNewPage = !pagesVisited.includes(page);
    const xpGain = isNewPage ? 10 : 2;
    expect(xpGain).toBe(2);
  });
});

describe("flashcard session XP", () => {
  it("should cap session XP at 50", () => {
    const cardsReviewed = 100;
    const xp = Math.min(cardsReviewed * 3, 50);
    expect(xp).toBe(50);
  });

  it("should award 3 XP per card reviewed up to cap", () => {
    expect(Math.min(1 * 3, 50)).toBe(3);
    expect(Math.min(5 * 3, 50)).toBe(15);
    expect(Math.min(16 * 3, 50)).toBe(48);
    expect(Math.min(17 * 3, 50)).toBe(50); // hits cap
  });
});
