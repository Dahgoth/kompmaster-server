"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ApiError, apiRequest } from "@/api/client";
import { z } from "zod";
import { productSchema, type Product } from "@/api/schemas";
import { AdminShell } from "@/features/admin/AdminShell";
import { PriceImport } from "@/features/admin/PriceImport";
import { formatPrice } from "@/lib/format";
import { queryKeys } from "@/api/categories";

const PAGE_SIZE = 30;

type ProductForm = Partial<
  Pick<Product, "name" | "price" | "old_price" | "available" | "image" | "description">
> & {
  category_id: string;
  slug?: string;
};

/**
 * /admin/products: catalog CRUD + price import entry point (plan R9/R10).
 * scope=admin for every mutation; delete requires confirm; edited lines
 * show the server error verbatim (400/409/429 backend strings).
 */
export function AdminProductsView() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const list = useQuery({
    queryKey: queryKeys.products({ category: categoryFilter, page }),
    queryFn: ({ signal }) =>
      // scope=admin lives in apiRequest; fetchProducts is public-only.
      apiRequest(z.array(productSchema), "GET", buildProductsPath(), {
        scope: "admin",
        signal,
      }).then((items) => ({ items, total: items.length })),
    staleTime: 30_000,
  });

  function buildProductsPath(): string {
    const params = new URLSearchParams();
    if (categoryFilter) params.set("category", categoryFilter);
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    return `/products?${params.toString()}`;
  }

  function onFilterChange(value: string) {
    setCategoryFilter(value);
    setPage(1);
  }

  const createMutation = useMutation({
    mutationFn: (input: ProductForm) =>
      apiRequest(productSchema, "POST", "/products", { scope: "admin", body: mapToApi(input) }),
    onSuccess: () => {
      setFormError(null);
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err) => {
      setFormError(err instanceof ApiError ? err.message : "Ошибка сети, попробуйте позже");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(z.object({ ok: z.boolean() }), "DELETE", `/products/${encodeURIComponent(id)}`, {
        scope: "admin",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["products"] }),
  });

  function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input: ProductForm = {
      name: String(form.get("name") ?? ""),
      category_id: categoryFilter || String(form.get("category_id") ?? ""),
      price: Number(form.get("price") ?? 0),
      available: Number(form.get("available") ?? 0),
    };
    const oldPrice = form.get("old_price");
    if (oldPrice !== null && String(oldPrice).trim() !== "") {
      input.old_price = Number(oldPrice);
    }
    const image = String(form.get("image") ?? "").trim();
    if (image) input.image = image;
    const description = String(form.get("description") ?? "").trim();
    if (description) input.description = description;
    const slug = String(form.get("slug") ?? "").trim();
    if (slug) input.slug = slug;
    createMutation.mutate(input);
    if (!createMutation.isError) {
      event.currentTarget.reset();
    }
  }

  return (
    <AdminShell active="/admin/products">
      <div className="space-y-6">
        <PriceImport />
        <section className="rounded-panel border border-line bg-white p-6 shadow-card">
          <h2 className="mb-4 text-lg font-extrabold">Новый товар</h2>
          {formError ? (
            <p role="alert" className="mb-4 rounded-btn bg-soft p-3 text-sm font-bold">
              {formError}
            </p>
          ) : null}
          <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-2">
            <AdminField name="name" label="Название" required />
            <AdminField
              name="category_id"
              label="Категория (id)"
              defaultValue={categoryFilter}
              required
            />
            <AdminField name="price" label="Цена, ₽" type="number" min="0" required />
            <AdminField
              name="available"
              label="Остаток"
              type="number"
              min="0"
              defaultValue="0"
              required
            />
            <AdminField
              name="old_price"
              label="Старая цена, ₽ (опционально)"
              type="number"
              min="0"
            />
            <AdminField name="image" label="URL фото (опционально)" />
            <AdminField name="slug" label="Слаг (опционально, генерируется)" />
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm font-bold">Описание</span>
              <textarea
                name="description"
                rows={3}
                className="w-full rounded-btn border border-line bg-white p-3 text-sm focus:border-pink"
              />
            </label>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="h-12 rounded-btn bg-gradient-to-r from-pink to-violet px-6 text-sm font-extrabold text-white disabled:opacity-60 sm:col-span-2 sm:w-fit"
            >
              {createMutation.isPending ? "Создаём…" : "Создать товар"}
            </button>
          </form>
        </section>

        <section className="rounded-panel border border-line bg-white p-6 shadow-card">
          <h2 className="mb-4 text-lg font-extrabold">Товары</h2>
          <form
            className="mb-4 flex gap-2"
            onSubmit={(e) => e.preventDefault()}
            role="search"
            aria-label="Фильтр по категории"
          >
            <label className="sr-only" htmlFor="admin-product-filter">
              Категория
            </label>
            <input
              id="admin-product-filter"
              type="text"
              value={categoryFilter}
              onChange={(e) => onFilterChange(e.target.value)}
              placeholder="Фильтр: id категории"
              className="h-12 w-full max-w-xs rounded-btn border border-line bg-white px-3 text-sm focus:border-pink"
            />
          </form>
          {list.isLoading ? (
            <div className="h-32 animate-pulse rounded-card bg-soft" aria-busy="true" />
          ) : list.isError ? (
            <p role="alert" className="text-sm text-muted">
              Не удалось загрузить товары.{" "}
              <button type="button" onClick={() => list.refetch()} className="font-bold underline">
                Повторить
              </button>
            </p>
          ) : (
            <>
              <ul className="divide-y divide-line">
                {(list.data?.items ?? []).map((product) => (
                  <li
                    key={product.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-bold">{product.name}</p>
                      <p className="text-muted tabular-nums">
                        {formatPrice(product.price)} · остаток {product.available} ·{" "}
                        {product.category_id}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        if (window.confirm(`Удалить «${product.name}»?`)) {
                          deleteMutation.mutate(product.id);
                        }
                      }}
                      className="h-11 rounded-btn border border-line px-4 text-sm font-extrabold hover:bg-soft"
                    >
                      Удалить
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex gap-2">
                <AdminPagerButton
                  label="Назад"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                />
                <span className="flex h-11 items-center px-2 text-sm text-muted tabular-nums">
                  {page} · всего {list.data?.total ?? 0}
                </span>
                <AdminPagerButton
                  label="Вперёд"
                  disabled={(list.data?.items.length ?? 0) < PAGE_SIZE}
                  onClick={() => setPage((p) => p + 1)}
                />
              </div>
            </>
          )}
        </section>
      </div>
    </AdminShell>
  );
}

function mapToApi(input: ProductForm) {
  return {
    categoryId: input.category_id,
    name: input.name,
    price: input.price,
    oldPrice: input.old_price ?? undefined,
    available: input.available,
    image: input.image ?? undefined,
    description: input.description ?? undefined,
    slug: input.slug ?? undefined,
  };
}

function AdminField({
  name,
  label,
  type = "text",
  required,
  min,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  min?: string;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-bold">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        min={min}
        defaultValue={defaultValue}
        className="h-12 w-full rounded-btn border border-line bg-white px-3 text-sm focus:border-pink"
      />
    </label>
  );
}

function AdminPagerButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="h-11 rounded-btn border border-line px-4 text-sm font-extrabold hover:bg-soft disabled:opacity-50"
    >
      {label}
    </button>
  );
}
