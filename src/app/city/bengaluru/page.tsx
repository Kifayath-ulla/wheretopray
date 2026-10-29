import type { Metadata } from "next";
import Link from "next/link";
import { repo } from "@/lib/data";
import { PLACE_TYPES } from "@/lib/types";

export const metadata: Metadata = {
  title: "Mosques, dargahs and prayer rooms in Bengaluru",
  description: "Directory of masjids, dargahs, idgahs and prayer rooms in Bengaluru, Karnataka, with map, areas and prayer times.",
  alternates: { canonical: "/city/bengaluru" },
};

export default async function Bengaluru() {
  const places = await repo.listPlaces("Bengaluru");
  const byArea = new Map<string, typeof places>();
  for (const p of places) {
    const a = p.area ?? "Other areas";
    byArea.set(a, [...(byArea.get(a) ?? []), p]);
  }
  const areas = [...byArea.entries()].sort((a, b) => (a[0] === "Other areas" ? 1 : b[0] === "Other areas" ? -1 : a[0].localeCompare(b[0])));
  const jsonLd = {
    "@context": "https://schema.org", "@type": "ItemList", name: "Mosques in Bengaluru",
    itemListElement: places.slice(0, 100).map((p, i) => ({ "@type": "ListItem", position: i + 1, item: { "@type": "Mosque", name: p.name, geo: { "@type": "GeoCoordinates", latitude: p.lat, longitude: p.lng } } })),
  };
  return (
    <main className="mx-auto max-w-3xl p-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 className="text-2xl font-bold">Mosques, dargahs and prayer rooms in Bengaluru</h1>
      <p className="mt-2 text-gray-600">{places.length} places listed. {PLACE_TYPES.map((t) => `${places.filter((p) => p.type === t.value).length} ${t.label.toLowerCase()}`).join(", ")}.</p>
      <p className="mt-1 text-sm"><Link href="/" className="text-emerald-700 underline">Open the map</Link> - missing a place? <Link href="/submit" className="text-emerald-700 underline">Add it</Link>.</p>
      {areas.map(([a, ps]) => (
        <section key={a} className="mt-6">
          <h2 className="font-semibold">{a} <span className="text-sm text-gray-500">({ps.length})</span></h2>
          <ul className="mt-1 grid gap-1 sm:grid-cols-2">
            {ps.map((p) => <li key={p.id}><Link href={`/place/${p.slug}`} className="text-sm text-emerald-800 hover:underline">{p.name}</Link></li>)}
          </ul>
        </section>
      ))}
      <p className="mt-8 text-xs text-gray-500">Data © OpenStreetMap contributors (ODbL).</p>
    </main>
  );
}
