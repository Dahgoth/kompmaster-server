import type { MetadataRoute } from "next";
import { fetchCategories, cacheTags } from "@/api/categories";
import { fetchProducts } from "@/api/products";
import { config } from "@/config";

// Sitemap index semantics are not needed at PoC catalog sizes; the route is
// tag-invalidated by product mutations and revalidates hourly regardless.
// Catalog scale decision (500–5,000) keeps one file compliant (ADR 007).
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/catalog",
    "/about",
    "/faq",
    "/contacts",
    "/warranty",
  ].map((path) => ({
    url: `${config.siteUrl}${path}`,
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.6,
  }));

  let entries: MetadataRoute.Sitemap = [];
  try {
    const categories = await fetchCategories({
      next: { revalidate: 3600, tags: [cacheTags.categories] },
    });
    entries = categories
      .filter((c) => c.kind === "catalog")
      .map((c) => ({
        url: `${config.siteUrl}/category/${encodeURIComponent(c.id)}`,
        changeFrequency: "daily" as const,
        priority: 0.8,
      }));
  } catch {
    return staticRoutes;
  }

  // Cap at 5,000 products (catalog-scale decision, ADR 007).
  const MAX = 5_000;
  try {
    for (let page = 1; entries.length < staticRoutes.length + MAX; page++) {
      const { items } = await fetchProducts(
        { page, pageSize: 100 },
        { next: { revalidate: 3600, tags: [cacheTags.products] } },
      );
      if (!items.length) break;
      for (const product of items) {
        entries.push({
          url: `${config.siteUrl}/product/${encodeURIComponent(product.slug ?? product.id)}`,
          lastModified: new Date(product.updated_at),
          changeFrequency: "daily" as const,
          priority: 0.7,
        });
      }
      if (items.length < 100) break;
    }
  } catch {
    // category entries already collected; product URLs missed this pass
  }

  return [...staticRoutes, ...entries];
}
