import type { Metadata } from "next";
import { CheckoutForm } from "@/features/checkout/CheckoutForm";

export const metadata: Metadata = {
  title: "Оформление заказа",
  robots: { index: false },
};

export default function CheckoutPage() {
  return (
    <div className="space-y-6 py-8">
      <h1 className="text-2xl font-extrabold">Оформление заказа</h1>
      <CheckoutForm />
    </div>
  );
}
