/**
 * ProductRow component — horizontal product layout for cart/detail pages
 */

import { escapeHtml, formatPrice } from "../utils.js";

export function renderProductRow(product) {
  const price = product.price || 0;
  const inStock = product.in_stock !== false;

  return `
    <article class="product-row" data-id="${escapeHtml(product.id)}">
      <img src="${escapeHtml(product.image_url || "/assets/no-image.svg")}"
           alt="${escapeHtml(product.name)}" class="product-row__img">
      <div class="product-row__body">
        <h3 class="product-row__title">
          <a href="/product/${escapeHtml(product.id)}">${escapeHtml(product.name)}</a>
        </h3>
        ${product.sku ? `<div class="product-row__sku">Арт: ${escapeHtml(product.sku)}</div>` : ""}
        <div class="product-row__specs">${renderSpecs(product.specs || product.attributes)}</div>
        <div class="product-row__price">${formatPrice(price)}</div>
        <div class="product-row__btns">
          ${
            inStock
              ? `<button class="btn btn--primary btn--small" onclick="window.addToCart('${escapeHtml(product.id)}')">В корзину</button>`
              : `<button class="btn btn--secondary btn--small" disabled>Нет в наличии</button>`
          }
        </div>
      </div>
    </article>
  `;
}

function renderSpecs(specs) {
  if (!specs || typeof specs !== "object") return "";
  const entries = Object.entries(specs).slice(0, 3);
  return entries
    .map(([key, val]) => `<span>${escapeHtml(key)}: ${escapeHtml(String(val))}</span>`)
    .join("");
}
