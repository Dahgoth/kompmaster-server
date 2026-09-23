import type { Metadata } from "next";
import { ProfileView } from "@/features/profile/ProfileView";

export const metadata: Metadata = {
  title: "Личный кабинет",
  robots: { index: false },
};

export default function ProfilePage() {
  return (
    <div className="space-y-6 py-8">
      <h1 className="text-2xl font-extrabold">Личный кабинет</h1>
      <ProfileView />
    </div>
  );
}
