/**
 * Pages barrel — re-exports all page renderers
 */

import { renderHome } from "./Home.js";
import { renderCatalog } from "./Catalog.js";
import { renderProduct } from "./Product.js";
import { renderCart } from "./Cart.js";
import { renderCheckout } from "./Checkout.js";
import { renderAuth } from "./Auth.js";
import { renderOrders } from "./Orders.js";
import { renderOrder } from "./Order.js";
import { renderProfile } from "./Profile.js";
import { renderAbout } from "./About.js";
import { renderFaq } from "./Faq.js";
import { renderContacts } from "./Contacts.js";
import { renderWarranty } from "./Warranty.js";
import { renderPaymentManual } from "./PaymentManual.js";

export {
  renderHome,
  renderCatalog,
  renderProduct,
  renderCart,
  renderCheckout,
  renderAuth,
  renderOrders,
  renderOrder,
  renderProfile,
  renderAbout,
  renderFaq,
  renderContacts,
  renderWarranty,
  renderPaymentManual,
};

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
