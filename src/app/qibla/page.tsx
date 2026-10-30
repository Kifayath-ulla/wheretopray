import type { Metadata } from "next";
import QiblaCompass from "@/components/QiblaLazy";

export const metadata: Metadata = { title: "Qibla direction finder", description: "Live qibla compass: the great-circle direction to the Kaaba from where you are, in degrees, with distance." };

export default function QiblaPage() {
  return (
    <main className="mx-auto max-w-md px-5 pb-16 pt-10">
      <h1 className="page-title text-center">Qibla</h1>
      <p className="mt-2 text-center text-[15px] text-ink-2">The direction of the Kaaba from where you are.</p>
      <div className="mt-8"><QiblaCompass /></div>
      <p className="mt-10 text-center text-[12px] leading-relaxed text-ink-3">Bearing is the initial great-circle direction to the Kaaba (21.4225, 39.8262), measured clockwise from true north. Phone compasses can be off by several degrees near metal or electronics.</p>
    </main>
  );
}
