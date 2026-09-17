const express = require("express");
const db = require("../db");
const { requireAuth, requireRole, requireAdminPanelSession } = require("../middleware/auth");
const { notifyAdmin } = require("../utils/telegram");

const router = express.Router();

function generateOrderNumber() {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `KM-${stamp}-${Math.floor(1000 + Math.random() * 9000)}`;
}

// ---- Создание заказа: атомарное списание остатка ----
// Именно то место, где в статической HTML-бете гонки быть не могло (один
// браузер — один пользователь), а на сервере с параллельными запросами
// без блокировки строки два покупателя могли бы увести остаток в минус.
router.post("/", requireAuth, async (req, res) => {
  const { items, receiveMethod, address, contactPhone } = req.body || {};
  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: "Корзина пуста" });
  }

  const client = await db.getClient();
  try {
    await client.query("BEGIN");
    const priced = [];
    for (const item of items) {
      // SELECT ... FOR UPDATE — блокирует строку товара до конца транзакции,
      // чтобы два одновременных заказа не увели остаток в минус.
      const { rows } = await client.query(
        "SELECT id, name, price, available FROM products WHERE id = $1 FOR UPDATE",
        [item.productId]
      );
      const product = rows[0];
      if (!product) throw Object.assign(new Error(`Товар ${item.productId} не найден`), { status: 400 });
      if (product.available < item.qty) {
        throw Object.assign(
          new Error(`Недостаточно товара «${product.name}»: в наличии ${product.available}, запрошено ${item.qty}`),
          { status: 409 }
        );
      }
      await client.query("UPDATE products SET available = available - $1 WHERE id = $2", [item.qty, product.id]);
      priced.push({ productId: product.id, name: product.name, price: Number(product.price), qty: item.qty });
    }

    const subtotal = priced.reduce((s, x) => s + x.price * x.qty, 0);
    const number = generateOrderNumber();
    const { rows: orderRows } = await client.query(
      `INSERT INTO orders (number, user_id, items, subtotal, total, receive_method, address, contact_phone)
       VALUES ($1,$2,$3,$4,$4,$5,$6,$7) RETURNING *`,
      [number, req.user.id, JSON.stringify(priced), subtotal, receiveMethod || "pickup", address || null, contactPhone || null]
    );
    const order = orderRows[0];
    await client.query("INSERT INTO order_history (order_id, text) VALUES ($1, 'Заказ создан')", [order.id]);
    await client.query("COMMIT");

    notifyAdmin(`🛒 Новый заказ ${order.number} на сумму ${subtotal} ₽`);
    res.json(order);
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(err.status || 500).json({ error: err.message || "Не удалось оформить заказ" });
  } finally {
    client.release();
  }
});

// Мои заказы
router.get("/my", requireAuth, async (req, res) => {
  const { rows } = await db.query("SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC", [req.user.id]);
  res.json(rows);
});

router.get("/my/:id", requireAuth, async (req, res) => {
  const { rows } = await db.query("SELECT * FROM orders WHERE id = $1 AND user_id = $2", [req.params.id, req.user.id]);
  if (!rows.length) return res.status(404).json({ error: "Заказ не найден" });
  const history = await db.query("SELECT * FROM order_history WHERE order_id = $1 ORDER BY created_at", [req.params.id]);
  res.json({ ...rows[0], history: history.rows });
});

// ---- Админка / менеджер: список и управление статусом ----
// И admin, и manager проходят сюда — по ТЗ менеджеру доступны только заказы.
router.get(
  "/",
  requireAuth,
  requireRole(["admin", "manager"]),
  requireAdminPanelSession,
  async (req, res) => {
    const { status, search, page = 1, pageSize = 30 } = req.query;
    const conditions = [];
    const params = [];
    if (status) { params.push(status); conditions.push(`status = $${params.length}`); }
    if (search) { params.push(`%${search}%`); conditions.push(`number ILIKE $${params.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = Math.min(100, Number(pageSize) || 30);
    const offset = (Math.max(1, Number(page) || 1) - 1) * limit;
    params.push(limit, offset);
    const { rows } = await db.query(
      `SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json(rows);
  }
);

router.put(
  "/:id/status",
  requireAuth,
  requireRole(["admin", "manager"]),
  requireAdminPanelSession,
  async (req, res) => {
    const { status } = req.body || {};
    if (!status) return res.status(400).json({ error: "Не передан статус" });
    const { rows } = await db.query(
      "UPDATE orders SET status = $1, status_updated_at = now() WHERE id = $2 RETURNING *",
      [status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Заказ не найден" });
    await db.query("INSERT INTO order_history (order_id, text) VALUES ($1, $2)", [req.params.id, `Статус изменён на «${status}»`]);
    res.json(rows[0]);
  }
);

// Отмена — доступна и менеджеру (это управление статусом), возвращает остаток на склад.
router.post(
  "/:id/cancel",
  requireAuth,
  requireRole(["admin", "manager"]),
  requireAdminPanelSession,
  async (req, res) => {
    const { reason } = req.body || {};
    const client = await db.getClient();
    try {
      await client.query("BEGIN");
      const { rows } = await client.query("SELECT * FROM orders WHERE id = $1 FOR UPDATE", [req.params.id]);
      const order = rows[0];
      if (!order) throw Object.assign(new Error("Заказ не найден"), { status: 404 });
      if (order.status !== "Отменён") {
        for (const item of order.items) {
          await client.query("UPDATE products SET available = available + $1 WHERE id = $2", [item.qty, item.productId]);
        }
      }
      await client.query(
        "UPDATE orders SET status = 'Отменён', cancel_reason = $1, status_updated_at = now() WHERE id = $2",
        [reason || null, order.id]
      );
      await client.query("INSERT INTO order_history (order_id, text) VALUES ($1, $2)", [
        order.id,
        `Заказ отменён администратором${reason ? ": " + reason : ""}`,
      ]);
      await client.query("COMMIT");
      res.json({ ok: true });
    } catch (err) {
      await client.query("ROLLBACK");
      res.status(err.status || 500).json({ error: err.message });
    } finally {
      client.release();
    }
  }
);

// Полное удаление заказа — только настоящий admin (не manager), это
// разрушительнее, чем управление статусом.
router.delete("/:id", requireAuth, requireRole(["admin"]), requireAdminPanelSession, async (req, res) => {
  await db.query("DELETE FROM orders WHERE id = $1", [req.params.id]);
  res.json({ ok: true });
});

// ---- Вебхук платёжной системы ----
// Идемпотентно: каждое provider_event_id обрабатывается только один раз,
// даже если провайдер пришлёт уведомление повторно из-за сбоя на своей стороне.
router.post("/payment-webhook", async (req, res) => {
  const { eventId, orderNumber, status } = req.body || {};
  if (!eventId || !orderNumber) return res.status(400).json({ error: "Некорректное уведомление" });

  try {
    await db.query("INSERT INTO payment_webhook_events (provider_event_id) VALUES ($1)", [eventId]);
  } catch (err) {
    // Уникальный ключ уже есть — значит это уведомление мы уже обработали.
    return res.json({ ok: true, duplicate: true });
  }

  if (status === "paid") {
    await db.query(
      "UPDATE orders SET payment_status = 'Оплачено', paid_at = now() WHERE number = $1",
      [orderNumber]
    );
    notifyAdmin(`💰 Заказ ${orderNumber} оплачен`);
  }
  res.json({ ok: true });
});

module.exports = router;
