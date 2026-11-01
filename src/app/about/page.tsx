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
        <li>Geocoding by <a className="link" href="https://nominatim.org">Nominatim</a>. Prayer times come from the <a className="link" href="https://aladhan.com">Aladhan</a> API.</li>
        <li>Community submissions from people like you.</li>
      </ul>
      <h2 className="mt-8 text-xl font-semibold">Privacy</h2>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-ink-2">
        <li>Your exact location stays in your browser. To load nearby places our server only receives it rounded to about 1 km, and it is not stored.</li>
        <li>When you search an address or add a place, the text or pin is sent to OpenStreetMap Nominatim to look it up. Prayer times send the place or your approximate coordinates to Aladhan.</li>
        <li>If your browser blocks exact location, we ask ipwho.is for an approximate location. This shares your IP address with ipwho.is.</li>
        <li>For spam protection we keep only a salted one-way hash of your IP for a day, never the IP itself. No ads, analytics or trackers.</li>
      </ul>
    </main>
  );
}
