/**
 * Auth page — login/register forms
 * Note: The actual auth form is rendered as a modal (see AuthHandlers.js),
 * but this page provides a standalone view for /auth route.
 */

export async function renderAuth() {
  return `
    <section class="section">
      <div class="shell">
        <div class="auth-form">
          <h1>Вход / Регистрация</h1>
          <p style="text-align:center;color:var(--muted);margin-bottom:32px;">
            Введите e-mail и пароль, либо пройдите регистрацию.
          </p>
          <button class="btn btn--primary btn--full" style="height:48px;" onclick="window.showAuthModal('login')">
            Войти
          </button>
          <button class="btn btn--secondary btn--full" style="height:48px;margin-top:12px;" onclick="window.showAuthModal('register')">
            Создать аккаунт
          </button>
        </div>
      </div>
    </section>
  `;
}
