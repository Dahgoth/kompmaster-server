require("dotenv").config();

function required(name, fallback) {
  const v = process.env[name];
  if (v === undefined || v === "") {
    if (fallback !== undefined) return fallback;
    console.warn(`[config] Внимание: переменная окружения ${name} не задана.`);
    return "";
  }
  return v;
}

// Returns the validated allowlist as an array. The joined string is what the
// CORS middleware consumes; the first entry is the canonical origin used to
// build outbound links (see frontendCanonicalOrigin).
function frontendOrigins(raw) {
  const origins = String(raw || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  if (!origins.length) {
    throw new Error(
      "FRONTEND_ORIGIN must list at least one origin (e.g. https://www.compmasone.ru)",
    );
  }
  for (const o of origins) {
    if (o === "*" || !/^https?:\/\/[^/]+$/.test(o)) {
      throw new Error(`FRONTEND_ORIGIN entry is not an allowed explicit origin: ${o}`);
    }
  }
  return origins;
}

// Unset FRONTEND_ORIGIN keeps the PoC defaults: the canonical storefront
// (www) first, then the apex — which 301-redirects to www (see terraform/).
// An explicitly empty value fails closed (fail-closed allowlist, E14).
const frontendOriginList = frontendOrigins(
  process.env.FRONTEND_ORIGIN === undefined
    ? "https://www.compmasone.ru,https://compmasone.ru"
    : process.env.FRONTEND_ORIGIN,
);

module.exports = {
  port: Number(required("PORT", "4000")),
  nodeEnv: required("NODE_ENV", "development"),
  frontendOrigin: frontendOriginList.join(","),
  // Single origin for outbound links (password-reset URLs). NEVER interpolate
  // frontendOrigin into a URL — it is a comma-separated allowlist.
  frontendCanonicalOrigin: frontendOriginList[0],
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: required("JWT_EXPIRES_IN", "7d"),
  adminPanelPassword: required("ADMIN_PANEL_PASSWORD", "5252"),
  s3: {
    endpoint: required("S3_ENDPOINT"),
    region: required("S3_REGION", "us-east-1"),
    bucket: required("S3_BUCKET"),
    accessKey: required("S3_ACCESS_KEY"),
    secretKey: required("S3_SECRET_KEY"),
    publicUrl: required("S3_PUBLIC_URL"),
  },
  smtp: {
    host: required("SMTP_HOST"),
    port: Number(required("SMTP_PORT", "587")),
    user: required("SMTP_USER"),
    password: required("SMTP_PASSWORD"),
    from: required("SMTP_FROM", "no-reply@example.com"),
  },
  sms: {
    apiUrl: required("SMS_PROVIDER_API_URL"),
    apiId: required("SMS_PROVIDER_API_ID"),
  },
  telegram: {
    botToken: required("TELEGRAM_BOT_TOKEN"),
    chatId: required("TELEGRAM_CHAT_ID"),
  },
  yandexMetrikaId: required("YANDEX_METRIKA_ID"),
};
