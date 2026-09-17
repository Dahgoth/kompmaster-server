terraform {
  required_version = ">= 1.5"

  required_providers {
    twc = {
      # Verified against v1.8.2 (see .terraform.lock.hcl); the CDN guidance in
      # README.md assumes this series (no CDN resource, website_config block).
      source  = "tf.timeweb.cloud/timeweb-cloud/timeweb-cloud"
      version = "~> 1.8.2"
    }
  }
}

# Auth: export TWC_TOKEN=<api token> (Timeweb panel → API keys).
# The token must have Telegram delete-confirmation disabled (provider requirement).
provider "twc" {}
