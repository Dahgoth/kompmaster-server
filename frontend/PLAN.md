# Frontend Rebuild Plan

Status: Draft — to be validated against ADR 001 / ADR 002 decisions
Date: 2026-09-16
Author: Frontend scaffolding agent
Related: ADR 001 §1a (pure C), ADR 002 (PoC re-scope), `backend/public/index.html` (legacy, inspiration-only)

---

## 1. Context

### 1.1 What the backend provides (canonical, modular API)

The backend (`backend/src/index.js`) serves **only** `/api/*`. It does **not** serve static files.
The frontend is a **separate static artifact** deployed to Timeweb S3 + CDN,
per ADR 001 §1a "pure C, API-only." Vercel is used for storefront
preview/staging/fallback.

Current API endpoints (`backend/src/routes/*.js`):

| Method | Endpoint | Auth | Request body | Response |
|--------|----------|------|--------------|----------|
| POST | `/api/auth/register` | none | `{ login, password, displayName?, privacyAccepted }` | `{ token, user: {id, login, role, displayName} }` |
| POST | `/api/auth/login` | none | `{ login, password }` | `{ token, user: {id, login, role, displayName} }` |
| POST | `/api/auth/phone/request` | none | `{ phone }` | `{ ok: true }` |
| POST | `/api/auth/phone/confirm` | auth | `{ phone, code }` | `{ ok: true, phone }` |
| POST | `/api/auth/forgot-password` | none | `{ email }` | `{ ok: true, message }` |
| POST | `/api/auth/reset-password` | none | `{ token, newPassword }` | `{ ok: true }` |
| POST | `/api/auth/admin-panel/verify` | auth (admin/manager) | `{ password }` | `{ adminPanelToken }` |
| GET | `/api/auth/me` | auth | — | `{ user }` |
| GET | `/api/categories` | none | — | category[] `{ id, name, parent_id, kind, visible, image, sort_order }` |
| POST | `/api/categories` | admin | `{ id, name, parentId?, kind?, image? }` | `{ ok: true }` |
| DELETE | `/api/categories/:id` | admin | — | `{ ok: true }` |
| GET | `/api/products?category=&search=&page=` | none | — | product[] `{ id, category_id, name, price, old_price, available, image, description, specs, created_at, updated_at }` |
| GET | `/api/products/:id` | none | — | product |
| POST | `/api/products` | admin | `{ categoryId, name, price, oldPrice?, available?, image?, description?, specs? }` | product |
| PUT | `/api/products/:id` | admin | `{ name?, price?, oldPrice?, available?, image?, description?, categoryId? }` | product |
| DELETE | `/api/products/:id` | admin | — | `{ ok: true }` |
| POST | `/api/products/import-price` | admin | multipart `file, categoryId, mode?, dryRun?` | import result |
| GET | `/api/products/export-price/:categoryId` | admin | — | CSV file |
| POST | `/api/orders` | auth | `{ items: [{productId, qty}], receiveMethod?, address?, contactPhone? }` | order |
| GET | `/api/orders/my` | auth | — | orders[] |
| GET | `/api/orders/my/:id` | auth | — | `{ ...order, history: [] }` |
| GET | `/api/orders` | admin/manager | — | orders[] |
| PUT | `/api/orders/:id/status` | admin/manager | `{ status }` | order |
| POST | `/api/orders/:id/cancel` | admin/manager | `{ reason? }` | `{ ok: true }` |
| DELETE | `/api/orders/:id` | admin | — | `{ ok: true }` |
| POST | `/api/orders/payment-webhook` | none | `{ eventId, orderNumber, status }` | `{ ok: true }` |
| GET | `/api/reviews/product/:productId` | none | — | approved reviews[] |
| POST | `/api/reviews/product/:productId` | auth | `{ rating, text? }` | review |
| GET | `/api/reviews/pending` | admin | — | pending reviews[] |
| PUT | `/api/reviews/:id/approve` | admin | — | review |
| DELETE | `/api/reviews/:id` | admin | — | `{ ok: true }` |
| POST | `/api/reviews/manual` | admin | `{ productId, authorName, rating, text?, image? }` | review |
| GET | `/api/users` | admin | `{ search? }` | users[] |
| PUT | `/api/users/:id/role` | admin | `{ role }` | `{ id, login, role }` |
| POST | `/api/uploads/:folder` | admin | multipart `file` (folder: products\|categories\|reviews) | `{ url }` |
| GET | `/api/health` | none | — | `{ ok, time }` |

Auth scheme:
- **Bearer JWT** in `Authorization` header (not cookies / no `km_auth`).
- **Admin panel second password**: after login, call `POST /api/auth/admin-panel/verify` to get `adminPanelToken` (12h JWT). Send it as `X-Admin-Panel-Token` header on all admin routes.
- Rate limiting is in-process (E15 acceptable at PoC scale, Redis upgrade deferred).

### 1.2 Key API gaps (endpoints the legacy FE used but modular API lacks)

These endpoints exist in the legacy `backend/src/server.js` but **not** in the modular `backend/src/index.js`:

1. **`GET /api/bootstrap`** — legacy returned site_state (categories, content, menu_settings, payment_settings, media), products (grouped by category), current user, admin flag, and orders in one call.
2. **`GET/PUT /api/admin/site-state`** — legacy stored/updated site content, menu settings, payment settings, and media in the `site_state` JSONB table.
3. **`POST /api/admin/upload`** — legacy upload endpoint (modular API: `POST /api/uploads/:folder`).
4. **`POST /api/admin/import-xlsx/:categoryId`** — legacy price import (modular API: `POST /api/products/import-price` with multipart `categoryId`).
5. **`POST /api/admin/sync-sheet/:categoryId`** — legacy Google Sheets sync.
6. **`POST /api/admin/orders/:id/confirm-payment`** — legacy admin payment confirmation.
7. **`PATCH /api/orders/:id/address`** — legacy client address edit.

**Decision**: The frontend will use the **modular API as-is**. For data currently in `site_state` (content, menu settings, payment settings, media), the frontend will use **hardcoded defaults** extracted from the legacy code (matching `DEFAULT_CATEGORIES` + `DEFAULT_PAYMENT_SETTINGS` + `DEFAULT_MENU_SETTINGS` from the old HTML). When the backend eventually adds `/api/settings` or `/api/bootstrap` endpoints (using the existing `settings` table in `001_init.sql`), the frontend's `data/` modules become API-backed with minimal changes.

### 1.3 Legacy frontend UX to preserve

Extracted from `backend/public/index.html` (2149 lines, single-file vanilla JS/HTML/CSS):

**Storefront routes:**
- `home` — splash screen (2.5s auto-dismiss), hero banner with telegram link, about text block with guarantee + delivery copy (neon number highlight), category grid (two-level tree), office section (Sochi photo + video, Moscow "soon")
- `category` — if group: child category cards; if catalog: product list with search + Google Sheets link, quantity steppers, "add to cart" buttons
- `cart` — cart items with qty edit, summary (total), checkout button, empty state
- `checkout` — contact form (FIO, phone, email, telegram, MAX), receive method (pickup/delivery), delivery service selector (СДЭК/EMS/Ozon/Яндекс), delivery address fields, comment, offer acceptance checkbox (required)
- `payment` — manual mode (manager contact via Telegram, auto-copy order message) or automatic (gateway integration, deferred)
- `account` — user's orders list, order cards with status, receive info, address edit
- `about` — static text page
- `faq` — accordion list, special telegram link for "Что есть в наличии?"
- `contacts` — contact cards (address, telegram, manager, MAX, phone)
- `custom` — custom menu page (label, content as long text)

**Admin panel routes** (behind admin login + admin panel password):
- `dashboard` — order status counts as stat buttons, recent 8 orders table
- `orders` — searchable/filterable order table, order detail view (customer info, items, history, status dropdown, cancel, delete, confirm payment)
- `categories` — category editor (name, kind, parent, sheet link, update date, image upload, visibility, move, delete), add new
- `content` — home content editor (about1, guarantee, delivery, banner link, phone), media upload (Sochi photo/video)
- `menu` — menu editor (order, visibility, labels), custom pages editor, FAQ editor
- `payments` — payment mode (manual/automatic), manager telegram, manual page text, message template, provider integrations
- `settings` — notification email, payment mode, auto-status timer config, admin password change

**Order status flow:**
`Ожидает оплаты` → `Формируется заказ` → `В пути` → `Прибыл / готов к выдаче` → `В пути к клиенту` → `Завершён / выдан`
Also: `Отменён`

Status colors (tint + text + label):
- `Формируется заказ`: `#fff1f8` / `#a6005f`
- `В пути`: `#edf9ff` / `#00638a`
- `Прибыл / готов к выдаче`: `#f2ffe9` / `#3f7417`
- `В пути к клиенту`: `#f3efff` / `#5d43b2`
- `Завершён / выдан`: `#eef1f3` / `#45505a`
- `Ожидает оплаты`: `#fff8e8` / `#8a5b00`
- `Отменён`: `#fff1f2` / `#a51e2d`

**Design tokens** (from legacy CSS `:root`):
- Surfaces: `--bg:#fff`, `--soft:#f8f8fb`, `--ink:#111114`, `--muted:#71717a`, `--line:#dedee5`
- Brand: `--pink:#ff18a8`, `--violet:#7a5cff`, `--cyan:#0ccdf1`, `--lime:#8fe24b`
- Brand gradient: `linear-gradient(90deg, var(--pink), #a748ff 28%, var(--cyan) 58%, var(--lime))`
- Primary button: `linear-gradient(100deg, var(--pink), #f31191 45%, #a748ff)` with white text
- Font: Inter, `font-weight: 700-850` for headers, `800` for buttons, `14-17px` body, `tabular-nums` for prices

**Key UX patterns to preserve:**
- Splash screen with auto-dismiss
- Sticky header with drawer navigation (mobile menu)
- Two-level category navigation (groups → child categories)
- Product list with inline search filter, quantity steppers, add to cart
- Cart with live summary, qty controls
- Checkout with offer acceptance gate (required checkbox)
- Payment page with manual (Telegram) fallback
- Order auto-advance: "Формируется заказ" → "В пути" after 35h post-payment (client-side display convenience, actual status change is server-side cron)
- Admin panel with tabbed navigation, order filters, inline status edits
- Category image processing (client-side resize to 1000x650, webp/jpeg)
- Popup notifications (bottom-center, 2.4s auto-dismiss)
- Legal modals (warranty text, public offer)
- Contact footer with telegram/MAX links

### 1.4 Contact info (hardcoded from legacy)
- Address: Сочи, ул. Тепличная 35А (Yandex Maps link)
- Moscow: "Москва — скоро"
- Telegram channel: @compmasterone
- Manager: @mastercompone
- MAX: https://max.ru/u/f9LHodD0cOIFx77XxT5ife39U_3o6JuEZ1OUJW4dEYsI-xv52e_0Ir_lDD8
- Banner link: https://t.me/compmasterone/3144

---

## 2. Tech Stack Decision

**Decision: Vite + vanilla ES modules (no framework)**

Rationale:
- ADR 001 §1a recommends "Vite (fastest for single-file 540 KB migration)" over Next.js (SSR not needed for static site)
- The legacy FE is pure vanilla JS — no framework baggage, minimal bundle
- Pure static output served from S3+CDN aligns with "pure C" architecture
- No hydration/SSR complexity; simpler deployment
- Matches the codebase style (CommonJS backend, no React/Vue/Svelte elsewhere)
- Can add React later if needed without breaking the API contract

**DevDependencies:**
- `vite` — dev server + bundler
- `vite-plugin-static-copy` — copy static assets to dist

**Build output:** `dist/` directory (static files for S3+CDN upload)

---

## 3. Directory Structure

```
/frontend/
├── index.html                          # Entry HTML (minimal, loads JS/CSS)
├── vite.config.js                      # Vite config (SPA fallback, static copy)
├── package.json                        # Scripts + depdendencies
├── .gitignore                          # Ignore node_modules, dist, .env
├── .env.local                          # API base URL (template, not committed)
├── PLAN.md                             # This document
├── DESIGN.md                           # Regenerated from implementation (post-rebuild)
├── README.md                           # Frontend-specific docs
│
├── src/
│   ├── main.js                         # App bootstrap: init, load data, start router
│   ├── config.js                       # Runtime config (API URL from env/VITE_API_URL)
│   ├── api.js                          # API client: JWT auth, admin token, error handling
│   ├── store.js                        # Global state (replaces localStorage monolith)
│   ├── router.js                       # Client-side router (hash-based)
│   ├── utils.js                        # Helpers: money, esc, formatDate, etc.
│   ├── data/                           # Static/default data (replaces site_state defaults)
│   │   ├── categories.js               # Default category set (pc_parts, peripherals, etc.)
│   │   ├── content.js                  # Default content (about, guarantee, delivery)
│   │   ├── menu.js                     # Default menu settings (labels, FAQ, custom pages)
│   │   ├── payment.js                  # Default payment settings (manual mode)
│   │   └── contacts.js                 # Contact info (address, telegram, MAX links)
│   │
│   ├── styles/
│   │   ├── tokens.css                  # CSS custom properties (colors, spacing, radii)
│   │   ├── base.css                    # Reset + base styles (font, body, etc.)
│   │   ├── layout.css                  # Layout (header, footer, drawer, splash, grid)
│   │   ├── components.css              # Reusable component styles (buttons, cards, etc.)
│   │   ├── pages.css                   # Page-specific styles (home, product list, etc.)
│   │   ├── admin.css                   # Admin panel styles
│   │   └── utilities.css               # Utility classes (hidden, neon-bg, etc.)
│   │
│   ├── components/                     # Render functions (< 100 LOC each)
│   │   ├── Splash.js                   # Splash screen with logo
│   │   ├── Header.js                   # Sticky header with nav, cart, auth
│   │   ├── Footer.js                   # Footer with contact grid
│   │   ├── Drawer.js                   # Mobile navigation drawer
│   │   ├── AuthModal.js                # Login/register/forgot modal
│   │   ├── LegalModal.js               # Warranty/offer legal modal
│   │   ├── Popup.js                    # Toast notification
│   │   ├── CategoryCard.js             # Category card (image, name, open link)
│   │   ├── ProductRow.js               # Product list item with qty + add
│   │   ├── CartRow.js                  # Cart item with qty controls
│   │   ├── Summary.js                  # Order summary (subtotal, total)
│   │   ├── StatusPill.js               # Status badge with color mapping
│   │   ├── QuantityStepper.js          # Qty +/- control
│   │   ├── RatingStars.js              # Star rating display/input
│   │   ├── SearchBox.js                # Search input with icon
│   │   └── ...
│   │
│   └── pages/                          # Page renderers (route handlers)
│       ├── Home.js                     # Hero banner + category grid + office section
│       ├── Category.js                 # Category tree or product list
│       ├── Cart.js                     # Cart items + summary
│       ├── Checkout.js                 # Checkout form
│       ├── Payment.js                  # Payment page (manual/automatic)
│       ├── Account.js                  # User account + orders
│       ├── About.js                    # About page
│       ├── FAQ.js                      # FAQ accordion
│       ├── Contacts.js                 # Contact list
│       ├── CustomPage.js               # Custom menu page
│       └── Admin.js                    # Admin panel (dashboard/orders/categories/etc.)
│
├── public/                             # Static assets (copied to dist/)
│   ├── favicon.ico
│   └── assets/
│       ├── logo.svg                    # Logo for splash
│       └── og-image.png                # Open Graph image
│
└── ../terraform/                       # Repository-wide S3 bucket + CDN config
    ├── main.tf                         # S3 bucket + bucket policy + CDN
    └── variables.tf                    # Domain, region, etc.
```

---

## 4. Data Flow Architecture

```
Browser                    Vite dev / dist (S3 CDN)
    │                          (static files only)
    │  fetch('/api/...',        │
    │    headers: {             │
    │      Authorization:       │
    │        'Bearer <jwt>'      │
    │    })
    │                          │
    ▼                          ▼
/frontend/src/api.js ───────►  /api/* (Express backend on VPS:4000)
                              │
                        Bearer JWT auth
                        (cookie-free, no CSRF)
                              │
                        PostgreSQL + S3 (MinIO/Timeweb)
```

**No `/api/bootstrap` endpoint**: Frontend fetches data in parallel on startup:
1. `GET /api/categories` → store.categories
2. `GET /api/products?category=<id>` → store.productsByCategory (lazy-load per category)
3. If token in localStorage: `GET /api/auth/me` → store.currentUser
4. If admin: no need to call `/api/bootstrap` — admins access admin panel separately

**Static content** (content, menu, payment, media): hardcoded defaults in `frontend/src/data/` modules. These are the legacy defaults from `index.html`. When backend adds `/api/site-state` or `/api/settings`, swap the import.

**JWT storage**: `localStorage` (same origin = `compmasone.ru` served from S3/CDN). Token is 7 days. Admin panel token is 12 hours.

**Cart persistence**: `localStorage` (cart survives page refresh, not tied to auth).

**Admin panel token**: stored in `localStorage` alongside user token. Required for all admin endpoints via `X-Admin-Panel-Token` header.

---

## 5. Implementation Phases

### Phase 1: Scaffolding (this step)
- Directory structure
- package.json (Vite + vanilla)
- vite.config.js
- CSS tokens (extracted from legacy `<style>`)
- Data/default modules (extracted from legacy defaults)
- API client, store, router, utils stubs
- index.html entry point
- Component and page stubs
- README.md

### Phase 2: Layout & Foundation
- Splash screen
- Header (sticky, drawer toggle, cart, auth button)
- Footer (contact grid)
- Drawer navigation (menu)
- Popup/toast notifications
- Legal modals (warranty, public offer)
- Auth modal (login/register/forgot)
- CSS: base + layout + tokens

### Phase 3: Storefront Pages
- Home page (hero banner, category grid, office section)
- Category page (groups vs products, search, qty steppers)
- Cart page (items, qty, summary, checkout)
- Checkout page (form validation, offer gate)
- Payment page (manual mode → Telegram manager contact)
- Account page (order list + cards)
- Content pages (about, faq, contacts, custom)

### Phase 4: Admin Panel
- Admin login (email + password → verify admin panel password)
- Admin logout
- Dashboard (order status counts)
- Orders (list, search, filter, detail view)
- Categories (edit, add, delete, move)
- Content editor (about text, media upload)
- Menu editor (menu items, FAQ, custom pages)
- Payment settings (mode, manager telegram, manual text)
- Settings (admin password change)

### Phase 5: Integration & Polish
- Connect all pages to API
- Auth token persistence
- Admin panel token verification
- Order creation (cart → checkout → payment)
- File uploads (images via `/api/uploads/:folder`)
- Price import preview
- Error handling
- Mobile responsiveness
- a11y (focus-visible, 44px touch targets, keyboard nav)
- CSP headers (configured at deployment)

### Phase 6: DESIGN.md Regeneration
- Document actual color tokens, typography, layout, components
- From the implemented CSS, not from the old DESIGN.md

---

## 6. Key Migration Changes (legacy → modular)

| Concern | Legacy (`public/index.html`) | New Frontend |
|---------|------------------------------|--------------|
| Auth | cookie `km_auth` | `Authorization: Bearer <jwt>` |
| Data source | `server-bridge.js` → `/api/bootstrap` | Individual API calls to `/api/*` |
| Products | localStorage `PRODUCTS[id] = [[name,price,qty,id]]` | `GET /api/products?category=` returns objects |
| Categories | localStorage + `/api/bootstrap` (site_state JSONB) | `GET /api/categories` (DB table) + hardcoded defaults |
| Content | `/api/bootstrap` → site_state.content | Hardcoded defaults (src/data/content.js) |
| Menu | `/api/bootstrap` → site_state.menu_settings | Hardcoded defaults (src/data/menu.js) |
| Payments | `/api/bootstrap` → site_state.payment_settings | Hardcoded defaults (src/data/payment.js), manual mode |
| Orders | localStorage + `/api/bootstrap` / `/api/orders` | `GET /api/orders/my` |
| Order status change | inline (localStorage) | `PUT /api/orders/:id/status` |
| Admin auth | `/api/admin/login` (cookie) | `/api/auth/admin-panel/verify` → adminPanelToken header |
| Admin site state | `PUT /api/admin/site-state` | Not in modular API (hardcoded defaults) |
| Uploads | `POST /api/admin/upload` (buffer → /uploads/) | `POST /api/uploads/:folder` (multipart → S3) |
| Price import | `POST /api/admin/import-xlsx/:categoryId` | `POST /api/products/import-price` (multipart) |
| Product IDs | string ids like `laptops_1` | UUID v4 |
| Order number | `01_000001` | `KM-YYYYMMDD-XXXX` (server-generated) |
| Phone auth | `/api/auth/phone/*` | Same endpoints exist in modular API |
| Password reset | `/api/auth/forgot` / `/api/auth/reset` | `/api/auth/forgot-password` / `/api/auth/reset-password` |

---

## 7. Security & a11y Requirements (from ADR 001 §1a allowed fixes)

- **CSP**: No inline handlers (use event delegation), `frame-ancestors` deny, `base-uri 'self'`
- **XSS**: All user content escaped via `esc()` function
- **CORS**: `FRONTEND_ORIGIN=https://compmasone.ru` already fail-closed on backend
- **Bearer JWT**: No CSRF risk (no cookies for auth)
- **Touch targets**: 44px minimum
- **Focus**: `focus-visible` outline on all interactive elements
- **Keyboard**: Drawer/modal close on Escape, tab navigation
- **Reduced motion**: `prefers-reduced-motion` media query
- **Responsive**: Mobile-first with breakpoints at 820px and 390px (matching legacy)

---

## 8. Build & Deployment

**Dev server:**
```
pnpm install
pnpm run dev     # Vite dev server on localhost:5173 (proxy /api to localhost:4000)
```

**Vite proxy config:** Proxy `/api/*` to `http://localhost:4000` in dev mode.

**Build:**
```
pnpm run build   # → dist/ (static files)
```

**Deploy:**
- Upload `dist/` to RF S3 bucket (Timeweb S3 / Selectel / Yandex Object Storage)
- Enable CDN with cache headers (`Cache-Control: public, max-age=3600` for catalog pages)
- Set up Caddy/Timeweb LB with TLS
- Set `FRONTEND_ORIGIN=https://compmasone.ru` on backend

---

## 9. Open Questions (to resolve during implementation)

1. **Site content endpoints**: Should the backend add `GET /api/site-state` and `PUT /api/admin/site-state` to serve content/menu/payment/media? Currently only in legacy `src/server.js`. The modular schema has a `settings` table that could be used.
2. **Product import in admin**: The modular API has `import-price` but no category-level XLSX import with sheet link sync. How should the admin price import UI work?
3. **Admin media upload**: The modular API upload endpoint is `/api/uploads/:folder`. The legacy had home photo/video stored in site_state.media. Need a plan for serving home media from S3 URLs.

---

*Next step: scaffold the directory structure per §3, then begin Phase 1-2 implementation.*

---

## Appendix — Scaffolding Status (2026-09-16)

The initial scaffold is complete. All files created and validated.

### Completed

| Component | Path | Status |
|-----------|------|--------|
| Entry HTML | `/frontend/index.html` | ✅ Full layout, splash screen, drawer, modals |
| Package config | `/frontend/package.json`, `vite.config.js` | ✅ Vite + vanilla ESM |
| CSS (6 files) | `src/styles/{tokens,base,layout,components,pages,admin,utilities}.css` | ✅ Extracted from legacy |
| Config module | `src/config.js` | ✅ localStorage helpers, API base |
| API client | `src/api.js` | ✅ Bearer JWT + admin panel token |
| Store | `src/store.js` | ✅ Reactive state, cart, subscribe |
| Router | `src/router.js` | ✅ Hash-less routes, param matching |
| Utils | `src/utils.js` | ✅ formatPrice, escapeHtml, DOM helpers |
| Data defaults | `src/data/{content,categories,payment}.js` | ✅ Hardcoded content/FAQ/categories/payments |
| Components (15) | `src/components/*.js` | ✅ Header, Footer, Drawer, ProductCard, ProductRow, CategoryCard, CartItem, Modal, Popup, Breadcrumb, Pagination, Notice, Skeleton, CartWatcher, AuthHandlers |
| Pages (14) | `src/pages/*.js` | ✅ Home, Catalog, Product, Cart, Checkout, Auth, Orders, Order, Profile, About, Faq, Contacts, Warranty, PaymentManual |
| Admin pages (5) | `src/pages/admin/*.js` | ✅ Products, Orders, Categories, Users, Reviews |
| Documentation | `README.md`, `.gitignore`, `.env.example`, `docs/API_COVERAGE.md` | ✅ |
| Build artifacts | `dist/` | ✅ Built (1.9kB HTML, 26.4kB CSS, 16.1kB JS) |

### Validation

```
node --check: 44/44 files pass
vite build:   ✓ 49 modules transformed, dist/ generated
```

### Next Steps

1. Wire up real API calls (replace hardcoded fallbacks with live data)
2. Implement admin login flow (`POST /api/auth/admin-panel/verify` → store admin token → render admin routes)
3. Implement cart persistence across page loads
4. Implement order creation (`POST /api/orders`)
5. Connect checkout form to real order flow → redirect to `/payment/manual`
6. Add product gallery image switching
7. Add FAQ accordion behavior (`window.toggleFaq`)
