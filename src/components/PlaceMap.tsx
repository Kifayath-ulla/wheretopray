"use client";
import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// maplibre v6 ships its worker as a separate module; we copy it to /public at build time.
if (typeof window !== "undefined") maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");
import type { Place, PlaceType } from "@/lib/types";
import { TYPE_COLOR, TYPE_LABEL } from "@/lib/typeStyle";

const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);

function toGeo(places: Place[]): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: places.map((p) => ({ type: "Feature", geometry: { type: "Point", coordinates: [p.lng, p.lat] }, properties: { slug: p.slug, name: p.name, type: p.type, area: p.area ?? p.city ?? "" } })) };
}

export default function PlaceMap({ places, center, zoom = 11, me, radiusKm, onMoveEnd }: { places: Place[]; center: [number, number]; zoom?: number; me?: [number, number] | null; radiusKm?: number; onMoveEnd?: (b: [number, number, number, number], zoom: number) => void }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const ready = useRef(false);
  const latest = useRef(places);
  const meMarker = useRef<maplibregl.Marker | null>(null);
  const moveCb = useRef(onMoveEnd);
  moveCb.current = onMoveEnd;
  latest.current = places;

  useEffect(() => {
    if (!el.current) return;
    const dark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const m = new maplibregl.Map({
      container: el.current,
      // OpenFreeMap: free vector tiles, no key, no limits. Attribution comes with the style.
      style: `https://tiles.openfreemap.org/styles/${dark ? "dark" : "positron"}`,
      center, zoom, attributionControl: { compact: true },
    });
    map.current = m;
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    m.on("load", () => {
      m.addSource("places", { type: "geojson", data: toGeo(latest.current), cluster: true, clusterRadius: 45, clusterMaxZoom: 14 });
      m.addLayer({ id: "clusters", type: "circle", source: "places", filter: ["has", "point_count"],
        paint: { "circle-color": "#0b6e4f", "circle-opacity": 0.92, "circle-radius": ["step", ["get", "point_count"], 15, 50, 20, 500, 26], "circle-stroke-width": 5, "circle-stroke-color": "rgba(11,110,79,0.22)" } });
      m.addLayer({ id: "cluster-count", type: "symbol", source: "places", filter: ["has", "point_count"],
        layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Bold"], "text-size": 12.5 }, paint: { "text-color": "#fff" } });
      m.addLayer({ id: "point", type: "circle", source: "places", filter: ["!", ["has", "point_count"]],
        paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 5, 16, 8], "circle-stroke-width": 2.5, "circle-stroke-color": "#fff",
          "circle-color": ["match", ["get", "type"], "dargah", TYPE_COLOR.dargah, "idgah", TYPE_COLOR.idgah, "musalla", TYPE_COLOR.musalla, "prayer_room", TYPE_COLOR.prayer_room, TYPE_COLOR.mosque] } });
      m.on("click", "clusters", async (e) => {
        const f = e.features?.[0]; if (!f) return;
        const src = m.getSource("places") as maplibregl.GeoJSONSource;
        const z = await src.getClusterExpansionZoom(f.properties.cluster_id as number);
        m.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom: z });
      });
      m.on("click", "point", (e) => {
        const f = e.features?.[0]; if (!f) return;
        const p = f.properties as { slug: string; name: string; type: string; area: string };
        new maplibregl.Popup({ offset: 12, maxWidth: "260px" }).setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number])
          .setHTML(`<div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.03em;color:${TYPE_COLOR[p.type as PlaceType] ?? TYPE_COLOR.mosque}">${esc(TYPE_LABEL[p.type as PlaceType] ?? p.type)}</div><div style="font-size:15px;font-weight:600;margin:2px 0 2px;line-height:1.25">${esc(p.name)}</div>${p.area ? `<div style="font-size:12px;color:var(--text-2)">${esc(p.area)}</div>` : ""}<a href="/place/${encodeURIComponent(p.slug)}" style="display:inline-block;margin-top:8px;padding:6px 12px;border-radius:999px;background:var(--accent);color:#fff;font-size:12px;font-weight:600">View details</a>`).addTo(m);
      });
      for (const l of ["clusters", "point"]) {
        m.on("mouseenter", l, () => { m.getCanvas().style.cursor = "pointer"; });
        m.on("mouseleave", l, () => { m.getCanvas().style.cursor = ""; });
      }
      ready.current = true;
      const emit = () => { const b = m.getBounds(); moveCb.current?.([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], m.getZoom()); };
      m.on("moveend", emit); emit();
    });
    return () => { ready.current = false; m.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = map.current;
    if (m && ready.current) (m.getSource("places") as maplibregl.GeoJSONSource | undefined)?.setData(toGeo(places));
  }, [places]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    meMarker.current?.remove(); meMarker.current = null;
    if (!me) return;
    const d = document.createElement("div");
    d.style.cssText = "width:16px;height:16px;border-radius:50%;background:#0a84ff;border:3px solid #fff;box-shadow:0 0 0 8px rgba(10,132,255,.2),0 2px 6px rgba(0,0,0,.3)";
    d.title = "You are here";
    meMarker.current = new maplibregl.Marker({ element: d }).setLngLat([me[1], me[0]]).addTo(m);
    const km = radiusKm ?? 2, dLat = km / 111, dLng = km / (111 * Math.cos((me[0] * Math.PI) / 180));
    m.fitBounds([[me[1] - dLng, me[0] - dLat], [me[1] + dLng, me[0] + dLat]], { padding: 30, duration: 800 });
  }, [me, radiusKm]);

  return <div ref={el} className="h-full w-full" />;
}
