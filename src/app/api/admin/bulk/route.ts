import { NextResponse } from "next/server";
import { refreshPlaces } from "@/lib/revalidate";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL, KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const TYPES = ["mosque", "masjid", "prayer_room", "musalla", "idgah", "dargah"];
type Row = { name: string; type: string; area: string | null; city: string | null; lat: number; lng: number };

function clean(rows: unknown): Row[] | null {
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > 2000) return null;
  const out: Row[] = [];
  for (const r of rows as Record<string, unknown>[]) {
    const lat = Number(r?.lat), lng = Number(r?.lng), name = String(r?.name ?? "").trim().slice(0, 200);
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    const type = TYPES.includes(String(r?.type)) ? String(r.type) : "mosque";
    const s = (v: unknown) => (v == null || String(v).trim() === "" ? null : String(v).trim().slice(0, 120));
    out.push({ name, type, area: s(r.area), city: s(r.city), lat, lng });
  }
  return out;
}

export async function POST(req: Request) {
  const token = req.headers.get("x-admin-token") ?? "";
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!URL_ || !KEY) return NextResponse.json({ error: "Supabase not configured" }, { status: 501 });
  if (Number(req.headers.get("content-length") ?? 0) > 2_000_000) return NextResponse.json({ error: "Too large" }, { status: 413 });
  const body = await req.json().catch(() => null);
  const rows = clean(body?.rows);
  const action = body?.action, status = body?.status ?? "pending";
  if (!rows || !["dedupe", "import"].includes(action) || !["pending", "verified"].includes(status)) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const fn = action === "dedupe" ? "admin_bulk_dedupe" : "admin_bulk_import";
  const args = action === "dedupe" ? { p_token: token, p_rows: rows } : { p_token: token, p_rows: rows, p_status: status };
  const r = await fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: "POST", cache: "no-store", headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "content-type": "application/json" }, body: JSON.stringify(args) });
  const t = await r.text();
  if (!r.ok) {
    const unauth = t.includes("unauthorized") || r.status === 401 || r.status === 403;
    return NextResponse.json({ error: unauth ? "Unauthorized" : "Failed" }, { status: unauth ? 401 : 500 });
  }
  const data = JSON.parse(t);
  if (action === "import") { refreshPlaces(); return NextResponse.json({ imported: data }); }
  return NextResponse.json({ matches: data });
}
