"use client";
import { useState } from "react";
export default function ShareButtons({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" className="rounded-xl bg-green-600 px-4 py-3 font-medium text-white">Share on WhatsApp</a>
      <button onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); }} className="rounded-xl border px-4 py-3">{copied ? "Copied" : "Copy text"}</button>
      <button onClick={() => window.print()} className="rounded-xl border px-4 py-3">Print poster</button>
    </div>
  );
}
