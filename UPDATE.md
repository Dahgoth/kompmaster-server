# Как обновлять сайт после запуска

Данные отделены от кода: PostgreSQL и загруженные файлы находятся
на диске VPS. Поэтому обычное обновление кода не удаляет пользователей и заказы.

Перед каждым обновлением:

```bash
cd /opt/compmaster
set -a
. ./.env
set +a
mkdir -p backups
pg_dump -U kompmaster kompmaster | gzip > "backups/db-$(date +%Y%m%d-%H%M%S).sql.gz"
```

Затем замените файлы проекта новой версией, **не удаляя `.env`**, и выполните:

```bash
pnpm install --prod --frozen-lockfile   # если изменились зависимости
pm2 restart kompmaster-api
```

Проверка:

```bash
curl https://ВАШ-ДОМЕН/api/health
pm2 status
```

Если обновление сломало, верните предыдущую версию кода и снова выполните
`pm2 restart kompmaster-api`. База данных при этом остаётся на месте.

Важное правило: всегда делайте backup БД перед обновлением.


## Обновление Server v1 → v2

1. Сделайте backup PostgreSQL и `uploads`.
2. Замените код проекта файлами Server v2, не удаляя данные.
3. Выполните `pm2 restart kompmaster-api`.
4. При первом старте Server v2 сам добавит новую структуру категорий и новые прайсы. Старые категории, пользовательские картинки, заказы и пользователи сохраняются.
5. Проверьте `/api/health`, главную, `Комплектующие ПК`, `Периферия`, корзину и админку.

> **Note:** Docker is not used for app deployment or updates. PM2 is the
> canonical deployment method. See
> [docs/archive/DOCKER_EVALUATION.md](docs/archive/DOCKER_EVALUATION.md)
> for the full rationale.
