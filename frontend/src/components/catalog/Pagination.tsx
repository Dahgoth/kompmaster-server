import Link from "next/link";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  buildHref: (page: number) => string;
}

export function Pagination({ page, pageSize, total, buildHref }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount <= 1) return null;

  const pages = new Set<number>([1, pageCount, page]);
  for (const delta of [-1, 1]) {
    const next = page + delta;
    if (next >= 1 && next <= pageCount) pages.add(next);
  }
  const sorted = [...pages].sort((a, b) => a - b);

  return (
    <nav aria-label="Постраничная навигация" className="mt-6 flex flex-wrap items-center gap-2">
      {sorted.map((p, index) => (
        <span key={p} className="flex items-center gap-2">
          {index > 0 && sorted[index - 1] !== p - 1 ? (
            <span aria-hidden="true" className="px-1 text-muted">
              …
            </span>
          ) : null}
          <Link
            href={buildHref(p)}
            aria-current={p === page ? "page" : undefined}
            aria-label={`Страница ${p}`}
            className={`flex h-11 min-w-11 items-center justify-center rounded-btn border px-3 font-bold ${
              p === page ? "border-pink bg-pink text-white" : "border-line bg-white hover:bg-soft"
            }`}
          >
            {p}
          </Link>
        </span>
      ))}
      <span className="ml-2 text-sm text-muted">
        Страница {page} из {pageCount}
      </span>
    </nav>
  );
}
