"use client";
import { useEffect, useState } from "react";

type G = { place_id: string; name: string; address: string; url?: string };

/** "Search more on Google": live results only, never saved. Hidden unless the server has a key. */
export default function GoogleLookup({ bbox, q }: { bbox: [number, number, number, number] | null; q: string }) {
  const [enabled, setEnabled] = useState(false);
  const [res, setRes] = useState<G[] | null>(null);
  const [msg, setMsg] = useState("");
  useEffect(() => { fetch("/api/google?check=1").then((r) => r.json()).then((j) => setEnabled(!!j.enabled)).catch(() => {}); }, []);
  if (!enabled) return null;
  async function go() {
    if (!bbox) return setMsg("Move the map first.");
    setMsg("Searching Google..."); setRes(null);
    try {
      const r = await fetch(`/api/google?bbox=${bbox.map((x) => x.toFixed(4)).join(",")}&q=${encodeURIComponent(q)}`);
      const j = await r.json();
      if (!r.ok) return setMsg(j.error ?? "Search failed.");
      setRes(j.places); setMsg(j.places.length ? "" : "Google found nothing here.");
    } catch { setMsg("Search failed."); }
  }
  return (
    <div className="border-t p-3 text-sm">
      <button onClick={go} className="w-full rounded-lg border border-emerald-700 py-2 text-emerald-800">Search more on Google in this map area</button>
      {msg && <p className="mt-1 text-xs text-gray-600">{msg}</p>}
      {res && res.length > 0 && (
        <div className="mt-2">
          <ul className="divide-y">
            {res.map((p) => (
              <li key={p.place_id} className="py-2">
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-gray-500">{p.address}</div>
                <div className="mt-1 flex gap-3 text-xs">
                  {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="text-emerald-700 underline">View on Google Maps</a>}
                  <a href={`/submit?gpid=${encodeURIComponent(p.place_id)}`} className="text-emerald-700 underline">Missing from wheretopray? Suggest it</a>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-gray-500" translate="no">Results from <span style={{ fontFamily: "Roboto, Arial, sans-serif" }}>Google Maps</span>. Shown live and not stored by wheretopray.</p>
        </div>
      )}
    </div>
  );
}
