import { cn } from "@/lib/utils";

/** Plain GET form — server re-renders with the new ?search= value (no client JS). */
export function CatalogSearch({
  action,
  defaultValue,
  placeholder = "Поиск по названию",
}: {
  action: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <form action={action} role="search" className="flex gap-2">
      <label className="sr-only" htmlFor="catalog-search">
        Поиск по названию
      </label>
      <input
        type="search"
        id="catalog-search"
        name="search"
        defaultValue={defaultValue}
        placeholder={placeholder}
        maxLength={100}
        className={cn(
          "h-12 w-full rounded-btn border border-line bg-white px-4 text-base",
          "placeholder:text-muted focus:border-pink",
        )}
      />
      <button
        type="submit"
        className="h-12 shrink-0 rounded-btn bg-gradient-to-r from-pink to-violet px-5 font-extrabold text-white shadow-card"
      >
        Найти
      </button>
    </form>
  );
}
