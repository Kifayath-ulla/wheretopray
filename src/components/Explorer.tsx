"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PLACE_TYPES, type Place, type PlaceType } from "@/lib/types";
import { distanceKm } from "@/lib/geo";

const PlaceMap = dynamic(() => import("./PlaceMap"), { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-emerald-50" /> });

export default function Explorer({ places, center }: { places: Place[]; center: [number, number] }) {
  const [q, setQ] = useState("");
  const [types, setTypes] = useState<PlaceType[]>([]);
  const [area, setArea] = useState("");
  const [fac, setFac] = useState<{ women: boolean; wudu: boolean; parking: boolean; wheelchair: boolean }>({ women: false, wudu: false, parking: false, wheelchair: false });
  const [me, setMe] = useState<[number, number] | null>(null);
  const [locMsg, setLocMsg] = useState("");
  const [limit, setLimit] = useState(50);

  const areas = useMemo(() => [...new Set(places.map((p) => p.area).filter(Boolean) as string[])].sort(), [places]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    let r = places.filter(
      (p) =>
        (!s || `${p.name} ${p.name_local ?? ""} ${p.address ?? ""} ${p.area ?? ""}`.toLowerCase().includes(s)) &&
        (!types.length || types.includes(p.type)) &&
        (!area || p.area === area) &&
        (!fac.women || p.women_section) &&
        (!fac.wudu || p.wudu) &&
        (!fac.parking || p.parking) &&
        (!fac.wheelchair || p.wheelchair),
    );
    if (me) r = r.map((p) => ({ ...p, _d: distanceKm(me[0], me[1], p.lat, p.lng) })).sort((a, b) => a._d - b._d);
    return r as (Place & { _d?: number })[];
  }, [places, q, types, area, fac, me]);

  function nearMe() {
    if (!navigator.geolocation) return setLocMsg("Location is not available in this browser.");
    setLocMsg("Finding you...");
    navigator.geolocation.getCurrentPosition(
      (pos) => { setMe([pos.coords.latitude, pos.coords.longitude]); setLocMsg(""); },
      () => setLocMsg("Could not get your location. Check browser permissions."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="flex flex-col md:flex-row md:h-[calc(100vh-56px)]">
      <div className="h-[45vh] md:h-full md:flex-1 md:order-2">
        <PlaceMap places={filtered} center={center} me={me} />
      </div>
      <aside className="md:w-[420px] md:order-1 md:overflow-y-auto border-r border-gray-200 bg-white">
        <div className="sticky top-0 z-10 bg-white p-3 space-y-2 border-b">
          <div className="flex gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, area, address" className="flex-1 rounded-lg border px-3 py-2 text-sm" aria-label="Search" />
            <button onClick={nearMe} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white whitespace-nowrap">Near me</button>
          </div>
          {locMsg && <p className="text-xs text-gray-600">{locMsg}</p>}
          <div className="flex flex-wrap gap-1">
            {PLACE_TYPES.map((t) => (
              <button key={t.value} onClick={() => setTypes((x) => (x.includes(t.value) ? x.filter((y) => y !== t.value) : [...x, t.value]))}
                className={`rounded-full border px-3 py-1 text-xs ${types.includes(t.value) ? "bg-emerald-700 text-white border-emerald-700" : "bg-white"}`}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select value={area} onChange={(e) => setArea(e.target.value)} className="rounded border px-2 py-1" aria-label="Area">
              <option value="">All areas</option>
              {areas.map((a) => <option key={a}>{a}</option>)}
            </select>
            {(["women", "wudu", "parking", "wheelchair"] as const).map((k) => (
              <label key={k} className="flex items-center gap-1">
                <input type="checkbox" checked={fac[k]} onChange={(e) => setFac({ ...fac, [k]: e.target.checked })} />
                {k === "women" ? "Women's area" : k === "wudu" ? "Wudu" : k === "parking" ? "Parking" : "Wheelchair"}
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500">{filtered.length} places</p>
        </div>
        <ul className="divide-y">
          {filtered.slice(0, limit).map((p) => (
            <li key={p.id}>
              <Link href={`/place/${p.slug}`} className="block p-3 hover:bg-emerald-50">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{p.name}</span>
                  {p._d !== undefined && <span className="text-xs text-gray-500 whitespace-nowrap">{p._d.toFixed(1)} km</span>}
                </div>
                <div className="text-xs text-gray-500 capitalize">{p.type.replace("_", " ")}{p.area ? ` - ${p.area}` : ""}</div>
              </Link>
            </li>
          ))}
        </ul>
        {filtered.length > limit && (
          <button onClick={() => setLimit(limit + 50)} className="m-3 w-[calc(100%-1.5rem)] rounded-lg border py-2 text-sm">Show more</button>
        )}
      </aside>
    </div>
  );
}
