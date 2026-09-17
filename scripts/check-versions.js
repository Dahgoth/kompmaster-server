#!/usr/bin/env node
// Version guard: the workspace root package.json#version is the single source
// of truth, and every workspace app must match it. CI and the Husky pre-push
// hook run this so a mismatched backend/frontend pair can never be merged or
// pushed. See docs/adr/003-monorepo-workspace-and-versioning.md.
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const manifests = [
  { label: "root", file: path.join(root, "package.json") },
  { label: "backend", file: path.join(root, "backend", "package.json") },
  { label: "frontend", file: path.join(root, "frontend", "package.json") },
];

function readVersion(file) {
  return JSON.parse(fs.readFileSync(file, "utf8")).version;
}

const expected = readVersion(manifests[0].file);
const mismatches = manifests
  .slice(1)
  .map((m) => ({ ...m, version: readVersion(m.file) }))
  .filter((m) => m.version !== expected);

if (mismatches.length > 0) {
  console.error(`[version:check] root package.json version is ${expected}`);
  for (const m of mismatches) {
    console.error(
      `[version:check] ${m.label} (${path.relative(root, m.file)}) is ${m.version}`
    );
  }
  console.error(
    "[version:check] run `pnpm run version:sync` after bumping the root version."
  );
  process.exit(1);
}

console.log(`[version:check] OK — backend and frontend are at ${expected}`);
