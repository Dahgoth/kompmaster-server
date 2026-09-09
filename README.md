# КомпМастер — сервер (backend)

Node.js/Express + PostgreSQL + S3-совместимое хранилище фото. Реализует
основной функционал из ТЗ: пользователи и роли (user/manager/admin),
подтверждение телефона по SMS, восстановление пароля по e-mail, каталог
и импорт/экспорт прайсов, заказы с атомарным списанием остатка,
модерация отзывов, Telegram-уведомления, идемпотентный вебхук оплаты.

## Что уже сделано, а что нужно доподключить

**Готово и работает по коду:**
- Регистрация/вход, JWT, роли, второй пароль входа в саму админ-панель
- SMS-код подтверждения телефона (с лимитами на отправку/попытки)
- Восстановление пароля по e-mail (одноразовая ссылка на 1 час)
- Каталог, товары, история цены
- Импорт прайса (xlsx/xls/csv/tsv) с автоопределением столбцов, экспорт остатков в CSV
- Заказы: атомарное списание остатка (блокировка строки в транзакции — гонки при параллельных заказах исключены), статусы, отмена с возвратом остатка
- Идемпотентный приём вебхука оплаты
- Отзывы с модерацией (клиент → на проверке → админ одобряет)
- Выдача ролей admin/manager по e-mail через `/api/users/:id/role`
- Rate limiting на вход/регистрацию/SMS/восстановление пароля
- Telegram-уведомления админу (новый заказ, оплата, новый отзыв)
- Загрузка изображений в S3-совместимое хранилище

**Нужно donастроить конкретными ключами/сервисами (адаптеры уже написаны, но без реальных ключей будут работать в режиме "просто вывести в консоль"):**
- Платёжный провайдер (ЮKassa/CloudPayments) — сам приём оплаты и его виджет на фронте нужно подключить отдельно по документации провайдера; сервер уже готов принять от него вебхук на `/api/orders/payment-webhook`, включая фискализацию чека (54-ФЗ) — это делает сам провайдер при правильной настройке личного кабинета.
- Image Search Service (автопоиск фото по Icecat/API поиска картинок) — в этой версии не реализован; структура БД (`image_search_cache`) под него уже заложена в миграции, чтобы не переделывать схему при добавлении.
- Реальный текст политики конфиденциальности и публичной оферты — сейчас нигде не хранится как отдельный контент, добавьте страницы на фронте.

## 1. Установка на сервере (Ubuntu, чистый VPS)

```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Создать базу и пользователя
sudo -u postgres psql -c "CREATE USER kompmaster WITH PASSWORD 'придумайте_пароль';"
sudo -u postgres psql -c "CREATE DATABASE kompmaster OWNER kompmaster;"
```

Для S3-хранилища фото — либо купите Selectel Object Storage / Cloudflare R2
(дадут endpoint, access key, secret key сразу), либо поднимите MinIO на
этом же сервере:

```bash
# Быстрый вариант через Docker (нужен docker + docker-compose):
docker compose up -d postgres minio
```

## 2. Настройка проекта

```bash
# Распакуйте архив с кодом на сервере, затем:
cd kompmaster-server
npm install

cp .env.example .env
nano .env   # заполните DATABASE_URL, JWT_SECRET, S3_*, SMTP_*, SMS_*, TELEGRAM_*
```

Обязательно смените:
- `JWT_SECRET` — длинная случайная строка:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- `ADMIN_PANEL_PASSWORD` — код входа в саму админку (было "5252" в бете, смените на боевой).

## 3. Применить схему базы данных

```bash
npm run migrate
```
Выведет что-то вроде `[migrate] применяю 001_init.sql... готово`. Повторный
запуск безопасен — уже применённые миграции пропускаются.

## 4. (Опционально) Перенос данных из старой HTML-беты

См. подробную инструкцию прямо в файле `src/importFromBeta.js` — коротко:
откройте старый сайт в браузере, выполните команду в консоли (F12),
сохраните результат в `export.json`, затем:

```bash
node src/importFromBeta.js export.json
```

Пользователей и пароли этот скрипт намеренно не переносит — старые пароли
захешированы способом, который не годится для сервера. Существующие
клиенты один раз пройдут "Забыли пароль" на новом сайте.

## 5. Первый администратор

Сразу после установки ролей ни у кого нет — зарегистрируйте обычный
аккаунт через сайт (`/api/auth/register`), а затем вручную выдайте ему
роль `admin` прямо в базе (единственный раз, дальше это уже делается
через админку):

```bash
sudo -u postgres psql -d kompmaster -c \
  "UPDATE users SET role='admin' WHERE login='ваша_почта@example.com';"
```

## 6. Запуск

Для проверки:
```bash
npm start
```
Откройте `http://ваш-сервер:4000/api/health` — должно вернуть `{"ok":true,...}`.

### Постоянная работа (production) — через PM2

```bash
sudo npm install -g pm2
pm2 start src/index.js --name kompmaster-api
pm2 save
pm2 startup   # выполните команду, которую он покажет — автозапуск после перезагрузки сервера
```

### Nginx как обратный прокси + HTTPS

```nginx
server {
    listen 80;
    server_name api.ваш-домен.ru;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
Затем бесплатный SSL-сертификат:
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.ваш-домен.ru
```

## 7. Резервные копии (обязательно перед боевым запуском)

Простейший вариант — ежедневный дамп базы через cron:
```bash
# crontab -e
0 3 * * * pg_dump -U kompmaster kompmaster | gzip > /backups/kompmaster_$(date +\%F).sql.gz
```
Фото уже лежат в S3-хранилище — у большинства провайдеров (Selectel, R2)
есть встроенное резервирование, отдельно бэкапить обычно не нужно, но
уточните у конкретного провайдера.

## Структура API (основные эндпоинты)

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/phone/request           { phone }
POST   /api/auth/phone/confirm           { phone, code }
POST   /api/auth/forgot-password         { email }
POST   /api/auth/reset-password          { token, newPassword }
POST   /api/auth/admin-panel/verify      { password }   → adminPanelToken

GET    /api/categories
GET    /api/products?category=&search=&page=
POST   /api/products/import-price        (multipart: file, categoryId, mode, dryRun)
GET    /api/products/export-price/:categoryId

POST   /api/orders                       { items, receiveMethod, address, contactPhone }
GET    /api/orders/my
GET    /api/orders            (admin/manager)
PUT    /api/orders/:id/status (admin/manager)
POST   /api/orders/:id/cancel (admin/manager)
POST   /api/orders/payment-webhook

GET    /api/reviews/product/:productId
POST   /api/reviews/product/:productId
GET    /api/reviews/pending   (admin)
PUT    /api/reviews/:id/approve (admin)

GET    /api/users             (admin)
PUT    /api/users/:id/role    (admin)

POST   /api/uploads/:folder   (admin, multipart: file)
```

Все `admin`/`manager` эндпоинты дополнительно требуют заголовок
`X-Admin-Panel-Token`, полученный через `/api/auth/admin-panel/verify` —
это и есть "второй пароль входа в саму админку" из исходного ТЗ.

## Лицензия

Проект распространяется под GNU Affero General Public License v3 — полный
текст в файле `LICENSE`. Не добавляйте код под несовместимой лицензией и
никогда не коммитьте секреты, ключи, `.env` или содержимое `uploads/`.

## Разработка и правила коммитов

- **Не коммитьте напрямую в `main`.** Любое изменение — через ветку и
  pull request. Прямой `git push` в `main` блокируется локальным Husky-хуком
  `pre-push`; на GitHub можно дополнительно включить защиту ветки (для
  приватного репозитория это требует GitHub Pro).
- **Conventional Commits обязательны**: `<type>(scope): описание`.
  Типы: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
  `build`, `ci`, `chore`, `revert`. Сообщения проверяются commitlint через
  Husky (`commit-msg` hook) — невалидный коммит будет отклонён при коммите.
- **SemVer**: версия релиза хранится только в `package.json#version`.
- **Keep a Changelog**: каждое пользовательское изменение фиксируется в
  `CHANGELOG.md`; ещё не вышедшие изменения — в разделе `[Unreleased]`.

Полные правила для AI-агентов и контрибьюторов — в `AGENTS.md`. Проверить
последний коммит вручную: `npm run lint:commit`.

## Важное честное примечание

Этот код был написан и синтаксически проверен (`node --check` на каждом
файле) без доступа к интернету — то есть **фактический прогон с реальной
базой данных, S3 и живым npm install ещё не выполнялся**. Первым делом
после разворачивания на сервере пройдите руками сценарий: регистрация →
подтверждение телефона → вход → добавление товара → импорт прайса →
оформление заказа → смена статуса → отзыв → его модерация. Если где-то
всплывёт ошибка — это нормально для первого прогона нового кода, пишите
мне, разберём.
