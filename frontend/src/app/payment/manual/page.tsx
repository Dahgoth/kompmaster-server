import type { Metadata } from "next";
import { BRAND } from "@/lib/site";

export const metadata: Metadata = {
  title: "Оплата",
  description: "Оплата заказов КомпМастер: ручной режим по согласованию с менеджером.",
  alternates: { canonical: "/payment/manual" },
};

export default function PaymentManualPage() {
  return (
    <div className="space-y-6 py-8">
      <h1 className="text-2xl font-extrabold">Оплата</h1>
      <section className="rounded-panel border border-line bg-white p-6 shadow-card">
        <p>
          Мы подключаем платёжную систему. Чтобы завершить покупку, свяжитесь с нашим менеджером —
          он подтвердит способ оплаты и дальнейшее оформление заказа.
        </p>
        <div className="mt-4 space-y-2 text-sm">
          <p>
            <span className="font-bold">Менеджер:</span>{" "}
            <a
              href={BRAND.telegram}
              className="underline"
              rel="noopener noreferrer"
              target="_blank"
            >
              Telegram {BRAND.phone}
            </a>
          </p>
          <p>
            <span className="font-bold">Телефон:</span>{" "}
            <a href={BRAND.phoneHref} className="underline">
              {BRAND.phone}
            </a>
          </p>
          <p>
            <span className="font-bold">Адрес:</span> {BRAND.address}
          </p>
        </div>
        <p className="mt-4 rounded-btn bg-soft p-4 text-sm text-muted">
          В сообщении укажите номер заказа — он появится на странице заказа сразу после оформления.
        </p>
      </section>
    </div>
  );
}
