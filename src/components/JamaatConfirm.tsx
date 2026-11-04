"use client";
import { useRef, useState } from "react";
import SubmissionForm from "./SubmissionForm";

const STALE_DAYS = 60;
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

/** "Still correct?" for community jamaat times. Never shows or invents times itself: it only confirms or opens the fix form. */
export default function JamaatConfirm({ placeId, placeName, confirmedAt, prefill }: { placeId: string; placeName: string; confirmedAt?: string | null; prefill: Record<string, string> }) {
  const [at, setAt] = useState(confirmedAt ?? null);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const [changed, setChanged] = useState(false);
  const started = useRef(Date.now());
  const hp = useRef<HTMLInputElement>(null);
  const stale = !at || Date.now() - new Date(at).getTime() > STALE_DAYS * 86400e3;

  async function yes() {
    const wait = 3200 - (Date.now() - started.current);
    setState("sending");
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    const r = await fetch("/api/jamaat/confirm", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ place_id: placeId, started_at: started.current, website: hp.current?.value ?? "" }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) { setState("done"); if (j.confirmed_at) setAt(j.confirmed_at); }
    else { setState("error"); setMsg(j.error ?? "Something went wrong"); }
  }

  return (
    <section className="card space-y-3 p-5" data-testid="jamaat-confirm">
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}><input ref={hp} name="website" tabIndex={-1} autoComplete="off" /></div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          <div className="font-semibold">Jamaat times</div>
          <div className="text-ink-2">{at ? `Last confirmed ${fmtDate(at)}` : "Not confirmed yet"}</div>
          {stale && <div className="mt-0.5 text-xs text-ink-3">May be outdated - please check locally.</div>}
        </div>
        {state === "done" ? <p className="text-sm font-medium text-accent-text" role="status">Thanks, confirmed.</p> : (
          <div className="flex items-center gap-2" role="group" aria-label="Are these times still correct?">
            <span className="text-sm text-ink-2">Still correct?</span>
            <button onClick={yes} disabled={state === "sending"} className="btn btn-primary px-4 py-2 text-sm disabled:opacity-50">{state === "sending" ? "..." : "Yes"}</button>
            <button onClick={() => setChanged((c) => !c)} aria-expanded={changed} className="btn btn-tinted px-4 py-2 text-sm">Changed</button>
          </div>
        )}
      </div>
      {state === "error" && <p className="text-sm text-red-600" role="alert">{msg}</p>}
      {changed && <div className="border-t border-hairline pt-4"><SubmissionForm kind="fix" placeId={placeId} placeName={placeName} prefill={prefill} /></div>}
    </section>
  );
}
