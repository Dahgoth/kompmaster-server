/**
 * Global store — minimal reactive state management
 * Provides observable state with subscribe/unsubscribe pattern
 */

import { config, getStoredUser, setStoredUser, getAuthToken, setAuthToken } from "./config.js";

const listeners = new Set();
let _state = {
  user: getStoredUser(),
  cart: [],
  categories: [],
  products: [],
  currentProduct: null,
  orders: [],
  currentOrder: null,
  adminToken: null,
  adminMode: false,
  page: "home",
  pageData: null,
  loading: false,
  error: null,
  popup: null,
};

function persist(key, value) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function getState() {
  return { ..._state };
}

export function setState(newState) {
  const prev = { ..._state };
  _state = { ..._state, ...newState };

  if (newState.user !== undefined) {
    setStoredUser(_state.user);
  }
  if (newState.cart !== undefined) {
    persist(config.cartKey, _state.cart);
  }

  listeners.forEach((cb) => cb(_state, prev));
}

export function subscribe(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function initState() {
  const savedCart = localStorage.getItem(config.cartKey);
  if (savedCart) {
    try {
      _state.cart = JSON.parse(savedCart);
    } catch {}
  }

  if (getAuthToken()) {
    _state.adminMode = true;
  }
}

export function addToCart(product, quantity = 1) {
  const existing = _state.cart.find((item) => item.id === product.id);
  let newCart;
  if (existing) {
    newCart = _state.cart.map((item) =>
      item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
    );
  } else {
    newCart = [..._state.cart, { ...product, quantity }];
  }
  setState({ cart: newCart });
}

export function removeFromCart(productId) {
  setState({
    cart: _state.cart.filter((item) => item.id !== productId),
  });
}

export function updateCartQuantity(productId, quantity) {
  if (quantity <= 0) {
    removeFromCart(productId);
    return;
  }
  setState({
    cart: _state.cart.map((item) =>
      item.id === productId ? { ...item, quantity } : item
    ),
  });
}

export function clearCart() {
  setState({ cart: [] });
}

export function getCartTotal() {
  return _state.cart.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
}

export function getCartCount() {
  return _state.cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
}

export function setPage(page, data = null) {
  setState({ page, pageData: data, error: null });
}

export function showPopup(message, type = "info", duration = 3500) {
  setState({ popup: { message, type } });
  if (duration > 0) {
    setTimeout(() => {
      setState({ popup: null });
    }, duration);
  }
}

export function getUser() {
  return _state.user;
}

export function setUser(user) {
  setStoredUser(user);
  if (user) {
    setAuthToken(user.token);
    setState({ user });
  } else {
    setAuthToken(null);
    setState({ user: null });
  }
}
