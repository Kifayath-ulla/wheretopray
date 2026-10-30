import type { Metadata } from "next";
import QuickAdd from "@/components/QuickAdd";
export const metadata: Metadata = { title: "Quick add a masjid", description: "Add a missing mosque, dargah, idgah or prayer room in 30 seconds from your phone." };
export default function Add() {
  return (
    <main className="mx-auto max-w-md px-5 pb-16 pt-10">
      <h1 className="page-title">Add a place</h1>
      <p className="mt-3 text-[15px] text-ink-2">Standing at a masjid or prayer room that is missing? Add it in 30 seconds. Every entry is reviewed before it goes live.</p>
      <div className="mt-8"><QuickAdd /></div>
    </main>
  );
}
