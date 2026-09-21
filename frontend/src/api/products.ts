import { z } from "zod";
import { config } from "@/config";
import { apiRequest, buildHeaders, ApiError } from "@/api/client";
import { productSchema, type Product } from "@/api/schemas";
import { cacheTags } from "@/api/categories";

export interface ProductListFilters {
  category?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Catalog list with pagination. The backend keeps its v1 array body (the
 * live storefront still consumes it) and exposes the row count in the
 * X-Total-Count header, which CORS exposes to the browser.
 */
export async function fetchProducts(
  filters: ProductListFilters = {},
  options: { signal?: AbortSignal; next?: { revalidate?: number; tags?: string[] } } = {},
): Promise<{ items: Product[]; total: number }> {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.search) params.set("search", filters.search);
  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 30));

  // Server-only (RSC/sitemap): Next fetch cache directives require the
  // absolute API base — never call this from browser code.
  const response = await fetch(`${config.apiBase}/products?${params.toString()}`, {
    headers: buildHeaders("public"),
    signal: options.signal,
    next: options.next,
  });
  if (!response.ok) {
    throw new ApiError(response.status, `HTTP ${response.status}`);
  }
  const items = z.array(productSchema).parse(await response.json());
  const headerTotal = Number(response.headers.get("X-Total-Count"));
  const total = Number.isFinite(headerTotal) && headerTotal > 0 ? headerTotal : items.length;
  return { items, total };
}

/** Accepts slug or UUID (ADR 007: legacy /product/:uuid links keep working). */
export async function fetchProduct(
  idOrSlug: string,
  options: { signal?: AbortSignal; next?: { revalidate?: number; tags?: string[] } } = {},
): Promise<Product> {
  return apiRequest(productSchema, "GET", `/products/${encodeURIComponent(idOrSlug)}`, {
    ...options,
    next: options.next ?? {
      revalidate: 60,
      tags: [cacheTags.products, cacheTags.product(idOrSlug)],
    },
  });
}

export type { Product };
