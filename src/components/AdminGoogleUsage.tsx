"use client";
import { useState } from "react";

export default function AdminGoogleUsage() {
  const [d, setD] = useState<{ month: string; requests: number; cap: number; enabled: boolean } | null>(null);
  const [err, setErr] = useState("");
  async function load() {
    const r = await fetch("/api/admin/google-usage", { headers: { "x-admin-token": sessionStorage.getItem("wtp_admin") ?? "" } });
    if (!r.ok) return setErr(r.status === 401 ? "Load the moderation queue with your token first." : r.status === 429 ? "Too many wrong attempts. Wait 15 minutes." : "Load failed");
    setErr(""); setD(await r.json());
  }
  return (
    <div className="space-y-2 text-sm">
      <button onClick={load} className="btn btn-tinted">Show this month&apos;s Google usage</button>
      {err && <p className="text-xs text-red-700">{err}</p>}
      {d && (
        <p>
          {d.enabled ? "Google lookup is on." : "Google lookup is off (no API key)."} {d.requests.toLocaleString()} of {d.cap.toLocaleString()} requests used in {d.month.slice(0, 7)} (UTC).
          {d.requests >= d.cap && " Cap reached: Google results are paused until next month."}
        </p>
      )}
    </div>
  );
}
