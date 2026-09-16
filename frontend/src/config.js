/**
 * Configuration — reads from environment / window globals
 * See frontend/.env.example and ENVIRONMENT.md
 */

const API_BASE = import.meta.env?.VITE_API_BASE || "/api";

export const config = {
  apiBase: API_BASE,
  domain: "compmasone.ru",
  siteName: "КомпМастер",
  siteDescription: "Восстановленная электроника из США",
  currency: "₽",
  currencyCode: "RUB",
  adminPanelTokenKey: "km_admin_panel_token",
  authTokenKey: "km_auth_token",
  cartKey: "km_cart",
  userKey: "km_user",
};

export function getAdminPanelToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(config.adminPanelTokenKey);
}

export function setAdminPanelToken(token) {
  localStorage.setItem(config.adminPanelTokenKey, token || "");
}

export function getAuthToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(config.authTokenKey);
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem(config.authTokenKey, token);
  } else {
    localStorage.removeItem(config.authTokenKey);
  }
}

export function getStoredUser() {
  const raw = localStorage.getItem(config.userKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  if (user) {
    localStorage.setItem(config.userKey, JSON.stringify(user));
  } else {
    localStorage.removeItem(config.userKey);
  }
}
