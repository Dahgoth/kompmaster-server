/**
 * AuthHandlers — initializes auth-related UI handlers
 */

import { api } from "../api.js";
import { config, setAuthToken, setStoredUser } from "../config.js";
import { showPopup } from "../store.js";

export function initAuthHandlers() {
  window.showAuthModal = showAuthModal;
  window.closeAuthModal = closeAuthModal;
  window.handleAuthSubmit = handleAuthSubmit;
  window.switchAuthMode = switchAuthMode;
}

function showAuthModal(defaultMode = "login") {
  const backdrop = document.getElementById("modalBackdrop");
  const modal = document.getElementById("authModal");
  if (backdrop && modal) {
    showEl(backdrop);
    showEl(modal);
    switchAuthMode(defaultMode);
  }
}

function closeAuthModal() {
  const backdrop = document.getElementById("modalBackdrop");
  const modal = document.getElementById("authModal");
  if (backdrop && modal) {
    hideEl(backdrop);
    hideEl(modal);
  }
}

function switchAuthMode(mode) {
  const content = document.getElementById("authContent");
  if (!content) return;

  if (mode === "login") {
    content.innerHTML = `
      <div class="auth-form">
        <h1>Вход</h1>
        <form id="authForm">
          <div class="form-group">
            <label for="email">E-mail</label>
            <input type="email" id="email" name="email" class="form-input" required>
          </div>
          <div class="form-group">
            <label for="password">Пароль</label>
            <input type="password" id="password" name="password" class="form-input" required>
          </div>
          <button type="submit" class="btn btn--primary btn--full" style="height:48px;">Войти</button>
        </form>
        <div class="link-row">
          Нет аккаунта? <a href="#" class="toggle-link" onclick="window.switchAuthMode('register')">Регистрация</a>
        </div>
      </div>
    `;
  } else {
    content.innerHTML = `
      <div class="auth-form">
        <h1>Регистрация</h1>
        <form id="authForm">
          <div class="form-group">
            <label for="name">Имя</label>
            <input type="text" id="name" name="name" class="form-input" required>
          </div>
          <div class="form-group">
            <label for="email">E-mail</label>
            <input type="email" id="email" name="email" class="form-input" required>
          </div>
          <div class="form-group">
            <label for="password">Пароль</label>
            <input type="password" id="password" name="password" class="form-input" required>
          </div>
          <button type="submit" class="btn btn--primary btn--full" style="height:48px;">Зарегистрироваться</button>
        </form>
        <div class="link-row">
          Уже есть аккаунт? <a href="#" class="toggle-link" onclick="window.switchAuthMode('login')">Войти</a>
        </div>
      </div>
    `;
  }

  const form = document.getElementById("authForm");
  if (form) {
    form.onsubmit = function (e) {
      e.preventDefault();
      const formData = new FormData(form);
      handleAuthSubmit(Object.fromEntries(formData));
    };
  }
}

async function handleAuthSubmit(formData) {
  const isRegister = formData.name !== undefined;
  const endpoint = isRegister ? "/auth/register" : "/auth/login";

  const response = await api.post(endpoint, { body: formData });

  if (response.ok && response.data) {
    if (response.data.token) {
      setAuthToken(response.data.token);
    }
    if (response.data.user) {
      setStoredUser(response.data.user);
    }
    showPopup(isRegister ? "Аккаунт создан" : "Вход выполнен", "success");
    closeAuthModal();
  } else {
    showPopup(response.error || "Ошибка при выполнении запроса", "error");
  }
}

function showEl(el) { el.classList.remove("hidden"); }
function hideEl(el) { el.classList.add("hidden"); }
