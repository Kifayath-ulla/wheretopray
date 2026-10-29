"use client";
import { useEffect, useState } from "react";
import type { Submission } from "@/lib/data";

export default function AdminQueue() {
  const [token, setToken] = useState("");
  const [items, setItems] = useState<Submission[] | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { setToken(localStorage.getItem("wtp_admin") ?? ""); }, []);

  async function load(tk = token) {
    const r = await fetch("/api/submissions", { headers: { "x-admin-token": tk } });
    if (!r.ok) { setErr("Wrong token"); setItems(null); return; }
    setErr(""); localStorage.setItem("wtp_admin", tk); setItems(await r.json());
  }
  async function act(id: string, status: Submission["status"]) {
    await fetch(`/api/submissions/${id}`, { method: "PATCH", headers: { "x-admin-token": token, "content-type": "application/json" }, body: JSON.stringify({ status }) });
    load();
  }
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Admin token" className="flex-1 rounded-lg border px-3 py-2 text-sm" />
        <button onClick={() => load()} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white">Load queue</button>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      {items && items.length === 0 && <p className="text-sm text-gray-500">Queue is empty.</p>}
      {items?.map((s) => (
        <div key={s.id} className="rounded-xl border p-3 text-sm">
          <div className="flex justify-between"><b>{s.kind === "fix" ? `Fix for ${s.place_id}` : `New: ${String(s.payload.name ?? "")}`}</b><span className="text-xs uppercase text-gray-500">{s.status}</span></div>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-gray-700">{JSON.stringify(s.payload, null, 2)}</pre>
          <div className="mt-2 flex gap-2">
            <button onClick={() => act(s.id, "approved")} className="rounded bg-emerald-700 px-3 py-1 text-white">Approve</button>
            <button onClick={() => act(s.id, "rejected")} className="rounded bg-gray-200 px-3 py-1">Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}
