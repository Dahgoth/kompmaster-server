const express = require("express");
const db = require("../db");
const { requireAuth, requireRole, requireAdminPanelSession } = require("../middleware/auth");
const { notifyAdmin } = require("../utils/telegram");

const router = express.Router();

// Публично — только одобренные отзывы конкретного товара.
router.get("/product/:productId", async (req, res) => {
  const { rows } = await db.query(
    "SELECT * FROM reviews WHERE product_id = $1 AND status = 'approved' ORDER BY created_at DESC",
    [req.params.productId]
  );
  res.json(rows);
});

// Оставить отзыв — только если реально покупал этот товар (заказ оплачен).
router.post("/product/:productId", requireAuth, async (req, res) => {
  const { rating, text } = req.body || {};
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: "Оценка от 1 до 5" });

  const purchased = await db.query(
    `SELECT 1 FROM orders
     WHERE user_id = $1 AND payment_status = 'Оплачено'
       AND items @> jsonb_build_array(jsonb_build_object('productId', $2::text))
     LIMIT 1`,
    [req.user.id, req.params.productId]
  );
  if (!purchased.rows.length) {
    return res.status(403).json({ error: "Оставить отзыв можно только после покупки этого товара" });
  }
  const already = await db.query("SELECT 1 FROM reviews WHERE product_id=$1 AND user_id=$2", [req.params.productId, req.user.id]);
  if (already.rows.length) return res.status(409).json({ error: "Вы уже оставляли отзыв на этот товар" });

  const { rows } = await db.query(
    `INSERT INTO reviews (product_id, user_id, author_name, rating, text, source, status)
     VALUES ($1,$2,$3,$4,$5,'customer','pending') RETURNING *`,
    [req.params.productId, req.user.id, req.user.display_name, rating, text || null]
  );
  notifyAdmin(`⭐ Новый отзыв ждёт модерации (товар ${req.params.productId})`);
  res.json(rows[0]);
});

// ---- Админка: модерация ----
router.get("/pending", requireAuth, requireRole(["admin"]), requireAdminPanelSession, async (req, res) => {
  const { rows } = await db.query(
    `SELECT r.*, p.name AS product_name FROM reviews r
     JOIN products p ON p.id = r.product_id
     WHERE r.status = 'pending' ORDER BY r.created_at`
  );
  res.json(rows);
});

router.put("/:id/approve", requireAuth, requireRole(["admin"]), requireAdminPanelSession, async (req, res) => {
  const { rows } = await db.query("UPDATE reviews SET status='approved' WHERE id=$1 RETURNING *", [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: "Отзыв не найден" });
  res.json(rows[0]);
});

router.delete("/:id", requireAuth, requireRole(["admin"]), requireAdminPanelSession, async (req, res) => {
  await db.query("DELETE FROM reviews WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
});

// Добавление отзыва вручную админом — публикуется сразу, без модерации.
router.post("/manual", requireAuth, requireRole(["admin"]), requireAdminPanelSession, async (req, res) => {
  const { productId, authorName, rating, text, image } = req.body || {};
  if (!productId || !authorName || !rating) return res.status(400).json({ error: "Нужны productId, authorName, rating" });
  const { rows } = await db.query(
    `INSERT INTO reviews (product_id, author_name, rating, text, image, source, status)
     VALUES ($1,$2,$3,$4,$5,'admin','approved') RETURNING *`,
    [productId, authorName, rating, text || null, image || null]
  );
  res.json(rows[0]);
});

module.exports = router;
