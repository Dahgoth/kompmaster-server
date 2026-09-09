const express = require("express");
const crypto = require("crypto");
const db = require("../db");
const config = require("../config");
const { hashPassword, verifyPassword } = require("../utils/hash");
const { signToken, signAdminPanelToken } = require("../utils/jwt");
const { sendSms } = require("../utils/sms");
const { sendPasswordResetEmail } = require("../utils/email");
const { requireAuth, requireRole } = require("../middleware/auth");
const {
  loginLimiter,
  registerLimiter,
  smsLimiter,
  passwordResetLimiter,
} = require("../middleware/rateLimit");

const router = express.Router();

function canonicalLogin(v) {
  const s = String(v || "").trim();
  return s.includes("@") ? s.toLowerCase() : s;
}

router.post("/register", registerLimiter, async (req, res) => {
  const { login, password, displayName, privacyAccepted } = req.body || {};
  if (!login || !password || password.length < 6) {
    return res.status(400).json({ error: "Укажите логин и пароль (минимум 6 символов)" });
  }
  if (!privacyAccepted) {
    return res.status(400).json({ error: "Нужно согласие на обработку персональных данных" });
  }
  const key = canonicalLogin(login);
  const existing = await db.query("SELECT id FROM users WHERE login = $1", [key]);
  if (existing.rows.length) return res.status(409).json({ error: "Такой аккаунт уже зарегистрирован" });

  const passwordHash = await hashPassword(password);
  const { rows } = await db.query(
    `INSERT INTO users (login, password_hash, display_name, privacy_accepted_at)
     VALUES ($1, $2, $3, now()) RETURNING id, login, role, display_name`,
    [key, passwordHash, displayName || null]
  );
  const user = rows[0];
  res.json({ token: signToken(user), user });
});

router.post("/login", loginLimiter, async (req, res) => {
  const { login, password } = req.body || {};
  const key = canonicalLogin(login);
  const { rows } = await db.query("SELECT * FROM users WHERE login = $1", [key]);
  const user = rows[0];
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return res.status(401).json({ error: "Неверный логин или пароль" });
  }
  res.json({
    token: signToken(user),
    user: { id: user.id, login: user.login, role: user.role, displayName: user.display_name },
  });
});

// ---- Подтверждение телефона по SMS ----

router.post("/phone/request", smsLimiter, async (req, res) => {
  const phone = String(req.body?.phone || "").replace(/[^\d+]/g, "");
  if (phone.length < 10) return res.status(400).json({ error: "Некорректный номер телефона" });

  const code = String(Math.floor(1000 + Math.random() * 9000)); // 4 цифры
  const codeHash = crypto.createHash("sha256").update(code).digest("hex");
  await db.query(
    `INSERT INTO phone_verifications (phone, code_hash, expires_at)
     VALUES ($1, $2, now() + interval '5 minutes')`,
    [phone, codeHash]
  );
  await sendSms(phone, `КомпМастер: код подтверждения ${code}`);
  res.json({ ok: true });
});

router.post("/phone/confirm", async (req, res) => {
  const phone = String(req.body?.phone || "").replace(/[^\d+]/g, "");
  const code = String(req.body?.code || "").trim();
  const { rows } = await db.query(
    `SELECT * FROM phone_verifications
     WHERE phone = $1 AND expires_at > now()
     ORDER BY created_at DESC LIMIT 1`,
    [phone]
  );
  const record = rows[0];
  if (!record) return res.status(400).json({ error: "Код не найден или истёк, запросите новый" });
  if (record.attempts >= 5) return res.status(429).json({ error: "Слишком много попыток, запросите новый код" });

  const codeHash = crypto.createHash("sha256").update(code).digest("hex");
  if (codeHash !== record.code_hash) {
    await db.query("UPDATE phone_verifications SET attempts = attempts + 1 WHERE id = $1", [record.id]);
    return res.status(400).json({ error: "Неверный код" });
  }
  if (req.user) {
    await db.query("UPDATE users SET phone = $1, phone_verified_at = now() WHERE id = $2", [phone, req.user.id]);
  }
  res.json({ ok: true, phone });
});

// ---- Восстановление пароля по e-mail ----

router.post("/forgot-password", passwordResetLimiter, async (req, res) => {
  const key = canonicalLogin(req.body?.email);
  const { rows } = await db.query("SELECT id, login FROM users WHERE login = $1", [key]);
  // Не сообщаем, существует ли аккаунт — стандартная практика против перебора e-mail.
  if (rows.length) {
    const user = rows[0];
    const token = crypto.randomBytes(32).toString("hex");
    await db.query(
      `INSERT INTO password_resets (token, user_id, expires_at) VALUES ($1, $2, now() + interval '1 hour')`,
      [token, user.id]
    );
    const resetUrl = `${config.frontendOrigin}/reset-password?token=${token}`;
    await sendPasswordResetEmail(user.login, resetUrl);
  }
  res.json({ ok: true, message: "Если такой аккаунт существует, письмо со ссылкой отправлено." });
});

router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: "Пароль должен быть не короче 6 символов" });
  }
  const { rows } = await db.query(
    "SELECT * FROM password_resets WHERE token = $1 AND used_at IS NULL AND expires_at > now()",
    [token]
  );
  const record = rows[0];
  if (!record) return res.status(400).json({ error: "Ссылка недействительна или устарела" });

  const passwordHash = await hashPassword(newPassword);
  await db.query("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, record.user_id]);
  await db.query("UPDATE password_resets SET used_at = now() WHERE token = $1", [token]);
  res.json({ ok: true });
});

// ---- Второй пароль входа в саму админ-панель ----

router.post("/admin-panel/verify", requireAuth, requireRole(["admin", "manager"]), async (req, res) => {
  const { password } = req.body || {};
  if (password !== config.adminPanelPassword) {
    return res.status(401).json({ error: "Неверный код доступа" });
  }
  res.json({ adminPanelToken: signAdminPanelToken(req.user) });
});

router.get("/me", requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
