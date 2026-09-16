/**
 * Notice component — informational alert boxes
 */

import { escapeHtml } from "../utils.js";

export function renderNotice({ message, type = "info", icon = true }) {
  return `
    <div class="notice notice--${type}">
      ${icon ? `<span style="margin-right:8px;">ⓘ</span>` : ""}
      ${escapeHtml(message)}
    </div>
  `;
}
