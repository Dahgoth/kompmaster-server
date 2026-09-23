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

// Ограничители для админ-панели (CodeQL js/missing-rate-limiting). Ставятся
// ПЕРВЫМИ в цепочку маршрута, до requireAuth: CodeQL считает отдельным
// route handler'ом каждый middleware, поэтому ограничитель должен
// предшествовать всей цепочке. Ключ — заголовок Authorization (идентификатор
// аккаунта доступен ещё до проверки JWT), fallback на req.ip для запросов
// без токена; приложение работает за Caddy без `trust proxy`, поэтому
// чистый IP-ключ схлопнулся бы в один общий бакет для всех клиентов.
const accountKey = (req) => req.headers.authorization || req.ip;

// Подбор второго пароля админ-панели — жёсткий лимит, как у loginLimiter.
const adminPanelVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Слишком много попыток ввода кода доступа. Попробуйте позже." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: accountKey,
});

// CRUD админки за тройной защитой (requireAuth + requireRole +
// requireAdminPanelSession): щедрый, но конечный лимит на аккаунт.
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: "Слишком много запросов к админ-панели. Попробуйте позже." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: accountKey,
});

// Создание заказа — публичный, но самый дорогой клиентский маршрут
// (списание остатков в транзакции): ограничиваем на аккаунт.
const orderCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: "Слишком много заказов с этого аккаунта. Попробуйте позже." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: accountKey,
});

// Публичный ингест телеметрии витрины: щедрый на браузер, жёсткий на абьюз.
const telemetryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: { error: "Слишком много пакетов телеметрии. Попробуйте позже." },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  loginLimiter,
  registerLimiter,
  smsLimiter,
  passwordResetLimiter,
  adminPanelVerifyLimiter,
  adminLimiter,
  orderCreateLimiter,
  telemetryLimiter,
};
