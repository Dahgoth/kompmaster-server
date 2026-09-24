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
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    const error = new Error(`Failed to read ${file}: ${err.message}`);
    error.cause = err;
    throw error;
  }
}

function writeJson(file, obj) {
  try {
    fs.writeFileSync(file, JSON.stringify(obj, null, 2) + "\n");
  } catch (err) {
    const error = new Error(`Failed to write ${file}: ${err.message}`);
    error.cause = err;
    throw error;
  }
}

try {
  const manifest = readJson(manifestPath);

  // Validate required packages in manifest
  const required = ["kompmaster", "kompmaster-server", "kompmaster-frontend"];
  for (const pkg of required) {
    if (!manifest[pkg]) {
      throw new Error(`Missing version for ${pkg} in manifest`);
    }
  }

  // Update root package.json
  const rootPkg = readJson(rootPkgPath);
  if (manifest.kompmaster !== rootPkg.version) {
    console.log(`Root: ${rootPkg.version} -> ${manifest.kompmaster}`);
    rootPkg.version = manifest.kompmaster;
    writeJson(rootPkgPath, rootPkg);
  }

  // Update backend package.json
  const backendPkg = readJson(backendPkgPath);
  if (manifest["kompmaster-server"] !== backendPkg.version) {
    console.log(`Backend: ${backendPkg.version} -> ${manifest["kompmaster-server"]}`);
    backendPkg.version = manifest["kompmaster-server"];
    writeJson(backendPkgPath, backendPkg);
  }

  // Update frontend package.json
  const frontendPkg = readJson(frontendPkgPath);
  if (manifest["kompmaster-frontend"] !== frontendPkg.version) {
    console.log(`Frontend: ${frontendPkg.version} -> ${manifest["kompmaster-frontend"]}`);
    frontendPkg.version = manifest["kompmaster-frontend"];
    writeJson(frontendPkgPath, frontendPkg);
  }

  console.log("Version sync from manifest complete");
} catch (err) {
  console.error(`Error syncing versions: ${err.message}`);
  process.exit(1);
}
