# KompMaster Frontend — API Coverage Notes

## Endpoints Used

| Endpoint | Purpose | Auth |
|---|---|---|
| `GET /api/categories` | Fetch category tree | Admin panel token |
| `GET /api/products` | Fetch product list (with query params) | Admin panel token |
| `GET /api/products/:id` | Fetch single product details | None |
| `GET /api/orders/my` | Fetch current user's orders | Bearer JWT |
| `GET /api/orders/:id` | Fetch order details | Bearer JWT |
| `POST /api/orders` | Create new order | None (manual mode) |
| `POST /api/auth/login` | Login | None |
| `POST /api/auth/register` | Register | None |
| `POST /api/auth/admin-panel/verify` | Verify admin token | None |
| `GET /api/users` | Admin: list users | Admin panel token |
| `GET /api/reviews` | Admin: list reviews | Admin panel token |

## API Gaps (Hardcoded Fallbacks)

The modular API does not yet expose content/settings endpoints. These values are **hardcoded** in `src/data/`:

1. **Site content** (`content.js`): About text, FAQ entries, warranty text
2. **Menu settings** (`categories.js`): Menu labels, visibility, order
3. **Payment settings** (`payment.js`): Manual mode config, manager Telegram
4. **Contacts** (`content.js`): Phone, address, working hours, email
5. **Delivery info** (`content.js`): Delivery methods (СДЭК, EMS, Ozon, Яндекс)

## Deferred Features (per ADR-002)

- Stripe / ЮKassa / Telegram Payments → manual payment mode only
- SMS code verification → email-only (legacy pattern)
- Redis caching → not needed for static PoC
- Sheets sync → deferred
- High availability → single VPS

## Product ID Mapping

Legacy uses string IDs (e.g., `laptops_1`). Modular API uses UUID v4.
The frontend handles both formats transparently — product detail page accepts either.
