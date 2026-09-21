// Latin-transliteration slug generator (ADR 007 §Decision log: latin slugs).
// Kept in sync with the SQL backfill in migrations/002_storefront_v2.sql so
// API-generated and migration-generated slugs look the same.

const CYRILLIC_MAP = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "yo",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "c",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

const MAX_SLUG_LENGTH = 80;

// ВАЖНО: слаг генерируется один раз и затем не меняется при переименовании
// (ADR 007: "renames keep the old URL as a 301" — иммутабельный слаг
// избавляет от карты редиректов). Уникальность обеспечивает вызывающий код.
function slugify(input) {
  const translit = String(input || "")
    .toLowerCase()
    .split("")
    .map((ch) => CYRILLIC_MAP[ch] ?? ch)
    .join("");
  const slug = translit
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");
  return slug;
}

module.exports = { slugify, MAX_SLUG_LENGTH };
