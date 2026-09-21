/**
 * Build/runtime configuration. Values are resolved at build time (R2):
 * `API_BASE` is baked by the deploy pipeline; server-side fetches use it
 * directly, client islands call the same-origin rewrites configured in
 * next.config.ts when it lands.
 */
function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    // Dev default; production builds set API_BASE explicitly (RUNBOOK §4.4).
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Missing required env: ${name}`);
    }
    return "/api";
  }
  return value.replace(/\/+$/, "");
}

export const config = {
  apiBase: requiredEnv("API_BASE"),
  metrikaId: process.env.METRIKA_ID ?? null,
} as const;
