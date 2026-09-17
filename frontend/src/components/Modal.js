/**
 * Modal component — generic modal with backdrop
 */

import { escapeHtml } from "../utils.js";

export function renderModal({ title, content, actions = [] }) {
  return `
    <div class="modal-content">
      ${title ? `<h2 style="margin-top:0;">${escapeHtml(title)}</h2>` : ""}
      <div class="modal-body">${content}</div>
      ${
        actions.length > 0
          ? `<div class="modal-actions" style="display:flex;gap:10px;margin-top:22px;">
        ${actions.map((a) => `<button class="btn btn--${a.variant || "secondary"}" data-action="${a.action}" ${a.disabled ? "disabled" : ""}>${escapeHtml(a.label)}</button>`).join("")}
      </div>`
          : ""
      }
    </div>
  `;
}
