const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

process.env.FRONTEND_ORIGIN = "https://compmasone.ru";

const XLSX = require("xlsx");
// NOTE: must be required AFTER the env assignment above, because
// src/utils/priceImport.js -> ../config reads env at load time.
const { parsePriceFile, findDuplicateNames } = require("../src/utils/priceImport");

function makeWorkbook(headers, rows) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  return XLSX.write(
    { SheetNames: ["S1"], Sheets: { S1: ws } },
    { type: "buffer", bookType: "xlsx" },
  );
}

describe("priceImport.parsePriceFile", () => {
  it("parses a minimal valid sheet", () => {
    const buf = makeWorkbook(["Название", "Цена", "Остаток"], [["Ноутбук Acer", "100000", "5"]]);
    const result = parsePriceFile(buf, "price.xlsx");
    assert.equal(result.sheetName, "S1");
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].name, "Ноутбук Acer");
    assert.equal(result.rows[0].price, 100000);
    assert.equal(result.rows[0].available, 5);
  });

  it("detects the 'кол-во' header variant (matches STOCK_HEADERS alias)", () => {
    const buf = makeWorkbook(["Название", "Цена", "Кол-во"], [["Ноутбук Acer", "100000", "5"]]);
    const result = parsePriceFile(buf, "price.xlsx");
    assert.equal(result.rows.length, 1);
    assert.equal(result.rows[0].available, 5);
  });

  it("skips product names that are substrings of alias words instead of treating them as header repeats", () => {
    const buf = makeWorkbook(
      ["Наименование", "Цена", "Количество"],
      [
        // "Модель" contains the NAME_HEADERS alias "модель" — it is a real
        // product row and must be parsed, not skipped as a repeated header.
        ["Модель XYZ-100", "5000", "3"],
        ["Ноутбук Acer", "100000", "5"],
      ],
    );
    const result = parsePriceFile(buf, "price.xlsx");
    const names = result.rows.map((r) => r.name);
    assert.ok(names.includes("Модель XYZ-100"));
    assert.ok(names.includes("Ноутбук Acer"));
  });
});

describe("priceImport.findDuplicateNames", () => {
  it("groups case-insensitive duplicates", () => {
    const result = findDuplicateNames([
      { name: "Ноутбук Acer" },
      { name: "ноутбук acer" },
      { name: "Мышь Logitech" },
    ]);
    assert.equal(result.groups, 1);
    assert.equal(result.extra, 1);
  });
});
