import { defineConfig, devices } from "@playwright/test";

/**
 * Tier A (plan §8): mocked full matrix on the standalone server.
 * Tier B (fullstack) is a pre-merge/nightly job, not a config fork — the
 * same specs run against the staging API by unsetting E2E_MOCK.
 */
const STORE_URL = process.env.E2E_STORE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e/specs",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: STORE_URL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"] } },
  ],
});
