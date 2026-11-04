import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { repo } from "@/lib/data";
import PrayerTimes from "@/components/PrayerTimes";
import SubmissionForm from "@/components/SubmissionForm";
import { compassPoint, qiblaBearing, KAABA } from "@/lib/qibla";
import { distanceKm } from "@/lib/geo";
import { SOURCES } from "@/lib/sources";
import { TYPE_COLOR, TYPE_LABEL } from "@/lib/typeStyle";
import PlaceSpot from "@/components/PlaceSpotLazy";
import { mapLinks } from "@/lib/maplinks";
import DistanceFromMe from "@/components/DistanceFromMe";
import { IconBack, IconChevron, IconCompass, IconDirections } from "@/components/ui/Icons";

export const revalidate = 60;
export const dynamicParams = true;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return []; // rendered on demand and cached; ~21k pages are too many to prebuild
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
  const kaabaKm = Math.round(distanceKm(p.lat, p.lng, KAABA.lat, KAABA.lng));
  const color = TYPE_COLOR[p.type];
  const ml = mapLinks(p);
  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 pb-10 pt-4">
      <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium text-accent-text"><IconBack /> Explore</Link>
      <section className="card animate-sheet overflow-hidden">
        <div className="h-1.5" style={{ background: color }} />
        <div className="space-y-4 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip" style={{ background: `${color}1f`, color }}>{TYPE_LABEL[p.type]}</span>
            <DistanceFromMe lat={p.lat} lng={p.lng} />
          </div>
          <div>
            <h1 className="text-[2rem] font-bold leading-tight tracking-tight sm:text-4xl">{p.name}</h1>
            {p.name_local && <p className="mt-1 text-lg text-ink-2">{p.name_local}</p>}
            <p className="mt-2 text-[15px] text-ink-2">{p.area ? `${p.area}, ` : ""}{p.city}{p.state ? `, ${p.state}` : ""}</p>
            {p.address && <p className="mt-1 text-sm text-ink-3">{p.address}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <a className="btn btn-primary py-3.5 text-base" href={ml.googleDir} target="_blank" rel="noreferrer"><IconDirections /> Directions</a>
            <Link className="btn btn-tinted py-3.5 text-base" href="/qibla"><IconCompass className="h-5 w-5" /> Qibla {qb.toFixed(0)}°</Link>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <a className="chip" href={ml.appleDir} target="_blank" rel="noreferrer">Apple Maps</a>
            <a className="chip" href={ml.osmDir} target="_blank" rel="noreferrer">OpenStreetMap</a>
            {p.phone && /^[+\d][\d\s()-]{4,20}$/.test(p.phone) && <a className="chip" href={`tel:${p.phone.replace(/[^\d+]/g, "")}`}>Call</a>}
            {p.website && /^https?:\/\//i.test(p.website) && <a className="chip" href={p.website} target="_blank" rel="noopener noreferrer nofollow">Website</a>}
          </div>
        </div>
      </section>

      <PlaceSpot lat={p.lat} lng={p.lng} name={p.name} quality={p.location_quality} color={color} />

      <PrayerTimes lat={p.lat} lng={p.lng} jamaat={p.iqama_times} jumuah={p.jumuah_time} />

      <section className="card flex items-center gap-5 p-5" data-testid="qibla">
        <svg width="76" height="76" viewBox="-38 -38 76 76" aria-label={`Prayer direction ${qb.toFixed(0)} degrees`} className="shrink-0">
          <circle r="36" fill="var(--surface-2)" />
          {Array.from({ length: 36 }, (_, i) => <line key={i} x1="0" y1="-33" x2="0" y2={i % 9 === 0 ? -28 : -31} stroke="var(--text-3)" strokeWidth={i % 9 === 0 ? 1.4 : 0.6} transform={`rotate(${i * 10})`} />)}
          <text y="-18" textAnchor="middle" fontSize="8" fill="#ff3b30" fontWeight="700">N</text>
          <g transform={`rotate(${qb.toFixed(1)})`}><path d="M0,-27 L5,-8 L0,-11 L-5,-8 Z" fill="var(--accent)" /><line y1="-8" y2="14" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" /></g>
          <circle r="2.5" fill="var(--text)" />
        </svg>
        <div className="text-sm">
          <div className="eyebrow">{p.type === "prayer_room" ? "Prayer direction" : "Qibla"}</div>
          <div className="text-2xl font-semibold tracking-tight">{qb.toFixed(1)}° <span className="text-base font-normal text-ink-2">{compassPoint(qb)}</span></div>
          <div className="text-ink-2">Clockwise from true north. Kaaba is {kaabaKm.toLocaleString()} km away.</div>
          {p.type === "prayer_room" && <div className="text-ink-2">Face the arrow when the top of the dial points north.</div>}
          <Link href="/qibla" className="mt-1 inline-block font-medium text-accent-text">Open live compass</Link>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-lg font-semibold">Facilities</h2>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          {([["Women's area", p.women_section], ["Wudu", p.wudu], ["Parking", p.parking], ["Wheelchair", p.wheelchair]] as const).map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-surface-2 px-3 py-2.5"><dt className="text-xs text-ink-3">{k}</dt><dd className={`font-medium ${v === true ? "text-accent-text" : ""}`}>{yesNo(v)}</dd></div>
          ))}
          {p.denomination && <div className="rounded-2xl bg-surface-2 px-3 py-2.5"><dt className="text-xs text-ink-3">Denomination</dt><dd className="font-medium">{p.denomination}</dd></div>}
        </dl>
      </section>

      <details className="card group p-5">
        <summary className="flex cursor-pointer items-center justify-between font-semibold">Report a fix <span className="text-ink-3 transition-transform group-open:rotate-90"><IconChevron /></span></summary>
        <div className="mt-4"><SubmissionForm kind="fix" placeId={p.id} placeName={p.name} /></div>
      </details>
      <p className="px-1 text-xs text-ink-3">
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
