import { NextResponse } from "next/server";
import { ipHash } from "@/lib/spam";
import { serverRpc, serverRpcReady } from "@/lib/serverRpc";
import { HELP_IDS, validateContributor } from "@/lib/contribute";

export async function POST(req: Request) {
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return NextResponse.json({ error: "Invalid" }, { status: 415 });
  if (Number(req.headers.get("content-length") ?? 0) > 8_000) return NextResponse.json({ error: "Too large" }, { status: 413 });
  const b = await req.json().catch(() => null);
  if (!b || typeof b !== "object") return NextResponse.json({ error: "Invalid" }, { status: 400 });
  if (String(b.website ?? "").trim()) return NextResponse.json({ ok: true }); // honeypot
  const started = Number(b.started_at);
  if (!isFinite(started) || Date.now() - started < 3000) return NextResponse.json({ error: "That was quick. Please wait a few seconds and send again." }, { status: 400 });
  const v = {
    name: String(b.name ?? "").trim().slice(0, 80), email: String(b.email ?? "").trim().slice(0, 254), phone: String(b.phone ?? "").trim().slice(0, 20),
    city: String(b.city ?? "").trim().slice(0, 80), note: String(b.note ?? "").trim().slice(0, 1000),
    help: Array.isArray(b.help) ? [...new Set<string>(b.help.map(String))].filter((h: string) => (HELP_IDS as readonly string[]).includes(h)) : [],
  };
  const err = validateContributor(v);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  if (!serverRpcReady()) return NextResponse.json({ error: "Not available right now." }, { status: 503 });
  try {
    await serverRpc("server_contribute", { p_ip_hash: ipHash(req), p_name: v.name, p_email: v.email, p_phone: v.phone || null, p_help: v.help, p_note: v.note || null, p_city: v.city || null });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (String(e).includes("rate_limited")) return NextResponse.json({ error: "Too many sign-ups from your network. Please try again in an hour." }, { status: 429 });
    return NextResponse.json({ error: "Could not save. Please try again." }, { status: 500 });
  }
}
