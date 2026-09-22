import { z } from "zod";
import { apiRequest } from "@/api/client";

/**
 * Profile + phone confirmation (backend/src/routes/auth.js).
 * - phone/request: {phone} → {ok}; 400 bad number, 429 smsLimiter (1/h).
 * - phone/confirm: {phone, code} → {ok, phone}; requires user scope —
 *   unauthenticated confirms do not store the phone (backend: confirm only
 *   updates users when req.user exists).
 * - display name: no user-facing endpoint exists; the profile is read-only
 *   here (only admin can change roles via /api/users/:id/role).
 */

export async function requestPhoneCode(phone: string): Promise<void> {
  await apiRequest(z.object({ ok: z.boolean() }), "POST", "/auth/phone/request", {
    body: { phone },
  });
}

export async function confirmPhoneCode(phone: string, code: string): Promise<string> {
  const res = await apiRequest(
    z.object({ ok: z.boolean(), phone: z.string().optional() }),
    "POST",
    "/auth/phone/confirm",
    { scope: "user", body: { phone, code } },
  );
  return res.phone ?? phone;
}
