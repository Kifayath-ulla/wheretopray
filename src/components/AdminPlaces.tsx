"use client";
import { useEffect, useState } from "react";
import { PLACE_TYPES, type Place } from "@/lib/types";

const TEXT = ["name", "address", "area", "city", "state", "country", "jumuah_time"] as const;
const BOOL = ["women_section", "wudu", "parking", "wheelchair"] as const;

export default function AdminPlaces() {
  const [token, setToken] = useState("");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Place[] | null>(null);
  const [edit, setEdit] = useState<Place | null>(null);
  const [msg, setMsg] = useState("");
  useEffect(() => { setToken(localStorage.getItem("wtp_admin") ?? ""); }, []);
  const h = () => ({ "x-admin-token": token, "content-type": "application/json" });

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    const r = await fetch(`/api/admin/places?q=${encodeURIComponent(q)}`, { headers: h() });
    if (!r.ok) { setMsg(r.status === 401 ? "Wrong admin token" : "Search failed"); setItems(null); return; }
    localStorage.setItem("wtp_admin", token); setMsg(""); setItems(await r.json());
  }
  async function save() {
    if (!edit) return;
    const patch: Record<string, unknown> = { type: edit.type, status: edit.status, lat: Number(edit.lat), lng: Number(edit.lng) };
    for (const k of TEXT) patch[k] = edit[k] ?? null;
    for (const k of BOOL) patch[k] = edit[k] ?? null;
    const r = await fetch("/api/admin/places", { method: "PATCH", headers: h(), body: JSON.stringify({ id: edit.id, patch }) });
    setMsg(r.ok ? `Saved "${edit.name}". The live site refreshes now.` : `Save failed (${r.status})`);
    if (r.ok) { setEdit(null); search(); }
  }
  async function del(p: Place) {
    if (!confirm(`Delete "${p.name}" permanently? This cannot be undone.`)) return;
    const r = await fetch(`/api/admin/places?id=${encodeURIComponent(p.id)}&slug=${encodeURIComponent(p.slug)}`, { method: "DELETE", headers: h() });
    setMsg(r.ok ? `Deleted "${p.name}".` : `Delete failed (${r.status})`);
    if (r.ok) search();
  }
  const f = "w-full rounded border px-2 py-1 text-sm";
  return (
    <div className="space-y-3">
      <form onSubmit={search} className="flex flex-wrap gap-2">
        <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Admin token" className="w-40 rounded-lg border px-3 py-2 text-sm" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, area, city or id" className="flex-1 rounded-lg border px-3 py-2 text-sm" />
        <button className="rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white">Search places</button>
      </form>
      {msg && <p className="text-sm text-amber-700">{msg}</p>}
      {items && items.length === 0 && <p className="text-sm text-gray-500">No matches.</p>}
      <ul className="divide-y rounded-xl border">
        {items?.map((p) => (
          <li key={p.id} className="p-2 text-sm">
            {edit?.id === p.id ? (
              <div className="space-y-2">
                {TEXT.map((k) => <label key={k} className="block text-xs text-gray-500">{k}<input className={f} value={(edit[k] as string) ?? ""} onChange={(e) => setEdit({ ...edit, [k]: e.target.value })} /></label>)}
                <div className="flex gap-2">
                  <label className="text-xs text-gray-500">lat<input className={f} value={edit.lat} onChange={(e) => setEdit({ ...edit, lat: e.target.value as unknown as number })} /></label>
                  <label className="text-xs text-gray-500">lng<input className={f} value={edit.lng} onChange={(e) => setEdit({ ...edit, lng: e.target.value as unknown as number })} /></label>
                </div>
                <div className="flex gap-2">
                  <select className={f} value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value as Place["type"] })}>{PLACE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
                  <select className={f} value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value as Place["status"] })}><option value="verified">verified (public)</option><option value="pending">pending (hidden)</option></select>
                </div>
                <div className="flex flex-wrap gap-3 text-xs">{BOOL.map((k) => <label key={k}><input type="checkbox" checked={!!edit[k]} onChange={(e) => setEdit({ ...edit, [k]: e.target.checked })} /> {k}</label>)}</div>
                <div className="flex gap-2"><button onClick={save} className="rounded bg-emerald-700 px-3 py-1 text-white">Save</button><button onClick={() => setEdit(null)} className="rounded bg-gray-200 px-3 py-1">Cancel</button></div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div><b>{p.name}</b> <span className="text-xs text-gray-500">{p.type} - {[p.area, p.city, p.state].filter(Boolean).join(", ")} - {p.status} - {p.id}</span></div>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => setEdit({ ...p })} className="rounded border px-2 py-0.5 text-xs">Edit</button>
                  <button onClick={() => del(p)} className="rounded border border-red-300 px-2 py-0.5 text-xs text-red-700">Delete</button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
