"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError } from "@/api/client";
import { forgotPassword, login, register } from "@/features/auth/api";
import { useAuth } from "@/features/auth/context";

type Tab = "login" | "register" | "forgot";

export function AuthTabs() {
  const params = useSearchParams();
  const router = useRouter();
  const { login: setSession } = useAuth();
  const [tab, setTab] = useState<Tab>("login");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const redirect = params.get("redirect") ?? "/orders";

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    const form = new FormData(event.currentTarget);
    setBusy(true);
    try {
      if (tab === "login") {
        const { token, user } = await login(
          String(form.get("login") ?? ""),
          String(form.get("password") ?? ""),
        );
        setSession(token, user);
        router.push(redirect);
        return;
      }
      if (tab === "register") {
        const password = String(form.get("password") ?? "");
        if (password.length < 6) {
          setError("Пароль должен быть не короче 6 символов");
          setBusy(false);
          return;
        }
        const privacy = form.get("privacy") === "on";
        if (!privacy) {
          setError("Подтвердите согласие с политикой конфиденциальности");
          setBusy(false);
          return;
        }
        const { token, user } = await register({
          login: String(form.get("login") ?? ""),
          password,
          displayName: String(form.get("displayName") ?? "") || undefined,
          privacyAccepted: privacy,
        });
        setSession(token, user);
        router.push(redirect);
        return;
      }
      const message = await forgotPassword(String(form.get("login") ?? ""));
      setNotice(message);
      setBusy(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка сети, попробуйте позже");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-panel border border-line bg-white p-6 shadow-card">
      <div
        role="tablist"
        aria-label="Вход и регистрация"
        className="mb-6 grid grid-cols-3 gap-1 rounded-btn bg-soft p-1"
      >
        {(
          [
            ["login", "Вход"],
            ["register", "Регистрация"],
            ["forgot", "Восстановление"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => {
              setTab(value);
              setError(null);
              setNotice(null);
            }}
            className={`rounded-btn px-2 py-2 text-sm font-extrabold ${
              tab === value ? "bg-white shadow-card" : "text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <p
          role="alert"
          className="mb-4 rounded-btn border border-line bg-soft p-3 text-sm font-bold"
        >
          {error}
        </p>
      ) : null}
      {notice ? (
        <p
          role="status"
          className="mb-4 rounded-btn border border-line bg-soft p-3 text-sm font-bold"
        >
          {notice}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4">
        <Field
          name="login"
          label={tab === "forgot" ? "E-mail" : tab === "login" ? "E-mail или телефон" : "E-mail"}
          type="text"
          required
          autoComplete="username"
        />
        {tab !== "forgot" ? (
          <Field
            name="password"
            label="Пароль"
            type="password"
            required
            autoComplete={tab === "login" ? "current-password" : "new-password"}
          />
        ) : null}
        {tab === "register" ? (
          <>
            <Field
              name="displayName"
              label="Как к вам обращаться"
              type="text"
              autoComplete="name"
            />
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="privacy" className="mt-1 h-4 w-4" />
              <span>
                Соглашаюсь с{" "}
                <Link href="/p/privacy" className="underline">
                  политикой конфиденциальности
                </Link>{" "}
                и обработкой персональных данных
              </span>
            </label>
          </>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="h-[52px] w-full rounded-btn bg-gradient-to-r from-pink to-violet font-extrabold text-white shadow-card disabled:opacity-60"
        >
          {busy
            ? "Отправляем…"
            : tab === "login"
              ? "Войти"
              : tab === "register"
                ? "Зарегистрироваться"
                : "Отправить ссылку"}
        </button>
      </form>

      {tab === "forgot" ? (
        <p className="mt-4 text-sm text-muted">
          Вспомнили пароль?{" "}
          <button type="button" onClick={() => setTab("login")} className="font-bold underline">
            Войти
          </button>
        </p>
      ) : null}
    </div>
  );
}

function Field({
  name,
  label,
  type,
  required,
  autoComplete,
}: {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label className="block" htmlFor={`field-${name}`}>
      <span id={`field-${name}-label`} className="mb-1 block text-sm font-bold">
        {label}
        {required ? (
          <span aria-hidden="true" className="text-pink">
            {" "}
            *
          </span>
        ) : null}
      </span>
      <input
        id={`field-${name}`}
        aria-labelledby={`field-${name}-label`}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        className="h-12 w-full rounded-btn border border-line bg-white px-4 text-base focus:border-pink"
      />
    </label>
  );
}
