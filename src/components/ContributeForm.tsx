"use client";
import { useEffect, useState } from "react";
import { HELP, validateContributor } from "@/lib/contribute";

export default function ContributeForm() {
  const [v, setV] = useState({ name: "", email: "", phone: "", city: "", note: "", website: "" });
  const [help, setHelp] = useState<string[]>([]);
  const [started, setStarted] = useState(0);
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [err, setErr] = useState("");
  useEffect(() => setStarted(Date.now()), []);
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const bad = validateContributor({ ...v, help });
    if (bad) return setErr(bad);
    setErr(""); setState("sending");
    const r = await fetch("/api/contribute", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...v, help, started_at: started }) }).catch(() => null);
    if (r?.ok) return setState("done");
    setState("idle"); setErr((await r?.json().catch(() => null))?.error ?? "Could not send. Please try again.");
  }
  if (state === "done") return <div className="card p-5 text-center" role="status"><p className="text-xl font-semibold">JazakAllah khair</p><p className="mt-1 text-[15px] text-ink-2">Thank you. We will be in touch.</p></div>;
  const field = "h-12 w-full px-4 text-base";
  return (
    <form onSubmit={submit} className="card space-y-4 p-5" noValidate>
      <label className="block space-y-1"><span className="text-[15px] font-medium">Name</span><input required maxLength={80} autoComplete="name" value={v.name} onChange={set("name")} className={field} /></label>
      <label className="block space-y-1"><span className="text-[15px] font-medium">Email</span><input required type="email" maxLength={254} autoComplete="email" inputMode="email" value={v.email} onChange={set("email")} className={field} /></label>
      <label className="block space-y-1"><span className="text-[15px] font-medium">Phone or WhatsApp <span className="font-normal text-ink-3">(optional, recommended)</span></span><input type="tel" maxLength={20} autoComplete="tel" inputMode="tel" value={v.phone} onChange={set("phone")} className={field} placeholder="+91" /></label>
      <label className="block space-y-1"><span className="text-[15px] font-medium">City or area <span className="font-normal text-ink-3">(optional)</span></span><input maxLength={80} value={v.city} onChange={set("city")} className={field} /></label>
      <fieldset className="space-y-2">
        <legend className="text-[15px] font-medium">How would you like to help?</legend>
        {HELP.map((h) => (
          <label key={h.id} className="flex min-h-11 items-center gap-3 rounded-xl border border-hairline px-3 text-[15px]">
            <input type="checkbox" className="h-5 w-5 accent-[var(--accent)]" checked={help.includes(h.id)} onChange={(e) => setHelp(e.target.checked ? [...help, h.id] : help.filter((x) => x !== h.id))} />
            {h.label}
          </label>
        ))}
      </fieldset>
      <label className="block space-y-1"><span className="text-[15px] font-medium">Note <span className="font-normal text-ink-3">(optional)</span></span><textarea maxLength={1000} rows={3} value={v.note} onChange={set("note")} className="w-full px-4 py-3 text-base" /></label>
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden"><label>Website<input tabIndex={-1} autoComplete="off" value={v.website} onChange={set("website")} /></label></div>
      <p className="text-sm text-ink-2">We will only use this to contact you about helping wheretopray. Not shared or sold.</p>
      {err && <p className="text-sm font-medium text-[var(--danger,#c0392b)]" role="alert">{err}</p>}
      <button disabled={state === "sending"} className="btn btn-primary h-14 w-full text-base">{state === "sending" ? "Sending..." : "Send"}</button>
    </form>
  );
}
