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

function buildProductsUrl(query: string): string {
  if (typeof window === "undefined") {
    return `${config.apiBase}/products?${query}`;
  }
  return `${config.clientApiBase}/products?${query}`;
}

/**
 * Catalog list with pagination. The backend keeps its v1 array body (the
 * live storefront still consumes it) and exposes the row count in the
 * X-Total-Count header, which CORS exposes to the browser.
 */
export async function fetchProducts(
  filters: ProductListFilters = {},
  options: {
    signal?: AbortSignal;
    next?: { revalidate?: number; tags?: string[] };
    scope?: "public" | "admin";
  } = {},
): Promise<{ items: Product[]; total: number }> {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.search) params.set("search", filters.search);
  params.set("page", String(filters.page ?? 1));
  params.set("pageSize", String(filters.pageSize ?? 30));

  const scope = options.scope ?? "public";
  // Server-side fetches (RSC/sitemap) use the absolute API base with Next
  // fetch-cache directives; browser callers use the same-origin proxy via
  // apiRequest-style URL building.
  const url = buildProductsUrl(params.toString());
  const response = await fetch(url, {
    headers: buildHeaders(scope),
    signal: options.signal,
    ...(scope === "public" ? { next: options.next } : {}),
  });
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const data: unknown = await response.json();
      if (data !== null && typeof data === "object" && "error" in data) {
        message = String((data as { error: unknown }).error);
      }
    } catch {
      // keep status-line message
    }
    throw new ApiError(response.status, message);
  }
  const items = z.array(productSchema).parse(await response.json());
  const headerTotal = Number(response.headers.get("X-Total-Count"));
  const total = Number.isFinite(headerTotal) && headerTotal > 0 ? headerTotal : items.length;
  return { items, total };
}

/** Product detail by id (opaque UUID). Non-UUID values 404 on the backend
 * before touching the DB (invalid UUID syntax guard in routes/products.js). */
export async function fetchProduct(
  id: string,
  options: { signal?: AbortSignal; next?: { revalidate?: number; tags?: string[] } } = {},
): Promise<Product> {
  return apiRequest(productSchema, "GET", `/products/${encodeURIComponent(id)}`, {
    ...options,
    next: options.next ?? {
      revalidate: 60,
      tags: [cacheTags.products, cacheTags.product(id)],
    },
  });
}

export type { Product };
