const { verifyToken, verifyAdminPanelToken } = require("../utils/jwt");
const db = require("../db");

// requireAuth: пускает только с валидным токеном, кладёт req.user = {id, login, role}
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Требуется авторизация" });
  try {
    const payload = verifyToken(token);
    const { rows } = await db.query("SELECT id, login, role, display_name FROM users WHERE id = $1", [payload.sub]);
    if (!rows.length) return res.status(401).json({ error: "Аккаунт не найден" });
    req.user = rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: "Недействительный или истёкший токен" });
  }
}

// requireRole(["admin"]) — пускает только перечисленные роли.
// Менеджер по ТЗ должен видеть только заказы — это ограничение накладывается
// именно через requireRole на конкретных роутах (см. routes/orders.js
// использует ["admin","manager"], а routes/products.js, categories, reviews,
// settings — только ["admin"]).
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Недостаточно прав для этого действия" });
    }
    next();
  };
}

// requireAdminPanelSession: второй пароль для входа именно в саму админку
// (не путать с паролем аккаунта). Фронт получает этот токен через
// POST /api/auth/admin-panel/verify и присылает его в заголовке
// X-Admin-Panel-Token на все запросы к /api/admin/*.
function requireAdminPanelSession(req, res, next) {
  const token = req.headers["x-admin-panel-token"];
  if (!token) return res.status(401).json({ error: "Нужен код доступа в админ-панель" });
  try {
    const payload = verifyAdminPanelToken(token);
    if (payload.sub !== req.user.id) return res.status(401).json({ error: "Сессия админ-панели не совпадает с аккаунтом" });
    next();
  } catch (err) {
    return res.status(401).json({ error: "Сессия админ-панели истекла, войдите заново" });
  }
}

module.exports = { requireAuth, requireRole, requireAdminPanelSession };
