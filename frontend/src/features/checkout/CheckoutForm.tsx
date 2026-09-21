"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ApiError } from "@/api/client";
import { createOrder } from "@/api/orders";
import { useAuth } from "@/features/auth/context";
import { selectTotalPrice, useCartStore } from "@/features/cart/store";
import { formatPrice } from "@/lib/format";
import { BRAND } from "@/lib/site";

/**
 * Checkout (plan features/checkout): offer-acceptance gate, pickup/delivery,
 * atomic order creation. On 409 (insufficient stock) the user is told which
 * item failed — the message is the backend's user-facing Russian copy.
 */
export function CheckoutForm() {
  const router = useRouter();
  const { user, ready } = useAuth();
  const items = useCartStore((state) => state.items);
  const total = useCartStore(selectTotalPrice);
  const clear = useCartStore((state) => state.clear);

  const [receiveMethod, setReceiveMethod] = useState<"pickup" | "delivery">("pickup");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [offerAccepted, setOfferAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isEmpty = useMemo(() => items.length === 0, [items]);

  // Auth guard (router-level equivalent for the client island).
  useEffect(() => {
    if (ready && !user) {
      router.replace("/auth?redirect=/checkout");
    }
  }, [ready, user, router]);

  if (!ready) return null;

  if (isEmpty) {
    return (
      <p className="rounded-panel border border-line bg-white p-6 text-muted shadow-card">
        Корзина пуста —{" "}
        <Link href="/catalog" className="font-bold underline">
          выберите товары
        </Link>
        .
      </p>
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!offerAccepted) {
      setError("Подтвердите согласие с условиями публичной оферты");
      return;
    }
    if (!contactPhone.trim()) {
      setError("Укажите контактный телефон");
      return;
    }
    if (receiveMethod === "delivery" && !address.trim()) {
      setError("Укажите адрес доставки");
      return;
    }
    setBusy(true);
    try {
      const order = await createOrder({
        items: items.map((item) => ({ productId: item.id, qty: item.quantity })),
        receiveMethod,
        address: receiveMethod === "delivery" ? address.trim() : undefined,
        contactPhone: contactPhone.trim(),
      });
      clear();
      router.push(`/order/${order.id}?created=1`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Ошибка сети, попробуйте позже");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4 rounded-panel border border-line bg-white p-6 shadow-card">
        {error ? (
          <p role="alert" className="rounded-btn border border-line bg-soft p-3 text-sm font-bold">
            {error}
          </p>
        ) : null}

        <fieldset>
          <legend className="mb-2 text-sm font-extrabold">Получение</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <MethodCard
              checked={receiveMethod === "pickup"}
              onChange={() => setReceiveMethod("pickup")}
              title="Самовывоз"
              description={BRAND.address}
            />
            <MethodCard
              checked={receiveMethod === "delivery"}
              onChange={() => setReceiveMethod("delivery")}
              title="Доставка"
              description="По согласованию с менеджером"
            />
          </div>
        </fieldset>

        <label className="block">
          <span className="mb-1 block text-sm font-bold">
            Контактный телефон
            <span aria-hidden="true" className="text-pink">
              {" "}
              *
            </span>
          </span>
          <input
            name="contactPhone"
            type="tel"
            required
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            autoComplete="tel"
            placeholder="+7 (___) ___-__-__"
            className="h-12 w-full rounded-btn border border-line bg-white px-4 text-base focus:border-pink"
          />
        </label>

        {receiveMethod === "delivery" ? (
          <label className="block">
            <span className="mb-1 block text-sm font-bold">
              Адрес доставки
              <span aria-hidden="true" className="text-pink">
                {" "}
                *
              </span>
            </span>
            <textarea
              name="address"
              required
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-btn border border-line bg-white p-4 text-base focus:border-pink"
            />
          </label>
        ) : null}

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={offerAccepted}
            onChange={(e) => setOfferAccepted(e.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <span>
            Согласен с условиями{" "}
            <Link href="/p/offer" className="underline">
              публичной оферты
            </Link>{" "}
            и обработкой персональных данных
          </span>
        </label>
      </div>

      <aside className="h-fit space-y-3 rounded-panel border border-line bg-white p-6 shadow-card">
        <h2 className="text-lg font-extrabold">Ваш заказ</h2>
        <ul className="space-y-2 text-sm">
          {items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3">
              <span className="min-w-0 truncate text-muted">
                {item.name} × {item.quantity}
              </span>
              <span className="shrink-0 font-bold tabular-nums">
                {formatPrice(item.price * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
        <p className="border-t border-line pt-3 text-lg font-extrabold">
          Итого: <span className="tabular-nums">{formatPrice(total)}</span>
        </p>
        <button
          type="submit"
          disabled={busy}
          className="h-[52px] w-full rounded-btn bg-gradient-to-r from-pink to-violet font-extrabold text-white shadow-card disabled:opacity-60"
        >
          {busy ? "Оформляем…" : "Подтвердить заказ"}
        </button>
        <p className="text-xs text-muted">
          Оплата по согласованию с менеджером после подтверждения заказа (ручной режим — ADR 002:
          платёжные провайдеры пока не подключены).
        </p>
      </aside>
    </form>
  );
}

function MethodCard({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  description: string;
}) {
  return (
    <label
      htmlFor={`method-${title}`}
      className={`flex cursor-pointer items-start gap-3 rounded-card border p-4 ${
        checked ? "border-pink" : "border-line hover:bg-soft"
      }`}
    >
      <input
        type="radio"
        id={`method-${title}`}
        name="receiveMethod"
        value={title}
        checked={checked}
        onChange={onChange}
        className="mt-1 h-4 w-4"
      />
      <strong className="block font-extrabold">{title}</strong>
      <span className="block text-sm text-muted">{description}</span>
    </label>
  );
}
