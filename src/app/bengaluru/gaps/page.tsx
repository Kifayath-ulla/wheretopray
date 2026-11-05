import type { Metadata } from "next";
import { promises as fs } from "node:fs";
import path from "node:path";
import Link from "next/link";
import { repo } from "@/lib/data";
import GapMap from "@/components/GapMapLazy";

export const metadata: Metadata = { title: "Bengaluru ward gap map", description: "Which BBMP wards have the fewest mosques, dargahs and prayer rooms listed. Help fill the gaps." };
export const revalidate = 600;

type Ring = number[][];
type Geom = { type: "Polygon"; coordinates: Ring[] } | { type: "MultiPolygon"; coordinates: Ring[][] };
type Ward = { type: "Feature"; properties: { no: string; name: string; count?: number }; geometry: Geom };

function inRing(x: number, y: number, r: Ring) {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i], [xj, yj] = r[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
const inPoly = (x: number, y: number, p: Ring[]) => inRing(x, y, p[0]) && !p.slice(1).some((h) => inRing(x, y, h));
const inGeom = (x: number, y: number, g: Geom) => (g.type === "Polygon" ? inPoly(x, y, g.coordinates) : g.coordinates.some((p) => inPoly(x, y, p)));
function bbox(g: Geom) {
  const pts = (g.type === "Polygon" ? g.coordinates : g.coordinates.flat()).flat();
  return [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
}

export default async function Gaps() {
  const wards: { features: Ward[] } = JSON.parse(await fs.readFile(path.join(process.cwd(), "public/data/bbmp-wards.json"), "utf8"));
  const places = await repo.inBbox(77.3, 12.8, 77.9, 13.2, 5000);
  const boxes = wards.features.map((w) => bbox(w.geometry));
  let inside = 0;
  for (const w of wards.features) w.properties.count = 0;
  for (const p of places) {
    const i = wards.features.findIndex((w, k) => p.lng >= boxes[k][0] && p.lng <= boxes[k][2] && p.lat >= boxes[k][1] && p.lat <= boxes[k][3] && inGeom(p.lng, p.lat, w.geometry));
    if (i >= 0) { wards.features[i].properties.count!++; inside++; }
  }
  const sorted = [...wards.features].sort((a, b) => a.properties.count! - b.properties.count! || a.properties.name.localeCompare(b.properties.name));
  const zero = sorted.filter((w) => w.properties.count === 0).length;
  return (
    <main className="mx-auto max-w-5xl space-y-5 px-4 pb-10 pt-8">
      <h1 className="page-title">Coverage gaps</h1>
      <p className="text-[15px] text-ink-2">
        {inside} places listed inside {wards.features.length} BBMP wards. {zero} wards have none listed yet. Pale wards need the most help.
        If you live or work in one, <Link className="font-medium text-accent-text hover:underline" href="/add">add your local masjid in 30 seconds</Link>.
      </p>
      <Link href="/add" className="btn btn-primary inline-flex h-12 px-5 text-base">Add a place</Link>
      <GapMap wards={wards} />
      <section>
        <h2 className="mb-3 text-lg font-semibold">Empty or thin wards</h2>
        <ul className="space-y-3">
          {sorted.slice(0, 24).map((w) => (
            <li key={w.properties.no} className="rounded-2xl border border-hairline bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{w.properties.name}</p>
                  <p className="mt-0.5 text-sm text-ink-2">Ward {w.properties.no} · Bengaluru</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${w.properties.count === 0 ? "bg-amber-500/15 text-amber-800 dark:text-amber-200" : "bg-surface-2 text-ink-2"}`}>
                  {w.properties.count === 0 ? "0 listed" : `${w.properties.count} listed`}
                </span>
              </div>
              <div className="mt-3 flex justify-end">
                <Link href="/add" className="btn btn-primary h-11 px-4 text-sm">+ Add</Link>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <p className="text-xs text-gray-500">Ward boundaries: BBMP 2023 wards (KGIS) via <a className="underline" href="https://github.com/datameet/Municipal_Spatial_Data">Datameet Municipal Spatial Data</a>. Counts refresh every 10 minutes.</p>
    </main>
  );
}
