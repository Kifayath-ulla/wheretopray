import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };
export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-4 pb-10 pt-16 text-center">
      <h1 className="page-title">Page not found</h1>
      <p className="mt-2 text-gray-600">This page or place does not exist, or it may have been removed.</p>
      <p className="mt-4 flex justify-center gap-4 text-sm">
        <Link href="/" className="font-medium text-accent-text hover:underline">Open the map</Link>
        <Link href="/directory" className="font-medium text-accent-text hover:underline">Browse the directory</Link>
      </p>
    </main>
  );
}
