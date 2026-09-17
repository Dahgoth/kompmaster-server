/**
 * Admin users page
 */

import { api } from "../../api.js";

export async function renderAdminUsers() {
  let users = [];
  try {
    const resp = await api.get("/users", { admin: true });
    if (resp.ok && resp.data) users = resp.data;
  } catch {}

  return `
    <div class="admin-card">
      <h2>Пользователи</h2>
      <table class="admin-table">
        <thead>
          <tr><th>ID</th><th>E-mail</th><th>Имя</th><th>Роль</th></tr>
        </thead>
        <tbody>
          ${users
            .map(
              (u) => `
            <tr>
              <td>${u.id}</td>
              <td>${u.email}</td>
              <td>${u.name || ""}</td>
              <td>${u.role}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}
