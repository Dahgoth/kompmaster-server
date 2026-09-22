import { mockServer } from "../mocks";
import { expect, test } from "../fixtures";

/** Plan §8: home — category grid renders server-side with groups. */
test.beforeAll(() => mockServer.listen({ onUnhandledRequest: "error" }));
test.afterAll(() => mockServer.close());

test("home renders the category grid from SSR", async ({ page, assertNoViolations }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Восстановленная электроника",
  );
  await expect(page.getByRole("heading", { name: "Каталог" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ноутбуки" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Видеокарты" })).toBeVisible();
  await assertNoViolations(page);
});

test("catalog page lists all root categories", async ({ page }) => {
  await page.goto("/catalog");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Каталог");
  await expect(page.getByRole("link", { name: "Ноутбуки" })).toBeVisible();
});
