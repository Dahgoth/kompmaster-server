"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { STORAGE_KEYS, apiRequest } from "@/api/client";
import { z } from "zod";
import { useAuth } from "@/features/auth/context";

/**
 * Admin panel second-password session (backend/src/middleware/auth.js
 * requireAdminPanelSession): POST /api/auth/admin-panel/verify → adminPanelToken,
 * sent back as X-Admin-Panel-Token on every admin route. Token lives in
 * sessionStorage (tab-scoped, plan §6); the admin API routes are admin-scoped
 * (`/api/products`, `/api/categories`, …), never the /api/admin/* prefix —
 * that prefix does not exist in the modular backend.
 */
interface AdminPanelState {
  hasPanelToken: boolean;
  /** True once sessionStorage has been read. */
  ready: boolean;
  verify: (password: string) => Promise<void>;
  clearPanel: () => void;
}

const AdminPanelContext = createContext<AdminPanelState | null>(null);

export function AdminPanelProvider({ children }: { children: ReactNode }) {
  const { logout: logoutUser } = useAuth();
  const [hasPanelToken, setHasPanelToken] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setHasPanelToken(!!window.sessionStorage.getItem(STORAGE_KEYS.adminPanelToken));
    setReady(true);
  }, []);

  const verify = useCallback(async (password: string) => {
    const res = await apiRequest(
      z.object({ adminPanelToken: z.string() }),
      "POST",
      "/auth/admin-panel/verify",
      { scope: "user", body: { password } },
    );
    window.sessionStorage.setItem(STORAGE_KEYS.adminPanelToken, res.adminPanelToken);
    setHasPanelToken(true);
  }, []);

  const clearPanel = useCallback(() => {
    window.sessionStorage.removeItem(STORAGE_KEYS.adminPanelToken);
    setHasPanelToken(false);
    logoutUser();
  }, [logoutUser]);

  return (
    <AdminPanelContext.Provider value={{ hasPanelToken, ready, verify, clearPanel }}>
      {children}
    </AdminPanelContext.Provider>
  );
}

export function useAdminPanel(): AdminPanelState {
  const ctx = useContext(AdminPanelContext);
  if (!ctx) throw new Error("useAdminPanel must be used within AdminPanelProvider");
  return ctx;
}
