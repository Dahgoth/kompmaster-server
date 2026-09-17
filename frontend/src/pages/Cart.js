/**
 * Cart page
 */

import { getState, getCartTotal, getCartCount } from "../store.js";
import { renderCartItem } from "../components/index.js";
import { formatPrice } from "../utils.js";

export async function renderCart() {
  const { cart } = getState();
  const total = getCartTotal();
  const count = getCartCount();

  if (count === 0) {
    return `
      <section class="section">
        <div class="shell">
          <h1 class="section-title">Корзина</h1>
          <div style="text-align:center;padding:60px;">
            <p style="color:var(--muted);margin-bottom:24px;">Корзина пуста</p>
            <a href="/catalog" class="btn btn--primary">Перейти в каталог</a>
          </div>
        </div>
      </section>
    `;
  }

  return `
    <section class="section">
      <div class="shell">
        <h1 class="section-title">Корзина (${count} шт.)</h1>

        <div class="cart-list">
          ${cart.map((item) => renderCartItem(item)).join("")}
        </div>

        <div class="order-summary">
          <div class="summary-row">
            <span>Товары (${count})</span>
            <span>${formatPrice(total)}</span>
          </div>
          <div class="summary-row">
            <span>Доставка</span>
            <span>рассчитывается при оформлении</span>
          </div>
          ${count >= 30 ? `<div class="summary-row"><span>Скидка оптовая (5%)</span><span>-${formatPrice(total * 0.05)}</span></div>` : ""}
          <div class="summary-row summary-total">
            <span>Итого</span>
            <strong>${formatPrice(total)}</strong>
          </div>
        </div>

        <div style="display:flex;justify-content:space-between;margin-top:28px;gap:14px;flex-wrap:wrap;">
          <button class="btn btn--secondary" onclick="window.clearCart()">Очистить корзину</button>
          <button class="btn btn--primary" onclick="window.navigateTo('/checkout')">
            Оформить заказ
          </button>
        </div>
      </div>
    </section>
  `;
}
