"use client";
import { useEffect, useState } from "react";

const NAMES = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;

export default function PrayerTimes({ lat, lng }: { lat: number; lng: number }) {
  const [t, setT] = useState<Record<string, string> | null>(null);
  const [school, setSchool] = useState(1); // 1 = Hanafi (common in India), 0 = Shafi'i
  const [err, setErr] = useState(false);
  useEffect(() => {
    setT(null);
    // method 1 = University of Islamic Sciences, Karachi (standard for India)
    fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=1&school=${school}`)
      .then((r) => r.json()).then((j) => setT(j.data.timings)).catch(() => setErr(true));
  }, [lat, lng, school]);
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Prayer times today</h2>
        <div className="segmented" role="group" aria-label="Asr method">
          <button aria-pressed={school === 1} onClick={() => setSchool(1)}>Hanafi</button>
          <button aria-pressed={school === 0} onClick={() => setSchool(0)}>Shafi&apos;i</button>
        </div>
      </div>
      {err ? <p className="text-sm text-red-600">Could not load prayer times.</p> : (
        <dl className="grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
          {NAMES.map((n) => (
            <div key={n} className={`rounded-2xl px-2 py-3 ${n === "Sunrise" ? "bg-surface-2/60" : "bg-surface-2"}`}>
              <dt className="text-xs font-medium text-ink-3">{n}</dt>
              <dd className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight">{t ? t[n] : <span className="inline-block h-5 w-12 animate-pulse rounded bg-hairline" />}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="mt-3 text-xs text-ink-3">Calculated start times (Karachi method). Iqama times at this place may differ.</p>
    </section>
  );
}
