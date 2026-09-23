"use client";

import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/format";
import { selectTotalPrice, selectTotalQuantity, useCartStore } from "@/features/cart/store";

export function CartView() {
  const items = useCartStore((state) => state.items);
  const setQuantity = useCartStore((state) => state.setQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const total = useCartStore(selectTotalPrice);
  const count = useCartStore(selectTotalQuantity);

  if (!items.length) {
    return (
      <div className="rounded-panel border border-line bg-white p-8 text-center shadow-card">
        <p className="font-extrabold">Корзина пуста</p>
        <p className="mt-2 text-muted">
          Загляните в каталог — восстановленная техника с гарантией ждёт.
        </p>
        <Link
          href="/catalog"
          className="mt-5 inline-flex h-[52px] items-center rounded-btn bg-gradient-to-r from-pink to-violet px-6 font-extrabold text-white shadow-card"
        >
          В каталог
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center gap-4 rounded-card border border-line bg-white p-4 shadow-card"
          >
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-row bg-soft">
              {item.image ? (
                <Image src={item.image} alt="" fill sizes="64px" className="object-cover" />
              ) : (
                <div
                  className="flex h-full items-center justify-center text-2xl"
                  aria-hidden="true"
                >
                  🖥️
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{item.name}</p>
              <p className="mt-1 text-sm text-muted">{formatPrice(item.price)} за шт.</p>
            </div>
            <div
              className="flex items-center gap-2"
              role="group"
              aria-label={`Количество: ${item.name}`}
            >
              <StepperButton
                label="Уменьшить количество"
                onClick={() => setQuantity(item.id, item.quantity - 1)}
              >
                −
              </StepperButton>
              <span aria-live="polite" className="w-8 text-center font-extrabold">
                {item.quantity}
              </span>
              <StepperButton
                label="Увеличить количество"
                onClick={() => setQuantity(item.id, item.quantity + 1)}
              >
                +
              </StepperButton>
            </div>
            <p className="w-28 text-right font-extrabold">
              {formatPrice(item.price * item.quantity)}
            </p>
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className="text-sm font-bold text-muted underline hover:text-ink"
              aria-label={`Убрать ${item.name} из корзины`}
            >
              Убрать
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-panel border border-line bg-white p-6 shadow-card">
        <p className="text-lg font-extrabold">
          Итого: <span className="tabular-nums">{formatPrice(total)}</span>
          <span className="ml-2 text-sm font-normal text-muted">({count} поз.)</span>
        </p>
        <Link
          href="/checkout"
          className="inline-flex h-[52px] items-center rounded-btn bg-gradient-to-r from-pink to-violet px-8 font-extrabold text-white shadow-card"
        >
          Оформить заказ
        </Link>
      </div>
    </div>
  );
}

function StepperButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-input border border-line bg-white text-lg font-extrabold hover:bg-soft"
    >
      {children}
    </button>
  );
}
