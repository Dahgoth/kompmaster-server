# KompMaster Frontend

Static storefront frontend for the KompMaster PC parts / restored electronics shop.

## Architecture

- **Vite** + vanilla ES modules (no framework — pure C per ADR-001)
- Static build output to `dist/` for S3 + CDN hosting
- Communicates with the backend via REST API (`/api/*`)
- Bearer JWT auth for storefront endpoints
- `X-Admin-Panel-Token` for admin panel endpoints

## Development

```bash
npm install
npm run dev    # localhost:5173
npm test       # node --test suite
npm run build  # -> dist/
npm run preview
```

## Deployment

```bash
npm run build
# Upload dist/ to S3/CloudFront
# See terraform/ for infrastructure
```

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
