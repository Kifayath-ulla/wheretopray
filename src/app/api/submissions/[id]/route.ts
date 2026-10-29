import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { repo } from "@/lib/data";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { status } = await req.json();
  if (!["pending", "approved", "rejected"].includes(status)) return NextResponse.json({ error: "Bad status" }, { status: 400 });
  const s = await repo.setSubmissionStatus(req.headers.get("x-admin-token") ?? "", id, status);
  if (s === "unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (s) { revalidateTag("places"); revalidatePath("/", "layout"); }
  return s ? NextResponse.json(s) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
