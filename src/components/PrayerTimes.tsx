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
    <section>
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <h2 className="text-[.95rem] font-semibold tracking-[-0.01em]">Prayer times today</h2>
        <div className="segmented" role="group" aria-label="Asr method">
          <button aria-pressed={school === 1} onClick={() => setSchool(1)}>Hanafi</button>
          <button aria-pressed={school === 0} onClick={() => setSchool(0)}>Shafi&apos;i</button>
        </div>
      </div>
      {err ? <p className="card p-5 text-sm text-red-600">Could not load prayer times. Check your connection and reload.</p> : (
        <dl className="card grid grid-cols-3 overflow-hidden text-center sm:grid-cols-6">
          {NAMES.map((n, i) => (
            <div key={n} className={`px-2 py-4 ${i % 3 ? "border-l border-hairline" : ""} ${i >= 3 ? "border-t border-hairline sm:border-t-0" : ""} ${i === 3 ? "sm:border-l" : ""}`}>
              <dt className={`text-[12px] font-medium ${n === "Sunrise" ? "text-ink-3" : "text-ink-2"}`}>{n}</dt>
              <dd className={`mt-1 font-mono text-[17px] font-medium tabular-nums ${n === "Sunrise" ? "text-ink-3" : ""}`}>{t ? t[n] : <span className="inline-block h-5 w-12 rounded bg-surface-2" />}</dd>
            </div>
          ))}
        </dl>
      )}
      <p className="mt-2 px-1 text-[12px] text-ink-3">Calculated start times (Karachi method). Iqama times here may differ.</p>
    </section>
  );
}
