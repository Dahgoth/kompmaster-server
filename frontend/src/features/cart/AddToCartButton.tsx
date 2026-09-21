"use client";

import { useCartStore } from "@/features/cart/store";

export function AddToCartButton({
  product,
  disabled = false,
}: {
  product: { id: string; name: string; price: number; image: string | null };
  disabled?: boolean;
}) {
  const addItem = useCartStore((state) => state.addItem);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => addItem(product, 1)}
      className="h-[52px] w-full rounded-btn bg-gradient-to-r from-pink to-violet px-6 font-extrabold text-white shadow-card transition-shadow hover:shadow-lift disabled:cursor-not-allowed disabled:from-soft disabled:to-soft disabled:text-muted disabled:shadow-none"
    >
      {disabled ? "Нет в наличии" : "Добавить в корзину"}
    </button>
  );
}
