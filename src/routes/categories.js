const express = require("express");
const db = require("../db");
const { requireAuth, requireRole, requireAdminPanelSession } = require("../middleware/auth");

const router = express.Router();

// Публичный список категорий — виден всем на сайте.
router.get("/", async (req, res) => {
  const { rows } = await db.query("SELECT * FROM categories ORDER BY sort_order, name");
  res.json(rows);
});

router.post(
  "/",
  requireAuth,
  requireRole(["admin"]),
  requireAdminPanelSession,
  async (req, res) => {
    const { id, name, parentId, kind, image } = req.body || {};
    if (!id || !name) return res.status(400).json({ error: "Нужны id и name" });
    await db.query(
      `INSERT INTO categories (id, name, parent_id, kind, image)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET name = $2, parent_id = $3, kind = $4, image = $5`,
      [id, name, parentId || null, kind || "catalog", image || null]
    );
    res.json({ ok: true });
  }
);

router.delete(
  "/:id",
  requireAuth,
  requireRole(["admin"]),
  requireAdminPanelSession,
  async (req, res) => {
    await db.query("DELETE FROM categories WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  }
);

module.exports = router;
