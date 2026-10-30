import type { PlaceType } from "./types";
/** One calm color per place type, used for map pins, chips and dots. */
export const TYPE_COLOR: Record<PlaceType, string> = {
  mosque: "#0b7a72",
  dargah: "#a0671c",
  idgah: "#3b6a9a",
  musalla: "#5f6670",
  prayer_room: "#8c5577",
};
export const TYPE_LABEL: Record<PlaceType, string> = {
  mosque: "Mosque", dargah: "Dargah", idgah: "Idgah", musalla: "Musalla", prayer_room: "Prayer room",
};
export const fmtDistance = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);
