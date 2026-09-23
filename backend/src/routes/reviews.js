const express = require("express");
const db = require("../db");
const { requireAuth, requireRole, requireAdminPanelSession } = require("../middleware/auth");
const { adminLimiter } = require("../middleware/rateLimit");
const { notifyAdmin } = require("../utils/telegram");

const router = express.Router();

// Публично — только одобренные отзывы конкретного товара.
// product id (UUID) валидируется до запроса: pg выбросит 22P02
// (invalid input syntax for type uuid) на произвольных строках — crash в prod
// 2026-09-22. Транслит-слаги удалены (ADR 007, поправка 2026-09-23),
// поэтому резолв сводится к UUID-гарду.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function resolveProductId(client, id) {
  if (!UUID_RE.test(String(id))) return null;
  const { rows } = await client.query("SELECT id FROM products WHERE id = $1", [id]);
  return rows[0]?.id ?? null;
}

router.get("/product/:productId", async (req, res) => {
  const productId = await resolveProductId(db, req.params.productId);
  if (!productId) return res.status(404).json({ error: "Товар не найден" });
  const { rows } = await db.query(
    "SELECT * FROM reviews WHERE product_id = $1 AND status = 'approved' ORDER BY created_at DESC",
    [productId],
  );
  res.json(rows);
});

// Оставить отзыв — только если реально покупал этот товар (заказ оплачен).
router.post("/product/:productId", requireAuth, async (req, res) => {
  const { rating, text } = req.body || {};
  if (!rating || rating < 1 || rating > 5)
    return res.status(400).json({ error: "Оценка от 1 до 5" });

  const productId = await resolveProductId(db, req.params.productId);
  if (!productId) return res.status(404).json({ error: "Товар не найден" });
  const purchased = await db.query(
    `SELECT 1 FROM orders
     WHERE user_id = $1 AND payment_status = 'Оплачено'
       AND items @> jsonb_build_array(jsonb_build_object('productId', $2::text))
     LIMIT 1`,
    [req.user.id, productId],
  );
  if (!purchased.rows.length) {
    return res
      .status(403)
      .json({ error: "Оставить отзыв можно только после покупки этого товара" });
  }
  const already = await db.query("SELECT 1 FROM reviews WHERE product_id=$1 AND user_id=$2", [
    productId,
    req.user.id,
  ]);
  if (already.rows.length)
    return res.status(409).json({ error: "Вы уже оставляли отзыв на этот товар" });

  const { rows } = await db.query(
    `INSERT INTO reviews (product_id, user_id, author_name, rating, text, source, status)
     VALUES ($1,$2,$3,$4,$5,'customer','pending') RETURNING *`,
    [productId, req.user.id, req.user.display_name, rating, text || null],
  );
  notifyAdmin(`⭐ Новый отзыв ждёт модерации (товар ${productId})`);
  res.json(rows[0]);
});

// ---- Админка: модерация ----
router.get(
  "/pending",
  adminLimiter,
  requireAuth,
  requireRole(["admin"]),
  requireAdminPanelSession,
  async (req, res) => {
    const { rows } = await db.query(
      `SELECT r.*, p.name AS product_name FROM reviews r
     JOIN products p ON p.id = r.product_id
     WHERE r.status = 'pending' ORDER BY r.created_at`,
    );
    res.json(rows);
  },
);

router.put(
  "/:id/approve",
  adminLimiter,
  requireAuth,
  requireRole(["admin"]),
  requireAdminPanelSession,
  async (req, res) => {
    const { rows } = await db.query(
      "UPDATE reviews SET status='approved' WHERE id=$1 RETURNING *",
      [req.params.id],
    );
    if (!rows.length) return res.status(404).json({ error: "Отзыв не найден" });
    res.json(rows[0]);
  },
);

router.delete(
  "/:id",
  adminLimiter,
  requireAuth,
  requireRole(["admin"]),
  requireAdminPanelSession,
  async (req, res) => {
    await db.query("DELETE FROM reviews WHERE id=$1", [req.params.id]);
    res.json({ ok: true });
  },
);

// Добавление отзыва вручную админом — публикуется сразу, без модерации.
router.post(
  "/manual",
  adminLimiter,
  requireAuth,
  requireRole(["admin"]),
  requireAdminPanelSession,
  async (req, res) => {
    const { productId, authorName, rating, text, image } = req.body || {};
    if (!productId || !authorName || !rating)
      return res.status(400).json({ error: "Нужны productId, authorName, rating" });
    const { rows } = await db.query(
      `INSERT INTO reviews (product_id, author_name, rating, text, image, source, status)
     VALUES ($1,$2,$3,$4,$5,'admin','approved') RETURNING *`,
      [productId, authorName, rating, text || null, image || null],
    );
    res.json(rows[0]);
  },
);

module.exports = router;
