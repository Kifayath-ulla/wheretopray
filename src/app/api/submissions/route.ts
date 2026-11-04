import { withAdmin } from "@/lib/adminGuard";
import { NextResponse } from "next/server";
import { repo, RateLimitError } from "@/lib/data";
import { ipHash, validatePayload, verifyTurnstile } from "@/lib/spam";

const MIN_FILL_MS = 3000;
const ALLOWED = new Set(["name", "type", "address", "area", "city", "state", "country", "lat", "lng", "jumuah_time", "jamaat_fajr", "jamaat_zuhr", "jamaat_asr", "jamaat_maghrib", "jamaat_isha", "women_section", "wudu", "parking", "issue", "notes", "contact", "google_place_id"]);

export async function POST(req: Request) {
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return NextResponse.json({ error: "Invalid submission" }, { status: 415 });
  if (Number(req.headers.get("content-length") ?? 0) > 20_000) return NextResponse.json({ error: "Too large" }, { status: 413 });
  const body = await req.json().catch(() => null);
  if (!body || (body.kind !== "new_place" && body.kind !== "fix") || typeof body.payload !== "object" || !body.payload)
    return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
  const raw = body.payload as Record<string, unknown>;
  // Honeypot: real users never see or fill "website". Pretend success so bots learn nothing.
  if (String(raw.website ?? "").trim()) return NextResponse.json({ ok: true, id: "ignored" });
  // Time-to-submit check.
  const started = Number(body.started_at);
  if (!isFinite(started) || Date.now() - started < MIN_FILL_MS || Date.now() - started > 24 * 3600e3)
    return NextResponse.json({ error: "That was quick. Please wait a few seconds and submit again." }, { status: 400 });
  if (!(await verifyTurnstile(typeof body.turnstile === "string" ? body.turnstile : undefined, req)))
    return NextResponse.json({ error: "Captcha check failed. Please try again." }, { status: 400 });
  const payload = Object.fromEntries(
    Object.entries(raw).filter(([k]) => ALLOWED.has(k)).map(([k, v]) => [k, String(v ?? "").trim().slice(0, 1000)]).filter(([, v]) => v !== ""),
  ) as Record<string, string>;
  if (payload.country) payload.country = payload.country.toUpperCase();
  const err = validatePayload(body.kind, payload);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  const placeId = body.kind === "fix" ? String(body.place_id ?? "").slice(0, 100) || null : null;
  if (body.kind === "fix" && !placeId) return NextResponse.json({ error: "Missing place" }, { status: 400 });
  try {
    const sub = await repo.addSubmission({ kind: body.kind, place_id: placeId, payload }, ipHash(req));
    return NextResponse.json({ ok: true, id: sub.id });
  } catch (e) {
    if (e instanceof RateLimitError) return NextResponse.json({ error: "Too many submissions from your network. Please try again in an hour." }, { status: 429 });
    throw e;
  }
}

async function GET_(req: Request) {
  const list = await repo.listSubmissions(req.headers.get("x-admin-token") ?? "");
  if (!list) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(list);
}

export const GET = (req: Request) => withAdmin(req, () => GET_(req));
