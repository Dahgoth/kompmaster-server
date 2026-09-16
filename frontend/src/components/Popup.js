/**
 * Popup/toast component — shows transient messages
 */

export function renderPopup(message, type = "info") {
  return `
    <div class="popup is-shown ${type}">
      ${message}
    </div>
  `;
}
