import type { Metadata } from "next";
import { AdminUsersView } from "@/features/admin/AdminUsersView";

export const metadata: Metadata = {
  title: "Админ: пользователи",
  robots: { index: false },
};

export default function AdminUsersPage() {
  return <AdminUsersView />;
}
