import { z } from "zod";
import { apiRequest } from "@/api/client";
import { reviewSchema, type Review } from "@/api/schemas";

/**
 * Reviews (backend/src/routes/reviews.js):
 * - public list per product, admin + auto-approved reviews only.
 * - POST product/:id requires a delivered order (403 otherwise);
 *   duplicate per user+product → 409; success lands in `pending`
 *   (moderation publishes it — the new review is NOT shown immediately).
 */
export async function fetchProductReviews(
  productId: string,
  options: { signal?: AbortSignal } = {},
): Promise<Review[]> {
  return apiRequest(
    z.array(reviewSchema),
    "GET",
    `/reviews/product/${encodeURIComponent(productId)}`,
    {
      signal: options.signal,
    },
  );
}

export interface CreateReviewInput {
  rating: number;
  text: string;
}

export async function createReview(productId: string, input: CreateReviewInput): Promise<Review> {
  return apiRequest(reviewSchema, "POST", `/reviews/product/${encodeURIComponent(productId)}`, {
    scope: "user",
    body: input,
  });
}
