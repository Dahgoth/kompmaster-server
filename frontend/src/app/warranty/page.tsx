import type { Metadata } from "next";
import { warrantyFull, warrantyShort } from "@/lib/content";

export const metadata: Metadata = {
  title: "Гарантия",
  description:
    "Гарантия КомпМастер: 12 месяцев на всю технику, расширенная гарантия до 3 лет. Условия и исключения.",
  alternates: { canonical: "/warranty" },
};

export default function WarrantyPage() {
  return (
    <div className="space-y-6 py-8">
      <h1 className="text-2xl font-extrabold">Гарантия</h1>
      <section className="grid gap-3 sm:grid-cols-2">
        {warrantyShort.map((line) => (
          <div
            key={line}
            className="rounded-card border border-line bg-white p-5 font-bold shadow-card"
          >
            {line}
          </div>
        ))}
      </section>
      <section className="rounded-panel border border-line bg-white p-6 shadow-card">
        <h2 className="mb-3 text-lg font-extrabold">Полные условия</h2>
        {warrantyFull.split("\n\n").map((paragraph, index) => (
          <p key={index} className="mb-4 text-sm leading-relaxed last:mb-0">
            {paragraph}
          </p>
        ))}
      </section>
    </div>
  );
}
