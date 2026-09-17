# Как обновлять сайт после запуска

Данные отделены от кода: PostgreSQL и загруженные файлы находятся
на диске VPS. Поэтому обычное обновление кода не удаляет пользователей и заказы.

Перед каждым обновлением:

```bash
cd /opt/compmaster
set -a
. ./backend/.env
set +a
mkdir -p backend/backups
pg_dump -U kompmaster kompmaster | gzip > "backend/backups/db-$(date +%Y%m%d-%H%M%S).sql.gz"
```

Затем замените файлы проекта новой версией, **не удаляя `backend/.env`**, и выполните:

```bash
pnpm install --prod --frozen-lockfile --ignore-scripts --filter kompmaster-server...
pnpm run migrate
pm2 restart kompmaster-api
```

Можно использовать канонический сценарий `backend/scripts/deploy.sh`: он выполняет
workspace install с `--filter`, миграции и запускает API в PM2 с
`--cwd /opt/compmaster/backend`. Резервное копирование выполняет
`backend/scripts/backup.sh`; архивы сохраняются в `backend/backups/`.

Проверка:

```bash
curl https://ВАШ-ДОМЕН/api/health
pm2 status
```

Если обновление сломало, верните предыдущую версию кода и снова выполните
`pm2 restart kompmaster-api`. База данных при этом остаётся на месте.

Важное правило: всегда делайте backup БД перед обновлением. Перед обновлением
production-пары выполните `pnpm run version:check`; при изменении корневой
версии выполните `pnpm run version:sync`. Backend и витрина развёртываются из
одного tag/commit.


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
