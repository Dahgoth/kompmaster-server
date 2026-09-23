import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchCategories, cacheTags } from "@/api/categories";
import { fetchProducts } from "@/api/products";
import { CatalogSearch } from "@/components/catalog/CatalogSearch";
import { CategoryCard } from "@/components/catalog/CategoryCard";
import { Pagination } from "@/components/catalog/Pagination";
import { ProductCard } from "@/components/catalog/ProductCard";
import { rethrowIfMisconfigured } from "@/lib/errors";

const PAGE_SIZE = 30;

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ search?: string; page?: string }>;
}

// The category `id` (TEXT, admin-owned) is the slug contract (ADR 007 §2).
async function loadParams(slug: string) {
  let categories: Awaited<ReturnType<typeof fetchCategories>> = [];
  try {
    categories = await fetchCategories({
      next: { revalidate: 60, tags: [cacheTags.categories] },
    });
  } catch (err) {
    rethrowIfMisconfigured(err);
    return null;
  }
  const category = categories.find((c) => c.id === slug);
  if (!category) return null;
  const children = categories.filter((c) => c.parent_id === slug);
  return { category, children };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await loadParams(slug);
  if (!data) return { title: "Раздел не найден" };
  return {
    title: data.category.name,
    description: `Каталог раздела «${data.category.name}» — КомпМастер, Сочи.`,
    alternates: { canonical: `/category/${encodeURIComponent(slug)}` },
  };
}

export const revalidate = 60;

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { slug } = await params;
  const { search = "", page: pageRaw } = await searchParams;
  const data = await loadParams(slug);
  if (!data) notFound();
  const { category, children } = data;
  const canonicalPath = `/category/${encodeURIComponent(slug)}`;

  if (category.kind === "group") {
    return (
      <div className="space-y-6 py-8">
        <nav aria-label="Хлебные крошки" className="text-sm text-muted">
          <Link href="/catalog" className="hover:text-ink">
            Каталог
          </Link>
          <span aria-hidden="true"> / </span>
          <span className="font-bold text-ink">{category.name}</span>
        </nav>
        <h1 className="text-2xl font-extrabold">{category.name}</h1>
        {children.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {children.map((child) => (
              <CategoryCard key={child.id} category={child} />
            ))}
          </div>
        ) : (
          <p className="rounded-card border border-line bg-white p-6 text-muted shadow-card">
            В этом разделе пока нет подразделов.
          </p>
        )}
      </div>
    );
  }

  const page = Math.max(1, Number(pageRaw ?? 1) || 1);
  let items: Awaited<ReturnType<typeof fetchProducts>>["items"] = [];
  let total = 0;
  let failed = false;
  try {
    const result = await fetchProducts(
      { category: slug, search: search || undefined, page, pageSize: PAGE_SIZE },
      { next: { revalidate: 60, tags: [cacheTags.products] } },
    );
    items = result.items;
    total = result.total;
  } catch {
    failed = true;
  }

  return (
    <div className="space-y-6 py-8">
      <nav aria-label="Хлебные крошки" className="text-sm text-muted">
        <Link href="/catalog" className="hover:text-ink">
          Каталог
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="font-bold text-ink">{category.name}</span>
      </nav>

      <h1 className="text-2xl font-extrabold">{category.name}</h1>
      <CatalogSearch action={canonicalPath} defaultValue={search} />

      {failed ? (
        <p
          role="alert"
          className="rounded-card border border-line bg-white p-6 text-muted shadow-card"
        >
          Не удалось загрузить товары. Попробуйте обновить страницу позже.
        </p>
      ) : items.length ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            buildHref={(p) => {
              const qs = new URLSearchParams();
              if (search) qs.set("search", search);
              if (p > 1) qs.set("page", String(p));
              const query = qs.toString();
              return query ? `${canonicalPath}?${query}` : canonicalPath;
            }}
          />
        </>
      ) : (
        <p className="rounded-card border border-line bg-white p-6 text-muted shadow-card">
          {search
            ? `По запросу «${search}» ничего не найдено. Попробуйте изменить формулировку.`
            : "В этом разделе пока нет товаров."}
        </p>
      )}
    </div>
  );
}
