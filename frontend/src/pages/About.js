/**
 * About page
 */

import { aboutText, aboutProcess, aboutBusiness, siteContent, contacts } from "../data/content.js";
import { escapeHtml } from "../utils.js";

export async function renderAbout() {
  return `
    <section class="section">
      <div class="shell">
        <div class="section-card" style="padding:42px;">
          <h1 class="section-title">О нас</h1>
          <p class="section-subtitle">${siteContent.about1}</p>

          <h2 style="font-size:22px;font-weight:750;margin:38px 0 16px;">Как это работает</h2>
          <p>${aboutProcess}</p>

          <h2 style="font-size:22px;font-weight:750;margin:38px 0 16px;">Опт и юридическим лицам</h2>
          <p>${aboutBusiness}</p>

          <div style="margin-top:38px;text-align:center;">
            <a href="${contacts.telegramLink}" target="_blank" rel="noopener" class="btn btn--primary">
              Связаться в Telegram
            </a>
          </div>
        </div>
      </div>
    </section>
  `;
}
