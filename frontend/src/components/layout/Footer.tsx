import Link from "next/link";
import { BRAND } from "@/lib/site";

const SECTIONS = [
  {
    title: "Покупателям",
    links: [
      { href: "/catalog", label: "Каталог" },
      { href: "/payment/manual", label: "Оплата" },
      { href: "/warranty", label: "Гарантия" },
      { href: "/faq", label: "Частые вопросы" },
    ],
  },
  {
    title: "Компания",
    links: [
      { href: "/about", label: "О нас" },
      { href: "/contacts", label: "Контакты" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-line bg-soft">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
        <div>
          <p className="text-lg font-extrabold">{BRAND.name}</p>
          <p className="mt-2 text-sm text-muted">{BRAND.tagline}</p>
          <p className="mt-4 text-sm text-muted">{BRAND.address}</p>
          <a href={BRAND.phoneHref} className="mt-2 block font-bold">
            {BRAND.phone}
          </a>
        </div>

        {SECTIONS.map((s) => (
          <nav key={s.title} aria-label={s.title}>
            <p className="text-sm font-extrabold">{s.title}</p>
            <ul className="mt-3 space-y-2">
              {s.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted hover:text-ink">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <p className="mx-auto w-full max-w-6xl px-4 py-4 text-xs text-muted sm:px-6">
          © {new Date().getFullYear()} {BRAND.name}
        </p>
      </div>
    </footer>
  );
}
