import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthTabs } from "@/features/auth/AuthTabs";

export const metadata: Metadata = {
  title: "Вход",
  robots: { index: false },
};

export default function AuthPage() {
  return (
    <div className="py-10">
      <h1 className="mb-6 text-center text-2xl font-extrabold">Личный кабинет</h1>
      <Suspense fallback={null}>
        <AuthTabs />
      </Suspense>
    </div>
  );
}
