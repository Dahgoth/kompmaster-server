# KompMaster PoC infrastructure — Timeweb Cloud (Option D+A, ADR-002 re-scope).
# Provisions ONLY infra: project, VPS, firewall, disk autobackups, S3 media bucket, DNS.
# App deploy (code, .env, migrations) and secrets stay outside Terraform — see DEVELOPMENT.md.

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

# Single-VPS recovery path (ADR-002: no HA — daily disk copies + pg_dump to S3).
resource "twc_server_disk_backup_schedule" "main" {
  source_server_id      = twc_server.main.id
  source_server_disk_id = twc_server.main.disks[0].id

  enabled           = true
  copy_count        = var.backup_copy_count
  creation_start_at = var.backup_start_at
  interval          = "day"
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
resource "twc_dns_rr" "root_a" {
  zone_id = data.twc_dns_zone.main.id
  name    = "@"
  type    = "A"
  value   = twc_server.main.main_ipv4
}

resource "twc_dns_rr" "www" {
  zone_id = data.twc_dns_zone.main.id
  name    = "www"
  type    = "CNAME"
  value   = var.domain
}

# Media hostname: CNAME must resolve to s3.timeweb.com before the bucket
# subdomain requests its certificate.
resource "twc_dns_rr" "assets" {
  zone_id = data.twc_dns_zone.main.id
  name    = var.media_subdomain
  type    = "CNAME"
  value   = "s3.timeweb.com"
}

resource "twc_s3_bucket_subdomain" "media" {
  bucket_id    = twc_s3_bucket.media.id
  subdomain    = "${var.media_subdomain}.${var.domain}"
  release_cert = true

  depends_on = [twc_dns_rr.assets]
}
