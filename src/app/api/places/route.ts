import { NextResponse } from "next/server";
import { repo } from "@/lib/data";

export const revalidate = 60;

export async function GET(req: Request) {
  const u = new URL(req.url);
  const n = (k: string) => Number(u.searchParams.get(k));
  const lat = u.searchParams.get("lat"), lng = u.searchParams.get("lng");
  if (lat && lng) {
    if (!isFinite(+lat) || !isFinite(+lng)) return NextResponse.json({ error: "Bad coordinates" }, { status: 400 });
    return NextResponse.json(await repo.near(+lat, +lng, Math.min(n("radius_km") || 5, 50)));
  }
  if (u.searchParams.get("bbox")) {
    const [w, s, e, nn] = u.searchParams.get("bbox")!.split(",").map(Number);
    if (![w, s, e, nn].every(isFinite)) return NextResponse.json({ error: "Bad bbox" }, { status: 400 });
    return NextResponse.json(await repo.inBbox(w, s, e, nn, 3000));
  }
  const city = u.searchParams.get("city");
  if (!city) return NextResponse.json({ error: "Pass lat/lng, bbox or city" }, { status: 400 });
  return NextResponse.json(await repo.listPlaces(city));
}
