"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiError } from "@/api/client";
import { useAuth } from "@/features/auth/context";
import { useAdminPanel } from "@/features/admin/session";

/**
 * /admin/login: second-password gate. Only admin/manager roles may verify
 * (backend enforces too — requireRole(["admin","manager"])); user roles see
 * the 403 immediately. Successful verify lands on /admin/products.
 */
export function AdminLoginForm() {
  const { user, ready } = useAuth();
  const { verify, hasPanelToken } = useAdminPanel();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && !user) {
      router.replace("/auth?redirect=/admin/login");
    } else if (ready && user && user.role === "user") {
      router.replace("/");
    } else if (ready && hasPanelToken) {
      router.replace("/admin/products");
    }
  }, [ready, user, hasPanelToken, router]);

  if (!ready || !user || user.role === "user") return null;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (!password) {
      setError("Введите код доступа");
      return;
    }
    setBusy(true);
    try {
      await verify(password);
      router.push("/admin/products");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка сети, попробуйте позже");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-panel border border-line bg-white p-6 shadow-card">
      <p className="mb-2 text-sm text-muted">
        Вошли как <span className="font-bold">{user.displayName || user.login}</span> (
        {user.role === "admin" ? "администратор" : "менеджер"}).
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? (
          <p role="alert" className="rounded-btn border border-line bg-soft p-3 text-sm font-bold">
            {error}
          </p>
        ) : null}
        <label className="block">
          <span className="mb-1 block text-sm font-bold">Код доступа в админ-панель</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="h-12 w-full rounded-btn border border-line bg-white px-4 text-base focus:border-pink"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="h-[52px] w-full rounded-btn bg-gradient-to-r from-pink to-violet font-extrabold text-white disabled:opacity-60"
        >
          {busy ? "Проверяем…" : "Войти в панель"}
        </button>
      </form>
      <p className="mt-4 text-sm text-muted">
        Не тот аккаунт?{" "}
        <Link href="/auth" className="font-bold underline">
          Сменить
        </Link>
      </p>
    </div>
  );
}
