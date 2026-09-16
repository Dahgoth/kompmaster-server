/**
 * Order detail page
 */

import { api } from "../api.js";
import { escapeHtml, formatPrice, formatDate } from "../utils.js";

export async function renderOrder(params = {}) {
  const { id } = params;
  let order = null;
  let loading = true;

  try {
    const resp = await api.get(`/orders/${id}`, { auth: true });
    if (resp.ok && resp.data) order = resp.data;
  } finally {
    loading = false;
  }

  if (loading || !order) {
    return `
      <section class="section">
        <div class="shell">
          <p>Заказ не найден.</p>
        </div>
      </section>
    `;
  }

  return `
    <section class="section">
      <div class="shell">
        <h1 class="section-title">Заказ № ${escapeHtml(order.order_number || order.id)}</h1>

        <div class="order-card">
          <div class="order-card__header">
            <div>
              <div class="order-card__num">Статус: <span data-status="${escapeHtml(order.status)}">${getStatusLabel(order.status)}</span></div>
              <div class="order-card__date" style="margin-top:6px;">Дата: ${formatDate(order.created_at)}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:13px;color:var(--muted);">Оплата</div>
              <div>${escapeHtml(order.payment_method || "Связаться с менеджером")}</div>
            </div>
          </div>

          <div class="summary-row" style="margin-top:16px;">
            <span>Товары</span>
            <span>${formatPrice(order.total)}</span>
          </div>
          ${order.items?.map((item) => `
            <div class="summary-row">
              <span>${escapeHtml(item.name)} × ${item.quantity}</span>
              <span>${formatPrice(item.price * item.quantity)}</span>
            </div>
          `).join("") || ""}
          <div class="summary-row">
            <span>Доставка</span>
            <span>${formatPrice(order.delivery_price || 0)}</span>
          </div>
          <div class="summary-row summary-total">
            <span>Итого</span>
            <strong>${formatPrice(order.total)}</strong>
          </div>
        </div>
      </div>
    </section>
  `;
}

function getStatusLabel(status) {
  const map = {
    new: "Формируется заказ",
    en_route: "В пути",
    arrived: "Прибыл / готов к выдаче",
    delivery: "В пути к клиенту",
    completed: "Завершён / выдан",
    cancelled: "Отменён",
    pending_payment: "Ожидает оплаты",
  };
  return map[status] || status || "—";
}
