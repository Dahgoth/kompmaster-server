"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ApiError, apiRequest } from "@/api/client";
import { z } from "zod";
import { reviewSchema } from "@/api/schemas";
import { AdminShell } from "@/features/admin/AdminShell";
import { formatDateTime } from "@/lib/format";

/**
 * /admin/reviews: moderation queue. Approve publishes immediately (the
 * review then appears on the product page); manual reviews publish on
 * creation (no moderation). Deletion is irreversible — confirm required.
 * The pending list joins product names server-side.
 */
const pendingReviewSchema = reviewSchema.extend({ product_name: z.string() });

export function AdminReviewsView() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const pending = useQuery({
    queryKey: ["admin-reviews", "pending"],
    queryFn: ({ signal }) =>
      apiRequest(z.array(pendingReviewSchema), "GET", "/reviews/pending", {
        scope: "admin",
        signal,
      }),
    staleTime: 30_000,
  });

  function onError(err: unknown) {
    setError(err instanceof ApiError ? err.message : "Ошибка сети, попробуйте позже");
    queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
  }

  const approveMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(reviewSchema, "PUT", `/reviews/${encodeURIComponent(id)}/approve`, {
        scope: "admin",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-reviews"] }),
    onError,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(z.object({ ok: z.boolean() }), "DELETE", `/reviews/${encodeURIComponent(id)}`, {
        scope: "admin",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-reviews"] }),
    onError,
  });

  const manualMutation = useMutation({
    mutationFn: (input: { productId: string; authorName: string; rating: number; text?: string }) =>
      apiRequest(reviewSchema, "POST", "/reviews/manual", { scope: "admin", body: input }),
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
    onError,
  });

  function onManual(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const productId = String(form.get("productId") ?? "").trim();
    const authorName = String(form.get("authorName") ?? "").trim();
    const rating = Number(form.get("rating") ?? 5);
    if (!productId || !authorName) {
      setError("Для ручного отзыва нужны id товара и имя автора");
      return;
    }
    const text = String(form.get("text") ?? "").trim();
    manualMutation.mutate({ productId, authorName, rating, text: text || undefined });
    event.currentTarget.reset();
  }

  return (
    <AdminShell active="/admin/reviews">
      <div className="space-y-6">
        <section className="rounded-panel border border-line bg-white p-6 shadow-card">
          <h2 className="mb-2 text-lg font-extrabold">На модерации</h2>
          {error ? (
            <p role="alert" className="mb-4 rounded-btn bg-soft p-3 text-sm font-bold">
              {error}
            </p>
          ) : null}
          {pending.isLoading ? (
            <div className="h-24 animate-pulse rounded-card bg-soft" aria-busy="true" />
          ) : pending.isError ? (
            <p role="alert" className="text-sm text-muted">
              Не удалось загрузить очередь.{" "}
              <button
                type="button"
                onClick={() => pending.refetch()}
                className="font-bold underline"
              >
                Повторить
              </button>
            </p>
          ) : pending.data && pending.data.length ? (
            <ul className="space-y-3">
              {pending.data.map((review) => (
                <li
                  key={review.id}
                  className="space-y-2 rounded-card border border-line p-4 text-sm"
                >
                  <p className="font-extrabold">
                    {review.product_name}
                    <span
                      className="ml-2 font-normal text-muted"
                      aria-label={`Оценка ${review.rating} из 5`}
                    >
                      {"★".repeat(review.rating)}
                      {"☆".repeat(5 - review.rating)}
                    </span>
                  </p>
                  <p className="text-muted">
                    {review.author_name ?? "Покупатель"} · {formatDateTime(review.created_at)}
                  </p>
                  {review.text ? <p className="whitespace-pre-line">{review.text}</p> : null}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={approveMutation.isPending}
                      onClick={() => approveMutation.mutate(review.id)}
                      className="h-11 rounded-btn bg-gradient-to-r from-pink to-violet px-4 text-sm font-extrabold text-white disabled:opacity-60"
                    >
                      Опубликовать
                    </button>
                    <button
                      type="button"
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        if (window.confirm("Удалить отзыв без публикации?")) {
                          deleteMutation.mutate(review.id);
                        }
                      }}
                      className="h-11 rounded-btn border border-line px-4 text-sm font-extrabold hover:bg-soft"
                    >
                      Удалить
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Очередь пуста — новых отзывов нет.</p>
          )}
        </section>

        <section className="rounded-panel border border-line bg-white p-6 shadow-card">
          <h2 className="mb-2 text-lg font-extrabold">Ручной отзыв</h2>
          <p className="mb-4 text-sm text-muted">
            Публикуется сразу, без модерации (например, отзыв из Telegram).
          </p>
          <form onSubmit={onManual} className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-bold">ID товара *</span>
              <input
                name="productId"
                type="text"
                required
                className="h-12 w-full rounded-btn border border-line bg-white px-3 text-sm focus:border-pink"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-bold">Имя автора *</span>
              <input
                name="authorName"
                type="text"
                required
                className="h-12 w-full rounded-btn border border-line bg-white px-3 text-sm focus:border-pink"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-bold">Оценка</span>
              <select
                name="rating"
                defaultValue="5"
                className="h-12 w-full rounded-btn border border-line bg-white px-3 text-sm font-bold"
              >
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>
                    {value} из 5
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-bold">Текст</span>
              <textarea
                name="text"
                rows={2}
                className="w-full rounded-btn border border-line bg-white p-3 text-sm focus:border-pink"
              />
            </label>
            <button
              type="submit"
              disabled={manualMutation.isPending}
              className="h-12 rounded-btn bg-gradient-to-r from-pink to-violet px-6 text-sm font-extrabold text-white disabled:opacity-60 sm:col-span-2 sm:w-fit"
            >
              {manualMutation.isPending ? "Публикуем…" : "Опубликовать отзыв"}
            </button>
          </form>
        </section>
      </div>
    </AdminShell>
  );
}
