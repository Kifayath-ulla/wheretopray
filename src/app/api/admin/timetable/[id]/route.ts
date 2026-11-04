import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/adminGuard";
import { isAdmin } from "@/lib/admin";
import { downloadPhoto } from "@/lib/timetable";

// Streams one private timetable photo to the admin. The path is validated against the strict upload format.
async function GET_(req: Request, path: string) {
  if (!isAdmin(req.headers.get("x-admin-token"))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(path)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const r = await downloadPhoto(path);
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const mime = path.endsWith(".png") ? "image/png" : path.endsWith(".webp") ? "image/webp" : "image/jpeg";
  return new Response(r, { headers: { "content-type": mime, "cache-control": "private, no-store", "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'" } });
}
export const GET = async (req: Request, ctx: { params: Promise<{ id: string }> }) => { const { id } = await ctx.params; return withAdmin(req, () => GET_(req, id)); };
