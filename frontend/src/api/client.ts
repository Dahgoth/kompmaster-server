import type { ZodType } from "zod";
import { config } from "@/config";

/**
 * Typed fetch wrapper over the modular Express API (plan §4).
 * - User routes: Bearer JWT in the Authorization header.
 * - Admin routes: the second-factor panel token in X-Admin-Panel-Token.
 * All non-2xx responses normalize into ApiError{status, message} — the
 * backend error strings are user-facing Russian copy and are rendered as-is.
 * HTTP codes are never sniffed out of message strings (v1 bug, api.js:88).
 */

export const STORAGE_KEYS = {
  authToken: "km_auth_token",
  adminPanelToken: "km_admin_panel_token",
  user: "km_user",
  cart: "km_cart",
} as const;

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export type AuthScope = "public" | "user" | "admin";

export interface RequestOptions {
  scope?: AuthScope;
  body?: unknown;
  signal?: AbortSignal;
  /** Next.js server fetch cache directives; ignored by browser fetch. */
  next?: { revalidate?: number | false; tags?: string[] };
}

function readToken(scope: AuthScope): string | null {
  if (typeof window === "undefined" || scope === "public") return null;
  const key = scope === "admin" ? STORAGE_KEYS.adminPanelToken : STORAGE_KEYS.authToken;
  return window.localStorage.getItem(key);
}

export function buildUrl(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${config.apiBase}${clean}`;
}

export function buildHeaders(scope: AuthScope): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = readToken(scope);
  if (!token) return headers;
  if (scope === "admin") {
    headers["X-Admin-Panel-Token"] = token;
  } else {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Single request primitive. `schema` validates every response at the
 * boundary. Throws ApiError on non-2xx; never returns a bare error shape.
 */
export async function apiRequest<T>(
  schema: ZodType<T>,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { scope = "public", body, signal, next } = options;
  const init: RequestInit & { next?: RequestOptions["next"] } = {
    method,
    headers: buildHeaders(scope),
    signal,
    next,
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path), init);
  } catch (err) {
    throw new ApiError(0, err instanceof Error ? err.message : "Ошибка сети, попробуйте позже");
  }

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const data: unknown = await response.json();
      if (
        data !== null &&
        typeof data === "object" &&
        "error" in data &&
        typeof (data as { error: unknown }).error === "string"
      ) {
        message = (data as { error: string }).error;
      }
    } catch {
      // non-JSON error body — keep the status-line message
    }
    throw new ApiError(response.status, message);
  }

  const json: unknown = await response.json();
  return schema.parse(json);
}
