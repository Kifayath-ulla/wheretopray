"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Explore ("/") is a full-screen app view, so it gets no footer. Full credits live on /about.
export default function SiteFooter() {
  const path = usePathname() || "/";
  if (path === "/") return null;
  return (
    <footer className="mx-auto max-w-6xl px-4 py-8 text-[11px] leading-relaxed text-ink-3">
      Data © OpenStreetMap contributors (ODbL), Overture Maps Foundation (CDLA-Permissive-2.0), Wikidata (CC0), GeoNames (CC BY 4.0) and community submissions.{" "}
      <Link href="/about" className="underline">Full credits</Link>
    </footer>
  );
}
