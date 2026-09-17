-- КомпМастер: начальная схема базы данных.
-- Применяется один раз командой: npm run migrate

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  login               TEXT UNIQUE NOT NULL,           -- e-mail или телефон, в нижнем регистре для e-mail
  password_hash       TEXT NOT NULL,
  display_name        TEXT,
  role                TEXT NOT NULL DEFAULT 'user',   -- user | manager | admin
  phone                TEXT,
  phone_verified_at    TIMESTAMPTZ,
  privacy_accepted_at  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS categories (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  parent_id   TEXT REFERENCES categories(id) ON DELETE SET NULL,
  kind        TEXT NOT NULL DEFAULT 'catalog',        -- catalog | group
  visible     BOOLEAN NOT NULL DEFAULT true,
  image       TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  price         NUMERIC(12,2) NOT NULL,
  old_price     NUMERIC(12,2),
  available     INTEGER NOT NULL DEFAULT 0,
  image         TEXT,
  description   TEXT,
  specs         JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (to_tsvector('russian', name));

CREATE TABLE IF NOT EXISTS price_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  old_price   NUMERIC(12,2),
  new_price   NUMERIC(12,2) NOT NULL,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS carts (
  -- Один активный сохранённый набор строк корзины на пользователя.
  user_id     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  items       JSONB NOT NULL DEFAULT '[]',            -- [{productId, qty, priceAtAdd}]
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wishlists (
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number            TEXT UNIQUE NOT NULL,
  user_id           UUID REFERENCES users(id) ON DELETE SET NULL,
  items             JSONB NOT NULL,                    -- снимок товаров на момент заказа
  subtotal          NUMERIC(12,2) NOT NULL,
  discount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  total             NUMERIC(12,2) NOT NULL,
  status            TEXT NOT NULL DEFAULT 'Новый',
  payment_status    TEXT NOT NULL DEFAULT 'Ожидает оплаты',
  receive_method    TEXT,                               -- pickup | delivery
  address           TEXT,
  contact_phone     TEXT,
  cancel_reason     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at           TIMESTAMPTZ,
  status_updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

CREATE TABLE IF NOT EXISTS order_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Идемпотентность вебхуков платёжной системы: каждое уведомление от
-- провайдера обрабатывается только один раз, даже если он пришлёт его
-- повторно из-за сбоя сети на своей стороне.
CREATE TABLE IF NOT EXISTS payment_webhook_events (
  provider_event_id  TEXT PRIMARY KEY,
  received_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name   TEXT,
  rating        INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  text          TEXT,
  image         TEXT,
  source        TEXT NOT NULL DEFAULT 'customer',       -- customer | admin
  status        TEXT NOT NULL DEFAULT 'pending',         -- pending | approved | rejected
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);

-- Одноразовые коды подтверждения телефона (регистрация/оформление заказа).
CREATE TABLE IF NOT EXISTS phone_verifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone         TEXT NOT NULL,
  code_hash     TEXT NOT NULL,
  attempts      INTEGER NOT NULL DEFAULT 0,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone ON phone_verifications(phone);

-- Токены сброса пароля по e-mail (одноразовые, с ограниченным сроком жизни).
CREATE TABLE IF NOT EXISTS password_resets (
  token         TEXT PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at    TIMESTAMPTZ NOT NULL,
  used_at       TIMESTAMPTZ
);

-- Автопоиск фотографий: кэш найденных кандидатов по артикулу + очередь модерации.
CREATE TABLE IF NOT EXISTS image_search_cache (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_key         TEXT UNIQUE NOT NULL,
  source              TEXT NOT NULL,                     -- icecat | bing | google | manual
  candidates          JSONB NOT NULL DEFAULT '[]',
  status              TEXT NOT NULL DEFAULT 'pending',    -- pending | approved | rejected | no_match
  approved_image_url  TEXT,
  approved_by         UUID REFERENCES users(id),
  approved_at         TIMESTAMPTZ,
  product_id          UUID REFERENCES products(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
  key     TEXT PRIMARY KEY,
  value   JSONB NOT NULL
);

-- Административный журнал: кто и что менял.
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  details     JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
