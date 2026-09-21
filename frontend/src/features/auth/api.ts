import { z } from "zod";
import { apiRequest } from "@/api/client";
import { authResponseSchema, meResponseSchema, userSchema, type User } from "@/api/schemas";

export interface RegisterInput {
  login: string;
  password: string;
  displayName?: string;
  privacyAccepted: boolean;
}

function normalizeUser(user: User): User {
  return {
    ...user,
    displayName: user.displayName ?? user.display_name ?? null,
  };
}

export async function login(
  loginName: string,
  password: string,
): Promise<{ token: string; user: User }> {
  const res = await apiRequest(authResponseSchema, "POST", "/auth/login", {
    scope: "user",
    body: { login: loginName, password },
  });
  return { token: res.token, user: normalizeUser(res.user) };
}

export async function register(input: RegisterInput): Promise<{ token: string; user: User }> {
  const res = await apiRequest(authResponseSchema, "POST", "/auth/register", {
    scope: "user",
    body: {
      login: input.login,
      password: input.password,
      displayName: input.displayName || undefined,
      privacyAccepted: input.privacyAccepted,
    },
  });
  return { token: res.token, user: normalizeUser(res.user) };
}

/** Reads the Bearer token from localStorage via the api client (browser only). */
export async function fetchMe(): Promise<User> {
  const res = await apiRequest(meResponseSchema, "GET", "/auth/me", { scope: "user" });
  return normalizeUser(res.user);
}

export async function forgotPassword(loginName: string): Promise<string> {
  const res = await apiRequest(
    z.object({ ok: z.boolean(), message: z.string().optional() }),
    "POST",
    "/auth/forgot-password",
    { body: { login: loginName } },
  );
  return res.message ?? "Если аккаунт существует, письмо отправлено.";
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await apiRequest(z.object({ ok: z.boolean() }), "POST", "/auth/reset-password", {
    body: { token, newPassword },
  });
}

export { userSchema };
