"use client";
import { useEffect, useRef, useState } from "react";

type Snap = "peek" | "half" | "full";

// One bottom sheet with a drag handle and three snap points. Moves with transform only.
// Peek height tracks the sticky chrome (search / Near me) so those controls stay reachable
// without scrolling the list back to the top.
export default function BottomSheet({ snap, onSnap, children }: { snap: Snap; onSnap: (s: Snap) => void; children: React.ReactNode }) {
  const el = useRef<HTMLElement>(null);
  const handle = useRef<HTMLDivElement>(null);
  const [H, setH] = useState(0);
  const [peekH, setPeekH] = useState(168);
  const [drag, setDrag] = useState<number | null>(null);
  const start = useRef({ y: 0, off: 0, t: 0 });

  useEffect(() => {
    const p = el.current?.parentElement;
    if (!p) return;
    const measure = () => {
      const parentH = p.clientHeight;
      setH(parentH);
      const chrome = el.current?.querySelector<HTMLElement>("[data-sheet-chrome]");
      const hh = handle.current?.offsetHeight ?? 28;
      const ch = chrome?.offsetHeight ?? 140;
      // Fit the chrome, but leave at least ~45% of the map visible.
      const fitted = hh + ch + 4;
      const capped = Math.round(parentH * 0.55);
      setPeekH(Math.min(capped, Math.max(148, fitted)));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(p);
    const chrome = el.current?.querySelector("[data-sheet-chrome]");
    if (chrome) ro.observe(chrome);
    measure();
    return () => ro.disconnect();
  }, []);

  const full = 8;
  const half = Math.round(H * 0.52);
  const peek = Math.max(0, H - peekH);
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
    const dy = e.clientY - start.current.y;
    const v = dy / Math.max(1, performance.now() - start.current.t);
    let target: Snap;
    if (Math.abs(dy) < 6) target = snap === "full" ? "half" : snap === "half" ? "full" : "half";
    else if (v > 0.5) target = drag > half ? "peek" : "half";
    else if (v < -0.5) target = drag < half ? "full" : "half";
    else target = (Object.entries(offsets) as [Snap, number][]).sort((a, b) => Math.abs(a[1] - drag) - Math.abs(b[1] - drag))[0][0];
    setDrag(null);
    onSnap(target);
  }

  return (
    <aside
      ref={el}
      aria-label="Places"
      className={`sheet absolute inset-x-0 top-0 z-10 flex flex-col overflow-hidden rounded-t-[28px] border border-hairline md:inset-y-4 md:left-4 md:right-auto md:!h-auto md:w-[400px] md:rounded-[28px] ${drag !== null ? "dragging" : ""}`}
      style={{ height: H ? H - full : "100%", transform: H ? `translate3d(0,${off}px,0)` : "translate3d(0,50%,0)" }}
      data-snap={snap}
    >
      <div
        ref={handle}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        className="flex w-full shrink-0 cursor-grab touch-none justify-center pb-1 pt-3 md:hidden"
        role="button"
        tabIndex={0}
        aria-label={snap === "full" ? "Collapse list" : "Expand list"}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onSnap(snap === "full" ? "peek" : snap === "peek" ? "half" : "full");
        }}
      >
        <span className="h-1.5 w-12 rounded-full bg-ink-3/40" aria-hidden />
      </div>
      {/*
        Visible content height = parentH - translateY. Padding-bottom mirrors the translate so the
        flex children (sticky chrome + one scroller) layout inside the visible band only.
      */}
      <div className="flex min-h-0 flex-1 flex-col md:pb-0" style={{ paddingBottom: H ? offsets[snap] : 0 }}>
        {children}
      </div>
    </aside>
  );
}
