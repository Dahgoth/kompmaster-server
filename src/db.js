const { Pool } = require("pg");
const config = require("./config");

const pool = new Pool({ connectionString: config.databaseUrl });

pool.on("error", (err) => {
  // Ошибка на простаивающем соединении не должна ронять весь процесс.
  console.error("[db] Неожиданная ошибка пула соединений:", err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  // Для операций, которым обязательно нужна транзакция (например списание
  // остатка при заказе) — берём отдельное соединение и явно управляем им.
  getClient: () => pool.connect(),
  pool,
};
