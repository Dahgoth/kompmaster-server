import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/inter";
import "./globals.css";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { SkipLink } from "@/components/layout/SkipLink";
import { config } from "@/config";
import { Providers } from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL(config.siteUrl),
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
        <Providers>
          <SkipLink />
          <Header />
          <main
            id="main"
            tabIndex={-1}
            className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 pb-16 outline-none sm:px-6"
          >
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
