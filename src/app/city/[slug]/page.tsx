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
    <main className="mx-auto max-w-3xl px-5 pb-16 pt-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-[13px] text-ink-3"><Link href="/directory" className="hover:text-ink">Directory</Link> / {c.state}</p>
      <h1 className="page-title mt-2">Places to pray in {c.city}</h1>
      <p className="mt-3 text-[15px] text-ink-2">{places.length} places listed. {PLACE_TYPES.map((t) => [t, places.filter((p) => p.type === t.value).length] as const).filter(([, n]) => n).map(([t, n]) => `${n} ${t.label.toLowerCase()}`).join(", ")}.</p>
      <div className="mt-5 flex gap-2"><Link href="/" className="btn btn-primary">Open the map</Link><Link href="/add" className="btn btn-secondary">Add a missing place</Link></div>
      {areas.map(([a, ps]) => (
        <section key={a} className="mt-10">
          <h2 className="mb-3 flex items-baseline justify-between px-1 text-[1.05rem] font-semibold">{a} <span className="font-mono text-[13px] font-normal text-ink-3">{ps.length}</span></h2>
          <ul className="group-list">
            {ps.map((p) => <li key={p.id}><Link href={`/place/${p.slug}`} className="list-row justify-between hover:bg-surface-2"><span className="min-w-0 truncate">{p.name}</span><span className="shrink-0 text-[13px] capitalize text-ink-3">{p.type.replace("_", " ")}</span></Link></li>)}
          </ul>
        </section>
      ))}
      <p className="mt-10 px-1 text-[12px] text-ink-3">Data: OpenStreetMap contributors (ODbL), Overture Maps Foundation (CDLA-Permissive-2.0 / ODbL), Wikidata (CC0), community submissions.</p>
    </main>
  );
}
