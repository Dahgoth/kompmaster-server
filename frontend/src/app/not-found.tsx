import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-16 text-center">
      <h1 className="text-3xl font-extrabold">Страница не найдена</h1>
      <p className="mt-3 text-muted">
        Возможно, товар распродан или ссылка устарела. Попробуйте каталог — там точно есть что-то
        интересное.
      </p>
      <Link
        href="/catalog"
        className="mt-6 inline-flex h-[52px] items-center rounded-btn bg-gradient-to-r from-pink to-violet px-6 font-extrabold text-white shadow-card"
      >
        В каталог
      </Link>
    </div>
  );
}
