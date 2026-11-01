"use client";
import { useEffect, useRef } from "react";
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// maplibre v6 ships its worker as a separate module; we copy it to /public at build time.
if (typeof window !== "undefined") maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");

export default function GapMap({ wards }: { wards: GeoJSON.FeatureCollection | { features: unknown[] } }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!el.current) return;
    const m = new maplibregl.Map({
      container: el.current,
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [77.59, 12.97], zoom: 10.3,
    });
    m.addControl(new maplibregl.NavigationControl(), "top-right");
    m.on("load", () => {
      m.addSource("wards", { type: "geojson", data: wards as GeoJSON.FeatureCollection });
      m.addLayer({ id: "fill", type: "fill", source: "wards", paint: { "fill-opacity": 0.6, "fill-color": ["step", ["get", "count"], "#fee2e2", 1, "#fef3c7", 3, "#bbf7d0", 6, "#4ade80", 11, "#15803d"] } });
      m.addLayer({ id: "line", type: "line", source: "wards", paint: { "line-color": "#374151", "line-width": 0.5 } });
      m.on("click", "fill", (e) => {
        const p = e.features?.[0]?.properties as { no: string; name: string; count: number } | undefined;
        if (p) new maplibregl.Popup().setLngLat(e.lngLat).setHTML(`<b>${esc(String(p.no))}. ${esc(String(p.name))}</b><br>${Number(p.count) || 0} places listed<br><a href="/add" style="color:#047857;text-decoration:underline">Add one here</a>`).addTo(m);
      });
      m.on("mouseenter", "fill", () => { m.getCanvas().style.cursor = "pointer"; });
      m.on("mouseleave", "fill", () => { m.getCanvas().style.cursor = ""; });
    });
    return () => m.remove();
  }, [wards]);
  return (
    <div>
      <div ref={el} className="h-[60vh] w-full rounded-xl border" />
      <div className="mt-2 flex flex-wrap gap-3 text-xs">
        {[["#fee2e2", "0"], ["#fef3c7", "1-2"], ["#bbf7d0", "3-5"], ["#4ade80", "6-10"], ["#15803d", "11+"]].map(([c, l]) => (
          <span key={l} className="flex items-center gap-1"><span className="inline-block h-3 w-4 rounded" style={{ background: c }} />{l}</span>
        ))}
      </div>
    </div>
  );
}
