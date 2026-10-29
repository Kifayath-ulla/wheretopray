"use client";
import { useEffect, useMemo, useState } from "react";
import type { Place } from "@/lib/types";

export default function AdminPending() {
  const [token, setToken] = useState("");
  const [items, setItems] = useState<Place[] | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [msg, setMsg] = useState("");
  useEffect(() => { setToken(localStorage.getItem("wtp_admin") ?? ""); }, []);
  const h = () => ({ "x-admin-token": token, "content-type": "application/json" });
  async function load() {
    const r = await fetch("/api/admin/pending", { headers: h() });
    if (!r.ok) { setMsg(r.status === 401 ? "Wrong admin token" : "Load failed"); return; }
    localStorage.setItem("wtp_admin", token);
    const d: Place[] = await r.json(); setItems(d); setSel(new Set()); setMsg(`${d.length} pending places`);
  }
  const shown = useMemo(() => (items ?? []).filter((p) => !filter || `${p.name} ${p.city} ${p.state}`.toLowerCase().includes(filter.toLowerCase())), [items, filter]);
  async function approve(ids: string[]) {
    if (!ids.length) return;
    const r = await fetch("/api/admin/pending", { method: "POST", headers: h(), body: JSON.stringify({ ids, status: "verified" }) });
    setMsg(r.ok ? `Approved ${(await r.json()).updated} places.` : `Approve failed (${r.status})`);
    if (r.ok) load();
  }
  async function del(p: Place) {
    const r = await fetch(`/api/admin/places?id=${encodeURIComponent(p.id)}&slug=${encodeURIComponent(p.slug)}`, { method: "DELETE", headers: h() });
    if (r.ok) { setItems((x) => x?.filter((i) => i.id !== p.id) ?? null); setMsg(`Deleted "${p.name}" as junk.`); } else setMsg(`Delete failed (${r.status})`);
  }
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Admin token" className="w-40 rounded-lg border px-3 py-2 text-sm" />
        <button onClick={load} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white">Load pending</button>
        {items && <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by name, city or state" className="flex-1 rounded-lg border px-3 py-2 text-sm" />}
      </div>
      {msg && <p className="text-sm text-amber-700">{msg}</p>}
      {items && items.length > 0 && (
        <div className="flex flex-wrap gap-2 text-sm">
          <button onClick={() => setSel(new Set(shown.map((p) => p.id)))} className="rounded border px-2 py-1">Select all shown ({shown.length})</button>
          <button onClick={() => setSel(new Set())} className="rounded border px-2 py-1">Clear</button>
          <button onClick={() => approve([...sel])} disabled={!sel.size} className="rounded bg-emerald-700 px-3 py-1 text-white disabled:opacity-40">Approve selected ({sel.size})</button>
        </div>
      )}
      <ul className="max-h-[70vh] divide-y overflow-auto rounded-xl border">
        {shown.slice(0, 1000).map((p) => (
          <li key={p.id} className="flex items-center gap-2 p-2 text-sm">
            <input type="checkbox" checked={sel.has(p.id)} onChange={() => toggle(p.id)} />
            <a className="flex-1" href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=18/${p.lat}/${p.lng}`} target="_blank" rel="noreferrer">
              <b>{p.name}</b> <span className="text-xs text-gray-500">{p.type} - {[p.address, p.city, p.state].filter(Boolean).join(", ")}</span>
            </a>
            <button onClick={() => approve([p.id])} className="rounded border px-2 py-0.5 text-xs">Approve</button>
            <button onClick={() => del(p)} className="rounded border border-red-300 px-2 py-0.5 text-xs text-red-700">Junk</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
