"use client";
import { useEffect, useRef, useState } from "react";
import { KAABA, compassPoint, qiblaBearing } from "@/lib/qibla";
import { distanceKm } from "@/lib/geo";

type Loc = { lat: number; lng: number; label: string };
type OrientEvt = DeviceOrientationEvent & { webkitCompassHeading?: number; webkitCompassAccuracy?: number };

/** Live qibla compass. With a sensor the needle points at the Kaaba; without one it shows the static bearing from true north. */
export default function QiblaCompass({ initial, compact = false }: { initial?: Loc; compact?: boolean }) {
  const [loc, setLoc] = useState<Loc | null>(initial ?? null);
  const [heading, setHeading] = useState<number | null>(null);
  const [sensor, setSensor] = useState<"idle" | "needs-permission" | "on" | "none" | "denied">("idle");
  const [msg, setMsg] = useState("");
  const [manual, setManual] = useState("");
  const gotAbs = useRef(false);

  useEffect(() => {
    if (initial) return;
    try { const s = sessionStorage.getItem("wtp-loc"); if (s) setLoc(JSON.parse(s)); } catch {}
  }, [initial]);

  useEffect(() => {
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) { setSensor("none"); return; }
    const DOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof DOE.requestPermission === "function") setSensor("needs-permission"); // iOS 13+
    else start();
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onAbs = (e: Event) => {
    const ev = e as OrientEvt;
    if (ev.alpha == null) return;
    gotAbs.current = true;
    setHeading((360 - ev.alpha + screenAngle()) % 360);
    setSensor("on");
  };
  const onRel = (e: Event) => {
    const ev = e as OrientEvt;
    if (typeof ev.webkitCompassHeading === "number") { setHeading((ev.webkitCompassHeading + screenAngle()) % 360); setSensor("on"); return; }
    if (gotAbs.current) return;
    if (ev.absolute && ev.alpha != null) { setHeading((360 - ev.alpha + screenAngle()) % 360); setSensor("on"); }
  };
  function screenAngle() { return (typeof screen !== "undefined" && screen.orientation?.angle) || 0; }
  function start() {
    window.addEventListener("deviceorientationabsolute", onAbs, true); // Android Chrome: true-north referenced
    window.addEventListener("deviceorientation", onRel, true); // iOS Safari: webkitCompassHeading
    setTimeout(() => setSensor((s) => (s === "on" ? s : "none")), 3000);
  }
  function stop() {
    window.removeEventListener("deviceorientationabsolute", onAbs, true);
    window.removeEventListener("deviceorientation", onRel, true);
  }
  async function enableIOS() {
    try {
      const r = await (DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
      if (r === "granted") { setSensor("idle"); start(); } else setSensor("denied");
    } catch { setSensor("denied"); }
  }

  function locate() {
    if (!("geolocation" in navigator)) return setMsg("Location is not available. Enter your area or pincode.");
    setMsg("Finding you...");
    navigator.geolocation.getCurrentPosition(
      (p) => { const l = { lat: p.coords.latitude, lng: p.coords.longitude, label: "your location" }; setLoc(l); setMsg(""); try { sessionStorage.setItem("wtp-loc", JSON.stringify(l)); } catch {} },
      async (e) => { try { const r = await fetch("https://ipwho.is/"); const j = await r.json(); if (j.success && j.latitude) { const l = { lat: j.latitude, lng: j.longitude, label: `approx. ${j.city || "your area"}` }; setLoc(l); setMsg("Exact location is blocked, so I used your approximate location. Allow location in your browser for a precise direction."); try { sessionStorage.setItem("wtp-loc", JSON.stringify(l)); } catch {} return; } } catch {} setMsg(e.code === e.PERMISSION_DENIED ? "Location permission denied. Enter your area, city or pincode below." : "Could not get your location. Enter your area, city or pincode below."); },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }
  async function search(e: React.FormEvent) {
    e.preventDefault();
    const t = manual.trim(); if (!t) return;
    setMsg("Searching...");
    try {
      const qs = /^\d{6}$/.test(t) ? `postalcode=${t}&country=India` : `q=${encodeURIComponent(t)}`;
      const [hit] = await (await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&${qs}`)).json();
      if (!hit) return setMsg(`No match for "${t}".`);
      setLoc({ lat: +hit.lat, lng: +hit.lon, label: String(hit.display_name).split(",").slice(0, 2).join(",") }); setMsg("");
    } catch { setMsg("Search failed."); }
  }

  const bearing = loc ? qiblaBearing(loc.lat, loc.lng) : null;
  const dist = loc ? distanceKm(loc.lat, loc.lng, KAABA.lat, KAABA.lng) : null;
  // live: rotate the dial by -heading so N on the dial matches real north; needle sits at the qibla bearing on the dial
  const dialRot = sensor === "on" && heading != null ? -heading : 0;
  const aligned = sensor === "on" && heading != null && bearing != null && Math.abs(((bearing - heading + 540) % 360) - 180) < 5;
  const size = compact ? 160 : 300;

  return (
    <div className="space-y-5">
      <div className="relative mx-auto" style={{ width: size, height: size }} aria-label="Qibla compass">
        <div className={`absolute inset-0 rounded-full ${aligned ? "shadow-[0_0_0_10px_var(--accent-soft),0_20px_60px_rgba(11,110,79,.35)]" : "shadow-float"}`} />
        <svg viewBox="-150 -150 300 300" className="absolute inset-0 h-full w-full transition-transform duration-200 ease-out" style={{ transform: `rotate(${dialRot}deg)` }} data-testid="dial">
          <circle r="148" fill="var(--surface)" stroke={aligned ? "var(--accent)" : "var(--hairline)"} strokeWidth="2" />
          {Array.from({ length: 72 }, (_, i) => (
            <line key={i} x1="0" y1="-140" x2="0" y2={i % 18 === 0 ? -124 : i % 2 === 0 ? -131 : -135} stroke={i % 18 === 0 ? "var(--text)" : "var(--text-3)"} strokeWidth={i % 18 === 0 ? 2.5 : 1} strokeLinecap="round" transform={`rotate(${i * 5})`} />
          ))}
          {["N", "E", "S", "W"].map((d, i) => (
            <text key={d} x="0" y="-102" textAnchor="middle" dominantBaseline="middle" fontSize="18" fontWeight="700" fill={d === "N" ? "#ff3b30" : "var(--text-2)"} transform={`rotate(${i * 90}) rotate(${-i * 90 - dialRot} 0 -102)`}>{d}</text>
          ))}
          {bearing != null ? (
            <g transform={`rotate(${bearing})`} data-testid="needle">
              <path d="M0,-100 L8,-28 L0,-34 L-8,-28 Z" fill="var(--accent)" />
              <line x1="0" y1="-28" x2="0" y2="42" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" opacity=".35" />
              {/* Kaaba / Makkah marker at the qibla tip - rotates with the bearing so it always points to the Kaaba. */}
              <g transform="translate(0,-122)" data-testid="kaaba">
                <rect x="-14" y="-16" width="28" height="32" rx="3" fill="var(--text)" />
                <rect x="-14" y="-6" width="28" height="4.5" fill="#d4af37" />
                <rect x="-5" y="4" width="10" height="10" rx="1.2" fill="none" stroke="#d4af37" strokeWidth="1.6" />
              </g>
            </g>
          ) : (
            <g transform="translate(0,-122)" data-testid="kaaba" opacity="0.55" aria-hidden="true">
              <rect x="-14" y="-16" width="28" height="32" rx="3" fill="var(--text)" />
              <rect x="-14" y="-6" width="28" height="4.5" fill="#d4af37" />
              <rect x="-5" y="4" width="10" height="10" rx="1.2" fill="none" stroke="#d4af37" strokeWidth="1.6" />
            </g>
          )}
          <circle r="7" fill="var(--surface)" stroke="var(--text)" strokeWidth="3" />
        </svg>
        <div className="absolute left-1/2 -top-3 h-0 w-0 -translate-x-1/2 border-x-[7px] border-t-[10px] border-x-transparent" style={{ borderTopColor: aligned ? "var(--accent)" : "var(--text)" }} title="Top of your phone" />
      </div>
      {bearing != null ? (
        <div className="text-center" data-testid="bearing">
          <div className="text-5xl font-bold tabular-nums tracking-tight">{bearing.toFixed(1)}°</div>
          <div className="mt-1 text-[15px] text-ink-2">{compassPoint(bearing)} from true north · Kaaba {Math.round(dist!).toLocaleString()} km away</div>
          {!compact && <div className="mt-1 text-xs text-ink-3">From {loc!.label}</div>}
        </div>
      ) : <p className="text-center text-sm text-ink-2">Set your location to get the qibla direction.</p>}
      {!compact && (
        <>
          <div className="text-center text-sm text-ink-2">
            {sensor === "on" && (aligned ? <b className="text-lg text-accent-text">Facing the qibla</b> : "Turn until the Kaaba is at the top marker.")}
            {sensor === "needs-permission" && <button type="button" onClick={enableIOS} className="btn btn-tinted h-14 w-full text-base">Enable live compass</button>}
            {sensor === "denied" && "Compass access was declined. Use the bearing above with a compass app, or reload to try again."}
            {sensor === "none" && "No compass sensor found (common on laptops). Use the bearing above: it is measured clockwise from true north."}
            {sensor === "idle" && "Starting compass..."}
          </div>
          <button type="button" onClick={locate} className="btn btn-primary h-14 w-full text-base">Use my location</button>
          <form onSubmit={search} className="flex gap-2">
            <input value={manual} onChange={(e) => setManual(e.target.value)} aria-label="Or enter area, city or pincode" placeholder="Or enter area, city or pincode" className="h-11 flex-1 px-4 text-[15px]" />
            <button className="btn btn-secondary">Set</button>
          </form>
          {msg && <p className="text-center text-xs text-amber-700" role="status">{msg}</p>}
          {sensor === "on" && <p className="text-center text-xs text-gray-500">Keep the phone flat and away from metal. If the direction looks off, move the phone in a figure 8 to calibrate.</p>}
        </>
      )}
    </div>
  );
}
