/**
 * Footer component
 * Renders site footer with category links, menu links, and copyright
 */

import { contacts, siteContent } from "../data/content.js";
import { menuLabels, menuVisibility, menuOrder, defaultCategories } from "../data/categories.js";

export function renderFooter(_currentRoute = "home") {
  const footer = document.querySelector(".footer");
  if (!footer) return;

  const visibleCategories = defaultCategories.filter((c) => c.visible && c.kind === "catalog");

  let menuLinksHtml = "";
  menuOrder.forEach((key) => {
    if (key === "about" || key === "warranty") {
      if (menuVisibility[key]) {
        const href = key === "about" ? "/about" : "/warranty";
        menuLinksHtml += `<a href="${href}">${menuLabels[key]}</a>`;
      }
    } else if (key === "faq" || key === "contacts") {
      if (menuVisibility[key]) {
        const href = `/${key}`;
        menuLinksHtml += `<a href="${href}">${menuLabels[key]}</a>`;
      }
    }
  });

  footer.innerHTML = `
    <div class="shell">
      <div class="footer-grid">
        <div>
          <a href="/" class="brand brand--footer">КомпМастер</a>
          <p style="margin-top:14px;">${siteContent.about1}</p>
        </div>
        <div>
          <div class="footer-title">Категории</div>
          ${visibleCategories
            .slice(0, 8)
            .map((c) => `<a href="/category/${c.id}">${c.name}</a>`)
            .join("")}
          <a href="/catalog">Все категории →</a>
        </div>
        <div>
          <div class="footer-title">Меню</div>
          ${menuLinksHtml}
          <a href="${contacts.telegramLink}" target="_blank" rel="noopener">Telegram</a>
        </div>
      </div>
      <div class="footer-copy">
        © 2026 КомпМастер. Восстановленная электроника. Все права защищены.
      </div>
    </div>
  `;
}
