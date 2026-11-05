"use client";
import { useEffect, useState } from "react";
export default function ShareButtons({ text, url }: { text: string; url?: string }) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => { setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function"); }, []);
  async function copy() {
    try { await navigator.clipboard.writeText(text); } catch {
      const t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove();
    }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      {canShare && <button type="button" onClick={() => navigator.share({ title: "wheretopray", text, url }).catch(() => {})} className="btn btn-primary">Share...</button>}
      <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" className="btn bg-[#1a7f45] text-[#ffffff]">WhatsApp</a>
      <button type="button" onClick={copy} className="btn btn-secondary" aria-live="polite">{copied ? "Copied" : "Copy text"}</button>
      <button type="button" onClick={() => window.print()} className="btn btn-secondary">Print poster</button>
    </div>
  );
}
