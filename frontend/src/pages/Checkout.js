/**
 * Checkout page — order form with delivery and payment selection
 */

import { getState, getCartTotal, getCartCount } from "../store.js";
import { paymentSettings } from "../data/payment.js";
import { escapeHtml, formatPrice } from "../utils.js";
import { deliveryInfo } from "../data/content.js";

export async function renderCheckout() {
  const { cart, user } = getState();
  const total = getCartTotal();
  const count = getCartCount();

  if (count === 0) {
    return `
      <section class="section">
        <div class="shell">
          <p style="text-align:center;padding:60px;">
            <a href="/cart">Корзина пуста — вернитесь назад</a>
          </p>
        </div>
      </section>
    `;
  }

  const deliveryMethods = deliveryInfo.methods;

  return `
    <section class="section">
      <div class="shell">
        <h1 class="section-title">Оформление заказа</h1>

        <div class="checkout-steps">
          <div><div class="step-num active">1</div><div class="step-label">Корзина</div></div>
          <div><div class="step-num active">2</div><div class="step-label">Данные</div></div>
          <div><div class="step-num">3</div><div class="step-label">Оплата</div></div>
          <div><div class="step-num">4</div><div class="step-label">Готово</div></div>
        </div>

        <div class="checkout-grid">
          <form id="checkoutForm" class="checkout-form">
            <div class="form-block">
              <h2 style="font-size:18px;font-weight:750;margin-bottom:18px;">Контактные данные</h2>
              <div class="form-group">
                <label for="name">Имя *</label>
                <input type="text" id="name" name="name" class="form-input" value="${escapeHtml(user?.name || "")}" required>
              </div>
              <div class="form-row" style="display:flex;gap:14px;">
                <div class="form-group" style="flex:1;">
                  <label for="phone">Телефон *</label>
                  <input type="tel" id="phone" name="phone" class="form-input" required>
                </div>
                <div class="form-group" style="flex:1;">
                  <label for="email">E-mail *</label>
                  <input type="email" id="email" name="email" class="form-input" value="${escapeHtml(user?.email || "")}" required>
                </div>
              </div>
              <div class="form-group">
                <label for="city">Город *</label>
                <input type="text" id="city" name="city" class="form-input" list="cities" required>
                <datalist id="cities">
                  <option value="Сочи"><option value="Москва"><option value="Санкт-Петербург"><option value="Новосибирск"><option value="Екатеринбург">
                </datalist>
              </div>
              <div class="form-group">
                <label for="address">Адрес доставки *</label>
                <textarea id="address" name="address" class="form-input" rows="3" required></textarea>
              </div>
            </div>

            <div class="form-block">
              <h2 style="font-size:18px;font-weight:750;margin-bottom:18px;">Доставка</h2>
              <div class="delivery-grid">
                ${deliveryMethods
                  .map(
                    (m, i) => `
                  <label class="delivery-option" onclick="window.selectDelivery('${escapeHtml(m)}')">
                    <input type="radio" name="delivery" value="${escapeHtml(m)}" style="display:none;">
                    <div class="delivery-option__title">${escapeHtml(m)}</div>
                    <div class="delivery-option__price">от ${formatPrice(500 + i * 100)}</div>
                  </label>
                `,
                  )
                  .join("")}
              </div>
            </div>

            <div class="form-block">
              <h2 style="font-size:18px;font-weight:750;margin-bottom:18px;">Оплата</h2>
              <div class="payment-grid">
                ${
                  paymentSettings.mode === "manual"
                    ? `
                  <label class="payment-option active" onclick="window.selectPayment('manual')">
                    <input type="radio" name="payment" value="manual" checked style="display:none;">
                    <div class="payment-option__label">Связаться с менеджером</div>
                    <div class="payment-option__price" style="font-size:12px;color:var(--muted);">Ручная оплата через Telegram</div>
                  </label>
                `
                    : ""
                }
              </div>
            </div>

            <button type="submit" class="btn btn--primary btn--large btn--full">
              Оформить заказ на ${formatPrice(total)}
            </button>
          </form>

          <div class="order-summary">
            <h3 style="font-size:16px;font-weight:750;margin-bottom:16px;">Ваш заказ</h3>
            ${cart
              .map(
                (item) => `
              <div class="summary-row">
                <span>${escapeHtml(item.name)} × ${item.quantity}</span>
                <span>${formatPrice(item.price * item.quantity)}</span>
              </div>
            `,
              )
              .join("")}
            <div class="summary-row">
              <span>Доставка</span>
              <span>—</span>
            </div>
            <div class="summary-row summary-total">
              <span>Итого</span>
              <strong>${formatPrice(total)}</strong>
            </div>
          </div>
        </div>
      </div>
    </section>

    <style>
      .checkout-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 40px; }
      .form-row { display: flex; gap: 14px; }
      @media (max-width: 820px) { .checkout-grid { grid-template-columns: 1fr; } .form-row { flex-direction: column; gap: 0; } }
    </style>
  `;
}
