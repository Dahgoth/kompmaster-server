/**
 * Breadcrumb component
 */

import { escapeHtml } from "../utils.js";

export function renderBreadcrumb(crumbs = []) {
  if (!crumbs.length) return "";

  const items = crumbs.map(
    (c, i) =>
      `<a href="${escapeHtml(c.href)}">${escapeHtml(c.label)}</a><span class="separator">/</span>`
  );

  const last = crumbs[crumbs.length - 1];

  return `
    <nav class="breadcrumbs shell">
      <a href="/">Главная</a>
      <span class="separator">/</span>
      ${crumbs.slice(0, -1).map((c) => `<a href="${escapeHtml(c.href)}">${escapeHtml(c.label)}</a><span class="separator">/</span>`).join("")}
      <span class="current">${escapeHtml(last?.label || "")}</span>
    </nav>
  `;
}
