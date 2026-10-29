"use client";
import { useState } from "react";
import { PLACE_TYPES } from "@/lib/types";

export default function SubmissionForm({ kind, placeId, placeName }: { kind: "new_place" | "fix"; placeId?: string; placeName?: string }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [err, setErr] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    const payload = Object.fromEntries(new FormData(e.currentTarget).entries());
    const res = await fetch("/api/submissions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind, place_id: placeId, payload }) });
    if (res.ok) setState("done");
    else { setState("error"); setErr((await res.json().catch(() => ({}))).error ?? "Something went wrong"); }
  }

  if (state === "done") return <p className="rounded-lg bg-emerald-50 p-4 text-emerald-800">Thank you - your {kind === "fix" ? "correction" : "submission"} is in the moderation queue.</p>;
  const field = "w-full rounded-lg border px-3 py-2 text-sm";
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {kind === "new_place" ? (
        <>
          <input name="name" required placeholder="Name *" className={field} />
          <select name="type" className={field} defaultValue="mosque">{PLACE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
          <input name="address" placeholder="Address / landmark" className={field} />
          <div className="flex gap-2"><input name="lat" placeholder="Latitude" className={field} /><input name="lng" placeholder="Longitude" className={field} /></div>
          <input name="jumuah_time" placeholder="Jumu'ah time (e.g. 1:30 PM)" className={field} />
          <div className="flex flex-wrap gap-3 text-sm">
            <label><input type="checkbox" name="women_section" value="yes" /> Women&apos;s area</label>
            <label><input type="checkbox" name="wudu" value="yes" /> Wudu</label>
            <label><input type="checkbox" name="parking" value="yes" /> Parking</label>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-gray-600">Reporting a fix for <b>{placeName}</b></p>
          <select name="issue" className={field}>
            <option>Wrong name</option><option>Wrong location</option><option>Wrong type</option><option>Timings</option><option>Facilities</option><option>Permanently closed</option><option>Other</option>
          </select>
          <input name="name" placeholder="Corrected name (optional)" className={field} />
          <input name="address" placeholder="Corrected address (optional)" className={field} />
          <div className="flex gap-2"><input name="lat" placeholder="Corrected latitude" className={field} /><input name="lng" placeholder="Corrected longitude" className={field} /></div>
        </>
      )}
      <textarea name="notes" placeholder={kind === "fix" ? "What should be corrected? *" : "Notes (iqama times, facilities, who runs it)"} required={kind === "fix"} className={field} rows={3} />
      <input name="contact" placeholder="Your email (optional)" className={field} />
      <button disabled={state === "sending"} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{state === "sending" ? "Sending..." : "Submit"}</button>
      {state === "error" && <p className="text-sm text-red-600">{err}</p>}
    </form>
  );
}
