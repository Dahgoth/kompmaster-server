# Docker Evaluation — 2026-09-16

> **Status update (2026-09-16, after PRs #15, #16):** The `Dockerfile` has been
> **deleted** and `src/server.js` has been **moved to `docs/legacy/server.js`**
> (preserved for the non-blocking legacy audit per ADR 001, removed from the
> active code tree to stop confusing agents — a frontend dev agent was still
> trying to use it). Retained in the repo: `docker-compose.yml` (local PostgreSQL +
> MinIO dev databases only) and the host-based `Caddyfile` (`127.0.0.1:4000`, TLS for
> `compmasone.ru`). This document is the historical decision record; references
> below describe the file locations at the time of evaluation.

## Executive Summary
