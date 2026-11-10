"use client";
import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import { tryMap } from "@/lib/safeMap";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "@/lib/theme";

// maplibre v6 ships its worker as a separate module; we copy it to /public at build time.
if (typeof window !== "undefined") maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");
import type { Place } from "@/lib/types";
import { TYPE_COLOR, TYPE_LABEL, fmtDistance } from "@/lib/typeStyle";
import { distanceKm } from "@/lib/geo";

const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);

function toGeo(places: Place[]): GeoJSON.FeatureCollection {
  return { type: "FeatureCollection", features: places.map((p) => ({ type: "Feature", geometry: { type: "Point", coordinates: [p.lng, p.lat] }, properties: { slug: p.slug, name: p.name, type: p.type, area: p.area ?? p.city ?? "" } })) };
}

export default function PlaceMap({ places, center, zoom = 11, me, meAcc, radiusKm, onMoveEnd, selected, onSelect }: { places: Place[]; center: [number, number]; zoom?: number; me?: [number, number] | null; meAcc?: number; radiusKm?: number; onMoveEnd?: (b: [number, number, number, number], zoom: number) => void; selected?: Place | null; onSelect?: (slug: string) => void }) {
  const theme = useTheme();
  const themeRef = useRef(theme);
  const selCb = useRef(onSelect);
  selCb.current = onSelect;
  const popup = useRef<maplibregl.Popup | null>(null);
  const meLat = me?.[0], meLng = me?.[1];
  const meLatR = useRef(meLat), meLngR = useRef(meLng);
  meLatR.current = meLat; meLngR.current = meLng;
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
    const dark = themeRef.current === "dark";
    const m = tryMap({
      container: el.current,
      // OpenFreeMap: free vector tiles, no key, no limits. Attribution comes with the style.
      style: `https://tiles.openfreemap.org/styles/${dark ? "dark" : "positron"}`,
      center, zoom, attributionControl: false,
      // DPR 3 phones render 2.25x more pixels than needed for a map; cap at 2. No label fade animation.
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2), fadeDuration: 0,
    });
    if (!m) return;
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
        selCb.current?.((f.properties as { slug: string }).slug);
      });
      // Highlight ring for the selected place, drawn from an unclustered source so it never hides inside a cluster.
      m.addSource("sel", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      // Soft accuracy halo only when the pin is not exact.
      m.addLayer({ id: "sel-halo", type: "circle", source: "sel", filter: ["!=", ["get", "q"], "exact"], paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 14, 10, 18, ["case", ["==", ["get", "q"], "approximate"], 60, 26]], "circle-color": ["get", "color"], "circle-opacity": 0.12, "circle-stroke-width": 1, "circle-stroke-color": ["get", "color"], "circle-stroke-opacity": 0.35 } });
      m.addLayer({ id: "sel-dot", type: "circle", source: "sel", paint: { "circle-radius": 7, "circle-color": ["get", "color"], "circle-stroke-width": 2, "circle-stroke-color": "#ffffff" } });
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
    d.style.cssText = "width:16px;height:16px;border-radius:50%;background:#0a84ff;border:3px solid #fff;box-sizing:border-box;box-shadow:0 2px 6px rgba(0,0,0,.3)";
    d.title = "You are here";
    meMarker.current = new maplibregl.Marker({ element: d, anchor: "center" }).setLngLat([me[1], me[0]]).addTo(m);
    const km = radiusKm ?? 2, dLat = km / 111, dLng = km / (111 * Math.cos((me[0] * Math.PI) / 180));
    m.fitBounds([[me[1] - dLng, me[0] - dLat], [me[1] + dLng, me[0] + dLat]], { padding: 30, duration: 800 });
    // Depend on the numbers, not the array: a new [lat,lng] array every render used to re-fit the map to the
    // user's location on every re-render, pulling the view away from the place they had just picked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meLat, meLng, meAcc, radiusKm]);

  // Swap the basemap when the theme changes, keeping our own sources and layers (and the view).
  useEffect(() => {
    const m = map.current; if (!m || themeRef.current === theme) return;
    themeRef.current = theme;
    const url = `https://tiles.openfreemap.org/styles/${theme === "dark" ? "dark" : "positron"}`;
    m.setStyle(url, { transformStyle: (prev, next) => {
      if (!prev) return next;
      const base = new Set(Object.keys(next.sources));
      const sources = { ...next.sources };
      for (const [k, v] of Object.entries(prev.sources)) if (!base.has(k) && !(k in sources)) sources[k] = v;
      const own = prev.layers.filter((l) => "source" in l && typeof l.source === "string" && !base.has(l.source) && l.source in sources);
      return { ...next, sources, layers: [...next.layers, ...own] };
    } });
  }, [theme]);

  useEffect(() => {
    const m = map.current; if (!m) return;
    popup.current?.remove(); popup.current = null;
    const apply = () => {
      if (!m.getSource("sel")) return void m.once("idle", apply);
      const p = selected;
      (m.getSource("sel") as maplibregl.GeoJSONSource).setData({ type: "FeatureCollection", features: p ? [{ type: "Feature", geometry: { type: "Point", coordinates: [p.lng, p.lat] }, properties: { color: TYPE_COLOR[p.type] ?? TYPE_COLOR.mosque, q: p.location_quality ?? "exact" } }] : [] });
      if (!p) return;
      m.flyTo({ center: [p.lng, p.lat], zoom: Math.max(m.getZoom(), 17), duration: 700, essential: true });
      const sub = [p.area, p.city].filter(Boolean).join(", ");
      const dist = meLatR.current != null && meLngR.current != null ? fmtDistance(distanceKm(meLatR.current, meLngR.current, p.lat, p.lng)) : "";
      const subLine = [sub, dist && `${dist} away`].filter(Boolean).join(" · ");
      popup.current = new maplibregl.Popup({ offset: 12, maxWidth: "280px", closeOnClick: false, className: "wtp-pop" }).setLngLat([p.lng, p.lat])
        .setHTML(`<div data-testid="map-popup" data-slug="${esc(p.slug)}"><div class="wtp-pop-type"><i style="background:${TYPE_COLOR[p.type] ?? TYPE_COLOR.mosque}"></i>${esc(TYPE_LABEL[p.type] ?? p.type)}</div><div class="wtp-pop-name">${esc(p.name)}</div>${subLine ? `<div class="wtp-pop-sub">${esc(subLine)}</div>` : ""}${p.location_quality === "approximate" ? `<div class="wtp-pop-warn">Approximate location</div>` : ""}<a class="wtp-pop-btn" href="/place/${encodeURIComponent(p.slug)}">View details ›</a></div>`).addTo(m);
    };
    apply();
  }, [selected]);

  return <div ref={el} className="h-full w-full" />;
}
