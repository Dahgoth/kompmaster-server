/**
 * Components barrel — re-exports all UI components
 */

export { renderHeader } from "./Header.js";
export { renderFooter } from "./Footer.js";
export { renderDrawer } from "./Drawer.js";
export { renderProductCard } from "./ProductCard.js";
export { renderProductRow } from "./ProductRow.js";
export { renderCategoryCard } from "./CategoryCard.js";
export { renderCartItem } from "./CartItem.js";
export { renderModal } from "./Modal.js";
export { renderPopup } from "./Popup.js";
export { renderBreadcrumb } from "./Breadcrumb.js";
export { renderPagination } from "./Pagination.js";
export { renderNotice } from "./Notice.js";
export { renderSkeleton } from "./Skeleton.js";

import { initState } from "../store.js";
import { initCartWatcher } from "./CartWatcher.js";
import { initAuthHandlers } from "./AuthHandlers.js";

export async function initStore() {
  initState();
  initCartWatcher();
  initAuthHandlers();
  const savedCart = localStorage.getItem("km_cart");
  if (savedCart) {
    try {
      window.__KM_CART__ = JSON.parse(savedCart);
    } catch {}
  }
}
