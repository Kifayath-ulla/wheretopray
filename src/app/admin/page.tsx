import type { Metadata } from "next";
import AdminQueue from "@/components/AdminQueue";
import AdminPlaces from "@/components/AdminPlaces";
import AdminPending from "@/components/AdminPending";
export const metadata: Metadata = { title: "Moderation", robots: { index: false } };
export default function Admin() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 p-4">
      <section className="space-y-4"><h1 className="text-2xl font-bold">Moderation queue</h1><AdminQueue /></section>
      <section className="space-y-4"><h2 className="text-xl font-bold">Pending imported places</h2><AdminPending /></section>
      <section className="space-y-4"><h2 className="text-xl font-bold">Edit or delete places</h2><AdminPlaces /></section>
    </main>
  );
}
