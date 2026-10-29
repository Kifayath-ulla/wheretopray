import type { Metadata } from "next";
import AdminQueue from "@/components/AdminQueue";
export const metadata: Metadata = { title: "Moderation", robots: { index: false } };
export default function Admin() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <h1 className="text-2xl font-bold">Moderation queue</h1>
      <AdminQueue />
    </main>
  );
}
