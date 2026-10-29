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
      (e) => setMsg(e.code === e.PERMISSION_DENIED ? "Location permission denied. Enter your area, city or pincode below." : "Could not get your location. Enter your area, city or pincode below."),
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
  const size = compact ? 140 : 260;

  return (
    <div className="space-y-3">
      <div className="relative mx-auto" style={{ width: size, height: size }} aria-label="Qibla compass">
        <div className="absolute inset-0 rounded-full border-4 transition-transform duration-150" style={{ transform: `rotate(${dialRot}deg)`, borderColor: aligned ? "#047857" : "#d1d5db" }} data-testid="dial">
          {["N", "E", "S", "W"].map((d, i) => (
            <span key={d} className={`absolute left-1/2 top-1/2 text-xs font-bold ${d === "N" ? "text-red-600" : "text-gray-500"}`}
              style={{ transform: `rotate(${i * 90}deg) translateY(-${size / 2 - 14}px) rotate(${-i * 90}deg) translate(-50%,-50%)` }}>{d}</span>
          ))}
          {bearing != null && (
            <div className="absolute left-1/2 top-1/2 origin-bottom" style={{ width: 6, height: size / 2 - 22, marginLeft: -3, marginTop: -(size / 2 - 22), transform: `rotate(${bearing}deg)` }} data-testid="needle">
              <div className="mx-auto h-full w-1.5 rounded-full bg-emerald-700" />
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-lg">🕋</div>
            </div>
          )}
        </div>
        <div className="absolute left-1/2 top-0 h-4 w-0.5 -translate-x-1/2 bg-gray-900" title="Top of your phone" />
        <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gray-900" />
      </div>
      {bearing != null ? (
        <p className="text-center" data-testid="bearing">
          Qibla: <b>{bearing.toFixed(1)}°</b> from true north ({compassPoint(bearing)}) - Kaaba is <b>{Math.round(dist!).toLocaleString()} km</b> away
          {!compact && <><br /><span className="text-xs text-gray-500">From {loc!.label}</span></>}
        </p>
      ) : <p className="text-center text-sm text-gray-600">Set your location to get the qibla direction.</p>}
      {!compact && (
        <>
          <p className="text-center text-sm">
            {sensor === "on" && (aligned ? <b className="text-emerald-700">Facing the qibla</b> : "Turn until the Kaaba is at the top marker.")}
            {sensor === "needs-permission" && <button onClick={enableIOS} className="rounded-lg bg-emerald-700 px-3 py-2 text-white">Enable live compass</button>}
            {sensor === "denied" && "Compass access was declined. Use the bearing above with a compass app, or reload to try again."}
            {sensor === "none" && "No compass sensor found (common on laptops). Use the bearing above: it is measured clockwise from true north."}
            {sensor === "idle" && "Starting compass..."}
          </p>
          <div className="flex justify-center"><button onClick={locate} className="rounded-lg border px-3 py-2 text-sm">Use my location</button></div>
          <form onSubmit={search} className="flex gap-2">
            <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Or enter area, city or pincode" className="flex-1 rounded-lg border px-3 py-2 text-sm" />
            <button className="rounded-lg border px-3 py-2 text-sm">Set</button>
          </form>
          {msg && <p className="text-center text-xs text-amber-700" role="status">{msg}</p>}
          {sensor === "on" && <p className="text-center text-xs text-gray-500">Keep the phone flat and away from metal. If the direction looks off, move the phone in a figure 8 to calibrate.</p>}
        </>
      )}
    </div>
  );
}
