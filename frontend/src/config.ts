/**
 * Build/runtime configuration. Values are resolved at build time (R2):
 * `API_BASE` is baked by the deploy pipeline for SERVER-side fetches.
 * Browser islands always call the same-origin `/api` (proxied to the
 * backend by next.config.ts rewrites) — no CORS surface for client fetches.
 */
function clean(value: string | undefined): string | undefined {
  return value && value.trim() !== "" ? value.replace(/\/+$/, "") : undefined;
}

function apiBase(): string {
  const value = process.env.API_BASE;
  if (value && value.trim() !== "") return value.replace(/\/+$/, "");
  if (process.env.NODE_ENV === "production") {
    // Fail closed at build (RUNBOOK §4.4 lesson: a missing base produced a
    // broken deploy). Dev builds fall through to the local backend.
    throw new Error(
      "API_BASE is required for production builds (e.g. https://api.compmasone.ru/api)",
    );
  }
  return "http://localhost:4000/api";
}

export const config = {
  /** Absolute base for server-side (RSC) fetches. */
  apiBase: apiBase(),
  /** Same-origin base for browser islands (proxied by rewrites). */
  clientApiBase: "/api",
  siteUrl: clean(process.env.SITE_URL) || "https://www.compmasone.ru",
  // On-demand ISR invalidation (ADR 007): backend mutations POST tags here
  // with the shared secret. Unset disables the route (401) — supported mode.
  revalidateSecret: process.env.REVALIDATE_SECRET ?? "",
  indexNowKey: process.env.INDEXNOW_KEY ?? "",
  metrikaId: process.env.METRIKA_ID ?? null,
} as const;
