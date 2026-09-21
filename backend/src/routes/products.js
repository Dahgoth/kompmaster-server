const express = require("express");
const multer = require("multer");
const db = require("../db");
const { requireAuth, requireRole, requireAdminPanelSession } = require("../middleware/auth");
const { adminLimiter } = require("../middleware/rateLimit");
const { parsePriceFile, findDuplicateNames } = require("../utils/priceImport");
const { slugify } = require("../utils/slugify");
const { revalidateStorefront } = require("../utils/revalidate");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// Публичный каталог: ?category=gpus&search=rtx&page=1&pageSize=30
// Форма ответа (массив) сохранена — статическая витрина v1 ещё живёт в
// проде и читает голый массив. Общее число строк отдаётся заголовком
// X-Total-Count (см. Access-Control-Expose-Headers в index.js).
router.get("/", async (req, res) => {
  const { category, search, page = 1, pageSize = 30 } = req.query;
  const conditions = [];
  const params = [];
  if (category) {
    params.push(category);
    conditions.push(`category_id = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`name ILIKE $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = Math.min(100, Number(pageSize) || 30);
  const offset = (Math.max(1, Number(page) || 1) - 1) * limit;
  params.push(limit, offset);
  const { rows } = await db.query(
    `SELECT * FROM products ${where} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  const countParams = params.slice(0, params.length - 2);
  const { rows: totals } = await db.query(
    `SELECT count(*)::int AS total FROM products ${where}`,
    countParams,
  );
  res.setHeader("X-Total-Count", String(totals[0]?.total ?? rows.length));
  res.json(rows);
});

// /:id принимает и UUID, и слаг (ADR 007 §2) — старые UUID-ссылки из
// Telegram-постов продолжают работать без карты редиректов.
router.get("/:id", async (req, res) => {
  const { rows } = await db.query("SELECT * FROM products WHERE id::text = $1 OR slug = $1", [
    req.params.id,
  ]);
  if (!rows.length) return res.status(404).json({ error: "Товар не найден" });
  res.json(rows[0]);
});

// Слаг уникален; коллизия транслита разрешается коротким суффиксом id.
async function uniqueSlug(client, candidate, excludeId) {
  let slug = candidate;
  if (!slug) return slug;
  for (;;) {
    const { rows } = await client.query(
      "SELECT 1 FROM products WHERE slug = $1 AND ($2::uuid IS NULL OR id <> $2::uuid)",
      [slug, excludeId ?? null],
    );
    if (!rows.length) return slug;
    slug = `${candidate}-${Math.random().toString(36).slice(2, 6)}`;
  }
}

router.get("/:id", async (req, res) => {
  const { rows } = await db.query("SELECT * FROM products WHERE id = $1", [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: "Товар не найден" });
  res.json(rows[0]);
});

router.post(
  "/",
  adminLimiter,
  requireAuth,
  requireRole(["admin"]),
  requireAdminPanelSession,
  async (req, res) => {
    const { categoryId, name, price, oldPrice, available, image, description, specs, slug } =
      req.body || {};
    if (!categoryId || !name || price === undefined) {
      return res.status(400).json({ error: "Нужны categoryId, name, price" });
    }
    // Слаг генерируется один раз (иммутабелен при переименованиях — ADR 007);
    // админ может задать его явно.
    const finalSlug = await uniqueSlug(db, slug || slugify(name), null);
    const { rows } = await db.query(
      `INSERT INTO products (category_id, name, price, old_price, available, image, description, specs, slug)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        categoryId,
        name,
        price,
        oldPrice || null,
        available || 0,
        image || null,
        description || null,
        specs ? JSON.stringify(specs) : null,
        finalSlug,
      ],
    );
    revalidateStorefront(["products", `product:${rows[0].id}`]);
    if (rows[0].slug) revalidateStorefront([`product:${rows[0].slug}`]);
    res.json(rows[0]);
  },
);

router.put(
  "/:id",
  adminLimiter,
  requireAuth,
  requireRole(["admin"]),
  requireAdminPanelSession,
  async (req, res) => {
    const { name, price, oldPrice, available, image, description, categoryId, slug } =
      req.body || {};
    const existing = await db.query(
      "SELECT id, price, slug FROM products WHERE id::text = $1 OR slug = $1",
      [req.params.id],
    );
    if (!existing.rows.length) return res.status(404).json({ error: "Товар не найден" });
    const product = existing.rows[0];

    // Слаг иммутабелен по умолчанию; явная смена слага — осознанное действие
    // администратора (внешние ссылки теряют актуальность без 301).
    let finalSlug = product.slug;
    if (slug !== undefined && slug !== product.slug) {
      finalSlug = await uniqueSlug(db, slug || null, product.id);
    }

    const { rows } = await db.query(
      `UPDATE products SET
       name = COALESCE($1, name),
       price = COALESCE($2, price),
       old_price = COALESCE($3, old_price),
       available = COALESCE($4, available),
       image = COALESCE($5, image),
       description = COALESCE($6, description),
       category_id = COALESCE($7, category_id),
       slug = COALESCE($8, slug),
       updated_at = now()
     WHERE id = $9 RETURNING *`,
      [name, price, oldPrice, available, image, description, categoryId, finalSlug, product.id],
    );
    // История изменения цены — только если цена реально поменялась.
    if (price !== undefined && Number(price) !== Number(existing.rows[0].price)) {
      await db.query(
        "INSERT INTO price_history (product_id, old_price, new_price) VALUES ($1,$2,$3)",
        [product.id, existing.rows[0].price, price],
      );
    }
    revalidateStorefront(["products", `product:${product.id}`]);
    if (rows[0]?.slug) revalidateStorefront([`product:${rows[0].slug}`]);
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
    const { rows } = await db.query(
      "DELETE FROM products WHERE id::text = $1 OR slug = $1 RETURNING id, slug",
      [req.params.id],
    );
    if (rows.length) {
      revalidateStorefront(["products", `product:${rows[0].id}`]);
      if (rows[0].slug) revalidateStorefront([`product:${rows[0].slug}`]);
    }
    res.json({ ok: true });
  },
);

// ---- Импорт прайса (xlsx/xls/csv/tsv) ----
// mode: "sync" (недостающим товарам остаток 0) | "merge" (не трогать отсутствующих)
router.post(
  "/import-price",
  adminLimiter,
  requireAuth,
  requireRole(["admin"]),
  requireAdminPanelSession,
  upload.single("file"),
  async (req, res) => {
    const { categoryId, mode = "sync", dryRun } = req.body;
    if (!req.file) return res.status(400).json({ error: "Файл не передан" });
    if (!categoryId) return res.status(400).json({ error: "Не выбран раздел для импорта" });

    let parsed;
    try {
      parsed = parsePriceFile(req.file.buffer, req.file.originalname);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
    const dup = findDuplicateNames(parsed.rows);

    // Предпросмотр без применения — фронт сначала должен показать это
    // администратору и попросить подтверждение, как было в HTML-бете.
    if (dryRun === "true" || dryRun === true) {
      return res.json({
        sheetName: parsed.sheetName,
        totalRows: parsed.rows.length,
        skipped: parsed.skipped,
        blankStock: parsed.blankStock,
        duplicates: dup,
        sample: parsed.rows.slice(0, 5),
      });
    }

    const client = await db.getClient();
    let added = 0,
      updated = 0,
      zeroed = 0;
    try {
      await client.query("BEGIN");
      const seenIds = new Set();
      for (const row of parsed.rows) {
        const existing = await client.query(
          "SELECT id, price FROM products WHERE category_id = $1 AND name = $2",
          [categoryId, row.name],
        );
        if (existing.rows.length) {
          const prod = existing.rows[0];
          await client.query(
            "UPDATE products SET price=$1, available=$2, updated_at=now() WHERE id=$3",
            [row.price, row.available, prod.id],
          );
          if (Number(prod.price) !== Number(row.price)) {
            await client.query(
              "INSERT INTO price_history (product_id, old_price, new_price) VALUES ($1,$2,$3)",
              [prod.id, prod.price, row.price],
            );
          }
          seenIds.add(prod.id);
          updated++;
        } else {
          // Транслит-слаг генерируется сразу (ADR 007): импорт должен
          // создавать SEO-совместимые URL, а не UUID.
          let slug = slugify(row.name) || null;
          if (slug) {
            const taken = await client.query("SELECT 1 FROM products WHERE slug = $1", [slug]);
            if (taken.rows.length) {
              slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
            }
          }
          const inserted = await client.query(
            "INSERT INTO products (category_id, name, price, available, slug) VALUES ($1,$2,$3,$4,$5) RETURNING id",
            [categoryId, row.name, row.price, row.available, slug],
          );
          seenIds.add(inserted.rows[0].id);
          added++;
        }
      }
      if (mode === "sync") {
        const missing = await client.query(
          `UPDATE products SET available = 0
           WHERE category_id = $1 AND available <> 0 AND id <> ALL($2::uuid[])
           RETURNING id`,
          [categoryId, [...seenIds]],
        );
        zeroed = missing.rows.length;
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    res.json({
      added,
      updated,
      zeroed,
      skipped: parsed.skipped,
      blankStock: parsed.blankStock,
      duplicates: dup,
    });
    revalidateStorefront(["products"]);
  },
);

// ---- Экспорт текущих остатков раздела (CSV, тот же формат, что и импорт) ----
router.get(
  "/export-price/:categoryId",
  adminLimiter,
  requireAuth,
  requireRole(["admin", "manager"]),
  requireAdminPanelSession,
  async (req, res) => {
    const { rows } = await db.query(
      "SELECT name, price, available FROM products WHERE category_id = $1 ORDER BY name",
      [req.params.categoryId],
    );
    const escape = (v) => {
      const s = String(v ?? "");
      return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const lines = ["Наименование;Цена;Количество"];
    rows.forEach((r) => lines.push([escape(r.name), r.price, r.available].join(";")));
    const csv = "\uFEFF" + lines.join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="ostatki_${req.params.categoryId}.csv"`,
    );
    res.send(csv);
  },
);

module.exports = router;
