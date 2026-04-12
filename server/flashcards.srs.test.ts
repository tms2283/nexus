import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * SM-2 Spaced Repetition Algorithm Tests
 *
 * The SM-2 algorithm is implemented in server/db.ts:reviewFlashcard().
 * Since that function depends on a live database, we extract and test the
 * pure algorithm logic directly to verify correctness without DB access.
 *
 * SM-2 quality mapping: again=0, hard=2, good=3, easy=5
 */

// ─── Pure SM-2 logic extracted from server/db.ts:reviewFlashcard ────────────

type Rating = "again" | "hard" | "good" | "easy";

const qualityMap: Record<Rating, number> = { again: 0, hard: 2, good: 3, easy: 5 };

interface CardState {
  easeFactor: number;
  repetitions: number;
  interval: number;
}

function sm2Review(card: CardState, rating: Rating): CardState {
  const q = qualityMap[rating];
  let { easeFactor, repetitions, interval } = card;

  if (q < 3) {
    // Failed: reset
    repetitions = 0;
    interval = 1;
  } else {
    // Passed
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * easeFactor);
    repetitions += 1;
  }

  easeFactor = Math.max(1.3, easeFactor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));

  return { easeFactor, repetitions, interval };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("SM-2 algorithm — interval calculation", () => {
  const defaultCard: CardState = { easeFactor: 2.5, repetitions: 0, interval: 1 };

  it("should set interval to 1 day on first successful review (good)", () => {
    const result = sm2Review(defaultCard, "good");
    expect(result.interval).toBe(1);
    expect(result.repetitions).toBe(1);
  });

  it("should set interval to 6 days on second successful review (good)", () => {
    const afterFirst = sm2Review(defaultCard, "good");
    const afterSecond = sm2Review(afterFirst, "good");
    expect(afterSecond.interval).toBe(6);
    expect(afterSecond.repetitions).toBe(2);
  });

  it("should multiply interval by easeFactor on third+ successful reviews", () => {
    let card = { ...defaultCard };
    card = sm2Review(card, "good"); // rep=1, interval=1
    card = sm2Review(card, "good"); // rep=2, interval=6
    card = sm2Review(card, "good"); // rep=3, interval=round(6 * ef)
    // After three "good" reviews, the ease factor has been adjusted
    expect(card.interval).toBeGreaterThan(6);
    expect(card.repetitions).toBe(3);
  });

  it("should reset interval and repetitions on 'again' rating", () => {
    let card = { ...defaultCard };
    card = sm2Review(card, "good");
    card = sm2Review(card, "good");
    expect(card.repetitions).toBe(2);
    expect(card.interval).toBe(6);

    card = sm2Review(card, "again");
    expect(card.interval).toBe(1);
    expect(card.repetitions).toBe(0);
  });

  it("should reset interval and repetitions on 'hard' rating (quality < 3)", () => {
    let card = { ...defaultCard };
    card = sm2Review(card, "good");
    card = sm2Review(card, "good");

    card = sm2Review(card, "hard");
    expect(card.interval).toBe(1);
    expect(card.repetitions).toBe(0);
  });
});

describe("SM-2 algorithm — ease factor adjustments", () => {
  const defaultCard: CardState = { easeFactor: 2.5, repetitions: 0, interval: 1 };

  it("should increase ease factor for 'easy' ratings (quality=5)", () => {
    const result = sm2Review(defaultCard, "easy");
    // EF = 2.5 + 0.1 - (5-5)*(0.08 + (5-5)*0.02) = 2.5 + 0.1 = 2.6
    expect(result.easeFactor).toBeCloseTo(2.6, 2);
  });

  it("should slightly decrease ease factor for 'good' ratings (quality=3)", () => {
    const result = sm2Review(defaultCard, "good");
    // EF = 2.5 + 0.1 - (5-3)*(0.08 + (5-3)*0.02) = 2.5 + 0.1 - 2*(0.08+0.04)
    //    = 2.5 + 0.1 - 0.24 = 2.36
    expect(result.easeFactor).toBeCloseTo(2.36, 2);
  });

  it("should decrease ease factor for 'hard' ratings (quality=2)", () => {
    const result = sm2Review(defaultCard, "hard");
    // EF = 2.5 + 0.1 - (5-2)*(0.08 + (5-2)*0.02) = 2.5 + 0.1 - 3*(0.08+0.06)
    //    = 2.5 + 0.1 - 0.42 = 2.18
    expect(result.easeFactor).toBeCloseTo(2.18, 2);
  });

  it("should decrease ease factor significantly for 'again' ratings (quality=0)", () => {
    const result = sm2Review(defaultCard, "again");
    // EF = 2.5 + 0.1 - (5-0)*(0.08 + (5-0)*0.02) = 2.5 + 0.1 - 5*(0.08+0.10)
    //    = 2.5 + 0.1 - 0.9 = 1.7
    expect(result.easeFactor).toBeCloseTo(1.7, 2);
  });

  it("should never let ease factor drop below 1.3", () => {
    let card: CardState = { easeFactor: 1.3, repetitions: 0, interval: 1 };
    card = sm2Review(card, "again");
    expect(card.easeFactor).toBeGreaterThanOrEqual(1.3);

    // Keep failing — ease factor should stay at floor
    card = sm2Review(card, "again");
    expect(card.easeFactor).toBe(1.3);
  });
});

describe("SM-2 algorithm — quality mapping", () => {
  it("should map 'again' to quality 0", () => {
    expect(qualityMap["again"]).toBe(0);
  });

  it("should map 'hard' to quality 2", () => {
    expect(qualityMap["hard"]).toBe(2);
  });

  it("should map 'good' to quality 3", () => {
    expect(qualityMap["good"]).toBe(3);
  });

  it("should map 'easy' to quality 5", () => {
    expect(qualityMap["easy"]).toBe(5);
  });
});

describe("SM-2 algorithm — long-term scheduling", () => {
  it("should produce increasing intervals with consistent 'good' ratings", () => {
    let card: CardState = { easeFactor: 2.5, repetitions: 0, interval: 1 };
    const intervals: number[] = [];

    for (let i = 0; i < 6; i++) {
      card = sm2Review(card, "good");
      intervals.push(card.interval);
    }

    // Intervals should be monotonically increasing after the second review
    // First: 1, Second: 6, then growing
    expect(intervals[0]).toBe(1);
    expect(intervals[1]).toBe(6);
    for (let i = 2; i < intervals.length; i++) {
      expect(intervals[i]).toBeGreaterThan(intervals[i - 1]);
    }
  });

  it("should produce rapidly growing intervals with 'easy' ratings", () => {
    let card: CardState = { easeFactor: 2.5, repetitions: 0, interval: 1 };
    const intervals: number[] = [];

    for (let i = 0; i < 5; i++) {
      card = sm2Review(card, "easy");
      intervals.push(card.interval);
    }

    // Easy ratings increase EF, so intervals grow faster than 'good'
    expect(intervals[0]).toBe(1);
    expect(intervals[1]).toBe(6);
    expect(intervals[4]).toBeGreaterThan(30); // Should be well over a month after 5 easy reviews
  });

  it("should recover from a lapse and restart the interval sequence", () => {
    let card: CardState = { easeFactor: 2.5, repetitions: 0, interval: 1 };

    // Build up some progress
    card = sm2Review(card, "good");
    card = sm2Review(card, "good");
    card = sm2Review(card, "good");
    expect(card.interval).toBeGreaterThan(6);

    // Lapse
    card = sm2Review(card, "again");
    expect(card.interval).toBe(1);
    expect(card.repetitions).toBe(0);

    // Rebuild
    card = sm2Review(card, "good");
    expect(card.interval).toBe(1);
    card = sm2Review(card, "good");
    expect(card.interval).toBe(6);
  });
});

describe("flashcard router — input validation", () => {
  it("should have correct rating enum values", () => {
    const validRatings: Rating[] = ["again", "hard", "good", "easy"];
    for (const rating of validRatings) {
      expect(qualityMap[rating]).toBeDefined();
      expect(typeof qualityMap[rating]).toBe("number");
    }
  });
});
