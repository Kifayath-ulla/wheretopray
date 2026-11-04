"use client";
import { useEffect, useState } from "react";
import { getMode, setMode, type ThemeMode } from "@/lib/theme";

const OPTS: { v: ThemeMode; label: string; icon: string }[] = [
  { v: "light", label: "Light", icon: "M12 4V2m0 20v-2m8-8h2M2 12h2m13.66-5.66 1.41-1.41M4.93 19.07l1.41-1.41m0-11.32L4.93 4.93m14.14 14.14-1.41-1.41M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z" },
  { v: "system", label: "System", icon: "M4 5h16v11H4zM9 20h6m-3-4v4" },
  { v: "dark", label: "Dark", icon: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" },
];

/** Three-way appearance switch: light, system (default), dark. */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [mode, setM] = useState<ThemeMode>("system");
  useEffect(() => setM(getMode()), []);
  return (
    <div role="radiogroup" aria-label="Appearance" className={`segmented ${className}`}>
      {OPTS.map((o) => (
        <button key={o.v} type="button" role="radio" aria-checked={mode === o.v} title={o.label} aria-label={o.label}
          onClick={() => { setMode(o.v); setM(o.v); }} className="inline-flex h-8 min-w-9 items-center justify-center !px-2">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={o.icon} /></svg>
        </button>
      ))}
    </div>
  );
}
