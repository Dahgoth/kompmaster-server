# 2026 Hosting & Infrastructure Pricing — PoC E-Commerce Store

> All figures in USD. Researched September 2026. Source URLs included for every price.

## 1. PaaS Application Hosting

| Provider | Tier | Price/mo | Notes | Source |
|----------|------|----------|-------|--------|
| Vercel | Hobby | $0 | 100GB bandwidth, 125K Lambda req | [vercel.com/pricing](https://vercel.com/pricing) |
| Vercel | Pro | $20 | 1TB bandwidth, 125K req/10s | [vercel.com/pricing](https://vercel.com/pricing) |
| Netlify | Free | $0 | 100GB bandwidth, 125K builds | [netlify.com/pricing](https://www.netlify.com/pricing) |
| Netlify | Pro | $20 | 400GB bandwidth, 358K builds | [netlify.com/pricing](https://www.netlify.com/pricing) |
| Railway | Free | $0 | $5 credit every 30 days spins down | [railway.com/pricing](https://railway.com/pricing) |
| Railway | Hobby | $5 | 512MB RAM, 1 vCPU, 1 GB disk | [railway.com/pricing](https://railway.com/pricing) |
| Railway | Pro | $20 | 1GB RAM, 1 vCPU, 20 GB disk | [railway.com/pricing](https://railway.com/pricing) |
| Render | Free | $0 | web service, 512MB RAM, sleeps after 15 min idle | [render.com/pricing](https://render.com/pricing) |
| Render | Pro | $25 | 1GB RAM, 0.5 vCPU | [render.com/pricing](https://render.com/pricing) |
| Render | Hobby Postgres | $0 | sleeps when idle | [render.com/pricing](https://render.com/pricing) |
| Render | Pro Postgres | $19 | 1GB RAM, 1 vCPU, 25 GB SSD | [render.com/pricing](https://render.com/pricing) |
| Fly.io | shared-cpu-1x | ≈$2.02 | 256MB RAM, 1 vCPU shared, $0.02/GB egress | [fly.io/docs/about/pricing](https://fly.io/docs/about/pricing) |
| Fly.io | shared-cpu-2x | ≈$4.04 | 512MB RAM | [fly.io/docs/about/pricing](https://fly.io/docs/about/pricing) |
| Fly.io | dedicated-cpu-1x | ≈$4.84 | 256MB RAM, dedicated | [fly.io/docs/about/pricing](https://fly.io/docs/about/pricing) |
| DigitalOcean App Platform | Starter | $0 | 1 container, limited | [digitalocean.com/pricing/apps](https://www.digitalocean.com/pricing/apps) |
| DigitalOcean App Platform | Basic | $5 | 1 vCPU, 512MB RAM | [digitalocean.com/pricing/apps](https://www.digitalocean.com/pricing/apps) |
| AWS Lightsail | $5 | $5 | 0.5 GB RAM, 1 vCPU, 20 GB SSD, 1 TB transfer | [aws.amazon.com/lightsail/pricing](https://aws.amazon.com/lightsail/pricing/) |
| AWS Lightsail | $44 | $44 | 8 GB RAM, 4 vCPU, 320 GB SSD, 8 TB transfer | [aws.amazon.com/lightsail/pricing](https://aws.amazon.com/lightsail/pricing/) |

## 2. Managed Databases

| Provider | Tier | Price/mo | Notes | Source |
|----------|------|----------|-------|--------|
| Neon | Free | $0 | 3 projects, 3 GB storage, 512 MB compute | [neon.tech/pricing](https://neon.tech/pricing/) |
| Neon | Launch (pay-go) | ≈$0.106/CU-hr | $0.024/GB storage-mo, 10M rows included | [neon.tech/pricing](https://neon.tech/pricing/) |
| Supabase | Free | $0 | 500 MB, 2 GB files, 500K auth/mo, 100MB cache | [supabase.com/pricing](https://supabase.com/pricing) |
| Supabase | Pro | $25 | 8 GB database, 100 GB files, 8 GB cache | [supabase.com/pricing](https://supabase.com/pricing) |
| Supabase | Compute add-on | $10 | 2 GB RAM, 1 vCPU | [supabase.com/pricing](https://supabase.com/pricing) |
| PlanetScale | Free | $0 | 5 GB storage, 10M rows read/day | [planetscale.com/pricing](https://planetscale.com/pricing) |
| PlanetScaler | PS-5 (arm64) | $5 | 1 GB RAM, 10 GB storage (non-HA) | [planetscale.com/pricing](https://planetscale.com/pricing) |
| PlanetScale | PS-10 | $29 | 2 GB RAM, 20 GB storage | [planetscale.com/pricing](https://planetscale.com/pricing) |
| PlanetScale | PS-40 | $149 | 8 GB RAM, 80 GB storage | [planetscale.com/pricing](https://planetscale.com/pricing) |
| AWS RDS (db.t4g.micro, Single-AZ) | — | $11.68 | 1 GB RAM, 1 vCPU, $0.0160/hr on-demand | [aws.amazon.com/rds/pricing](https://aws.amazon.com/rds/pricing/) |
| AWS RDS (db.t4g.small, Single-AZ) | — | $23.36 | 2 GB RAM, 2 vCPU | [aws.amazon.com/rds/pricing](https://aws.amazon.com/rds/pricing/) |
| Render | Pro Postgres | $19 | 1 GB RAM, 25 GB SSD | [render.com/pricing](https://render.com/pricing) |

## 3. Object Storage

| Provider | Tier | Price/GB-month | Notes | Source |
|----------|------|----------------|-------|--------|
| AWS S3 | Standard | $0.023 | 15 GB free with AWS Free Tier (12 mo) | [aws.amazon.com/s3/pricing](https://aws.amazon.com/s3/pricing/) |
| AWS S3 | Glacier Instant | $0.004 | Archive retrieval | [aws.amazon.com/s3/pricing](https://aws.amazon.com/s3/pricing/) |
| Cloudflare R2 | Free 10 GB | $0 | 10 GB storage + 10 GB retrieval free | [cloudflare.com/products/r2](https://www.cloudflare.com/products/r2/) |
| Cloudflare R2 | Paid | $0.015 | $0.00/egress (bandwidth alliance) | [cloudflare.com/products/r2](https://www.cloudflare.com/products/r2/) |
| Backblaze B2 | — | $0.006 | Cheapest S3-compatible tier | [backblaze.com/b2/cloud-storage-pricing](https://www.backblaze.com/b2/cloud-storage-pricing.html) |

## 4. CDN / Edge Functions

| Provider | Tier | Price | Notes | Source |
|----------|------|-------|-------|--------|
| Cloudflare | Free | $0 | SSL, DDoS, CDN (unlimited) | [cloudflare.com/plans](https://www.cloudflareflare.com/plans/) |
| Cloudflare | Pro | $20 | Rate limiting, WAF | [cloudflare.com/plans](https://www.cloudflare.com/plans/) |
| Cloudflare Workers | Free | $0 | 100K req/day | [cloudflare.com/products/workers](https://www.cloudflare.com/products/workers/) |
| Cloudflare Workers | Paid | $5 | 10 M req included, $0.30/M after | [cloudflare.com/products/workers](https://www.cloudflare.com/products/workers/) |
| Vercel | Edge Config | Included | Edge KV included in Hobby + Pro | [vercel.com/docs](https://vercel.com/docs) |

## 5. Email / SMTP / Notifications

| Provider | Tier | Price/mo | Notes | Source |
|----------|------|---------|-------|--------|
| Resend | Free | $0 | 3,000 emails/mo | [resend.com/pricing](https://resend.com/pricing) |
| Resend | Pro | $20 | 50,000 emails/mo | [resend.com/pricing](https://resend.com/pricing) |
| Amazon SES | Essentials | $20 | 50K emails (starts at $20 for 10K) | [aws.amazon.com/ses/pricing](https://aws.amazon.com/ses/pricing/) |
| Amazon SES | À la carte | $0.00 | $0.16/1K emails | [aws.amazon.com/ses/pricing](https://aws.amazon.com/ses/pricing/) |
| Twilio SendGrid | Essentials | $19.95 | 50K emails, 100 emails/min | [sendgrid.com/pricing](https://sendgrid.com/pricing/) |
| Mailgun | Basic | $15 | 10K emails/mo | [mailgun.com/pricing](https://www.mailgun.com/pricing/) |
| Mailgun | Foundation | $35 | 50K emails/mo | [mailgun.com/pricing](https://www.mailgun.com/pricing/) |

## 6. CI/CD

| Provider | Tier | Price/mo | Notes | Source |
|----------|------|---------|-------|--------|
| GitHub Actions | Free | $0 | 2,000 min/mo Linux private repos | [docs.github.com/en/actions](https://docs.github.com/en/actions) |
| GitHub Actions | Team | $4/user | 3,000 min/mo Linux | [docs.github.com/en/actions](https://docs.github.com/en/actions) |
| GitHub Actions | Enterprise | $21/user | 50,000 min/mo | [docs.github.com/en/actions](https://docs.github.com/en/actions) |

## 7. Domains

| Provider | Tier | Price/yr | Notes | Source |
|----------|------|---------|-------|--------|
| Cloudflare Registrar | — | ≈$9-12 | Registration at cost, free WHOIS privacy | [cloudflare.com/products/registrar](https://www.cloudflare.com/products/registrar/) |
| Namecheap | — | ≈$9-16 | .com intro, higher on renewal; WHOIS privacy extra | [namecheap.com/domains/registration](https://www.namecheap.com/domains/registration/) |

## 8. Cloud Credits

| Provider | Credit | Notes | Source |
|----------|--------|-------|--------|
| AWS Free Tier | $200 | Valid 6 months for new accounts; plus 12-mo free tier | [aws.amazon.com/free](https://aws.amazon.com/free/) |
| Vercel | — | Hobby forever free; good for PoC | [vercel.com/pricing](https://vercel.com/pricing) |

---

## 9. Budget Scenarios (monthly, USD)

### Scenario A — Near-Free Hobby PoC ($0–5/mo)
| Item | Provider | Price |
|------|----------|-------|
| App host | Vercel Hobby | $0 |
| Database | Neon Free / Supabase Free | $0 |
| Storage | Cloudflare R2 Free (10 GB) | $0 |
| CDN / Security | Cloudflare Free | $0 |
| Email | Resend Free (3K/mo) | $0 |
| CI/CD | GitHub Actions Free | $0 |
| Domain | Cloudflare Registrar (.com) | $0 (amortized $1/mo) |
| **Total** | | **$0–5** |

**Trade-offs:** 0–125 ms cold starts on serverless, free tiers cap at modest volume, no SLA, shared/noisy resources.

### Scenario B — Modest Paid (~$15–30/mo)
| Item | Provider | Price |
|------|----------|-------|
| App host | Render Pro (1 GB) | $25 |
| Database | Supabase Pro | $25 |
| Storage | Cloudflare R2 | $0 (10 GB free) |
| CDN / Security | Cloudflare Free | $0 |
| Email | Resend Pro | $20 |
| CI/CD | GitHub Actions Free | $0 |
| Domain | Cloudflare Registrar (.com) | ~$1 (amortized) |
| **Total** | | **~15–30** |

If the free DB tier is sufficient, drop Supabase Pro and net **~$15/mo**.

**Trade-offs:** Still serverless/spinning; modest RAM and request limits; good for early traction / <10K monthly users.

### Scenario C — Production-Grade (~$100–200/mo)
| Item | Provider | Price |
|------|----------|-------|
| App host (autoscale) | AWS Lightsail $44 | $44 |
| Database | AWS RDS db.t4g.small | $23 |
| Storage | Cloudflare R2 (50 GB) | $0.60 |
| CDN / Security | Cloudflare Pro | $20 |
| Email | Amazon SES (50K) | $20 |
| CI/CD | GitHub Actions Team (1 dev) | $4 |
| Domain | Cloudflare Registrar | ~$1 (amortized) |
| Object storage (S3 50 GB backup) | AWS S3 Standard | $1.15 |
| **Total** | | **~100–200** |

**Trade-offs:** Dedicated VM with root access, managed HA DB, fixed bandwidth; costs grow linearly with egress and storage. Can be re-architected to spot/reserved EC2 for further savings.

---

## 10. Methodology & Notes
- Prices pulled from live pricing pages September 2026; rounded to nearest cent for fixed tiers.
- Usage-based pricing (R2 storage, S3, SES, Workers) estimated at representative small-store volumes (~50 GB active storage, ~50 K emails, ~5 M requests).
- Annual domain/registry costs amortized to monthly ($/12).
- AWS figures assume the US East (N. Virginia) region on-demand pricing; Reserved/Spot discounts of ~20–75 % available for steady workloads.
- Third-party source (e.g., Namecheap via BearHost) flagged where the vendor's own search returned 403.
