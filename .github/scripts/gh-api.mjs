#!/usr/bin/env node
// Minimal GitHub REST client for the deploy workflow.
//
// The self-hosted runner has node + curl + rsync + pm2, but NOT gh and NOT
// jq — verified 2026-10-02. Every `gh api` and `jq` call in deploy.yml was
// therefore guaranteed to fail on the first release, and it did: v2.4.4 failed
// at the idempotency guard with `Failed to resolve tag commit SHA`, which was
// gh not existing. Rather than install two tools on the runner — recreating
// the same hidden host dependency that just broke — this uses node 18+'s
// global fetch, which is already required to run the storefront itself.
//
// Usage:
//   node .github/scripts/gh-api.mjs <method> <path> [--input <file|->] [--jq <path>]
// Prints the response body, or the value at --jq. Exits non-zero with the API
// message on error, so callers do not need to guess what went wrong.

const [, , method, path, ...rest] = process.argv;

function flag(name) {
  const i = rest.indexOf(name);
  return i === -1 ? undefined : rest[i + 1];
}

if (!method || !path) {
  console.error("usage: gh-api.mjs <method> <path> [--input <file|->] [--jq <path>]");
  process.exit(2);
}

const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (!token) {
  console.error("gh-api.mjs: GH_TOKEN/GITHUB_TOKEN is not set");
  process.exit(2);
}

const jqPath = flag("--jq");
const input = flag("--input");
let body;

if (input) {
  // Read the full body as a stream. Accumulating chunks in an array and
  // concatenating is what breaks at multi-megabyte payloads; a pipe buffer
  // truncates silently at 64 KiB and JSON.parse then fails on a body that is
  // not actually malformed.
  body =
    input === "-"
      ? await new Response(process.stdin).text()
      : await (await import("node:fs/promises")).readFile(input, "utf8");
}

const url = path.startsWith("http") ? path : `https://api.github.com${path}`;

let res;
try {
  res = await fetch(url, {
    method: method.toUpperCase(),
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body,
  });
} catch (err) {
  // Network/DNS/TLS failures surface here; report them rather than dying
  // silently the way `gh api 2>&1` inside a command substitution did.
  console.error(`gh-api.mjs: request to ${url} failed: ${err.message}`);
  process.exit(1);
}

const text = await res.text();

if (!res.ok) {
  // Include the API's own message. The old guard discarded stderr into a
  // variable that was never printed, so the only clue was a generic
  // "Failed to resolve tag commit SHA" with no cause.
  let detail = text;
  try {
    detail = JSON.parse(text).message ?? text;
  } catch {}
  console.error(
    `gh-api.mjs: ${res.status} ${res.statusText} for ${method.toUpperCase()} ${path}: ${detail}`,
  );
  process.exit(1);
}

if (!jqPath) {
  process.stdout.write(text.endsWith("\n") ? text : text + "\n");
  process.exit(0);
}

try {
  const value = jqPath
    .replace(/^\./, "")
    .split(".")
    .reduce((acc, k) => (acc == null ? acc : acc[k]), JSON.parse(text));
  if (value === undefined) {
    console.error(`gh-api.mjs: no value at ${jqPath} in response`);
    process.exit(1);
  }
  process.stdout.write(String(value) + "\n");
} catch (err) {
  console.error(`gh-api.mjs: could not read ${jqPath}: ${err.message}`);
  process.exit(1);
}
