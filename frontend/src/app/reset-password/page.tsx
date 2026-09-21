import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/features/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Восстановление пароля",
  robots: { index: false },
};

export default function ResetPasswordPage() {
  return (
    <div className="py-10">
      <h1 className="mb-6 text-center text-2xl font-extrabold">Новый пароль</h1>
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
