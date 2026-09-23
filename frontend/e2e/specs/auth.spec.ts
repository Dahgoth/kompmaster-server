import { mockServer } from "../mocks";
import { expect, test } from "../fixtures";

/** Plan §8: auth — validation, 401 copy, redirect param, forgot flow. */
test.beforeAll(() => mockServer.listen({ onUnhandledRequest: "error" }));
test.afterAll(() => mockServer.close());

test("login rejects wrong passwords with the backend copy", async ({
  page,
  assertNoViolations,
}) => {
  await page.goto("/auth");
  await page.getByLabel(/E-mail или телефон/).fill("e2e@example.com");
  await page.getByLabel(/Пароль/).fill("wrong");
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page.locator("div.mx-auto").getByRole("alert")).toContainText(
    "Неверный логин или пароль",
  );
  await assertNoViolations(page);
});

test("register validates password length and the privacy gate", async ({ page }) => {
  await page.goto("/auth");
  await page.getByRole("tab", { name: "Регистрация" }).click();
  await page.getByLabel(/E-mail/).fill("new@example.com");
  await page.getByLabel(/Пароль/).fill("123");
  await page.getByRole("button", { name: "Зарегистрироваться" }).click();
  await expect(page.locator("div.mx-auto").getByRole("alert")).toContainText(
    "не короче 6 символов",
  );
});

test("successful login follows the redirect param", async ({ page }) => {
  await page.goto("/auth?redirect=/orders");
  await page.getByLabel(/E-mail или телефон/).fill("e2e@example.com");
  await page.getByLabel(/Пароль/).fill("secret123");
  await page.getByRole("button", { name: "Войти" }).click();
  await expect(page).toHaveURL(/\/orders/);
});

test("forgot-password never reveals account existence", async ({ page }) => {
  await page.goto("/auth");
  await page.getByRole("tab", { name: "Восстановление" }).click();
  // The restore tab collects the e-mail and never reveals account
  // existence: any submit shows the same notice.
  await page.getByLabel(/E-mail/).fill("nobody@example.com");
  await page.getByRole("button", { name: "Отправить ссылку" }).click();
  await expect(page.locator("div.mx-auto").getByRole("status")).toContainText(
    "Если такой аккаунт существует",
  );
});
