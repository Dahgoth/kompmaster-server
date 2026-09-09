const bcrypt = require("bcryptjs");

// Пароли пользователей и код доступа к админ-панели хешируются
// одинаково — bcrypt с солью, не голый SHA-256 (в клиентской бете
// SHA-256 без соли годился только для проверки в браузере, для сервера
// это слабый формат).
async function hashPassword(plain) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(plain, salt);
}

async function verifyPassword(plain, hash) {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

module.exports = { hashPassword, verifyPassword };
