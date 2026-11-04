import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { repo, RateLimitError } from "@/lib/data";
import { ipHash, verifyTurnstile } from "@/lib/spam";
import { MAX_PHOTO, sniffImage, uploadPhoto } from "@/lib/timetable";

const MIN_FILL_MS = 3000;
const s = (v: FormDataEntryValue | null, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

export async function POST(req: Request) {
  if (!(req.headers.get("content-type") ?? "").includes("multipart/form-data")) return NextResponse.json({ error: "Invalid submission" }, { status: 415 });
  if (Number(req.headers.get("content-length") ?? 0) > MAX_PHOTO + 64_000) return NextResponse.json({ error: "Photo must be 2 MB or smaller." }, { status: 413 });
  const f = await req.formData().catch(() => null);
  if (!f) return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
  if (s(f.get("website"), 200)) return NextResponse.json({ ok: true, id: "ignored" }); // honeypot
  const started = Number(s(f.get("started_at"), 20));
  if (!isFinite(started) || Date.now() - started < MIN_FILL_MS || Date.now() - started > 24 * 3600e3)
    return NextResponse.json({ error: "That was quick. Please wait a few seconds and submit again." }, { status: 400 });
  if (!(await verifyTurnstile(s(f.get("turnstile"), 4000) || undefined, req)))
    return NextResponse.json({ error: "Captcha check failed. Please try again." }, { status: 400 });

  const placeId = s(f.get("place_id"), 100) || null;
  const placeName = s(f.get("place_name"), 150);
  if (!placeId && placeName.length < 3) return NextResponse.json({ error: "Please enter the masjid name." }, { status: 400 });
  const link = s(f.get("link"), 500);
  const photo = f.get("photo");
  const hasPhoto = photo instanceof File && photo.size > 0;
  if (!!link === hasPhoto) return NextResponse.json({ error: "Add either a link or a photo." }, { status: 400 });

  const payload: Record<string, string> = {};
  if (placeName) payload.place_name = placeName;
  const notes = s(f.get("notes"), 500); if (notes) payload.notes = notes;
  if (link) {
    let u: URL;
    try { u = new URL(link); } catch { return NextResponse.json({ error: "That link doesn't look valid." }, { status: 400 }); }
    if (u.protocol !== "https:" && u.protocol !== "http:") return NextResponse.json({ error: "Only http or https links." }, { status: 400 });
    payload.link = u.toString();
  }
  let pending: { path: string; bytes: Uint8Array; mime: string } | null = null;
  if (hasPhoto) {
    const file = photo as File;
    if (file.size > MAX_PHOTO) return NextResponse.json({ error: "Photo must be 2 MB or smaller." }, { status: 413 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = sniffImage(bytes);
    if (!kind) return NextResponse.json({ error: "Photo must be a JPG, PNG or WebP image." }, { status: 400 });
    pending = { path: `${randomUUID()}.${kind.ext}`, bytes, mime: kind.mime };
    payload.photo_path = pending.path;
  }
  try {
    // Rate limit and queue first, then store the photo, so rate-limited requests never upload.
    const sub = await repo.addSubmission({ kind: "timetable", place_id: placeId, payload }, ipHash(req));
    if (pending) await uploadPhoto(pending.path, pending.bytes, pending.mime);
    return NextResponse.json({ ok: true, id: sub.id });
  } catch (e) {
    if (e instanceof RateLimitError) return NextResponse.json({ error: "Too many submissions from your network. Please try again in an hour." }, { status: 429 });
    throw e;
  }
}
