import type { Metadata } from "next";
import Link from "next/link";
import { repo, citySlug, type CityCount } from "@/lib/data";

export const revalidate = 60;
export const metadata: Metadata = { title: "Directory of mosques, dargahs and prayer rooms in India", description: "Browse mosques, dargahs, idgahs, musallas and prayer rooms by state and city across India." };

export default async function Directory({ searchParams }: { searchParams: Promise<{ state?: string; q?: string }> }) {
  const sp = await searchParams;
  const cities = (await repo.cities()).filter((c) => c.city && c.city !== "Unknown");
  const byState = new Map<string, CityCount[]>();
  for (const c of cities) byState.set(c.state || "Other", [...(byState.get(c.state || "Other") ?? []), c]);
  const states = [...byState.entries()].map(([s, cs]) => ({ s, cs: cs.sort((a, b) => b.n - a.n), n: cs.reduce((x, c) => x + c.n, 0) })).sort((a, b) => b.n - a.n);
  const total = states.reduce((x, s) => x + s.n, 0);
  const shown = sp.state ? states.filter((s) => s.s === sp.state) : states;
  const bengaluru = cities.find((c) => /bengaluru|bangalore/i.test(c.city));
  return (
    <main className="mx-auto max-w-4xl px-4 pb-10 pt-6">
      <h1 className="page-title">Directory</h1>
      <form action="/directory" className="mt-4">
        <label className="relative block">
          <span className="sr-only">Search directory</span>
          <input name="q" defaultValue={sp.q ?? ""} placeholder={`Search ${total.toLocaleString("en-IN")} places`} className="h-14 w-full rounded-2xl border border-hairline bg-surface px-4 text-base" />
        </label>
      </form>
      {bengaluru && (
        <Link href="/" className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-accent px-4 py-4 text-[var(--on-accent)]">
          <span>
            <span className="block text-base font-semibold">Near you: Bengaluru</span>
            <span className="block text-sm opacity-90">{bengaluru.n.toLocaleString("en-IN")} places listed</span>
          </span>
          <span className="inline-flex min-h-11 items-center rounded-full bg-black/20 px-3 text-sm font-semibold">Explore ›</span>
        </Link>
      )}
      <Link href="/contribute" className="mt-4 flex min-h-14 items-center justify-between rounded-2xl border border-hairline bg-surface px-4 text-base">
        <span><span className="block font-semibold">Help map your area</span><span className="block text-sm text-ink-2">Add places, share timings, or volunteer</span></span>
        <span className="font-semibold text-accent-text">Contribute ›</span>
      </Link>
      <p className="mt-6 eyebrow">All India</p>
      <ul className="mt-2 overflow-hidden rounded-2xl border border-hairline bg-surface">
        {shown.map(({ s, n }) => (
          <li key={s} className="border-b border-hairline last:border-0">
            <Link href={`/directory?state=${encodeURIComponent(s)}`} className="flex min-h-14 items-center justify-between px-4 text-base font-medium">
              <span>{s}</span>
              <span className="font-semibold text-accent-text">{n.toLocaleString("en-IN")}</span>
            </Link>
          </li>
        ))}
      </ul>
      {sp.state && shown[0] && (
        <section className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{sp.state}</h2>
            <Link href="/directory" className="text-sm font-semibold text-accent-text">All states</Link>
          </div>
          <ul className="overflow-hidden rounded-2xl border border-hairline bg-surface">
            {shown[0].cs.map((c) => (
              <li key={c.city} className="border-b border-hairline last:border-0">
                <Link href={`/city/${citySlug(c.city)}`} className="flex min-h-14 items-center justify-between px-4 text-base">
                  <span>{c.city}</span>
                  <span className="text-sm font-semibold text-accent-text">{c.n.toLocaleString("en-IN")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="mt-4 text-sm text-ink-2" data-testid="total">{total.toLocaleString("en-IN")} places in {cities.length.toLocaleString("en-IN")} cities across {states.length} states and territories.</p>
    </main>
  );
}
