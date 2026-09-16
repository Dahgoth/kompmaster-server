/**
 * Profile page
 */

import { getState, setUser } from "../store.js";
import { escapeHtml } from "../utils.js";

export async function renderProfile() {
  const { user } = getState();

  if (!user) {
    return `
      <section class="section">
        <div class="shell">
          <h1 class="section-title">Личный кабинет</h1>
          <div style="text-align:center;padding:40px;">
            <p style="color:var(--muted);margin-bottom:24px;">Войдите в аккаунт для просмотра профиля</p>
            <button class="btn btn--primary" onclick="window.showAuthModal('login')">Войти</button>
          </div>
        </div>
      </section>
    `;
  }

  return `
    <section class="section">
      <div class="shell">
        <h1 class="section-title">Личный кабинет</h1>
        <div class="form-block">
          <div class="form-group">
            <label>Имя</label>
            <input type="text" class="form-input" value="${escapeHtml(user.name || "")}" readonly>
          </div>
          <div class="form-group">
            <label>E-mail</label>
            <input type="email" class="form-input" value="${escapeHtml(user.email || "")}" readonly>
          </div>
          <div class="form-group">
            <label>Телефон</label>
            <input type="tel" class="form-input" value="${escapeHtml(user.phone || "")}" readonly>
          </div>
        </div>
        <div style="margin-top:24px;">
          <a href="/orders" class="btn btn--secondary">Мои заказы</a>
        </div>
      </div>
    </section>
  `;
}
