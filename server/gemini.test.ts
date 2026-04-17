import { describe, expect, it } from "vitest";
import { extractGeminiText, getGeminiThinkingBudget, resolveProviderConfig } from "./aiProvider";

describe("AI provider defaults", () => {
  it("falls back to the built-in provider without a per-user override", async () => {
    const config = await resolveProviderConfig();
    expect(config).toEqual({ provider: "builtin" });
  });
});


describe("Gemini response handling", () => {
  it("joins all text parts from Gemini candidates", () => {
    expect(
      extractGeminiText({
        candidates: [
          {
            content: {
              parts: [{ text: "Hello" }, { text: " world" }],
            },
          },
        ],
      })
    ).toBe("Hello world");
  });

  it("uses a bounded thinking budget for Gemini 2.5 models", () => {
    expect(getGeminiThinkingBudget("gemini-2.5-pro")).toBe(128);
    expect(getGeminiThinkingBudget("gemini-2.5-flash")).toBe(0);
    expect(getGeminiThinkingBudget("gemini-1.5-pro")).toBeUndefined();
  });
});
