import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { repo } from "@/lib/data";
import { isAdmin } from "@/lib/admin";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req.headers.get("x-admin-token"))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { status } = await req.json();
  if (!["pending", "approved", "rejected"].includes(status)) return NextResponse.json({ error: "Bad status" }, { status: 400 });
  const s = await repo.setSubmissionStatus(id, status);
  if (s) revalidatePath("/", "layout");
  return s ? NextResponse.json(s) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
