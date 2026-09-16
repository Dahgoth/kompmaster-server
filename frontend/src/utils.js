/**
 * Utility functions — formatting, escaping, date helpers, DOM helpers
 */

export function formatPrice(amount) {
  if (amount == null || isNaN(amount)) return "—";
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPriceRaw(amount) {
  if (amount == null || isNaN(amount)) return "";
  return new Intl.NumberFormat("ru-RU").format(amount);
}

export function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatDate(dateString) {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString) {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateString;
  }
}

export function timeAgo(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return `${diff} сек назад`;
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} дней назад`;
  return formatDate(dateString);
}

export function throttle(fn, ms) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= ms) {
      lastCall = now;
      fn.apply(this, args);
    }
  };
}

export function debounce(fn, ms) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
}

export function qs(selector, scope = document) {
  return scope.querySelector(selector);
}

export function qsAll(selector, scope = document) {
  return scope.querySelectorAll(selector);
}

export function createElement(tag, { className, html, attrs = {}, listeners = {} } = {}) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (html !== undefined) el.innerHTML = html;
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false) continue;
    if (value === true) {
      el.setAttribute(key, "");
    } else {
      el.setAttribute(key, value);
    }
  }
  for (const [event, handler] of Object.entries(listeners)) {
    el.addEventListener(event, handler);
  }
  return el;
}

export function showEl(el) {
  if (el) el.classList.remove("hidden");
}

export function hideEl(el) {
  if (el) el.classList.add("hidden");
}

export function toggleEl(el, show) {
  if (el) el.classList.toggle("hidden", !show);
}

export function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[ё]+/g, "е")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function smoothScrollTo(y = 0, duration = 500) {
  const start = window.scrollY;
  const distance = y - start;
  const startTime = performance.now();

  function scroll() {
    const elapsed = performance.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    window.scrollTo(0, start + distance * ease);
    if (progress < 1) requestAnimationFrame(scroll);
  }

  requestAnimationFrame(scroll);
}

export function copyToClipboard(text) {
  return navigator.clipboard?.writeText(text) || Promise.resolve();
}
