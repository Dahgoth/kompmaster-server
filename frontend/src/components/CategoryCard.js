/**
 * CategoryCard component — for category listing
 */

import { escapeHtml } from "../utils.js";

export function renderCategoryCard(category) {
  return `
    <div class="category-card" onclick="window.navigateTo('/category/${escapeHtml(category.id)}')">
      <img src="${escapeHtml(category.image || "/assets/no-category.svg")}"
           alt="${escapeHtml(category.name)}" class="category-card__icon">
      <h3 class="category-card__title">${escapeHtml(category.name)}</h3>
      <span class="category-card__count">${category.product_count || ""} товаров</span>
    </div>
  `;
}

export function renderCategoryGroup(groupCategory, childCategories = []) {
  const children = childCategories.filter((c) => c.parent_id === groupCategory.id || c.parentId === groupCategory.id);
  return `
    <div class="category-group">
      <h3 class="category-group__title">${escapeHtml(groupCategory.name)}</h3>
      <div class="category-group__grid">
        ${children.map((c) => renderCategoryCard(c)).join("")}
      </div>
    </div>
  `;
}
