import { FEATURES, TLDR, WHY } from "@/lib/copy";
export default function SummaryCard() {
  return (
    <section className="card space-y-3 p-5" aria-label="What wheretopray does">
      <p className="text-[17px] leading-relaxed">{TLDR}</p>
      <p className="text-[15px] font-medium text-accent-text">{WHY}</p>
      <ul className="list-disc space-y-1 pl-5 text-[15px] text-ink-2">{FEATURES.map((f) => <li key={f}>{f}</li>)}</ul>
    </section>
  );
}
