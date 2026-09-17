#!/usr/bin/env node
// Propagate the workspace root version to the app manifests. Run this after
// bumping package.json#version and before tagging a release, then commit the
// result. Enforcement lives in scripts/check-versions.js (CI + pre-push).
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const rootPkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const version = rootPkg.version;

if (!version || typeof version !== "string") {
  console.error("[version:sync] root package.json has no valid version");
  process.exit(1);
}

for (const rel of ["backend/package.json", "frontend/package.json"]) {
  const file = path.join(root, rel);
  const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
  if (pkg.version === version) {
    console.log(`[version:sync] ${rel} already at ${version}`);
    continue;
  }
  pkg.version = version;
  fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`[version:sync] ${rel} -> ${version}`);
}

console.log(`[version:sync] done (${version})`);
