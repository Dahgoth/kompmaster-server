/**
 * Build/runtime configuration.
 * - Server (RSC/route handlers): absolute API_BASE, baked at build.
 * - Browser islands: same-origin /api proxied by next.config.ts rewrites —
 *   the browser bundle must NEVER read API_BASE (it is undefined client-side
 *   after inlining; the crash "API_BASE is required for production builds"
 *   in E2E proved that). apiBase access is guarded: reading it in the
 *   browser throws with a message that names the fix.
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

class ClientConfigProxy {
  /** Absolute base for server-side (RSC) fetches. Browser access = bug. */
  get apiBase(): string {
    if (typeof window !== "undefined") {
      throw new Error(
        "config.apiBase is server-only — browser code must use config.clientApiBase (same-origin /api)",
      );
    }
    return apiBase();
  }

  /** Same-origin base for browser islands (proxied by rewrites). */
  readonly clientApiBase = "/api";

  get siteUrl(): string {
    return clean(process.env.SITE_URL) || "https://www.compmasone.ru";
  }

  get revalidateSecret(): string {
    return process.env.REVALIDATE_SECRET ?? "";
  }

  get indexNowKey(): string {
    return process.env.INDEXNOW_KEY ?? "";
  }

  get metrikaId(): string | null {
    return process.env.METRIKA_ID ?? null;
  }
}

/**
 * Test hook (TDD seam): lets the jsdom test module evaluate the server-side
 * resolution without a real server. Production code must never call this —
 * browser code uses config.clientApiBase; server code reads config.apiBase
 * normally. Exported for tests/config.test.ts only.
 *
 * @internal
 */
export function __resolveApiBaseForTests(): string {
  return apiBase();
}

export const config = new ClientConfigProxy();
