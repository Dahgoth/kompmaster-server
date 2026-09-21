import type { Metadata } from "next";
import Link from "next/link";
import { OrderDetailView } from "@/features/orders/OrderDetailView";

export const metadata: Metadata = {
  title: "Заказ",
  robots: { index: false },
};

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;

  return (
    <div className="space-y-6 py-8">
      {created ? (
        <div role="status" className="rounded-panel border border-line bg-white p-6 shadow-card">
          <p className="font-extrabold">Заказ оформлен!</p>
          <p className="mt-2 text-sm text-muted">
            Менеджер свяжется с вами для подтверждения. Оплата — ручной режим: менеджер подтвердит
            способ оплаты (страница{" "}
            <Link href="/payment/manual" className="underline">
              Оплата
            </Link>{" "}
            — контакты менеджера).
          </p>
        </div>
      ) : null}
      <OrderDetailView orderId={id} />
    </div>
  );
}
