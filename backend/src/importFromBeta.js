// Перенос данных из старой HTML-беты (localStorage браузера) в базу сервера.
//
// Как получить файл для переноса:
// 1. Откройте старый сайт (Kompmaster-Beta-vNN.html) в браузере, войдите в админку.
// 2. Откройте консоль разработчика (F12 → Console) и выполните:
//
//      copy(JSON.stringify({
//        categories: JSON.parse(localStorage.getItem("kmv5_categories")||"null"),
//        products:   JSON.parse(localStorage.getItem("kmv13_products")||"null"),
//        reviews:    JSON.parse(localStorage.getItem("kmv13_reviews")||"null")
//      }))
//
// 3. Вставьте скопированное в файл export.json рядом с этим скриптом.
// 4. Запустите: node src/importFromBeta.js export.json
//
// Пользователей и пароли этот скрипт НЕ переносит намеренно — пароли в
// бете хешированы SHA-256 без соли (годится только для клиентской
// проверки, для сервера это слабый формат). Существующим клиентам проще
// один раз пройти "восстановление пароля по e-mail" на новом сайте.

const fs = require("fs");
const db = require("./db");

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Использование: node src/importFromBeta.js export.json");
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(file, "utf8"));

  // --- Категории (сначала без родителей, потом простановка parent_id,
  // чтобы избежать ошибок внешнего ключа при произвольном порядке) ---
  const categories = data.categories || [];
  for (const c of categories) {
    await db.query(
      `INSERT INTO categories (id, name, kind, visible, image)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (id) DO UPDATE SET name=$2, kind=$3, visible=$4, image=$5`,
      [c.id, c.name, c.kind || "catalog", c.visible !== false, c.image || null]
    );
  }
  for (const c of categories) {
    if (c.parentId) {
      await db.query("UPDATE categories SET parent_id = $1 WHERE id = $2", [c.parentId, c.id]);
    }
  }
  console.log(`[import] категорий перенесено: ${categories.length}`);

  // --- Товары (products — объект { categoryId: [товар, товар, ...] }) ---
  const productIdMap = new Map(); // старый id из беты -> новый uuid
  let productCount = 0;
  const productsByCategory = data.products || {};
  for (const [categoryId, list] of Object.entries(productsByCategory)) {
    for (const p of list || []) {
      const { rows } = await db.query(
        `INSERT INTO products (category_id, name, price, old_price, available, image, description)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [categoryId, p.name, p.price, p.oldPrice || null, p.available || 0, p.image || null, p.description || null]
      );
      productIdMap.set(`${categoryId}:${p.id}`, rows[0].id);
      productCount++;
    }
  }
  console.log(`[import] товаров перенесено: ${productCount}`);

  // --- Отзывы (reviews — объект { "categoryId:productId": [отзыв, ...] }) ---
  let reviewCount = 0;
  const reviews = data.reviews || {};
  for (const [key, list] of Object.entries(reviews)) {
    const newProductId = productIdMap.get(key);
    if (!newProductId) continue; // товар не нашли (был удалён и т.п.) — пропускаем отзыв
    for (const r of list || []) {
      await db.query(
        `INSERT INTO reviews (product_id, author_name, rating, text, image, source, status, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          newProductId,
          r.author || "Покупатель",
          r.rating || 5,
          r.text || null,
          r.image || null,
          r.source === "admin" ? "admin" : "customer",
          r.status === "pending" ? "pending" : "approved",
          r.at || new Date().toISOString(),
        ]
      );
      reviewCount++;
    }
  }
  console.log(`[import] отзывов перенесено: ${reviewCount}`);

  console.log("[import] готово.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[import] ошибка:", err);
  process.exit(1);
});
