/**
 * CartItem component — renders a single item in the cart
 */

import { escapeHtml, formatPrice } from "../utils.js";

export function renderCartItem(item) {
  const price = item.price || 0;
  const total = price * item.quantity;

  return `
    <div class="cart-row" data-id="${escapeHtml(item.id)}">
      <img src="${escapeHtml(item.image_url || "/assets/no-image.svg")}"
           alt="${escapeHtml(item.name)}" class="cart-row__img">
      <div class="cart-row__body">
        <div class="cart-row__title">
          <a href="/product/${escapeHtml(item.id)}">${escapeHtml(item.name)}</a>
        </div>
        <div class="cart-row__specs">${escapeHtml(item.sku || "")}</div>
      </div>
      <div class="cart-row__qty">
        <div class="qty-stepper">
          <button type="button" class="qty-minus" aria-label="−">−</button>
          <input type="number" min="1" value="${item.quantity}" readonly>
          <button type="button" class="qty-plus" aria-label="+">+</button>
        </div>
      </div>
      <div class="cart-row__price">${formatPrice(total)}</div>
      <button class="cart-row__remove admin-btn" aria-label="Удалить">×</button>
    </div>
  `;
}
