import { describe, it } from "node:test";
import assert from "node:assert/strict";

// NOTE: import.meta.env is undefined under plain node, so frontend config.js
// falls back to "/api" — exactly the assertion below.
import { matchRoute, routes } from "../src/router.js";

describe("router.matchRoute", () => {
  it("matches the root route", () => {
    assert.deepEqual(matchRoute("/"), { name: "home", params: {} });
  });

  it("extracts path params and decodes them", () => {
    assert.deepEqual(matchRoute("/category/gpus"), {
      name: "category",
      params: { slug: "gpus" },
    });
    assert.deepEqual(matchRoute("/product/%D0%BD%D0%BE%D1%83%D1%82"), {
      name: "product",
      params: { id: "ноут" },
    });
  });

  it("ignores the query string when matching", () => {
    assert.deepEqual(matchRoute("/catalog?page=2"), {
      name: "catalog",
      params: {},
    });
  });

  it("falls back to home for unknown paths", () => {
    assert.deepEqual(matchRoute("/no-such-page"), {
      name: "home",
      params: {},
    });
  });

  it("keeps every route name unique", () => {
    const names = routes.map((r) => r.name);
    assert.equal(new Set(names).size, names.length);
  });
});

describe("frontend config fallback (no Vite runtime)", () => {
  it("defaults VITE_API_BASE to /api under plain node", async () => {
    const { config } = await import("../src/config.js");
    assert.equal(config.apiBase, "/api");
  });
});
