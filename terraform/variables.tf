# KompMaster PoC — input variables (Timeweb Cloud, Option D+A).
# Defaults implement ADR-002 PoC re-scope: single MSK-50-shape VPS, 10 GB hot S3.
# Secrets are NEVER variables here — TWC_TOKEN comes from the environment.

variable "project_name" {
  description = "Timeweb project name for all PoC resources."
  type        = string
  default     = "kompmaster"
}

variable "server_name" {
  description = "VPS name."
  type        = string
  default     = "kompmaster-poc"
}

variable "server_hostname" {
  description = "VPS hostname (Latin letters, digits, hyphen)."
  type        = string
  default     = "kompmaster-poc"
}

variable "domain" {
  description = "Zone already managed in Timeweb DNS (A/CNAME records are created here)."
  type        = string
  default     = "compmasone.ru"
}

variable "media_subdomain" {
  description = "Subdomain for the S3 media bucket (CNAME → s3.timeweb.com + bucket SSL)."
  type        = string
  default     = "assets"
}

# --- Static frontend (Option B: S3 website + CDN, API stays on the VPS) ---
#
# Timeweb DNS allows CNAME only on subdomains (no apex CNAME/ALIAS), so the
# zone apex cannot point at S3. The canonical frontend therefore lives on a
# subdomain and the apex 301-redirects to it from Caddy on the VPS.

variable "frontend_bucket_name" {
  description = "Bucket holding the built storefront (frontend/dist)."
  type        = string
  default     = "kompmaster-frontend"
}

variable "frontend_subdomain" {
  description = "Canonical frontend hostname (S3 website + SSL). Apex redirects here."
  type        = string
  default     = "www"
}

variable "api_subdomain" {
  description = "API hostname pointing at the VPS (Caddy reverse_proxy → PORT)."
  type        = string
  default     = "api"
}

variable "frontend_s3_disk_mb" {
  description = "Frontend bucket preset size in MB. Defaults to the verified 10 GB minimum (79 ₽/mo, same tier as the media bucket); dist/ is ~140 KB, so set 1024 only if you have confirmed the 1 GB preset exists in var.location."
  type        = number
  default     = 10240
}

variable "frontend_index_page" {
  description = "S3 website index document."
  type        = string
  default     = "index.html"
}

variable "frontend_spa_fallback" {
  description = "Document served for 404 so history-API deep links (/catalog, /admin) boot the SPA. The frontend router is path-based, not hash-based."
  type        = string
  default     = "index.html"
}

variable "frontend_cdn_enabled" {
  description = "Set true after attaching the Timeweb CDN resource (panel/API — provider v1.8.2 has no CDN resource). Then www CNAMEs to frontend_cdn_cname instead of s3.timeweb.com, the CDN terminates TLS, and Terraform stops managing the www bucket-subdomain SSL binding."
  type        = bool
  default     = false
}

variable "frontend_cdn_cname" {
  description = "CDN CNAME target for the frontend hostname (given by Timeweb when the CDN resource is created). Required when frontend_cdn_enabled = true."
  type        = string
  default     = ""
}

variable "media_cdn_enabled" {
  description = "Set true after attaching the Timeweb CDN resource for the media bucket. Then assets CNAMEs to media_cdn_cname instead of s3.timeweb.com, the CDN terminates TLS, and Terraform stops managing the assets bucket-subdomain SSL binding."
  type        = bool
  default     = false
}

variable "media_cdn_cname" {
  description = "CDN CNAME target for the media hostname (given by Timeweb when the CDN resource is created). Required when media_cdn_enabled = true."
  type        = string
  default     = ""
}

variable "location" {
  description = "Timeweb location for server configurator and S3 preset."
  type        = string
  default     = "ru-1"
}

variable "availability_zone" {
  description = "Availability zone for the VPS (msk-1 = Moscow, MSK-50 shape)."
  type        = string
  default     = "msk-1"
}

variable "os_name" {
  description = "OS family for the VPS."
  type        = string
  default     = "ubuntu"
}

variable "os_version" {
  description = "OS version (kept at 22.04 — matches provider docs examples)."
  type        = string
  default     = "22.04"
}

variable "server_cpu" {
  description = "VPS vCPU count (MSK-50 shape = 2)."
  type        = number
  default     = 2
}

variable "server_ram_mb" {
  description = "VPS RAM in MB (MSK-50 shape = 4096)."
  type        = number
  default     = 4096
}

variable "server_disk_mb" {
  description = "VPS disk in MB (MSK-50 shape = 50 GB)."
  type        = number
  default     = 51200
}

variable "ssh_keys_ids" {
  description = "Pre-created Timeweb SSH key IDs. Empty = root password issued by e-mail."
  type        = list(number)
  default     = []
}

variable "ssh_allowed_cidr" {
  description = "Source CIDR for SSH (22). Restrict to your IP after first login."
  type        = string
  default     = "0.0.0.0/0"
}

variable "s3_bucket_name" {
  description = "Media bucket name."
  type        = string
  default     = "kompmaster-media"
}

variable "s3_bucket_type" {
  description = "Bucket type (private: objects still public-read per-object via upload ACL)."
  type        = string
  default     = "private"
}

variable "s3_storage_class" {
  description = "Bucket storage class (hot for product photos)."
  type        = string
  default     = "hot"
}

variable "s3_disk_mb" {
  description = "S3 preset size in MB (10 GB PoC tier)."
  type        = number
  default     = 10240
}

variable "backup_bucket_name" {
  description = "Offsite DB-backup bucket name (encrypted pg_dump archives; ADR-005)."
  type        = string
  default     = "kompmaster-backups"
}
