import { NextResponse } from "next/server";
import { ipHash } from "@/lib/spam";

// Live Google Places (New) lookup. Results are passed straight to the browser and never stored.
// Only a place_id may later be kept, if a visitor submits it with a suggested addition.
export const dynamic = "force-dynamic";
const KEY = () => process.env.GOOGLE_PLACES_API_KEY;
const hits = new Map<string, number[]>();

function limited(id: string) {
  const now = Date.now(), w = (hits.get(id) ?? []).filter((t) => now - t < 60_000);
  w.push(now); hits.set(id, w);
  if (hits.size > 5000) hits.clear();
  return w.length > 10;
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  if (!KEY()) return NextResponse.json({ enabled: false }, { status: u.searchParams.has("check") ? 200 : 404 });
  if (u.searchParams.has("check")) return NextResponse.json({ enabled: true });
  if (limited(ipHash(req))) return NextResponse.json({ error: "Too many searches, wait a minute." }, { status: 429 });
  const b = (u.searchParams.get("bbox") ?? "").split(",").map(Number);
  const q = (u.searchParams.get("q") ?? "").slice(0, 100).trim();
  if (b.length !== 4 || b.some((x) => !isFinite(x))) return NextResponse.json({ error: "Bad bbox" }, { status: 400 });
  const [w, s, e, n] = b;
  if (e - w > 1 || n - s > 1) return NextResponse.json({ error: "Zoom in closer to search Google." }, { status: 400 });
  const r = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": KEY()!,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri,places.primaryType",
    },
    body: JSON.stringify({
      textQuery: q ? `${q} mosque` : "mosque masjid dargah",
      pageSize: 20,
      locationRestriction: { rectangle: { low: { latitude: s, longitude: w }, high: { latitude: n, longitude: e } } },
    }),
  });
  if (!r.ok) return NextResponse.json({ error: "Google search failed" }, { status: 502 });
  const j = (await r.json()) as { places?: { id: string; displayName?: { text: string }; formattedAddress?: string; location?: { latitude: number; longitude: number }; googleMapsUri?: string; primaryType?: string }[] };
  const places = (j.places ?? []).map((p) => ({ place_id: p.id, name: p.displayName?.text ?? "", address: p.formattedAddress ?? "", lat: p.location?.latitude, lng: p.location?.longitude, url: p.googleMapsUri, type: p.primaryType }));
  return NextResponse.json({ places }, { headers: { "Cache-Control": "no-store" } });
}
