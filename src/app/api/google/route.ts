import { NextResponse } from "next/server";
import { ipHash } from "@/lib/spam";
import { serverRpc, serverRpcReady } from "@/lib/serverRpc";

// Live Google Places (New) Text Search. FREE TIER ONLY:
// - off unless GOOGLE_PLACES_API_KEY is set (and the DB counter is reachable);
// - every request first reserves a slot in a monthly DB counter capped at GOOGLE_MONTHLY_CAP (default 28,000,
//   80% of the 35,000/month free Pro allowance), plus a per-IP-hash hourly limit;
// - results go straight to the browser. Nothing from Google is written to our DB, cached or added to the sitemap.
export const dynamic = "force-dynamic";
const KEY = () => process.env.GOOGLE_PLACES_API_KEY;
const CAP = () => Math.max(0, Math.floor(Number(process.env.GOOGLE_MONTHLY_CAP ?? 28000) || 0));
const IP_MAX = () => Math.max(1, Math.floor(Number(process.env.GOOGLE_IP_HOURLY ?? 20) || 20));
const enabled = () => !!KEY() && serverRpcReady() && CAP() > 0;
const NO_STORE = { "Cache-Control": "no-store" };
const PAUSED = "Google results paused this month. Showing open data only.";

const hits = new Map<string, number[]>();
function burst(id: string) {
  const now = Date.now(), w = (hits.get(id) ?? []).filter((t) => now - t < 60_000);
  w.push(now); hits.set(id, w);
  if (hits.size > 5000) hits.clear();
  return w.length > 6;
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  if (u.searchParams.has("check")) {
    if (!enabled()) return NextResponse.json({ enabled: false }, { headers: NO_STORE });
    const ok = await serverRpc<boolean>("server_google_status", { p_cap: CAP() }).catch(() => false);
    return NextResponse.json({ enabled: true, paused: !ok }, { headers: NO_STORE });
  }
  if (!enabled()) return NextResponse.json({ enabled: false, places: [] }, { status: 404, headers: NO_STORE });
  const b = (u.searchParams.get("bbox") ?? "").split(",").map(Number);
  const q = (u.searchParams.get("q") ?? "").replace(/\bnear\s*me\b/gi, "").slice(0, 80).trim();
  if (b.length !== 4 || b.some((x) => !isFinite(x))) return NextResponse.json({ error: "Bad bbox" }, { status: 400 });
  const [w, s, e, n] = b;
  if (w >= e || s >= n || e - w > 0.6 || n - s > 0.6) return NextResponse.json({ error: "Zoom in closer to search Google." }, { status: 400 });
  const ih = ipHash(req);
  if (burst(ih)) return NextResponse.json({ error: "Too many searches, wait a minute." }, { status: 429 });
  let slot: string;
  try { slot = await serverRpc<string>("server_google_take", { p_ip_hash: ih, p_cap: CAP(), p_ip_max: IP_MAX() }); }
  catch { return NextResponse.json({ paused: true, error: PAUSED, places: [] }, { headers: NO_STORE }); }
  if (slot === "cap") return NextResponse.json({ paused: true, error: PAUSED, places: [] }, { headers: NO_STORE });
  if (slot !== "ok") return NextResponse.json({ error: "Google search limit reached for your network. Try again later." }, { status: 429 });
  const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": KEY()!,
      // Text Search Pro fields only (no Enterprise fields such as ratings, hours or phone).
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri,places.primaryType",
    },
    body: JSON.stringify({
      textQuery: q ? `${q} mosque` : "mosque masjid dargah",
      pageSize: 20,
      locationRestriction: { rectangle: { low: { latitude: s, longitude: w }, high: { latitude: n, longitude: e } } },
    }),
  }).catch(() => null);
  if (!r || !r.ok) return NextResponse.json({ error: "Google search failed" }, { status: 502 });
  const j = (await r.json()) as { places?: { id: string; displayName?: { text: string }; formattedAddress?: string; location?: { latitude: number; longitude: number }; googleMapsUri?: string; primaryType?: string }[] };
  const places = (j.places ?? []).map((p) => ({ place_id: p.id, name: p.displayName?.text ?? "", address: p.formattedAddress ?? "", lat: p.location?.latitude, lng: p.location?.longitude, url: p.googleMapsUri, type: p.primaryType }));
  return NextResponse.json({ places }, { headers: NO_STORE });
}
