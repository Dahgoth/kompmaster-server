// Идемпотентный лидер-лок для фоновых задач и миграций:
// один и тот же числовой ключ гарантирует, что одновременно
// работает только один владелец (вторая реплика / второй запуск
// завершается исключением, а не двойным применением).
// Ключ миграций: hashtext('kompmaster:migrations') -> bigint.
async function withAdvisoryLock(client, key, fn) {
  await client.query("SELECT pg_advisory_lock($1)", [key]);
  try {
    return await fn();
  } finally {
    try {
      await client.query("SELECT pg_advisory_unlock($1)", [key]);
    } catch (err) {
      console.error("[lock] pg_advisory_unlock failed:", err.message);
    }
  }
}

async function getMigrationLockKey(client) {
  // Compute hashtext as bigint via SQL
  const { rows } = await client.query("SELECT hashtext('kompmaster:migrations')::bigint AS key");
  if (!rows[0]?.key) throw new Error("Failed to compute migration lock key");
  return rows[0].key;
}

module.exports = { withAdvisoryLock, getMigrationLockKey };
