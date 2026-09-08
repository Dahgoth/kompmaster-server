#!/bin/sh
set -eu
if [ ! -f .env ]; then
  echo "Нет .env. Скопируйте .env.example в .env и заполните настройки."
  exit 1
fi
if grep -q 'CHANGE_ME' .env; then
  echo "В .env остались значения CHANGE_ME. Сначала замените секреты и пароли."
  exit 1
fi
docker compose up -d --build
docker compose ps
