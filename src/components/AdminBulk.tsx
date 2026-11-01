"use client";
import { useEffect, useRef, useState } from "react";

type Row = { name: string; type: string; area: string; city: string; lat: number | null; lng: number | null; note?: string; dup?: { name: string; slug: string; meters: number } | null; skip?: boolean };
const TYPES = ["mosque", "masjid", "prayer_room", "musalla", "idgah", "dargah"];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Minimal CSV/TSV line parser with quote support. Tabs come from pasting Google Sheets cells. */
function splitLine(line: string): string[] {
  const sep = line.includes("\t") ? "\t" : ",";
  const out: string[] = []; let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
    else if (c === '"') q = true; else if (c === sep) { out.push(cur.trim()); cur = ""; } else cur += c;
  }
  out.push(cur.trim()); return out;
}

export function parseBulk(text: string): Row[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return [];
  let cols = ["name", "type", "area", "city", "lat", "lng"];
  const first = splitLine(lines[0]).map((h) => h.toLowerCase());
  if (first.includes("name")) { cols = first.map((h) => (h === "latitude" ? "lat" : h === "longitude" || h === "lon" ? "lng" : h)); lines.shift(); }
  return lines.map((l) => {
    const v = splitLine(l), g = (k: string) => v[cols.indexOf(k)] ?? "";
    const t = g("type").toLowerCase().replace(/\s+/g, "_");
    const lat = parseFloat(g("lat")), lng = parseFloat(g("lng"));
    const ok = Number.isFinite(lat) && Number.isFinite(lng);
    return { name: g("name"), type: TYPES.includes(t) ? t : "mosque", area: g("area"), city: g("city") || "Bengaluru", lat: ok ? lat : null, lng: ok ? lng : null };
  }).filter((r) => r.name);
}

export default function AdminBulk() {
  const [token, setToken] = useState("");
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [status, setStatus] = useState<"pending" | "verified">("pending");
  const stop = useRef(false);
  useEffect(() => { setToken(sessionStorage.getItem("wtp_admin") ?? ""); }, []);

  async function call(action: "dedupe" | "import", payload: Row[]) {
    const r = await fetch("/api/admin/bulk", { method: "POST", headers: { "x-admin-token": token, "content-type": "application/json" }, body: JSON.stringify({ action, status, rows: payload.map(({ name, type, area, city, lat, lng }) => ({ name, type, area, city, lat, lng })) }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(r.status === 401 ? "Wrong admin token" : j.error ?? "Failed");
    sessionStorage.setItem("wtp_admin", token);
    return j;
  }

  async function preview() {
    setMsg(""); stop.current = false;
    const list = parseBulk(text);
    if (!list.length) { setMsg("Nothing to parse. Use name,type,area,city,lat,lng"); return; }
    if (list.length > 2000) { setMsg("Max 2000 rows at a time."); return; }
    setRows([...list]);
    // Geocode missing coordinates with free OpenStreetMap Nominatim, 1 request per second (their usage policy).
    const missing = list.filter((r) => r.lat == null);
    for (let k = 0; k < missing.length && !stop.current; k++) {
      const r = missing[k];
      setBusy(`Finding coordinates ${k + 1}/${missing.length} (1 per second, OpenStreetMap)`);
      const q = [r.name, r.area, r.city, "India"].filter(Boolean).join(", ");
      const fallback = [r.area, r.city, "India"].filter(Boolean).join(", ");
      try {
        let hit = await geocode(q);
        if (!hit && r.area) { await sleep(1100); hit = await geocode(fallback); if (hit) r.note = "Area center, check pin"; }
        if (hit) { r.lat = hit[0]; r.lng = hit[1]; } else r.note = "Not found, add lat,lng";
      } catch { r.note = "Lookup failed"; }
      setRows([...list]);
      await sleep(1100);
    }
    const located = list.filter((r) => r.lat != null);
    if (located.length && token) {
      setBusy("Checking for duplicates");
      try {
        const m: { i: number; name: string; slug: string; meters: number }[] = await call("dedupe", located).then((j) => j.matches ?? []);
        for (const x of m) { const r = located[x.i]; if (r) { r.dup = x; r.skip = true; } }
      } catch (e) { setMsg((e as Error).message); }
    } else if (!token) setMsg("Enter the admin token to check duplicates and import.");
    setRows([...list]); setBusy("");
  }

  async function geocode(q: string): Promise<[number, number] | null> {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=in&q=${encodeURIComponent(q)}`, { headers: { "Accept-Language": "en" } });
    const j = await r.json();
    return j?.[0] ? [parseFloat(j[0].lat), parseFloat(j[0].lon)] : null;
  }

  async function doImport() {
    const ready = rows.filter((r) => !r.skip && r.lat != null);
    if (!ready.length) return;
    setBusy("Importing");
    try { const j = await call("import", ready); setMsg(`Imported ${j.imported} place(s) as ${status}.`); setRows([]); setText(""); }
    catch (e) { setMsg((e as Error).message); }
    setBusy("");
  }

  const ready = rows.filter((r) => !r.skip && r.lat != null).length;
  return (
    <div className="card space-y-4 p-5">
      <p className="text-sm text-ink-2">
        One place per line: <code className="rounded bg-surface-2 px-1.5 py-0.5">name,type,area,city,lat,lng</code>. Lat/lng are optional, missing ones are looked up on OpenStreetMap.
        In Google Sheets, use the same column order, then select the cells and paste here (tabs work), or File, Download, CSV and upload.{" "}
        <a className="font-medium text-accent-text" href="/bulk-template.csv" download>Download template</a>
      </p>
      <div className="flex flex-wrap gap-2">
        <input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Admin token" className="h-11 w-44 px-4 text-[15px]" />
        <label className="btn btn-secondary cursor-pointer">Upload CSV<input type="file" accept=".csv,text/csv,.tsv,.txt" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setText(await f.text()); }} /></label>
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder={"Masjid-e-Noor,mosque,Shivajinagar,Bengaluru\nTech Park Prayer Room,prayer_room,Whitefield,Bengaluru,12.98,77.72"} className="w-full p-4 font-mono text-sm" />
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn btn-tinted" disabled={!!busy || !text.trim()} onClick={preview}>Preview</button>
        {busy && <><span className="text-sm text-ink-2">{busy}</span><button className="text-sm text-red-600" onClick={() => { stop.current = true; }}>Stop</button></>}
        {msg && <span className="text-sm font-medium">{msg}</span>}
      </div>
      {rows.length > 0 && (
        <>
          <div className="max-h-[420px] overflow-auto rounded-2xl bg-surface-2">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-surface-2 text-xs text-ink-3"><tr><th className="p-2">Use</th><th className="p-2">Name</th><th className="p-2">Type</th><th className="p-2">Area, city</th><th className="p-2">Coords</th><th className="p-2">Check</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-hairline">
                    <td className="p-2"><input type="checkbox" checked={!r.skip && r.lat != null} disabled={r.lat == null} onChange={() => { r.skip = !r.skip; setRows([...rows]); }} /></td>
                    <td className="p-2 font-medium">{r.name}</td>
                    <td className="p-2">{r.type}</td>
                    <td className="p-2 text-ink-2">{[r.area, r.city].filter(Boolean).join(", ")}</td>
                    <td className="p-2 tabular-nums text-ink-2">{r.lat != null ? <a className="text-accent-text" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lng}#map=17/${r.lat}/${r.lng}`}>{r.lat.toFixed(4)}, {r.lng!.toFixed(4)}</a> : "-"}</td>
                    <td className="p-2 text-xs">{r.dup ? <span className="text-amber-600">Duplicate of <a className="underline" href={`/place/${r.dup.slug}`} target="_blank" rel="noreferrer">{r.dup.name}</a> ({Math.round(r.dup.meters)} m)</span> : r.note ? <span className="text-amber-600">{r.note}</span> : r.lat != null ? <span className="text-accent-text">New</span> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="segmented" role="group" aria-label="Import as">
              <button aria-pressed={status === "pending"} onClick={() => setStatus("pending")}>Pending</button>
              <button aria-pressed={status === "verified"} onClick={() => setStatus("verified")}>Verified</button>
            </div>
            <button className="btn btn-primary" disabled={!!busy || !ready || !token} onClick={doImport}>Import {ready} place{ready === 1 ? "" : "s"}</button>
          </div>
        </>
      )}
    </div>
  );
}
