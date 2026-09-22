import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest, buildHeaders } from "@/api/client";
import { z } from "zod";

const schema = z.object({ ok: z.boolean() });

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("apiRequest", () => {
  it("parses a successful response through the schema", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ ok: true })),
    );
    await expect(apiRequest(schema, "GET", "/categories")).resolves.toEqual({
      ok: true,
    });
  });

  it("throws ApiError with the backend error string on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ error: "Товар не найден" }, { status: 404 })),
    );
    await expect(apiRequest(schema, "GET", "/products/x")).rejects.toMatchObject({
      name: "ApiError",
      status: 404,
      message: "Товар не найден",
    });
  });

  it("falls back to the status line when the error body is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("Bad Gateway", { status: 502 })),
    );
    await expect(apiRequest(schema, "GET", "/x")).rejects.toMatchObject({
      status: 502,
      message: "HTTP 502",
    });
  });

  it("normalizes network failures to ApiError status 0", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    await expect(apiRequest(schema, "GET", "/x")).rejects.toMatchObject({
      status: 0,
    });
  });

  it("validates the response shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ ok: "yes" })),
    );
    await expect(apiRequest(schema, "GET", "/x")).rejects.toThrow();
  });
});

describe("buildHeaders", () => {
  it("sends the admin panel token as X-Admin-Panel-Token", () => {
    window.localStorage.setItem("km_admin_panel_token", "admin-jwt");
    const headers = buildHeaders("admin") as Record<string, string>;
    expect(headers["X-Admin-Panel-Token"]).toBe("admin-jwt");
    expect(headers["Authorization"]).toBeUndefined();
  });

  it("sends the auth token as Bearer for the user scope", () => {
    window.localStorage.setItem("km_auth_token", "user-jwt");
    const headers = buildHeaders("user") as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer user-jwt");
    expect(headers["X-Admin-Panel-Token"]).toBeUndefined();
  });

  it("sends no auth headers for public scope even if tokens exist", () => {
    window.localStorage.setItem("km_auth_token", "user-jwt");
    window.localStorage.setItem("km_admin_panel_token", "admin-jwt");
    const headers = buildHeaders("public") as Record<string, string>;
    expect(headers["Authorization"]).toBeUndefined();
    expect(headers["X-Admin-Panel-Token"]).toBeUndefined();
  });

  it("sends no auth headers when tokens are absent", () => {
    const headers = buildHeaders("user") as Record<string, string>;
    expect(headers["Authorization"]).toBeUndefined();
    expect(headers["Content-Type"]).toBe("application/json");
  });
});

describe("buildUrl", () => {
  it("targets the same-origin proxy in the browser", async () => {
    const { buildUrl } = await import("@/api/client");
    // jsdom defines window: the browser branch must never touch the
    // server-only apiBase getter (it throws by design).
    expect(buildUrl("/auth/login")).toBe("/api/auth/login");
    expect(buildUrl("products/x")).toBe("/api/products/x");
  });
});
