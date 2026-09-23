import type { Metadata } from "next";
import { BRAND } from "@/lib/site";
import { contacts, deliveryInfo } from "@/lib/content";

export const metadata: Metadata = {
  title: "Контакты",
  description:
    "КомпМастер: офис в Сочи, Telegram, телефон, часы работы. Самовывоз и доставка по России.",
  alternates: { canonical: "/contacts" },
};

export default function ContactsPage() {
  return (
    <div className="space-y-6 py-8">
      <h1 className="text-2xl font-extrabold">Контакты</h1>
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-panel border border-line bg-white p-6 shadow-card">
          <h2 className="mb-3 text-lg font-extrabold">Офис</h2>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-muted">Адрес</dt>
              <dd className="font-bold">
                {contacts.address}
                <span className="block text-muted">{contacts.address2}</span>
              </dd>
            </div>
            <div>
              <dt className="text-muted">Часы работы</dt>
              <dd className="font-bold">{contacts.workTime}</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-panel border border-line bg-white p-6 shadow-card">
          <h2 className="mb-3 text-lg font-extrabold">Связь</h2>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-muted">Telegram</dt>
              <dd>
                <a
                  href={contacts.telegramLink}
                  className="font-bold underline"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  @{contacts.telegram}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-muted">E-mail</dt>
              <dd>
                <a href={`mailto:${contacts.email}`} className="font-bold underline">
                  {contacts.email}
                </a>
              </dd>
            </div>
            {BRAND.phone ? (
              <div>
                <dt className="text-muted">Телефон</dt>
                <dd>
                  <a href={BRAND.phoneHref} className="font-bold underline">
                    {BRAND.phone}
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>
        </div>
      </section>
      <section className="rounded-panel border border-line bg-white p-6 shadow-card">
        <h2 className="mb-2 text-lg font-extrabold">Доставка</h2>
        <p className="text-sm">
          Срок поставки заказа в Россию — в среднем {deliveryInfo.timeframe}. После поступления
          товара: самовывоз в Сочи или отправка ({deliveryInfo.methods.join(", ")}).
        </p>
      </section>
    </div>
  );
}
