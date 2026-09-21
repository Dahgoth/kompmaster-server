import { describe, expect, it } from "vitest";
import { categorySchema, orderSchema, productSchema, userSchema } from "@/api/schemas";

/** Fixtures mirror real backend shapes (pg: NUMERIC→string, JSONB→object). */
const rawProduct = {
  id: "0d9c4a55-6b6f-4a3a-9f0e-2f4c1d5b6a7b",
  category_id: "noutbuki",
  name: "Ноутбук Lenovo ThinkPad T14",
  price: "45990.00",
  old_price: "52990.00",
  available: 3,
  image: "https://assets.compmasone.ru/products/t14.webp",
  description: "Проверенный бизнес-ноутбук",
  specs: { cpu: "i5-1135G7", ram: "16GB" },
  created_at: "2026-09-01T10:00:00.000Z",
  updated_at: "2026-09-20T10:00:00.000Z",
};

describe("productSchema", () => {
  it("parses a raw pg row, coercing NUMERIC strings to numbers", () => {
    const product = productSchema.parse(rawProduct);
    expect(product.price).toBe(45990);
    expect(product.old_price).toBe(52990);
    expect(product.available).toBe(3);
    expect(product.specs).toEqual({ cpu: "i5-1135G7", ram: "16GB" });
  });

  it("keeps slug optional (backend migration may not be applied yet)", () => {
    expect(productSchema.parse(rawProduct).slug).toBeUndefined();
    expect(productSchema.parse({ ...rawProduct, slug: "noutbuh-lenovo" }).slug).toBe(
      "noutbuh-lenovo",
    );
  });

  it("rejects a product missing required fields", () => {
    const { name: _name, ...broken } = rawProduct;
    expect(() => productSchema.parse(broken)).toThrow();
  });
});

describe("categorySchema", () => {
  it("accepts a backend category row", () => {
    const category = categorySchema.parse({
      id: "noutbuki",
      name: "Ноутбуки",
      parent_id: null,
      kind: "catalog",
      visible: true,
      image: null,
      sort_order: 0,
    });
    expect(category.id).toBe("noutbuki");
    expect(category.visible).toBe(true);
  });
});

describe("userSchema", () => {
  it("accepts both register (display_name) and login (displayName) shapes", () => {
    expect(
      userSchema.parse({ id: "u1", login: "a@b.ru", role: "user", display_name: null }),
    ).toMatchObject({ id: "u1" });
    expect(
      userSchema.parse({ id: "u1", login: "a@b.ru", role: "admin", displayName: "Админ" }),
    ).toMatchObject({ displayName: "Админ" });
  });

  it("rejects unknown roles", () => {
    expect(() => userSchema.parse({ id: "u1", login: "x", role: "superadmin" })).toThrow();
  });
});

describe("orderSchema", () => {
  it("coerces NUMERIC money fields and keeps server-owned status strings", () => {
    const order = orderSchema.parse({
      id: "o1",
      number: "KM-20260921-1234",
      user_id: "u1",
      items: [{ productId: "p1", name: "Товар", price: "1000.50", qty: 2 }],
      subtotal: "2001.00",
      discount: "0",
      total: "2001.00",
      status: "Формируется заказ",
      payment_status: "Ожидает оплаты",
      receive_method: "pickup",
      address: null,
      contact_phone: "+79000000000",
      cancel_reason: null,
      created_at: "2026-09-21T08:00:00.000Z",
      paid_at: null,
      status_updated_at: "2026-09-21T08:00:00.000Z",
    });
    expect(order.total).toBe(2001);
    expect(order.items[0]?.price).toBe(1000.5);
    expect(order.status).toBe("Формируется заказ");
  });
});
