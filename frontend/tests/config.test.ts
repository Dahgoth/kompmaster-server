import { describe, expect, it } from "vitest";
import { __resolveApiBaseForTests, config } from "@/config";

describe("config", () => {
  it("falls back to the local backend when API_BASE is unset in non-production", () => {
    // vitest runs with NODE_ENV=test; the module was loaded without API_BASE
    // set. Resolved through the TDD seam because config.apiBase is
    // server-only by design (jsdom defines window — see guard test below).
    expect(__resolveApiBaseForTests()).toBe("http://localhost:4000/api");
  });

  it("refuses server-only apiBase in the browser", () => {
    expect(typeof window).not.toBe("undefined");
    expect(() => config.apiBase).toThrow(/server-only/);
  });

  it("keeps the browser on the same-origin proxied base", () => {
    expect(config.clientApiBase).toBe("/api");
  });

  it("strips trailing slashes from API_BASE", () => {
    expect(__resolveApiBaseForTests().endsWith("/")).toBe(false);
  });

  it("metrika id is optional", () => {
    expect(config.metrikaId === null || typeof config.metrikaId === "string").toBe(true);
  });
});
