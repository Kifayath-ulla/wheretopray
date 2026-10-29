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
    <div className="rounded-xl border p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">Prayer times today</h2>
        <select value={school} onChange={(e) => setSchool(+e.target.value)} className="rounded border px-2 py-1 text-xs" aria-label="Asr method">
          <option value={1}>Hanafi Asr</option><option value={0}>Shafi&apos;i Asr</option>
        </select>
      </div>
      {err ? <p className="text-sm text-red-600">Could not load prayer times.</p> : !t ? <p className="text-sm text-gray-500">Loading...</p> : (
        <dl className="grid grid-cols-3 gap-2 text-center">
          {NAMES.map((n) => <div key={n} className="rounded-lg bg-emerald-50 p-2"><dt className="text-xs text-gray-600">{n}</dt><dd className="font-semibold">{t[n]}</dd></div>)}
        </dl>
      )}
      <p className="mt-2 text-xs text-gray-500">Calculated start times from Aladhan (Karachi method). Iqama times at this place may differ.</p>
    </div>
  );
}
