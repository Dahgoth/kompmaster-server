const fetch = require("node-fetch");
const config = require("../config");

async function notifyAdmin(text) {
  if (!config.telegram.botToken || !config.telegram.chatId) {
    console.log(`[telegram:DRY-RUN] ${text}`);
    return;
  }
  const url = `https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: config.telegram.chatId, text, parse_mode: "HTML" }),
    });
  } catch (err) {
    // Уведомление — не критичная для бизнес-логики операция, поэтому
    // ошибку только логируем и не прерываем основной запрос.
    console.error("[telegram] не удалось отправить уведомление:", err.message);
  }
}

module.exports = { notifyAdmin };
