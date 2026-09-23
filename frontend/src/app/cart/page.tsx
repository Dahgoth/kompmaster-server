import type { Metadata } from "next";
import { CartView } from "@/features/cart/CartView";

export const metadata: Metadata = {
  title: "Корзина",
  robots: { index: false },
};

export default function CartPage() {
  return (
    <div className="space-y-6 py-8">
      <h1 className="text-2xl font-extrabold">Корзина</h1>
      <CartView />
    </div>
  );
}
