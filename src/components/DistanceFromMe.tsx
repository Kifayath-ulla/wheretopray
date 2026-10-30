"use client";
import { useEffect, useState } from "react";
import { distanceKm } from "@/lib/geo";
import { fmtDistance } from "@/lib/typeStyle";

/** Shows distance from the last location the visitor set on Explore or Qibla (kept in sessionStorage). */
export default function DistanceFromMe({ lat, lng }: { lat: number; lng: number }) {
  const [d, setD] = useState<number | null>(null);
  useEffect(() => {
    try { const s = sessionStorage.getItem("wtp-loc"); if (s) { const l = JSON.parse(s); setD(distanceKm(l.lat, l.lng, lat, lng)); } } catch {}
  }, [lat, lng]);
  if (d == null) return null;
  return <span className="text-ink-3" data-testid="distance">· {fmtDistance(d)} away</span>;
}
