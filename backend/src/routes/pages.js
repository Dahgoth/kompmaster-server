const express = require("express");
const db = require("../db");
const { requireAuth, requireRole, requireAdminPanelSession } = require("../middleware/auth");
const { adminLimiter } = require("../middleware/rateLimit");
const { revalidateStorefront } = require("../utils/revalidate");

const router = express.Router();

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Публичная контентная страница для витрины (/p/[slug], ADR 007).
router.get("/:slug", async (req, res) => {
  const { rows } = await db.query("SELECT * FROM content_pages WHERE slug = $1", [req.params.slug]);
  if (!rows.length) return res.status(404).json({ error: "Страница не найдена" });
  res.json(rows[0]);
});

// ---- Админка: управление страницами SEO-программы ----

router.get(
  "/",
  adminLimiter,
  requireAuth,
  requireRole(["admin"]),
  requireAdminPanelSession,
  async (req, res) => {
    const { rows } = await db.query("SELECT * FROM content_pages ORDER BY updated_at DESC");
    res.json(rows);
  },
);

// Upsert по слагу: редактор сохраняет и создает одной операцией.
router.post(
  "/",
  adminLimiter,
  requireAuth,
  requireRole(["admin"]),
  requireAdminPanelSession,
  async (req, res) => {
    const { slug, title, body_markdown, meta_title, meta_description, noindex } = req.body || {};
    if (!slug || !SLUG_RE.test(slug)) {
      return res
        .status(400)
        .json({ error: "Слаг обязателен: строчные латинские буквы, цифры и дефисы" });
    }
    if (!title || typeof title !== "string") {
      return res.status(400).json({ error: "Нужен заголовок страницы" });
    }
    const { rows } = await db.query(
      `INSERT INTO content_pages (slug, title, body_markdown, meta_title, meta_description, noindex)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (slug) DO UPDATE SET
         title = $2,
         body_markdown = $3,
         meta_title = $4,
         meta_description = $5,
         noindex = $6,
         updated_at = now()
       RETURNING *`,
      [slug, title, body_markdown ?? null, meta_title ?? null, meta_description ?? null, !!noindex],
    );
    revalidateStorefront(["pages", `page:${slug}`]);
    res.json(rows[0]);
  },
);

router.delete(
  "/:slug",
  adminLimiter,
  requireAuth,
  requireRole(["admin"]),
  requireAdminPanelSession,
  async (req, res) => {
    const { rows } = await db.query("DELETE FROM content_pages WHERE slug = $1 RETURNING slug", [
      req.params.slug,
    ]);
    if (rows.length) revalidateStorefront(["pages", `page:${rows[0].slug}`]);
    res.json({ ok: true });
  },
);

module.exports = router;
