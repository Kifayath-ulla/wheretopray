import { NextResponse } from "next/server";
import { ipHash, verifyTurnstile } from "@/lib/spam";
import { serverRpc, serverRpcReady } from "@/lib/serverRpc";
import { refreshPlaces } from "@/lib/revalidate";

const MIN_FILL_MS = 3000;

export async function POST(req: Request) {
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return NextResponse.json({ error: "Invalid request" }, { status: 415 });
  if (Number(req.headers.get("content-length") ?? 0) > 2000) return NextResponse.json({ error: "Too large" }, { status: 413 });
  const b = (await req.json().catch(() => null)) as { place_id?: unknown; website?: unknown; started_at?: unknown; turnstile?: unknown } | null;
  if (!b || typeof b.place_id !== "string" || !b.place_id || b.place_id.length > 100) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  if (String(b.website ?? "").trim()) return NextResponse.json({ ok: true }); // honeypot
  const started = Number(b.started_at);
  if (!isFinite(started) || Date.now() - started < MIN_FILL_MS || Date.now() - started > 24 * 3600e3)
    return NextResponse.json({ error: "That was quick. Please wait a few seconds and try again." }, { status: 400 });
  if (!(await verifyTurnstile(typeof b.turnstile === "string" ? b.turnstile : undefined, req)))
    return NextResponse.json({ error: "Captcha check failed." }, { status: 400 });
  if (!serverRpcReady()) return NextResponse.json({ error: "Not available" }, { status: 503 });
  try {
    const at = await serverRpc<string>("server_confirm_jamaat", { p_ip_hash: ipHash(req), p_place_id: b.place_id });
    refreshPlaces();
    return NextResponse.json({ ok: true, confirmed_at: at });
  } catch (e) {
    const m = String(e);
    // serverRpc only exposes the status; Postgres raises map to 400-class responses.
    if (/ 4\d\d/.test(m)) return NextResponse.json({ error: "You already confirmed this today, or there are no times to confirm." }, { status: 429 });
    throw e;
  }
}
