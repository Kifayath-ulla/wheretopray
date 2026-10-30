import type { Metadata } from "next";
export const metadata: Metadata = { title: "About and data credits" };
const CREDITS: [string, string, string][] = [
  ["OpenStreetMap contributors", "https://www.openstreetmap.org/copyright", "Places and area names, ODbL"],
  ["Overture Maps Foundation", "https://docs.overturemaps.org/attribution/", "Places, CDLA-Permissive-2.0 / ODbL"],
  ["Wikidata", "https://www.wikidata.org", "Notable sites, CC0"],
  ["GeoNames", "https://www.geonames.org", "Place names, CC BY 4.0"],
  ["geoBoundaries", "https://www.geoboundaries.org", "Ward and city boundaries"],
  ["OpenFreeMap", "https://openfreemap.org", "Map tiles, data © OpenStreetMap"],
  ["Nominatim", "https://nominatim.org", "Area and pincode search"],
];
export default function About() {
  return (
    <main className="mx-auto max-w-2xl px-5 pb-16 pt-12">
      <h1 className="page-title">About</h1>
      <p className="lead mt-4">wheretopray helps you find mosques, dargahs, idgahs, musallas and prayer rooms near you, with the qibla direction and prayer times. It is free, has no ads and needs no account.</p>
      <h2 className="section-title mt-12">Data credits</h2>
      <ul className="group-list">
        {CREDITS.map(([name, href, what]) => (
          <li key={name}><a href={href} className="list-row justify-between hover:bg-surface-2" target="_blank" rel="noreferrer"><span className="font-medium">{name}</span><span className="text-right text-[13px] text-ink-3">{what}</span></a></li>
        ))}
      </ul>
      <p className="mt-4 px-1 text-[13px] text-ink-3">Prayer times are calculated for each place&apos;s coordinates. Community submissions are reviewed before they appear.</p>
    </main>
  );
}
