import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { repo } from "@/lib/data";
import PrayerTimes from "@/components/PrayerTimes";
import SubmissionForm from "@/components/SubmissionForm";

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
  const osmUrl = p.source === "osm" ? `https://www.openstreetmap.org/${p.source_id}` : null;
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
        <a className="rounded-lg bg-emerald-700 px-3 py-2 text-white" href={`https://www.openstreetmap.org/directions?to=${p.lat}%2C${p.lng}`} target="_blank" rel="noreferrer">Directions</a>
        <a className="rounded-lg border px-3 py-2" href={`geo:${p.lat},${p.lng}?q=${p.lat},${p.lng}(${encodeURIComponent(p.name)})`}>Open in maps app</a>
        {p.phone && <a className="rounded-lg border px-3 py-2" href={`tel:${p.phone}`}>Call</a>}
        {p.website && <a className="rounded-lg border px-3 py-2" href={p.website} target="_blank" rel="noreferrer">Website</a>}
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
        Source: {osmUrl ? <a href={osmUrl} className="underline" target="_blank" rel="noreferrer">OpenStreetMap {p.source_id}</a> : p.source} - © OpenStreetMap contributors. Last verified {p.last_verified.slice(0, 10)}.
      </p>
    </main>
  );
}
