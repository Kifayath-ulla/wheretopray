import type { Metadata } from "next";
import AdminQueue from "@/components/AdminQueue";
import AdminPlaces from "@/components/AdminPlaces";
import AdminPending from "@/components/AdminPending";
import AdminBulk from "@/components/AdminBulk";
export const metadata: Metadata = { title: "Moderation", robots: { index: false } };
export default function Admin() {
  return (
    <main className="mx-auto max-w-4xl space-y-10 px-4 pb-10 pt-8">
      <section className="space-y-4"><h1 className="page-title">Moderation queue</h1><AdminQueue /></section>
      <section className="space-y-4"><h2 className="text-2xl font-semibold tracking-tight">Bulk upload</h2><AdminBulk /></section>
      <section className="space-y-4"><h2 className="text-2xl font-semibold tracking-tight">Pending imported places</h2><AdminPending /></section>
      <section className="space-y-4"><h2 className="text-2xl font-semibold tracking-tight">Edit or delete places</h2><AdminPlaces /></section>
    </main>
  );
}
