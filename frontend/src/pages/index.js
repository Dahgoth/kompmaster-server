/**
 * Pages barrel — re-exports all page renderers
 */

export { renderHome } from "./Home.js";
export { renderCatalog } from "./Catalog.js";
export { renderProduct } from "./Product.js";
export { renderCart } from "./Cart.js";
export { renderCheckout } from "./Checkout.js";
export { renderAuth } from "./Auth.js";
export { renderOrders } from "./Orders.js";
export { renderOrder } from "./Order.js";
export { renderProfile } from "./Profile.js";
export { renderAbout } from "./About.js";
export { renderFaq } from "./Faq.js";
export { renderContacts } from "./Contacts.js";
export { renderWarranty } from "./Warranty.js";
export { renderPaymentManual } from "./PaymentManual.js";

import { setState } from "../store.js";
import { showPopup } from "../store.js";

export async function renderPage(pageName, params = {}) {
  setState({ loading: true, error: null });

  const pageMap = {
    home: renderHome,
    catalog: renderCatalog,
    category: renderCatalog,
    product: renderProduct,
    cart: renderCart,
    checkout: renderCheckout,
    auth: renderAuth,
    orders: renderOrders,
    order: renderOrder,
    profile: renderProfile,
    about: renderAbout,
    faq: renderFaq,
    contacts: renderContacts,
    warranty: renderWarranty,
    "payment-manual": renderPaymentManual,
  };

  const renderer = pageMap[pageName];
  if (!renderer) {
    setState({ loading: false, error: "Страница не найдена" });
    return;
  }

  try {
    const html = await renderer(params);
    const app = document.getElementById("app");
    if (app) {
      app.innerHTML = html;
    }
  } catch (err) {
    console.error(`Error rendering ${pageName}:`, err);
    showPopup("Ошибка загрузки страницы", "error");
  } finally {
    setState({ loading: false });
  }
}
