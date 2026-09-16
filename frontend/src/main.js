/**
 * Main entry point
 * Initializes store, router, renders components, and handles navigation
 */

import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/pages.css";
import "./styles/admin.css";
import "./styles/utilities.css";

import { config, getAdminPanelToken } from "./config.js";
import { initStore, renderHeader, renderFooter } from "./components/index.js";
import { renderPage } from "./pages/index.js";
import { initRouter, getRouteFromUrl, navigateTo } from "./router.js";
import { api, fetchBootstrap } from "./api.js";
import { showPopup } from "./store.js";

let splashRemoved = false;

function removeSplash() {
  if (splashRemoved) return;
  splashRemoved = true;
  const splash = document.getElementById("splash");
  if (splash) {
    splash.classList.add("is-hidden");
    setTimeout(() => {
      if (splash.parentNode) splash.parentNode.removeChild(splash);
    }, 450);
  }
}

function render() {
  const route = getRouteFromUrl();
  renderHeader(route.name);
  renderFooter(route.name);
  renderPage(route.name, route.params);
  removeSplash();
}

export async function init() {
  await initStore();
  const bootstrap = await fetchBootstrap();

  if (bootstrap.adminToken) {
    navigateTo("/admin/products", { replace: true });
    setTimeout(render, 50);
    return;
  }

  initRouter(render);
  render();
}

document.addEventListener("DOMContentLoaded", () => {
  init().catch((err) => {
    console.error("Failed to initialize app:", err);
    showPopup("Ошибка загрузки приложения", "error");
    removeSplash();
  });
});
