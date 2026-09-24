# ADR-008: Self-Hosted GitHub Actions Runners — Security Trade-offs (Public Repository)

**Status**: Accepted
**Date**: 2026-09-24
**Deciders**: [Author]

---

## Context

The project requires a self-hosted GitHub Actions runner on the production VPS to deploy the storefront via `deploy-storefront.sh` on tag pushes. GitHub's official documentation warns:

> *"Using self-hosted runners in public repositories is not recommended. Forks of your public repository can potentially run dangerous code on your self-hosted runner by creating a pull request."*

**This repository IS PUBLIC** (required for free GitHub Actions tier). This fundamentally changes the risk model compared to a private repository.

---

## Decision

**Use a self-hosted runner on the production VPS for production deploys only**, with the following mitigations (all implemented):

1. **Workflow scope strictly limited** — deploy workflow (`deploy.yml`) only runs on tag pushes (`v*.*.*`), NOT on PRs or pushes to branches
3. **Runner labels restricted** — only `self-hosted,linux,x64,vps` label; deploy workflow explicitly requires this label
4. **Runner user isolation** — dedicated `github-runner` user with minimal sudo privileges (`pm2`, `caddy reload`, `systemctl reload caddy` only)
5. **No PR-triggered runs on self-hosted** — PR checks run exclusively on GitHub-hosted runners (configured in `ci.yml`)
6. **Tag-only deployment** — production deploy only triggers on signed version tags (`v*.*.*`), not on arbitrary commits

---

## Context: Why Not GitHub-Hosted Runner?

For a public repository, GitHub-hosted runners are generally safer. However, we chose self-hosted because:

| Factor | Self-Hosted (Chosen) | GitHub-Hosted + SSH Key |
|--------|---------------------|-------------------------|
| **SSH key exposure** | ✅ Zero SSH keys in GitHub secrets | ❌ SSH private key in GitHub secrets |
| **Deploy control** | ✅ Full PM2/Caddy/fs access | ⚠️ Limited to SSH commands |
| **Network egress** | ✅ Zero (local deploy) | ⚠️ SSH over public internet |
| **Runner maintenance** | ⚠️ OS/runner updates | ✅ None |
| **Public repo risk** | ❌ Requires strict mitigations | ✅ Lower inherent risk |

**Decision rationale**: The SSH key exposure risk in GitHub secrets (even encrypted) was deemed higher than the self-hosted runner risk with our mitigations. A compromised SSH key = full VPS access. A compromised self-hosted runner = limited to what the `github-runner` user can do (which is already production deploy scope).

---

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| **Self-hosted runner (chosen)** | No SSH keys in secrets; full deploy control; zero egress | Public repo risk; runner maintenance |
| **GitHub-hosted + SSH key** | No runner maintenance; ephemeral | SSH key in secrets; network egress |
| **GitHub-hosted + webhook** | No runner; no SSH key | Webhook auth complexity; still needs deploy creds |
| **Third-party CI** | Mature runners | Vendor lock-in; cost; complexity |
| **GitHub Actions + rsync action** | Standard actions | SSH key in secrets; less PM2/Caddy control |

---

## Public Repo Risk Analysis

| Threat | Likelihood | Impact | Mitigation |
|--------|------------|--------|------------|
| Malicious PR from fork executes on self-hosted runner | Medium (public repo) | High (VPS access) | **Workflow only triggers on tags, not PRs** |
| Malicious dependency in `main` branch | Low | High | Dependabot + manual review for minor/major |
| Compromised `github-runner` user | Low | Medium | Sudo restricted to deploy commands only |
| Runner token theft | Low | Medium | Annual rotation; scoped to repo |

**Key finding**: The "public repo + self-hosted runner = dangerous" warning applies when workflows run on PRs/pushes. Our `deploy.yml` only triggers on `push: tags: ['v*.*.*']` and `workflow_call` — **never on PRs**. This neutralizes the primary attack vector.

---

## Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| **Self-hosted runner (chosen)** | No SSH keys in secrets; full VPS access; zero egress | Public repo risk (mitigated); runner maintenance |
| **GitHub-hosted runner + SSH key** | No runner maintenance; isolated ephemeral | SSH key in secrets; network egress |
| **GitHub-hosted runner + deploy via webhook** | No runner; no SSH key in secrets | Webhook endpoint needed; auth complexity |
| **Third-party CI (GitLab CI, CircleCI, etc.)** | Mature runner management | Vendor lock-in; cost; complexity |
| **GitHub Actions + `rsync` over SSH action** | Standard actions; no custom runner | SSH key in secrets; less PM2/Caddy control |

---

## Trade-offs Summary

| Factor | Self-Hosted (with mitigations) | GitHub-Hosted + SSH |
|--------|-------------------------------|---------------------|
| **Public repo risk** | ⚠️ Mitigated via tag-only workflow | ✅ Lower inherent risk |
| **SSH key exposure** | ✅ Zero keys in GH secrets | ❌ SSH key in GH secrets |
| **Maintenance** | ⚠️ OS/runner updates | ✅ None |
| **Deploy control** | ✅ Full (PM2, Caddy, fs) | ⚠️ Limited to SSH commands |
| **Cost** | ✅ Included in VPS | ✅ Free tier |
| **Network** | ✅ Local (no egress) | ⚠️ SSH over public internet |

---

## Implemented Mitigations

1. **Tag-only deployment workflow** — `deploy.yml` triggers only on `push: tags: ['v*.*.*']` and `workflow_call`; never on PRs or branch pushes
2. **Runner user hardening** — `github-runner` user with `sudo` limited to `pm2`, `caddy reload`, `systemctl reload caddy`
3. **Runner labels** — `self-hosted,linux,x64,vps`; deploy workflow explicitly requires this label
4. **PR checks on GitHub-hosted runners** — `ci.yml` uses `ubuntu-latest` runners only
5. **Runner token rotation** — Annual rotation documented in runbook
6. **Deploy key rotation** — Annual rotation documented in runbook
7. **Monitoring** — Alert on runner offline; audit runner logs periodically

---

## Consequences

**Positive**:
- Zero SSH keys in GitHub secrets (eliminates key rotation/leak risk)
- Direct PM2/Caddy control without SSH command escaping
- No network egress for deploy (lower attack surface)
- Full filesystem access for health checks/rollback
- Deploy workflow auditability (only runs on signed tags)

**Negative**:
- Runner maintenance burden (OS updates, runner version updates)
- Public repo requires strict workflow discipline (tag-only enforcement)
- Single point of failure (runner offline = no deploys)
- Requires ongoing vigilance if GitHub changes runner security model

---

## Related

- ADR-001: Canonical Core and Deployment Architecture
- ADR-007: SEO Rendering — Next.js SSR/ISR
- `.github/workflows/deploy.yml` — Production deploy workflow (tag-only)
- `.github/workflows/ci.yml` — CI workflow (GitHub-hosted runners only)
- `backend/scripts/deploy-storefront.sh` — Deploy script