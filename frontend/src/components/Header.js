/**
 * Header component
 * Renders the site header with: contact info, navigation, cart, auth buttons
 */

import { getCartCount, getUser } from "../store.js";
import { escapeHtml, showEl } from "../utils.js";

function renderContactRow() {
  return `
    <div class="header-row header-row--contacts">
      <div class="location-stack shell">
        <span class="contact-address">
          <span class="pin">📍</span>
          <span class="moscow-text">Сочи, ул. Тепличная, 35А — Москва скоро</span>
        </span>
      </div>
      <div class="social-icons">
        <a href="https://t.me/compmasterone" target="_blank" rel="noopener" class="social-icon social-icon--telegram" aria-label="Telegram">
          <svg viewBox="0 0 24 24">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.56 8.56l-1.72 8.18c-.15.7-.17.75-.43.78-.32.04-.56-.14-.56-.14-.1-.08-.82-.48-1.5-.93-.4-.28-.6-.45-1.07-.62-.3-.12-1.1-.4-1.85-.74-.1-.04-.2-.07-.2-.15.07-.07.2-.1.3-.07.12.02.26.05.4.09.17.04 1.44.46 2.01.83.11.07.14.04.14-.08V12c-1.56-.3-2.87-.86-3.92-1.66-.02-.01-.06-.02-.08-.02-.01 0-.02-.01-.03-.01-.02.15-.08.4-0.15.62-.45 1.52-1.28 3.02-1.28 3.4 0 .3-.05 1.8-.05 2.15 0 .24.23.32.42.24.18-.08.37-.16.56-.24-.08-.1-2.86-1.22-4.5-2.1-.74-.38-1.04-.8-1.07-1.38-.02-.42 0-.76.15-1 .14-.2.33-.34.54-.42.17-.06.35-.1..42-.28.51-1.7 3.4-6.1 3.4-6.1.2-.33 0-.53.09-.66.09-.12.23-.08.34 0.1 0C10.4 4.07 12.3 3 14.4 3c.05 0 .14-.02.25-.02.1.02.2.05.3.1.1.05.2.1.28.22.7.9 1.1 2.15 1.1 3.42 0 .72-.07 1.42-.2 2.08.13 0 2.64 1.1 3.64 1.54.07.03.14.06.2.1.17-.16.3-.32.42-.49.1-.13.2-.25.3-.37.07-.1.13-.2.18-.3.05-.1.1-.2.12-.3z"></path>
          </svg>
        </a>
      </div>
    </div>
  `;
}

function renderTopBar() {
  const user = getUser();
  return `
    <div class="header-row header-row--main shell">
      <button class="icon-btn icon-btn--menu" id="menuToggle" aria-label="Меню">
        <span></span><span></span><span></span>
      </button>
      <a href="/" class="brand brand--button">КомпМастер</a>
      <div class="header-spacer"></div>
      <div class="header-actions">
        ${user ? `<span class="text-muted" style="align-self:center;font-size:13px;">${escapeHtml(user.username || user.email)}</span>` : '<a href="/auth" class="icon-btn" aria-label="Войти"><svg viewBox="0 0 24 24"><circle cx="12" cy="7" r="4" fill="currentColor"/><path d="M12 14c-4.4 0-8 2.7-8 6v3h16v-3c0-3.3-3.6-6-8-6z" fill="currentColor"/></svg></a>'}
        <a href="/cart" class="cart-btn" aria-label="Корзина">
          <svg viewBox="0 0 24 24"><path d="M2.06 3L5 20H19L21.95 3H2.06z"/><circle cx="15" cy="5" r="2"/><path d="M1 1v5M23 1v5"/></svg>
          <span class="cart-count">${getCartCount()}</span>
        </a>
      </div>
    </div>
  `;
}

export function renderHeader(_currentRoute = "home") {
  const header = document.querySelector(".site-header");
  if (!header) return;

  header.innerHTML = `
    ${renderContactRow()}
    ${renderTopBar()}
  `;

  const menuToggle = document.getElementById("menuToggle");
  if (menuToggle) {
    menuToggle.addEventListener("click", () => {
      const drawer = document.getElementById("drawer");
      if (drawer) drawer.classList.add("is-open");
      const backdrop = document.getElementById("drawerBackdrop");
      if (backdrop) showEl(backdrop);
    });
  }
}
