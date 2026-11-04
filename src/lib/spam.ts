import { createHash } from "node:crypto";

/** Client IP as set by the hosting edge. X-Forwarded-For is only a last resort because clients can prepend to it. */
export function clientIp(req: Request) {
  return (req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-real-ip") || "").trim()
    || (req.headers.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean).pop() || "unknown";
}

/** IPv6 clients can rotate addresses inside their allocation, so rate limits key on the /48 prefix. */
export function ipBucket(ip: string) {
  if (!ip.includes(":")) return ip;
  const [head] = ip.split("%");
  const parts = head.split("::")[0].split(":");
  const full = head.includes("::") ? parts : head.split(":");
  return full.slice(0, 3).map((x) => x || "0").join(":") + "::/48";
}

/** Hash the client IP with a server-side salt so raw IPs are never stored. */
export function ipHash(req: Request) {
  const ip = ipBucket(clientIp(req));
  const salt = process.env.RATE_LIMIT_SALT || process.env.ADMIN_TOKEN || process.env.NEXT_PUBLIC_SUPABASE_URL || "wheretopray-dev";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export const turnstileEnabled = () => !!(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);

export async function verifyTurnstile(token: string | undefined, req: Request) {
  if (!turnstileEnabled()) return true;
  if (!token) return false;
  const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: token });
  const ip = clientIp(req);
  if (ip && ip !== "unknown") body.set("remoteip", ip);
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body, cache: "no-store" });
    return ((await r.json()) as { success?: boolean }).success === true;
  } catch { return false; }
}

const URL_RE = /https?:\/\/|www\./gi;
/** Returns an error message, or null when the payload looks legitimate. */
export function validatePayload(kind: "new_place" | "fix", p: Record<string, string>): string | null {
  const len = (k: string, max: number) => (p[k] ?? "").length > max;
  if (kind === "new_place") {
    if (!p.name || p.name.trim().length < 3) return "Please enter the place name (at least 3 characters).";
    if (len("name", 150)) return "Name is too long.";
    if (p.lat || p.lng) {
      const lat = Number(p.lat), lng = Number(p.lng);
      if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return "Latitude/longitude look invalid.";
    } else if (!p.address || p.address.trim().length < 5) return "Please add coordinates or an address so we can find it.";
    if (!p.city || p.city.trim().length < 2) return "Please enter the city.";
    if (p.country && !/^[A-Za-z]{2}$/.test(p.country)) return "Country must be a 2-letter code, e.g. IN.";
  } else if (!p.notes || p.notes.trim().length < 5) return "Please describe what should be corrected.";
  for (const k of ["address", "notes"]) if (len(k, 1000)) return `${k} is too long.`;
  if (p.contact && (len("contact", 120) || !/^\S+@\S+\.\S+$/.test(p.contact))) return "Contact email looks invalid.";
  const links = Object.values(p).join(" ").match(URL_RE)?.length ?? 0;
  if (links > 2) return "Too many links.";
  return null;
}
