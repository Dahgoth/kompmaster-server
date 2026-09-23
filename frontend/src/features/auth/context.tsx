"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { STORAGE_KEYS } from "@/api/client";
import { fetchMe } from "@/features/auth/api";
import type { User } from "@/api/schemas";

/**
 * Auth state (plan §6): user + Bearer token live in the v1 localStorage keys
 * (`km_auth_token`/`km_user`) so sessions survive the cutover. Token
 * hardening (in-memory access token + httpOnly refresh cookie) is a
 * backend-involving follow-up per the ADR 007 decision log.
 */

interface AuthState {
  user: User | null;
  /** True once localStorage has been read (avoids SSR/client mismatch). */
  ready: boolean;
  login: (token: string, user: User) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = window.localStorage.getItem(STORAGE_KEYS.authToken);
    const rawUser = window.localStorage.getItem(STORAGE_KEYS.user);
    let stored: User | null = null;
    try {
      stored = rawUser ? (JSON.parse(rawUser) as User) : null;
    } catch {
      stored = null;
    }
    if (token && stored) {
      setUserState(stored);
      setReady(true);
      // Refresh the stored profile (role/display name may have changed).
      fetchMe()
        .then(setUserState)
        .catch(() => {
          // 401/expired token — clear the stale session.
          window.localStorage.removeItem(STORAGE_KEYS.authToken);
          window.localStorage.removeItem(STORAGE_KEYS.user);
          setUserState(null);
        });
    } else {
      setReady(true);
    }
  }, []);

  const login = useCallback((token: string, nextUser: User) => {
    window.localStorage.setItem(STORAGE_KEYS.authToken, token);
    window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(nextUser));
    setUserState(nextUser);
  }, []);

  const setUser = useCallback((nextUser: User) => {
    window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(nextUser));
    setUserState(nextUser);
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEYS.authToken);
    window.localStorage.removeItem(STORAGE_KEYS.user);
    setUserState(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, ready, login, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
