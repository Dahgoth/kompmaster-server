import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchProductReviews } from "@/api/reviews";
import { fetchProduct } from "@/api/products";
import { formatPrice } from "@/lib/format";
import { config } from "@/config";
import { AddToCartButton } from "@/features/cart/AddToCartButton";
import { ProductReviews } from "@/features/reviews/ProductReviews";
import type { Product } from "@/api/schemas";
import { rethrowIfMisconfigured } from "@/lib/errors";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  let product;
  try {
    product = await fetchProduct(id);
  } catch (err) {
    rethrowIfMisconfigured(err);
    return { title: "Товар не найден" };
  }
  return {
    title: product.name,
    description:
      product.description?.slice(0, 160) ??
      `${product.name} — ${formatPrice(product.price)}, КомпМастер (Сочи).`,
    alternates: { canonical: `/product/${encodeURIComponent(product.id)}` },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = await fetchProduct(id).catch((err: unknown) => {
    rethrowIfMisconfigured(err);
    return null;
  });
  if (!product) notFound();

  const inStock = product.available > 0;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    image: product.image ? [product.image] : undefined,
    sku: product.id,
    offers: {
      "@type": "Offer",
      url: `${config.siteUrl}/product/${encodeURIComponent(product.id)}`,
      priceCurrency: "RUB",
      price: product.price,
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="space-y-6 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Хлебные крошки" className="text-sm text-muted">
        <Link href="/" className="hover:text-ink">
          Главная
        </Link>
        <span aria-hidden="true"> / </span>
        <Link
          href={`/category/${encodeURIComponent(product.category_id)}`}
          className="hover:text-ink"
        >
          Каталог
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="font-bold text-ink">{product.name}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-panel border border-line bg-soft">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-6xl" aria-hidden="true">
              🖥️
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-panel border border-line bg-white p-6 shadow-card">
          <h1 className="text-2xl font-extrabold">{product.name}</h1>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-extrabold">{formatPrice(product.price)}</span>
            {product.old_price && product.old_price > product.price ? (
              <span className="text-lg text-muted line-through">
                {formatPrice(product.old_price)}
              </span>
            ) : null}
          </div>
          <p aria-live="polite" className="text-sm font-bold">
            {inStock ? (
              <span className="rounded-full bg-lime/15 px-3 py-1 text-[#3f7417]">
                В наличии: {product.available}
              </span>
            ) : (
              <span className="rounded-full bg-soft px-3 py-1 text-muted">Нет в наличии</span>
            )}
          </p>
          <AddToCartButton
            product={{
              id: product.id,
              name: product.name,
              price: product.price,
              image: product.image,
            }}
            disabled={!inStock}
          />
          {product.description ? (
            <p className="whitespace-pre-line text-base leading-relaxed">{product.description}</p>
          ) : null}
          {product.specs ? (
            <div>
              <h2 className="mb-2 text-lg font-extrabold">Характеристики</h2>
              <dl className="divide-y divide-line">
                {Object.entries(product.specs).map(([key, value]) => (
                  <div key={key} className="flex justify-between gap-4 py-2 text-sm">
                    <dt className="text-muted">{key}</dt>
                    <dd className="font-bold">{String(value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </div>
      </div>

      <ProductReviewsSection product={product} />
    </div>
  );
}

/**
 * AggregateRating JSON-LD (ADR 007 §3): server-side review fetch feeds the
 * rating/review-count of products that have approved reviews. A failure here
 * must never 500 the product page — reviews arrive best-effort.
 */
async function ProductReviewsSection({ product }: { product: Product }) {
  const reviews = await fetchProductReviews(product.id).catch((err: unknown) => {
    rethrowIfMisconfigured(err);
    return null;
  });
  return (
    <>
      {reviews && reviews.length ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "AggregateRating",
              itemReviewed: { "@type": "Product", name: product.name },
              ratingValue: (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(
                1,
              ),
              reviewCount: reviews.length,
            }),
          }}
        />
      ) : null}
      <ProductReviews productId={product.id} />
    </>
  );
}
