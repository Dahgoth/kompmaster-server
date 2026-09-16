/**
 * Orders page — list of user's orders
 */

import { api } from "../api.js";
import { escapeHtml, formatPrice, formatDate } from "../utils.js";

export async function renderOrders() {
  let orders = [];
  let loading = true;

  try {
    const resp = await api.get("/orders/my", { auth: true });
    if (resp.ok && resp.data) {
      orders = resp.data;
    }
  } catch {} finally {
    loading = false;
  }

  if (orders.length === 0) {
    return `
      <section class="section">
        <div class="shell">
          <h1 class="section-title">Мои заказы</h1>
          <div style="text-align:center;padding:60px;">
            <p style="color:var(--muted);margin-bottom:24px;">У вас пока нет заказов</p>
            <a href="/catalog" class="btn btn--primary">Перейти в каталог</a>
          </div>
        </div>
      </section>
    `;
  }

  return `
    <section class="section">
      <div class="shell">
        <h1 class="section-title">Мои заказы</h1>
        <div class="orders-list">
          ${orders.map((order) => `
            <div class="order-card">
              <div class="order-card__header">
                <div class="order-card__num">Заказ № ${escapeHtml(order.order_number || order.id)}</div>
                <div class="order-card__date">${formatDate(order.created_at)}</div>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <div class="order-card__items">
                  ${order.items?.slice(0, 5).map((item) => `
                    <div style="font-size:12px;color:var(--muted);">${escapeHtml(item.name)} × ${item.quantity}</div>
                  `).join("") || ""}
                </div>
                <div style="text-align:right;">
                  <div style="font-weight:700;">${formatPrice(order.total)}</div>
                  <span class="badge" style="background:#eef1f3;color:#555;font-size:12px;">${escapeHtml(getStatusLabel(order.status))}</span>
                </div>
              </div>
              <div style="margin-top:14px;">
                <a href="/order/${escapeHtml(order.id)}" class="text-pink">Подробнее →</a>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}

function getStatusLabel(status) {
  const map = {
    new: "Формируется заказ",
    en_route: "В пути",
    arrived: "Прибыл",
    delivery: "В пути к клиенту",
    completed: "Завершён",
    cancelled: "Отменён",
    pending_payment: "Ожидает оплаты",
  };
  return map[status] || status || "—";
}
