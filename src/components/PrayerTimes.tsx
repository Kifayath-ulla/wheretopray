"use client";
import { useEffect, useMemo, useState } from "react";
import { CalculationMethod, Coordinates, Madhab, PrayerTimes as Adhan } from "adhan";

// Times are computed on the device with the open-source "adhan" library: no network call, nothing sent anywhere, works offline.
const ROWS = [["fajr", "Fajr"], ["sunrise", "Sunrise"], ["dhuhr", "Zuhr"], ["asr", "Asr"], ["maghrib", "Maghrib"], ["isha", "Isha"]] as const;
const JAMAAT_KEY: Record<string, string> = { fajr: "fajr", dhuhr: "zuhr", asr: "asr", maghrib: "maghrib", isha: "isha" };
const METHODS = { karachi: ["Karachi", () => CalculationMethod.Karachi()], mwl: ["MWL", () => CalculationMethod.MuslimWorldLeague()] } as const;
type M = keyof typeof METHODS; type S = "hanafi" | "shafi";

const fmt = (d: Date) => d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export default function PrayerTimes({ lat, lng, jamaat, jumuah }: { lat: number; lng: number; jamaat?: Record<string, string> | null; jumuah?: string | null }) {
  const [method, setMethod] = useState<M>("karachi");
  const [school, setSchool] = useState<S>("hanafi");
  const [day, setDay] = useState<Date | null>(null);
  useEffect(() => {
    try { const m = localStorage.getItem("wtp-method"); if (m === "karachi" || m === "mwl") setMethod(m); const s = localStorage.getItem("wtp-asr"); if (s === "hanafi" || s === "shafi") setSchool(s); } catch {}
    setDay(new Date());
  }, []);
  const save = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} };
  const t = useMemo(() => {
    if (!day) return null;
    const p = METHODS[method][1](); p.madhab = school === "hanafi" ? Madhab.Hanafi : Madhab.Shafi;
    // adhan works on the calendar date; use today's date in India.
    const [y, mo, d] = day.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).split("-").map(Number);
    return new Adhan(new Coordinates(lat, lng), new Date(y, mo - 1, d), p);
  }, [lat, lng, method, school, day]);
  const jm = jamaat && Object.keys(jamaat).length ? jamaat : null;
  const jumuahT = jm?.jumuah ?? jumuah ?? null;
  return (
    <section className="card p-5" data-testid="prayer-times">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Prayer times today</h2>
        <div className="flex gap-2">
          <div className="segmented" role="group" aria-label="Calculation method">
            {(Object.keys(METHODS) as M[]).map((k) => <button key={k} aria-pressed={method === k} onClick={() => { setMethod(k); save("wtp-method", k); }}>{METHODS[k][0]}</button>)}
          </div>
          <div className="segmented" role="group" aria-label="Asr method">
            <button aria-pressed={school === "hanafi"} onClick={() => { setSchool("hanafi"); save("wtp-asr", "hanafi"); }}>Hanafi</button>
            <button aria-pressed={school === "shafi"} onClick={() => { setSchool("shafi"); save("wtp-asr", "shafi"); }}>Shafi&apos;i</button>
          </div>
        </div>
      </div>
      <dl className="grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
        {ROWS.map(([k, n]) => {
          const j = jm && JAMAAT_KEY[k] ? jm[JAMAAT_KEY[k]] : undefined;
          return (
            <div key={k} className={`rounded-2xl px-2 py-3 ${k === "sunrise" ? "bg-surface-2/60" : "bg-surface-2"}`}>
              <dt className="text-xs font-medium text-ink-3">{n}</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight">{t ? fmt(t[k]) : <span className="inline-block h-5 w-12 animate-pulse rounded bg-hairline" />}</dd>
              {j && <dd className="mt-1 text-[11px] font-semibold text-accent-text" title="Jamaat time from the community">Jamaat {j}</dd>}
            </div>
          );
        })}
      </dl>
      {jumuahT && <p className="mt-3 text-sm"><span className="font-semibold">Jumu&apos;ah jamaat:</span> {jumuahT} <span className="text-xs text-ink-3">(community)</span></p>}
      <p className="mt-3 text-xs text-ink-3">
        <b>Calculated</b> start times for this exact spot ({METHODS[method][0]} method, {school === "hanafi" ? "Hanafi" : "Shafi'i"} Asr), worked out on your device. {jm || jumuahT ? "Jamaat (community) times were sent in by people who pray here; please confirm locally." : "Jamaat times for this place aren't known yet. If you pray here, add them with Report a fix."}
      </p>
    </section>
  );
}
