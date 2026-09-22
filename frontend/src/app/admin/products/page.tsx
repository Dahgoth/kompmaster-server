import type { Metadata } from "next";
import { AdminProductsView } from "@/features/admin/AdminProductsView";

export const metadata: Metadata = {
  title: "Админ: товары",
  robots: { index: false },
};

export default function AdminProductsPage() {
  return <AdminProductsView />;
}
