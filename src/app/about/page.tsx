import type { Metadata } from "next";
export const metadata: Metadata = { title: "About and data credits" };
export default function About() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="page-title">About</h1>
      <p className="lead mt-3">wheretopray helps you find mosques, dargahs, idgahs, musallas and prayer rooms near you, with qibla direction and prayer times.</p>
      <h2 className="mt-8 text-xl font-semibold">Data credits</h2>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink-2">
        <li>© <a className="link" href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>, licensed under the ODbL.</li>
        <li><a className="link" href="https://docs.overturemaps.org/attribution/">Overture Maps Foundation</a> Places (CDLA-Permissive-2.0) and Overture Maps (CDLA-Permissive-2.0 / ODbL).</li>
        <li><a className="link" href="https://www.wikidata.org">Wikidata</a> (CC0).</li>
        <li><a className="link" href="https://www.geonames.org">GeoNames</a> (CC BY 4.0).</li>
        <li>Boundaries from <a className="link" href="https://www.geoboundaries.org">geoBoundaries</a>.</li>
        <li>Map tiles by <a className="link" href="https://openfreemap.org">OpenFreeMap</a>, map data © OpenStreetMap contributors.</li>
        <li>Geocoding by <a className="link" href="https://nominatim.org">Nominatim</a>. Prayer times are calculated locally on your device.</li>
        <li>Community submissions from people like you.</li>
      </ul>
    </main>
  );
}
