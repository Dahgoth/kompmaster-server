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

module.exports = {
  port: Number(required("PORT", "4000")),
  nodeEnv: required("NODE_ENV", "development"),
  frontendOrigin: required("FRONTEND_ORIGIN", "*"),
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
