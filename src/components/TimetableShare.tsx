"use client";
import { useRef, useState } from "react";

const MAX = 2 * 1024 * 1024, TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Optional timetable share: a link (http/https) or a photo (jpg/png/webp, 2 MB). Goes to the admin queue. */
export default function TimetableShare({ placeId, placeName }: { placeId?: string; placeName?: string }) {
  const [mode, setMode] = useState<"link" | "photo">("link");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [err, setErr] = useState("");
  const started = useRef(Date.now());

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (mode === "link") { fd.delete("photo"); const l = String(fd.get("link") ?? "").trim(); if (!/^https?:\/\/\S+$/i.test(l)) { setState("error"); setErr("Enter a link starting with http:// or https://"); return; } }
    else {
      fd.delete("link"); const f = fd.get("photo");
      if (!(f instanceof File) || !f.size) { setState("error"); setErr("Choose a photo."); return; }
      if (!TYPES.includes(f.type)) { setState("error"); setErr("Photo must be JPG, PNG or WebP."); return; }
      if (f.size > MAX) { setState("error"); setErr("Photo must be 2 MB or smaller."); return; }
    }
    fd.set("started_at", String(started.current));
    if (placeId) fd.set("place_id", placeId);
    setState("sending");
    const r = await fetch("/api/timetable", { method: "POST", body: fd });
    if (r.ok) setState("done"); else { setState("error"); setErr((await r.json().catch(() => ({}))).error ?? "Something went wrong"); }
  }

  if (state === "done") return <p className="rounded-xl bg-surface-2 p-4 text-sm text-ink" role="status">Thank you - the timetable is in the review queue.</p>;
  const field = "w-full h-11 px-4 text-[15px]";
  return (
    <form onSubmit={onSubmit} className="space-y-3" data-testid="timetable-share">
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}><label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <p className="text-sm text-ink-2">{placeName ? <>Have the timetable for <b className="text-ink">{placeName}</b>? </> : null}Share a link or a photo. An admin checks it before any times go up.</p>
      {!placeId && <input name="place_name" required minLength={3} maxLength={150} placeholder="Masjid name *" className={field} />}
      <div className="segmented" role="group" aria-label="Timetable type">
        <button type="button" aria-pressed={mode === "link"} onClick={() => setMode("link")}>Link</button>
        <button type="button" aria-pressed={mode === "photo"} onClick={() => setMode("photo")}>Photo</button>
      </div>
      {mode === "link"
        ? <input name="link" type="url" inputMode="url" maxLength={500} placeholder="https://..." aria-label="Timetable link" className={field} />
        : <label className="block text-sm text-ink-2">Photo (JPG, PNG or WebP, up to 2 MB)<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full text-sm text-ink" /></label>}
      <input name="notes" maxLength={500} placeholder="Note (optional)" className={field} />
      <button disabled={state === "sending"} className="btn btn-primary text-sm disabled:opacity-50">{state === "sending" ? "Sending..." : "Share timetable"}</button>
      {state === "error" && <p className="text-sm text-red-600" role="alert">{err}</p>}
    </form>
  );
}
