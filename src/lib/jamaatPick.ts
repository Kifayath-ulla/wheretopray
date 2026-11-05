import type { Place } from "@/lib/types";

/** Parse "13:30", "1:30", "1:30 PM" into minutes since local midnight. Returns null if unusable. */
export function parseClock(raw?: string | null): number | null {
  if (!raw) return null;
  const s = raw.trim();
  let m = s.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])?$/);
  if (!m) m = s.match(/^(\d{1,2})\s*([AaPp][Mm])$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] && /^\d{2}$/.test(m[2]) ? Number(m[2]) : 0;
  const ap = (m[3] || m[2] || "").toLowerCase();
  if (ap === "pm" || ap === "p.m.") { if (h < 12) h += 12; }
  else if (ap === "am" || ap === "a.m.") { if (h === 12) h = 0; }
  else if (!m[3] && h >= 0 && h <= 23) { /* 24h */ }
  else if (h > 23) return null;
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function fmtClock(mins: number): string {
  const h24 = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const ap = h24 >= 12 ? "pm" : "am";
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ap}`;
}

export type JamaatSlot = { key: string; label: string; mins: number; kind: "jumuah" | "jamaat" };

/** Real community times only. Never invents calculated prayer times. */
export function slotsFor(p: Place, friday: boolean): JamaatSlot[] {
  const out: JamaatSlot[] = [];
  const iq = p.iqama_times ?? {};
  const add = (key: string, label: string, raw: string | null | undefined, kind: JamaatSlot["kind"]) => {
    const mins = parseClock(raw);
    if (mins == null) return;
    out.push({ key, label, mins, kind });
  };
  if (friday) add("jumuah", "Jumu'ah", p.jumuah_time ?? iq.jumuah ?? null, "jumuah");
  add("fajr", "Fajr jamaat", iq.fajr ?? iq.Fajr, "jamaat");
  add("dhuhr", "Zuhr jamaat", iq.dhuhr ?? iq.zuhr ?? iq.Zuhr, "jamaat");
  add("asr", "Asr jamaat", iq.asr ?? iq.Asr, "jamaat");
  add("maghrib", "Maghrib jamaat", iq.maghrib ?? iq.Maghrib, "jamaat");
  add("isha", "Isha jamaat", iq.isha ?? iq.Isha, "jamaat");
  if (!friday) add("jumuah", "Jumu'ah", p.jumuah_time ?? iq.jumuah ?? null, "jumuah");
  return out;
}

export type Pick = {
  place: Place & { _d: number };
  slot: JamaatSlot;
  walkMin: number;
  driveMin: number;
  leftMin: number;
  reachableWalk: boolean;
  reachableDrive: boolean;
};

const WALK_KMH = 5;
const DRIVE_KMH = 22;

/** Rank places you can still reach before the next community jamaat. Uses only stored times. */
export function pickNextJamaat(
  places: (Place & { _d?: number })[],
  now: Date,
): { pick: Pick | null; friday: boolean; withTimes: number } {
  const parts = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const friday = get("weekday").toLowerCase().startsWith("fri");
  const nowMin = Number(get("hour")) * 60 + Number(get("minute"));
  let withTimes = 0;
  const candidates: Pick[] = [];
  for (const p of places) {
    if (p._d == null) continue;
    const slots = slotsFor(p, friday);
    if (!slots.length) continue;
    withTimes++;
    // Prefer upcoming today; if Friday, prefer Jumu'ah when still upcoming.
    const upcoming = slots
      .filter((s) => s.mins >= nowMin - 5)
      .sort((a, b) => {
        if (friday && a.kind === "jumuah" && b.kind !== "jumuah" && a.mins >= nowMin) return -1;
        if (friday && b.kind === "jumuah" && a.kind !== "jumuah" && b.mins >= nowMin) return 1;
        return a.mins - b.mins;
      });
    const slot = upcoming[0];
    if (!slot) continue;
    const leftMin = slot.mins - nowMin;
    if (leftMin < 0) continue;
    const walkMin = Math.round((p._d / WALK_KMH) * 60);
    const driveMin = Math.max(3, Math.round((p._d / DRIVE_KMH) * 60));
    candidates.push({
      place: p as Place & { _d: number },
      slot,
      walkMin,
      driveMin,
      leftMin,
      reachableWalk: walkMin <= leftMin,
      reachableDrive: driveMin <= leftMin,
    });
  }
  candidates.sort((a, b) => {
    // Prefer walk-reachable, then drive-reachable, then nearest. Sooner slot is only a tiebreaker.
    const rank = (c: Pick) => (c.reachableWalk ? 0 : c.reachableDrive ? 1 : 2);
    const ar = rank(a), br = rank(b);
    if (ar !== br) return ar - br;
    if (a.place._d !== b.place._d) return a.place._d - b.place._d;
    return a.slot.mins - b.slot.mins;
  });
  const reachable = candidates.find((c) => c.reachableWalk || c.reachableDrive) ?? null;
  return { pick: reachable, friday, withTimes };
}
