#!/bin/sh
# Deploy/update the app under PM2 (no Docker — see docs/archive/DOCKER_EVALUATION.md).
set -eu
if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm не установлен. Включите его через Corepack: corepack enable pnpm"
  exit 1
fi
if [ ! -f .env ]; then
  echo "Нет .env. Скопируйте .env.example в .env и заполните настройки."
  exit 1
fi
if grep -q 'CHANGE_ME' .env; then
  echo "В .env остались значения CHANGE_ME. Сначала замените секреты и пароли."
  exit 1
fi
pnpm install --prod --frozen-lockfile
pnpm run migrate
pm2 start src/index.js --name kompmaster-api 2>/dev/null || pm2 restart kompmaster-api
pm2 save
pm2 status
