import * as maplibregl from "maplibre-gl";

export const MAP_FALLBACK = "The map can't load on this device (it needs WebGL). The list, addresses and directions still work.";

/**
 * MapLibre throws from its constructor when WebGL2 is missing (older phones, WebGL
 * turned off, some privacy modes). Uncaught, that takes down the whole page. Return
 * null instead and leave a short note where the map would be.
 */
export function tryMap(opts: maplibregl.MapOptions, message = MAP_FALLBACK): maplibregl.Map | null {
  try {
    return new maplibregl.Map(opts);
  } catch (err) {
    console.warn("Map unavailable:", err);
    const el = typeof opts.container === "string" ? document.getElementById(opts.container) : opts.container;
    if (el) {
      const note = document.createElement("div");
      note.setAttribute("role", "note");
      note.setAttribute("data-testid", "map-fallback");
      note.style.cssText = "display:flex;align-items:center;justify-content:center;height:100%;min-height:120px;padding:16px;text-align:center;font-size:14px;color:var(--text-2);background:var(--surface-2)";
      note.textContent = message;
      el.replaceChildren(note);
    }
    return null;
  }
}
