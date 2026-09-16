/**
 * CartWatcher — initializes cart-related UI watchers
 */

import { subscribe, getCartCount, getCartTotal } from "../store.js";

export function initCartWatcher() {
  updateCartUI();

  subscribe(() => {
    updateCartUI();
  });
}

function updateCartUI() {
  const cartBtn = document.querySelector(".cart-btn .cart-count");
  if (cartBtn) {
    cartBtn.textContent = String(getCartCount());
  }
}
