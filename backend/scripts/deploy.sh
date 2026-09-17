#!/bin/sh
# Deploy/update the app under PM2 (no Docker — see docs/archive/DOCKER_EVALUATION.md).
#
# Lives in backend/scripts/. The workspace install runs from the repo root,
# while PM2 starts with the working directory set to backend/ so that dotenv
# loads backend/.env (dotenv resolves .env relative to the process CWD).
set -eu
backend_dir=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
repo_root=$(CDPATH= cd -- "$backend_dir/.." && pwd)
cd "$backend_dir"

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

# Install only the backend's production dependencies from the workspace root.
# --ignore-scripts: the workspace root `prepare` (husky) is a devDependency and
# is not installed under --prod, so its hook setup must not run here. The
# backend has no dependencies that need install scripts.
pnpm --dir "$repo_root" install --prod --frozen-lockfile --ignore-scripts --filter kompmaster-server...
pnpm run migrate
pm2 start src/index.js --name kompmaster-api --cwd "$backend_dir" 2>/dev/null || pm2 restart kompmaster-api
pm2 save
pm2 status
