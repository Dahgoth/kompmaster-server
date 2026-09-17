const rateLimit = require("express-rate-limit");

// Настоящая (серверная) защита от перебора — то, чего физически не могло
// быть в клиентской HTML-бете. Считается по IP.

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Слишком много попыток входа. Попробуйте позже." },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: "Слишком много регистраций с этого адреса. Попробуйте позже." },
});

const smsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: "Слишком много запросов кода. Попробуйте через час." },
  keyGenerator: (req) => `${req.ip}:${req.body?.phone || ""}`,
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: "Слишком много запросов восстановления пароля. Попробуйте позже." },
});

// Ограничители для админ-панели (CodeQL js/missing-rate-limiting). Ключ —
// аутентифицированный пользователь, а не IP: приложение работает за Caddy
// без `trust proxy`, поэтому IP-ключ схлопнулся бы в один общий бакет для
// всех клиентов. Ставятся в цепочку после requireAuth, когда req.user уже
// заполнен; fallback на req.ip защищает от отсутствия пользователя.

// Подбор второго пароля админ-панели — жёсткий лимит, как у loginLimiter.
const adminPanelVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Слишком много попыток ввода кода доступа. Попробуйте позже." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
});

// CRUD админки за тройной защитой (requireAuth + requireRole +
// requireAdminPanelSession): щедрый, но конечный лимит на пользователя.
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: "Слишком много запросов к админ-панели. Попробуйте позже." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip,
});

module.exports = {
  loginLimiter,
  registerLimiter,
  smsLimiter,
  passwordResetLimiter,
  adminPanelVerifyLimiter,
  adminLimiter,
};
