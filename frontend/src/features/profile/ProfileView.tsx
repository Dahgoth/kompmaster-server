"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError } from "@/api/client";
import { useAuth } from "@/features/auth/context";
import { confirmPhoneCode, requestPhoneCode } from "@/features/profile/api";

/**
 * /profile: read-only account data + optional phone verification
 * (backend/src/routes/auth.js phone/request + phone/confirm). There is no
 * user-facing profile-update endpoint in the backend — display name and
 * login are immutable here; roles can only change via the admin panel.
 */
export function ProfileView() {
  const { user, ready } = useAuth();
  const router = useRouter();

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"idle" | "code-sent">("idle");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && !user) {
      router.replace("/auth?redirect=/profile");
    }
  }, [ready, user, router]);

  if (!ready || !user) return null;

  async function onRequestCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (phone.trim().length < 10) {
      setError("Некорректный номер телефона");
      return;
    }
    setBusy(true);
    try {
      await requestPhoneCode(phone.trim());
      setStage("code-sent");
      setNotice("Код отправлен. Он действует 5 минут.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка сети, попробуйте позже");
    } finally {
      setBusy(false);
    }
  }

  async function onConfirmCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    if (!code.trim()) {
      setError("Введите код из SMS");
      return;
    }
    setBusy(true);
    try {
      const verified = await confirmPhoneCode(phone.trim(), code.trim());
      setNotice(`Номер ${verified} подтверждён.`);
      setStage("idle");
      setCode("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка сети, попробуйте позже");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-panel border border-line bg-white p-6 shadow-card">
        <h2 className="text-lg font-extrabold">Учётная запись</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-muted">Логин</dt>
            <dd className="font-bold">{user.login}</dd>
          </div>
          <div>
            <dt className="text-muted">Имя</dt>
            <dd className="font-bold">
              {user.displayName || <span className="font-normal text-muted">Не указано</span>}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Роль</dt>
            <dd className="font-bold">
              {user.role === "admin"
                ? "Администратор"
                : user.role === "manager"
                  ? "Менеджер"
                  : "Покупатель"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="space-y-4 rounded-panel border border-line bg-white p-6 shadow-card">
        <h2 className="text-lg font-extrabold">Подтверждение телефона</h2>
        <p className="text-sm text-muted">
          Необязательно: подтверждённый номер помогает менеджеру быстрее связаться с вами.
        </p>
        {error ? (
          <p role="alert" className="rounded-btn border border-line bg-soft p-3 text-sm font-bold">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="rounded-btn border border-line bg-soft p-3 text-sm font-bold">
            {notice}
          </p>
        ) : null}

        <form onSubmit={onRequestCode} className="flex gap-2">
          <label className="sr-only" htmlFor="profile-phone">
            Номер телефона
          </label>
          <input
            id="profile-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+7 (___) ___-__-__"
            className="h-12 w-full rounded-btn border border-line bg-white px-4 text-base focus:border-pink"
          />
          <button
            type="submit"
            disabled={busy}
            className="h-12 shrink-0 rounded-btn border border-line bg-white px-4 text-sm font-extrabold hover:bg-soft disabled:opacity-60"
          >
            Получить код
          </button>
        </form>

        {stage === "code-sent" ? (
          <form onSubmit={onConfirmCode} className="flex gap-2">
            <label className="sr-only" htmlFor="profile-code">
              Код из SMS
            </label>
            <input
              id="profile-code"
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="4 цифры"
              className="h-12 w-full rounded-btn border border-line bg-white px-4 text-base focus:border-pink"
            />
            <button
              type="submit"
              disabled={busy}
              className="h-12 shrink-0 rounded-btn bg-gradient-to-r from-pink to-violet px-5 text-sm font-extrabold text-white disabled:opacity-60"
            >
              Подтвердить
            </button>
          </form>
        ) : null}
      </section>
    </div>
  );
}
