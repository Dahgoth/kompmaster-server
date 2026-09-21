import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/inter";
import "./globals.css";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { SkipLink } from "@/components/layout/SkipLink";

export const metadata: Metadata = {
  title: {
    default: "КомпМастер — Восстановленная электроника",
    template: "%s — КомпМастер",
  },
  description:
    "КомпМастер: восстановленные ноутбуки и компьютерные комплектующие в Сочи с гарантией.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body className="min-h-dvh bg-bg font-sans text-ink antialiased">
        <SkipLink />
        <Header />
        <main id="main" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 pb-16 sm:px-6">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
