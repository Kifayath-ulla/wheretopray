import type { PlaceType } from "./types";
/** One calm color per place type, used for map pins, chips and dots. */
export const TYPE_COLOR: Record<PlaceType, string> = {
  mosque: "#0b6e4f",
  dargah: "#b7791f",
  idgah: "#2563eb",
  musalla: "#7c3aed",
  prayer_room: "#db2777",
};
export const TYPE_LABEL: Record<PlaceType, string> = {
  mosque: "Mosque", dargah: "Dargah", idgah: "Idgah", musalla: "Musalla", prayer_room: "Prayer room",
};
export const fmtDistance = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);
