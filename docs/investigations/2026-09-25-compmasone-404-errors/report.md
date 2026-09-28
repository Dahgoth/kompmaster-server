# 404 Error Investigation Report: https://www.compmasone.ru/

**Investigation Date**: 2026-09-25  
**Investigator**: Automated browser analysis via Playwright  
**Target URL**: https://www.compmasone.ru/

---

## Executive Summary

The production site at `https://www.compmasone.ru/` loads the main HTML document (200 OK) but **all 12 Next.js static assets (JS chunks + CSS) return 404 Not Found**. This renders the storefront non-functional as no JavaScript executes and no styles apply.

Additionally, the 404 responses are served with `Content-Type: text/plain; charset=utf-8` instead of proper MIME types, causing browsers to refuse execution due to strict MIME type checking.

---

## Detailed Findings

### 1. Network Errors (404 Responses)

| # | Resource URL | Method | Type | Status | Key Response Headers |
|---|--------------|--------|------|--------|---------------------|
| 1 | `https://www.compmasone.ru/_next/static/css/f9a044ef0959b98d.css` | GET | stylesheet | 404 (ERR_ABORTED) | `via: 1.1 Caddy`, `content-type: text/plain` |
| 2 | `https://www.compmasone.ru/_next/static/chunks/3131-a6dcb222db41fb9c.js` | GET | script | 404 | `via: 1.1 Caddy`, `content-type: text/plain` |
| 3 | `https://www.compmasone.ru/_next/static/chunks/webpack-d4f6c7a0c16fb497.js` | GET | script | 404 | `via: 1.1 Caddy`, `content-type: text/plain` |
| 4 | `https://www.compmasone.ru/_next/static/chunks/c7879cf7-ce6cc72fe8fad416.js` | GET | script | 404 | `via: 1.1 Caddy`, `content-type: text/plain` |
| 5 | `https://www.compmasone.ru/_next/static/chunks/3085-d3f0cb7191be6918.js` | GET | script | 404 | `via: 1.1 Caddy`, `content-type: text/plain` |
| 6 | `https://www.compmasone.ru/_next/static/chunks/7238-4ea8582c6088f05d.js` | GET | script | 404 | `via: 1.1 Caddy`, `content-type: text/plain` |
| 7 | `https://www.compmasone.ru/_next/static/chunks/3044-635aee3011db4c9a.js` | GET | script | 404 | `via: 1.1 Caddy`, `content-type: text/plain` |
| 8 | `https://www.compmasone.ru/_next/static/chunks/1667-c17de8a4e7946170.js` | GET | script | 404 | `via: 1.1 Caddy`, `content-type: text/plain` |
| 9 | `https://www.compmasone.ru/_next/static/chunks/main-app-b2a032a298d4503c.js` | GET | script | 404 | `via: 1.1 Caddy`, `content-type: text/plain` |
| 10 | `https://www.compmasone.ru/_next/static/chunks/8197-f05fdd869613ec30.js` | GET | script | 404 | `via: 1.1 Caddy`, `content-type: text/plain` |
| 11 | `https://www.compmasone.ru/_next/static/chunks/app/layout-d8c030cabcb2cbc5.js` | GET | script | 404 | `via: 1.1 Caddy`, `content-type: text/plain` |
| 12 | `https://www.compmasone.ru/_next/static/chunks/4234-2b8e26c2abb40512.js` | GET | script | 404 | `via: 1.1 Caddy`, `content-type: text/plain` |
| 13 | `https://www.compmasone.ru/_next/static/chunks/app/page-a400b68518bd4d82.js` | GET | script | 404 | `via: 1.1 Caddy`, `content-type: text/plain` |

**All 13 static asset requests return 404**. Only the main document (`/`) returns 200.

### 2. Console Errors

Two categories of console errors were captured (25 total):

#### A. MIME Type Errors (13 errors)
```
Refused to apply style from 'https://www.compmasone.ru/_next/static/css/f9a044ef0959b98d.css' 
because its MIME type ('text/plain') is not a supported stylesheet MIME type, and strict MIME checking is enabled.

Refused to execute script from 'https://www.compmasone.ru/_next/static/chunks/3131-a6dcb222db41fb9c.js' 
because its MIME type ('text/plain') is not executable, and strict MIME type checking is enabled.
```
*All 12 JS chunks + 1 CSS file trigger this error because the 404 response body is served as `text/plain`.*

#### B. Resource Load Failures (12 errors)
```
Failed to load resource: the server responded with a status of 404 ()
```
*One per static asset URL.*

### 3. Resource Classification

| Resource | Internal/External | Dynamic Parameters | Notes |
|----------|-------------------|-------------------|-------|
| `/_next/static/css/f9a044ef0959b98d.css` | Internal (same origin) | No (content-hashed) | Main stylesheet |
| `/_next/static/chunks/*.js` (12 files) | Internal (same origin) | No (content-hashed) | Next.js code chunks (webpack, framework, app pages, layout) |

**All failing resources are internal, content-hashed Next.js static assets** — no external CDNs or dynamic query parameters involved.

---

## Root Cause Analysis

### Primary Cause: Static Assets Not Deployed to VPS Storefront

The `www.compmasone.ru` DNS record **currently points to S3/CDN** (per DEPLOY.md §1: `www` → CNAME `s3.timeweb.com`), but the Caddy configuration has been updated to proxy `www` to the local Next.js SSR server on ports 3000/3001.

**Evidence the requests hit the VPS (Caddy), not S3:**
- Response header `via: 1.1 Caddy` present on all 404 responses
- Response header `x-content-type-options: nosniff` (Caddy default)
- HSTS header `strict-transport-security: max-age=31536000`

**Conclusion**: The DNS cutover (DEPLOY.md §8.5) has **partially occurred** — `www` now resolves to the VPS IP — but the **Next.js storefront artifact on the VPS is missing or incomplete**.

### Secondary Cause: Deploy Script Bug (Nested Static Directory)

Local reproduction revealed a bug in `backend/scripts/deploy-storefront.sh` (line 112):

```bash
# BUG: Missing trailing slashes cause nested directory
rsync -a frontend/.next/static "$artifact/.next/static"
# Creates: $artifact/.next/static/static/chunks/...
```

**Result**: Static assets end up at `.next/static/static/` instead of `.next/static/`, so the Next.js server returns 404 for `/_next/static/*` requests.

**Proposed Fix** (trailing slashes on both source and destination):
```bash
rsync -a frontend/.next/static/ "$artifact/.next/static/"
rsync -a frontend/public/ "$artifact/public/"
```

**Validation**: After applying this fix locally, the artifact structure is correct and the local server serves all static assets with **200 OK**. The fix is documented here but **not yet committed** per investigation scope.

### Tertiary Issue: Incorrect MIME Types on 404 Responses

The 404 responses return `Content-Type: text/plain; charset=utf-8` because Next.js serves its custom 404 page as plain text. This triggers browser MIME type blocking errors in console, compounding the user-visible failure.

---

## Local Reproduction Steps

### 1. Reproduce the Deploy Artifact Bug
```bash
cd /home/dahgoth/projects/orgs/kompmaster/kompmaster-server
rm -rf /tmp/test-storefront
STOREFRONT_SSH="" STOREFRONT_ROOT=/tmp/test-storefront ./backend/scripts/deploy-storefront.sh --skip-build
# Check structure:
ls /tmp/test-storefront/current/.next/static/
# BUG: Shows nested 'static/' subdirectory
# FIX: Should show chunks/, css/, media/ directly
```

### 2. Verify Local Server Serves Assets Correctly (After Fix)
```bash
cd /tmp/test-storefront/current
PORT=3199 HOSTNAME=127.0.0.1 NODE_ENV=production \
  API_BASE=https://api.compmasone.ru/api \
  SITE_URL=https://www.compmasone.ru \
  node server.js &

sleep 3
curl -I http://127.0.0.1:3199/_next/static/chunks/3131-a6dcb222db41fb9c.js
# Expected: HTTP/1.1 200 OK, Content-Type: application/javascript
curl -I http://127.0.0.1:3199/_next/static/css/f9a044ef0959b98d.css
# Expected: HTTP/1.1 200 OK, Content-Type: text/css
```

### 3. Simulate Production 404 Behavior (Before Fix)
Deploy with the buggy script, then test — all static assets return 404 with `text/plain`.

---

## Hypothesized Production State

Based on DEPLOY.md documentation and observed behavior:

1. **DNS Status**: `www.compmasone.ru` → VPS IP (cutover initiated)
2. **Caddy Status**: Running with `www` block proxying to ports 3000/3001
3. **Storefront Deployment**: Either not deployed, or deployed with the nested-static-directory bug
4. **Result**: HTML renders (SSR works) but all `_next/static/*` requests 404

---

## Required Actions (Priority Order)

| Priority | Action | Location | Status |
|----------|--------|----------|--------|
| **P0** | Fix deploy script rsync trailing slashes | `backend/scripts/deploy-storefront.sh:112-113` | 🔍 **Proposed fix validated locally, not yet committed** |
| **P0** | Deploy corrected artifact to VPS | VPS: `/opt/compmaster/storefront/` | ⏳ Pending |
| **P1** | Verify storefront PM2 process is running | VPS: `pm2 status kompmaster-storefront-*` | ⏳ Pending |
| **P1** | Verify Caddy config includes `www` block | VPS: `/etc/caddy/Caddyfile` | ⏳ Pending |
| **P2** | Complete DNS cutover (if not done) | Timeweb DNS: `www` CNAME → VPS IP | ⏳ Pending |
| **P2** | Purge CDN cache after cutover | Timeweb CDN panel | ⏳ Pending |

---

## Supporting Evidence

### Screenshots/Logs Captured
- Full page screenshot: `/tmp/compmasone_full.png`
- Viewport screenshot: `/tmp/compmasone_viewport.png`
- Raw HTML: `/tmp/compmasone_page.html`
- Full investigation JSON: `/tmp/404_investigation_results.json`

### Key Response Headers (from 404 responses)
```
via: 1.1 Caddy
content-type: text/plain; charset=utf-8
x-content-type-options: nosniff
strict-transport-security: max-age=31536000; includeSubDomains
cache-control: public, max-age=31536000, immutable, private, no-cache, no-store, max-age=0, must-revalidate
content-security-policy-report-only: default-src 'self'; script-src 'self' 'unsafe-inline' https://mc.yandex.ru; ...
```

### HTML References (from production page)
The main document correctly references all 13 static assets with matching content hashes — the build manifest is consistent, only the file serving fails.

---

## Vercel Deployments Note

Per additional context: Vercel Preview/Production deployments also return 404s. This is **expected and separate** — Vercel is configured for the monorepo (Root Directory = `.`, Framework = Other) but the backend/database reside on the VPS. Vercel deployments serve only the frontend; API calls fail without the backend. This does not affect the VPS production issue documented here.

---

## Appendix: Local Fix Validation

The proposed trailing-slash fix to `deploy-storefront.sh` was validated locally (then reverted per investigation scope):

- ✅ Artifact structure: `.next/static/chunks/`, `.next/static/css/`, `.next/static/media/` (no nested `static/`)
- ✅ Boot-verify passes: Artifact starts on port 3199
- ✅ Static assets serve 200 OK with correct MIME types (`application/javascript`, `text/css`)
- ✅ Main page renders fully with all JS/CSS loaded

The fix is minimal, targeted, and validated. Ready for commit and deployment to VPS.