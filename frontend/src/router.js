/**
 * Simple client-side router
 * Supports named routes with optional path params (e.g. /product/:id)
 */

const routes = [
  { path: "/", name: "home" },
  { path: "/catalog", name: "catalog" },
  { path: "/category/:slug", name: "category" },
  { path: "/product/:id", name: "product" },
  { path: "/cart", name: "cart" },
  { path: "/checkout", name: "checkout" },
  { path: "/auth", name: "auth" },
  { path: "/orders", name: "orders" },
  { path: "/order/:id", name: "order" },
  { path: "/profile", name: "profile" },
  { path: "/about", name: "about" },
  { path: "/faq", name: "faq" },
  { path: "/contacts", name: "contacts" },
  { path: "/warranty", name: "warranty" },
  { path: "/payment/manual", name: "payment-manual" },
  { path: "/admin", name: "admin" },
  { path: "/admin/login", name: "admin-login" },
  { path: "/admin/products", name: "admin-products" },
  { path: "/admin/orders", name: "admin-orders" },
  { path: "/admin/categories", name: "admin-categories" },
  { path: "/admin/users", name: "admin-users" },
  { path: "/admin/reviews", name: "admin-reviews" },
];

function matchRoute(urlPath) {
  const path = urlPath.split("?")[0];

  for (const route of routes) {
    // Structural match: split both pattern and path on "/" and compare
    // segment-by-segment. No regex is built from the pattern, so there is
    // no escaping surface at all (CodeQL js/incomplete-sanitization).
    const patternSegments = route.path.split("/");
    const pathSegments = path.split("/");
    if (patternSegments.length !== pathSegments.length) continue;

    const params = {};
    let matched = true;
    for (let i = 0; i < patternSegments.length; i++) {
      const patternSeg = patternSegments[i];
      const pathSeg = pathSegments[i];
      if (patternSeg.startsWith(":")) {
        params[patternSeg.slice(1)] = decodeURIComponent(pathSeg);
      } else if (patternSeg !== pathSeg) {
        matched = false;
        break;
      }
    }
    if (matched) return { name: route.name, params };
  }

  return { name: "home", params: {} };
}

export function navigateTo(path, { replace = false } = {}) {
  const cleaned = path.startsWith("/") ? path : `/${path}`;
  if (replace) {
    history.replaceState(null, "", cleaned);
  } else {
    history.pushState(null, "", cleaned);
  }
  const route = matchRoute(cleaned);
  window.dispatchEvent(new PopStateEvent("locationchange"));
  return route;
}

export function getRouteFromUrl() {
  return matchRoute(window.location.pathname);
}

export function initRouter(callback) {
  window.addEventListener("popstate", () => {
    callback();
  });

  document.addEventListener("click", (e) => {
    const link = e.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute("href");
    if (!href || href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
    if (href.startsWith("/")) {
      e.preventDefault();
      navigateTo(href);
    }
  });
}

export { routes, matchRoute };
