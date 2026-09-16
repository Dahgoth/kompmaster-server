import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  escapeHtml,
  formatPriceRaw,
  slugify,
} from "../src/utils.js";
import { defaultCategories, menuLabels, menuOrder } from "../src/data/categories.js";
import { paymentSettings, orderStatuses } from "../src/data/payment.js";

describe("frontend utils", () => {
  it("escapeHtml neutralizes all five markup characters", () => {
    assert.equal(
      escapeHtml(`&<>"'`),
      "&amp;&lt;&gt;&quot;&#39;"
    );
  });

  it("escapeHtml returns empty string for falsy input", () => {
    assert.equal(escapeHtml(""), "");
    assert.equal(escapeHtml(null), "");
    assert.equal(escapeHtml(undefined), "");
  });

  it("formatPriceRaw groups thousands for the ru-RU locale", () => {
    const grouped = formatPriceRaw(100000);
    // ru-RU grouping (nbsp variants allowed) — digits must survive.
    assert.equal(grouped.replace(/\D/g, ""), "100000");
    assert.ok(grouped.length > 6, "expected a grouping separator");
  });

  it("slugify normalizes ё to е and keeps latin/digit runs", () => {
    // Cyrillic letters become separator runs (slug is URL-safe latin only);
    // the ё→е normalization prevents a stray separator from ё itself.
    assert.equal(slugify("Ёлка 2026!"), "2026");
    assert.equal(slugify("Hello Ё World 42"), "hello-world-42");
    assert.equal(slugify("  Hello   World  "), "hello-world");
  });
});

describe("frontend category defaults", () => {
  it("references only existing ids in group children lists", () => {
    const ids = new Set(defaultCategories.map((c) => c.id));
    for (const group of defaultCategories.filter((c) => c.kind === "group")) {
      assert.ok(
        Array.isArray(group.children),
        `${group.id} must declare children`
      );
      for (const childId of group.children) {
        assert.ok(ids.has(childId), `${group.id} references missing ${childId}`);
      }
    }
  });

  it("keeps child parentId pointers consistent with group membership", () => {
    const membership = new Map();
    for (const group of defaultCategories.filter((c) => c.kind === "group")) {
      for (const childId of group.children) membership.set(childId, group.id);
    }
    for (const cat of defaultCategories.filter((c) => c.parentId)) {
      assert.equal(cat.parentId, membership.get(cat.id));
    }
  });

  it("menuOrder entries resolve to known menu labels", () => {
    for (const key of menuOrder) {
      assert.ok(menuLabels[key], `menuOrder key '${key}' has no label`);
    }
  });
});

describe("frontend payment defaults (PoC)", () => {
  it("stays in manual mode with a manager contact configured", () => {
    assert.equal(paymentSettings.mode, "manual");
    assert.ok(paymentSettings.managerTelegram.length > 0);
    assert.equal(paymentSettings.fallbackToManual, true);
  });

  it("manager message template carries order/item/total placeholders", () => {
    for (const token of ["{order}", "{items}", "{total}"]) {
      assert.ok(
        paymentSettings.managerMessageTemplate.includes(token),
        `template missing ${token}`
      );
    }
  });

  it("order status values are unique", () => {
    const values = orderStatuses.map((s) => s.value);
    assert.equal(new Set(values).size, values.length);
  });
});
