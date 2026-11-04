"use client";
import { useEffect, useState } from "react";
import type { Submission } from "@/lib/data";

export default function AdminQueue() {
  const [token, setToken] = useState("");
  const [items, setItems] = useState<Submission[] | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { setToken(sessionStorage.getItem("wtp_admin") ?? ""); }, []);

  async function load(tk = token) {
    const r = await fetch("/api/submissions", { headers: { "x-admin-token": tk } });
    if (!r.ok) { setErr(r.status === 429 ? "Too many wrong attempts. Wait 15 minutes." : "Wrong token"); setItems(null); return; }
    setErr(""); sessionStorage.setItem("wtp_admin", tk); setItems(await r.json());
  }
  async function act(id: string, status: Submission["status"]) {
    await fetch(`/api/submissions/${id}`, { method: "PATCH", headers: { "x-admin-token": token, "content-type": "application/json" }, body: JSON.stringify({ status }) });
    load();
  }
  async function viewPhoto(path: string) {
    const r = await fetch(`/api/admin/timetable/${encodeURIComponent(path)}`, { headers: { "x-admin-token": token } });
    if (!r.ok) { setErr("Could not load photo"); return; }
    window.open(URL.createObjectURL(await r.blob()), "_blank", "noopener");
  }
  const title = (s: Submission) => s.kind === "timetable" ? `Timetable for ${s.place_id ?? String(s.payload.place_name ?? "")}` : s.kind === "fix" ? `Fix for ${s.place_id}` : `New: ${String(s.payload.name ?? "")}`;
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input type="password" value={token} onChange={(e) => setToken(e.target.value)} aria-label="Admin token" placeholder="Admin token" className="h-11 flex-1 px-4 text-[15px]" />
        <button onClick={() => load()} className="btn btn-primary text-sm">Load queue</button>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      {items && items.length === 0 && <p className="text-sm text-gray-500">Queue is empty.</p>}
      {items?.map((s) => (
        <div key={s.id} className="card p-4 text-sm">
          <div className="flex justify-between"><b>{title(s)}</b><span className="text-xs text-gray-600">{s.status}</span></div>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-gray-700">{JSON.stringify(s.payload, null, 2)}</pre>
          {s.kind === "timetable" && (
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              {typeof s.payload.link === "string" && /^https?:\/\//.test(s.payload.link) && <a className="chip" href={s.payload.link} target="_blank" rel="noopener noreferrer nofollow">Open link</a>}
              {typeof s.payload.photo_path === "string" && <button className="chip" onClick={() => viewPhoto(String(s.payload.photo_path))}>View photo</button>}
              <span className="text-xs text-ink-3">Copy the times in with Edit places below, then approve.</span>
            </div>
          )}
          <div className="mt-2 flex gap-2">
            <button onClick={() => act(s.id, "approved")} className="btn btn-primary py-1.5 text-sm">Approve</button>
            <button onClick={() => act(s.id, "rejected")} className="btn btn-secondary py-1.5 text-sm">Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}
