import Image from "next/image";
import Link from "next/link";
import type { Category } from "@/api/schemas";

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      href={`/category/${encodeURIComponent(category.id)}`}
      className="group flex flex-col overflow-hidden rounded-card border border-line bg-white shadow-card transition-transform duration-200 motion-safe:hover:-translate-y-[3px] hover:shadow-lift"
    >
      <div className="relative aspect-[16/9] w-full bg-soft">
        {category.image ? (
          <Image
            src={category.image}
            alt={category.name}
            fill
            sizes="(max-width: 640px) 100vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-3xl" aria-hidden="true">
            🗂️
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 p-4">
        <span className="font-extrabold">{category.name}</span>
        <span
          aria-hidden="true"
          className="text-muted transition-transform duration-200 group-hover:translate-x-1"
        >
          →
        </span>
      </div>
    </Link>
  );
}
