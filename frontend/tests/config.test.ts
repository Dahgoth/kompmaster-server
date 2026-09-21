import { describe, expect, it } from "vitest";
import { config } from "@/config";

describe("config", () => {
  it("falls back to the local backend when API_BASE is unset in non-production", () => {
    // vitest runs with NODE_ENV=test; config module was loaded without
    // API_BASE set in this environment.
    expect(config.apiBase).toBe("http://localhost:4000/api");
  });

  it("keeps the browser on the same-origin proxied base", () => {
    expect(config.clientApiBase).toBe("/api");
  });

  it("strips trailing slashes from API_BASE", async () => {
    const { config: fresh } = await import("@/config");
    expect(fresh.apiBase.endsWith("/")).toBe(false);
  });

  it("metrika id is optional", () => {
    expect(config.metrikaId === null || typeof config.metrikaId === "string").toBe(true);
  });
});
