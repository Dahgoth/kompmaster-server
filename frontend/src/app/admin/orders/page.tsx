"use client";

import { useAuth } from "@/features/auth/context";
import { AdminOrdersView } from "@/features/admin/AdminOrdersView";

export default function AdminOrdersPage() {
  const { user } = useAuth();
  if (!user || user.role === "user") return null;
  return <AdminOrdersView role={user.role} />;
}
