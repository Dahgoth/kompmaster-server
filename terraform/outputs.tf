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

output "firewall_id" {
  description = "Firewall group identifier."
  value       = twc_firewall.main.id
}

output "project_id" {
  description = "Timeweb project identifier."
  value       = twc_project.main.id
}
