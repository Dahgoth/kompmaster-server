import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

/** API_BASE used by the built storefront under test. */
export const API_BASE = process.env.E2E_API_BASE ?? "http://localhost:4000/api";

const categories = [
  {
    id: "noutbuki",
    name: "Ноутбуки",
    parent_id: null,
    kind: "catalog",
    visible: true,
    image: null,
    sort_order: 0,
  },
  {
    id: "videokarty",
    name: "Видеокарты",
    parent_id: null,
    kind: "catalog",
    visible: true,
    image: null,
    sort_order: 1,
  },
];

const products = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    category_id: "noutbuki",
    name: "Ноутбук Lenovo ThinkPad T14",
    slug: "noutbuk-lenovo-thinkpad-t14",
    price: "45990.00",
    old_price: null,
    available: 3,
    image: null,
    description: "Проверенный бизнес-ноутбук",
    specs: { cpu: "i5-1135G7", ram: "16GB" },
    created_at: "2026-09-01T10:00:00.000Z",
    updated_at: "2026-09-20T10:00:00.000Z",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    category_id: "videokarty",
    name: "Видеокарта RTX 3060",
    slug: "videokarta-rtx-3060",
    price: "24990.00",
    old_price: "27990.00",
    available: 0,
    image: null,
    description: null,
    specs: null,
    created_at: "2026-09-02T10:00:00.000Z",
    updated_at: "2026-09-20T10:00:00.000Z",
  },
];

const meUser = {
  id: "33333333-3333-4333-8333-333333333333",
  login: "e2e@example.com",
  role: "user",
  display_name: "Тестовый",
};

export const handlers = [
  http.get(`${API_BASE}/categories`, () => HttpResponse.json(categories)),

  http.get(`${API_BASE}/products`, ({ request }) => {
    const url = new URL(request.url);
    const category = url.searchParams.get("category");
    const search = url.searchParams.get("search")?.toLowerCase();
    let items = products;
    if (category) items = items.filter((p) => p.category_id === category);
    if (search) items = items.filter((p) => p.name.toLowerCase().includes(search));
    return HttpResponse.json(items, {
      headers: { "X-Total-Count": String(items.length) },
    });
  }),

  http.get(`${API_BASE}/products/:id`, ({ params }) => {
    const found = products.find((p) => p.id === params.id || p.slug === params.id);
    if (!found) return HttpResponse.json({ error: "Товар не найден" }, { status: 404 });
    return HttpResponse.json(found);
  }),

  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { login?: string; password?: string };
    if (body.password !== "secret123") {
      return HttpResponse.json({ error: "Неверный логин или пароль" }, { status: 401 });
    }
    return HttpResponse.json({ token: "e2e-user-jwt", user: meUser });
  }),

  http.get(`${API_BASE}/auth/me`, ({ request }) => {
    if (!request.headers.get("authorization")) {
      return HttpResponse.json({ error: "Нет токена" }, { status: 401 });
    }
    return HttpResponse.json({ user: meUser });
  }),

  http.post(`${API_BASE}/auth/forgot-password`, () =>
    HttpResponse.json({ ok: true, message: "Если аккаунт существует, письмо отправлено." }),
  ),

  http.post(`${API_BASE}/auth/reset-password`, async ({ request }) => {
    const body = (await request.json()) as { token?: string; newPassword?: string };
    if (body.token !== "valid-token") {
      return HttpResponse.json({ error: "Ссылка недействительна или устарела" }, { status: 400 });
    }
    return HttpResponse.json({ ok: true });
  }),

  http.get(`${API_BASE}/reviews/product/:productId`, ({ params }) => {
    const found = products.find((p) => p.id === params.productId || p.slug === params.productId);
    if (!found) return HttpResponse.json({ error: "Товар не найден" }, { status: 404 });
    return HttpResponse.json([]);
  }),
];

export const mockServer = setupServer(...handlers);
