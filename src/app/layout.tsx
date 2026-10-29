import type { Metadata, Viewport } from "next";
import { Header, TabBar } from "@/components/ui/Nav";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://wheretopray.vercel.app"),
  title: { default: "wheretopray - find a mosque, dargah or prayer room near you", template: "%s | wheretopray" },
  description: "Find mosques, masjids, dargahs, idgahs, musallas and prayer rooms near you, with qibla and prayer times.",
  manifest: "/manifest.webmanifest",
  applicationName: "wheretopray",
  appleWebApp: { capable: true, title: "wheretopray", statusBarStyle: "default" },
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icon-192.png", sizes: "192x192" }], apple: "/apple-icon.png" },
  openGraph: { type: "website", siteName: "wheretopray", images: [{ url: "/og.png", width: 1200, height: 630, alt: "wheretopray - find a place to pray" }] },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};
export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f5f5f7" }, { media: "(prefers-color-scheme: dark)", color: "#000000" }],
  width: "device-width", initialScale: 1, viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-canvas pb-20 text-ink antialiased md:pb-0">
        <Header />
        {children}
        <footer className="mx-auto max-w-6xl px-4 py-8 text-[11px] leading-relaxed text-ink-3">
          Data: © <a className="underline" href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> (ODbL);{" "}
          <a className="underline" href="https://docs.overturemaps.org/attribution/">Overture Maps Foundation</a> Places (CDLA-Permissive-2.0);{" "}
          <a className="underline" href="https://overturemaps.org">Overture Maps</a> (CDLA-Permissive-2.0 / ODbL); <a className="underline" href="https://www.wikidata.org">Wikidata</a> (CC0); <a className="underline" href="https://www.geonames.org">GeoNames</a> (CC BY 4.0); boundaries from <a className="underline" href="https://www.geoboundaries.org">geoBoundaries</a>; community submissions. Prayer times calculated locally. Geocoding by Nominatim.
        </footer>
        <TabBar />
      </body>
    </html>
  );
}
