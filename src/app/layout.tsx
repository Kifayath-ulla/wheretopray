import type { Metadata, Viewport } from "next";
import { Header, TabBar } from "@/components/ui/Nav";
import SiteFooter from "@/components/ui/SiteFooter";
import { DM_Mono, Instrument_Sans, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";

// Self-hosted at build by next/font (no runtime Google request). Dose theme faces.
const display = Schibsted_Grotesk({ subsets: ["latin"], weight: ["700"], variable: "--nf-display", display: "swap" });
const body = Instrument_Sans({ subsets: ["latin"], weight: ["400", "500"], variable: "--nf-body", display: "swap" });
const mono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--nf-mono", display: "swap" });

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
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f8f6f0" }, { media: "(prefers-color-scheme: dark)", color: "#0b1210" }],
  width: "device-width", initialScale: 1, viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body className="min-h-dvh bg-canvas pb-[var(--tabbar-h)] text-ink antialiased md:pb-0">
        <Header />
        {children}
        <SiteFooter />
        <TabBar />
      </body>
    </html>
  );
}
