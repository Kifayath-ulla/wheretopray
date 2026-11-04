"use client";
import { useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "@/lib/theme";
import { mapLinks, QUALITY_NOTE } from "@/lib/maplinks";

if (typeof window !== "undefined") maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");

/** Street-level map with one pin on the place's exact stored coordinates, plus copyable coordinates. */
export default function PlaceSpot({ lat, lng, name, quality, color }: { lat: number; lng: number; name: string; quality?: string | null; color: string }) {
  const theme = useTheme();
  const el = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const coords = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  const l = mapLinks({ lat, lng, name });
  useEffect(() => {
    if (!el.current) return;
    const dark = theme === "dark";
    const m = new maplibregl.Map({ container: el.current, style: `https://tiles.openfreemap.org/styles/${dark ? "dark" : "liberty"}`, center: [lng, lat], zoom: 17.5, attributionControl: false, pixelRatio: Math.min(window.devicePixelRatio || 1, 2), fadeDuration: 0, cooperativeGestures: true });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    m.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    const pin = document.createElement("div");
    pin.setAttribute("data-testid", "place-pin");
    pin.title = name;
    pin.innerHTML = `<svg width="34" height="44" viewBox="0 0 34 44" aria-hidden="true"><path d="M17 43C17 43 32 27.5 32 17A15 15 0 0 0 2 17C2 27.5 17 43 17 43Z" fill="${color}" stroke="#fff" stroke-width="2.5"/><circle cx="17" cy="17" r="5.5" fill="#fff"/></svg>`;
    new maplibregl.Marker({ element: pin, anchor: "bottom" }).setLngLat([lng, lat]).addTo(m);
    if (quality === "approximate" || quality === "listing") {
      const r = quality === "approximate" ? 250 : 75;
      m.on("load", () => {
        m.addSource("unc", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [Array.from({ length: 65 }, (_, i) => { const a = (i / 64) * 2 * Math.PI; return [lng + (r / (111320 * Math.cos((lat * Math.PI) / 180))) * Math.sin(a), lat + (r / 111320) * Math.cos(a)]; })] } } });
        m.addLayer({ id: "unc", type: "fill", source: "unc", paint: { "fill-color": "#f59e0b", "fill-opacity": 0.1, "fill-outline-color": "#f59e0b" } });
        if (quality === "approximate") m.setZoom(15.5);
      });
    }
    return () => m.remove();
  }, [lat, lng, name, quality, color, theme]);
  const copy = async () => { try { await navigator.clipboard.writeText(coords); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} };
  const note = quality ? QUALITY_NOTE[quality] : undefined;
  return (
    <section className="card overflow-hidden" data-testid="place-location">
      <div ref={el} className="h-64 w-full bg-surface-2" />
      <div className="space-y-3 p-4 text-sm">
        {note && <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300" data-testid="approx-note"><b>{quality === "approximate" ? "Approximate location." : "Listing pin."}</b> {note.replace(/^Approximate location\. /, "")} If you know the exact spot, use Report a fix below.</p>}
        <div className="flex items-center justify-between gap-2">
          <div><div className="text-xs text-ink-3">Exact coordinates</div><code className="font-mono text-[13px]" data-testid="coords">{coords}</code></div>
          <button onClick={copy} className="chip">{copied ? "Copied" : "Copy"}</button>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className="chip" href={l.googlePin} target="_blank" rel="noreferrer">Pin in Google Maps</a>
          <a className="chip" href={l.applePin} target="_blank" rel="noreferrer">Pin in Apple Maps</a>
          <a className="chip" href={l.osm} target="_blank" rel="noreferrer">See on OSM</a>
        </div>
      </div>
    </section>
  );
}
