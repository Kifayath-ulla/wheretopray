import { parseClock, slotsFor, pickNextJamaat, fmtClock } from "../src/lib/jamaatPick.ts";
const assert = (c: unknown, m: string) => { if (!c) throw new Error(m); };
assert(parseClock("13:30") === 13 * 60 + 30, "13:30");
assert(parseClock("1:30 PM") === 13 * 60 + 30, "1:30 PM");
assert(fmtClock(13 * 60 + 30) === "1:30 pm", "fmt");
const fri = new Date("2026-11-06T07:00:00+05:30");
const places = [
  { id: "1", slug: "a", name: "Near", type: "mosque" as const, lat: 12.97, lng: 77.59, city: "Bengaluru", last_verified: "2026-01-01", jumuah_time: "13:15", iqama_times: { fajr: "5:30" }, _d: 0.8 },
  { id: "2", slug: "b", name: "Far", type: "mosque" as const, lat: 12.97, lng: 77.59, city: "Bengaluru", last_verified: "2026-01-01", jumuah_time: "12:30", _d: 8 },
];
const r = pickNextJamaat(places, fri);
assert(r.friday, "friday");
assert(r.pick?.place.name === "Near", "pick near: " + r.pick?.place.name);
assert(r.pick?.slot.kind === "jumuah", "jumuah");
console.log("jamaatPick ok", r.pick?.slot.label, fmtClock(r.pick!.slot.mins), "left", r.pick?.leftMin);
