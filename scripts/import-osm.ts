/**
 * Import Muslim places of worship for Bengaluru from OpenStreetMap (Overpass API).
 * Data (c) OpenStreetMap contributors, ODbL.
 * Usage: npx tsx scripts/import-osm.ts
 */
import { writeFileSync } from "node:fs";
import type { Place, PlaceType } from "../src/lib/types";

const BBOX = "12.70,77.30,13.35,77.90"; // Bengaluru Urban + Rural + outskirts
const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];

const query = `[out:json][timeout:180];
(
  nwr["amenity"="place_of_worship"]["religion"="muslim"](${BBOX});
  nwr["tomb"="dargah"](${BBOX});
  nwr["historic"="tomb"]["religion"="muslim"](${BBOX});
  nwr["name"~"dargah|dargha|darga|ziyarat|masjid|masjeed|mosque|musalla|musallah|namaz|prayer room|prayer hall|eidgah|idgah|jamia|jama masjid|madrasa",i](${BBOX});
);
out center tags;`;

type El = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };

function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "place";
}

function classify(t: Record<string, string>): PlaceType | null {
  const name = `${t.name ?? ""} ${t["name:en"] ?? ""}`.toLowerCase();
  const isMuslimPow = t.amenity === "place_of_worship" && t.religion === "muslim";
  if (t.tomb === "dargah" || /dargah|darga\b|ziyarat/.test(name)) return "dargah";
  if (/idgah|eidgah|eid gah/.test(name)) return "idgah";
  if (/prayer room|namaz room|namaz hall/.test(name)) return "prayer_room";
  if (/musall?ah?\b/.test(name)) return "musalla";
  if (isMuslimPow || /masjid|mosque|masjeed|jamia|jama masjid/.test(name)) {
    // drop non-Muslim places that happen to match a keyword
    if (t.religion && t.religion !== "muslim") return null;
    return "mosque";
  }
  if (t.historic === "tomb" && t.religion === "muslim") return "dargah";
  return null;
}

const yn = (v?: string) => (v === undefined ? null : v === "yes" ? true : v === "no" ? false : null);

async function fetchOverpass(): Promise<El[]> {
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        body: new URLSearchParams({ data: query }),
        headers: { "User-Agent": "wheretopray-importer/0.1" },
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const json = (await res.json()) as { elements: El[] };
      return json.elements;
    } catch (e) {
      console.warn(`Overpass ${url} failed: ${e}`);
    }
  }
  throw new Error("All Overpass endpoints failed");
}

async function main() {
  const els = await fetchOverpass();
  const now = new Date().toISOString();
  const used = new Set<string>();
  const places: Place[] = [];
  for (const el of els) {
    const t = el.tags ?? {};
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (lat == null || lng == null) continue;
    const type = classify(t);
    if (!type) continue;
    const name = t["name:en"] || t.name || (type === "mosque" ? "Unnamed masjid" : `Unnamed ${type.replace("_", " ")}`);
    const area = t["addr:suburb"] || t["addr:neighbourhood"] || t["addr:district"] || null;
    const address = [t["addr:housenumber"], t["addr:street"], area, t["addr:postcode"]].filter(Boolean).join(", ") || null;
    let slug = slugify(name);
    if (used.has(slug)) slug = `${slug}-${el.type[0]}${el.id}`;
    used.add(slug);
    places.push({
      id: `osm-${el.type}-${el.id}`,
      slug,
      name,
      name_local: t.name && t.name !== name ? t.name : null,
      type,
      lat: +lat.toFixed(6),
      lng: +lng.toFixed(6),
      address,
      area,
      city: "Bengaluru",
      state: "Karnataka",
      country: "IN",
      denomination: t.denomination ?? null,
      women_section: yn(t.female) ?? yn(t["women"]),
      wudu: yn(t.wudu) ?? yn(t["toilets:wudu"]),
      parking: t.parking ? t.parking !== "no" : null,
      wheelchair: yn(t.wheelchair),
      phone: t.phone || t["contact:phone"] || null,
      website: t.website || t["contact:website"] || null,
      jumuah_time: null,
      iqama_times: null,
      source: "osm",
      source_id: `${el.type}/${el.id}`,
      last_verified: now,
      status: "verified",
    });
  }
  // dedupe: same normalized name within 75 m
  const out: Place[] = [];
  for (const p of places) {
    const dup = out.find((q) => q.name.toLowerCase() === p.name.toLowerCase() && Math.hypot((q.lat - p.lat) * 111000, (q.lng - p.lng) * 108000) < 75);
    if (!dup) out.push(p);
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  writeFileSync("data/raw/osm.json", JSON.stringify(out, null, 0) + "\n");
  const counts = out.reduce<Record<string, number>>((a, p) => ((a[p.type] = (a[p.type] ?? 0) + 1), a), {});
  console.log(`Wrote ${out.length} places`, counts);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
