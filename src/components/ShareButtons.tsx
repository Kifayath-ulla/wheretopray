"use client";
import { useState } from "react";
export default function ShareButtons({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" className="btn bg-[#25d366] text-white">Share on WhatsApp</a>
      <button onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); }} className="btn btn-secondary">{copied ? "Copied" : "Copy text"}</button>
      <button onClick={() => window.print()} className="btn btn-secondary">Print poster</button>
    </div>
  );
}
