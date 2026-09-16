# Terraform — reserved for future infrastructure work.

This directory is intentionally empty. It exists so CI path filters and the
Husky `pre-push` hook can distinguish a future `terraform/` dev cycle from
the backend (`src/`, `tests/`, …) and frontend (`frontend/`) cycles.

When real `.tf` files land here, add a `terraform` CI job (`terraform fmt
-check`, `terraform validate`, optionally `tflint`) gated on
`terraform/**` path changes, and extend `scripts/check-docs.js` if infra
changes gain their own doc-sync rule.
