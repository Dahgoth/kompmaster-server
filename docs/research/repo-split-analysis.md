## Repo split: 1 vs 2 vs 3 repos

Options for pure C architecture (`src/index.js` API-only + static FE on CDN + Terraform infra):

| Structure | Pros | Cons | Best for |
|---|---|---|---|
| **1 repo (`kompmaster-server`)** — monorepo: `/src` (API), `/terraform` (Timeweb), `/frontend` (when rebuilt), `/docs` (ADR/research) | Fastest PoC: one `git clone`, one `npm install`, one `docker-compose up`, one `terraform apply`. Shared `.env.example`, single PR review. Easy for small team (≤3 people). | Mixed concerns over time; Terraform state in same repo; FE build artifacts pollute repo; harder to split deploy permissions. | **PoC / 3–6 mo** — chosen for launch speed. |
| **2 repos (`server` + `frontend`)** — backend (API + DB + Terraform infra) separate; FE separate static repo | Clean boundary: API contract clearly separated from FE; FE can deploy independently to CDN; backend PRs don't include FE build artifacts; Terraform stays with backend. | More overhead: two `.env` files, two CI pipelines, cross-repo version tracking for API contract changes (e.g., endpoint rename needs both repos updated). | **Post-PoC scale-up** — if FE grows complex or team splits (backend vs design). |
| **3 repos (`server` + `frontend` + `infra`)** — Terraform in its own repo; backend; FE | Full separation of concerns: infra state isolated; backend and FE deploy independently; security boundaries clear (Terraform credentials in separate repo); aligns with professional enterprise patterns. | Maximum overhead for small team: 3 git repos, 3 PR reviews per change, 3 `.env` files, version tracking overhead. For 3–6 mo lifetime, likely over-engineered. | **White-label platform stage** — when the architecture turns into a reusable multi-brand platform (post-PoC, per `docs/PoC_WhiteLabel_Cost_Roadmap_RU.md`). Not needed now. |

**Tradeoffs specific to this project:**

- **Terraform state isolation:** If Terraform lives in the same repo as the backend code, anyone with code access has infra access (`S3_ACCESS_KEY`, `DATABASE_URL`). A separate `infra` repo with restricted access fixes that — but for PoC, access control is simpler: restrict `.env` files, use `chmod 600`, and document that `S3_ACCESS_KEY` is a PoC-level secret (not production-grade rotation). Post-PoC, split.
- **FE build artifacts:** With pure C, FE is a static build output. If it lives in the same repo, `npm run build` produces `dist/` or `build/` that must be `.gitignore`d, and the CDN deploy step pulls from S3 (not from git). This is fine — the repo holds FE source; CDN holds FE artifacts; no pollution.
- **API contract tracking:** When FE calls `/api/*` endpoints, renaming or removing an endpoint requires updating FE source. In a monorepo, this is one PR (`docs/research/2026-09-15` + `docs/adr/` + `frontend/src/` + `src/index.js`). In a split repo, it's two PRs + version tracking. For PoC, one PR is faster; for scale-up, split repos reduce risk.
- **Migration/DB contract:** `migrations/001_init.sql` and `src/migrate.js` (with `pg_advisory_lock`) are backend-only. Splitting repos doesn't change DB management — Terraform can manage DB creation, migrations run from the backend repo's CI pipeline. No impact.

**Recommendation:**

- **Now (PoC launch): 1 repo** (`kompmaster-server`). Add `/terraform/` directory (Timeweb Cloud configs) and `/frontend/` directory (when rebuilt); keep `/docs/adr/` and `/docs/research/` in same repo. This minimizes overhead and lets a single agent (or 2–3 people) manage everything from one `git clone`.
- **Post-PoC (if white-label transition): 3 repos** — `kompmaster-server` (backend + migrations + adapter code), `kompmaster-frontend` (static CDN artifact), `kompmaster-infra` (Terraform state + Timeweb configs). Migration is zero-code-change: move directories, update `.env` paths, split CI pipelines. The adapter contracts (`payment provider`, `fiscalization`) stay in `kompmaster-server`; the FE contract stays in `kompmaster-frontend`.

### What needs to change in this repo (before any split):

- Add `/terraform/` directory with Timeweb provider config (MSK-50, S3 bucket, managed DB optional, Caddy LB optional), `.tfvars` (no secrets — secrets from `.env` / environment variables), output for `S3_PUBLIC_URL` and `DATABASE_URL`.
- Keep `docs/research/` and `docs/adr/` (these are documentation artifacts — should stay with the repo regardless of split; after split, `docs/` can be duplicated or moved to a `docs/` repo).
- Update `.gitignore` if needed for Terraform files (no `.env` in git; `terraform.tfstate` must never be committed; add `.tf` files with `variable` blocks but no hardcoded secrets).

### Next step confirmation needed:

Should I create the `/terraform/` directory with a minimal Timeweb MSK-50 + S3 config (variable-based, no secrets, referencing `docs/research/2026-09-15` choices) so it can be provisioned independently from the code deployment? Or keep infrastructure manual (SSH + `docker-compose up`) for PoC and add Terraform only after the site is live?

Also, should the `/frontend/` directory be created now (empty, with just `.gitignore` and a `README` explaining the rebuild timeline and `DESIGN.md` contract preservation), or wait until the FE rebuild starts?
