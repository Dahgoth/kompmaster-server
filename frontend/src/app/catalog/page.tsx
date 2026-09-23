import type { Metadata } from "next";
import { fetchCategories, cacheTags } from "@/api/categories";
import { CategoryCard } from "@/components/catalog/CategoryCard";
import { rethrowIfMisconfigured } from "@/lib/errors";

export const metadata: Metadata = {
  title: "Каталог",
  description:
    "Каталог восстановленной электроники КомпМастер: ноутбуки, комплектующие, периферия.",
  alternates: { canonical: "/catalog" },
};

export const revalidate = 60;

export default async function CatalogPage() {
  let categories: Awaited<ReturnType<typeof fetchCategories>> = [];
  try {
    categories = await fetchCategories({
      next: { revalidate: 60, tags: [cacheTags.categories] },
    });
  } catch (err) {
    rethrowIfMisconfigured(err);
    // ISR backstop
  }
  const roots = categories.filter((c) => !c.parent_id);

  return (
    <div className="space-y-6 py-8">
      <h1 className="text-2xl font-extrabold">Каталог</h1>
      {roots.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roots.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      ) : (
        <p className="rounded-card border border-line bg-white p-6 text-muted shadow-card">
          Каталог временно недоступен. Загляните позже или напишите нам в Telegram.
        </p>
      )}
    </div>
  );
}
