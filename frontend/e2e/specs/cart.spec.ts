import { mockServer } from "../mocks";
import { expect, test } from "../fixtures";

/** Plan §8: cart — add/increment/decrement/remove, persistence, totals. */
test.beforeAll(() => mockServer.listen({ onUnhandledRequest: "error" }));
test.afterAll(() => mockServer.close());

test("full cart flow persists across reload", async ({ page, assertNoViolations }) => {
  await page.goto("/product/noutbuk-lenovo-thinkpad-t14");
  await page.getByRole("button", { name: "Добавить в корзину" }).click();

  await page.goto("/cart");
  await expect(page.getByText("Ноутбук Lenovo ThinkPad T14")).toBeVisible();
  // ru-RU Intl separates thousands with a non-breaking space (U+00A0);
  // the unit price also appears per line, so scope to the order total.
  const total = page.getByText(/^Итого:/);
  await expect(total).toContainText(/45[\s ]990/);

  await page.getByRole("button", { name: "Увеличить количество" }).click();
  await expect(page.getByText("2", { exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByText("2", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Уменьшить количество" }).click();
  await page.getByRole("button", { name: /Убрать .* из корзины/ }).click();
  await expect(page.getByText("Корзина пуста")).toBeVisible();
  await assertNoViolations(page);
});
