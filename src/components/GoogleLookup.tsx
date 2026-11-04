"use client";
import { useEffect, useRef, useState } from "react";

type G = { place_id: string; name: string; address: string; url?: string };
const NEAR_ME = /\bnear\s*me\b|\bnearby\b/i;

/**
 * "From Google Maps": live results only, never saved or mixed into our list.
 * Runs only when the visitor taps "Search Google too" or types a "near me" style query.
 */
export default function GoogleLookup({ bbox, q }: { bbox: [number, number, number, number] | null; q: string }) {
  const [state, setState] = useState<"loading" | "off" | "on" | "paused">("loading");
  const [res, setRes] = useState<G[] | null>(null);
  const [msg, setMsg] = useState("");
  const lastAuto = useRef("");
  useEffect(() => {
    fetch("/api/google?check=1").then((r) => r.json())
      .then((j) => setState(!j.enabled ? "off" : j.paused ? "paused" : "on")).catch(() => setState("off"));
  }, []);
  async function go() {
    if (state !== "on") return;
    if (!bbox) return setMsg("Move the map first.");
    setMsg("Searching Google Maps..."); setRes(null);
    try {
      const r = await fetch(`/api/google?bbox=${bbox.map((x) => x.toFixed(4)).join(",")}&q=${encodeURIComponent(q)}`);
      const j = await r.json();
      if (j.paused) { setState("paused"); return setMsg(""); }
      if (!r.ok) return setMsg(j.error ?? "Search failed.");
      setRes(j.places); setMsg(j.places.length ? "" : "Google Maps found nothing in this area.");
    } catch { setMsg("Search failed."); }
  }
  // Auto-run once per distinct "near me" query, after typing settles.
  useEffect(() => {
    if (state !== "on" || !NEAR_ME.test(q) || lastAuto.current === q) return;
    const t = setTimeout(() => { lastAuto.current = q; go(); }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, state]);
  if (state === "loading") return null;
  return (
    <section aria-label="From Google Maps" className="border-t p-3 text-sm" data-testid="google-section">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">From Google Maps</h3>
      {state === "off" && <p className="mt-1 text-xs text-gray-500">Google Maps lookup is off. Showing open data only.</p>}
      {state === "paused" && <p className="mt-1 text-xs text-gray-500">Google results paused this month. Showing open data only.</p>}
      {state === "on" && <button onClick={go} className="btn btn-tinted mt-2 w-full">Search Google too (this map area)</button>}
      {msg && <p className="mt-1 text-xs text-gray-600" role="status">{msg}</p>}
      {res && res.length > 0 && (
        <div className="mt-2">
          <ul className="divide-y">
            {res.map((p) => (
              <li key={p.place_id} className="py-2">
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-gray-500">{p.address}</div>
                <div className="mt-1 flex flex-wrap gap-3 text-xs">
                  {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="font-medium text-accent-text hover:underline">Open in Google Maps</a>}
                  <a href={`/submit?gpid=${encodeURIComponent(p.place_id)}`} className="font-medium text-accent-text hover:underline">Missing from wheretopray? Suggest it</a>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-gray-500" translate="no">Results from <span style={{ fontFamily: "Roboto, Arial, sans-serif" }}>Google Maps</span>. Shown live, not stored by wheretopray.</p>
        </div>
      )}
    </section>
  );
}
