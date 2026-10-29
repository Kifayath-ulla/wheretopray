import { NextResponse } from "next/server";
import { refreshPlaces } from "@/lib/revalidate";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL, KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
async function rpc(fn: string, args: Record<string, unknown>) {
  if (!URL_ || !KEY) return { status: 501, data: { error: "Supabase not configured" } };
  const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", cache: "no-store", headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "content-type": "application/json" }, body: JSON.stringify(args) });
  const t = await r.text();
  if (!r.ok) return { status: t.includes("unauthorized") || r.status === 401 || r.status === 403 ? 401 : 500, data: { error: t.includes("unauthorized") ? "Unauthorized" : "Failed" } };
  return { status: 200, data: JSON.parse(t) };
}
const tok = (req: Request) => req.headers.get("x-admin-token") ?? "";

export async function GET(req: Request) {
  if (!tok(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const r = await rpc("admin_list_pending_places", { p_token: tok(req), p_limit: 2000 });
  return NextResponse.json(r.data, { status: r.status });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const ids = Array.isArray(body?.ids) ? body.ids.map(String).slice(0, 2000) : [];
  const status = String(body?.status ?? "verified");
  if (!tok(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ids.length || !["verified", "pending", "closed"].includes(status)) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const r = await rpc("admin_bulk_set_place_status", { p_token: tok(req), p_ids: ids, p_status: status });
  if (r.status === 200) refreshPlaces();
  return NextResponse.json(r.status === 200 ? { updated: r.data } : r.data, { status: r.status });
}
