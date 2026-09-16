/**
 * Catalog page — lists products in a category or all products
 */

import { api } from "../api.js";
import { renderProductCard, renderCategoryCard, renderPagination, renderSkeleton } from "../components/index.js";
import { defaultCategories } from "../data/categories.js";

export async function renderCatalog(params = {}) {
  const { slug } = params;
  let category = null;
  let products = [];
  let categories = [];
  let loading = true;
  let totalPages = 1;

  try {
    if (slug) {
      const catResp = await api.get(`/categories/${slug}`);
      if (catResp.ok && catResp.data) category = catResp.data;

      const prodResp = await api.get(`/products?category=${slug}`);
      if (prodResp.ok && prodResp.data) {
        products = prodResp.data;
        loading = false;
      }
    } else {
      const prodResp = await api.get("/products");
      if (prodResp.ok && prodResp.data) {
        products = prodResp.data;
        loading = false;
      }
    }

    const catResp = await api.get("/categories");
    if (catResp.ok && catResp.data) {
      categories = catResp.data;
    }
  } catch (err) {
    loading = false;
  }

  const subCategories = categories.filter(
    (c) => category && (c.parent_id === category.id || c.parentId === category.id || c.id === category.id)
  );

  const title = category ? category.name : "Каталог товаров";
  const description = category ? category.description : "Все товары в одном месте";

  return `
    <section class="section">
      <div class="shell">
        <nav class="breadcrumbs">
          <a href="/">Главная</a>
          <span class="separator">/</span>
          <span class="current">${title}</span>
        </nav>
        <h1 class="section-title">${title}</h1>
        <p class="section-subtitle">${description}</p>

        ${subCategories.length > 0 ? `
          <div class="categories-grid" style="margin-bottom:38px;">
            ${subCategories.map((c) => renderCategoryCard(c)).join("")}
          </div>
        ` : ""}

        <div class="product-grid">
          ${loading
            ? [1, 2, 3, 4, 5, 6].map(() => renderSkeleton("image", "100%", "280px")).join("")
            : products.map((p) => renderProductCard(p)).join("")
          }
        </div>

        ${products.length === 0 && !loading ? `<p style="text-align:center;padding:60px;color:var(--muted);">Товары не найдены</p>` : ""}

        ${totalPages > 1 ? renderPagination({ currentPage: 1, totalPages, baseUrl: slug ? `/category/${slug}` : "/catalog" }) : ""}
      </div>
    </section>
  `;
}
