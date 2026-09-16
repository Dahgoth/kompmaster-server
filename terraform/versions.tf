terraform {
  required_version = ">= 1.5"

  required_providers {
    twc = {
      source = "tf.timeweb.cloud/timeweb-cloud/timeweb-cloud"
    }
  }
}

# Auth: export TWC_TOKEN=<api token> (Timeweb panel → API keys).
# The token must have Telegram delete-confirmation disabled (provider requirement).
provider "twc" {}
