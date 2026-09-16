/**
 * Manual payment page — shown when payment mode is "manual"
 * User contacts the manager via Telegram to complete the order
 */

import { api } from "../api.js";
import { paymentSettings } from "../data/payment.js";
import { escapeHtml } from "../utils.js";

export async function renderPaymentManual(params = {}) {
  const orderId = params.orderId;

  let order = null;
  if (orderId) {
    try {
      const resp = await api.get(`/orders/${orderId}`, { auth: true });
      if (resp.ok && resp.data) order = resp.data;
    } catch {}
  }

  const orderRef = order?.order_number || orderId || "";

  return `
    <section class="section">
      <div class="shell">
        <div class="section-card" style="max-width:600px;margin:0 auto;">
          <h1 class="section-title">Оплата заказа</h1>
          <p class="section-subtitle">${escapeHtml(paymentSettings.manualPageText)}</p>

          <div style="background:var(--soft);border-radius:16px;padding:24px;margin:28px 0;">
            <div style="font-size:14px;color:var(--muted);margin-bottom:8px;">Номер заказа</div>
            <div style="font-size:20px;font-weight:800;margin-bottom:18px;">№ ${escapeHtml(orderRef)}</div>
            <div style="font-size:14px;color:var(--muted);margin-bottom:8px;">Менеджер</div>
            <div style="font-size:18px;font-weight:700;margin-bottom:6px;">
              <a href="https://t.me/${escapeHtml(paymentSettings.managerTelegram)}" target="_blank" rel="noopener">
                @${escapeHtml(paymentSettings.managerTelegram)}
              </a>
            </div>
          </div>

          <div style="text-align:center;">
            <a href="https://t.me/${escapeHtml(paymentSettings.managerTelegram)}?start=order_${escapeHtml(orderRef)}"
               target="_blank" rel="noopener"
               class="btn btn--primary btn--large">
              Написать менеджеру в Telegram
            </a>
          </div>

          <div style="margin-top:28px;padding-top:22px;border-top:1px solid var(--line);font-size:13px;color:var(--muted);">
            <b>Как оформить оплату:</b>
            <ol style="margin-top:8px;line-height:1.8;">
              <li>Нажмите кнопку выше, чтобы открыть Telegram</li>
              <li>Упомяните номер вашего заказа</li>
              <li>Менеджер подтвердит способ оплаты</li>
              <li>После оплаты ваш заказ будет подтверждён</li>
            </ol>
          </div>
        </div>
      </div>
    </section>
  `;
}
