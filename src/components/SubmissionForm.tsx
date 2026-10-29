"use client";
import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { PLACE_TYPES } from "@/lib/types";

const TS_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
declare global { interface Window { turnstile?: { render: (el: HTMLElement, o: Record<string, unknown>) => string; reset: (id?: string) => void } } }

export default function SubmissionForm({ kind, placeId, placeName }: { kind: "new_place" | "fix"; placeId?: string; placeName?: string }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [err, setErr] = useState("");
  const [loc, setLoc] = useState({ lat: "", lng: "", city: "", state: "", country: "IN", area: "" });
  const [geoMsg, setGeoMsg] = useState("");
  const started = useRef(Date.now());
  const tsEl = useRef<HTMLDivElement>(null);
  const tsToken = useRef("");
  const tsId = useRef<string | undefined>(undefined);

  function renderTurnstile() {
    if (!TS_KEY || !tsEl.current || !window.turnstile || tsId.current) return;
    tsId.current = window.turnstile.render(tsEl.current, { sitekey: TS_KEY, callback: (t: string) => { tsToken.current = t; } });
  }
  useEffect(() => { renderTurnstile(); }, []);

  async function reverse(lat: string, lng: string) {
    if (!isFinite(+lat) || !isFinite(+lng) || !lat || !lng) return;
    setGeoMsg("Looking up city...");
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=14&lat=${lat}&lon=${lng}`, { headers: { "Accept-Language": "en" } });
      const j = await r.json();
      const a = j.address ?? {};
      setLoc((l) => ({
        ...l,
        city: a.city || a.town || a.village || a.county || a.state_district || l.city,
        state: a.state || l.state,
        country: (a.country_code || l.country || "").toUpperCase(),
        area: a.suburb || a.neighbourhood || a.quarter || l.area,
      }));
      setGeoMsg("");
    } catch { setGeoMsg("Could not look up the city. Please type it."); }
  }
  function useMyLocation() {
    if (!("geolocation" in navigator)) return setGeoMsg("Location is not available in this browser.");
    setGeoMsg("Finding you...");
    navigator.geolocation.getCurrentPosition(
      (p) => { const lat = p.coords.latitude.toFixed(6), lng = p.coords.longitude.toFixed(6); setLoc((l) => ({ ...l, lat, lng })); reverse(lat, lng); },
      () => setGeoMsg("Location blocked. Type the coordinates or city instead."),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (TS_KEY && !tsToken.current) { setState("error"); setErr("Please complete the captcha."); return; }
    setState("sending");
    const payload = Object.fromEntries(new FormData(e.currentTarget).entries());
    delete (payload as Record<string, unknown>)["cf-turnstile-response"];
    const res = await fetch("/api/submissions", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, place_id: placeId, payload, started_at: started.current, turnstile: tsToken.current || undefined }),
    });
    if (res.ok) setState("done");
    else {
      setState("error"); setErr((await res.json().catch(() => ({}))).error ?? "Something went wrong");
      if (TS_KEY) { window.turnstile?.reset(tsId.current); tsToken.current = ""; }
    }
  }

  if (state === "done") return <p className="rounded-lg bg-emerald-50 p-4 text-emerald-800">Thank you - your {kind === "fix" ? "correction" : "submission"} is in the moderation queue.</p>;
  const field = "w-full rounded-lg border px-3 py-2 text-sm";
  const set = (k: keyof typeof loc) => (e: React.ChangeEvent<HTMLInputElement>) => setLoc({ ...loc, [k]: e.target.value });
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {TS_KEY && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onLoad={renderTurnstile} />}
      {/* Honeypot: hidden from people, bots tend to fill it. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
        <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      {kind === "new_place" ? (
        <>
          <input name="name" required minLength={3} maxLength={150} placeholder="Name *" className={field} />
          <select name="type" className={field} defaultValue="mosque">{PLACE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
          <input name="address" maxLength={500} placeholder="Address / landmark" className={field} />
          <div className="flex gap-2">
            <input name="lat" value={loc.lat} onChange={set("lat")} onBlur={() => reverse(loc.lat, loc.lng)} inputMode="decimal" placeholder="Latitude" className={field} />
            <input name="lng" value={loc.lng} onChange={set("lng")} onBlur={() => reverse(loc.lat, loc.lng)} inputMode="decimal" placeholder="Longitude" className={field} />
          </div>
          <button type="button" onClick={useMyLocation} className="text-xs text-emerald-700 underline">I am here now - use my location</button>
          {geoMsg && <p className="text-xs text-amber-700">{geoMsg}</p>}
          <div className="grid grid-cols-2 gap-2">
            <input name="area" value={loc.area} onChange={set("area")} maxLength={120} placeholder="Area / locality" className={field} />
            <input name="city" value={loc.city} onChange={set("city")} required maxLength={120} placeholder="City *" className={field} />
            <input name="state" value={loc.state} onChange={set("state")} maxLength={120} placeholder="State" className={field} />
            <input name="country" value={loc.country} onChange={set("country")} maxLength={2} placeholder="Country code (IN)" className={field} />
          </div>
          <input name="jumuah_time" maxLength={40} placeholder="Jumu'ah time (e.g. 1:30 PM)" className={field} />
          <div className="flex flex-wrap gap-3 text-sm">
            <label><input type="checkbox" name="women_section" value="yes" /> Women&apos;s area</label>
            <label><input type="checkbox" name="wudu" value="yes" /> Wudu</label>
            <label><input type="checkbox" name="parking" value="yes" /> Parking</label>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-600">Reporting a fix for <b>{placeName}</b></p>
          <select name="issue" className={field}>
            <option>Wrong name</option><option>Wrong location</option><option>Wrong type</option><option>Timings</option><option>Facilities</option><option>Permanently closed</option><option>Other</option>
          </select>
          <input name="name" maxLength={150} placeholder="Corrected name (optional)" className={field} />
          <input name="address" maxLength={500} placeholder="Corrected address (optional)" className={field} />
          <div className="flex gap-2"><input name="lat" inputMode="decimal" placeholder="Corrected latitude" className={field} /><input name="lng" inputMode="decimal" placeholder="Corrected longitude" className={field} /></div>
        </>
      )}
      <textarea name="notes" maxLength={1000} placeholder={kind === "fix" ? "What should be corrected? *" : "Notes (iqama times, facilities, who runs it)"} required={kind === "fix"} className={field} rows={3} />
      <input name="contact" type="email" maxLength={120} placeholder="Your email (optional)" className={field} />
      {TS_KEY && <div ref={tsEl} />}
      <button disabled={state === "sending"} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{state === "sending" ? "Sending..." : "Submit"}</button>
      {state === "error" && <p className="text-sm text-red-600">{err}</p>}
    </form>
  );
}
