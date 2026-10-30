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
    <main className="mx-auto max-w-4xl px-5 pb-16 pt-10">
      <h1 className="page-title">Directory</h1>
      <p className="mt-3 text-[15px] text-ink-2" data-testid="total">{total.toLocaleString("en-IN")} places in {cities.length.toLocaleString("en-IN")} cities and towns across {states.length} states and territories.</p>
      <nav className="sheet-x -mx-5 mt-6 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]" aria-label="States">
        <Link href="/directory" className={`chip ${!sp.state ? "chip-on" : ""}`}>All states</Link>
        {states.map((s) => <Link key={s.s} href={`/directory?state=${encodeURIComponent(s.s)}`} className={`chip ${sp.state === s.s ? "chip-on" : ""}`}>{s.s}</Link>)}
      </nav>
      {shown.map(({ s, cs, n }) => (
        <section key={s} className="mt-10">
          <h2 className="mb-3 flex items-baseline justify-between px-1 text-[1.15rem] font-semibold">{s} <span className="font-mono text-[13px] font-normal text-ink-3">{n.toLocaleString("en-IN")}</span></h2>
          <ul className="group-list grid sm:grid-cols-2 lg:grid-cols-3 [&>*+*]:border-t-0">
            {(sp.state ? cs : cs.slice(0, 24)).map((c) => (
              <li key={c.city} className="border-b border-hairline"><Link href={`/city/${citySlug(c.city)}`} className="list-row justify-between hover:bg-surface-2"><span className="truncate">{c.city}</span><span className="font-mono text-[12px] text-ink-3">{c.n}</span></Link></li>
            ))}
          </ul>
          {!sp.state && cs.length > 24 && <Link href={`/directory?state=${encodeURIComponent(s)}`} className="mt-3 inline-block px-1 text-[14px] font-medium text-accent-text">All {cs.length} cities in {s}</Link>}
        </section>
      ))}
    </main>
  );
}
