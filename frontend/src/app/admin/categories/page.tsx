import type { Metadata } from "next";
import { AdminCategoriesView } from "@/features/admin/AdminCategoriesView";

export const metadata: Metadata = {
  title: "Админ: категории",
  robots: { index: false },
};

export default function AdminCategoriesPage() {
  return <AdminCategoriesView />;
}
