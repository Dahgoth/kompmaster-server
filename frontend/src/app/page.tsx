import type { Metadata } from "next";
import { fetchCategories, cacheTags } from "@/api/categories";
import { CategoryCard } from "@/components/catalog/CategoryCard";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// ISR: catalog changes arrive via the revalidate hook; 60s TTL is the backstop.
export const revalidate = 60;

export default async function HomePage() {
  let categories: Awaited<ReturnType<typeof fetchCategories>> = [];
  try {
    categories = await fetchCategories({
      next: { revalidate: 60, tags: [cacheTags.categories] },
    });
  } catch {
    // ISR backstop: serve the last good page; grid degrades to empty state.
  }
  const roots = categories.filter((c) => !c.parent_id);

  return (
    <div className="space-y-8 py-8">
      <section className="rounded-panel border border-line bg-white p-8 shadow-card">
        <h1 className="text-2xl font-extrabold sm:text-3xl">
          Восстановленная электроника с гарантией
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Ноутбуки, видеокарты и комплектующие, проверенные мастерами. Заберите самовывозом в Сочи
          или закажите доставку.
        </p>
      </section>

      <section aria-label="Разделы каталога">
        <h2 className="text-lg font-extrabold">Каталог</h2>
        {roots.length ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {roots.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-card border border-line bg-white p-6 text-muted shadow-card">
            Каталог временно недоступен. Загляните позже или напишите нам в Telegram.
          </p>
        )}
      </section>
    </div>
  );
}
