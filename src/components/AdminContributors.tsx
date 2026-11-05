"use client";
import { useState } from "react";
import { HELP } from "@/lib/contribute";
type Row = { id: string; created_at: string; name: string; email: string; phone: string | null; city: string | null; help: string[]; note: string | null };
const label = (id: string) => HELP.find((h) => h.id === id)?.label ?? id;
export default function AdminContributors() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState("");
  async function load() {
    const r = await fetch("/api/admin/contributors", { headers: { "x-admin-token": sessionStorage.getItem("wtp_admin") ?? "" } });
    if (!r.ok) return setErr(r.status === 401 ? "Load the moderation queue with your token first." : r.status === 429 ? "Too many wrong attempts. Wait 15 minutes." : "Load failed");
    setErr(""); setRows(await r.json());
  }
  return (
    <div className="space-y-3 text-sm">
      <button onClick={load} className="btn btn-tinted">Show contributors</button>
      {err && <p className="text-xs text-red-700">{err}</p>}
      {rows && (rows.length === 0 ? <p className="text-ink-2">No sign-ups yet.</p> : (
        <ul className="divide-y divide-[var(--hairline)] overflow-hidden rounded-2xl border border-hairline bg-surface">
          {rows.map((c) => (
            <li key={c.id} className="space-y-1 p-4">
              <div className="font-semibold">{c.name} <span className="font-normal text-ink-3">· {new Date(c.created_at).toLocaleString("en-IN")}</span></div>
              <div><a className="link" href={`mailto:${c.email}`}>{c.email}</a>{c.phone && <> · <a className="link" href={`tel:${c.phone}`}>{c.phone}</a></>}{c.city && <> · {c.city}</>}</div>
              {c.help.length > 0 && <div className="text-ink-2">{c.help.map(label).join(", ")}</div>}
              {c.note && <p className="whitespace-pre-wrap text-ink-2">{c.note}</p>}
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}
