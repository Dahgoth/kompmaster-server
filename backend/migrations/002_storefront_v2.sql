-- ADR 007 (storefront v2): SEO slugs + content pages + catalog indexes.
-- Applied once by: npm run migrate

-- 1. Product slugs (latin transliteration, ADR 007 §2).
-- Existing rows are backfilled from the product name with a deterministic
-- SQL transliteration; collisions get a per-base ordinal suffix. Non-latin
-- leftovers (e.g. names without cyrillic/latin letters) fall back to the
-- product UUID, which also keeps every pre-migration /product/:uuid URL
-- resolving with zero redirects.
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug TEXT;

UPDATE products p
SET slug = t.slug
FROM (
  SELECT
    id,
    CASE
      WHEN count(*) OVER (PARTITION BY base) > 1
        THEN base || '-' || (row_number() OVER (PARTITION BY base))
      ELSE base
    END AS slug
  FROM (
    SELECT
      id,
      regexp_replace(
        regexp_replace(
          replace(replace(replace(replace(replace(replace(replace(
            translate(
              lower(name),
              'абвгдезийклмнопрстуфхцыэ',
              'abvgdezijklmnoprstufhcyse'
            ),
            'ё', 'yo'
          ), 'ж', 'zh'), 'ч', 'ch'), 'ш', 'sh'), 'щ', 'sch'), 'ю', 'yu'), 'я', 'ya'),
          '[^a-z0-9]+', '-', 'gi'
        ),
        '(^-+|-+$)', ''
      ) AS base
    FROM products
    WHERE slug IS NULL
  ) AS bases
) AS t
WHERE p.id = t.id;

-- Names that transliterated to nothing (latin already, symbols only) keep
-- the UUID slug so the unique index can always be created.
UPDATE products SET slug = id::text WHERE slug IS NULL OR slug = '';

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
