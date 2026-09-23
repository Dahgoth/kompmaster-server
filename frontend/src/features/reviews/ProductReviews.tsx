"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ApiError } from "@/api/client";
import { createReview, fetchProductReviews } from "@/api/reviews";
import { useAuth } from "@/features/auth/context";
import { queryKeys } from "@/api/categories";
import { formatDateTime } from "@/lib/format";

/**
 * Product reviews section: public approved list + gated submission.
 * backend/src/routes/reviews.js rejects non-purchased (403) and duplicate
 * (409) reviews; a successful review lands in `pending` moderation and is
 * NOT rendered immediately — the UI says so explicitly.
 */
export function ProductReviews({ productId }: { productId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reviews = useQuery({
    queryKey: queryKeys.reviews(productId),
    queryFn: ({ signal }) => fetchProductReviews(productId, { signal }),
    staleTime: 60_000,
  });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitted(false);
    if (!text.trim()) {
      setError("Напишите пару слов о товаре");
      return;
    }
    setBusy(true);
    try {
      await createReview(productId, { rating, text: text.trim() });
      setSubmitted(true);
      setText("");
      await queryClient.invalidateQueries({ queryKey: queryKeys.reviews(productId) });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка сети, попробуйте позже");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-label="Отзывы"
      className="space-y-4 rounded-panel border border-line bg-white p-6 shadow-card"
    >
      <h2 className="text-lg font-extrabold">Отзывы</h2>

      {reviews.isLoading ? (
        <div className="h-16 animate-pulse rounded-card bg-soft" aria-busy="true" />
      ) : reviews.isError ? (
        <p role="alert" className="text-sm text-muted">
          Не удалось загрузить отзывы.{" "}
          <button type="button" onClick={() => reviews.refetch()} className="font-bold underline">
            Повторить
          </button>
        </p>
      ) : reviews.data && reviews.data.length ? (
        <ul className="space-y-4">
          {reviews.data.map((review) => (
            <li
              key={review.id}
              className="border-t border-line pt-4 text-sm first:border-t-0 first:pt-0"
            >
              <p className="font-extrabold">
                {review.author_name ?? "Покупатель"}
                <span
                  className="ml-2 font-normal text-muted"
                  aria-label={`Оценка ${review.rating} из 5`}
                >
                  {"★".repeat(review.rating)}
                  {"☆".repeat(5 - review.rating)}
                </span>
              </p>
              {review.text ? <p className="mt-1 whitespace-pre-line">{review.text}</p> : null}
              <p className="mt-1 text-xs text-muted">{formatDateTime(review.created_at)}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Отзывов пока нет — станьте первым.</p>
      )}

      {user ? (
        <form onSubmit={onSubmit} className="space-y-3 border-t border-line pt-4">
          <h3 className="text-sm font-extrabold">Ваш отзыв</h3>
          {error ? (
            <p role="alert" className="rounded-btn bg-soft p-3 text-sm font-bold">
              {error}
            </p>
          ) : null}
          {submitted ? (
            <p role="status" className="rounded-btn bg-soft p-3 text-sm font-bold">
              Спасибо! Отзыв отправлен на модерацию и появится после публикации.
            </p>
          ) : null}
          <fieldset>
            <legend className="mb-1 text-sm font-bold">Оценка</legend>
            <div className="flex gap-1" role="radiogroup" aria-label="Оценка от 1 до 5">
              {[1, 2, 3, 4, 5].map((value) => (
                <label
                  key={value}
                  className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-btn border text-lg ${
                    value <= rating ? "border-pink text-pink" : "border-line text-muted"
                  }`}
                >
                  <input
                    type="radio"
                    name="rating"
                    value={value}
                    checked={rating === value}
                    onChange={() => setRating(value)}
                    className="sr-only"
                  />
                  <span aria-hidden="true">★</span>
                  <span className="sr-only">{value}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block">
            <span className="mb-1 block text-sm font-bold">Текст отзыва</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              maxLength={2000}
              className="w-full rounded-btn border border-line bg-white p-3 text-sm focus:border-pink"
              placeholder="Что понравилось, что подвело, для кого подойдёт"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="h-12 rounded-btn bg-gradient-to-r from-pink to-violet px-6 text-sm font-extrabold text-white disabled:opacity-60"
          >
            {busy ? "Отправляем…" : "Отправить отзыв"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
