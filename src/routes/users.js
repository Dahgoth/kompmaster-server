const express = require("express");
const db = require("../db");
const { requireAuth, requireRole, requireAdminPanelSession } = require("../middleware/auth");

const router = express.Router();

// Список пользователей — только настоящий admin, менеджеру не видно.
router.get("/", requireAuth, requireRole(["admin"]), requireAdminPanelSession, async (req, res) => {
  const { search } = req.query;
  const params = [];
  let where = "";
  if (search) {
    params.push(`%${search}%`);
    where = `WHERE login ILIKE $1 OR display_name ILIKE $1`;
  }
  const { rows } = await db.query(
    `SELECT id, login, display_name, role, created_at,
       (SELECT count(*) FROM orders o WHERE o.user_id = u.id) AS orders_count
     FROM users u ${where} ORDER BY created_at DESC`,
    params
  );
  res.json(rows);
});

// Выдать/снять роль по e-mail/телефону, ровно то, о чём просили: без
// правки кода, прямо через админку.
router.put("/:id/role", requireAuth, requireRole(["admin"]), requireAdminPanelSession, async (req, res) => {
  const { role } = req.body || {};
  if (!["user", "manager", "admin"].includes(role)) {
    return res.status(400).json({ error: "Роль должна быть user, manager или admin" });
  }
  const { rows } = await db.query("UPDATE users SET role = $1 WHERE id = $2 RETURNING id, login, role", [role, req.params.id]);
  if (!rows.length) return res.status(404).json({ error: "Пользователь не найден" });
  await db.query("INSERT INTO audit_log (user_id, action, details) VALUES ($1,$2,$3)", [
    req.user.id,
    "change_role",
    JSON.stringify({ targetUser: rows[0].login, newRole: role }),
  ]);
  res.json(rows[0]);
});

module.exports = router;
