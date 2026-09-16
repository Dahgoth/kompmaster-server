/**
 * Admin products page
 * GET /admin/products — list all products for management
 */

import { api } from "../../api.js";
import { escapeHtml, formatPrice } from "../../utils.js";

export async function renderAdminProducts() {
  let products = [];
  try {
    const resp = await api.get("/products", { admin: true });
    if (resp.ok && resp.data) products = resp.data;
  } catch {}

  return `
    <div class="admin-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
        <h2>Товары</h2>
        <button class="btn btn--primary btn--small" onclick="window.navigateTo('/admin/products/new')">
          + Добавить товар
        </button>
      </div>

      ${products.length === 0 ? `
        <p style="color:var(--muted);">Нет товаров</p>
      ` : `
        <table class="admin-table">
          <thead>
            <tr>
              <th>ID</th><th>Название</th><th>Цена</th><th>В наличии</th><th>Действия</th>
            </tr>
          </thead>
          <tbody>
            ${products.map((p) => `
              <tr>
                <td>${escapeHtml(String(p.id).slice(0, 8))}</td>
                <td>${escapeHtml(p.name || "")}</td>
                <td>${formatPrice(p.price)}</td>
                <td>${p.in_stock ? "✓" : "—"}</td>
                <td>
                  <div class="admin-actions">
                    <a href="/admin/products/${escapeHtml(p.id)}">✏️</a>
                  </div>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `}
    </div>
  `;
}
