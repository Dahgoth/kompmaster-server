/**
 * ProductCard component — for grid layout on catalog pages
 */

import { escapeHtml, formatPrice } from "../utils.js";

export function renderProductCard(product) {
  const price = product.price || 0;
  const oldPrice = product.old_price;
  const inStock = product.in_stock !== false;

  return `
    <article class="product-card" data-id="${escapeHtml(product.id)}">
      <img src="${escapeHtml(product.image_url || "/assets/no-image.svg")}"
           alt="${escapeHtml(product.name)}" class="product-card__img">
      <div class="product-card__body">
        <h3 class="product-card__title">
          <a href="/product/${escapeHtml(product.id)}">${escapeHtml(product.name)}</a>
        </h3>
        <div class="product-card__specs">
          ${renderSpecs(product.specs || product.attributes)}
        </div>
        <div class="product-card__price">
          ${formatPrice(price)}
          ${oldPrice ? `<span class="badge badge--sale" style="font-size:11px;">Скидка ${Math.round((1 - price / oldPrice) * 100)}% </span>` : ""}
        </div>
        <div class="product-card__btns">
          <button class="btn btn--secondary btn--small" onclick="window.addToCartFromCard('${escapeHtml(product.id)}')">Купить в 1 клик</button>
          <button class="btn btn--primary btn--small" onclick="window.addToCartFromCard('${escapeHtml(product.id)}', 1)">В корзину</button>
        </div>
      </div>
    </article>
  `;
}

function renderSpecs(specs) {
  if (!specs || typeof specs !== "object") return "";
  const entries = Object.entries(specs).slice(0, 2);
  return entries.map(([key, val]) => `${escapeHtml(key)}: ${escapeHtml(String(val))}`).join(" · ");
}
