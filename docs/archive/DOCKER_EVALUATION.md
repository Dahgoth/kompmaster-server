# Docker Evaluation — 2026-09-16

> **Status update (2026-09-16, after PR #15):** The `Dockerfile` has since been
> **removed from the repository** entirely (Option A implemented to completion —
> a dead root-level Dockerfile confused agents more than an archived doc could
> explain). Retained in the repo: `docker-compose.yml` (local PostgreSQL + MinIO
> dev databases only) and the host-based `Caddyfile` (`127.0.0.1:4000`, TLS for
> `compmasone.ru`). This document is the historical decision record; references
> to the Dockerfile below describe the removed file.

## Executive Summary

**Recommendation: Archive the Docker app deployment path entirely. Keep Docker only for local dev databases (PostgreSQL + MinIO).**

Docker as a production app deployment mechanism is dead in this codebase: the `Dockerfile` targets a broken entry point, exposes the wrong port, and is contradicted by every current deployment document. Docker as a local dev tool for PostgreSQL and MinIO is alive, useful, and well-documented. The two should be separated — archive one, keep the other.

---

## What Docker Currently Covers

| Artifact | Purpose | Status |
|---|---|---|
| `Dockerfile` | Build & run the app container | **BROKEN** — targets dead `src/server.js`, port 3000 |
| `docker-compose.yml` | Orchestrate PostgreSQL + MinIO | **WORKS** — dev/demo databases |
| `Caddyfile` | Reverse proxy (`app:3000`) | **Orphaned** — references Docker network + dead port |
| `DEPLOY.md` | Production deployment via Docker | **STALE** — references dead Dockerfile path |
| `UPDATE.md` | Update procedure via Docker | **STALE** — assumes Docker app deployment |
| `INSTALL_FIRST.txt` | Quick start via Docker Compose | **PARTIALLY STALE** — Docker for DB only would work |
| `DEVELOPMENT.md` | Dev setup via `docker compose up -d postgres minio` | **WORKS** — DB only, correct |
| `README.md` §1 | `docker compose up -d postgres minio` | **WORKS** — DB only, correct |

---

## The Broken Docker App Path (Archive This)

### Evidence

1. **`Dockerfile:5`** — `CMD ["node","src/server.js"]` targets `src/server.js`, which ADR 001 (§1, line 40) classifies as **"Legacy fossil — cannot boot"** (ESM under CommonJS → `SyntaxError: Cannot use import outside a module`).

2. **`Dockerfile:7`** — `EXPOSE 3000` while the active entry point (`src/index.js`) listens on port 4000 (`PORT` env, default 4000 per `src/config.js` and `README.md`). ADR 001 §5 explicitly demands: "Dockerfile/Caddyfile/README/DEVELOPMENT.md/DEPLOY.md must read PORT from env ... no hardcoded EXPOSE."

3. **`Caddyfile:3`** — `reverse_proxy app:3000` assumes a Docker network hostname `app` on port 3000, which doesn't match the canonical deployment (Timeweb VPS + Caddy on the same host).

4. **`DEPLOY.md`** instructs `docker compose up -d --build` for production, but the Dockerfile doesn't produce a working container. Following DEPLOY.md today results in a crash.

5. **`UPDATE.md`** describes volume-based persistence and update procedures for a Docker app deployment that cannot run.

6. **The research doc** (`docs/research/2026-09-15-poc-architecture-hosting.md`, line 44) explicitly acknowledges the problem: *"Dockerfile: update CMD/EXPOSE to canonical (or skip Docker for PoC, use PM2 per README §5)"* — and chose **skip Docker**.

7. **Confirmed 2026-09-16 decisions** (ADR 002 amendment) list Timeweb MSK-50 via Terraform as the hosting path. No Docker mentioned. PM2 is the documented production path (README §5).

### Root Cause

The Docker app path was created during early development when `src/server.js` was the intended entry. Once the canonical `src/index.js` was built and ADR 001 declared `src/server.js` inspiration-only, the Dockerfile became a dead artifact that nobody updated because the documented production path moved to PM2.

---

## The Working Docker DB Path (Keep This)

`docker-compose.yml` for PostgreSQL 16 + MinIO is:

- **Functional**: correct images, correct ports, correct credentials for local dev
- **Documented**: DEVELOPMENT.md §3 and README §1 both reference it
- **Expected by developers**: `DEVELOPMENT.md` lists Docker as a prerequisite tool
- **Cheap to maintain**: static YAML, no code coupling

This is the only part of Docker that is actively useful today.

---

## Pros / Cons / Tradeoffs

### Option A: Archive Docker App Path, Keep Docker DB Only

| Aspect | Assessment |
|---|---|
| **Complexity** | Reduces repo surface: remove 4 artifacts (Dockerfile, Caddyfile, stale DEPLOY.md, stale UPDATE.md). Keep 1 artifact (docker-compose.yml for DB). |
| **Consistency** | Eliminates the contradiction where README says "PM2 for prod" but DEPLOY.md says "Docker for prod". One deployment story. |
| **Maintenance burden** | Zero — the Docker app path requires fixes (wrong entry, wrong port, Caddy network) that are non-trivial (would need to rebuild for `src/index.js`, set PORT env, adjust Caddy). |
| **Onboarding** | Cleaner: agents/new devs follow README → npm install → npm start (or PM2 for prod). No confusion about which Docker path is canonical. |
| **Risk** | Low — PM2 deployment is documented in README §5 and works today. Removing stale docs prevents confusion. |
| **Dev experience** | Unchanged — `docker compose up -d postgres minio` still works for local DB + storage. |

### Option B: Fix Docker App Path (make it work)

| Aspect | Assessment |
|---|---|
| **Effort** | Moderate: rewrite Dockerfile (`COPY package*.json`, `npm install --omit=dev`, `COPY . .`, `EXPOSE $PORT`, `CMD ["node","src/index.js"]`), update Caddyfile for host-based reverse proxy, rewrite DEPLOY.md and UPDATE.md for the new shape. |
| **Benefit** | Production-grade container deployment; easier CI/CD; consistent dev/prod environment. |
| **Risk** | The PoC is a 3–6 month single-VPS deployment on Timeweb. Docker adds operational complexity (Docker daemon, volume management, networking) that PM2 doesn't require for this scale. |
| **Conflict** | ADR 001 §5 says Dockerfile must use env-driven PORT, but the confirmed PoC plan (ADR 002 amendment, 2026-09-16) uses PM2 on a single VPS — Docker would be unrequested overhead. |
| **When justified** | Only if the project scales to multi-server or adopts Kubernetes — which is post-PoC (ADR 001 §11.5, step 3+). |

### Option C: Keep Everything As-Is

| Aspect | Assessment |
|---|---|
| **Risk** | High — stale docs mislead anyone following DEPLOY.md; broken Dockerfile misleads anyone trying to build the image; Caddyfile implies a Docker deployment that doesn't work. |
| **Maintenance** | Growing — every new doc update must remember to correct the Docker path separately, doubling effort. |
| **Verdict** | Rejected — the contradiction is already causing confusion (DEVELOPMENT.md says "legacy `src/server.js` entry" at line 99 while DEPLOY.md says "deploy via Docker"). |

---

## Decision Matrix

| Criterion | A (Archive app Docker) | B (Fix app Docker) | C (Keep as-is) |
|---|---|---|---|
| Correctness | ✅ Eliminates broken path | ✅ Fixes it | ❌ Broken |
| Minimal complexity | ✅ Fewest artifacts | ⚠️ More to maintain | ❌ Contradictory |
| Aligns with ADR 001 | ✅ §5 env-driven port still true (PM2) | ⚠️ Only if Dockerfile updated | ❌ Hardcoded port remains |
| Aligns with PoC plan | ✅ PM2 on Timeweb VPS | ⚠️ Docker unrequested for PoC | ❌ Stale |
| Zero deployment risk | ✅ PM2 already works | ⚠️ Migration effort | ❌ Misleads users |
| **Verdict** | **Recommended** | Only if HA/multi-server needed | **Rejected** |

---

## Action Items (If Option A Accepted)

### Archive (delete or move to `docs/archive/`)
1. **`Dockerfile`** — The app never builds via Docker. If historical record needed, move to `docs/archive/Dockerfile.legacy` explaining it targeted the dead `src/server.js`.
2. **`Caddyfile`** — Orphaned Docker-network proxy config. Replace with a working host-based Caddy config inline in DEPLOY.md (the README §5 nginx config is the canonical pattern; Caddy is a drop-in alternative already documented in research docs).
3. **`DEPLOY.md`** — Rewrite: PM2 + Nginx/Caddy per README §5–§6. Remove Docker build/run steps. Or archive entirely and update README §1 to be the canonical deploy guide.
4. **`UPDATE.md`** — Rewrite for PM2 + file-based deployment on Timeweb VPS. Or fold into DEPLOY.md.

### Keep (active)
5. **`docker-compose.yml`** — No changes needed. Used for local Postgres + MinIO.
6. **DEVELOPMENT.md §3 & README §1** — Keep `docker compose up -d postgres minio` for dev databases.

### Fix (if keeping Caddy as alternative to Nginx)
7. **Add a host-based Caddyfile** in README or DEPLOY.md:
   ```
   {$DOMAIN} {
     encode zstd gzip
     reverse_proxy 127.0.0.1:4000
   }
   ```
   This replaces the Docker-network Caddyfile and aligns with PM2 deployment (port 4000).

---

## Relationship to ADR Decisions

| ADR | Relevance |
|---|---|
| ADR 001 §5 | Requires env-driven PORT — PM2 deployment satisfies this. Docker app path was the only remaining violation. |
| ADR 001 §1a (pure C) | Backend serves only `/api/*`, no static files — Docker for the app adds no value since the app doesn't serve frontend. |
| ADR 002 amendment (2026-09-16) | Confirmed: Timeweb MSK-50 + Terraform + PM2. Docker for app not mentioned. |
| Research doc (2026-09-15) | Explicitly chose "skip Docker for PoC, use PM2" for app deployment. |
| Repository split analysis | Docker adds no benefit to the 1-repo PoC structure. |

---

## Summary

Docker served its purpose as a development convenience for managing PostgreSQL and MinIO. The app-level Docker path (Dockerfile + Caddyfile + DEPLOY.md + UPDATE.md) is broken, contradicts the canonical deployment (PM2 on a VPS), and targets dead code. The PoC plan, ADR decisions, and all recent documentation point to PM2 + Nginx/Caddy on a single Timeweb VPS.

**Keep** `docker-compose.yml` for local dev databases.
**Archive** `Dockerfile`, `Caddyfile` (Docker-network variant), `DEPLOY.md`, and `UPDATE.md` — or rewrite them to reflect PM2 deployment.
