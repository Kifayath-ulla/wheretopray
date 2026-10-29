import type { Metadata } from "next";
import Link from "next/link";
import { repo } from "@/lib/data";
import { PLACE_TYPES, type Place } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Directory of mosques, dargahs and prayer rooms", description: "Browse every listed mosque, dargah, idgah, musalla and prayer room by area, type or A-Z." };

type SP = Promise<{ by?: string; type?: string; area?: string; letter?: string }>;

export default async function Directory({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const by = sp.by === "type" || sp.by === "az" ? sp.by : "area";
  const all = await repo.listPlaces();
  let places = all;
  if (sp.type) places = places.filter((p) => p.type === sp.type);
  if (sp.area) places = places.filter((p) => (p.area ?? "Other") === sp.area);
  const letterOf = (p: Place) => (/[A-Z]/.test(p.name[0]?.toUpperCase()) ? p.name[0].toUpperCase() : "#");
  if (sp.letter) places = places.filter((p) => letterOf(p) === sp.letter);

  const groups = new Map<string, Place[]>();
  for (const p of places) {
    const k = by === "type" ? PLACE_TYPES.find((t) => t.value === p.type)!.label : by === "az" ? letterOf(p) : p.area ?? "Other";
    groups.set(k, [...(groups.get(k) ?? []), p]);
  }
  const sorted = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const typeCounts = PLACE_TYPES.map((t) => ({ ...t, n: all.filter((p) => p.type === t.value).length }));
  const letters = [...new Set(all.map(letterOf))].sort();
  const areaCount = new Set(all.map((p) => p.area ?? "Other")).size;
  const tab = (b: string, label: string) => <Link href={`/directory?by=${b}`} className={`rounded-full border px-3 py-1 ${by === b ? "bg-emerald-700 text-white" : ""}`}>{label}</Link>;

  return (
    <main className="mx-auto max-w-4xl p-4">
      <h1 className="text-2xl font-bold">Directory</h1>
      <p className="mt-1 text-gray-600" data-testid="total">{all.length} places across {areaCount} areas.</p>
      <div className="mt-3 flex flex-wrap gap-2 text-sm">{tab("area", "By area")}{tab("type", "By type")}{tab("az", "A-Z")}</div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {typeCounts.map((t) => <Link key={t.value} href={`/directory?by=${by}&type=${t.value}`} className={`rounded border px-2 py-1 ${sp.type === t.value ? "bg-emerald-50 border-emerald-700" : ""}`}>{t.label} ({t.n})</Link>)}
        {(sp.type || sp.area || sp.letter) && <Link href={`/directory?by=${by}`} className="px-2 py-1 underline">Clear filters</Link>}
      </div>
      <div className="mt-2 flex flex-wrap gap-1 text-xs">
        {letters.map((l) => <Link key={l} href={`/directory?by=az&letter=${encodeURIComponent(l)}`} className={`w-6 rounded border text-center ${sp.letter === l ? "bg-emerald-700 text-white" : ""}`}>{l}</Link>)}
      </div>
      {by === "area" && !sp.area && (
        <nav className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs">
          {sorted.map(([k, ps]) => <a key={k} href={`#g-${encodeURIComponent(k)}`} className="text-emerald-800 hover:underline">{k} ({ps.length})</a>)}
        </nav>
      )}
      {sorted.map(([k, ps]) => (
        <section key={k} id={`g-${encodeURIComponent(k)}`} className="mt-6">
          <h2 className="font-semibold">
            {by === "area" ? <Link href={`/directory?by=area&area=${encodeURIComponent(k)}`} className="hover:underline">{k}</Link> : k} <span className="text-sm text-gray-500">({ps.length})</span>
          </h2>
          <ul className="mt-1 grid gap-1 sm:grid-cols-2">
            {ps.sort((a, b) => a.name.localeCompare(b.name)).map((p) => (
              <li key={p.id} className="text-sm"><Link href={`/place/${p.slug}`} className="text-emerald-800 hover:underline">{p.name}</Link> <span className="text-xs capitalize text-gray-500">{p.type.replace("_", " ")}{by !== "area" && p.area ? ` - ${p.area}` : ""}</span></li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
