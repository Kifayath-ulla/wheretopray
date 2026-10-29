"use client";
import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Place } from "@/lib/types";

const COLORS: Record<string, string> = { mosque: "#047857", dargah: "#b45309", idgah: "#1d4ed8", musalla: "#7c3aed", prayer_room: "#be123c" };

export default function PlaceMap({ places, center, zoom = 11, me }: { places: Place[]; center: [number, number]; zoom?: number; me?: [number, number] | null }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);

  useEffect(() => {
    if (!el.current) return;
    map.current = new maplibregl.Map({
      container: el.current,
      style: {
        version: 8,
        sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: "© OpenStreetMap contributors" } },
        layers: [{ id: "osm", type: "raster", source: "osm" }],
      },
      center,
      zoom,
    });
    map.current.addControl(new maplibregl.NavigationControl(), "top-right");
    return () => map.current?.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    markers.current.forEach((x) => x.remove());
    markers.current = places.slice(0, 1500).map((p) => {
      const dot = document.createElement("div");
      dot.style.cssText = `width:12px;height:12px;border-radius:50%;border:2px solid #fff;background:${COLORS[p.type]};box-shadow:0 0 2px #0006;cursor:pointer`;
      const popup = new maplibregl.Popup({ offset: 8 }).setHTML(
        `<a href="/place/${encodeURIComponent(p.slug)}" style="font-weight:600;color:#047857">${p.name.replace(/</g, "&lt;")}</a><br/><small>${p.type.replace("_", " ")}${p.area ? " - " + p.area.replace(/</g, "&lt;") : ""}</small>`,
      );
      return new maplibregl.Marker({ element: dot }).setLngLat([p.lng, p.lat]).setPopup(popup).addTo(m);
    });
    if (me) {
      const d = document.createElement("div");
      d.style.cssText = "width:16px;height:16px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 6px #2563eb";
      markers.current.push(new maplibregl.Marker({ element: d }).setLngLat([me[1], me[0]]).addTo(m));
      m.flyTo({ center: [me[1], me[0]], zoom: 14 });
    }
  }, [places, me]);

  return <div ref={el} className="h-full w-full" />;
}
