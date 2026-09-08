# Как обновлять сайт после запуска

Данные отделены от кода: PostgreSQL и загруженные файлы находятся в Docker volumes. Поэтому обычное обновление кода не удаляет пользователей и заказы.

Перед каждым обновлением:

```bash
cd /opt/compmaster
set -a
. ./.env
set +a
mkdir -p backups
docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "backups/db-$(date +%Y%m%d-%H%M%S).sql.gz"
```

Затем замените файлы проекта новой версией, **не удаляя `.env`**, и выполните:

```bash
docker compose up -d --build
```

Проверка:

```bash
curl https://ВАШ-ДОМЕН/api/health
docker compose ps
```

Если обновление сломалось, верните предыдущую папку с кодом и снова выполните `docker compose up -d --build`. База данных при этом остаётся на месте.

Важное правило: никогда не используйте `docker compose down -v` при обычном обновлении — флаг `-v` удаляет volumes с БД и файлами.
