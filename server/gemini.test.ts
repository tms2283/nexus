import { describe, expect, it } from "vitest";
import { resolveProviderConfig } from "./aiProvider";

describe("AI provider defaults", () => {
  it("falls back to the built-in provider without a per-user override", async () => {
    const config = await resolveProviderConfig();
    expect(config).toEqual({ provider: "builtin" });
  });
});
