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
import DistanceFromMe from "@/components/DistanceFromMe";
import { IconBack, IconChevron, IconCompass, IconDirections, IconGlobe, IconPhone } from "@/components/ui/Icons";

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
  const actions: { href: string; label: string; Icon: typeof IconDirections; primary?: boolean; ext?: boolean }[] = [
    { href: `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`, label: "Directions", Icon: IconDirections, primary: true, ext: true },
    { href: "/qibla", label: `Qibla ${qb.toFixed(0)}°`, Icon: IconCompass },
    ...(p.phone ? [{ href: `tel:${p.phone}`, label: "Call", Icon: IconPhone }] : []),
    ...(p.website ? [{ href: p.website, label: "Website", Icon: IconGlobe, ext: true }] : []),
  ];
  const facts: [string, string, boolean?][] = [
    ...([["Women's area", p.women_section], ["Wudu", p.wudu], ["Parking", p.parking], ["Wheelchair access", p.wheelchair]] as const).map(([k, v]) => [k, yesNo(v), v === true] as [string, string, boolean]),
    ...(p.denomination ? [["Denomination", p.denomination] as [string, string]] : []),
    ...(p.jumuah_time ? [["Jumu'ah", p.jumuah_time] as [string, string]] : []),
  ];
  return (
    <main className="mx-auto max-w-2xl px-5 pb-16 pt-5">
      <Link href="/" className="inline-flex items-center gap-1 text-[15px] font-medium text-accent-text"><IconBack /> Explore</Link>
      <header className="animate-sheet pb-7 pt-6">
        <div className="flex flex-wrap items-center gap-2 text-[13px] font-medium">
          <span className="inline-flex items-center gap-1.5" style={{ color }}><span className="h-2 w-2 rounded-full" style={{ background: color }} />{TYPE_LABEL[p.type]}</span>
          <DistanceFromMe lat={p.lat} lng={p.lng} />
        </div>
        <h1 className="mt-2 text-[2.1rem] font-semibold leading-[1.08] tracking-[-0.03em] sm:text-[2.6rem]">{p.name}</h1>
        {p.name_local && <p className="mt-1 text-lg text-ink-2">{p.name_local}</p>}
        <p className="mt-2 text-[15px] text-ink-2">{p.area ? `${p.area}, ` : ""}{p.city}{p.state ? `, ${p.state}` : ""}</p>
        {p.address && <p className="mt-0.5 text-[14px] text-ink-3">{p.address}</p>}
        <div className={`mt-6 grid gap-2.5 ${actions.length > 3 ? "grid-cols-4" : actions.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {actions.map(({ href, label, Icon, primary, ext }) => (
            <a key={label} href={href} {...(ext ? { target: "_blank", rel: "noreferrer" } : {})}
              className={`press flex flex-col items-center justify-center gap-1.5 rounded-[18px] py-3.5 text-[13px] font-medium ${primary ? "bg-accent text-[var(--on-accent)] hover:bg-[var(--accent-hover)]" : "bg-surface text-ink shadow-[inset_0_0_0_1px_var(--hairline)] hover:bg-surface-2"}`}>
              <Icon className="h-[22px] w-[22px]" />{label}
            </a>
          ))}
        </div>
      </header>

      <div className="space-y-8">
        <PrayerTimes lat={p.lat} lng={p.lng} />

        <section data-testid="qibla">
          <h2 className="section-title">{p.type === "prayer_room" ? "Prayer direction" : "Qibla"}</h2>
          <div className="card flex items-center gap-5 p-5">
            <svg width="84" height="84" viewBox="-38 -38 76 76" aria-label={`Prayer direction ${qb.toFixed(0)} degrees`} className="shrink-0">
              <circle r="36" fill="none" stroke="var(--hairline)" />
              {Array.from({ length: 36 }, (_, i) => <line key={i} x1="0" y1="-33" x2="0" y2={i % 9 === 0 ? -28 : -31} stroke="var(--text-3)" strokeWidth={i % 9 === 0 ? 1.4 : 0.6} transform={`rotate(${i * 10})`} />)}
              <text y="-18" textAnchor="middle" fontSize="8" fill="var(--mark-north)" fontWeight="600">N</text>
              <g transform={`rotate(${qb.toFixed(1)})`}><path d="M0,-27 L5,-8 L0,-11 L-5,-8 Z" fill="var(--accent)" /><line y1="-8" y2="14" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" /></g>
              <circle r="2.5" fill="var(--text)" />
            </svg>
            <div className="min-w-0 text-[14px]">
              <div className="font-mono text-[28px] font-medium leading-none tracking-[-0.02em]">{qb.toFixed(1)}° <span className="font-sans text-base font-normal text-ink-2">{compassPoint(qb)}</span></div>
              <p className="mt-2 text-ink-2">Clockwise from true north. The Kaaba is {kaabaKm.toLocaleString()} km away.</p>
              {p.type === "prayer_room" && <p className="text-ink-2">Face the arrow when the top of the dial points north.</p>}
              <Link href="/qibla" className="mt-1.5 inline-flex items-center gap-0.5 font-medium text-accent-text">Open live compass <IconChevron /></Link>
            </div>
          </div>
        </section>

        <section>
          <h2 className="section-title">Details</h2>
          <dl className="group-list text-[15px]">
            {facts.map(([k, v, yes]) => (
              <div key={k} className="list-row justify-between"><dt className="text-ink-2">{k}</dt><dd className={`font-medium ${yes ? "text-accent-text" : v === "Unknown" ? "text-ink-3" : ""}`}>{v}</dd></div>
            ))}
          </dl>
        </section>

        <section>
          <h2 className="section-title">Open in</h2>
          <div className="group-list text-[15px]">
            <a className="list-row justify-between" href={`https://maps.apple.com/?daddr=${p.lat},${p.lng}&q=${encodeURIComponent(p.name)}`} target="_blank" rel="noreferrer">Apple Maps <IconChevron className="h-4 w-4 text-ink-3" /></a>
            <a className="list-row justify-between" href={`https://www.openstreetmap.org/directions?to=${p.lat}%2C${p.lng}`} target="_blank" rel="noreferrer">OpenStreetMap <IconChevron className="h-4 w-4 text-ink-3" /></a>
          </div>
        </section>

        <details className="card group">
          <summary className="list-row cursor-pointer justify-between text-[15px] font-medium">Report a fix <span className="text-ink-3 transition-transform group-open:rotate-90"><IconChevron /></span></summary>
          <div className="border-t border-hairline p-5"><SubmissionForm kind="fix" placeId={p.id} placeName={p.name} /></div>
        </details>
        <p className="px-1 text-[12px] leading-relaxed text-ink-3">
          Sources:{" "}
          {Object.entries(srcIds).map(([s, ids], i) => {
            const meta = SOURCES[s] ?? { label: s, license: "", url: () => null };
            const u = meta.url(ids[0]);
            return <span key={s}>{i > 0 && "; "}{u ? <a href={u} className="underline" target="_blank" rel="noreferrer">{meta.label}</a> : meta.label} ({meta.license})</span>;
          })}
          . Area names © OpenStreetMap contributors. Last verified {p.last_verified.slice(0, 10)}.
        </p>
      </div>
    </main>
  );
}
