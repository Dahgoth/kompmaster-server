import { mockServer } from "../mocks";
import { expect, test } from "../fixtures";

/** Plan §8: SEO gate — SSR HTML, metadata, sitemap, robots, noindex. */
test.beforeAll(() => mockServer.listen({ onUnhandledRequest: "error" }));
test.afterAll(() => mockServer.close());

test("product page serves complete crawler HTML", async ({ page }) => {
  const response = await page.goto("/product/noutbuk-lenovo-thinkpad-t14");
  expect(response?.status()).toBe(200);
  const html = await response?.text();
  expect(html).toContain("<title>");
  expect(html).toContain('name="description"');
  expect(html).toContain('rel="canonical"');
  expect(html).toContain("application/ld+json");
});

test("sitemap covers the mocked catalog, robots blocks private paths", async ({ page }) => {
  const sitemap = await (await page.request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("/product/noutbuk-lenovo-thinkpad-t14");
  expect(sitemap).toContain("/category/noutbuki");
  const robots = await (await page.request.get("/robots.txt")).text();
  for (const path of ["/admin", "/auth", "/checkout", "/cart", "/orders", "/profile", "/api/"]) {
    expect(robots).toContain(`Disallow: ${path}`);
  }
});

test("private routes are noindex", async ({ page }) => {
  await page.goto("/cart");
  const noindex = await page.locator('meta[name="robots"]').getAttribute("content");
  expect(noindex).toContain("noindex");
});
