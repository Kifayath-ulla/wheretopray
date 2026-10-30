import type { Metadata, Viewport } from "next";
import { Header, TabBar } from "@/components/ui/Nav";
import SiteFooter from "@/components/ui/SiteFooter";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Self-hosted at build by next/font. Porcelain theme: Geist + Geist Mono.
const sans = Geist({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--nf-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--nf-mono", display: "swap" });

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
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#fbfbfc" }, { media: "(prefers-color-scheme: dark)", color: "#0e0f11" }],
  width: "device-width", initialScale: 1, viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-dvh bg-canvas pb-[var(--tabbar-h)] text-ink antialiased md:pb-0">
        <Header />
        {children}
        <SiteFooter />
        <TabBar />
      </body>
    </html>
  );
}
