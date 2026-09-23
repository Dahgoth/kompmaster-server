import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/api/schemas";

export function ProductCard({ product }: { product: Product }) {
  const href = `/product/${encodeURIComponent(product.id)}`;
  const inStock = product.available > 0;
  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-card border border-line bg-white shadow-card transition-transform duration-200 motion-safe:hover:-translate-y-[3px] hover:shadow-lift"
    >
      <div className="relative aspect-[4/3] w-full bg-soft">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl" aria-hidden="true">
            🖥️
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="line-clamp-2 text-sm font-bold">{product.name}</span>
        <div className="mt-auto flex items-baseline gap-2">
          <span className="text-lg font-extrabold">{formatPrice(product.price)}</span>
          {product.old_price && product.old_price > product.price ? (
            <span className="text-sm text-muted line-through">
              {formatPrice(product.old_price)}
            </span>
          ) : null}
        </div>
        <span
          className={`w-fit rounded-full px-2 py-0.5 text-xs font-extrabold ${
            inStock ? "bg-lime/15 text-[#3f7417]" : "bg-soft text-muted"
          }`}
        >
          {inStock ? `В наличии: ${product.available}` : "Нет в наличии"}
        </span>
      </div>
    </Link>
  );
}
