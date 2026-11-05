"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import BottomSheet from "./ui/BottomSheet";
import { PLACE_TYPES, type Place, type PlaceType } from "@/lib/types";
import { distanceKm } from "@/lib/geo";
import { qiblaBearing } from "@/lib/qibla";
import { pickNextJamaat, fmtClock } from "@/lib/jamaatPick";
const GoogleLookup = dynamic(() => import("./GoogleLookup"), { ssr: false });
import { IconDirections, IconFilter, IconLocate, IconMap, IconPhone, IconPin, IconSearch } from "./ui/Icons";
import { mapLinks, QUALITY_NOTE, SHORT_NOTE } from "@/lib/maplinks";
import { TYPE_COLOR, TYPE_LABEL, fmtDistance } from "@/lib/typeStyle";

const PlaceMap = dynamic(() => import("./PlaceMap"), { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-surface-2" /> });
const RADII = [1, 2, 5, 10] as const;
const MAX_LOADED = 6000;
const ROW_H = 72;

type Loc = { lat: number; lng: number; label: string; acc?: number; approx?: boolean; t?: number };

export function directionsLinks(p: { lat: number; lng: number; name: string }) {
  const l = mapLinks(p);
  return { google: l.googleDir, apple: l.appleDir };
}

function telHref(phone?: string | null) {
  if (!phone || !/^[+\d][\d\s()-]{4,20}$/.test(phone)) return null;
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export default function Explorer({ places: initial, center }: { places: Place[]; center: [number, number] }) {
  const [places, setPlaces] = useState<Place[]>(initial);
  const loaded = useRef(new Map(initial.map((p) => [p.id, p])));
  const merge = useCallback((more: Place[]) => {
    let changed = false;
    for (const p of more) if (!loaded.current.has(p.id)) { loaded.current.set(p.id, p); changed = true; }
    if (!changed) return;
    if (loaded.current.size > MAX_LOADED) {
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileMap, setMobileMap] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    document.documentElement.classList.add("app-lock");
    // List mode on mobile uses its own scroller; keep lock so the page chrome does not bounce.
    return () => document.documentElement.classList.remove("app-lock");
  }, []);
  useEffect(() => {
    try { const s = sessionStorage.getItem("wtp-loc"); if (s) { const l = JSON.parse(s) as Loc; if (l.acc == null || (l.t && Date.now() - l.t < 5 * 60000)) setLoc(l); } } catch {}
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
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

  const jamaat = useMemo(() => (me ? pickNextJamaat(filtered, now) : null), [me, filtered, now]);

  async function nearMe() {
    if (!("geolocation" in navigator)) { setShowManual(true); return setLocMsg("Location is not available in this browser. Search for your area or pincode instead."); }
    try {
      const perm = await navigator.permissions?.query({ name: "geolocation" as PermissionName });
      if (perm?.state === "denied") { setShowManual(true); setLocMsg("Location is blocked for this site in your browser. Click the lock icon in the address bar and allow Location, or search an area below."); }
    } catch {}
    setLocMsg("Finding you...");
    let best: GeolocationPosition | null = null, done = false;
    const show = (p: GeolocationPosition) => { const a = Math.round(p.coords.accuracy); setLoc({ lat: p.coords.latitude, lng: p.coords.longitude, acc: a, t: Date.now(), label: `your location (±${a} m)` }); setShowManual(false); setLocMsg(a > 100 ? `Your phone reports ±${a} m. Turn on Precise Location for this browser and GPS / Wi-Fi, then tap Use my location again.` : ""); };
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
          if (j.success && j.latitude) { setLoc({ lat: j.latitude, lng: j.longitude, acc: 5000, approx: true, t: Date.now(), label: `approx. ${j.city || "your area"} (from your internet connection, not exact)` }); setLocMsg("Exact location is blocked, so this is only a rough area from your internet connection (can be km off). Allow Precise Location and tap Use my location to retry."); return; }
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
  const select = useCallback((slug: string) => { setSelSlug(slug); setSnap("half"); (document.activeElement as HTMLElement | null)?.blur?.(); }, []);
  const FAC = [["women", "Women's area"], ["wudu", "Wudu"], ["parking", "Parking"], ["wheelchair", "Wheelchair"]] as const;
  const activeFacCount = FAC.filter(([k]) => fac[k]).length + (area ? 1 : 0) + types.length;
  const cityCount = initial.length;

  const filtersPanel = (
    <div className="space-y-3">
      <div className="sheet-x -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PLACE_TYPES.map((t) => {
          const on = types.includes(t.value);
          return (
            <button key={t.value} type="button" aria-pressed={on} onClick={() => setTypes((x) => (on ? x.filter((y) => y !== t.value) : [...x, t.value]))} className="chip min-h-12 gap-2 px-4 text-sm">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: TYPE_COLOR[t.value] }} aria-hidden />
              {TYPE_LABEL[t.value]}
            </button>
          );
        })}
      </div>
      <label className="block text-sm font-medium text-ink-2" htmlFor="area-filter">Area</label>
      <select id="area-filter" value={area} onChange={(e) => setArea(e.target.value)} className="h-12 w-full px-3 text-base" aria-label="Filter by area">
        <option value="">All areas</option>
        {areas.map((a) => <option key={a}>{a}</option>)}
      </select>
      <div className="flex flex-wrap gap-2">
        {FAC.map(([k, label]) => (
          <button key={k} type="button" aria-pressed={fac[k]} onClick={() => setFac({ ...fac, [k]: !fac[k] })} className="chip min-h-12 px-4 text-sm">{label}</button>
        ))}
      </div>
      {activeFacCount > 0 && (
        <button type="button" className="min-h-11 text-sm font-semibold text-accent-text" onClick={() => { setFac({ women: false, wudu: false, parking: false, wheelchair: false }); setArea(""); setTypes([]); }}>
          Clear filters
        </button>
      )}
    </div>
  );

  const listCards = (
    <ul className="space-y-3">
      {filtered.slice(0, 80).map((p) => <PlaceCard key={p.id} p={p} />)}
    </ul>
  );

  return (
    <>
      {/* Mobile list-first Explore (mockup). Single scroll; sticky search / location. */}
      <div className={`fixed inset-x-0 bottom-[var(--tabbar-h)] top-[var(--header-h)] md:hidden ${mobileMap ? "hidden" : ""}`}>
        <div className="sheet-scroll h-full overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]">
          <div className="space-y-4 px-4 pb-8 pt-5">
            <header className="space-y-2">
              <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight">Find a place to pray, near you</h1>
              <p className="text-base text-ink-2">{cityCount.toLocaleString("en-IN")} mosques, dargahs, musallas and prayer rooms across Bengaluru.</p>
            </header>
          </div>

          <div className="sticky top-0 z-20 space-y-3 border-b border-hairline bg-canvas/95 px-4 py-3 backdrop-blur-md">
            {!me ? (
              <button type="button" onClick={nearMe} className="btn btn-primary h-14 w-full text-base">
                <IconPin className="h-5 w-5" /> Use my location
              </button>
            ) : (
              <div className="flex items-center justify-between gap-2 rounded-2xl bg-accent-soft px-3 py-2.5 text-sm">
                <span className="min-w-0 truncate">Near <b>{me.label}</b></span>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={nearMe} className="min-h-11 font-semibold text-accent-text">Update</button>
                  <button type="button" onClick={() => setLoc(null)} className="min-h-11 font-semibold text-accent-text">Clear</button>
                </div>
              </div>
            )}
            <label className="relative block">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3"><IconSearch className="h-5 w-5" /></span>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => setShowManual(true)}
                placeholder="Or search an area or pincode"
                className="h-14 w-full pl-11 pr-3 text-base"
                aria-label="Search mosques, areas or pincode"
              />
            </label>
            {(showManual || (!me && manual)) && (
              <form onSubmit={searchManual} className="flex gap-2">
                <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Area, city or pincode" className="h-12 flex-1 px-3 text-base" aria-label="Area or pincode" />
                <button type="submit" className="btn btn-secondary h-12 px-5 text-base">Go</button>
              </form>
            )}
            {locMsg && <p className="rounded-xl bg-amber-500/10 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-300" role="status">{locMsg}</p>}
            {me && (
              <div className="segmented w-full" role="group" aria-label="Search radius">
                {RADII.map((r) => (
                  <button key={r} type="button" aria-pressed={radius === r} onClick={() => setRadius(r)} className="min-h-11 flex-1 text-sm">{r} km</button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4 px-4 pb-10 pt-4">
            {me && jamaat && (
              <NearestJamaatCard jamaat={jamaat} radius={radius} />
            )}

            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold tracking-tight">{me ? "Nearest to you" : "Places in Bengaluru"}</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-expanded={filtersOpen}
                  onClick={() => setFiltersOpen((v) => !v)}
                  className={`inline-flex min-h-12 items-center gap-1.5 rounded-full border border-hairline bg-surface px-3.5 text-sm font-semibold ${filtersOpen || activeFacCount ? "text-accent-text" : "text-ink"}`}
                >
                  <IconFilter className="h-4 w-4" /> Filters{activeFacCount ? ` · ${activeFacCount}` : ""}
                </button>
                <button
                  type="button"
                  onClick={() => setMobileMap(true)}
                  className="inline-flex min-h-12 items-center gap-1.5 rounded-full bg-accent-soft px-3.5 text-sm font-semibold text-accent-text"
                >
                  <IconMap className="h-4 w-4" /> Map
                </button>
              </div>
            </div>

            {filtersOpen && <div className="rounded-2xl border border-hairline bg-surface p-4">{filtersPanel}</div>}

            <p className="eyebrow">{filtered.length.toLocaleString("en-IN")} places{me ? ` within ${radius} km` : ""}</p>
            {me && filtered.length === 0 && <p className="rounded-2xl bg-surface p-5 text-center text-base text-ink-2">Nothing within {radius} km. Try a bigger radius.</p>}
            {listCards}
            <GoogleLookup bbox={view} q={q} />
            <p className="pt-2 text-center text-sm">
              <Link href="/bengaluru/gaps" className="font-medium text-accent-text">See coverage gaps</Link>
              {" · "}
              <Link href="/about" className="font-medium text-accent-text">About and data</Link>
            </p>
          </div>
        </div>
      </div>

      {/* Mobile map mode + desktop map/panel. */}
      <div className={`fixed inset-x-0 bottom-[var(--tabbar-h)] top-[var(--header-h)] overflow-hidden overscroll-none ${mobileMap ? "" : "hidden md:block"}`}>
        {mobileMap && (
          <button
            type="button"
            onClick={() => setMobileMap(false)}
            className="absolute left-3 top-3 z-20 inline-flex min-h-12 items-center rounded-full border border-hairline bg-surface px-4 text-sm font-semibold shadow-soft md:hidden"
          >
            List
          </button>
        )}
        <div className="absolute inset-0">
          <PlaceMap places={filtered} center={center} me={me ? [me.lat, me.lng] : null} meAcc={me?.acc} radiusKm={me ? radius : undefined} onMoveEnd={onMoveEnd} selected={selected} onSelect={select} />
        </div>
        <BottomSheet snap={snap} onSnap={setSnap}>
          <div data-sheet-chrome className="shrink-0 space-y-2.5 border-b border-hairline px-4 pb-2.5 pt-0.5 md:space-y-3 md:pt-4">
            <div className="flex gap-2">
              <label className="relative min-w-0 flex-1">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3"><IconSearch className="h-5 w-5" /></span>
                <input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setSnap("full")} onKeyDown={(e) => { if (e.key === "Enter" && filtered[0]) { e.preventDefault(); select(filtered[0].slug); } }} enterKeyHint="search" placeholder="Search mosques, areas" className="h-12 w-full pl-11 pr-3 text-base" aria-label="Search mosques, areas" />
              </label>
              <button type="button" onClick={nearMe} className="btn btn-primary h-12 min-w-[7.25rem] shrink-0 px-4 text-base"><IconLocate className="h-5 w-5" />Near me</button>
            </div>
            {me && (
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">Near <b>{me.label}</b></span>
                <Link href="/qibla" className="font-semibold text-accent-text">Qibla {qiblaBearing(me.lat, me.lng).toFixed(0)}°</Link>
              </div>
            )}
            <div className="hidden md:block">{filtersPanel}</div>
            <div className="flex items-center justify-between">
              <p className="eyebrow">{filtered.length.toLocaleString("en-IN")} places{me ? ` within ${radius} km` : ""}</p>
              <Link href="/about" className="grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-sm font-semibold text-ink-2" aria-label="About and data credits">i</Link>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            {selected && (
              <div className="shrink-0 border-b border-hairline px-4 py-3">
                <Selected p={selected} onClose={() => setSelSlug(null)} />
              </div>
            )}
            <VirtualList items={filtered} me={!!me} radius={radius} onSelect={select} selSlug={selSlug} footer={<GoogleLookup bbox={view} q={q} />} />
          </div>
        </BottomSheet>
      </div>
    </>
  );
}

function NearestJamaatCard({ jamaat, radius }: { jamaat: ReturnType<typeof pickNextJamaat>; radius: number }) {
  const { pick, friday, withTimes } = jamaat;
  if (pick) {
    const p = pick.place;
    const how = pick.reachableWalk ? `~${pick.walkMin} min walk` : `~${pick.driveMin} min drive`;
    const title = friday && pick.slot.kind === "jumuah" ? "Best for Jumu'ah" : "Next jamaat you can reach";
    const tel = telHref(p.phone);
    const dir = mapLinks(p).googleDir;
    return (
      <section className="rounded-2xl border border-accent/25 bg-accent-soft p-4" data-testid="nearest-jamaat">
        <p className="text-xs font-semibold uppercase tracking-wide text-accent-text">{title}</p>
        <h3 className="mt-1 text-lg font-semibold tracking-tight">{p.name}</h3>
        <p className="text-sm text-ink-2">
          {pick.slot.label} at {fmtClock(pick.slot.mins)} · {fmtDistance(p._d)} · {how} · {pick.leftMin} min left
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {p.women_section && <span className="chip gap-1 text-xs text-accent-text">Women&apos;s area</span>}
          {p.wudu && <span className="chip gap-1 text-xs text-accent-text">Wudu</span>}
          {p.parking && <span className="chip gap-1 text-xs text-accent-text">Parking</span>}
        </div>
        <div className="mt-3 flex gap-2">
          <a href={dir} target="_blank" rel="noreferrer" className="btn btn-primary h-12 flex-1 text-sm"><IconDirections className="h-4 w-4" /> Directions</a>
          {tel ? <a href={tel} className="btn btn-secondary h-12 px-4 text-sm"><IconPhone className="h-4 w-4" /> Call</a> : <Link href={`/place/${p.slug}`} className="btn btn-secondary h-12 px-4 text-sm">Details</Link>}
        </div>
        <p className="mt-2 text-xs text-ink-3">Community-reported jamaat time. Confirm locally. Travel time is an estimate.</p>
      </section>
    );
  }
  return (
    <section className="rounded-2xl border border-hairline bg-surface p-4" data-testid="nearest-jamaat-fallback">
      <p className="text-sm font-semibold">{friday ? "Jumu'ah timings near you" : "Jamaat timings near you"}</p>
      <p className="mt-1 text-sm text-ink-2">
        {withTimes === 0
          ? `No community jamaat times within ${radius} km yet. Open a nearby masjid and add or confirm the timing.`
          : "No upcoming community jamaat you can still reach right now. Browse nearest places below, or add a timing."}
      </p>
      <Link href="/add" className="mt-3 inline-flex min-h-12 items-center font-semibold text-accent-text">Add or confirm timing</Link>
    </section>
  );
}

function PlaceCard({ p }: { p: Place & { _d?: number } }) {
  const dir = mapLinks(p).googleDir;
  const tel = telHref(p.phone);
  return (
    <li className="rounded-2xl border border-hairline bg-surface p-4 shadow-soft">
      <Link href={`/place/${p.slug}`} className="block min-w-0">
        <div className="text-lg font-semibold tracking-tight text-ink">{p.name}</div>
        <div className="mt-0.5 text-sm text-ink-2">
          {[p.area, p._d != null ? fmtDistance(p._d) : null].filter(Boolean).join(" · ")}
          {p.location_quality && SHORT_NOTE[p.location_quality] ? ` · ${SHORT_NOTE[p.location_quality]}` : ""}
        </div>
      </Link>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {p.women_section === true && <span className="inline-flex min-h-9 items-center rounded-full bg-accent-soft px-2.5 text-xs font-medium text-accent-text">Women&apos;s area</span>}
        {p.women_section == null && <span className="inline-flex min-h-9 items-center rounded-full bg-surface-2 px-2.5 text-xs font-medium text-ink-3">Women&apos;s area - ask</span>}
        {p.wudu === true && <span className="inline-flex min-h-9 items-center rounded-full bg-accent-soft px-2.5 text-xs font-medium text-accent-text">Wudu</span>}
        {p.parking === true && <span className="inline-flex min-h-9 items-center rounded-full bg-accent-soft px-2.5 text-xs font-medium text-accent-text">Parking</span>}
      </div>
      <div className="mt-3 flex gap-2">
        <a href={dir} target="_blank" rel="noreferrer" className="btn btn-primary h-12 flex-1 text-sm"><IconDirections className="h-4 w-4" /> Directions</a>
        {tel ? (
          <a href={tel} className="btn btn-secondary h-12 min-w-[5.5rem] px-4 text-sm"><IconPhone className="h-4 w-4" /> Call</a>
        ) : (
          <Link href={`/place/${p.slug}`} className="btn btn-secondary h-12 min-w-[5.5rem] px-4 text-sm">Details</Link>
        )}
      </div>
    </li>
  );
}

function Selected({ p, onClose }: { p: Place; onClose: () => void }) {
  const l = mapLinks(p);
  const note = p.location_quality ? QUALITY_NOTE[p.location_quality] : undefined;
  const tel = telHref(p.phone);
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-3" data-testid="selected-place">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-medium text-ink-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: TYPE_COLOR[p.type] }} aria-hidden="true" />
            {TYPE_LABEL[p.type]}
          </div>
          <div className="truncate text-base font-semibold">{p.name}</div>
          <div className="truncate text-sm text-ink-2">{[p.area, p.city].filter(Boolean).join(", ")}</div>
        </div>
        <button type="button" onClick={onClose} className="min-h-12 min-w-12 text-sm font-semibold text-accent-text" aria-label="Close selected place">Close</button>
      </div>
      {note && (p.location_quality === "approximate" || p.location_quality === "listing") && <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">{note}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        <a href={l.googleDir} target="_blank" rel="noreferrer" className="btn btn-primary h-12 px-4 text-sm">Directions</a>
        {tel && <a href={tel} className="chip min-h-12 px-4 text-sm">Call</a>}
        <Link href={`/place/${p.slug}`} className="chip min-h-12 px-4 text-sm">Details</Link>
      </div>
    </div>
  );
}

const Row = memo(function Row({ p, onSelect, active, top }: { p: Place & { _d?: number }; onSelect: (slug: string) => void; active: boolean; top?: number }) {
  const d = directionsLinks(p);
  return (
    <li className={`flex items-center gap-3 rounded-2xl px-2 ${active ? "bg-surface-2" : ""}`} style={{ height: ROW_H, position: top == null ? undefined : "absolute", top, left: 0, right: 0 }}>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full" style={{ background: `${TYPE_COLOR[p.type]}1f` }} aria-hidden>
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: TYPE_COLOR[p.type] }} />
      </span>
      <button type="button" onClick={() => onSelect(p.slug)} className="min-h-12 min-w-0 flex-1 text-left" data-slug={p.slug}>
        <div className="truncate text-base font-medium">{p.name}</div>
        <div className="truncate text-sm text-ink-2">{TYPE_LABEL[p.type]}{p.area || p.city ? ` · ${[p.area, p.city].filter(Boolean).join(", ")}` : ""}</div>
      </button>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {p._d !== undefined && <span className="text-sm font-semibold text-accent-text" data-testid="distance">{fmtDistance(p._d)}</span>}
        <span className="flex gap-1.5 text-xs">
          <a href={d.google} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-full bg-accent-soft px-3 font-medium text-accent-text" aria-label={`Google Maps directions to ${p.name}`}>Google</a>
          <a href={d.apple} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-full bg-surface-2 px-3 font-medium" aria-label={`Apple Maps directions to ${p.name}`}>Apple</a>
        </span>
      </div>
    </li>
  );
});

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
  const slice = items.slice(start, end);
  return (
    <div ref={ref} className="sheet-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 pb-4" data-testid="results" aria-label="Places near you">
      <ul style={{ height: items.length * ROW_H, position: "relative" }} aria-label="Places">
        {slice.map((p, i) => (
          <Row key={p.id} p={p} onSelect={onSelect} active={p.slug === selSlug} top={(start + i) * ROW_H} />
        ))}
      </ul>
      {me && items.length === 0 && <p className="p-6 text-center text-base text-ink-2">Nothing within {radius} km. Try a bigger radius.</p>}
      {footer}
    </div>
  );
}
