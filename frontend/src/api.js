/**
 * API client — talks to the modular Express backend
 * - Storefront endpoints: Bearer JWT in Authorization header
 * - Admin endpoints: X-Admin-Panel-Token header
 * All errors are normalized into { ok: false, error: string, data: null }
 */

import { config, getAdminPanelToken, getAuthToken } from "./config.js";

function getHeaders(includeAuth = false, isAdmin = false) {
  const headers = { "Content-Type": "application/json" };

  if (isAdmin) {
    const token = getAdminPanelToken();
    if (token) {
      headers["X-Admin-Panel-Token"] = token;
    }
    return headers;
  }

  if (includeAuth) {
    const token = getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  return headers;
}

function buildUrl(path) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${config.apiBase}${cleanPath}`;
}

export async function apiRequest(method, path, { body, auth = false, admin = false } = {}) {
  const options = {
    method,
    headers: getHeaders(auth, admin),
  };

  if (body !== undefined && body !== null) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(buildUrl(path), options);

    let data = null;
    const text = await response.text();
    if (text && text.trim()) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!response.ok) {
      const message =
        typeof data === "object" && data?.error
          ? data.error
          : `HTTP ${response.status}: ${response.statusText}`;
      return { ok: false, error: message, data: data || null };
    }

    return { ok: true, error: null, data };
  } catch (err) {
    return { ok: false, error: err.message || "Network error", data: null };
  }
}

export const api = {
  get: (path, opts) => apiRequest("GET", path, opts),
  post: (path, opts) => apiRequest("POST", path, opts),
  put: (path, opts) => apiRequest("PUT", path, opts),
  patch: (path, opts) => apiRequest("PATCH", path, opts),
  delete: (path, opts) => apiRequest("DELETE", path, opts),
};

export async function fetchBootstrap() {
  const [categories, products, cart] = await Promise.all([
    api.get("/categories", { admin: true }),
    api.get("/products", { admin: true }),
    Promise.resolve({ ok: true, data: null }),
  ]);

  if (!categories.ok && !categories.error.includes("401")) {
    console.error("Failed to fetch categories:", categories.error);
  }

  if (!products.ok && !products.error.includes("401")) {
    console.error("Failed to fetch products:", products.error);
  }

  return {
    adminPanelToken: getAdminPanelToken() || null,
    categories: categories.data || [],
    products: products.data || [],
  };
}
