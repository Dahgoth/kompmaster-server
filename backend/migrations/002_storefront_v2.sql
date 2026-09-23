-- ADR 007 (storefront v2): SEO slugs + content pages + catalog indexes.
-- Applied once by: npm run migrate

-- 1. Product slugs (latin transliteration, ADR 007 §2).
--
-- The transliteration MUST stay byte-for-byte equivalent to
-- backend/src/utils/slugify.js (same table, same ъ/ь deletion, same 80-char
-- cap); backend/tests/slugify.test.js pins the JS side. A dev database that
-- already applied the pre-fix version of this file has wrong slugs baked in —
-- recreate it (docker compose down -v) rather than re-running.
--
-- Uniqueness is resolved per row against the slugs that already exist, so
-- CREATE UNIQUE INDEX below cannot fail. (The previous window-function
-- version only deduped within identical bases, so "Ноутбук Lenovo" x2 plus
-- "Ноутбук Lenovo 1" produced two rows with slug noutbuk-lenovo-1 and
-- aborted the whole migration.)
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug TEXT;

DO $do$
DECLARE
  rec       RECORD;
  base_slug TEXT;
  candidate TEXT;
  n         INTEGER;
BEGIN
  FOR rec IN
    SELECT id, name FROM products WHERE slug IS NULL ORDER BY created_at, id
  LOOP
    base_slug := regexp_replace(
      left(
        regexp_replace(
          regexp_replace(
            replace(replace(replace(replace(replace(replace(replace(replace(replace(
              translate(
                lower(rec.name),
                'абвгдезийклмнопрстуфхцыэ',
                'abvgdezijklmnoprstufhcye'
              ),
              'ё', 'yo'
            ), 'ж', 'zh'), 'ч', 'ch'), 'ш', 'sh'), 'щ', 'sch'),
            'ю', 'yu'), 'я', 'ya'), 'ъ', ''), 'ь', ''),
            '[^a-z0-9]+', '-', 'gi'
          ),
          '(^-+|-+$)', '', 'g'
        ),
        80
      ),
      '-+$', ''
    );

    -- Names that transliterate to nothing keep the UUID, which also means
    -- every pre-migration /product/:uuid URL resolves with zero redirects.
    IF base_slug = '' THEN
      candidate := rec.id::text;
    ELSE
      candidate := base_slug;
    END IF;

    n := 1;
    WHILE EXISTS (SELECT 1 FROM products WHERE slug = candidate) LOOP
      n := n + 1;
      candidate := base_slug || '-' || n;
    END LOOP;

    UPDATE products SET slug = candidate WHERE id = rec.id;
  END LOOP;
END
$do$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_slug ON products(slug);

-- 2. Catalog indexes (platform review §3 near-term fixes).
-- ILIKE '%q%' search cannot use the existing to_tsvector GIN index; pg_trgm
-- serves it. The (category_id, created_at DESC) index removes the per-request
-- sort on category lists; the plain created_at index covers the unfiltered
-- list ordering.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_products_name_trgm_ops ON products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_category_created ON products (category_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON products (created_at DESC);

-- 3. Content pages — the publishing surface for the SEO program
-- (ADR 007 §Decision 2: admin markdown editor, no engineer per page).
CREATE TABLE IF NOT EXISTS content_pages (
  slug              TEXT PRIMARY KEY,
  title             TEXT NOT NULL,
  body_markdown     TEXT,
  meta_title        TEXT,
  meta_description  TEXT,
  noindex           BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
