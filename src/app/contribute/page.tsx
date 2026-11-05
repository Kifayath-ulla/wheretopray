import type { Metadata } from "next";
import {
  CONTRIBUTE_TLDR,
  GOOGLE_CONTRIBUTE_FORM,
  GOOGLE_CONTRIBUTE_FORM_SHORT,
  TLDR,
} from "@/lib/copy";

export const metadata: Metadata = {
  title: "Contribute",
  description: CONTRIBUTE_TLDR,
};

const EMBED = `${GOOGLE_CONTRIBUTE_FORM}?embedded=true`;

export default function Contribute() {
  return (
    <main className="mx-auto max-w-xl space-y-4 px-4 pb-8 pt-4">
      <h1 className="text-3xl font-bold tracking-tight">Contribute</h1>
      <section className="card space-y-2 p-5 text-[15px] leading-relaxed">
        <p>{TLDR}</p>
        <p className="text-ink-2">{CONTRIBUTE_TLDR}</p>
      </section>
      <a
        href={GOOGLE_CONTRIBUTE_FORM_SHORT}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-primary flex h-14 w-full items-center justify-center text-base"
      >
        Open the form in a new tab
      </a>
      <div className="overflow-hidden rounded-2xl border border-hairline bg-surface">
        <iframe
          title="wheretopray contribute form"
          src={EMBED}
          className="block w-full border-0"
          style={{ height: "min(72vh, 1100px)", minHeight: 640 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <p className="text-sm text-ink-2">
        If the form does not load, use the button above. Responses go to our Google Form, not this site.
      </p>
    </main>
  );
}
