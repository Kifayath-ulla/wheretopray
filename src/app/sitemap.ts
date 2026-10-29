import type { MetadataRoute } from "next";
import { repo } from "@/lib/data";

export const dynamic = "force-dynamic";
const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://wheretopray.example";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const places = await repo.listPlaces();
  return [{ url: BASE }, { url: `${BASE}/city/bengaluru` }, ...places.map((p) => ({ url: `${BASE}/place/${p.slug}`, lastModified: p.last_verified }))];
}
