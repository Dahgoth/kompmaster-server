import { mockServer } from "../mocks";
import { expect, test } from "../fixtures";

/** Plan §8: catalog — search, empty state, pagination, API failure. */
test.beforeAll(() => mockServer.listen({ onUnhandledRequest: "error" }));
test.afterAll(() => mockServer.close());

test("category page renders products with search", async ({ page, assertNoViolations }) => {
  await page.goto("/category/noutbuki");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ноутбуки");
  await expect(
    page.getByRole("link", { name: /Ноутбук Lenovo ThinkPad T14 \(Refurbished\)/ }),
  ).toBeVisible();

  await page.getByRole("searchbox", { name: "Поиск по названию" }).fill("thinkpad");
  await page.getByRole("button", { name: "Найти" }).click();
  await expect(page).toHaveURL(/search=thinkpad/);
  await expect(
    page.getByRole("link", { name: /Ноутбук Lenovo ThinkPad T14 \(Refurbished\)/ }),
  ).toBeVisible();
  await assertNoViolations(page);
});

test("category page shows the empty state for unknown queries", async ({ page }) => {
  await page.goto("/category/noutbuki?search=zzz-no-such-product");
  await expect(page.getByText(/ничего не найдено/)).toBeVisible();
});
