import { NextResponse } from "next/server";
import { repo } from "@/lib/data";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const lat = u.searchParams.get("lat"), lng = u.searchParams.get("lng");
  if (lat && lng) return NextResponse.json(await repo.near(+lat, +lng, +(u.searchParams.get("radius_km") ?? 5)));
  return NextResponse.json(await repo.listPlaces(u.searchParams.get("city") ?? undefined));
}
