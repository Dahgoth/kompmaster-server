"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { ApiError } from "@/api/client";
import { resetPassword } from "@/features/auth/api";

/**
 * Consumes the backend-generated link
 * /reset-password?token=… (backend/src/routes/auth.js:122). This route did
 * not exist in the v1 storefront — emailed reset links landed on the home
 * page and the token was never consumed (ADR 006 §Context).
 */
export function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [status, setStatus] = useState<"form" | "done">("form");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (newPassword.length < 6) {
      setError("Пароль должен быть не короче 6 символов");
      return;
    }
    if (newPassword !== confirm) {
      setError("Пароли не совпадают");
      return;
    }
    setBusy(true);
    try {
      await resetPassword(token, newPassword);
      setStatus("done");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка сети, попробуйте позже");
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <p
        role="alert"
        className="rounded-panel border border-line bg-white p-6 text-center shadow-card"
      >
        Ссылка недействительна: в адресе нет токена. Запросите восстановление пароля заново.
      </p>
    );
  }

  if (status === "done") {
    return (
      <div className="rounded-panel border border-line bg-white p-6 text-center shadow-card">
        <p className="font-extrabold">Пароль обновлён</p>
        <p className="mt-2 text-muted">Теперь войдите с новым паролем.</p>
        <Link
          href="/auth"
          className="mt-4 inline-flex h-12 items-center rounded-btn bg-gradient-to-r from-pink to-violet px-6 font-extrabold text-white"
        >
          Войти
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto w-full max-w-md space-y-4 rounded-panel border border-line bg-white p-6 shadow-card"
    >
      {error ? (
        <p role="alert" className="rounded-btn border border-line bg-soft p-3 text-sm font-bold">
          {error}
        </p>
      ) : null}
      <label className="block">
        <span className="mb-1 block text-sm font-bold">Новый пароль</span>
        <input
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="h-12 w-full rounded-btn border border-line bg-white px-4 text-base focus:border-pink"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-bold">Повторите пароль</span>
        <input
          name="confirm"
          type="password"
          required
          autoComplete="new-password"
          className="h-12 w-full rounded-btn border border-line bg-white px-4 text-base focus:border-pink"
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="h-[52px] w-full rounded-btn bg-gradient-to-r from-pink to-violet font-extrabold text-white shadow-card disabled:opacity-60"
      >
        {busy ? "Сохраняем…" : "Сохранить пароль"}
      </button>
    </form>
  );
}
