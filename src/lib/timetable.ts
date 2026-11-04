// Server-only helpers for the private "timetables" Storage bucket. Access uses short-lived, single-path tickets
// issued through an admin-token RPC, so the public anon key alone can neither write, read nor list the bucket.
import { serverRpc } from "./serverRpc";

const URL_ = () => process.env.NEXT_PUBLIC_SUPABASE_URL!, KEY = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const MAX_PHOTO = 2 * 1024 * 1024;

/** Detects the real image type from magic bytes; returns null when it is not jpg/png/webp. */
export function sniffImage(b: Uint8Array): { ext: "jpg" | "png" | "webp"; mime: string } | null {
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: "png", mime: "image/png" };
  if (b.length > 12 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") return { ext: "webp", mime: "image/webp" };
  return null;
}

export async function uploadPhoto(path: string, bytes: Uint8Array, mime: string) {
  await serverRpc("server_storage_ticket", { p_path: path, p_op: "write" });
  const r = await fetch(`${URL_()}/storage/v1/object/timetables/${path}`, {
    method: "POST", cache: "no-store",
    headers: { apikey: KEY(), Authorization: `Bearer ${KEY()}`, "content-type": mime, "x-upsert": "false" },
    body: Buffer.from(bytes),
  });
  await serverRpc("server_storage_ticket_revoke", { p_path: path }).catch(() => {});
  if (!r.ok) throw new Error(`upload ${r.status}`);
}

export async function downloadPhoto(path: string) {
  await serverRpc("server_storage_ticket", { p_path: path, p_op: "read" });
  const r = await fetch(`${URL_()}/storage/v1/object/authenticated/timetables/${path}`, {
    cache: "no-store", headers: { apikey: KEY(), Authorization: `Bearer ${KEY()}` },
  });
  const body = r.ok ? await r.arrayBuffer() : null;
  await serverRpc("server_storage_ticket_revoke", { p_path: path }).catch(() => {});
  return body;
}
