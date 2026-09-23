#!/usr/bin/env node
/**
 * Deterministic E2E fixture seed (Tier A).
 *
 * The Playwright specs in `frontend/e2e/specs/` assert against fixed data —
 * category ids (`noutbuki`, `videokarty`), product UUIDs
 * (`11111111-…`, `22222222-…`) and an `e2e@example.com` / `secret123` login.
 * Tier A runs the storefront against a *real* backend (MSW in the Playwright
 * process cannot intercept SSR or the store's `/api/*` rewrite), so the rows
 * those assertions depend on must exist before the matrix runs.
 *
 * Idempotent: safe to re-run; product/category/user rows are upserted. Run it
 * against a clean database (CI provisions a throwaway Postgres) — a dev
 * database with extra rows still works for most specs but the catalog is not
 * guaranteed to be identical.
 *
 * Usage: DATABASE_URL=postgres://… node backend/scripts/seed-e2e.js
 *
 * Keep the fixture values in sync with `frontend/e2e/mocks.ts` — the seed is
 * what the backend serves (and what the specs actually assert against);
 * mocks.ts mirrors it for MSW, which is not on the request path for these
 * flows but would silently diverge if either side changed alone.
 */
const { Client } = require("pg");
const { hashPassword } = require("../src/utils/hash");

const CATEGORIES = [
  { id: "noutbuki", name: "Ноутбуки", kind: "catalog", visible: true, sort_order: 0 },
  { id: "videokarty", name: "Видеокарты", kind: "catalog", visible: true, sort_order: 1 },
];

// Fixed UUIDs the specs address by URL; do not regenerate.
const PRODUCTS = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    category_id: "noutbuki",
    name: "Ноутбук Lenovo ThinkPad T14",
    price: "45990.00",
    old_price: null,
    available: 3,
    description: "Проверенный бизнес-ноутбук",
    specs: { cpu: "i5-1135G7", ram: "16GB" },
    created_at: "2026-09-01T10:00:00.000Z",
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    category_id: "noutbuki",
    name: "Ноутбук Lenovo ThinkPad T14 (Refurbished)",
    price: "39990.00",
    old_price: "45990.00",
    available: 1,
    description: "Восстановленный, гарантия 12 месяцев",
    specs: { cpu: "i5-1135G7", ram: "16GB" },
    created_at: "2026-09-02T10:00:00.000Z",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    category_id: "videokarty",
    name: "Видеокарта RTX 3060",
    price: "24990.00",
    old_price: "27990.00",
    available: 0,
    description: null,
    specs: null,
    created_at: "2026-09-03T10:00:00.000Z",
  },
];

const USER = {
  login: "e2e@example.com",
  password: "secret123",
  display_name: "Тестовый",
};

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const db = new Client({ connectionString });
  await db.connect();
  try {
    await db.query("BEGIN");

    for (const c of CATEGORIES) {
      await db.query(
        `INSERT INTO categories (id, name, kind, visible, sort_order)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name, kind = EXCLUDED.kind,
           visible = EXCLUDED.visible, sort_order = EXCLUDED.sort_order`,
        [c.id, c.name, c.kind, c.visible, c.sort_order],
      );
    }

    for (const p of PRODUCTS) {
      await db.query(
        `INSERT INTO products
           (id, category_id, name, price, old_price, available, description, specs, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO UPDATE SET
           category_id = EXCLUDED.category_id, name = EXCLUDED.name,
           price = EXCLUDED.price, old_price = EXCLUDED.old_price,
           available = EXCLUDED.available, description = EXCLUDED.description,
           specs = EXCLUDED.specs, updated_at = now()`,
        [
          p.id,
          p.category_id,
          p.name,
          p.price,
          p.old_price,
          p.available,
          p.description,
          p.specs ? JSON.stringify(p.specs) : null,
          p.created_at,
        ],
      );
    }

    const passwordHash = await hashPassword(USER.password);
    await db.query(
      `INSERT INTO users (login, password_hash, display_name, role)
       VALUES ($1, $2, $3, 'user')
       ON CONFLICT (login) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         display_name = EXCLUDED.display_name`,
      [USER.login, passwordHash, USER.display_name],
    );

    await db.query("COMMIT");
    console.log(
      `[seed-e2e] ${CATEGORIES.length} categories, ${PRODUCTS.length} products, 1 user (${USER.login})`,
    );
  } catch (err) {
    await db.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    await db.end();
  }
}

main().catch((err) => {
  console.error("[seed-e2e] failed:", err.message);
  process.exit(1);
});
