/**
 * Admin reviews page
 */

import { api } from "../../api.js";

export async function renderAdminReviews() {
  let reviews = [];
  try {
    const resp = await api.get("/reviews", { admin: true });
    if (resp.ok && resp.data) reviews = resp.data;
  } catch {}

  return `
    <div class="admin-card">
      <h2>Отзывы</h2>
      <table class="admin-table">
        <thead>
          <tr><th>Пользователь</th><th>Товар</th><th>Оценка</th><th>Текст</th></tr>
        </thead>
        <tbody>
          ${reviews.map((r) => `
            <tr>
              <td>${r.user_email || r.user_id}</td>
              <td>${r.product_id}</td>
              <td>${r.rating}/5</td>
              <td>${r.comment || ""}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}
