# AI-Only Dev Team Tooling Cost Estimate — 2026 Pricing Research Report

**Date:** 2026-09-08  
**Scope:** Verifiable 2026 pricing for AI coding subscriptions, API token rates, automation platforms, orchestration frameworks, and realistic solo-operator budget scenarios.  
**Constraint:** All numbers are USD. Every item includes an official or primary source URL.

---

## 1. AI Coding Agent Subscriptions (Monthly, 2026)

| Tool / Plan | Monthly Price (USD) | Key Notes | Source |
|-------------|---------------------|-----------|--------|
| **Claude Code** (via Claude Pro) | $20/mo | Includes Claude Code CLI + IDE + Desktop; rolling 5-hr usage window | [claude.com/pricing](https://claude.com/pricing) |
| Claude Pro (annual billing) | ~$17/mo | $204/yr | [claude.com/pricing](https://claude.com/pricing) |
| Claude Max 5× | $100/mo | 5× Pro usage limits | [claude.com/pricing](https://claude.com/pricing) |
| Claude Max 20× | $200/mo | 20× Pro usage limits | [claude.com/pricing](https://claude.com/pricing) |
| Claude Team Standard | $25/seat/mo | Claude Code included; central billing | [claude.com/pricing](https://claude.com/pricing) |
| Claude Team Premium | $125/seat/mo | Higher Claude Code usage headroom | [claude.com/pricing](https://claude.com/pricing) |
| **GitHub Copilot** Free | $0 | 2,000 completions/mo; 50 chat msgs/mo | [github.com/features/copilot/plans](https://github.com/features/copilot/plans) |
| GitHub Copilot Pro | $10/mo | Unlimited completions; $15/mo AI Credits (June 2026 billing change) | [github.com/features/copilot/plans](https://github.com/features/copilot/plans) |
| GitHub Copilot Pro+ | $39/mo | ~7,000 AI Credits/mo; Opus 4.6 access | [github.com/features/copilot/plans](https://github.com/features/copilot/plans) |
| GitHub Copilot Max | $100/mo | ~20,000 AI Credits/mo; new sign-ups paused June 2026 | [github.com/features/copilot/plans](https://github.com/features/copilot/plans) |
| GitHub Copilot Business | $19/seat/mo | SSO, privacy, admin policies | [github.com/features/copilot/plans](https://github.com/features/copilot/plans) |
| GitHub Copilot Enterprise | $39/seat/mo | Custom KB, audit, Opus 4.6 | [github.com/features/copilot/plans](https://github.com/features/copilot/plans) |
| **Cursor** Hobby | Free | Limited agent requests, 50 slow req/mo | [cursor.com/pricing](https://cursor.com/pricing) |
| Cursor Pro | $20/mo ($16/mo annual) | $20 monthly credit pool; unlimited Tab | [cursor.com/pricing](https://cursor.com/pricing) |
| Cursor Pro+ | $60/mo ($48/mo annual) | $70 monthly credit pool (3.5×) | [cursor.com/pricing](https://cursor.com/pricing) |
| Cursor Ultra | $200/mo ($160/mo annual) | $400 monthly credit pool (20×); priority access | [cursor.com/pricing](https://cursor.com/pricing) |
| Cursor Teams (Standard) | $40/seat/mo | Admin controls, SAML SSO, usage analytics | [cursor.com/pricing](https://cursor.com/pricing) |
| Cursor Teams (Premium) | $120/seat/mo | 5× Standard usage | [cursor.com/pricing](https://cursor.com/pricing) |
| **Windsurf** Free | $0 | Light daily/weekly Cascade quota; unlimited Tab | [windsurf.com/pricing](https://windsurf.com/pricing) |
| Windsurf Pro | $20/mo | Standard quotas; SWE-1.5, cloud sessions | [windsurf.com/pricing](https://windsurf.com/pricing) |
| Windsurf Max | $200/mo | Highest quotas; Devin cloud agents | [windsurf.com/pricing](https://windsurf.com/pricing) |
| Windsurf Teams | $40/seat/mo | Central billing, admin dashboard, analytics | [windsurf.com/pricing](https://windsurf.com/pricing) |
| Windsurf Enterprise | Custom | RBAC, SSO/SCIM, hybrid deployment | [windsurf.com/pricing](https://windsurf.com/pricing) |
| **Kilo Code** (open source) | Free | VS Code / JetBrains / CLI extension; pay for inference separately | [kilo.ai/pricing](https://kilo.ai/pricing) |
| Kilo Code Teams | $15/seat/mo | Analytics, shared BYOK, centralized billing | [kilo.ai/pricing](https://kilo.ai/pricing) |
| Kilo Pass Starter | $19/mo | ~$26.60 in bonus credits (up to 50% bonus) | [kilo.ai/pricing](https://kilo.ai/pricing) |
| Kilo Pass Pro | $49/mo | ~$68.60 in bonus credits | [kilo.ai/pricing](https://kilo.ai/pricing) |
| Kilo Pass Expert | $199/mo | ~$278.60 in bonus credits | [kilo.ai/pricing](https://kilo.ai/pricing) |
| Kilo Gateway (BYOK) | $0/mo + usage | Exact provider rates, 0% markup, 500+ models | [kilo.ai/inference](https://kilo.ai/inference) |

---

## 2. AI API Token Pricing (Per 1M Tokens, 2026)

### Anthropic Claude

| Model | Input ($/1M) | Output ($/1M) | Cache Read ($/1M) | Context | Source |
|-------|--------------|---------------|-------------------|---------|--------|
| Claude Haiku 4.5 | $1.00 | $5.00 | $0.10 | 200K | [platform.claude.com/docs/en/about-claude/pricing](https://platform.claude.com/docs/en/about-claude/pricing) |
| Claude Sonnet 4.6 | $3.00 | $15.00 | $0.30 | 1M | [platform.claude.com/docs/en/about-claude/pricing](https://platform.claude.com/docs/en/about-claude/pricing) |
| Claude Sonnet 5 | $2.00 | $10.00 | $0.20 | 1M | [platform.claude.com/docs/en/about-claude/pricing](https://platform.claude.com/docs/en/about-claude/pricing) |
| Claude Opus 4.6 / 4.7 / 4.8 / 5 | $5.00 | $25.00 | $0.50 | 1M | [platform.claude.com/docs/en/about-claude/pricing](https://platform.claude.com/docs/en/about-claude/pricing) |
| Claude Fable 5 / 5.1 | $10.00 | $50.00 | $1.00 | 1M | [platform.claude.com/docs/en/about-claude/pricing](https://platform.claude.com/docs/en/about-claude/pricing) |

**Notes:** Batch API offers 50% discount on input/output. Prompt caching provides 90% discount on cache reads. Long-context (>200K) requests carry premium rates on some models.

### OpenAI

| Model | Input ($/1M) | Cached Input ($/1M) | Output ($/1M) | Context | Source |
|-------|--------------|---------------------|---------------|---------|--------|
| GPT-5.6 Sol | $5.00 | $0.50 | $30.00 | 1M | [developers.openai.com/api/docs/pricing](https://developers.openai.com/api/docs/pricing) |
| GPT-5.6 Terra | $2.50 | $0.25 | $15.00 | 1M | [developers.openai.com/api/docs/pricing](https://developers.openai.com/api/docs/pricing) |
| GPT-5.6 Luna | $1.00 | $0.10 | $6.00 | 1M | [developers.openai.com/api/docs/pricing](https://developers.openai.com/api/docs/pricing) |
| GPT-5.5 | $5.00 | $0.50 | $30.00 | 1M | [developers.openai.com/api/docs/pricing](https://developers.openai.com/api/docs/pricing) |
| GPT-5.4 | $2.50 | $0.25 | $15.00 | 1M | [developers.openai.com/api/docs/pricing](https://developers.openai.com/api/docs/pricing) |
| GPT-5.4 mini | $0.75 | $0.075 | $4.50 | 400K | [developers.openai.com/api/docs/pricing](https://developers.openai.com/api/docs/pricing) |
| GPT-5.4 nano | $0.20 | $0.02 | $1.25 | — | [developers.openai.com/api/docs/pricing](https://developers.openai.com/api/docs/pricing) |
| GPT-5 (legacy/default) | $1.25 | $0.125 | $10.00 | 272K | [developers.openai.com/api/docs/pricing](https://developers.openai.com/api/docs/pricing) |
| GPT-5 Mini | $0.25 | $0.025 | $2.00 | 272K | [developers.openai.com/api/docs/pricing](https://developers.openai.com/api/docs/pricing) |

**Notes:** Cache reads receive 90% input discount. Batch API offers 50% discount. GPT-5.6 family launched July 2026.

### Google Gemini

| Model | Input ($/1M) | Output ($/1M) | Context | Notes | Source |
|-------|--------------|---------------|---------|-------|--------|
| Gemini 2.5 Flash-Lite | $0.10 | $0.40 | 1M | Lowest-cost production model | [ai.google.dev/gemini-api/docs/pricing](https://ai.google.dev/gemini-api/docs/pricing) |
| Gemini 2.5 Flash | $0.30 | $2.50 | 1M | Intro price through Aug 31, 2026 made permanent | [ai.google.dev/gemini-api/docs/pricing](https://ai.google.dev/gemini-api/docs/pricing) |
| Gemini 2.5 Pro | $1.25 | $10.00 | 2M | Long-context premium value | [ai.google.dev/gemini-api/docs/pricing](https://ai.google.dev/gemini-api/docs/pricing) |
| Gemini 3 Flash Preview | $0.50 | $3.00 | 1M | Newer generation | [ai.google.dev/gemini-api/docs/pricing](https://ai.google.dev/gemini-api/docs/pricing) |
| Gemini 3.5 Flash | $1.50 | $9.00 | 1M | Current generation | [ai.google.dev/gemini-api/docs/pricing](https://ai.google.dev/gemini-api/docs/pricing) |
| Gemini 3.6 Flash | $1.50 | $7.50 | 1M | Intro rate $0.75/$3.75 through Dec 31, 2026 | [ai.google.dev/gemini-api/docs/pricing](https://ai.google.dev/gemini-api/docs/pricing) |
| Gemini 3 Pro / 3.1 Pro | $2.00 | $12.00 | 1M–2M | Flagship | [ai.google.dev/gemini-api/docs/pricing](https://ai.google.dev/gemini-api/docs/pricing) |

**Notes:** Free tier available via AI Studio with rate limits. Batch API offers 50% discount. Context caching offers up to 90% savings.

---

## 3. Workflow Automation & CI/CD Tools

### n8n

| Plan | Price | Executions / mo | Users / Workflows | Notes | Source |
|------|-------|-----------------|-------------------|-------|--------|
| Self-Hosted (Community) | Free | Unlimited | Unlimited | You provide server ($4–20/mo VPS) | [n8n.io/pricing](https://n8n.io/pricing) |
| Cloud Starter | ~€20/mo (~$22) | 2,500 | Unlimited | 14-day trial, no card | [n8n.io/pricing](https://n8n.io/pricing) |
| Cloud Pro | ~€50/mo (~$55) | 10,000 | Unlimited | Annual billing saves ~17% | [n8n.io/pricing](https://n8n.io/pricing) |
| Cloud Business | ~€667/mo (~$730) | 40,000 | Unlimited | SSO, team envs; startup discount ~50% for <20 employees | [n8n.io/pricing](https://n8n.io/pricing) |
| Enterprise | Custom | Custom | Custom | Self-hosted option available | [n8n.io/pricing](https://n8n.io/pricing) |

**Key distinction:** n8n bills per **execution** (one complete workflow run), not per step. A 20-step workflow costs the same as a 1-step workflow.

### Make (Integromat)

| Plan | Price (Annual/mo) | Credits/mo | Active Scenarios | Notes | Source |
|------|-------------------|------------|------------------|-------|--------|
| Free | $0 | 1,000 | 2 | 15-min min interval | [make.com/en/pricing](https://www.make.com/en/pricing) |
| Core | ~$9–12/mo | 10,000 | Unlimited | 1-min interval, API access | [make.com/en/pricing](https://www.make.com/en/pricing) |
| Pro | ~$16–21/mo | 10,000+ | Unlimited | Priority execution, custom variables, full-text logs | [make.com/en/pricing](https://www.make.com/en/pricing) |
| Teams | ~$29–38/mo | 10,000+ | Unlimited | Roles, permissions, shared templates | [make.com/en/pricing](https://www.make.com/en/pricing) |
| Enterprise | Custom | Custom | Unlimited | SSO, SCIM, SLAs | [make.com/en/pricing](https://www.make.com/en/pricing) |

**Notes:** Make bills by **credits** (formerly "operations"). Each module execution consumes at least 1 credit. AI steps, code execution, iterators, and aggregators can consume multiple credits. Annual billing saves ~15–34% vs monthly.

### Zapier

| Plan | Price (Annual/mo) | Tasks/mo | Zaps | Notes | Source |
|------|-------------------|----------|------|-------|--------|
| Free | $0 | 100 | 5 | Two-step Zaps only; 15-min polling | [zapier.com/pricing](https://zapier.com/pricing) |
| Starter | ~$19.99–29.99/mo | 750–2,000 | 20–50 | Multi-step Zaps; webhooks | [zapier.com/pricing](https://zapier.com/pricing) |
| Professional | ~$49–73.50/mo | 5,000–20,000 | Unlimited | Unlimited premium apps; filters & paths | [zapier.com/pricing](https://zapier.com/pricing) |
| Team | ~$69–103.50/mo | 2,000+ | Unlimited | 25 users; SAML SSO | [zapier.com/pricing](https://zapier.com/pricing) |
| Enterprise | Custom | Custom | Custom | Unlimited users; advanced admin | [zapier.com/pricing](https://zapier.com/pricing) |

**Notes:** Zapier bills per **task** (each action that moves data). Triggers, filters, and built-in tools (Tables, Formatter, Delay) do not consume tasks. Overage billed at ~1.25× base rate.

### GitHub Actions

| Plan | Seat Price | Included Minutes (Linux) | Storage | Public Repos | Source |
|------|------------|--------------------------|---------|--------------|--------|
| Free | $0 | 2,000 / mo | 500 MB | Unlimited | [docs.github.com/en/billing/concepts/product-billing/github-actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions) |
| Team | $4 / user / mo | 3,000 / mo | 2 GB | Unlimited | [docs.github.com/en/billing/concepts/product-billing/github-actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions) |
| Enterprise | $21 / user / mo | 50,000 / mo | 50 GB | Unlimited | [docs.github.com/en/billing/concepts/product-billing/github-actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions) |

**Per-minute overage rates (since Jan 1, 2026):**
- Linux 2-core: **$0.006/min**
- Linux 4-core: **$0.012/min**
- Linux 8-core: **$0.022/min**
- Windows 2-core: **$0.010/min**
- macOS 3/4-core: **$0.062/min**

**Source:** [docs.github.com/billing/reference/actions-runner-pricing](https://docs.github.com/billing/reference/actions-runner-pricing)

---

## 4. Agent Frameworks & Orchestration

| Tool / Tier | Price | What's Included | Source |
|-------------|-------|-----------------|--------|
| **LangGraph** (framework) | **Free** | MIT-licensed open-source orchestration runtime; Python + JS/TS SDKs | [github.com/langchain-ai/langgraph](https://github.com/langchain-ai/langgraph) |
| **LangSmith** Developer | $0/seat | 1 seat; 5K base traces/mo; 14-day retention; **no managed deployment** | [langchain.com/pricing](https://www.langchain.com/pricing) |
| LangSmith Plus | $39/seat/mo | Unlimited seats; 10K base traces/mo; 1 free small serverless deployment; 500 Fleet runs/mo | [langchain.com/pricing](https://www.langchain.com/pricing) |
| LangSmith Enterprise | Custom | Self-hosted/hybrid; SSO; audit; SLAs; dedicated support | [langchain.com/pricing](https://www.langchain.com/pricing) |
| LangSmith Trace Overage | $2.50 / 1K base traces | 14-day retention; $5.00 / 1K extended (400-day) | [docs.langchain.com/langsmith/billing](https://docs.langchain.com/langsmith/billing) |
| LangSmith Deployment | $0.005 / run | Dev uptime: $0.0007/min; Prod uptime: $0.0036/min; Fleet overage: $0.05/run | [docs.langchain.com/langsmith/billing](https://docs.langchain.com/langsmith/billing) |

**Other open-source orchestration options (free):**
- **Temporal** (Apache 2.0): Durable workflow engine
- **Prefect** (free tier + open source)
- **Apache Airflow** (Apache 2.0)
- **Camunda 8** (community edition)
- **Mastra** (open-source agent/workflow primitives)

---

## 5. Benchmark: What Solo Devs & Teams Actually Spend in 2026

### Published Figures & Surveys

| Source | Finding | URL |
|--------|---------|-----|
| **Cohrint (Q1 2026, 200+ teams)** | Avg Claude Code spend: **$340/dev/mo**; Gemini CLI: **$120/dev/mo**; 3.2× variance between highest/lowest spenders | [cohrint.com/blog/ai-coding-cost-benchmarks-2026](https://cohrint.com/blog/ai-coding-cost-benchmarks-2026) |
| **Pragmatic Engineer (April 2026, 900+ engineers)** | Companies funding "Max" plans at **$100–200/engineer/mo**; ~30% hit monthly limits; ~15% cite cost as serious concern | [hitechies.com/ai-developer-tools-cost-roi-budget-2026](https://www.hitechies.com/ai-developer-tools-cost-roi-budget-2026) |
| **Cerver (June 2026)** | Heavy teams report **$500–2,000/dev/mo** on AI coding; 40–85% cost cut possible via model routing; ~30% realistic savings | [cerver.ai/report](https://cerver.ai/report) |
| **DX (Nov 2025, 50 engineering leaders)** | 38.4% spent $101–500/dev/year in 2025; 10.5% spent $501–1,000/dev/year; 10.5% spent >$1,000/dev/year. 2026 target: **$1,000/dev/year** (~$83/mo) | [newsletter.getdx.com/p/how-much-should-you-spend-on-ai-tools-in-engineering](https://newsletter.getdx.com/p/how-much-should-you-spend-on-ai-tools-in-engineering) |
| **Digital Applied (Q1 2026, 2,847 devs)** | Agencies median seat spend: **$63/mo**; In-house teams median: **$100/mo** | [digitalapplied.com/blog/ai-coding-tool-adoption-2026-developer-survey](https://www.digitalapplied.com/blog/ai-coding-tool-adoption-2026-developer-survey) |
| **Anthropic (published)** | Average Claude Code cost: **$150–250/developer/mo**; power users far above | [morphllm.com/ai-coding-costs](https://www.morphllm.com/ai-coding-costs) |
| **Solopreneur guides (2026)** | Typical solopreneur AI stack: **$75–200/mo**; sweet spot **$100–150/mo** | [greyjournal.net/hustle/best-ai-tools-solopreneurs-2026](https://greyjournal.net/hustle/best-ai-tools-solopreneurs-2026) |
| **ONEPC / Pragmatic Engineer** | 95% of devs use AI weekly; 75% use AI for half their work; Claude Code + Cursor lead primary adoption | [onepc.org/stats/ai-stack-solo-founders-2026](https://onepc.org/stats/ai-stack-solo-founders-2026) |

---

## 6. Recommended Monthly Budget Scenarios

**Project context:** Single-operator AI-agent dev team building an e-commerce PoC. No paid human developers. Heavy reliance on AI agents for code generation, review, testing, and deployment automation.

### Scenario A — Lean / Bootstrapped ($45–65/mo)

| Category | Tool Choice | Monthly Cost |
|----------|-------------|--------------|
| AI Coding IDE | Cursor Pro or Windsurf Pro | $20 |
| AI Assistant (general) | Claude Pro or ChatGPT Plus | $20 |
| Automation | n8n self-hosted on $5 VPS OR Make Free | $5–10 |
| CI/CD | GitHub Actions (Free tier, 2K min) | $0 |
| Orchestration | LangGraph (self-hosted) + LangSmith Developer (free) | $0 |
| **Total** | | **$45–65/mo** |

**Justification:** Works for a PoC where the human operator reviews all AI output. Free tiers and self-hosted tools cap risk. Cursor Pro / Windsurf Pro provide unlimited autocomplete plus a $20 credit pool for premium models. Claude Pro covers reasoning and agentic coding via Claude Code. GitHub Actions free tier handles CI for small private repos. n8n self-hosted removes execution limits for workflow automation.

### Scenario B — Balanced / Professional ($120–160/mo)

| Category | Tool Choice | Monthly Cost |
|----------|-------------|--------------|
| AI Coding IDE | Cursor Pro+ or Windsurf Max | $60–200 |
| AI Assistant | Claude Pro + API buffer | $20–40 |
| Automation | n8n Cloud Pro OR Make Pro | $50–60 |
| CI/CD | GitHub Actions (Team plan + buffer) | $4–15 |
| Orchestration | LangSmith Plus (1 seat) | $39 |
| **Total** | | **$120–160/mo** |

**Justification:** Upgrading to Cursor Pro+ ($60) or staying on Windsurf Pro with add-on quota (~$20–40 overage) gives enough credits for daily agentic work. Claude API buffer ($20–40) covers unattended automation runs. n8n Cloud Pro or Make Pro removes execution/credit limits for production automations. LangSmith Plus adds tracing and evals for agent debugging. GitHub Actions Team plan provides 3K minutes + headroom.

### Scenario C — High-Volume / Agent-Heavy ($280–400/mo)

| Category | Tool Choice | Monthly Cost |
|----------|-------------|--------------|
| AI Coding IDE | Cursor Ultra or Windsurf Max | $200 |
| AI Assistant | Claude Max 5× or API pay-as-you-go | $100–150 |
| Automation | n8n Cloud Business OR Make Teams + credits | $60–80 |
| CI/CD | GitHub Actions (Team + overage) | $15–40 |
| Orchestration | LangSmith Plus + Deployment runs | $39 + usage |
| **Total** | | **$280–400/mo** |

**Justification:** For intensive agentic coding where multiple background agents run in parallel. Cursor Ultra / Windsurf Max provides 20× the credit pool. Claude Max 5× ($100) or direct API (~$100–150) sustains high-volume unattended agent runs. n8n Business or Make Teams handles high-frequency automations. LangSmith Plus with Deployment traces agent execution for production debugging. This aligns with published benchmarks where heavy AI-first teams spend $200–2,000/dev/mo.

---

## 7. Cost Optimization Levers

1. **Model routing:** Route 80% of routine tasks to Haiku 4.5 / Gemini 2.5 Flash / GPT-5 Mini. Reserve Opus / GPT-5.6 Sol for complex reasoning. Real-world benchmarks show **30–50% savings**.
2. **Prompt caching:** Anthropic and OpenAI both offer 90% cache-read discounts. Repeating codebase context across agent runs cuts input costs dramatically.
3. **Batch API:** Both Anthropic and OpenAI offer **50% off** for async batch jobs. Use for non-interactive code generation, tests, and documentation.
4. **Self-host execution:** n8n Community Edition + a $5 VPS removes per-execution metering entirely.
5. **Free tiers first:** GitHub Copilot Free (2K completions), Make Free (1K credits), n8n self-hosted, LangGraph open source, and GitHub Actions (2K min) can cover a PoC at **$0** before any paid tier is needed.
6. **Subscription vs API:** For predictable heavy use, flat subscriptions (Claude Max, Cursor Ultra, Windsurf Max) often beat pay-per-token. For variable or unattended workloads, BYOK API keys at list price with budget caps are safer.

---

## 8. Source Index

| # | Source | URL |
|---|--------|-----|
| 1 | Anthropic Claude Pricing | https://platform.claude.com/docs/en/about-claude/pricing |
| 2 | Anthropic Consumer Plans | https://claude.com/pricing |
| 3 | GitHub Copilot Plans | https://github.com/features/copilot/plans |
| 4 | GitHub Copilot Docs | https://docs.github.com/en/copilot/get-started/plans |
| 5 | Cursor Pricing | https://cursor.com/pricing |
| 6 | Windsurf Pricing | https://windsurf.com/pricing |
| 7 | Kilo Code Pricing | https://kilo.ai/pricing |
| 8 | Kilo Inference Options | https://kilo.ai/inference |
| 9 | OpenAI API Pricing | https://developers.openai.com/api/docs/pricing |
| 10 | Google Gemini Pricing | https://ai.google.dev/gemini-api/docs/pricing |
| 11 | n8n Pricing | https://n8n.io/pricing |
| 12 | Make Pricing | https://www.make.com/en/pricing |
| 13 | Zapier Pricing | https://zapier.com/pricing |
| 14 | GitHub Actions Billing | https://docs.github.com/en/billing/concepts/product-billing/github-actions |
| 15 | GitHub Actions Runner Pricing | https://docs.github.com/billing/reference/actions-runner-pricing |
| 16 | LangChain / LangSmith Pricing | https://www.langchain.com/pricing |
| 17 | LangSmith Billing Docs | https://docs.langchain.com/langsmith/billing |
| 18 | Cohrint Benchmark | https://cohrint.com/blog/ai-coding-cost-benchmarks-2026 |
| 19 | Pragmatic Engineer Survey | https://www.hitechies.com/ai-developer-tools-cost-roi-budget-2026 |
| 20 | Cerver State of AI-Coding Spend | https://cerver.ai/report |
| 21 | DX Engineering Budget Survey | https://newsletter.getdx.com/p/how-much-should-you-spend-on-ai-tools-in-engineering |
| 22 | Digital Applied Developer Survey | https://www.digitalapplied.com/blog/ai-coding-tool-adoption-2026-developer-survey |
| 23 | Grey Journal Solopreneur Stack | https://greyjournal.net/hustle/best-ai-tools-solopreneurs-2026 |
| 24 | ONEPC Solo Founder AI Stack | https://onepc.org/stats/ai-stack-solo-founders-2026 |

---

## 9. Bottom-Line Recommendation

For a **single-operator AI-agent dev team** building an e-commerce PoC:

- **Start with Scenario A ($45–65/mo).** Use Cursor Pro or Windsurf Pro ($20), Claude Pro ($20), self-hosted n8n ($5–10), and free GitHub Actions / LangGraph.
- **Upgrade to Scenario B ($120–160/mo)** when you need reliable automations, agent tracing, and higher model throughput.
- **Reserve Scenario C ($280–400/mo)** for production agent fleets, not PoC validation.

The most important lever is **model routing**: defaulting every agent call to Opus or GPT-5.6 Sol is the fastest way to 5–10× your bill. Route to Flash/Haiku/Mini for 80% of routine work, and spend on frontier models only where reasoning quality changes the outcome.
