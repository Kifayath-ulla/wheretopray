"use client";
import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Place } from "@/lib/types";

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
    const m = new maplibregl.Map({
      container: el.current,
      style: {
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap contributors" } },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center, zoom,
    });
    map.current = m;
    m.addControl(new maplibregl.NavigationControl(), "top-right");
    m.on("load", () => {
      m.addSource("places", { type: "geojson", data: toGeo(latest.current), cluster: true, clusterRadius: 45, clusterMaxZoom: 14 });
      m.addLayer({ id: "clusters", type: "circle", source: "places", filter: ["has", "point_count"],
        paint: { "circle-color": ["step", ["get", "point_count"], "#10b981", 50, "#047857", 500, "#064e3b"], "circle-radius": ["step", ["get", "point_count"], 14, 50, 19, 500, 25], "circle-stroke-width": 2, "circle-stroke-color": "#fff" } });
      m.addLayer({ id: "cluster-count", type: "symbol", source: "places", filter: ["has", "point_count"],
        layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Open Sans Semibold"], "text-size": 12 }, paint: { "text-color": "#fff" } });
      m.addLayer({ id: "point", type: "circle", source: "places", filter: ["!", ["has", "point_count"]],
        paint: { "circle-radius": 6, "circle-stroke-width": 2, "circle-stroke-color": "#fff",
          "circle-color": ["match", ["get", "type"], "dargah", "#b45309", "idgah", "#1d4ed8", "musalla", "#7c3aed", "prayer_room", "#be123c", "#047857"] } });
      m.on("click", "clusters", async (e) => {
        const f = e.features?.[0]; if (!f) return;
        const src = m.getSource("places") as maplibregl.GeoJSONSource;
        const z = await src.getClusterExpansionZoom(f.properties.cluster_id as number);
        m.easeTo({ center: (f.geometry as GeoJSON.Point).coordinates as [number, number], zoom: z });
      });
      m.on("click", "point", (e) => {
        const f = e.features?.[0]; if (!f) return;
        const p = f.properties as { slug: string; name: string; type: string; area: string };
        new maplibregl.Popup({ offset: 8 }).setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number])
          .setHTML(`<a href="/place/${encodeURIComponent(p.slug)}" style="font-weight:600;color:#047857">${esc(p.name)}</a><br/><small>${esc(p.type.replace("_", " "))}${p.area ? " - " + esc(p.area) : ""}</small>`).addTo(m);
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
    d.style.cssText = "width:16px;height:16px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 6px #2563eb";
    d.title = "You are here";
    meMarker.current = new maplibregl.Marker({ element: d }).setLngLat([me[1], me[0]]).addTo(m);
    const km = radiusKm ?? 2, dLat = km / 111, dLng = km / (111 * Math.cos((me[0] * Math.PI) / 180));
    m.fitBounds([[me[1] - dLng, me[0] - dLat], [me[1] + dLng, me[0] + dLat]], { padding: 30, duration: 800 });
  }, [me, radiusKm]);

  return <div ref={el} className="h-full w-full" />;
}
