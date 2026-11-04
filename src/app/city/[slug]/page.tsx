import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { repo, citySlug } from "@/lib/data";
import { PLACE_TYPES } from "@/lib/types";

export const revalidate = 60;
type Props = { params: Promise<{ slug: string }> };

async function findCity(slug: string) {
  const all = await repo.cities();
  const hits = all.filter((c) => citySlug(c.city) === slug);
  return hits.length ? { city: hits.sort((a, b) => b.n - a.n)[0].city, state: hits.sort((a, b) => b.n - a.n)[0].state } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await findCity((await params).slug);
  if (!c) return { title: "City not found" };
  return {
    title: `Mosques, dargahs and prayer rooms in ${c.city}`,
    description: `Directory of masjids, dargahs, idgahs and prayer rooms in ${c.city}, ${c.state}, with map, directions and prayer times.`,
    alternates: { canonical: `/city/${citySlug(c.city)}` },
  };
}

export default async function City({ params }: Props) {
  const c = await findCity((await params).slug);
  if (!c) notFound();
  const places = await repo.listPlaces(c.city);
  const byArea = new Map<string, typeof places>();
  for (const p of places) { const a = p.area ?? "Other areas"; byArea.set(a, [...(byArea.get(a) ?? []), p]); }
  const areas = [...byArea.entries()].sort((a, b) => (a[0] === "Other areas" ? 1 : b[0] === "Other areas" ? -1 : a[0].localeCompare(b[0])));
  const jsonLd = {
    "@context": "https://schema.org", "@type": "ItemList", name: `Mosques in ${c.city}`,
    itemListElement: places.slice(0, 100).map((p, i) => ({ "@type": "ListItem", position: i + 1, item: { "@type": "Mosque", name: p.name, geo: { "@type": "GeoCoordinates", latitude: p.lat, longitude: p.lng } } })),
  };
  return (
    <main className="mx-auto max-w-3xl px-4 pb-10 pt-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <p className="text-xs text-gray-500"><Link href="/directory" className="underline">Directory</Link> / {c.state}</p>
      <h1 className="page-title">Mosques, dargahs and prayer rooms in {c.city}</h1>
      <p className="mt-2 text-gray-600">{places.length} places listed. {PLACE_TYPES.map((t) => [t, places.filter((p) => p.type === t.value).length] as const).filter(([, n]) => n).map(([t, n]) => `${n} ${t.label.toLowerCase()}`).join(", ")}.</p>
      <p className="mt-1 text-sm"><Link href="/" className="font-medium text-accent-text hover:underline">Open the map</Link> - missing a place? <Link href="/submit" className="font-medium text-accent-text hover:underline">Add it</Link>.</p>
      {areas.map(([a, ps]) => (
        <section key={a} className="mt-6">
          <h2 className="font-semibold">{a} <span className="text-sm text-gray-500">({ps.length})</span></h2>
          <ul className="mt-1 grid gap-1 sm:grid-cols-2">
            {ps.map((p) => <li key={p.id}><Link href={`/place/${p.slug}`} className="text-sm text-emerald-800 hover:underline">{p.name}</Link> <span className="text-xs capitalize text-gray-500">{p.type.replace("_", " ")}</span></li>)}
          </ul>
        </section>
      ))}
      <p className="mt-8 text-xs text-gray-500">Data: OpenStreetMap contributors (ODbL), Overture Maps Foundation (CDLA-Permissive-2.0 / ODbL), Wikidata (CC0), community submissions.</p>
    </main>
  );
}
