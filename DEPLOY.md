# Установка на Ubuntu VPS

## 1. DNS

У регистратора домена создайте A-запись:

- имя: `@`
- значение: IPv4 вашего VPS

При желании добавьте `www` как CNAME на основной домен.

## 2. Установка Docker

На чистом Ubuntu 24.04:

```bash
sudo apt update
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo tee /etc/apt/keyrings/docker.asc >/dev/null
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
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

- `DOMAIN`
- `JWT_SECRET`
- `POSTGRES_PASSWORD`
- пароль внутри `DATABASE_URL`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Для случайного секрета можно выполнить:

```bash
openssl rand -hex 48
```

## 5. Запуск

```bash
docker compose up -d --build
```

Проверить контейнеры:

```bash
docker compose ps
```

Логи приложения:

```bash
docker compose logs -f app
```

После того как DNS указывает на сервер, Caddy сам выпустит HTTPS-сертификат.

Проверка:

```bash
curl https://ВАШ-ДОМЕН/api/health
```

## 6. Админка

Откройте:

`https://ВАШ-ДОМЕН/#admin`

Используйте `ADMIN_EMAIL` и `ADMIN_PASSWORD` из `.env`.

После первого входа пароль можно поменять в админке.
