import { mockServer } from "../mocks";
import { expect, test } from "../fixtures";

/**
 * Plan §8: navigation + a11y — deep links render, skip link focuses,
 * mobile drawer opens with Escape-to-close.
 */
test.beforeAll(() => mockServer.listen({ onUnhandledRequest: "error" }));
test.afterAll(() => mockServer.close());

test("deep links render without client navigation", async ({ page }) => {
  await page.goto("/category/videokarty");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Видеокарты");
  await page.goto("/about");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("О нас");
});

test("skip link targets the main landmark", async ({ page, assertNoViolations }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Перейти к содержимому" });
  await expect(skip).toBeFocused();
  await skip.press("Enter");
  await expect(page.locator("#main")).toBeFocused();
  await assertNoViolations(page);
});

test("mobile drawer opens and closes with Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Открыть меню" }).click();
  await expect(page.getByRole("link", { name: "Каталог" }).first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Открыть меню" })).toBeVisible();
});
