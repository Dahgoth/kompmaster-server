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

variable "backup_copy_count" {
  description = "Kept disk auto-backup copies (single-VPS recovery path per ADR-002)."
  type        = number
  default     = 7
}

variable "backup_start_at" {
  description = "First auto-backup timestamp (RFC3339)."
  type        = string
  default     = "2026-09-20T00:00:00Z"
}
