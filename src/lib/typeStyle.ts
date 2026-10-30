import type { PlaceType } from "./types";
/** One calm color per place type, used for map pins, chips and dots. */
export const TYPE_COLOR: Record<PlaceType, string> = {
  mosque: "#0f7a55",
  dargah: "#9a6410",
  idgah: "#1f6f8b",
  musalla: "#7a4a7f",
  prayer_room: "#a8435a",
};
export const TYPE_LABEL: Record<PlaceType, string> = {
  mosque: "Mosque", dargah: "Dargah", idgah: "Idgah", musalla: "Musalla", prayer_room: "Prayer room",
};
export const fmtDistance = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);
