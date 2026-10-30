import type { Metadata } from "next";
import QiblaCompass from "@/components/QiblaLazy";

export const metadata: Metadata = { title: "Qibla direction finder", description: "Live qibla compass: the great-circle direction to the Kaaba from where you are, in degrees, with distance." };

export default function QiblaPage() {
  return (
    <main className="mx-auto max-w-md space-y-5 px-4 pb-10 pt-8">
      <h1 className="page-title">Qibla direction</h1>
      <QiblaCompass />
      <p className="text-xs text-gray-500">Bearing is the initial great-circle direction to the Kaaba (21.4225, 39.8262), measured clockwise from true north. Phone compasses can be off by several degrees near metal or electronics.</p>
    </main>
  );
}
