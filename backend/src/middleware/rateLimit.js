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

module.exports = { loginLimiter, registerLimiter, smsLimiter, passwordResetLimiter };
