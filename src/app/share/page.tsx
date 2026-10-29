import type { Metadata } from "next";
import QRCode from "qrcode";
import ShareButtons from "@/components/ShareButtons";

export const metadata: Metadata = { title: "Share wheretopray", description: "Help list every masjid, dargah and prayer room in Bengaluru." };
const SITE = "https://wheretopray.vercel.app";
const TEXT = `Assalamu alaikum. wheretopray is a free map of every masjid, dargah, idgah and prayer room in Bengaluru and across India, with qibla, distance and directions.

Is your masjid missing? Add it in 30 seconds from your phone while you are there:
${SITE}/add

See which wards still need help:
${SITE}/bengaluru/gaps

Please forward to your masjid committee and jamaat groups. JazakAllah khair.`;

export default async function Share() {
  const qrAdd = await QRCode.toString(`${SITE}/add`, { type: "svg", margin: 1, width: 240 });
  const qrHome = await QRCode.toString(SITE, { type: "svg", margin: 1, width: 240 });
  return (
    <main className="mx-auto max-w-2xl space-y-5 p-4">
      <h1 className="text-2xl font-bold">Share with your masjid committee</h1>
      <p className="text-sm text-gray-600">Send this on WhatsApp, or print the QR code and put it on the masjid notice board.</p>
      <pre className="whitespace-pre-wrap rounded-xl border bg-gray-50 p-3 text-sm">{TEXT}</pre>
      <ShareButtons text={TEXT} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 print:grid-cols-2">
        <figure className="rounded-xl border p-3 text-center">
          <div className="mx-auto w-60" dangerouslySetInnerHTML={{ __html: qrAdd }} />
          <figcaption className="mt-2 font-medium">Scan to add your masjid</figcaption>
          <p className="text-xs text-gray-500">{SITE.replace("https://", "")}/add</p>
        </figure>
        <figure className="rounded-xl border p-3 text-center">
          <div className="mx-auto w-60" dangerouslySetInnerHTML={{ __html: qrHome }} />
          <figcaption className="mt-2 font-medium">Scan to find a place to pray</figcaption>
          <p className="text-xs text-gray-500">{SITE.replace("https://", "")}</p>
        </figure>
      </div>
    </main>
  );
}
