/**
 * Home page
 */

import { api } from "../api.js";
import { renderCategoryCard, renderProductRow, renderSkeleton } from "../components/index.js";
import { defaultCategories } from "../data/categories.js";

export async function renderHome() {
  let categories = defaultCategories.filter(
    (c) => c.visible && !c.parentId && c.kind === "catalog",
  );
  let featuredProducts = [];
  let loading = true;

  try {
    const resp = await api.get("/products?featured=true");
    if (resp.ok && resp.data) {
      featuredProducts = resp.data;
      loading = false;
    }
  } catch {
    loading = false;
  }

  const catalogCategories = categories.slice(0, 8);

  return `
    <section class="hero">
      <div class="shell">
        <h1 class="hero-title">КомпМастер</h1>
        <p class="hero-subtitle">Восстановленная электроника из США — ноутбуки, видеокарты, комплектующие, периферия. Гарантия 1 год, доставка по России за 6–8 недель.</p>
        <div class="hero-cta">
          <a href="/catalog" class="btn btn--secondary">Каталог товаров</a>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="shell">
        <div class="categories-grid">
          ${catalogCategories.map((c) => renderCategoryCard(c)).join("")}
        </div>
      </div>
    </section>

    <section class="section--tight">
      <div class="shell">
        <h2 class="section-title">Популярные товары</h2>
        <div class="product-grid">
          ${
            loading
              ? [1, 2, 3].map(() => renderSkeleton("image", "100%", "200px")).join("")
              : featuredProducts.map((p) => renderProductRow(p)).join("")
          }
        </div>
      </div>
    </section>
  `;
}
