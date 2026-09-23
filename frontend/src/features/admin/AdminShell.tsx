"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/features/auth/context";
import { useAdminPanel } from "@/features/admin/session";

/**
 * Admin segment shell (plan route map): user auth + role gate + panel-token
 * gate. Manager role sees only /admin/orders (mirrors the backend's
 * manager-only read path); admin sees everything. Panel token absence
 * redirects to /admin/login; 401 from any admin fetch also lands there.
 */
const NAV = [
  { href: "/admin/products", label: "Товары", roles: ["admin"] as const },
  { href: "/admin/orders", label: "Заказы", roles: ["admin", "manager"] as const },
  { href: "/admin/categories", label: "Категории", roles: ["admin"] as const },
  { href: "/admin/users", label: "Пользователи", roles: ["admin"] as const },
  { href: "/admin/reviews", label: "Отзывы", roles: ["admin"] as const },
  { href: "/admin/pages", label: "Страницы", roles: ["admin"] as const },
] as const;

export type AdminRole = "admin" | "manager";

export function AdminShell({ children, active }: { children: React.ReactNode; active: string }) {
  const { user, ready } = useAuth();
  const { hasPanelToken, ready: panelReady, clearPanel } = useAdminPanel();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user) {
      router.replace("/auth?redirect=/admin/login");
    } else if (ready && user && user.role === "user") {
      router.replace("/");
    }
  }, [ready, user, router]);

  useEffect(() => {
    if (panelReady && !hasPanelToken && user && user.role !== "user") {
      router.replace("/admin/login");
    }
  }, [panelReady, hasPanelToken, user, router]);

  if (!ready || !panelReady || !user || user.role === "user" || !hasPanelToken) {
    return null;
  }

  const links = NAV.filter((item) => (item.roles as readonly string[]).includes(user.role));

  return (
    <div className="space-y-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">Админ-панель</h1>
        <button
          type="button"
          onClick={clearPanel}
          className="h-11 rounded-btn border border-line bg-white px-4 text-sm font-extrabold hover:bg-soft"
        >
          Выйти из панели
        </button>
      </div>
      <nav aria-label="Разделы админ-панели">
        <ul className="flex flex-wrap gap-2">
          {links.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active === item.href ? "page" : undefined}
                className={`inline-flex h-11 items-center rounded-btn border px-4 text-sm font-extrabold ${
                  active === item.href
                    ? "border-pink bg-pink text-white"
                    : "border-line bg-white hover:bg-soft"
                }`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {children}
    </div>
  );
}
