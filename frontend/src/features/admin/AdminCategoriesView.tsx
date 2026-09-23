"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ApiError, apiRequest } from "@/api/client";
import { z } from "zod";
import { AdminShell } from "@/features/admin/AdminShell";
import { fetchCategories, queryKeys } from "@/api/categories";

/**
 * /admin/categories: create (id + name + kind + optional parent/image) and
 * delete. The delete-with-children guard is a FK violation from the backend —
 * surfaced verbatim so the admin sees the constraint message.
 */
export function AdminCategoriesView() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const list = useQuery({
    queryKey: queryKeys.categoriesAdmin,
    queryFn: ({ signal }) => fetchCategories({ signal }),
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (input: {
      id: string;
      name: string;
      parentId?: string;
      kind?: string;
      image?: string;
    }) =>
      apiRequest(z.object({ ok: z.boolean() }), "POST", "/categories", {
        scope: "admin",
        body: input,
      }),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Ошибка сети, попробуйте позже");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(z.object({ ok: z.boolean() }), "DELETE", `/categories/${encodeURIComponent(id)}`, {
        scope: "admin",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Ошибка сети, попробуйте позже");
    },
  });

  function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const id = String(form.get("id") ?? "").trim();
    const name = String(form.get("name") ?? "").trim();
    if (!id || !name) {
      setError("Нужны id и название категории");
      return;
    }
    const parentId = String(form.get("parentId") ?? "").trim();
    const kind = String(form.get("kind") ?? "catalog");
    const image = String(form.get("image") ?? "").trim();
    createMutation.mutate({
      id,
      name,
      parentId: parentId || undefined,
      kind,
      image: image || undefined,
    });
    event.currentTarget.reset();
  }

  return (
    <AdminShell active="/admin/categories">
      <div className="space-y-6">
        <section className="rounded-panel border border-line bg-white p-6 shadow-card">
          <h2 className="mb-4 text-lg font-extrabold">Новая категория</h2>
          {error ? (
            <p role="alert" className="mb-4 rounded-btn bg-soft p-3 text-sm font-bold">
              {error}
            </p>
          ) : null}
          <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-bold">ID (латиница, без пробелов) *</span>
              <input
                name="id"
                type="text"
                required
                pattern="[a-z0-9-]+"
                className="h-12 w-full rounded-btn border border-line bg-white px-3 text-sm focus:border-pink"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-bold">Название *</span>
              <input
                name="name"
                type="text"
                required
                className="h-12 w-full rounded-btn border border-line bg-white px-3 text-sm focus:border-pink"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-bold">Родитель (id, для подкатегорий)</span>
              <input
                name="parentId"
                type="text"
                list="category-parents"
                className="h-12 w-full rounded-btn border border-line bg-white px-3 text-sm focus:border-pink"
              />
              <datalist id="category-parents">
                {(list.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </datalist>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-bold">Тип</span>
              <select
                name="kind"
                className="h-12 w-full rounded-btn border border-line bg-white px-3 text-sm font-bold"
              >
                <option value="catalog">catalog — товары</option>
                <option value="group">group — группа разделов</option>
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm font-bold">URL картинки (опционально)</span>
              <input
                name="image"
                type="text"
                className="h-12 w-full rounded-btn border border-line bg-white px-3 text-sm focus:border-pink"
              />
            </label>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="h-12 rounded-btn bg-gradient-to-r from-pink to-violet px-6 text-sm font-extrabold text-white disabled:opacity-60 sm:col-span-2 sm:w-fit"
            >
              {createMutation.isPending ? "Создаём…" : "Создать категорию"}
            </button>
          </form>
        </section>

        <section className="rounded-panel border border-line bg-white p-6 shadow-card">
          <h2 className="mb-4 text-lg font-extrabold">Категории</h2>
          {list.isLoading ? (
            <div className="h-24 animate-pulse rounded-card bg-soft" aria-busy="true" />
          ) : list.isError ? (
            <p role="alert" className="text-sm text-muted">
              Не удалось загрузить категории.{" "}
              <button type="button" onClick={() => list.refetch()} className="font-bold underline">
                Повторить
              </button>
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {(list.data ?? []).map((category) => (
                <li
                  key={category.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-bold">{category.name}</p>
                    <p className="text-muted">
                      <code className="text-xs">{category.id}</code> · {category.kind}
                      {category.parent_id ? ` · родитель ${category.parent_id}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Удалить категорию «${category.name}»? Товары с этим id потеряют раздел.`,
                        )
                      ) {
                        deleteMutation.mutate(category.id);
                      }
                    }}
                    className="h-11 rounded-btn border border-line px-4 text-sm font-extrabold hover:bg-soft"
                  >
                    Удалить
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
