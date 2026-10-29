import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "wheretopray - find a mosque, dargah or prayer room near you", template: "%s | wheretopray" },
  description: "Find mosques, masjids, dargahs, idgahs, musallas and prayer rooms near you, with prayer times.",
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = { themeColor: "#047857", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-white px-4">
          <Link href="/" className="text-lg font-bold text-emerald-800">wheretopray</Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/directory">Directory</Link>
            <Link href="/qibla">Qibla</Link>
            <Link href="/bengaluru/gaps">Gaps</Link>
            <Link href="/add" className="font-medium text-emerald-700">Add a place</Link>
          </nav>
        </header>
        {children}
        <footer className="border-t bg-white px-4 py-3 text-xs text-gray-500">
          Data: © <a className="underline" href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> (ODbL);{" "}
          <a className="underline" href="https://docs.overturemaps.org/attribution/">Overture Maps Foundation</a> Places (CDLA-Permissive-2.0);{" "}
          <a className="underline" href="https://overturemaps.org">Overture Maps</a> (CDLA-Permissive-2.0 / ODbL); <a className="underline" href="https://www.wikidata.org">Wikidata</a> (CC0); <a className="underline" href="https://www.geonames.org">GeoNames</a> (CC BY 4.0); boundaries from <a className="underline" href="https://www.geoboundaries.org">geoBoundaries</a>; community submissions. Prayer times calculated locally. Geocoding by Nominatim.
        </footer>
      </body>
    </html>
  );
}
