const jwt = require("jsonwebtoken");
const config = require("../config");

function signToken(user) {
  return jwt.sign(
    { sub: user.id, login: user.login, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

// Второй, короткоживущий токен — аналог "второго пароля админ-панели" из
// клиентской беты. Выдаётся ТОЛЬКО после того, как обычный JWT уже проверен
// (человек залогинен) И он ввёл верный код доступа в саму админку.
function signAdminPanelToken(user) {
  return jwt.sign({ sub: user.id, adminPanel: true }, config.jwtSecret, { expiresIn: "12h" });
}
function verifyAdminPanelToken(token) {
  const payload = jwt.verify(token, config.jwtSecret);
  if (!payload.adminPanel) throw new Error("Не токен админ-панели");
  return payload;
}

module.exports = { signToken, verifyToken, signAdminPanelToken, verifyAdminPanelToken };
