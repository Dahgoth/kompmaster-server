const fetch = require("node-fetch");
const config = require("../config");

// Написано под API SMS.ru (https://sms.ru/api/send) — простой GET-запрос.
// Если возьмёте другого провайдера (SMSC.ru, Twilio и т.д.), поменяйте
// только тело этой функции — остальной код её вызывает одинаково.
async function sendSms(phone, text) {
  if (!config.sms.apiId || !config.sms.apiUrl) {
    console.log(`[sms:DRY-RUN] to=${phone} text="${text}"`);
    return;
  }
  const url = new URL(config.sms.apiUrl);
  url.searchParams.set("api_id", config.sms.apiId);
  url.searchParams.set("to", phone);
  url.searchParams.set("msg", text);
  url.searchParams.set("json", "1");
  const res = await fetch(url.toString());
  const data = await res.json().catch(() => null);
  if (!data || String(data.status).toLowerCase() !== "ok") {
    console.error("[sms] ошибка отправки:", data);
    throw new Error("Не удалось отправить SMS");
  }
}

module.exports = { sendSms };
