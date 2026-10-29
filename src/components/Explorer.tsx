"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PLACE_TYPES, type Place, type PlaceType } from "@/lib/types";
import { distanceKm } from "@/lib/geo";
import { qiblaBearing } from "@/lib/qibla";

const PlaceMap = dynamic(() => import("./PlaceMap"), { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-emerald-50" /> });
const RADII = [1, 2, 5, 10] as const;

type Loc = { lat: number; lng: number; label: string };

export function directionsLinks(p: { lat: number; lng: number; name: string }) {
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`,
    apple: `https://maps.apple.com/?daddr=${p.lat},${p.lng}&q=${encodeURIComponent(p.name)}`,
  };
}

export default function Explorer({ places, center }: { places: Place[]; center: [number, number] }) {
  const [q, setQ] = useState("");
  const [types, setTypes] = useState<PlaceType[]>([]);
  const [area, setArea] = useState("");
  const [fac, setFac] = useState({ women: false, wudu: false, parking: false, wheelchair: false });
  const [me, setMe] = useState<Loc | null>(null);
  const [radius, setRadius] = useState<number>(2);
  const [locMsg, setLocMsg] = useState("");
  const [manual, setManual] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [limit, setLimit] = useState(50);

  useEffect(() => {
    try { const s = sessionStorage.getItem("wtp-loc"); if (s) setMe(JSON.parse(s)); } catch {}
  }, []);
  function setLoc(l: Loc | null) {
    setMe(l);
    try { if (l) sessionStorage.setItem("wtp-loc", JSON.stringify(l)); else sessionStorage.removeItem("wtp-loc"); } catch {}
  }

  const areas = useMemo(() => [...new Set(places.map((p) => p.area).filter(Boolean) as string[])].sort(), [places]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    let r = places.filter(
      (p) =>
        (!s || `${p.name} ${p.name_local ?? ""} ${p.address ?? ""} ${p.area ?? ""}`.toLowerCase().includes(s)) &&
        (!types.length || types.includes(p.type)) && (!area || p.area === area) &&
        (!fac.women || p.women_section) && (!fac.wudu || p.wudu) && (!fac.parking || p.parking) && (!fac.wheelchair || p.wheelchair),
    ) as (Place & { _d?: number })[];
    if (me) r = r.map((p) => ({ ...p, _d: distanceKm(me.lat, me.lng, p.lat, p.lng) })).filter((p) => p._d! <= radius).sort((a, b) => a._d! - b._d!);
    return r;
  }, [places, q, types, area, fac, me, radius]);

  async function nearMe() {
    if (!("geolocation" in navigator)) { setShowManual(true); return setLocMsg("Location is not available in this browser. Search for your area or pincode instead."); }
    try {
      const perm = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
      if (perm?.state === "denied") { setShowManual(true); setLocMsg("Location is blocked for this site in your browser. Click the lock icon in the address bar and allow Location, or search an area below."); }
      if (false) { return setLocMsg("Location permission is blocked. Allow it in your browser settings, or search for your area or pincode."); }
    } catch {}
    setLocMsg("Finding you...");
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: `your location (±${Math.round(pos.coords.accuracy)} m)` }); setLocMsg(""); setShowManual(false); },
      async (err) => {
        setShowManual(true);
        try {
          const r = await fetch("https://ipwho.is/");
          const j = await r.json();
          if (j.success && j.latitude) { setLoc({ lat: j.latitude, lng: j.longitude, label: `approx. ${j.city || "your area"} (from your internet connection)` }); setLocMsg("Exact location is blocked, so I used your approximate location. Allow location in your browser or search an area for better accuracy."); return; }
        } catch {}
        setLocMsg(err.code === err.PERMISSION_DENIED ? "You declined location access. Search for your area or pincode instead." : err.code === err.TIMEOUT ? "Location timed out. Try again or search for your area or pincode." : "Could not get your location. Search for your area or pincode instead.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    );
  }

  async function searchManual(e: React.FormEvent) {
    e.preventDefault();
    const term = manual.trim();
    if (!term) return;
    setLocMsg("Searching...");
    try {
      const qs = /^\d{6}$/.test(term) ? `postalcode=${term}&country=India` : `q=${encodeURIComponent(term + ", Bengaluru, India")}`;
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&${qs}`, { headers: { "Accept-Language": "en" } });
      const [hit] = (await res.json()) as { lat: string; lon: string; display_name: string }[];
      if (!hit) return setLocMsg(`No match for "${term}". Try a nearby area name or 6-digit pincode.`);
      setLoc({ lat: +hit.lat, lng: +hit.lon, label: hit.display_name.split(",").slice(0, 2).join(",") });
      setLocMsg("");
    } catch { setLocMsg("Search failed. Check your connection and try again."); }
  }

  return (
    <div className="flex flex-col md:flex-row md:h-[calc(100vh-56px)]">
      <div className="h-[45vh] md:h-full md:flex-1 md:order-2">
        <PlaceMap places={filtered} center={center} me={me ? [me.lat, me.lng] : null} radiusKm={me ? radius : undefined} />
      </div>
      <aside className="md:w-[420px] md:order-1 md:overflow-y-auto border-r border-gray-200 bg-white">
        <div className="sticky top-0 z-10 bg-white p-3 space-y-2 border-b">
          <div className="flex gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, area, address" className="flex-1 rounded-lg border px-3 py-2 text-sm" aria-label="Search" />
            <button onClick={nearMe} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white whitespace-nowrap">Near me</button>
          </div>
          {(showManual || me) && (
            <form onSubmit={searchManual} className="flex gap-2">
              <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Area or pincode, e.g. Frazer Town or 560005" className="flex-1 rounded-lg border px-3 py-1.5 text-sm" aria-label="Area or pincode" />
              <button className="rounded-lg border px-3 py-1.5 text-sm">Go</button>
            </form>
          )}
          {!showManual && !me && <button onClick={() => setShowManual(true)} className="text-xs text-emerald-700 underline">or enter an area / pincode</button>}
          {locMsg && <p className="text-xs text-amber-700" role="status">{locMsg}</p>}
          {me && (
            <div className="rounded-lg bg-emerald-50 p-2 text-xs space-y-1">
              <div className="flex justify-between"><span>Near <b>{me.label}</b></span><button onClick={() => setLoc(null)} className="underline">Clear</button></div>
              <label className="flex items-center gap-2">
                Radius
                <input type="range" min={0} max={3} step={1} value={RADII.indexOf(radius as (typeof RADII)[number])} onChange={(e) => setRadius(RADII[+e.target.value])} className="flex-1" aria-label="Radius" />
                <b>{radius} km</b>
              </label>
              <div>Qibla from here: <b>{qiblaBearing(me.lat, me.lng).toFixed(0)}°</b> - <Link href="/qibla" className="underline">open compass</Link></div>
            </div>
          )}
          <div className="flex flex-wrap gap-1">
            {PLACE_TYPES.map((t) => (
              <button key={t.value} onClick={() => setTypes((x) => (x.includes(t.value) ? x.filter((y) => y !== t.value) : [...x, t.value]))}
                className={`rounded-full border px-3 py-1 text-xs ${types.includes(t.value) ? "bg-emerald-700 text-white border-emerald-700" : "bg-white"}`}>{t.label}</button>
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
          <p className="text-xs text-gray-500">{filtered.length} places{me ? ` within ${radius} km, nearest first` : ""}</p>
        </div>
        <ul className="divide-y">
          {filtered.slice(0, limit).map((p) => {
            const d = directionsLinks(p);
            return (
              <li key={p.id} className="p-3 hover:bg-emerald-50">
                <Link href={`/place/${p.slug}`} className="block">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{p.name}</span>
                    {p._d !== undefined && <span className="text-xs font-semibold text-emerald-800 whitespace-nowrap" data-testid="distance">{p._d < 1 ? `${Math.round(p._d * 1000)} m` : `${p._d.toFixed(1)} km`}</span>}
                  </div>
                  <div className="text-xs text-gray-500 capitalize">{p.type.replace("_", " ")}{p.area ? ` - ${p.area}` : ""}</div>
                </Link>
                <div className="mt-1 flex gap-3 text-xs">
                  <a href={d.google} target="_blank" rel="noreferrer" className="text-emerald-700 underline">Google Maps</a>
                  <a href={d.apple} target="_blank" rel="noreferrer" className="text-emerald-700 underline">Apple Maps</a>
                </div>
              </li>
            );
          })}
        </ul>
        {me && filtered.length === 0 && <p className="p-3 text-sm text-gray-600">Nothing within {radius} km. Try a bigger radius.</p>}
        {filtered.length > limit && <button onClick={() => setLimit(limit + 50)} className="m-3 w-[calc(100%-1.5rem)] rounded-lg border py-2 text-sm">Show more</button>}
      </aside>
    </div>
  );
}
