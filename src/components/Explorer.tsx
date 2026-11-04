"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import BottomSheet from "./ui/BottomSheet";
import { PLACE_TYPES, type Place, type PlaceType } from "@/lib/types";
import { distanceKm } from "@/lib/geo";
import { qiblaBearing } from "@/lib/qibla";
const GoogleLookup = dynamic(() => import("./GoogleLookup"), { ssr: false });
import { IconLocate, IconSearch } from "./ui/Icons";
import { mapLinks, QUALITY_NOTE, SHORT_NOTE } from "@/lib/maplinks";
import { TYPE_COLOR, TYPE_LABEL, fmtDistance } from "@/lib/typeStyle";

const PlaceMap = dynamic(() => import("./PlaceMap"), { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-surface-2" /> });
const RADII = [1, 2, 5, 10] as const;
const MAX_LOADED = 6000;
const ROW_H = 60;

type Loc = { lat: number; lng: number; label: string; acc?: number; approx?: boolean; t?: number };

export function directionsLinks(p: { lat: number; lng: number; name: string }) {
  const l = mapLinks(p);
  return { google: l.googleDir, apple: l.appleDir };
}

export default function Explorer({ places: initial, center }: { places: Place[]; center: [number, number] }) {
  // Places loaded so far: the initial city list plus whatever the map view or "Near me" pulls from the server.
  const [places, setPlaces] = useState<Place[]>(initial);
  const loaded = useRef(new Map(initial.map((p) => [p.id, p])));
  const merge = useCallback((more: Place[]) => {
    let changed = false;
    for (const p of more) if (!loaded.current.has(p.id)) { loaded.current.set(p.id, p); changed = true; }
    if (!changed) return;
    if (loaded.current.size > MAX_LOADED) {
      // Keep memory and map work bounded while panning across India: drop the oldest entries.
      const keep = [...loaded.current.entries()].slice(-MAX_LOADED);
      loaded.current = new Map(keep);
    }
    setPlaces([...loaded.current.values()]);
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

  useEffect(() => {
    document.documentElement.classList.add("app-lock");
    return () => document.documentElement.classList.remove("app-lock");
  }, []);
  useEffect(() => {
    try { const s = sessionStorage.getItem("wtp-loc"); if (s) { const l = JSON.parse(s) as Loc; if (l.acc == null || (l.t && Date.now() - l.t < 5 * 60000)) setLoc(l); } } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function setLoc(l: Loc | null) {
    setMe(l);
    if (l) fetch(`/api/places?lat=${l.lat.toFixed(2)}&lng=${l.lng.toFixed(2)}&radius_km=10`).then((r) => (r.ok ? r.json() : [])).then(merge).catch(() => {});
    try { if (l) sessionStorage.setItem("wtp-loc", JSON.stringify(l)); else sessionStorage.removeItem("wtp-loc"); } catch {}
  }

  const areas = useMemo(() => [...new Set(places.map((p) => p.area).filter(Boolean) as string[])].sort(), [places]);

  const dq = useDeferredValue(q);
  const hay = useMemo(() => new Map(places.map((p) => [p.id, `${p.name} ${p.name_local ?? ""} ${p.address ?? ""} ${p.area ?? ""}`.toLowerCase()])), [places]);
  const filtered = useMemo(() => {
    const s = dq.trim().toLowerCase();
    let r = places.filter(
      (p) =>
        (!s || hay.get(p.id)!.includes(s)) &&
        (!types.length || types.includes(p.type)) && (!area || p.area === area) &&
        (!fac.women || p.women_section) && (!fac.wudu || p.wudu) && (!fac.parking || p.parking) && (!fac.wheelchair || p.wheelchair),
    ) as (Place & { _d?: number })[];
    if (me) r = r.map((p) => ({ ...p, _d: distanceKm(me.lat, me.lng, p.lat, p.lng) })).filter((p) => p._d! <= radius).sort((a, b) => a._d! - b._d!);
    return r;
  }, [places, hay, dq, types, area, fac, me, radius]);

  async function nearMe() {
    if (!("geolocation" in navigator)) { setShowManual(true); return setLocMsg("Location is not available in this browser. Search for your area or pincode instead."); }
    try {
      const perm = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
      if (perm?.state === "denied") { setShowManual(true); setLocMsg("Location is blocked for this site in your browser. Click the lock icon in the address bar and allow Location, or search an area below."); }
    } catch {}
    setLocMsg("Finding you...");
    let best: GeolocationPosition | null = null, done = false;
    const show = (p: GeolocationPosition) => { const a = Math.round(p.coords.accuracy); setLoc({ lat: p.coords.latitude, lng: p.coords.longitude, acc: a, t: Date.now(), label: `your location (±${a} m)` }); setShowManual(false); setLocMsg(a > 100 ? `Your phone reports ±${a} m. Turn on Precise Location for this browser and GPS / Wi-Fi, then tap Near me again.` : ""); };
    const finish = () => { if (done) return; done = true; navigator.geolocation.clearWatch(id); clearTimeout(tm); };
    const id = navigator.geolocation.watchPosition(
      (p) => { if (!best || p.coords.accuracy < best.coords.accuracy) { best = p; show(p); } if (p.coords.accuracy <= 25) finish(); },
      async (err) => {
        if (best) return finish();
        finish();
        setShowManual(true);
        try {
          const r = await fetch("https://ipwho.is/");
          const j = await r.json();
          if (j.success && j.latitude) { setLoc({ lat: j.latitude, lng: j.longitude, acc: 5000, approx: true, t: Date.now(), label: `approx. ${j.city || "your area"} (from your internet connection, not exact)` }); setLocMsg("Exact location is blocked, so this is only a rough area from your internet connection (can be km off). Allow Precise Location and tap Near me to retry."); return; }
        } catch {}
        setLocMsg(err.code === err.PERMISSION_DENIED ? "You declined location access. Search for your area or pincode instead." : err.code === err.TIMEOUT ? "Location timed out. Try again or search for your area or pincode." : "Could not get your location. Search for your area or pincode instead.");
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
    const tm = setTimeout(finish, 20000);
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

  const [snap, setSnap] = useState<"peek" | "half" | "full">("half");
  const [selSlug, setSelSlug] = useState<string | null>(null);
  const selected = useMemo(() => (selSlug ? places.find((p) => p.slug === selSlug) ?? null : null), [selSlug, places]);
  const select = useCallback((slug: string) => { setSelSlug(slug); setSnap("peek"); (document.activeElement as HTMLElement | null)?.blur?.(); }, []);
  const FAC = [["women", "Women's area"], ["wudu", "Wudu"], ["parking", "Parking"], ["wheelchair", "Wheelchair"]] as const;

  return (
    <div className="fixed inset-x-0 bottom-[var(--tabbar-h)] top-[var(--header-h)] overflow-hidden">
      <div className="absolute inset-0">
        <PlaceMap places={filtered} center={center} me={me ? [me.lat, me.lng] : null} meAcc={me?.acc} radiusKm={me ? radius : undefined} onMoveEnd={onMoveEnd} selected={selected} onSelect={select} />
      </div>
      <BottomSheet snap={snap} onSnap={setSnap}>
        <div className="space-y-3 px-4 pb-3 pt-1 md:pt-4">
          <div className="flex gap-2">
            <label className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"><IconSearch className="h-4 w-4" /></span>
              <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setSnap("full")} onKeyDown={(e) => { if (e.key === "Enter" && filtered[0]) { e.preventDefault(); select(filtered[0].slug); } }} enterKeyHint="search" placeholder="Search mosques, areas" className="h-10 w-full pl-9 pr-3 text-[15px]" aria-label="Search" />
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
              <div className="flex items-center justify-between gap-2"><span className="truncate">Near <b>{me.label}</b>{me.approx && <button onClick={nearMe} className="ml-2 font-semibold text-accent-text">Retry exact</button>}</span><button onClick={() => setLoc(null)} className="font-semibold text-accent-text">Clear</button></div>
              <div className="flex items-center justify-between gap-2">
                <div className="segmented" role="group" aria-label="Radius">
                  {RADII.map((r) => <button key={r} aria-pressed={radius === r} onClick={() => setRadius(r)}>{r} km</button>)}
                </div>
                <Link href="/qibla" className="whitespace-nowrap font-semibold text-accent-text">Qibla {qiblaBearing(me.lat, me.lng).toFixed(0)}°</Link>
              </div>
            </div>
          )}
          <div className="sheet-x -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none]">
            {PLACE_TYPES.map((t) => {
              const on = types.includes(t.value);
              return (
                <button key={t.value} aria-pressed={on} onClick={() => setTypes((x) => (on ? x.filter((y) => y !== t.value) : [...x, t.value]))} className="chip gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: TYPE_COLOR[t.value] }} />{TYPE_LABEL[t.value]}
                </button>
              );
            })}
          </div>
          <div className="sheet-x -mx-4 flex items-center gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]">
            <select value={area} onChange={(e) => setArea(e.target.value)} className="h-8 max-w-[9rem] px-2 text-xs" aria-label="Area">
              <option value="">All areas</option>
              {areas.map((a) => <option key={a}>{a}</option>)}
            </select>
            {FAC.map(([k, label]) => (
              <button key={k} aria-pressed={fac[k]} onClick={() => setFac({ ...fac, [k]: !fac[k] })} className="chip">{label}</button>
            ))}
          </div>
          {selected && <Selected p={selected} onClose={() => setSelSlug(null)} />}
          <div className="flex items-center justify-between">
            <p className="eyebrow">{filtered.length.toLocaleString("en-IN")} places{me ? ` within ${radius} km` : ""}</p>
            <Link href="/about" className="grid h-6 w-6 place-items-center rounded-full bg-surface-2 text-[12px] font-semibold text-ink-2" aria-label="About and data credits" title="About and data credits">i</Link>
          </div>
        </div>
        <VirtualList items={filtered} me={!!me} radius={radius} onSelect={select} selSlug={selSlug} footer={<GoogleLookup bbox={view} q={q} />} />
      </BottomSheet>
    </div>
  );
}

function Selected({ p, onClose }: { p: Place; onClose: () => void }) {
  const l = mapLinks(p);
  const note = p.location_quality ? QUALITY_NOTE[p.location_quality] : undefined;
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-3" data-testid="selected-place">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0"><div className="flex items-center gap-1.5 text-xs font-medium text-ink-2"><span className="inline-block h-2 w-2 rounded-full" style={{ background: TYPE_COLOR[p.type] }} aria-hidden="true" />{TYPE_LABEL[p.type]}</div><div className="truncate text-[15px] font-semibold">{p.name}</div><div className="truncate text-xs text-ink-2">{[p.area, p.city].filter(Boolean).join(", ")} · <span className="font-mono">{p.lat.toFixed(5)}, {p.lng.toFixed(5)}</span></div></div>
        <button onClick={onClose} className="text-xs font-semibold text-accent-text" aria-label="Close selected place">Close</button>
      </div>
      {note && (p.location_quality === "approximate" || p.location_quality === "listing") && <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-300">{note}</p>}
      <div className="mt-2 flex gap-2 text-xs">
        <a href={l.googleDir} target="_blank" rel="noreferrer" className="btn btn-primary h-8 px-3 text-xs">Directions</a>
        <a href={l.appleDir} target="_blank" rel="noreferrer" className="chip">Apple</a>
        <Link href={`/place/${p.slug}`} className="chip">Details and timings</Link>
      </div>
    </div>
  );
}

const Row = memo(function Row({ p, onSelect, active }: { p: Place & { _d?: number }; onSelect: (slug: string) => void; active: boolean }) {
  const d = directionsLinks(p);
  return (
    <li className={`flex items-center gap-3 rounded-2xl px-2 ${active ? "bg-surface-2" : ""}`} style={{ height: ROW_H }}>
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ background: `${TYPE_COLOR[p.type]}1f` }} aria-hidden>
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: TYPE_COLOR[p.type] }} />
      </span>
      <button type="button" onClick={() => onSelect(p.slug)} className="min-w-0 flex-1 text-left" aria-label={`Show ${p.name} on the map`} data-slug={p.slug}>
        <div className="truncate text-[15px] font-medium">{p.name}</div>
        <div className="truncate text-xs text-ink-2">{TYPE_LABEL[p.type]}{p.area || p.city ? ` · ${[p.area, p.city].filter(Boolean).join(", ")}` : ""}{p.location_quality && SHORT_NOTE[p.location_quality] ? ` · ${SHORT_NOTE[p.location_quality]}` : ""}</div>
      </button>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {p._d !== undefined && <span className="text-xs font-semibold text-accent-text" data-testid="distance">{fmtDistance(p._d)}</span>}
        <span className="flex gap-1 text-[11px]">
          <a href={d.google} target="_blank" rel="noreferrer" className="rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent-text" aria-label={`Google Maps directions to ${p.name}`}>Google</a>
          <a href={d.apple} target="_blank" rel="noreferrer" className="rounded-full bg-surface-2 px-2 py-0.5 font-medium" aria-label={`Apple Maps directions to ${p.name}`}>Apple</a>
        </span>
      </div>
    </li>
  );
});

// Simple windowing: only the rows in view (plus overscan) are in the DOM.
function VirtualList({ items, me, radius, footer, onSelect, selSlug }: { items: (Place & { _d?: number })[]; me: boolean; radius: number; footer: React.ReactNode; onSelect: (slug: string) => void; selSlug: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const [top, setTop] = useState(0);
  const [h, setH] = useState(600);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    let raf = 0;
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; setTop(el.scrollTop); }); };
    const ro = new ResizeObserver(() => setH(el.clientHeight));
    ro.observe(el); setH(el.clientHeight);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => { el.removeEventListener("scroll", onScroll); ro.disconnect(); cancelAnimationFrame(raf); };
  }, []);
  useEffect(() => { if (ref.current) ref.current.scrollTop = 0; setTop(0); }, [items]);
  const start = Math.max(0, Math.floor(top / ROW_H) - 6);
  const end = Math.min(items.length, Math.ceil((top + h) / ROW_H) + 6);
  return (
    <div ref={ref} className="sheet-scroll min-h-0 flex-1 overflow-y-auto border-t border-hairline px-2 pb-4" data-testid="results">
      <ul style={{ height: items.length * ROW_H, position: "relative" }}>
        <div style={{ transform: `translateY(${start * ROW_H}px)` }}>
          {items.slice(start, end).map((p) => <Row key={p.id} p={p} onSelect={onSelect} active={p.slug === selSlug} />)}
        </div>
      </ul>
      {me && items.length === 0 && <p className="p-6 text-center text-sm text-ink-2">Nothing within {radius} km. Try a bigger radius.</p>}
      {footer}
    </div>
  );
}
