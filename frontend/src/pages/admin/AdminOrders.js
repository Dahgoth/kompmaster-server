/**
 * Admin orders page
 * GET /admin/orders — list all orders
 */

import { api } from "../../api.js";
import { escapeHtml, formatPrice, formatDate } from "../../utils.js";

export async function renderAdminOrders() {
  let orders = [];
  try {
    const resp = await api.get("/orders", { admin: true });
    if (resp.ok && resp.data) orders = resp.data;
  } catch {}

  return `
    <div class="admin-card">
      <h2>Заказы</h2>
      ${
        orders.length === 0
          ? `
        <p style="color:var(--muted);">Нет заказов</p>
      `
          : `
        <table class="admin-table">
          <thead>
            <tr>
              <th>№</th><th>Дата</th><th>Сумма</th><th>Статус</th><th>Оплата</th>
            </tr>
          </thead>
          <tbody>
            ${orders
              .map(
                (o) => `
              <tr onclick="window.navigateTo('/admin/orders/${escapeHtml(o.id)}')" style="cursor:pointer;">
                <td>${escapeHtml(o.order_number || o.id)}</td>
                <td>${formatDate(o.created_at)}</td>
                <td>${formatPrice(o.total)}</td>
                <td><span data-status="${escapeHtml(getStatusValue(o.status))}">${escapeHtml(getStatusLabel(o.status))}</span></td>
                <td>${escapeHtml(o.payment_method || "—")}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      `
      }
    </div>
  `;
}

function getStatusValue(s) {
  return s || "new";
}
function getStatusLabel(status) {
  const map = {
    new: "Формируется заказ",
    en_route: "В пути",
    arrived: "Прибыл",
    delivery: "В пути к клиенту",
    completed: "Завершён",
    cancelled: "Отменён",
  };
  return map[status] || status;
}
