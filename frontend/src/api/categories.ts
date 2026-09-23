import { z } from "zod";
import { apiRequest } from "@/api/client";
import { categorySchema, type Category } from "@/api/schemas";

/** Centralized query-key factory (plan §4) — mutate hooks invalidate these. */
export const queryKeys = {
  categories: ["categories"] as const,
  categoriesAdmin: ["categories", "admin"] as const,
  products: (filters: { category?: string; search?: string; page?: number }) =>
    ["products", filters] as const,
  product: (idOrSlug: string) => ["product", idOrSlug] as const,
  ordersMine: ["orders", "my"] as const,
  order: (id: string) => ["order", id] as const,
  adminOrders: (filters: { status?: string; search?: string; page?: number }) =>
    ["admin-orders", filters] as const,
  adminReviewsPending: ["admin-reviews", "pending"] as const,
  reviews: (productId: string) => ["reviews", productId] as const,
} as const;

/** Cache tags for the server-side Next fetch cache / on-demand revalidation. */
export const cacheTags = {
  categories: "categories",
  products: "products",
  product: (idOrSlug: string) => `product:${idOrSlug}`,
  pages: "pages",
  page: (slug: string) => `page:${slug}`,
} as const;

export async function fetchCategories(
  options: { signal?: AbortSignal; next?: { revalidate?: number; tags?: string[] } } = {},
): Promise<Category[]> {
  return apiRequest(z.array(categorySchema), "GET", "/categories", options);
}

export type { Category };
