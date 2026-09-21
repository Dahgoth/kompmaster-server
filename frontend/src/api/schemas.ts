import { z } from "zod";

/**
 * API response schemas — the typed contract boundary against the untyped
 * CommonJS backend (plan §4). Every server/client fetch parses through these;
 * a backend contract change fails loudly in dev/tests instead of rendering
 * `undefined` downstream.
 *
 * PostgreSQL specifics encoded here:
 * - NUMERIC(12,2) arrives as a string from `pg` → coerced to number at the
 *   boundary; money math stays in integer kopecks in domain mappers (never
 *   float math on rubles).
 * - TIMESTAMPTZ serializes as ISO 8601 strings.
 * - JSONB arrives parsed (specs, order items).
 */

const isoString = z.string().min(1);
const numeric = z.union([z.string(), z.number()]).transform((v) => Number(v));
const nullableNumeric = z
  .union([z.string(), z.number(), z.null()])
  .nullable()
  .transform((v) => (v === null ? null : Number(v)));

export const roleSchema = z.enum(["user", "manager", "admin"]);

export const userSchema = z.object({
  id: z.string(),
  login: z.string(),
  role: roleSchema,
  // register returns raw row `display_name`; login returns mapped `displayName`.
  display_name: z.string().nullable().optional(),
  displayName: z.string().nullable().optional(),
});

export const authResponseSchema = z.object({
  token: z.string(),
  user: userSchema,
});

export const meResponseSchema = z.object({ user: userSchema });

export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  parent_id: z.string().nullable(),
  kind: z.string(), // 'catalog' | 'group'; admin API accepts arbitrary kinds
  visible: z.boolean(),
  image: z.string().nullable(),
  sort_order: z.number().int(),
});

export const productSchema = z.object({
  id: z.string(),
  category_id: z.string(),
  name: z.string(),
  price: numeric,
  old_price: nullableNumeric,
  available: z.number().int(),
  image: z.string().nullable(),
  description: z.string().nullable(),
  specs: z.record(z.string(), z.unknown()).nullable(),
  created_at: isoString,
  updated_at: isoString,
  // Added by migration 002 (backend phase 2); optional so the UI keeps
  // working against an un-migrated staging backend.
  slug: z.string().optional(),
});

export const productsQuerySchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(30),
});

export const orderItemSchema = z.object({
  productId: z.string(),
  name: z.string(),
  price: numeric,
  qty: z.number().int().min(1),
});

export const orderSchema = z.object({
  id: z.string(),
  number: z.string(),
  user_id: z.string().nullable(),
  items: z.array(orderItemSchema),
  subtotal: numeric,
  discount: numeric,
  total: numeric,
  status: z.string(),
  payment_status: z.string(),
  receive_method: z.string().nullable(),
  address: z.string().nullable(),
  contact_phone: z.string().nullable(),
  cancel_reason: z.string().nullable(),
  created_at: isoString,
  paid_at: z.string().nullable(),
  status_updated_at: isoString,
});

export const orderHistoryEntrySchema = z.object({
  id: z.string(),
  order_id: z.string(),
  text: z.string(),
  created_at: isoString,
});

export const orderDetailSchema = orderSchema.extend({
  history: z.array(orderHistoryEntrySchema),
});

export const reviewSchema = z.object({
  id: z.string(),
  product_id: z.string(),
  user_id: z.string().nullable(),
  author_name: z.string().nullable(),
  rating: z.number().int().min(1).max(5),
  text: z.string().nullable(),
  image: z.string().nullable(),
  source: z.string(),
  status: z.string(),
  created_at: isoString,
});

export const contentPageSchema = z.object({
  slug: z.string(),
  title: z.string(),
  body_markdown: z.string().nullable(),
  meta_title: z.string().nullable(),
  meta_description: z.string().nullable(),
  noindex: z.boolean(),
  updated_at: isoString,
});

export type Role = z.infer<typeof roleSchema>;
export type User = z.infer<typeof userSchema>;
export type Category = z.infer<typeof categorySchema>;
export type Product = z.infer<typeof productSchema>;
export type Order = z.infer<typeof orderSchema>;
export type OrderDetail = z.infer<typeof orderDetailSchema>;
export type Review = z.infer<typeof reviewSchema>;
export type ContentPage = z.infer<typeof contentPageSchema>;
