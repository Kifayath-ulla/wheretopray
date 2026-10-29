export const KAABA = { lat: 21.4225, lng: 39.8262 };
const r = Math.PI / 180;
/** Initial great-circle bearing (degrees from true north) from a point to the Kaaba. */
export function qiblaBearing(lat: number, lng: number) {
  const f1 = lat * r, f2 = KAABA.lat * r, dl = (KAABA.lng - lng) * r;
  const y = Math.sin(dl) * Math.cos(f2);
  const x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
  return (Math.atan2(y, x) / r + 360) % 360;
}
export function compassPoint(deg: number) {
  return ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"][Math.round(deg / 22.5) % 16];
}
