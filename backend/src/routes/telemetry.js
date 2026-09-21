const express = require("express");
const { telemetryLimiter } = require("../middleware/rateLimit");

// Ингест телеметрии витрины (plan §7): ошибки JS, Web Vitals, глобальные
// обработчики. Только лог — journald подхватывает через stdout; PII нет
// (путь без параметров, код ошибки, стек, id сборки). Лимит по IP —
// эндпоинт публичный, поэтому телеметрия не должна становиться бесплатной
// записью в логи для злоумышленника.

const router = express.Router();

const MAX_EVENTS = 25;
const MAX_BODY_BYTES = 16 * 1024;
const ALLOWED_TYPES = new Set(["error", "unhandledrejection", "web-vital", "log"]);

router.post("/", telemetryLimiter, (req, res) => {
  const body = req.body || {};
  const raw = JSON.stringify(body);
  if (raw.length > MAX_BODY_BYTES) {
    return res.status(413).json({ error: "Слишком большой пакет телеметрии" });
  }
  const events = body.events;
  if (!Array.isArray(events) || events.length === 0 || events.length > MAX_EVENTS) {
    return res.status(400).json({ error: `events: массив от 1 до ${MAX_EVENTS} событий` });
  }
  for (const event of events) {
    if (!event || !ALLOWED_TYPES.has(event.type)) {
      return res.status(400).json({ error: "Неизвестный тип события телеметрии" });
    }
  }
  for (const event of events) {
    console.log(
      JSON.stringify({
        kind: "telemetry",
        type: event.type,
        name: typeof event.name === "string" ? event.name.slice(0, 100) : undefined,
        value: typeof event.value === "number" ? event.value : undefined,
        path: typeof event.path === "string" ? event.path.slice(0, 200) : undefined,
        message: typeof event.message === "string" ? event.message.slice(0, 500) : undefined,
        stack: typeof event.stack === "string" ? event.stack.slice(0, 2000) : undefined,
        buildId: typeof event.buildId === "string" ? event.buildId.slice(0, 64) : undefined,
      }),
    );
  }
  res.json({ ok: true });
});

module.exports = router;
