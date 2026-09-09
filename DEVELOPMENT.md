# DEVELOPMENT.md

Workspace setup guide for the KompMaster server. Written for autonomous agents
and junior developers: follow it top to bottom and you will have a running
local environment.

## Overview

KompMaster is a Node.js/Express backend that serves a REST API and the static
storefront (`public/index.html`). It talks to PostgreSQL for data and an
S3-compatible store for photos. The active entry point is `src/index.js`
(see [Entry points](#entry-points)).

## Prerequisites

| Tool           | Version / notes                                                    |
| -------------- | ------------------------------------------------------------------ |
| Node.js        | 20 LTS or newer (any 20+ works; the repo runs on Node 22 in Docker) |
| npm            | ships with Node                                                    |
| PostgreSQL     | 16 (see `docker-compose.yml`)                                      |
| S3-compatible  | MinIO (via Docker), or Selectel Object Storage / Cloudflare R2      |
| Docker         | optional — for `docker compose`-managed Postgres and MinIO          |

## Getting started

### 1. Clone and install

```bash
git clone git@github.com:Dahgoth/kompmaster-server.git
cd kompmaster-server
npm install
```

`npm install` also runs the `prepare` script, which installs the Husky hooks
(commit-msg and pre-push).

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in the required variables. See [`ENVIRONMENT.md`](ENVIRONMENT.md) for the
full list and per-variable guidance. At minimum you need `DATABASE_URL` and
`JWT_SECRET`; the app warns (and in production throws) if secrets are missing.

### 3. Start the database

Either use the bundled Docker services:

```bash
docker compose up -d postgres minio
```

or point `DATABASE_URL` at an existing PostgreSQL instance and set the `S3_*`
variables to an existing bucket.

### 4. Apply the schema

```bash
npm run migrate
```

The migration runner applies `migrations/*.sql` in order and records applied
files in `schema_migrations`, so re-runs are safe.

### 5. Run and verify

```bash
npm run dev      # watch mode
# or
npm start        # plain run
```

The active entry point listens on `PORT` (default `4000`). Verify with:

```bash
curl http://localhost:4000/api/health
# {"ok":true,"time":"..."}
```

## Common commands

| Command                 | Description                                      |
| ----------------------- | ------------------------------------------------ |
| `npm start`             | Run the server                                   |
| `npm run dev`           | Run with file watching                           |
| `npm run migrate`       | Apply pending `migrations/*.sql`                 |
| `npm run lint:commit`   | Validate the most recent commit message          |
| `docker compose up -d postgres minio` | Start local Postgres + MinIO        |

## Entry points

There are two server implementations in `src/`, and they are **not** identical:

| File             | Module style | Run via             | Notes                                   |
| ---------------- | ------------ | ------------------- | --------------------------------------- |
| `src/index.js`   | CommonJS     | `npm start` / `npm run dev` | **Active.** Modular: `routes/`, `utils/`, `middleware/`, `config.js`. |
| `src/server.js`  | ESM          | `Dockerfile` (`node src/server.js`) | Legacy monolith; references helpers not present in the current `db.js`. |

Treat `src/index.js` as the source of truth. If you touch one entry point,
verify you do not need the same change in the other, and flag the discrepancy
in your pull request. (`ENVIRONMENT.md` documents the env-var differences
between the two.)

## Docker-based setup

`docker-compose.yml` provides PostgreSQL 16 (`postgres`) and MinIO (`minio`)
with local volumes:

- Postgres: `localhost:5432`, user/db `kompmaster`, password `kompmaster`
  (dev-only defaults — change before any real deployment).
- MinIO: S3 API on `localhost:9000`, web console on `localhost:9001`.

To run the app itself under Docker, see `DEPLOY.md` and `UPDATE.md` (the
`Dockerfile`/`Caddyfile` path targets the legacy `src/server.js` entry).

## Git workflow

Never commit to `main` directly. Create a feature branch and open a pull
request; see [`CONTRIBUTING.md`](CONTRIBUTING.md) for the full process and
commit conventions.

## Database schema changes

1. Add a new `migrations/NNN_*.sql` file (increment `NNN`; existing files are
   immutable).
2. Run `npm run migrate` to apply it.
3. Mention the migration in your pull request and in `CHANGELOG.md` when the
   change is user-facing.

## Troubleshooting

### `node --check` / startup fails with missing module

Make sure you ran `npm install`. If a module still cannot be resolved, you may
be running the legacy `src/server.js` entry — switch to `npm start`.

### `JWT_SECRET` not set

In development the app falls back to a dev-only secret and warns. In
production it refuses to start. Set `JWT_SECRET` in `.env`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Database connection refused

Check the container is up:

```bash
docker compose ps
docker compose logs postgres
```

Confirm `DATABASE_URL` matches the credentials in `docker-compose.yml`
(`postgres://kompmaster:kompmaster@localhost:5432/kompmaster` by default).

### Port already in use

The active entry point uses `PORT` (default `4000`). Set `PORT` in `.env` to
change it. Note the Docker/Caddy path uses port `3000`.

### Migration fails partway

Each migration runs in its own transaction; a failed migration rolls back and
is not recorded. Fix the SQL and re-run `npm run migrate`.
