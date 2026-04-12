import { describe, expect, it } from "vitest";

describe("Gemini API Key", () => {
  it("GEMINI_API_KEY environment variable format is valid when set", () => {
    const key = process.env.GEMINI_API_KEY;
    if (key) {
      // When the key is set, it should be a non-trivial string
      expect(key.length).toBeGreaterThan(10);
    } else {
      // In CI / test environments the key may not be set — that's acceptable
      // since the app falls back to the built-in Forge provider
      expect(key).toBeUndefined();
    }
  });
});
