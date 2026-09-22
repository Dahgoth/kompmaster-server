import type { Metadata } from "next";
import type { FaqItem } from "@/lib/content";
import { faq } from "@/lib/content";

export const metadata: Metadata = {
  title: "Частые вопросы",
  description:
    "Частые вопросы о восстановленной электронике КомпМастер: гарантия, доставка, оплата, наличие.",
  alternates: { canonical: "/faq" },
};

/** FAQPage JSON-LD (ADR 007 §3) over the hardcoded FAQ list. */
function FaqJsonLd({ items }: { items: FaqItem[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: items.map((item) => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
          })),
        }),
      }}
    />
  );
}

export default function FaqPage() {
  return (
    <div className="space-y-6 py-8">
      <FaqJsonLd items={faq} />
      <h1 className="text-2xl font-extrabold">Частые вопросы</h1>
      <div className="space-y-3">
        {faq.map((item) => (
          <details
            key={item.id}
            className="group rounded-card border border-line bg-white shadow-card"
          >
            <summary className="cursor-pointer list-none p-5 font-extrabold marker:hidden [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-4">
                {item.q}
                <span aria-hidden="true" className="text-muted group-open:rotate-180">
                  ▾
                </span>
              </span>
            </summary>
            <p className="whitespace-pre-line px-5 pb-5 text-sm leading-relaxed text-ink">
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}
