/**
 * Admin categories page
 */

import { api } from "../../api.js";
import { escapeHtml } from "../../utils.js";

export async function renderAdminCategories() {
  let categories = [];
  try {
    const resp = await api.get("/categories", { admin: true });
    if (resp.ok && resp.data) categories = resp.data;
  } catch {}

  return `
    <div class="admin-card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
        <h2>Категории</h2>
        <button class="btn btn--primary btn--small">+ Добавить</button>
      </div>
      <table class="admin-table">
        <thead>
          <tr><th>ID</th><th>Название</th><th>Тип</th><th>Родитель</th><th>Видимая</th></tr>
        </thead>
        <tbody>
          ${categories.map((c) => `
            <tr>
              <td>${escapeHtml(c.id)}</td>
              <td>${escapeHtml(c.name || "")}</td>
              <td>${escapeHtml(c.kind)}</td>
              <td>${escapeHtml(c.parent_id || c.parentId || "—")}</td>
              <td>${c.visible ? "✓" : "—"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}
