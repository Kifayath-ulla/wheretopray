import type { MetadataRoute } from "next";
import { repo, citySlug } from "@/lib/data";

export const revalidate = 3600;
const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://wheretopray.vercel.app";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [slugs, cities] = await Promise.all([repo.slugs(), repo.cities()]);
  const citySlugs = [...new Set(cities.filter((c) => c.city && c.city !== "Unknown").map((c) => citySlug(c.city)))].filter(Boolean);
  return [
    { url: BASE }, { url: `${BASE}/directory` },
    ...citySlugs.map((s) => ({ url: `${BASE}/city/${s}` })),
    ...slugs.map((p) => ({ url: `${BASE}/place/${p.slug}`, lastModified: p.last_verified })),
  ];
}
