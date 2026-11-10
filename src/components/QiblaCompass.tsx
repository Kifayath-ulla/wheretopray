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
    let cached = false;
    try { const s = sessionStorage.getItem("wtp-loc"); if (s) { setLoc(JSON.parse(s)); cached = true; } } catch {}
    // Location already allowed: locate straight away instead of asking for another tap.
    if (!cached) navigator.permissions?.query({ name: "geolocation" }).then((st) => { if (st.state === "granted") locate(); }).catch(() => {});
     
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
  function retry() {
    const DOE = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof DOE.requestPermission === "function") return enableIOS();
    setSensor("idle"); stop(); start();
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
  const live = sensor === "on" && heading != null;
  // Live: the dial turns by -heading so N on the dial matches real north. The needle and Kaaba sit at the qibla bearing on the dial.
  const dialRot = live ? -heading! : 0;
  const off = live && bearing != null ? ((bearing - heading! + 540) % 360) - 180 : null; // -180..180, + means turn right
  const aligned = off != null && Math.abs(off) <= 3;
  const wasAligned = useRef(false);
  useEffect(() => {
    if (aligned && !wasAligned.current) { try { navigator.vibrate?.(60); } catch {} }
    wasAligned.current = aligned;
  }, [aligned]);
  const size = compact ? "160px" : "min(300px, 78vw, 40dvh)";
  const ring = aligned ? "var(--accent)" : "var(--hairline)";

  return (
    <div className="space-y-4">
      <div className="relative mx-auto aspect-square" style={{ width: size }} aria-label="Qibla compass" role="img">
        <div className={`absolute inset-0 rounded-full transition-shadow ${aligned ? "shadow-[0_0_0_8px_var(--accent-soft)]" : "shadow-float"}`} />
        <svg viewBox="-150 -150 300 300" className="absolute inset-0 h-full w-full transition-transform duration-200 ease-out" style={{ transform: `rotate(${dialRot}deg)` }} data-testid="dial">
          <circle r="148" fill="var(--surface)" stroke={ring} strokeWidth={aligned ? 4 : 2} />
          {Array.from({ length: 72 }, (_, i) => (
            <line key={i} x1="0" y1="-140" x2="0" y2={i % 18 === 0 ? -126 : i % 2 === 0 ? -132 : -136} stroke={i % 18 === 0 ? "var(--text)" : "var(--text-3)"} strokeWidth={i % 18 === 0 ? 2.5 : 1} strokeLinecap="round" transform={`rotate(${i * 5})`} />
          ))}
          {["N", "E", "S", "W"].map((d, i) => (
            <text key={d} x="0" y="-100" textAnchor="middle" dominantBaseline="central" fontSize="18" fontWeight="700" fill={d === "N" ? "#ff3b30" : "var(--text-2)"} transform={`rotate(${i * 90}) rotate(${-i * 90 - dialRot} 0 -100)`}>{d}</text>
          ))}
          {bearing != null && (
            <g transform={`rotate(${bearing})`} data-testid="needle">
              {/* One piece from the hub to the rim: tail, shaft and arrowhead. */}
              <line x1="0" y1="30" x2="0" y2="-70" stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" />
              <path d="M0,-104 L11,-70 L-11,-70 Z" fill="var(--accent)" />
              {/* Kaaba docked on the rim at the qibla bearing, kept upright. */}
              <g transform={`translate(0,-126) rotate(${-bearing - dialRot})`} data-testid="kaaba">
                <circle r="17" fill="#f4efe2" stroke="var(--accent)" strokeWidth="2.5" />
                <rect x="-9" y="-9" width="18" height="18" rx="1.5" fill="#111" />
                <rect x="-9" y="-4.5" width="18" height="3.5" fill="#d4af37" />
              </g>
            </g>
          )}
          <circle r="8" fill="var(--accent)" stroke="var(--surface)" strokeWidth="3" />
        </svg>
        {/* Fixed marker = top of your phone. */}
        <div className="absolute left-1/2 -top-2 h-0 w-0 -translate-x-1/2 border-x-[8px] border-t-[12px] border-x-transparent" style={{ borderTopColor: aligned ? "var(--accent)" : "var(--text)" }} aria-hidden="true" />
      </div>

      {bearing != null ? (
        <div className="text-center" data-testid="bearing" aria-live="polite">
          {aligned ? (
            <div className="text-3xl font-bold text-accent-text" data-testid="facing">Facing Qibla</div>
          ) : (
            <div className="text-5xl font-bold tabular-nums tracking-tight">{Math.round(bearing)}°</div>
          )}
          <div className="mt-1 text-[15px] text-ink-2">Qibla is {Math.round(bearing)}° {compassPoint(bearing)} from north · Kaaba {Math.round(dist!).toLocaleString()} km</div>
          {live && !aligned && off != null && <div className="mt-1 text-[15px] font-medium">Turn {off > 0 ? "right" : "left"} {Math.round(Math.abs(off))}°</div>}
          {!compact && <div className="mt-1 text-xs text-ink-3">From {loc!.label}</div>}
        </div>
      ) : <p className="text-center text-[15px] text-ink-2">Set your location to see the Qibla direction.</p>}

      {!compact && (
        <>
          <div className="space-y-2 text-center text-[15px] text-ink-2" data-testid="sensor-help">
            {sensor === "on" && !aligned && <p>Hold the phone flat. Turn until the Kaaba is under the top marker.</p>}
            {sensor === "needs-permission" && (<><p>Tap Enable live compass so the dial follows your phone.</p><button type="button" onClick={enableIOS} className="btn btn-tinted h-12 w-full text-base">Enable live compass</button></>)}
            {sensor === "denied" && (<><p>Live compass is off. Tap Try again and choose Allow. If nothing happens, reload the page. Or turn the phone until N matches north and face the Kaaba.</p><button type="button" onClick={retry} className="btn btn-secondary h-12 w-full text-base">Try again</button></>)}
            {sensor === "none" && (<><p>No live compass on this device. Turn the phone until N matches north, then face the Kaaba.</p><button type="button" onClick={retry} className="btn btn-secondary h-11 w-full text-base">Try again</button></>)}
            {sensor === "idle" && <p>Starting compass...</p>}
          </div>
          <button type="button" onClick={locate} className="btn btn-primary h-14 w-full text-base">Use my location</button>
          <form onSubmit={search} className="flex gap-2">
            <input value={manual} onChange={(e) => setManual(e.target.value)} aria-label="Or enter area, city or pincode" placeholder="Or enter area, city or pincode" className="h-12 min-w-0 flex-1 px-4 text-base" />
            <button className="btn btn-secondary h-12">Set</button>
          </form>
          {msg && <p className="text-center text-sm text-ink-2" role="status">{msg}</p>}
          {sensor === "on" && <p className="text-center text-xs text-ink-3">Keep away from metal. If it looks off, move the phone in a figure 8.</p>}
        </>
      )}
    </div>
  );
}
