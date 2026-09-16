# After `terraform apply`, map these into `.env` — see ENVIRONMENT.md.

output "server_ipv4" {
  description = "Public IPv4 of the PoC VPS (also the @ A-record value)."
  value       = twc_server.main.main_ipv4
}

output "server_id" {
  description = "VPS identifier."
  value       = twc_server.main.id
}

output "s3_bucket_name" {
  description = "Media bucket name → S3_BUCKET (verify against full_name if the S3 API rejects it)."
  value       = twc_s3_bucket.media.name
}

output "s3_bucket_full_name" {
  description = "Provider-assigned full bucket name (random prefix)."
  value       = twc_s3_bucket.media.full_name
}

output "s3_hostname" {
  description = "S3 endpoint host → S3_ENDPOINT=https://<hostname>."
  value       = twc_s3_bucket.media.hostname
}

output "s3_public_url" {
  description = "Public media base URL → S3_PUBLIC_URL."
  value       = "https://${var.media_subdomain}.${var.domain}"
}

output "s3_access_key" {
  description = "Bucket access key → S3_ACCESS_KEY (secret)."
  value       = twc_s3_bucket.media.access_key
  sensitive   = true
}

output "s3_secret_key" {
  description = "Bucket secret key → S3_SECRET_KEY (secret)."
  value       = twc_s3_bucket.media.secret_key
  sensitive   = true
}

# --- Static frontend (Option B) ---

output "frontend_url" {
  description = "Canonical storefront URL (S3 website + SSL; attach CDN here)."
  value       = "https://${var.frontend_subdomain}.${var.domain}"
}

output "apex_url" {
  description = "Zone apex (A → VPS); Caddy 301-redirects it to frontend_url."
  value       = "https://${var.domain}"
}

output "api_url" {
  description = "API base URL → VITE_API_BASE=<url>/api and FRONTEND_ORIGIN's allowed frontend origins stay separate."
  value       = "https://${var.api_subdomain}.${var.domain}"
}

output "frontend_website_domain" {
  description = "Origin domain reported by Timeweb for the frontend website (CDN origin target)."
  value       = try(twc_s3_bucket.frontend.website_config[0].domain, null)
}

output "frontend_bucket_name" {
  description = "Frontend bucket name (upload target for frontend/dist)."
  value       = twc_s3_bucket.frontend.name
}

output "frontend_bucket_full_name" {
  description = "Provider-assigned full frontend bucket name (random prefix)."
  value       = twc_s3_bucket.frontend.full_name
}

output "frontend_access_key" {
  description = "Frontend bucket access key → S3 sync credentials (secret)."
  value       = twc_s3_bucket.frontend.access_key
  sensitive   = true
}

output "frontend_secret_key" {
  description = "Frontend bucket secret key → S3 sync credentials (secret)."
  value       = twc_s3_bucket.frontend.secret_key
  sensitive   = true
}

output "firewall_id" {
  description = "Firewall group identifier."
  value       = twc_firewall.main.id
}

output "project_id" {
  description = "Timeweb project identifier."
  value       = twc_project.main.id
}
