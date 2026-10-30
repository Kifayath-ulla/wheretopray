"use client";
import { useEffect, useRef, useState } from "react";

type Snap = "peek" | "half" | "full";
const PEEK = 148; // px visible when collapsed: handle + search row + chips

// One bottom sheet with a drag handle and three snap points. Moves with transform only.
export default function BottomSheet({ snap, onSnap, children }: { snap: Snap; onSnap: (s: Snap) => void; children: React.ReactNode }) {
  const el = useRef<HTMLElement>(null);
  const [H, setH] = useState(0);
  const [drag, setDrag] = useState<number | null>(null);
  const start = useRef({ y: 0, off: 0, t: 0 });

  useEffect(() => {
    const p = el.current?.parentElement; if (!p) return;
    const ro = new ResizeObserver(() => setH(p.clientHeight));
    ro.observe(p); setH(p.clientHeight);
    return () => ro.disconnect();
  }, []);

  const full = 8, half = Math.round(H * 0.5), peek = Math.max(0, H - PEEK);
  const offsets: Record<Snap, number> = { full, half, peek };
  const off = drag ?? (H ? offsets[snap] : 0);

  function down(e: React.PointerEvent) {
    if (window.innerWidth >= 768) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    start.current = { y: e.clientY, off, t: performance.now() };
    setDrag(off);
  }
  function move(e: React.PointerEvent) {
    if (drag === null) return;
    setDrag(Math.min(peek, Math.max(full, start.current.off + e.clientY - start.current.y)));
  }
  function up(e: React.PointerEvent) {
    if (drag === null) return;
    const dy = e.clientY - start.current.y, v = dy / Math.max(1, performance.now() - start.current.t);
    let target: Snap;
    if (Math.abs(dy) < 6) target = snap === "full" ? "half" : snap === "half" ? "full" : "half"; // tap on handle cycles
    else if (v > 0.5) target = drag > half ? "peek" : "half";
    else if (v < -0.5) target = drag < half ? "full" : "half";
    else target = (Object.entries(offsets) as [Snap, number][]).sort((a, b) => Math.abs(a[1] - drag) - Math.abs(b[1] - drag))[0][0];
    setDrag(null); onSnap(target);
  }

  return (
    <aside ref={el} aria-label="Places"
      className={`sheet absolute inset-x-0 top-0 z-10 flex flex-col overflow-hidden rounded-t-[28px] border border-hairline md:inset-y-4 md:left-4 md:right-auto md:!h-auto md:w-[400px] md:rounded-[28px] ${drag !== null ? "dragging" : ""}`}
      style={{ height: H ? H - full : "100%", transform: H ? `translate3d(0,${off}px,0)` : "translate3d(0,50%,0)" }}>
      <div onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
        className="flex w-full cursor-grab justify-center pb-1.5 pt-2.5 md:hidden" role="button" tabIndex={0} aria-label="Resize list"
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSnap(snap === "full" ? "peek" : snap === "peek" ? "half" : "full"); }}>
        <span className="h-1.5 w-10 rounded-full bg-ink-3/40" />
      </div>
      <div className="flex min-h-0 flex-1 flex-col pb-[var(--pb)] md:pb-0" style={{ ["--pb" as string]: `${H ? offsets[snap] : 0}px` }}>{children}</div>
    </aside>
  );
}
