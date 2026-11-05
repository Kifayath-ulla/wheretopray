import type { Metadata, Viewport } from "next";
import { Header, TabBar } from "@/components/ui/Nav";
import SiteFooter from "@/components/ui/SiteFooter";
import "./globals.css";
import { THEME_SCRIPT } from "@/lib/theme";
import { META_DESC } from "@/lib/copy";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://wheretopray.in"),
  title: { default: "wheretopray - find a mosque, dargah or prayer room near you", template: "%s | wheretopray" },
  description: META_DESC,
  manifest: "/manifest.webmanifest",
  applicationName: "wheretopray",
  appleWebApp: { capable: true, title: "wheretopray", statusBarStyle: "default" },
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icon-192.png", sizes: "192x192" }], apple: "/apple-icon.png" },
  openGraph: { type: "website", siteName: "wheretopray", title: "wheretopray - find a place to pray near you", description: META_DESC, images: [{ url: "/og.png", width: 1200, height: 630, alt: "wheretopray - find a place to pray" }] },
  twitter: { card: "summary_large_image", title: "wheretopray - find a place to pray near you", description: META_DESC, images: ["/og.png"] },
};
export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f5f5f7" }, { media: "(prefers-color-scheme: dark)", color: "#000000" }],
  width: "device-width", initialScale: 1, viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} /></head>
      <body className="min-h-dvh bg-canvas pb-[var(--tabbar-h)] text-ink antialiased md:pb-0">
        <Header />
        {children}
        <SiteFooter />
        <TabBar />
      </body>
    </html>
  );
}
