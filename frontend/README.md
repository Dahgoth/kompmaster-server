# KompMaster Frontend

Static storefront frontend for the KompMaster PC parts / restored electronics shop.

## Architecture

- **Vite** + vanilla ES modules (no framework — pure C per ADR-001)
- Static build output to `dist/` for S3 + CDN hosting
- Communicates with the backend via REST API (`/api/*`)
- Bearer JWT auth for storefront endpoints
- `X-Admin-Panel-Token` for admin panel endpoints

## Development

`frontend/` is a package in the repository's root pnpm workspace. The root
`pnpm-lock.yaml` covers both apps, so install dependencies once from the
repository root. pnpm is pinned via Corepack — enable it once with
`corepack enable pnpm` (add `sudo` for a system-wide Node install).

```bash
corepack enable pnpm
pnpm install
```

Run frontend scripts from the repository root with the workspace filter:

```bash
pnpm --filter kompmaster-frontend dev
pnpm --filter kompmaster-frontend test
pnpm --filter kompmaster-frontend build
pnpm --filter kompmaster-frontend preview
```

The equivalent `pnpm run dev`, `pnpm run test`, `pnpm run build`, and
`pnpm run preview` commands continue to work from `frontend/`. The root also
provides `pnpm build:frontend` as a convenience alias for the filtered build.

## Linting

The frontend is linted by the workspace-root ESLint flat config
(`eslint.config.js` — ESM, browser globals) and formatted by the root
Prettier config (`.prettierrc.json`). Run from the repository root:

```bash
pnpm run lint:frontend   # ESLint over frontend/
pnpm run format          # Prettier rewrite (format:check verifies only)
```

`pnpm run lint` (root) covers both apps plus the Prettier check; CI runs
`lint:frontend` in the `frontend` job before tests and build. The `lint`
script inside `frontend/package.json` delegates to the workspace root.

## Deployment

Production remains a static artifact on Timeweb S3 website hosting with the CDN
attached manually. Infrastructure is provisioned by the repository root's
`../terraform/` (see `../terraform/README.md`). From the repository root:

```bash
VITE_API_BASE=https://api.compmasone.ru/api pnpm run build:frontend
aws --endpoint-url https://s3.timeweb.com s3 sync frontend/dist/ s3://<frontend-bucket> --delete
```

Vercel is used for storefront preview, staging, and fallback deployments. In
the Vercel project, set **Root Directory** to `frontend`, run the install
command from the repository root as `pnpm install --frozen-lockfile`, and build
with `pnpm --filter kompmaster-frontend build` (or run `pnpm run build` from
`frontend/`). Production traffic remains on Timeweb S3 + CDN.

- Storefront is canonical at `https://www.compmasone.ru`; the apex
  `compmasone.ru` 301-redirects to it (Timeweb DNS forbids apex CNAME).
- The S3 website config maps 404 → `index.html`, so path-based deep links
  (`/catalog`, `/admin`) boot the SPA directly.
- Purge CDN cache after each deploy once the CDN resource is attached.

## Key Decisions

- No framework — vanilla JS for zero-runtime bundle size
- Design tokens extracted from legacy `docs/legacy/public/index.html`
- Site content (FAQ, About, Warranty) hardcoded since modular API has no content endpoints
- Manual payment mode only (external providers deferred per ADR-002)

## Project Structure

```
repository root/
  pnpm-workspace.yaml       — workspace packages + build settings
  pnpm-lock.yaml            — single lockfile for both apps
  terraform/                — repository-wide IaC for the TF stack
  frontend/.env.example     — environment template

  frontend/
    index.html              — entry point
    package.json            — deps + scripts
    vite.config.js          — build config
    
    src/                    — frontend application code
      main.js               — app entry
      config.js             — config + localStorage helpers
      api.js                — API client (Bearer JWT + admin token)
      store.js              — reactive state management
      router.js             — client-side router
      utils.js              — formatting, DOM, helpers
      
      data/
        categories.js       — default categories + menu
        content.js          — hardcoded site content (FAQ, About, Warranty)
        payment.js          — payment configuration defaults
      
      styles/               — CSS modules (tokens, base, layout, components, pages, admin, utilities)
      components/           — reusable UI components
      pages/                — page renderers
        admin/              — admin panel pages
    
    public/                 — static assets (favicon, images)
```
