import { ConfigError } from "@/config";

/**
 * Server-render error gate. Every page/route that fetches catalog data
 * degrades gracefully on a *transient* API failure (the ISR cache serves the
 * last good page, or the route 404s) — but a ConfigError means the deployment
 * itself is misconfigured, and degrading would ship an empty storefront with a
 * green build. Rethrow those so the failure is loud.
 *
 * Usage: catch (err) { rethrowIfMisconfigured(err); then degrade }
 */
export function rethrowIfMisconfigured(error: unknown): void {
  if (error instanceof ConfigError) throw error;
}
