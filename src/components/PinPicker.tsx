"use client";
import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "@/lib/theme";

if (typeof window !== "undefined") maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");

const BLR: [number, number] = [77.5946, 12.9716]; // lng, lat
const STEP = 0.00004; // ~4–5 m

export type PinValue = { lat: number; lng: number };

function reduceMotion() {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
}

function circlePoly(lat: number, lng: number, meters: number): GeoJSON.Feature {
  const coords = Array.from({ length: 65 }, (_, i) => {
    const a = (i / 64) * 2 * Math.PI;
    return [lng + (meters / (111320 * Math.cos((lat * Math.PI) / 180))) * Math.sin(a), lat + (meters / 111320) * Math.cos(a)] as [number, number];
  });
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [coords] } };
}

/** Fixed-center pin over a pannable MapLibre map. Best for iOS Safari touch. */
export default function PinPicker({
  value,
  onChange,
  accuracyM,
  gps,
}: {
  value: PinValue;
  onChange: (v: PinValue, meta: { userAdjusted: boolean }) => void;
  accuracyM?: number | null;
  /** Original GPS fix, for the accuracy circle. */
  gps?: PinValue | null;
}) {
  const theme = useTheme();
  const themeRef = useRef(theme);
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const ready = useRef(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const suppress = useRef(false);
  const interacting = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [lift, setLift] = useState(false);
  const [status, setStatus] = useState("Pin set");

  useEffect(() => {
    if (!el.current || map.current) return;
    const dark = themeRef.current === "dark";
    const m = new maplibregl.Map({
      container: el.current,
      style: `https://tiles.openfreemap.org/styles/${dark ? "dark" : "positron"}`,
      center: [value.lng, value.lat],
      zoom: 18,
      maxZoom: 20,
      minZoom: 3,
      attributionControl: false,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      fadeDuration: reduceMotion() ? 0 : 200,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });
    map.current = m;
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    m.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    m.getCanvas().style.touchAction = "none";
    m.getCanvas().setAttribute("aria-label", "Map. Pan to place the pin on the masjid.");
    m.on("load", () => {
      ready.current = true;
      m.addSource("gps-acc", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      m.addLayer({ id: "gps-acc", type: "fill", source: "gps-acc", paint: { "fill-color": "#0a84ff", "fill-opacity": 0.14, "fill-outline-color": "#0a84ff" } });
      m.getCanvasContainer().style.touchAction = "none";
    });
    const emit = () => {
      if (suppress.current || !interacting.current) return;
      const c = m.getCenter();
      const next = { lat: +c.lat.toFixed(6), lng: +c.lng.toFixed(6) };
      setStatus("Pin set");
      onChangeRef.current(next, { userAdjusted: true });
    };
    m.on("dragstart", () => { interacting.current = true; setDragging(true); setLift(!reduceMotion()); });
    m.on("dragend", () => { setDragging(false); setLift(false); emit(); });
    m.on("zoomstart", () => { if (!suppress.current) interacting.current = true; });
    m.on("zoomend", emit);
    m.on("click", (e) => {
      interacting.current = true;
      if (reduceMotion()) m.jumpTo({ center: e.lngLat });
      else m.easeTo({ center: e.lngLat, duration: 280, essential: true });
      m.once("moveend", emit);
    });
    return () => { ready.current = false; m.remove(); map.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // External value changes (GPS locate / nudge / reset) re-center without marking as user-drag.
  useEffect(() => {
    const m = map.current;
    if (!m || !ready.current) {
      // Map may not be ready yet; retry on idle once created.
      const t = setInterval(() => {
        const mm = map.current;
        if (!mm || !ready.current) return;
        clearInterval(t);
        const c = mm.getCenter();
        if (Math.abs(c.lat - value.lat) < 1e-7 && Math.abs(c.lng - value.lng) < 1e-7) return;
        suppress.current = true;
        interacting.current = false;
        mm.jumpTo({ center: [value.lng, value.lat], zoom: Math.max(mm.getZoom(), 18) });
        mm.once("moveend", () => { suppress.current = false; });
      }, 50);
      return () => clearInterval(t);
    }
    const c = m.getCenter();
    if (Math.abs(c.lat - value.lat) < 1e-7 && Math.abs(c.lng - value.lng) < 1e-7) return;
    suppress.current = true;
    interacting.current = false;
    if (reduceMotion()) {
      m.jumpTo({ center: [value.lng, value.lat], zoom: Math.max(m.getZoom(), 18) });
      suppress.current = false;
    } else {
      m.easeTo({ center: [value.lng, value.lat], zoom: Math.max(m.getZoom(), 18), duration: 450, essential: true });
      m.once("moveend", () => { suppress.current = false; });
    }
  }, [value.lat, value.lng]);

  useEffect(() => {
    const m = map.current; if (!m || themeRef.current === theme) return;
    themeRef.current = theme;
    const url = `https://tiles.openfreemap.org/styles/${theme === "dark" ? "dark" : "positron"}`;
    m.setStyle(url, {
      transformStyle: (prev, next) => {
        if (!prev) return next;
        const base = new Set(Object.keys(next.sources));
        const sources = { ...next.sources };
        for (const [k, v] of Object.entries(prev.sources)) if (!base.has(k) && !(k in sources)) sources[k] = v;
        const own = prev.layers.filter((l) => "source" in l && typeof l.source === "string" && !base.has(l.source) && l.source in sources);
        return { ...next, sources, layers: [...next.layers, ...own] };
      },
    });
  }, [theme]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const apply = () => {
      if (!m.getSource("gps-acc")) return void m.once("idle", apply);
      const src = m.getSource("gps-acc") as maplibregl.GeoJSONSource;
      const feat = gps && accuracyM && accuracyM > 0 ? [circlePoly(gps.lat, gps.lng, accuracyM)] : [];
      src.setData({ type: "FeatureCollection", features: feat });
    };
    apply();
    if (gps) setStatus("Pin set at your location");
    // Depend on the numbers, not the object identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gps?.lat, gps?.lng, accuracyM]);

  function nudge(dLat: number, dLng: number) {
    const next = { lat: +(value.lat + dLat).toFixed(6), lng: +(value.lng + dLng).toFixed(6) };
    setStatus("Pin set");
    onChange(next, { userAdjusted: true });
  }

  return (
    <div className="space-y-2" data-testid="pin-picker">
      <p id="pin-hint" className="text-sm font-medium text-ink-2">Drag the pin to the exact spot of the masjid</p>
      <div
        className="relative overflow-hidden rounded-2xl border border-hairline bg-surface-2"
        style={{ touchAction: "none" }}
        data-testid="pin-map"
        aria-describedby="pin-hint"
      >
        <div ref={el} className="h-56 w-full sm:h-64" style={{ touchAction: "none" }} />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <div
            data-testid="center-pin"
            className={`origin-bottom ${lift ? "-translate-y-2 scale-110" : ""} ${reduceMotion() ? "" : "transition-transform"}`}
            style={{ marginBottom: 22 }}
          >
            <svg width="40" height="52" viewBox="0 0 34 44" className="drop-shadow-md">
              <path d="M17 43C17 43 32 27.5 32 17A15 15 0 0 0 2 17C2 27.5 17 43 17 43Z" fill="#0b6e4f" stroke="#fff" strokeWidth="2.5" />
              <circle cx="17" cy="17" r="5.5" fill="#fff" />
            </svg>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-ink-3" role="status" data-testid="pin-status">{status}</span>
        <div className="ml-auto flex gap-1" role="group" aria-label="Nudge the pin">
          {([
            ["N", STEP, 0],
            ["S", -STEP, 0],
            ["W", 0, -STEP],
            ["E", 0, STEP],
          ] as const).map(([label, dLat, dLng]) => (
            <button
              key={label}
              type="button"
              onClick={() => nudge(dLat, dLng)}
              aria-label={`Move pin ${label === "N" ? "north" : label === "S" ? "south" : label === "E" ? "east" : "west"}`}
              className="inline-flex h-12 min-w-12 items-center justify-center rounded-xl border border-hairline bg-surface text-sm font-semibold text-ink-2"
              data-testid={`nudge-${label.toLowerCase()}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-ink-3">Pan the map or tap a spot. Pinch to zoom in for building outlines. No free satellite layer without a key.</p>
      <span className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-live="polite">{dragging ? "Moving map" : ""}</span>
    </div>
  );
}

export function defaultPinCenter(): PinValue {
  try {
    const s = sessionStorage.getItem("wtp-loc");
    if (s) {
      const l = JSON.parse(s) as { lat?: number; lng?: number };
      if (typeof l.lat === "number" && typeof l.lng === "number" && isFinite(l.lat) && isFinite(l.lng)) {
        return { lat: +l.lat.toFixed(6), lng: +l.lng.toFixed(6) };
      }
    }
  } catch { /* ignore */ }
  return { lat: BLR[1], lng: BLR[0] };
}
