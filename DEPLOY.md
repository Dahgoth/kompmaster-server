# Установка на Ubuntu VPS

## 1. DNS

DNS создается автоматически через Terraform (`terraform/`) — см.
[terraform/README.md](terraform/README.md). Итоговая топология:

| Имя | Тип | Значение | Назначение |
| --- | --- | --- | --- |
| `@` | A | IPv4 VPS | 301-редирект на `www` (Caddy) |
| `www` | CNAME | `s3.timeweb.com` | Статический фронтенд (S3-сайт + SSL) |
| `api` | A | IPv4 VPS | API (Caddy → 127.0.0.1:PORT) |
| `assets` | CNAME | `s3.timeweb.com` | Медиа-бакет (фото товаров) |

Канонический адрес магазина — `https://www.compmasone.ru` (Timeweb DNS не
позволяет CNAME на апексе, поэтому апекс редиректит на `www`).

## 2. Установка сервера

На чистом Ubuntu 24.04:

```bash
sudo apt update
sudo apt install -y ca-certificates curl
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs postgresql postgresql-contrib

# pnpm идёт с Node через Corepack — включаем закреплённую версию
sudo corepack enable pnpm
pnpm --version
```

## 3. Загрузка проекта

```bash
sudo mkdir -p /opt/compmaster
sudo chown $USER:$USER /opt/compmaster
cd /opt/compmaster
```

Распакуйте содержимое архива в `/opt/compmaster`: это корень pnpm-workspace,
backend находится в `/opt/compmaster/backend`, storefront — в
`/opt/compmaster/frontend`.

## 4. Настройки

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

Обязательно замените:

- `FRONTEND_ORIGIN` (разрешённые источники магазина; **первый** — канонический,
  используется в ссылках восстановления пароля: `https://www.compmasone.ru,https://compmasone.ru`)
- `JWT_SECRET`
- `DATABASE_URL` (пароль совпадает с `POSTGRES_PASSWORD`)
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` (бутстрап админа; применяется миграциями
  через `pnpm run migrate`, см. `DEVELOPMENT.md`)

Для случайного секрета можно выполнить:

```bash
openssl rand -hex 48
```

## 5. Запуск

Установка и запуск API выполняются из корня workspace. Для production-зависимостей
backend:

```bash
pnpm install --prod --frozen-lockfile --ignore-scripts --filter kompmaster-server...
pnpm run migrate

sudo npm install -g pm2
pm2 start src/index.js --name kompmaster-api --cwd /opt/compmaster/backend
pm2 save
pm2 startup   # выполните команду, которую он покажет — автозапуск после перезагрузки сервера
```

`backend/scripts/deploy.sh` выполняет ту же последовательность: workspace install
с `--filter kompmaster-server...`, миграции и PM2 с `--cwd /opt/compmaster/backend`.

Перед релизом или деплоем проверьте общую версию: `package.json#version` в корне —
единый источник истины, `pnpm run version:check` проверяет backend и frontend,
а `pnpm run version:sync` синхронизирует их манифесты. Backend и витрина
развёртываются из одного tag/commit.

Проверить контейнеры (PostgreSQL):

```bash
pg_isready
```

Логи приложения:

```bash
pm2 logs kompmaster-api
```

После того как DNS указывает на сервер, Caddy сам выпустит HTTPS-сертификат.

### Caddy: переменные окружения

`Caddyfile` использует `{$DOMAIN}` и `{$PORT}` (с дефолтами PoC:
`compmasone.ru`, `4000`). Пакет Caddy для Debian/Ubuntu читает
`/etc/default/caddy`, поэтому задайте переменные там:

```bash
sudo apt-get install -y caddy
sudo cp Caddyfile /etc/caddy/Caddyfile
printf 'DOMAIN=compmasone.ru\nPORT=4000\n' | sudo tee -a /etc/default/caddy
sudo systemctl restart caddy
sudo systemctl status caddy --no-pager
```

Caddy обслуживает два хоста: `compmasone.ru` (301 → `https://www.compmasone.ru`)
и `api.compmasone.ru` (reverse_proxy на `127.0.0.1:4000`). Статический
фронтенд отдаётся S3/CDN, не Caddy (см. `terraform/README.md`).

Проверка:

```bash
curl https://api.compmasone.ru/api/health
curl -I https://compmasone.ru        # 301 → https://www.compmasone.ru
```

## 6. Админка

Откройте:

`https://www.compmasone.ru/admin`

Используйте `ADMIN_EMAIL` и `ADMIN_PASSWORD` из `backend/.env`.

После первого входа пароль можно поменять в админке.

> **Note:** Docker is not used for app deployment. Docker Compose is only
> used locally for PostgreSQL + MinIO development databases. See
> [docs/archive/DOCKER_EVALUATION.md](docs/archive/DOCKER_EVALUATION.md)
> for the full rationale.
