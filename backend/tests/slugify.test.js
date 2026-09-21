const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { slugify, MAX_SLUG_LENGTH } = require("../src/utils/slugify");

describe("slugify (latin translit, ADR 007)", () => {
  it("transliterates cyrillic to latin", () => {
    assert.equal(slugify("Ноутбук Lenovo ThinkPad T14"), "noutbuk-lenovo-thinkpad-t14");
  });

  it("maps multi-letter cyrillic pairs", () => {
    assert.equal(slugify("Жёсткий диск"), "zhyostkiy-disk");
    assert.equal(slugify("Щит управления"), "schit-upravleniya");
    assert.equal(slugify("Юбилейная Яблоня"), "yubileynaya-yablonya");
  });

  it("collapses non-alphanumerics into single dashes", () => {
    assert.equal(slugify("Видеокарта  /  RTX 3060 (б/у)"), "videokarta-rtx-3060-b-u");
  });

  it("trims trailing dashes after length cutoff", () => {
    const slug = slugify("Очень длинное название товара ".repeat(5));
    assert.ok(slug.length <= MAX_SLUG_LENGTH);
    assert.ok(!slug.endsWith("-"));
  });

  it("returns empty string for input without slug characters", () => {
    assert.equal(slugify("!!!"), "");
    assert.equal(slugify(""), "");
    assert.equal(slugify(null), "");
  });
});
