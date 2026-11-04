// Every external map link uses the stored coordinates, never a name or city search.
export type LL = { lat: number; lng: number; name: string; google_place_id?: string | null };
const c = (p: LL) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
export function mapLinks(p: LL) {
  const n = encodeURIComponent(p.name);
  return {
    googleDir: `https://www.google.com/maps/dir/?api=1&destination=${c(p)}${p.google_place_id ? `&destination_place_id=${encodeURIComponent(p.google_place_id)}` : ""}`,
    // Drops a pin exactly on the coordinates (a name query could jump to a different, nearby listing).
    googlePin: `https://www.google.com/maps/search/?api=1&query=${c(p)}`,
    appleDir: `https://maps.apple.com/?daddr=${c(p)}&q=${n}`,
    applePin: `https://maps.apple.com/?ll=${c(p)}&q=${n}`,
    osm: `https://www.openstreetmap.org/?mlat=${p.lat.toFixed(6)}&mlon=${p.lng.toFixed(6)}#map=19/${p.lat.toFixed(6)}/${p.lng.toFixed(6)}`,
    osmDir: `https://www.openstreetmap.org/directions?to=${p.lat.toFixed(6)}%2C${p.lng.toFixed(6)}`,
  };
}
export const QUALITY_NOTE: Record<string, string> = {
  listing: "May be a few doors off. Pin comes from a business listing, not a mapped building. It is usually right but can be a few doors off.",
  approximate: "Approximate location. The source only gave a rough point, so the building may be up to a few hundred metres away.",
};
export const SHORT_NOTE: Record<string, string> = { listing: "may be a few doors off", approximate: "approx. location" };
