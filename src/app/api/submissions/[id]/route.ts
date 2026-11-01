import { NextResponse } from "next/server";
import { refreshPlaces } from "@/lib/revalidate";
import { repo } from "@/lib/data";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { status } = (await req.json().catch(() => ({}))) as { status?: string };
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  if (!["pending", "approved", "rejected"].includes(status ?? "")) return NextResponse.json({ error: "Bad status" }, { status: 400 });
  const s = await repo.setSubmissionStatus(req.headers.get("x-admin-token") ?? "", id, status as "pending" | "approved" | "rejected");
  if (s === "unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (s) refreshPlaces();
  return s ? NextResponse.json(s) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
