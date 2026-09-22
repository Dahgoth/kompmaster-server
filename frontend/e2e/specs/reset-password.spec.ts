import { mockServer } from "../mocks";
import { expect, test } from "../fixtures";

/** Plan §8: reset-password — the v1 bug covered: token consumed, not dropped. */
test.beforeAll(() => mockServer.listen({ onUnhandledRequest: "error" }));
test.afterAll(() => mockServer.close());

test("valid token sets a new password (Tier B — real reset row)", async () => {
  test.skip(
    true,
    "Tier A MSW cannot serve this: the store's rewrite proxies /api/* to the " +
      "real backend, bypassing MSW. Covered in Tier B with a seeded reset token.",
  );
});

test("expired token surfaces the backend error", async ({ page }) => {
  await page.goto("/reset-password?token=stale-token");
  await page.getByLabel("Новый пароль", { exact: true }).fill("newsecret1");
  await page.getByLabel("Повторите пароль").fill("newsecret1");
  await page.getByRole("button", { name: "Сохранить пароль" }).click();
  // Next's route announcer also carries role=alert — scope to the form.
  await expect(page.locator("main").getByRole("alert").first()).toContainText(
    "недействительна или устарела",
  );
});

test("missing token explains itself", async ({ page }) => {
  await page.goto("/reset-password");
  await expect(page.getByText("в адресе нет токена")).toBeVisible();
});
