import type { Metadata } from "next";
import Link from "next/link";
import { aboutBusiness, aboutProcess, aboutText } from "@/lib/content";

export const metadata: Metadata = {
  title: "О нас",
  description: "КомпМастер: восстановленная электроника из США с гарантией. Как мы работаем.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <div className="space-y-6 py-8">
      <h1 className="text-2xl font-extrabold">О нас</h1>
      <section className="rounded-panel border border-line bg-white p-6 shadow-card">
        <p>{aboutText}</p>
      </section>
      <section className="rounded-panel border border-line bg-white p-6 shadow-card">
        <h2 className="mb-2 text-lg font-extrabold">Как это работает</h2>
        <p>{aboutProcess}</p>
      </section>
      <section className="rounded-panel border border-line bg-white p-6 shadow-card">
        <h2 className="mb-2 text-lg font-extrabold">Для бизнеса</h2>
        <p>{aboutBusiness}</p>
        <Link
          href="/contacts"
          className="mt-4 inline-flex h-12 items-center rounded-btn border border-line bg-white px-6 font-extrabold hover:bg-soft"
        >
          Наши контакты
        </Link>
      </section>
    </div>
  );
}
