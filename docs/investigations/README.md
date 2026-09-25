# Investigations

This directory contains technical investigation reports for production issues, performance analysis, and debugging efforts.

## Structure

Each investigation is organized in a dated directory following the pattern:
```
YYYY-MM-DD-short-description/
├── report.md          # Main investigation report
├── evidence/          # Supporting artifacts
│   ├── *.png          # Screenshots
│   ├── *.json         # Raw data/analysis results
│   └── *.html         # Captured page content
└── scripts/           # Reproducible investigation scripts
    └── *.py, *.js     # Playwright, curl, or other automation
```

## Naming Convention

- Directory: `YYYY-MM-DD-kebab-case-description`
- Report: `report.md` (always)
- Evidence: descriptive names matching report references
- Scripts: descriptive names matching investigation method

## Current Investigations

| Date | Description | Report |
|------|-------------|--------|
| 2026-09-25 | compmasone.ru 404 errors on static assets | [2026-09-25-compmasone-404-errors/report.md](2026-09-25-compmasone-404-errors/report.md) |

## Best Practices

1. **Never commit sensitive data** (secrets, credentials, real user data)
2. **Include reproduction steps** in every report
3. **Archive evidence** (screenshots, logs, JSON) alongside the report
4. **Version control scripts** used for investigation
5. **Reference related issues/PRs** in the report header
6. **Keep reports focused** — one issue per investigation directory

## GitHub Flow Integration

- Create investigation directory on a feature branch
- Reference in PR description: "Investigation: docs/investigations/YYYY-MM-DD-.../report.md"
- Merge investigation with fix PR or keep as reference documentation
- Archive superseded investigations in `archive/` subdirectory