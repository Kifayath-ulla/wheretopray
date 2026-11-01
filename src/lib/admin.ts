import { createHash, timingSafeEqual } from "node:crypto";

// Shared-secret admin check. ADMIN_TOKEN must be set (16+ chars); there is no default, so admin is off without it.
const h = (s: string) => createHash("sha256").update(s).digest();
export const isAdmin = (token: string | null | undefined) => {
  const t = process.env.ADMIN_TOKEN;
  if (!t || t.length < 16 || !token) return false;
  return timingSafeEqual(h(token), h(t));
};
