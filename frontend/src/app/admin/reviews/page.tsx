import type { Metadata } from "next";
import { AdminReviewsView } from "@/features/admin/AdminReviewsView";

export const metadata: Metadata = {
  title: "Админ: отзывы",
  robots: { index: false },
};

export default function AdminReviewsPage() {
  return <AdminReviewsView />;
}
