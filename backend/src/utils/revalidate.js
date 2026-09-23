// One-way hook: backend mutations → storefront on-demand ISR invalidation
// (ADR 007 §Decision 1). Fire-and-forget by design: a hook failure must never
// block or fail the admin mutation — the ISR TTL is the backstop.

const config = require("../config");

// A hung storefront must not pin the mutation's event loop for undici's
// default 300s timeout; 3s bounds one attempt per mutation.
const TIMEOUT_MS = 3000;

async function revalidateStorefront(tags) {
  const url = config.storefront.revalidateUrl;
  const secret = config.storefront.revalidateSecret;
  if (!url || !secret) return { skipped: true };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-revalidate-secret": secret,
      },
      body: JSON.stringify({ tags }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`[revalidate] HTTP ${res.status} для тегов ${tags.join(",")}`);
      return { ok: false };
    }
    return { ok: true };
  } catch (err) {
    console.error(`[revalidate] ${err.message}`);
    return { ok: false };
  }
}

module.exports = { revalidateStorefront, TIMEOUT_MS };
