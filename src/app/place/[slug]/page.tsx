import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { repo } from "@/lib/data";
import PrayerTimes from "@/components/PrayerTimes";
import SubmissionForm from "@/components/SubmissionForm";
import { compassPoint, qiblaBearing, KAABA } from "@/lib/qibla";
import { distanceKm } from "@/lib/geo";
import { SOURCES } from "@/lib/sources";

export const revalidate = 60;
export const dynamicParams = true;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await repo.listPlaces()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await repo.getPlace((await params).slug);
  if (!p) return {};
  return { title: `${p.name} - ${p.city}`, description: `${p.name}, ${p.type.replace("_", " ")} in ${p.area ? p.area + ", " : ""}${p.city}. Location, facilities and prayer times.` };
}

const yesNo = (v?: boolean | null) => (v === true ? "Yes" : v === false ? "No" : "Unknown");

export default async function PlacePage({ params }: Props) {
  const p = await repo.getPlace((await params).slug);
  if (!p) notFound();
  const qb = qiblaBearing(p.lat, p.lng);
  const srcIds = p.source_ids ?? { [p.source]: [p.source_id] };
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <Link href="/" className="text-sm text-emerald-700">Back to map</Link>
      <div>
        <h1 className="text-2xl font-bold">{p.name}</h1>
        {p.name_local && <p className="text-gray-600">{p.name_local}</p>}
        <p className="text-sm capitalize text-gray-600">{p.type.replace("_", " ")} - {p.area ? `${p.area}, ` : ""}{p.city}</p>
        {p.address && <p className="mt-1 text-sm">{p.address}</p>}
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        <a className="rounded-lg bg-emerald-700 px-3 py-2 text-white" href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`} target="_blank" rel="noreferrer">Directions (Google Maps)</a>
        <a className="rounded-lg border px-3 py-2" href={`https://maps.apple.com/?daddr=${p.lat},${p.lng}&q=${encodeURIComponent(p.name)}`} target="_blank" rel="noreferrer">Apple Maps</a>
        <a className="rounded-lg border px-3 py-2" href={`https://www.openstreetmap.org/directions?to=${p.lat}%2C${p.lng}`} target="_blank" rel="noreferrer">OSM</a>
        {p.phone && <a className="rounded-lg border px-3 py-2" href={`tel:${p.phone}`}>Call</a>}
        {p.website && <a className="rounded-lg border px-3 py-2" href={p.website} target="_blank" rel="noreferrer">Website</a>}
      </div>
      <div className="flex items-center gap-4 rounded-xl border p-4" data-testid="qibla">
        <svg width="64" height="64" viewBox="-32 -32 64 64" aria-label={`Prayer direction ${qb.toFixed(0)} degrees`}>
          <circle r="30" fill="#ecfdf5" stroke="#047857" />
          <text y="-20" textAnchor="middle" fontSize="9" fill="#dc2626" fontWeight="bold">N</text>
          <g transform={`rotate(${qb.toFixed(1)})`}><path d="M0,-24 L6,-10 L2,-10 L2,14 L-2,14 L-2,-10 L-6,-10 Z" fill="#047857" /></g>
        </svg>
        <div className="text-sm">
          <div className="font-semibold">{p.type === "prayer_room" ? "Prayer direction (qibla)" : "Qibla direction"}: {qb.toFixed(1)}° ({compassPoint(qb)})</div>
          <div className="text-gray-600">Clockwise from true north. Kaaba is {Math.round(distanceKm(p.lat, p.lng, KAABA.lat, KAABA.lng)).toLocaleString()} km away.</div>
          {p.type === "prayer_room" && <div className="text-gray-600">Face the arrow when the top of the dial points north.</div>}
          <Link href="/qibla" className="text-emerald-700 underline">Live compass</Link>
        </div>
      </div>
      <PrayerTimes lat={p.lat} lng={p.lng} />
      <div className="rounded-xl border p-4 text-sm">
        <h2 className="mb-2 font-semibold">Facilities</h2>
        <ul className="grid grid-cols-2 gap-1">
          <li>Women&apos;s area: {yesNo(p.women_section)}</li><li>Wudu: {yesNo(p.wudu)}</li>
          <li>Parking: {yesNo(p.parking)}</li><li>Wheelchair: {yesNo(p.wheelchair)}</li>
          {p.denomination && <li>Denomination: {p.denomination}</li>}
          {p.jumuah_time && <li>Jumu&apos;ah: {p.jumuah_time}</li>}
        </ul>
      </div>
      <details className="rounded-xl border p-4">
        <summary className="cursor-pointer font-semibold">Report a fix</summary>
        <div className="mt-3"><SubmissionForm kind="fix" placeId={p.id} placeName={p.name} /></div>
      </details>
      <p className="text-xs text-gray-500">
        Sources:{" "}
        {Object.entries(srcIds).map(([s, ids], i) => {
          const meta = SOURCES[s] ?? { label: s, license: "", url: () => null };
          const u = meta.url(ids[0]);
          return <span key={s}>{i > 0 && "; "}{u ? <a href={u} className="underline" target="_blank" rel="noreferrer">{meta.label}</a> : meta.label} ({meta.license})</span>;
        })}
        . Area names © OpenStreetMap contributors. Last verified {p.last_verified.slice(0, 10)}.
      </p>
    </main>
  );
}
