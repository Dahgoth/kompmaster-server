/**
 * FAQ page
 */

import { faq } from "../data/content.js";
import { escapeHtml } from "../utils.js";

export async function renderFaq() {
  const items = faq.filter((f) => f.visible !== false);

  return `
    <section class="section">
      <div class="shell">
        <h1 class="section-title">Часто задаваемые вопросы</h1>
        <p class="section-subtitle">Ответы на самые популярные вопросы о товарах, доставке и оплате.</p>

        <div class="faq-list">
          ${items
            .map(
              (item) => `
            <div class="faq-item">
              <div class="faq-item__question" onclick="window.toggleFaq(this)">
                ${escapeHtml(item.q)}
                <span class="faq-item__icon" style="margin-left:auto;transition:0.2s;">▼</span>
              </div>
              <div class="faq-item__answer">
                ${escapeHtml(item.a).replace(/\\n\\n/g, "<br><br>")}
              </div>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}
