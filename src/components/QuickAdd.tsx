"use client";
import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { PLACE_TYPES } from "@/lib/types";
import PinPicker, { defaultPinCenter, type PinValue } from "@/components/PinPicker";

const TS_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
type Geo = { lat: number; lng: number; acc: number };

export default function QuickAdd() {
  const started = useRef(Date.now());
  const tsEl = useRef<HTMLDivElement>(null);
  const tsId = useRef<string | undefined>(undefined);
  const tsToken = useRef("");
  const [geo, setGeo] = useState<Geo | null>(null);
  const [pin, setPin] = useState<PinValue>(() => ({ lat: 12.9716, lng: 77.5946 }));
  const [pinReady, setPinReady] = useState(false);
  const [pinAdjusted, setPinAdjusted] = useState(false);
  const [geoMsg, setGeoMsg] = useState("Getting your location...");
  const [addr, setAddr] = useState({ address: "", area: "", city: "", state: "" });
  const [name, setName] = useState("");
  const [type, setType] = useState("mosque");
  const [women, setWomen] = useState(false);
  const [jumuah, setJumuah] = useState("");
  const [hp, setHp] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState("");
  const [err, setErr] = useState("");

  function renderTs() {
    const t = (window as unknown as { turnstile?: { render: (el: HTMLElement, o: Record<string, unknown>) => string } }).turnstile;
    if (!TS_KEY || !tsEl.current || !t || tsId.current) return;
    tsId.current = t.render(tsEl.current, { sitekey: TS_KEY, callback: (v: string) => { tsToken.current = v; } });
  }

  async function reverse(lat: number, lng: number) {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&lat=${lat}&lon=${lng}`, { headers: { "accept-language": "en" } });
      const a = (await r.json()).address ?? {};
      setAddr({
        address: [a.house_number, a.road].filter(Boolean).join(" "),
        area: a.suburb || a.neighbourhood || a.quarter || a.village || "",
        city: a.city || a.town || a.county || a.state_district || "",
        state: a.state || "",
      });
    } catch { /* address stays editable */ }
  }

  function locate() {
    if (!navigator.geolocation) {
      setGeoMsg("Your browser has no location. Pan the pin or type the address below.");
      const d = defaultPinCenter();
      setPin(d); setPinReady(true); setPinAdjusted(false);
      return;
    }
    setGeoMsg("Getting your location...");
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const g = { lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6), acc: Math.round(p.coords.accuracy) };
        setGeo(g);
        setPin({ lat: g.lat, lng: g.lng });
        setPinReady(true);
        setPinAdjusted(false);
        setGeoMsg(`Location found (accurate to about ${g.acc} m).`);
        await reverse(g.lat, g.lng);
      },
      (e) => {
        setGeoMsg(e.code === 1
          ? "Location is blocked. Allow location for this site, or pan the pin / type the address."
          : "Could not get your location. Pan the pin or type the address.");
        const d = defaultPinCenter();
        setPin(d); setPinReady(true); setPinAdjusted(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  useEffect(() => {
    // Seed from last map view / Bengaluru so the pin map can paint before GPS returns.
    const d = defaultPinCenter();
    setPin(d);
    setPinReady(true);
    renderTs();
    locate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    const hasPin = pinReady && isFinite(pin.lat) && isFinite(pin.lng);
    const noteBits = ["Quick add"];
    if (geo) noteBits.push(`GPS accuracy ${geo.acc} m`);
    if (pinAdjusted) noteBits.push("pin adjusted by user");
    const payload: Record<string, string> = {
      name, type, ...addr, country: "IN", website: hp,
      women_section: women ? "yes" : "", jumuah_time: jumuah,
      notes: noteBits.join("; "),
    };
    // location_quality is not in the submissions ALLOWED set, so we keep the existing mapping
    // (unset) and only send lat/lng. Admin review can treat a user-adjusted pin as exact.
    if (hasPin) { payload.lat = String(pin.lat); payload.lng = String(pin.lng); }
    if (!payload.city && hasPin && pin.lat > 12.6 && pin.lat < 13.45 && pin.lng > 77.2 && pin.lng < 78) {
      payload.city = "Bengaluru"; payload.state = "Karnataka";
    }
    const r = await fetch("/api/submissions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "new_place", payload, started_at: started.current, turnstile: tsToken.current || undefined }),
    });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.ok) { setDone(name); setName(""); setJumuah(""); setWomen(false); started.current = Date.now(); }
    else setErr(d.error ?? "Something went wrong. Please try again.");
  }

  if (done) return (
    <div className="space-y-3 rounded-xl border border-hairline bg-accent-soft p-4">
      <p className="font-medium">JazakAllah khair. &quot;{done}&quot; was sent for review.</p>
      <button onClick={() => { setDone(""); locate(); }} className="btn btn-primary w-full py-3.5">Add another</button>
      <a href="/share" className="link block text-center text-sm underline">Share with your masjid committee</a>
    </div>
  );

  const inp = "w-full h-12 px-4 text-base";
  return (
    <form onSubmit={submit} className="space-y-3">
      {TS_KEY && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onLoad={renderTs} />}
      <button type="button" onClick={locate} className="btn btn-primary h-14 w-full text-base">Use my current location</button>
      <p className="text-sm text-ink-2" role="status">{geoMsg}</p>
      {pinReady && (
        <PinPicker
          value={pin}
          accuracyM={geo?.acc ?? null}
          gps={geo ? { lat: geo.lat, lng: geo.lng } : null}
          onChange={(v, meta) => {
            setPin(v);
            if (meta.userAdjusted) setPinAdjusted(true);
            // Soft reverse when the user settles the pin; don't spam Nominatim on every nudge.
          }}
        />
      )}
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-ink-2">Name</span>
        <input required minLength={3} maxLength={150} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Masjid-e-Noor" className={inp} autoFocus />
      </label>
      <div className="space-y-1.5">
        <span className="text-sm font-medium text-ink-2">Type</span>
        <div className="flex flex-wrap gap-2">
          {PLACE_TYPES.map((t) => (
            <button type="button" key={t.value} onClick={() => setType(t.value)} className={`chip min-h-11 px-4 text-sm ${type === t.value ? "!bg-accent !text-[var(--on-accent)]" : ""}`}>{t.label}</button>
          ))}
        </div>
      </div>
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-ink-2">Jumu&apos;ah time (optional)</span>
        <input value={jumuah} onChange={(e) => setJumuah(e.target.value)} maxLength={60} placeholder="e.g. 1:30 PM" className={inp} />
      </label>
      <label className="flex min-h-12 items-center gap-3 text-base"><input type="checkbox" className="h-5 w-5" checked={women} onChange={(e) => setWomen(e.target.checked)} /> Has a women&apos;s section</label>
      <details className="text-sm">
        <summary className="cursor-pointer text-gray-600 dark:text-ink-3">Address {addr.city ? `(${[addr.area, addr.city].filter(Boolean).join(", ")})` : "(needed if location is off)"}</summary>
        <div className="mt-2 space-y-2">
          <input value={addr.address} onChange={(e) => setAddr({ ...addr, address: e.target.value })} aria-label="Street / landmark" placeholder="Street / landmark" className={inp} />
          <input value={addr.area} onChange={(e) => setAddr({ ...addr, area: e.target.value })} aria-label="Area" placeholder="Area" className={inp} />
          <input value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} aria-label="City" placeholder="City" className={inp} />
        </div>
      </details>
      <input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} name="website" aria-hidden className="absolute -left-[9999px] h-0 w-0 opacity-0" />
      <div ref={tsEl} />
      {err && <p className="text-sm text-red-700 dark:text-red-400">{err}</p>}
      <button disabled={busy || (!pinReady && !addr.address)} className="btn btn-primary w-full py-4 text-lg">{busy ? "Sending..." : "Add this place"}</button>
      <p className="text-center text-xs text-gray-500 dark:text-ink-3">Photos: send them to the masjid page later via &quot;Suggest a fix&quot;. We do not store photos yet.</p>
    </form>
  );
}
