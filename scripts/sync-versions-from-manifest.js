#!/usr/bin/env node
// Sync package.json versions from release-please manifest
// Reads .release-please-manifest.json and updates package.json files

const fs = require("fs");
const path = require("path");

const manifestPath = path.resolve(__dirname, ".release-please-manifest.json");
const rootPkgPath = path.resolve(__dirname, "package.json");
const backendPkgPath = path.resolve(__dirname, "backend/package.json");
const frontendPkgPath = path.resolve(__dirname, "frontend/package.json");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + "\n");
}

try {
  const manifest = readJson(manifestPath);

  // Update root package.json
  const rootPkg = readJson(rootPkgPath);
  if (manifest.kompmaster && manifest.kompmaster !== rootPkg.version) {
    console.log(`Root: ${rootPkg.version} -> ${manifest.kompmaster}`);
    rootPkg.version = manifest.kompmaster;
    writeJson(rootPkgPath, rootPkg);
  }

  // Update backend package.json
  const backendPkg = readJson(backendPkgPath);
  if (manifest["kompmaster-server"] && manifest["kompmaster-server"] !== backendPkg.version) {
    console.log(`Backend: ${backendPkg.version} -> ${manifest["kompmaster-server"]}`);
    backendPkg.version = manifest["kompmaster-server"];
    writeJson(backendPkgPath, backendPkg);
  }

  // Update frontend package.json
  const frontendPkg = readJson(frontendPkgPath);
  if (manifest["kompmaster-frontend"] && manifest["kompmaster-frontend"] !== frontendPkg.version) {
    console.log(`Frontend: ${frontendPkg.version} -> ${manifest["kompmaster-frontend"]}`);
    frontendPkg.version = manifest["kompmaster-frontend"];
    writeJson(frontendPkgPath, frontendPkg);
  }

  console.log("Version sync from manifest complete");
} catch (err) {
  console.error("Error syncing versions:", err.message);
  process.exit(1);
}
