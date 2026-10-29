"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PLACE_TYPES, type Place, type PlaceType } from "@/lib/types";
import { distanceKm } from "@/lib/geo";
import { qiblaBearing } from "@/lib/qibla";
import GoogleLookup from "./GoogleLookup";
import { IconLocate, IconSearch } from "./ui/Icons";
import { TYPE_COLOR, TYPE_LABEL, fmtDistance } from "@/lib/typeStyle";

const PlaceMap = dynamic(() => import("./PlaceMap"), { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-surface-2" /> });
const RADII = [1, 2, 5, 10] as const;

type Loc = { lat: number; lng: number; label: string };

export function directionsLinks(p: { lat: number; lng: number; name: string }) {
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`,
    apple: `https://maps.apple.com/?daddr=${p.lat},${p.lng}&q=${encodeURIComponent(p.name)}`,
  };
}

export default function Explorer({ places: initial, center }: { places: Place[]; center: [number, number] }) {
  // Places loaded so far: the initial city list plus whatever the map view or "Near me" pulls from the server.
  const [places, setPlaces] = useState<Place[]>(initial);
  const loaded = useRef(new Map(initial.map((p) => [p.id, p])));
  const merge = useCallback((more: Place[]) => {
    let changed = false;
    for (const p of more) if (!loaded.current.has(p.id)) { loaded.current.set(p.id, p); changed = true; }
    if (changed) setPlaces([...loaded.current.values()]);
  }, []);
  const bboxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [view, setView] = useState<[number, number, number, number] | null>(null);
  const onMoveEnd = useCallback((b: [number, number, number, number], zoom: number) => {
    setView(b);
    if (zoom < 8) return;
    if (bboxTimer.current) clearTimeout(bboxTimer.current);
    bboxTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/places?bbox=${b.map((x) => x.toFixed(3)).join(",")}`);
        if (r.ok) merge(await r.json());
      } catch {}
    }, 350);
  }, [merge]);
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
    try { const s = sessionStorage.getItem("wtp-loc"); if (s) setLoc(JSON.parse(s)); } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function setLoc(l: Loc | null) {
    setMe(l);
    if (l) fetch(`/api/places?lat=${l.lat}&lng=${l.lng}&radius_km=10`).then((r) => (r.ok ? r.json() : [])).then(merge).catch(() => {});
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
      const qs = /^\d{6}$/.test(term) ? `postalcode=${term}&country=India` : `q=${encodeURIComponent(term)}&countrycodes=in`;
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&${qs}`, { headers: { "Accept-Language": "en" } });
      const [hit] = (await res.json()) as { lat: string; lon: string; display_name: string }[];
      if (!hit) return setLocMsg(`No match for "${term}". Try a nearby area name or 6-digit pincode.`);
      setLoc({ lat: +hit.lat, lng: +hit.lon, label: hit.display_name.split(",").slice(0, 2).join(",") });
      setLocMsg("");
    } catch { setLocMsg("Search failed. Check your connection and try again."); }
  }

  const [expanded, setExpanded] = useState(false);
  const FAC = [["women", "Women's area"], ["wudu", "Wudu"], ["parking", "Parking"], ["wheelchair", "Wheelchair"]] as const;

  return (
    <div className="relative h-[calc(100dvh-56px-70px)] overflow-hidden md:h-[calc(100dvh-56px)]">
      <div className="absolute inset-0">
        <PlaceMap places={filtered} center={center} me={me ? [me.lat, me.lng] : null} radiusKm={me ? radius : undefined} onMoveEnd={onMoveEnd} />
      </div>
      <aside
        className={`glass animate-sheet absolute inset-x-0 bottom-0 z-10 flex flex-col overflow-hidden rounded-t-[28px] border border-hairline shadow-float transition-[height] duration-500 ease-[cubic-bezier(.2,.8,.2,1)] md:inset-y-4 md:left-4 md:right-auto md:h-auto md:w-[400px] md:rounded-[28px] ${expanded ? "h-[88%]" : "h-[46%]"}`}
        aria-label="Places"
      >
        <button onClick={() => setExpanded((x) => !x)} className="flex w-full justify-center pb-1 pt-2.5 md:hidden" aria-label={expanded ? "Collapse list" : "Expand list"} aria-expanded={expanded}>
          <span className="h-1.5 w-10 rounded-full bg-ink-3/40" />
        </button>
        <div className="space-y-3 px-4 pb-3 pt-1 md:pt-4">
          <div className="flex gap-2">
            <label className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"><IconSearch className="h-4 w-4" /></span>
              <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setExpanded(true)} placeholder="Search mosques, areas" className="h-10 w-full pl-9 pr-3 text-[15px]" aria-label="Search" />
            </label>
            <button onClick={nearMe} className="btn btn-primary h-10 px-4 text-sm"><IconLocate className="h-4 w-4" />Near me</button>
          </div>
          {(showManual || me) && (
            <form onSubmit={searchManual} className="flex gap-2">
              <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Area, city or pincode, e.g. 560005" className="h-9 flex-1 px-3 text-sm" aria-label="Area or pincode" />
              <button className="btn btn-secondary h-9 px-4 text-sm">Go</button>
            </form>
          )}
          {!showManual && !me && <button onClick={() => setShowManual(true)} className="text-xs font-medium text-accent-text">Or enter an area or pincode</button>}
          {locMsg && <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300" role="status">{locMsg}</p>}
          {me && (
            <div className="space-y-2 rounded-2xl bg-accent-soft p-3 text-xs">
              <div className="flex items-center justify-between gap-2"><span className="truncate">Near <b>{me.label}</b></span><button onClick={() => setLoc(null)} className="font-semibold text-accent-text">Clear</button></div>
              <div className="flex items-center justify-between gap-2">
                <div className="segmented" role="group" aria-label="Radius">
                  {RADII.map((r) => <button key={r} aria-pressed={radius === r} onClick={() => setRadius(r)}>{r} km</button>)}
                </div>
                <Link href="/qibla" className="whitespace-nowrap font-semibold text-accent-text">Qibla {qiblaBearing(me.lat, me.lng).toFixed(0)}°</Link>
              </div>
            </div>
          )}
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none]">
            {PLACE_TYPES.map((t) => {
              const on = types.includes(t.value);
              return (
                <button key={t.value} aria-pressed={on} onClick={() => setTypes((x) => (on ? x.filter((y) => y !== t.value) : [...x, t.value]))} className="chip gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: TYPE_COLOR[t.value] }} />{TYPE_LABEL[t.value]}
                </button>
              );
            })}
          </div>
          <div className="-mx-4 flex items-center gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]">
            <select value={area} onChange={(e) => setArea(e.target.value)} className="h-8 max-w-[9rem] px-2 text-xs" aria-label="Area">
              <option value="">All areas</option>
              {areas.map((a) => <option key={a}>{a}</option>)}
            </select>
            {FAC.map(([k, label]) => (
              <button key={k} aria-pressed={fac[k]} onClick={() => setFac({ ...fac, [k]: !fac[k] })} className="chip">{label}</button>
            ))}
          </div>
          <p className="eyebrow">{filtered.length.toLocaleString("en-IN")} places{me ? ` within ${radius} km` : ""}</p>
        </div>
        <ul className="flex-1 space-y-0.5 overflow-y-auto border-t border-hairline px-2 py-2">
          {filtered.slice(0, limit).map((p) => {
            const d = directionsLinks(p);
            return (
              <li key={p.id} className="group flex items-center gap-3 rounded-2xl px-2 py-2.5 hover:bg-surface-2/70">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: `${TYPE_COLOR[p.type]}1f`, color: TYPE_COLOR[p.type] }} aria-hidden>
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: TYPE_COLOR[p.type] }} />
                </span>
                <Link href={`/place/${p.slug}`} className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-medium">{p.name}</div>
                  <div className="truncate text-xs text-ink-2">{TYPE_LABEL[p.type]}{p.area || p.city ? ` · ${[p.area, p.city].filter(Boolean).join(", ")}` : ""}</div>
                </Link>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {p._d !== undefined && <span className="text-xs font-semibold text-accent-text" data-testid="distance">{fmtDistance(p._d)}</span>}
                  <span className="flex gap-1 text-[11px]">
                    <a href={d.google} target="_blank" rel="noreferrer" className="rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent-text" aria-label={`Google Maps directions to ${p.name}`}>Google</a>
                    <a href={d.apple} target="_blank" rel="noreferrer" className="rounded-full bg-surface-2 px-2 py-0.5 font-medium" aria-label={`Apple Maps directions to ${p.name}`}>Apple</a>
                  </span>
                </div>
              </li>
            );
          })}
          {me && filtered.length === 0 && <li className="p-6 text-center text-sm text-ink-2">Nothing within {radius} km. Try a bigger radius.</li>}
          {filtered.length > limit && <li><button onClick={() => setLimit(limit + 50)} className="btn btn-secondary m-2 w-[calc(100%-1rem)] text-sm">Show more</button></li>}
          <li><GoogleLookup bbox={view} q={q} /></li>
        </ul>
      </aside>
    </div>
  );
}
