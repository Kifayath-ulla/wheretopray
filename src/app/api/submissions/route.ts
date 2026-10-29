import { NextResponse } from "next/server";
import { repo } from "@/lib/data";
import { isAdmin } from "@/lib/admin";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || (body.kind !== "new_place" && body.kind !== "fix") || typeof body.payload !== "object")
    return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
  const payload = Object.fromEntries(
    Object.entries(body.payload as Record<string, unknown>).slice(0, 30).map(([k, v]) => [k.slice(0, 40), String(v ?? "").slice(0, 1000)]),
  );
  if (body.kind === "new_place" && !payload.name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  const sub = await repo.addSubmission({ kind: body.kind, place_id: body.place_id ?? null, payload });
  return NextResponse.json({ ok: true, id: sub.id });
}

export async function GET(req: Request) {
  if (!isAdmin(req.headers.get("x-admin-token"))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await repo.listSubmissions());
}
