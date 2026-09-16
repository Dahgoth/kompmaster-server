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
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs postgresql postgresql-contrib
```

## 3. Загрузка проекта

```bash
sudo mkdir -p /opt/compmaster
sudo chown $USER:$USER /opt/compmaster
cd /opt/compmaster
```

Распакуйте сюда содержимое архива проекта.

## 4. Настройки

```bash
cp .env.example .env
nano .env
```

Обязательно замените:

- `FRONTEND_ORIGIN` (разрешённые источники магазина: `https://compmasone.ru,https://www.compmasone.ru`)
- `JWT_SECRET`
- `DATABASE_URL` (пароль совпадает с `POSTGRES_PASSWORD`)
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` (бутстрап админа, см. `scripts/reset-admin.js`)

Для случайного секрета можно выполнить:

```bash
openssl rand -hex 48
```

## 5. Запуск

```bash
sudo npm install -g pm2
pm2 start src/index.js --name kompmaster-api
pm2 save
pm2 startup   # выполните команду, которую он покажет — автозапуск после перезагрузки сервера
```

Проверить контейнеры (PostgreSQL):

```bash
pg_isready
```

Логи приложения:

```bash
pm2 logs kompmaster-api
```

После того как DNS указывает на сервер, Caddy сам выпустит HTTPS-сертификат.

Проверка:

```bash
curl https://ВАШ-ДОМЕН/api/health
```

## 6. Админка

Откройте:

`https://www.compmasone.ru/admin`

Используйте `ADMIN_EMAIL` и `ADMIN_PASSWORD` из `.env`.

После первого входа пароль можно поменять в админке.

> **Note:** Docker is not used for app deployment. Docker Compose is only
> used locally for PostgreSQL + MinIO development databases. See
> [docs/archive/DOCKER_EVALUATION.md](docs/archive/DOCKER_EVALUATION.md)
> for the full rationale.
