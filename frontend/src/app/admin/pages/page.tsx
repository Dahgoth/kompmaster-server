import type { Metadata } from "next";
import { AdminPagesView } from "@/features/admin/AdminPagesView";

export const metadata: Metadata = {
  title: "Админ: страницы",
  robots: { index: false },
};

export default function AdminPagesPage() {
  return <AdminPagesView />;
}
