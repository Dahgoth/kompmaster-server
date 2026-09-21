import type { Metadata } from "next";
import { OrdersList } from "@/features/orders/OrdersList";

export const metadata: Metadata = {
  title: "Мои заказы",
  robots: { index: false },
};

export default function OrdersPage() {
  return (
    <div className="space-y-6 py-8">
      <h1 className="text-2xl font-extrabold">Мои заказы</h1>
      <OrdersList />
    </div>
  );
}
