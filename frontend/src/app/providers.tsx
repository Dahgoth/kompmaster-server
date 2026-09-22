"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { AuthProvider } from "@/features/auth/context";
import { AdminPanelProvider } from "@/features/admin/session";

/**
 * Client-island data layer (plan §4): TanStack Query for cart/forms/admin.
 * Server Components fetch directly through api/ with the Next fetch cache —
 * the provider only serves client hooks.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AdminPanelProvider>{children}</AdminPanelProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
