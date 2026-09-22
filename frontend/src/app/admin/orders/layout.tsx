import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Админ: заказы",
  robots: { index: false },
};

export default function AdminOrdersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
