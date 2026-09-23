"use client";

import Link from "next/link";
import { useAuth } from "@/features/auth/context";

export function AccountLink() {
  const { user, ready, logout } = useAuth();

  if (!ready) {
    return <span aria-hidden="true" className="h-11 w-20" />;
  }

  if (!user) {
    return (
      <Link
        href="/auth"
        className="hidden h-11 items-center rounded-btn border border-line bg-white px-4 text-sm font-extrabold hover:bg-soft sm:flex"
      >
        Войти
      </Link>
    );
  }

  return (
    <div className="hidden items-center gap-1 sm:flex">
      <Link
        href="/profile"
        className="flex h-11 items-center rounded-btn border border-line bg-white px-4 text-sm font-extrabold hover:bg-soft"
        title="Личный кабинет"
      >
        {user.displayName || user.login}
      </Link>
      <button
        type="button"
        onClick={logout}
        className="flex h-11 items-center rounded-btn px-3 text-sm font-bold text-muted hover:bg-soft hover:text-ink"
      >
        Выйти
      </button>
    </div>
  );
}
