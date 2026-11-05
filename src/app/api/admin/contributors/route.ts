import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/adminGuard";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL, KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
async function GET_(req: Request) {
  if (!URL_ || !KEY) return NextResponse.json({ error: "Supabase not configured" }, { status: 501 });
  const r = await fetch(`${URL_}/rest/v1/rpc/admin_list_contributors`, { method: "POST", cache: "no-store", headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "content-type": "application/json" }, body: JSON.stringify({ p_token: req.headers.get("x-admin-token") ?? "" }) });
  const t = await r.text();
  if (!r.ok) { const un = t.includes("unauthorized") || r.status === 401 || r.status === 403; return NextResponse.json({ error: un ? "Unauthorized" : "Failed" }, { status: un ? 401 : 500 }); }
  return NextResponse.json(JSON.parse(t));
}
export const GET = (req: Request) => withAdmin(req, () => GET_(req));
