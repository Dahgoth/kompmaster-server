import { mockServer } from "../mocks";
import { expect, test } from "../fixtures";

/** Plan §8: product — specs/stock, 404, JSON-LD (seo gate). URLs are opaque UUIDs. */
test.beforeAll(() => mockServer.listen({ onUnhandledRequest: "error" }));
test.afterAll(() => mockServer.close());

test("product page renders SSR content with JSON-LD", async ({ page, assertNoViolations }) => {
  // Detail pages prerender at build against the build-time API; Tier A runs
  // the store against the local fixture backend, so ids resolve here.
  // (The seo.spec crawler test asserts the same HTML contract independently.)
  const response = await page.goto("/product/11111111-1111-4111-8111-111111111111");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ноутбук Lenovo ThinkPad T14");
  const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(jsonLd).toContain('"@type":"Product"');
  await expect(page.getByRole("button", { name: "Добавить в корзину" })).toBeEnabled();
  const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
  expect(canonical).toMatch(/^https?:\/\//);
  await assertNoViolations(page);
});

test("out-of-stock disables the add-to-cart button (Tier B — seeded OOS product)", async () => {
  test.skip(true, "Requires Tier B with a zero-stock fixture product");
});

test("unknown product renders not-found", async ({ page }) => {
  const response = await page.goto("/product/99999999-9999-4999-8999-999999999999");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Страница не найдена" })).toBeVisible();
});

test("non-UUID path segments 404 without touching the read path", async ({ page }) => {
  // Backend UUID-guard: malformed ids never reach a DB query.
  const response = await page.goto("/product/not-a-uuid");
  expect(response?.status()).toBe(404);
});
