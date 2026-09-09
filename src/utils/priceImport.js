const XLSX = require("xlsx");

const NAME_HEADERS = ["наименование", "название", "товар", "модель"];
const PRICE_HEADERS = ["цена", "стоимость", "прайс"];
const STOCK_HEADERS = ["количество", "остаток", "кол-во", "наличие"];

function normalize(v) {
  return String(v ?? "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[._/\\|()[\]{}:;,+"']/g, " ")
    .replace(/[-–—]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function headerLooksLike(value, aliases) {
  const h = normalize(value);
  return h && aliases.some((a) => h === a || h.includes(a));
}

// parseNumericStock: пустая ячейка — это "не указано", а не 0.
// Именно на этом мы ловили баг в клиентской версии (Number("")===0 в JS) —
// здесь то же самое правило соблюдено явно.
function parseNumericStock(value) {
  if (typeof value === "number") return Number.isFinite(value) ? Math.max(0, Math.round(value)) : NaN;
  const raw = String(value ?? "").trim();
  if (!raw) return NaN;
  const n = Number(raw.replace(/\u00a0/g, "").replace(/\s+/g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : NaN;
}

function parseNumericPrice(value) {
  if (typeof value === "number") return Number.isFinite(value) ? Math.max(0, value) : NaN;
  let s = String(value ?? "").replace(/\u00a0/g, " ").trim();
  if (!s) return NaN;
  s = s.replace(/[₽рPpРRrУуБбЛл]/g, "").replace(/\s+/g, "").trim();
  const commas = (s.match(/,/g) || []).length;
  const dots = (s.match(/\./g) || []).length;
  if (commas === 1 && dots === 0) {
    const m = s.match(/^(-?\d+),(\d+)$/);
    if (m) s = m[2].length === 3 ? m[1] + m[2] : m[1] + "." + m[2];
  }
  const n = Number(s.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? Math.max(0, n) : NaN;
}

function findHeaderRow(matrix) {
  const limit = Math.min(matrix.length, 30);
  for (let r = 0; r < limit; r++) {
    const row = matrix[r] || [];
    let nameCol = -1, priceCol = -1, stockCol = -1;
    row.forEach((cell, i) => {
      if (nameCol < 0 && headerLooksLike(cell, NAME_HEADERS)) nameCol = i;
      else if (priceCol < 0 && headerLooksLike(cell, PRICE_HEADERS)) priceCol = i;
      else if (stockCol < 0 && headerLooksLike(cell, STOCK_HEADERS)) stockCol = i;
    });
    if (nameCol >= 0 && priceCol >= 0 && stockCol >= 0) {
      return { headerRow: r, nameCol, priceCol, stockCol };
    }
  }
  return null;
}

/**
 * Разбирает файл прайса (xlsx/xls/csv/tsv) и возвращает
 * { rows: [{name, price, available}], sheetName, skipped, blankStock }
 * Перебирает все листы книги, использует первый, где нашлись все 3 столбца.
 */
function parsePriceFile(buffer, originalName) {
  const wb = XLSX.read(buffer, { type: "buffer", codepage: 65001 });
  const errors = [];
  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
    const found = findHeaderRow(matrix);
    if (!found) {
      const preview = (matrix.find((r) => r.some((v) => String(v ?? "").trim())) || [])
        .filter((v) => String(v ?? "").trim())
        .slice(0, 6)
        .join(" | ");
      errors.push(`${sheetName}: ${preview}`);
      continue;
    }
    const { headerRow, nameCol, priceCol, stockCol } = found;
    const rows = [];
    let skipped = 0, blankStock = 0;
    for (let r = headerRow + 1; r < matrix.length; r++) {
      const row = matrix[r] || [];
      const name = String(row[nameCol] ?? "").trim();
      if (!name) continue;
      if (headerLooksLike(name, NAME_HEADERS)) continue; // повторный заголовок внутри длинного листа
      const rawStock = String(row[stockCol] ?? "").trim();
      const price = parseNumericPrice(row[priceCol]);
      const available = parseNumericStock(row[stockCol]);
      if (!Number.isFinite(price) || !Number.isFinite(available)) {
        if (Number.isFinite(price) && !rawStock) blankStock++;
        skipped++;
        continue;
      }
      rows.push({ name, price: Math.round(price * 100) / 100, available });
    }
    if (rows.length) {
      return { rows, sheetName, skipped, blankStock };
    }
  }
  throw new Error(
    "Не удалось определить таблицу прайса. Нужны столбцы «Наименование/Название», «Цена» и «Количество/Остаток». " +
      (errors.length ? "Найдено: " + errors.join("; ") : "")
  );
}

function findDuplicateNames(rows) {
  const seen = new Map();
  rows.forEach((r) => {
    const key = normalize(r.name);
    seen.set(key, (seen.get(key) || 0) + 1);
  });
  let groups = 0, extra = 0;
  seen.forEach((count) => {
    if (count > 1) { groups++; extra += count - 1; }
  });
  return { groups, extra };
}

module.exports = { parsePriceFile, findDuplicateNames, normalize };
