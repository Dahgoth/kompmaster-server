import Link from "next/link";
import { AccountLink } from "@/components/layout/AccountLink";
import { MobileDrawer } from "@/components/layout/MobileDrawer";
import { NAV_LINKS } from "@/lib/site";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/92 backdrop-blur-[18px]">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="text-lg font-extrabold tracking-tight">
          Комп
          <span className="bg-gradient-to-r from-pink via-violet to-cyan bg-clip-text text-transparent">
            Мастер
          </span>
        </Link>

        <nav aria-label="Основная навигация" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="rounded-btn px-3 py-2 text-sm font-bold hover:bg-soft"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <AccountLink />
          <Link
            href="/cart"
            className="hidden h-11 items-center rounded-btn bg-gradient-to-r from-pink to-violet px-5 text-sm font-extrabold text-white shadow-card hover:shadow-lift sm:flex"
          >
            Корзина
          </Link>
          <MobileDrawer />
        </div>
      </div>
    </header>
  );
}
