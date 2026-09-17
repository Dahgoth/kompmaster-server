# KompMaster Frontend

Static storefront frontend for the KompMaster PC parts / restored electronics shop.

## Architecture

- **Vite** + vanilla ES modules (no framework — pure C per ADR-001)
- Static build output to `dist/` for S3 + CDN hosting
- Communicates with the backend via REST API (`/api/*`)
- Bearer JWT auth for storefront endpoints
- `X-Admin-Panel-Token` for admin panel endpoints

## Development

`frontend/` is a standalone pnpm project (own `pnpm-lock.yaml`); run its
commands from this directory. pnpm is pinned via Corepack — enable it once with
`corepack enable pnpm` (add `sudo` for a system-wide Node install).

```bash
pnpm install
pnpm run dev    # localhost:5173
pnpm test       # node --test suite
pnpm run build  # -> dist/
pnpm run preview
```

## Deployment

Static artifact on Timeweb S3 website hosting (+ CDN attached manually) —
infrastructure is provisioned by the backend repo's `terraform/` (see
`terraform/README.md` there):

```bash
VITE_API_BASE=https://api.compmasone.ru/api pnpm run build
aws --endpoint-url https://s3.timeweb.com s3 sync dist/ s3://<frontend-bucket> --delete
```

- Storefront is canonical at `https://www.compmasone.ru`; the apex
  `compmasone.ru` 301-redirects to it (Timeweb DNS forbids apex CNAME).
- The S3 website config maps 404 → `index.html`, so path-based deep links
  (`/catalog`, `/admin`) boot the SPA directly.
- Purge CDN cache after each deploy once the CDN resource is attached.

## Key Decisions

- No framework — vanilla JS for zero-runtime bundle size
- Design tokens extracted from legacy `public/index.html`
- Site content (FAQ, About, Warranty) hardcoded since modular API has no content endpoints
- Manual payment mode only (external providers deferred per ADR-002)

## Project Structure

```
frontend/
  index.html          — entry point
  package.json        — deps + scripts
  pnpm-workspace.yaml — pnpm settings (allowBuilds: esbuild)
  pnpm-lock.yaml      — pnpm lockfile
  vite.config.js      — build config
  .env.example        — environment template
  
  src/
    main.js           — app entry
    config.js         — config + localStorage helpers
    api.js            — API client (Bearer JWT + admin token)
    store.js          — reactive state management
    router.js         — client-side router
    utils.js          — formatting, DOM, helpers
    
    data/
      categories.js   — default categories + menu
      content.js      — hardcoded site content (FAQ, About, Warranty)
      payment.js      — payment configuration defaults
    
    styles/           — CSS modules (tokens, base, layout, components, pages, admin, utilities)
    components/       — reusable UI components
    pages/            — page renderers
      admin/          — admin panel pages
    
  public/             — static assets (favicon, images)
  terraform/          — IaC for TF stack
```
