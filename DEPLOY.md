# Установка на Ubuntu VPS

## 1. DNS

DNS создается автоматически через Terraform (`terraform/`) — см.
[terraform/README.md](terraform/README.md). Итоговая топология (dual-stack):

| Имя | Тип | Значение | Назначение |
| --- | --- | --- | --- |
| `@` | A | IPv4 VPS (floating IP) | 301-редирект на `www` (Caddy) |
| `@` | AAAA | IPv6 VPS (native) | 301-редирект на `www` (Caddy) |
| `www` | CNAME | CDN target / `s3.timeweb.com` | Статический фронтенд (S3-сайт + SSL) |
| `api` | A | IPv4 VPS (floating IP) | API (Caddy → 127.0.0.1:PORT) |
| `api` | AAAA | IPv6 VPS (native) | API (Caddy → 127.0.0.1:PORT) |
| `assets` | CNAME | CDN target / `s3.timeweb.com` | Медиа-бакет (фото товаров) |

Канонический адрес магазина — `https://www.compmasone.ru` (Timeweb DNS не
позволяет CNAME на апексе, поэтому апекс редиректит на `www`).

> **Note on dual-stack**: VPS в St. Petersburg (spb-3) получает нативный IPv6.
> IPv4 добавляется через Terraform-managed floating IP (`twc_floating_ip`),
> привязанный к серверу. Это даёт A + AAAA записи для апекса и `api`.
> Caddy слушает на `[::]:4000` и `0.0.0.0:4000`.

> **Note on CDN**: Timeweb требует CDN-ресурс для custom domains на S3 website
> hosting. После создания CDN в панели, задайте `frontend_cdn_enabled = true`,
> `frontend_cdn_cname`, `media_cdn_enabled = true`, `media_cdn_cname` в
> `terraform.tfvars` и выполните `terraform apply`. Terraform управляет CNAME
> записями — не редактируйте их в панели вручную.

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
> used locally for PostgreSQL + MinIO development databases (MinIO image is
> pinned to `quay.io/minio/minio:RELEASE.2025-09-07T16-13-09Z` — MinIO removed
> its Docker Hub organization, so the Hub tag no longer resolves; validated in
> CI by the `compose` job). See
> [docs/archive/DOCKER_EVALUATION.md](docs/archive/DOCKER_EVALUATION.md)
> for the full rationale.

## 7. Операционные уроки (опыт развёртывания 2026-09-21)

**Инфраструктура:**
- Timeweb MSK-50 в Москве (ru-1/msk-1) создаёт серверы в зоне ru-3 (только IPv6).
  Для dual-stack используйте зону St. Petersburg (spb-3) — нативный IPv6 +
  Terraform-managed floating IPv4 через `twc_floating_ip`.
- Floating IP переносим, выживает при пересоздании сервера, даёт dual-stack DNS.
- S3 bucket subdomains (`www`, `assets`) требуют CNAME propagation к S3 сервису
  (5–30 мин). `twc_s3_bucket_subdomain` падает с `empty_cname` до завершения.
- Timeweb панель требует CDN для custom domains на S3 website hosting.
  После создания CDN в панели, включите в `terraform.tfvars`:
  `frontend_cdn_enabled`, `frontend_cdn_cname`, `media_cdn_enabled`, `media_cdn_cname`.

**VPS bootstrap:**
- Сервер может стать недоступным после смены IP (floating IP attach).
  Ребут через Timeweb API или панель, если SSH/API таймаут.
- Caddy авто-выпускает Let's Encrypt для apex и api за ~30 сек при валидном DNS.
- PM2 `startup` нужно выполнить + запустить выданную `systemctl enable` команду.
- Advisory lock в `migrate.js` требует `hashtext('...')::bigint` cast для `pg_advisory_lock`.

**Секреты и доступы:**
- S3 secret keys НЕ возвращаются Terraform output после создания — получать в панели:
  S3 → bucket → Access keys.
- SSH ключ генерировать локально (`ssh-keygen -t ed25519`), публичный — в Timeweb
  панель → SSH keys, числовой ID → `ssh_keys_ids` в `terraform.tfvars`.
- Все секреты в `terraform/secrets/` — gitignored; синхронизируйте worktree ↔ main repo вручную.

**Фронтенд:**
- Сборка с `VITE_API_BASE=https://api.compmasone.ru/api` (запекается при билде).
- Деплой через `aws --endpoint-url https://s3.twcstorage.ru s3 sync` в frontend bucket.
- После каждого деплоя — purge CDN кэша (панель или API).

**Бэкап:**
- Offsite зашифрованный `pg_dump` в dedicated backup bucket — основной recovery control (ADR-005).
- Скрипт бэкапа ре-ассертит S3 versioning каждый запуск; включите в панели если API фейлит.
- Тестируйте восстановление ежеквартально — drill is the control, not the archive.
