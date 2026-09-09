// Простой раннер миграций: применяет все .sql файлы из /migrations по
// порядку имени, один раз (запоминает применённые в служебной таблице).
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
const config = require("./config");

async function main() {
  const pool = new Pool({ connectionString: config.databaseUrl });
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
    const dir = path.join(__dirname, "..", "migrations");
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
    for (const file of files) {
      const { rows } = await client.query(
        "SELECT 1 FROM schema_migrations WHERE filename = $1",
        [file]
      );
      if (rows.length) {
        console.log(`[migrate] пропускаю ${file} (уже применена)`);
        continue;
      }
      console.log(`[migrate] применяю ${file}...`);
      const sql = fs.readFileSync(path.join(dir, file), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (filename) VALUES ($1)",
          [file]
        );
        await client.query("COMMIT");
        console.log(`[migrate] готово: ${file}`);
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    }
    console.log("[migrate] все миграции применены.");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("[migrate] ошибка:", err);
  process.exit(1);
});
