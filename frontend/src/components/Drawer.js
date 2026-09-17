/**
 * Drawer component — hamburger menu overlay
 */

import { defaultCategories } from "../data/categories.js";
import { siteContent } from "../data/content.js";
import { hideEl } from "../utils.js";

export function renderDrawer() {
  const drawer = document.getElementById("drawer");
  if (!drawer) return;

  const visibleCategories = defaultCategories.filter((c) => c.visible);
  const topLevel = visibleCategories.filter((c) => !c.parentId);
  const groupCategories = visibleCategories.filter((c) => c.parentId);

  drawer.innerHTML = `
    <div class="drawer__top">
      <a href="/" class="brand brand--button">КомпМастер</a>
      <button class="icon-btn" id="drawerClose" aria-label="Закрыть">
        <svg viewBox="0 0 24 24" width="22" height="22"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <nav class="drawer__nav">
      ${topLevel
        .map((c) => {
          if (c.kind === "group") {
            const children = groupCategories.filter((ch) => ch.parentId === c.id);
            return `
            <details class="drawer-group">
              <summary class="drawer-link">${c.name} <span>▼</span></summary>
              ${children.map((ch) => `<a href="/category/${ch.id}" class="drawer-link" style="padding-left:24px;">${ch.name}</a>`).join("")}
            </details>
          `;
          }
          return `<a href="/category/${c.id}" class="drawer-link">${c.name}</a>`;
        })
        .join("")}
    </nav>
    <div class="drawer__bottom">
      <div class="drawer-warranty">
        <b>Гарантия качества</b>
        <p>${siteContent.guarantee}</p>
        <a href="/warranty" class="btn btn--small btn--secondary drawer-warranty__btn">Подробнее</a>
      </div>
      <a href="/admin/login" class="drawer-admin-link">Вход для админа</a>
    </div>
  `;

  const closeBtn = document.getElementById("drawerClose");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      drawer.classList.remove("is-open");
      const backdrop = document.getElementById("drawerBackdrop");
      if (backdrop) hideEl(backdrop);
    });
  }
}
