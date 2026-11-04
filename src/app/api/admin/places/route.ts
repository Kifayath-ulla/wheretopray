import { NextResponse } from "next/server";
import { repo } from "@/lib/data";
import { refreshPlaces } from "@/lib/revalidate";
import { PLACE_TYPES } from "@/lib/types";

const tok = (req: Request) => req.headers.get("x-admin-token") ?? "";

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 100);
  const list = await repo.adminSearch(tok(req), q);
  if (!list) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(list);
}

const STR = ["name", "address", "area", "city", "state", "country", "jumuah_time"] as const;
const BOOL = ["women_section", "wudu", "parking", "wheelchair"] as const;

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.id || typeof body.patch !== "object") return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const p = body.patch as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  for (const k of STR) if (k in p) patch[k] = String(p[k] ?? "").trim().slice(0, 300);
  for (const k of BOOL) if (k in p && (p[k] === true || p[k] === false)) patch[k] = p[k];
  if (p.type && PLACE_TYPES.some((t) => t.value === p.type)) patch.type = p.type;
  if (p.status && ["verified", "pending", "closed"].includes(String(p.status))) patch.status = p.status;
  if ("lat" in p || "lng" in p) {
    const lat = Number(p.lat), lng = Number(p.lng);
    if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return NextResponse.json({ error: "Bad coordinates" }, { status: 400 });
    patch.lat = String(lat); patch.lng = String(lng);
  }
  if (p.iqama_times && typeof p.iqama_times === "object") {
    const t: Record<string, string> = {};
    for (const k of ["fajr", "zuhr", "asr", "maghrib", "isha", "jumuah"]) { const v = String((p.iqama_times as Record<string, unknown>)[k] ?? ""); if (/^([01]?\d|2[0-3]):[0-5]\d$/.test(v)) t[k] = v; }
    patch.iqama_times = t;
  }
  if (patch.name === "") return NextResponse.json({ error: "Name required" }, { status: 400 });
  const r = await repo.adminUpdate(tok(req), String(body.id), patch);
  if (r === "unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
  refreshPlaces(r.slug);
  return NextResponse.json(r);
}

export async function DELETE(req: Request) {
  const u = new URL(req.url);
  const id = u.searchParams.get("id"), slug = u.searchParams.get("slug") ?? undefined;
  if (!id) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const r = await repo.adminDelete(tok(req), id);
  if (r === "unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
  refreshPlaces(slug);
  return NextResponse.json({ ok: true });
}
