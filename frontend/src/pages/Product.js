/**
 * Product detail page
 */

import { api } from "../api.js";
import { escapeHtml, formatPrice } from "../utils.js";

export async function renderProduct(params = {}) {
  const { id } = params;
  let product = null;
  let loading = true;

  try {
    const resp = await api.get(`/products/${id}`);
    if (resp.ok && resp.data) {
      product = resp.data;
      loading = false;
    }
  } catch {
    loading = false;
  }

  if (loading || !product) {
    return `
      <section class="section">
        <div class="shell">
          <p style="text-align:center;padding:60px;">Товар не найден или не загружен</p>
        </div>
      </section>
    `;
  }

  const price = product.price || 0;
  const oldPrice = product.old_price;
  const discount = oldPrice ? Math.round((1 - price / oldPrice) * 100) : 0;
  const inStock = product.in_stock !== false;

  return `
    <section class="section">
      <div class="shell">
        <nav class="breadcrumbs">
          <a href="/">Главная</a>
          <span class="separator">/</span>
          <a href="/catalog">Каталог</a>
          <span class="separator">/</span>
          <span class="current">${escapeHtml(product.name)}</span>
        </nav>

        <div class="product-detail">
          <div class="detail-gallery">
            <img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}" class="detail-main-img" id="detailMainImg">
            ${product.gallery ? `<div class="detail-thumbs">${product.gallery.map((g) => `<img src="${escapeHtml(g)}" alt="${escapeHtml(product.name)}" class="detail-thumb" onclick="window.setMainImg('${escapeHtml(g)}')">`).join("")}</div>` : ""}
          </div>

          <div class="detail-body">
            <h1 class="detail-title">${escapeHtml(product.name)}</h1>
            <div class="detail-price">
              ${formatPrice(price)}
              ${oldPrice ? `<span style="font-size:16px;color:var(--muted);text-decoration:line-through;margin-left:10px;">${formatPrice(oldPrice)}</span>` : ""}
            </div>
            ${discount ? `<span class="badge badge--sale">Скидка ${discount}%</span>` : ""}
            <div class="detail-sku">Арт: ${escapeHtml(product.sku || "—")}</div>

            <table class="detail-specs-table">
              ${Object.entries(product.specs || product.attributes || {})
                .map(
                  ([key, val]) => `
                <tr><td>${escapeHtml(key)}</td><td>${escapeHtml(String(val))}</td></tr>
              `,
                )
                .join("")}
            </table>

            ${
              inStock
                ? `
              <div class="detail-actions">
                <div class="qty-stepper">
                  <button type="button" class="qty-minus">−</button>
                  <input type="number" id="detailQty" min="1" value="1">
                  <button type="button" class="qty-plus">+</button>
                </div>
                <button class="btn btn--primary" style="margin-left:16px;height:48px;" onclick="window.addToCart('${escapeHtml(product.id)}', parseInt(document.getElementById('detailQty').value) || 1)">
                  В корзину
                </button>
              </div>
            `
                : `<button class="btn btn--secondary btn--large" disabled>Нет в наличии</button>`
            }

            <div style="margin-top:26px;">
              <button class="btn btn--secondary" onclick="window.showAuthModal('login')">Купить в 1 клик</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}
