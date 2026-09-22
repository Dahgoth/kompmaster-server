import type { Metadata } from "next";
import { AdminLoginForm } from "@/features/admin/AdminLoginForm";

export const metadata: Metadata = {
  title: "Вход в админ-панель",
  robots: { index: false },
};

export default function AdminLoginPage() {
  return (
    <div className="space-y-6 py-8">
      <h1 className="text-center text-2xl font-extrabold">Админ-панель</h1>
      <AdminLoginForm />
    </div>
  );
}
