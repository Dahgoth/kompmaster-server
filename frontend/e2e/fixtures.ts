import AxeBuilder from "@axe-core/playwright";
import { test as base, type Page } from "@playwright/test";

/**
 * Tier A E2E (plan §8): `next build && next start` + MSW (node interceptors)
 * serving deterministic fixtures. No DB. See e2e/mocks/ for the handlers.
 *
 * Conventions per spec file:
 * - open every route the spec covers and assert server-rendered content
 *   (title/description/canonical/JSON-LD where the plan requires it);
 * - assert the one failure mode the backend defines for that flow;
 * - run an axe scan with zero critical/serious violations.
 */

interface AxeFixture {
  assertNoViolations: (page: Page) => Promise<void>;
}

export const test = base.extend<AxeFixture>({
  assertNoViolations: async ({}, use) => {
    await use(async (page: Page) => {
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
      const blocking = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );
      if (blocking.length) {
        const summary = blocking
          .map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s)`)
          .join("; ");
        throw new Error(`axe violations: ${summary}`);
      }
    });
  },
});

export { expect } from "@playwright/test";
