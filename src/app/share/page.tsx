import type { Metadata } from "next";
import QRCode from "qrcode";
import Link from "next/link";
import ShareButtons from "@/components/ShareButtons";
import { FEATURES, META_DESC, TLDR, WHY } from "@/lib/copy";

export const metadata: Metadata = { title: "Share wheretopray", description: META_DESC };
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://wheretopray.netlify.app";
const TEXT = `Assalamu alaikum.

${TLDR}

${WHY}

What it does:
${FEATURES.map((f) => "- " + f).join("\n")}

Open it: ${SITE}
Add a missing masjid: ${SITE}/add
Help out: ${SITE}/contribute

Please share with your masjid committee and jamaat groups. JazakAllah khair.`;

export default async function Share() {
  const qrAdd = await QRCode.toString(`${SITE}/add`, { type: "svg", margin: 1, width: 240 });
  const qrHome = await QRCode.toString(SITE, { type: "svg", margin: 1, width: 240 });
  return (
    <main className="mx-auto max-w-2xl space-y-5 px-4 pb-10 pt-8">
      <h1 className="page-title">Share wheretopray</h1>
      <p className="text-[15px] text-ink-2">Send this on WhatsApp, or print the QR code for the masjid notice board.</p>
      <pre className="card whitespace-pre-wrap break-words [overflow-wrap:anywhere] p-5 text-sm leading-relaxed">{TEXT}</pre>
      <ShareButtons text={TEXT} url={SITE} />
      <p className="text-[15px] text-ink-2">Want to do more? <Link className="link font-medium" href="/contribute">Contribute</Link></p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 print:grid-cols-2">
        <figure className="card p-5 text-center">
          <div className="mx-auto w-60" dangerouslySetInnerHTML={{ __html: qrAdd }} />
          <figcaption className="mt-2 font-medium">Scan to add your masjid</figcaption>
          <p className="text-xs text-gray-500">{SITE.replace("https://", "")}/add</p>
        </figure>
        <figure className="card p-5 text-center">
          <div className="mx-auto w-60" dangerouslySetInnerHTML={{ __html: qrHome }} />
          <figcaption className="mt-2 font-medium">Scan to find a place to pray</figcaption>
          <p className="text-xs text-gray-500">{SITE.replace("https://", "")}</p>
        </figure>
      </div>
    </main>
  );
}
