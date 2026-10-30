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

export default function PlaceMap({ places, center, zoom = 11, me, meAcc, radiusKm, onMoveEnd }: { places: Place[]; center: [number, number]; zoom?: number; me?: [number, number] | null; meAcc?: number; radiusKm?: number; onMoveEnd?: (b: [number, number, number, number], zoom: number) => void }) {
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
      center, zoom, attributionControl: false,
      // DPR 3 phones render 2.25x more pixels than needed for a map; cap at 2. No label fade animation.
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2), fadeDuration: 0,
    });
    map.current = m;
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    // Credits stay visible above the bottom sheet (top-left), compact "i" style.
    m.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: '<a href="/about">Places: OSM (ODbL), Overture (CDLA), Wikidata, GeoNames (CC BY)</a>' }), "top-left");
    m.on("load", () => {
      // Start the credits collapsed as a small "i" so they never cover the map.
      const collapse = () => m.getContainer().querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
      collapse(); m.once("idle", collapse);
      m.addSource("places", { type: "geojson", data: toGeo(latest.current), cluster: true, clusterRadius: 45, clusterMaxZoom: 14 });
      m.addLayer({ id: "clusters", type: "circle", source: "places", filter: ["has", "point_count"],
        paint: { "circle-color": dark ? "#24272c" : "#ffffff", "circle-radius": ["step", ["get", "point_count"], 16, 50, 20, 500, 25], "circle-stroke-width": 1, "circle-stroke-color": dark ? "#3a3e45" : "#d9dce1" } });
      m.addLayer({ id: "cluster-count", type: "symbol", source: "places", filter: ["has", "point_count"],
        layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Bold"], "text-size": 12.5 }, paint: { "text-color": dark ? "#f2f3f5" : "#1c1f24" } });
      m.addLayer({ id: "point", type: "circle", source: "places", filter: ["!", ["has", "point_count"]],
        paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 5, 16, 8], "circle-stroke-width": 2, "circle-stroke-color": dark ? "#16181b" : "#ffffff",
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
          .setHTML(`<div style="font-size:12px;font-weight:500;color:${TYPE_COLOR[p.type as PlaceType] ?? TYPE_COLOR.mosque}">${esc(TYPE_LABEL[p.type as PlaceType] ?? p.type)}</div><div style="font-size:15px;font-weight:600;margin:2px 0 2px;line-height:1.25">${esc(p.name)}</div>${p.area ? `<div style="font-size:12px;color:var(--text-2)">${esc(p.area)}</div>` : ""}<a href="/place/${encodeURIComponent(p.slug)}" style="display:inline-block;margin-top:8px;padding:6px 12px;border-radius:999px;background:var(--accent);color:var(--on-accent);font-size:13px;font-weight:500">View details</a>`).addTo(m);
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
    const circ = () => { if (!m.isStyleLoaded()) return void m.once("idle", circ); const src = m.getSource("me-acc") as maplibregl.GeoJSONSource | undefined;
      const fc: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: me && meAcc ? [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [Array.from({ length: 65 }, (_, i) => { const a = (i / 64) * 2 * Math.PI; return [me[1] + (meAcc / (111320 * Math.cos((me[0] * Math.PI) / 180))) * Math.sin(a), me[0] + (meAcc / 111320) * Math.cos(a)]; })] } }] : [] };
      if (src) src.setData(fc); else { m.addSource("me-acc", { type: "geojson", data: fc }); m.addLayer({ id: "me-acc", type: "fill", source: "me-acc", paint: { "fill-color": "#0a84ff", "fill-opacity": 0.12, "fill-outline-color": "#0a84ff" } }); } };
    circ();
    if (!me) return;
    const d = document.createElement("div");
    d.style.cssText = "width:18px;height:18px;border-radius:50%;background:#0a84ff;border:3px solid #fff;box-sizing:border-box;box-shadow:0 1px 4px rgba(0,0,0,.25)";
    d.title = "You are here";
    meMarker.current = new maplibregl.Marker({ element: d, anchor: "center" }).setLngLat([me[1], me[0]]).addTo(m);
    const km = radiusKm ?? 2, dLat = km / 111, dLng = km / (111 * Math.cos((me[0] * Math.PI) / 180));
    m.fitBounds([[me[1] - dLng, me[0] - dLat], [me[1] + dLng, me[0] + dLat]], { padding: 30, duration: 800 });
  }, [me, meAcc, radiusKm]);

  return <div ref={el} className="h-full w-full" />;
}
