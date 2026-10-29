import type { Metadata } from "next";
import Link from "next/link";
import { repo, citySlug, type CityCount } from "@/lib/data";

export const revalidate = 60;
export const metadata: Metadata = { title: "Directory of mosques, dargahs and prayer rooms in India", description: "Browse mosques, dargahs, idgahs, musallas and prayer rooms by state and city across India." };

export default async function Directory({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const sp = await searchParams;
  const cities = (await repo.cities()).filter((c) => c.city && c.city !== "Unknown");
  const byState = new Map<string, CityCount[]>();
  for (const c of cities) byState.set(c.state || "Other", [...(byState.get(c.state || "Other") ?? []), c]);
  const states = [...byState.entries()].map(([s, cs]) => ({ s, cs: cs.sort((a, b) => b.n - a.n), n: cs.reduce((x, c) => x + c.n, 0) })).sort((a, b) => b.n - a.n);
  const total = states.reduce((x, s) => x + s.n, 0);
  const shown = sp.state ? states.filter((s) => s.s === sp.state) : states;
  return (
    <main className="mx-auto max-w-4xl p-4">
      <h1 className="text-2xl font-bold">Directory</h1>
      <p className="mt-1 text-gray-600" data-testid="total">{total.toLocaleString("en-IN")} places in {cities.length.toLocaleString("en-IN")} cities and towns across {states.length} states and territories.</p>
      <nav className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {states.map((s) => <Link key={s.s} href={`/directory?state=${encodeURIComponent(s.s)}`} className={`hover:underline ${sp.state === s.s ? "font-bold text-emerald-900" : "text-emerald-800"}`}>{s.s} ({s.n})</Link>)}
        {sp.state && <Link href="/directory" className="underline">All states</Link>}
      </nav>
      {shown.map(({ s, cs, n }) => (
        <section key={s} className="mt-6">
          <h2 className="font-semibold">{s} <span className="text-sm text-gray-500">({n})</span></h2>
          <ul className="mt-1 grid gap-1 sm:grid-cols-3 text-sm">
            {(sp.state ? cs : cs.slice(0, 24)).map((c) => <li key={c.city}><Link href={`/city/${citySlug(c.city)}`} className="text-emerald-800 hover:underline">{c.city}</Link> <span className="text-xs text-gray-500">({c.n})</span></li>)}
          </ul>
          {!sp.state && cs.length > 24 && <Link href={`/directory?state=${encodeURIComponent(s)}`} className="text-xs underline">All {cs.length} cities in {s}</Link>}
        </section>
      ))}
    </main>
  );
}
