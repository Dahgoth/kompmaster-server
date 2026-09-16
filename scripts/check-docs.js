#!/usr/bin/env node
// scripts/check-docs.js — enforce the docs-in-sync hard rule (AGENTS.md §6,
// CONTRIBUTING.md "Documentation you must keep in sync").
//
// Usage:
//   node scripts/check-docs.js <changed-file> [<changed-file> ...]
//   node scripts/check-docs.js --base <git-ref>        # diff <ref>...HEAD
//   node scripts/check-docs.js --staged                # --cached diff
//
// Exit 0 when every touched domain has its doc updated in the same change
// set; otherwise prints the missing updates and exits 1.

"use strict";

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");

// --- path classifiers (repo-root-relative) ---
const isBackendCode = (f) =>
  f.startsWith("src/") ||
  f.startsWith("tests/") ||
  f.startsWith("migrations/");
const isBackendWorkflowFile = (f) =>
  ["package.json", "package-lock.json", "docker-compose.yml", "Caddyfile"].includes(f) ||
  f.startsWith("scripts/");
const isFrontendCode = (f) =>
  f.startsWith("frontend/") && !f.startsWith("frontend/terraform/");
const isFrontendWorkflowFile = (f) =>
  ["frontend/package.json", "frontend/package-lock.json", "frontend/vite.config.js"].includes(f);
const isTerraformCode = (f) =>
  f.startsWith("terraform/") || f.startsWith("frontend/terraform/");
const isPublicAsset = (f) => f.startsWith("public/");
const isRoute = (f) => f.startsWith("src/routes/");
const isFrontendPage = (f) =>
  f.startsWith("frontend/src/pages/") ||
  f.startsWith("frontend/src/components/") ||
  f === "frontend/index.html";
const isFrontendStyle = (f) =>
  f.startsWith("frontend/src/styles/") ||
  f === "frontend/src/data/content.js";

const ENV_FILES = new Set([
  "src/config.js",
  ".env.example",
  "docker-compose.yml",
  "Caddyfile",
]);

function changedFiles(argv) {
  if (argv.includes("--staged")) {
    return gitDiff(["diff", "--cached", "--name-only", "--diff-filter=ACMR"]);
  }
  const baseIdx = argv.indexOf("--base");
  if (baseIdx !== -1) {
    const ref = argv[baseIdx + 1];
    if (!ref) throw new Error("--base requires a git ref argument");
    return gitDiff(["diff", "--name-only", `${ref}...HEAD`]);
  }
  return argv.filter((a) => !a.startsWith("-"));
}

// Returns { need: string[], touched: Set<string> }.
function classify(files) {
  const need = new Set();
  const touched = new Set(files);

  const backendTouched = files.some((f) => isBackendCode(f) || isBackendWorkflowFile(f));
  const frontendTouched = files.some((f) => isFrontendCode(f) || isFrontendWorkflowFile(f));
  const terraformTouched = files.some(isTerraformCode);
  const publicTouched = files.some(isPublicAsset);

  // Config surface -> ENVIRONMENT.md
  if (files.some((f) => ENV_FILES.has(f))) need.add("ENVIRONMENT.md");

  // Dev workflow surface -> DEVELOPMENT.md (only for workflow/tooling files
  // or actual code changes — not for pure doc edits)
  if (
    files.some(
      (f) =>
        isBackendWorkflowFile(f) ||
        isFrontendWorkflowFile(f) ||
        f === ".husky/pre-push" ||
        f === ".github/workflows/ci.yml" ||
        f === "scripts/check-docs.js"
    ) ||
    backendTouched ||
    frontendTouched ||
    terraformTouched
  ) {
    need.add("DEVELOPMENT.md");
  }

  // UX/visual surface -> DESIGN.md
  if (
    publicTouched ||
    files.some((f) => isFrontendStyle(f) || isFrontendPage(f)) ||
    touched.has("DESIGN.md")
  ) {
    need.add("DESIGN.md");
  }

  // User-facing behavior -> CHANGELOG.md (routes, pages, public assets)
  if (files.some((f) => isRoute(f) || isFrontendPage(f) || isPublicAsset(f))) {
    need.add("CHANGELOG.md");
  }

  // Area READMEs
  if (frontendTouched) need.add("frontend/README.md");
  if (terraformTouched) need.add("terraform/README.md");

  return { need: [...need], touched };
}

function gitDiff(args) {
  try {
    return execFileSync("git", args, { encoding: "utf8" })
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function main(argv) {
  const files = changedFiles(argv);
  if (!files.length) {
    console.log("[check-docs] no changed files — nothing to check.");
    return 0;
  }
  const { need, touched } = classify(files);
  const missing = need.filter((doc) => !touched.has(doc));

  // CHANGELOG counts only if the [Unreleased] section is non-empty.
  if (need.includes("CHANGELOG.md") && touched.has("CHANGELOG.md")) {
    try {
      const body = fs.readFileSync("CHANGELOG.md", "utf8");
      const unreleased = body.split("## [Unreleased]")[1]?.split(/^## /m)[0] ?? "";
      if (!unreleased.trim()) missing.push("CHANGELOG.md (empty [Unreleased])");
    } catch {
      missing.push("CHANGELOG.md (unreadable)");
    }
  }

  const uniqueMissing = [...new Set(missing)];
  if (uniqueMissing.length) {
    console.error("[check-docs] FAIL: docs-in-sync rule violated for this change set:");
    for (const doc of uniqueMissing) console.error(`  - missing update to ${doc}`);
    console.error(`  changed files: ${files.join(", ")}`);
    console.error("  See AGENTS.md rule 6 / CONTRIBUTING.md docs table.");
    return 1;
  }
  console.log(`[check-docs] OK (${files.length} file(s), all required docs touched).`);
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (err) {
    console.error(`[check-docs] ERROR: ${err.message}`);
    process.exit(1);
  }
}

module.exports = { classify };
