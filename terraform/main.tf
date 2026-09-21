# KompMaster PoC infrastructure — Timeweb Cloud (Option D+A, ADR-002 re-scope).
# Provisions ONLY infra: project, VPS, firewall, S3 buckets, DNS.
# App deploy (code, .env, migrations) and secrets stay outside Terraform — see DEVELOPMENT.md.
#
# Topology (ADR-001 §1a pure C — backend serves /api/* only, frontend is a
# separate static artifact, Option B):
#
#   compmasone.ru        A     → VPS (floating IP)   Caddy 301 → https://www.compmasone.ru
#   compmasone.ru        AAAA  → VPS (native IPv6)   Caddy 301 → https://www.compmasone.ru
#   www.compmasone.ru    CNAME → S3 (or CDN)         frontend bucket, static website + SSL
#   api.compmasone.ru    A     → VPS (floating IP)   Caddy reverse_proxy → 127.0.0.1:PORT
#   api.compmasone.ru    AAAA  → VPS (native IPv6)   Caddy reverse_proxy → 127.0.0.1:PORT
#   assets.compmasone.ru CNAME → S3                  media bucket + SSL
#
# The apex cannot be a CNAME on Timeweb DNS, hence the www-canonical redirect.
# CDN is NOT provisioned here: terraform-provider-timeweb-cloud v1.8.2 has no
# CDN resource. After attaching it in the panel/API, set
# frontend_cdn_enabled = true + frontend_cdn_cname in terraform.tfvars and
# re-apply — Terraform stays the source of truth for the www CNAME (no drift).

resource "twc_floating_ip" "server_ipv4" {
  availability_zone = var.availability_zone
  comment           = "KompMaster PoC IPv4 for VPS"

  resource {
    type = "server"
    id   = twc_server.main.id
  }
}

locals {
  # www points at S3 directly until the CDN resource exists; then at the CDN.
  frontend_cname_target = var.frontend_cdn_enabled ? var.frontend_cdn_cname : "s3.timeweb.com"
  media_cname_target    = var.media_cdn_enabled ? var.media_cdn_cname : "s3.timeweb.com"

  # Server IPs for DNS records — floating IP for IPv4, native for IPv6
  server_ipv4 = twc_floating_ip.server_ipv4.ip
  server_ipv6 = twc_server.main.networks[0].ips[0].ip
}

data "twc_configurator" "server" {
  location = var.location
}

data "twc_os" "server" {
  name    = var.os_name
  version = var.os_version
}

data "twc_dns_zone" "main" {
  name = var.domain
}

data "twc_s3_preset" "media" {
  location      = var.location
  storage_class = var.s3_storage_class
  disk          = var.s3_disk_mb
}

data "twc_s3_preset" "frontend" {
  location      = var.location
  storage_class = var.s3_storage_class
  disk          = var.frontend_s3_disk_mb
}

resource "twc_project" "main" {
  name        = var.project_name
  description = "KompMaster PoC — managed by Terraform (/terraform)"
}

resource "twc_server" "main" {
  name     = var.server_name
  comment  = "KompMaster PoC API (ADR-001 pure C, ADR-002 Timeweb MSK-50)"
  hostname = var.server_hostname
  os_id    = data.twc_os.server.id

  configuration {
    configurator_id = data.twc_configurator.server.id
    cpu             = var.server_cpu
    ram             = var.server_ram_mb
    disk            = var.server_disk_mb
  }

  availability_zone         = var.availability_zone
  is_ddos_guard             = true
  is_root_password_required = length(var.ssh_keys_ids) == 0
  ssh_keys_ids              = var.ssh_keys_ids
  project_id                = twc_project.main.id
}

resource "twc_firewall" "main" {
  name        = "${var.server_name}-fw"
  description = "KompMaster PoC: 80/443 open, SSH via var.ssh_allowed_cidr"

  link {
    id   = twc_server.main.id
    type = "server"
  }
}

resource "twc_firewall_rule" "http" {
  firewall_id = twc_firewall.main.id
  description = "Allow HTTP (redirect to HTTPS)"
  direction   = "ingress"
  protocol    = "tcp"
  port        = "80"
  cidr        = "0.0.0.0/0"
}

resource "twc_firewall_rule" "https" {
  firewall_id = twc_firewall.main.id
  description = "Allow HTTPS (API + health)"
  direction   = "ingress"
  protocol    = "tcp"
  port        = "443"
  cidr        = "0.0.0.0/0"
}

resource "twc_firewall_rule" "ssh" {
  firewall_id = twc_firewall.main.id
  description = "Allow SSH (restrict CIDR post-launch)"
  direction   = "ingress"
  protocol    = "tcp"
  port        = "22"
  cidr        = var.ssh_allowed_cidr
}

# Disk backups are intentionally NOT provisioned (ADR-005): the single-VPS
# recovery control is the encrypted daily pg_dump → the offsite backup bucket
# below, plus free panel snapshots before risky ops. Do not re-add a
# twc_server_disk_backup_schedule without re-costing it — Timeweb bills
# 6 ₽/GB of disk per existing copy per month (ADR-005 §Context).

# Offsite DB-backup bucket (ADR-005 §Decision 4): separate private bucket that
# survives VPS loss; its per-bucket key grants no access to the media/frontend
# buckets. Provider v1.8.2 cannot manage S3 versioning, so backend/scripts/
# backup.sh re-asserts it via the S3 API on every run (history survives
# accidental deletion/overwrite).
resource "twc_s3_bucket" "backups" {
  name      = var.backup_bucket_name
  type      = "private"
  preset_id = data.twc_s3_preset.media.id

  description           = "KompMaster PoC encrypted DB dumps (offsite recovery control, ADR-005)"
  is_allow_auto_upgrade = true
  project_id            = twc_project.main.id
}

resource "twc_s3_bucket" "media" {
  name      = var.s3_bucket_name
  type      = var.s3_bucket_type
  preset_id = data.twc_s3_preset.media.id

  description           = "KompMaster PoC product photos (S3_PUBLIC_URL target)"
  is_allow_auto_upgrade = true
  project_id            = twc_project.main.id
}

# DNS is managed in Timeweb (zone pre-exists) — no manual registrar records needed.
#
# Apex: A-record (IPv4 from floating IP) + AAAA-record (IPv6 native) to the VPS.
# Caddy 301-redirects apex traffic to the canonical frontend subdomain.
resource "twc_dns_rr" "root_a" {
  zone_id = data.twc_dns_zone.main.id
  name    = "@"
  type    = "A"
  value   = local.server_ipv4

  depends_on = [twc_floating_ip.server_ipv4]
}

resource "twc_dns_rr" "root_aaaa" {
  zone_id = data.twc_dns_zone.main.id
  name    = "@"
  type    = "AAAA"
  value   = local.server_ipv6

  depends_on = [twc_server.main]
}

# API hostname — same VPS, dedicated origin for CORS clarity and later LB swap.
resource "twc_dns_rr" "api_a" {
  zone_id = data.twc_dns_zone.main.id
  name    = var.api_subdomain
  type    = "A"
  value   = local.server_ipv4

  depends_on = [twc_floating_ip.server_ipv4]
}

resource "twc_dns_rr" "api_aaaa" {
  zone_id = data.twc_dns_zone.main.id
  name    = var.api_subdomain
  type    = "AAAA"
  value   = local.server_ipv6

  depends_on = [twc_server.main]
}

# Static frontend: while CDN is off, CNAME → s3.timeweb.com (bucket website +
# S3-issued SSL). Once the CDN is attached, CNAME → the CDN target (CDN
# terminates TLS). Either way Terraform owns the record value — no manual
# panel edits that a later apply would revert.
resource "twc_dns_rr" "www" {
  zone_id = data.twc_dns_zone.main.id
  name    = var.frontend_subdomain
  type    = "CNAME"
  value   = local.frontend_cname_target

  lifecycle {
    precondition {
      condition     = length(trimspace(local.frontend_cname_target)) > 0
      error_message = "frontend_cdn_cname must be set when frontend_cdn_enabled = true."
    }
  }
}

# Media hostname: CNAME → s3.timeweb.com (or CDN target when CDN attached).
# Terraform owns the record value — no manual panel edits that a later apply would revert.
resource "twc_dns_rr" "assets" {
  zone_id = data.twc_dns_zone.main.id
  name    = var.media_subdomain
  type    = "CNAME"
  value   = local.media_cname_target

  lifecycle {
    precondition {
      condition     = length(trimspace(local.media_cname_target)) > 0
      error_message = "media_cdn_cname must be set when media_cdn_enabled = true."
    }
  }
}

# S3 bucket subdomain (SSL cert) — only while S3 serves directly; CDN drops this binding.
resource "twc_s3_bucket_subdomain" "media" {
  count = var.media_cdn_enabled ? 0 : 1

  bucket_id    = twc_s3_bucket.media.id
  subdomain    = "${var.media_subdomain}.${var.domain}"
  release_cert = true

  depends_on = [twc_dns_rr.assets]
}

# Static storefront (Option B): public bucket + S3 website hosting. The SPA
# router is history-based, so 404s fall back to index.html for deep links.
resource "twc_s3_bucket" "frontend" {
  name      = var.frontend_bucket_name
  type      = "public"
  preset_id = data.twc_s3_preset.frontend.id

  description           = "KompMaster PoC storefront (frontend/dist, served via website hosting + CDN)"
  is_allow_auto_upgrade = true
  project_id            = twc_project.main.id

  website_config {
    enabled    = true
    index_page = var.frontend_index_page

    error_pages {
      code     = 404
      document = var.frontend_spa_fallback
    }
  }
}

# S3 issues the www cert only while S3 serves the bucket directly; with the
# CDN attached the CDN terminates TLS for www and this binding is dropped.
resource "twc_s3_bucket_subdomain" "frontend" {
  count = var.frontend_cdn_enabled ? 0 : 1

  bucket_id    = twc_s3_bucket.frontend.id
  subdomain    = "${var.frontend_subdomain}.${var.domain}"
  release_cert = true

  depends_on = [twc_dns_rr.www]
}
