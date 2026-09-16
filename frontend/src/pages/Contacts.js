/**
 * Contacts page
 */

import { contacts, deliveryInfo } from "../data/content.js";
import { paymentSettings } from "../data/payment.js";
import { escapeHtml } from "../utils.js";

export async function renderContacts() {
  return `
    <section class="section">
      <div class="shell">
        <h1 class="section-title">Контакты</h1>

        <div class="contact-grid" style="display:grid;grid-template-columns:repeat(2,1fr);gap:22px;">
          <div class="contact-card">
            <div class="contact-card__icon">📍</div>
            <div class="contact-card__title">Адрес</div>
            <div class="contact-card__text">
              ${escapeHtml(contacts.address)}
              <br><span style="color:var(--muted);">${escapeHtml(contacts.address2)}</span>
            </div>
          </div>
          <div class="contact-card">
            <div class="contact-card__icon">📞</div>
            <div class="contact-card__title">Телефон</div>
            <div class="contact-card__text">${escapeHtml(contacts.phone || "по Telegram")}</div>
          </div>
          <div class="contact-card">
            <div class="contact-card__icon">✉️</div>
            <div class="contact-card__title">E-mail</div>
            <div class="contact-card__text">${escapeHtml(contacts.email)}</div>
          </div>
          <div class="contact-card">
            <div class="contact-card__icon">💬</div>
            <div class="contact-card__title">Telegram</div>
            <div class="contact-card__text">
              <a href="${contacts.telegramLink}" target="_blank" rel="noopener">@${escapeHtml(contacts.telegram)}</a>
              <br><span style="color:var(--muted);">Ежедневно 10:00–20:00</span>
            </div>
          </div>
        </div>

        ${paymentSettings.mode === "manual" ? `
          <div class="notice notice--info" style="margin-top:28px;">
            <b>Оплата товара.</b> ${escapeHtml(paymentSettings.manualPageText)}
          </div>
        ` : ""}

        <div class="map-wrapper" style="margin-top:28px;">
          <div class="img-placeholder" style="width:100%;height:100%;">
            Карта проезда к офису
          </div>
        </div>
      </div>
    </section>
  `;
}
