import { assertServerConfig } from "@/config";

/**
 * Next.js instrumentation hook — runs once on server start (and during the
 * build's static generation). A missing/invalid API_BASE or SITE_URL in a
 * production build aborts startup here so the deploy fails loudly, instead of
 * every page silently degrading to "каталог недоступен" / 404 while CI and the
 * health check stay green.
 */
export async function register() {
  assertServerConfig();
}
