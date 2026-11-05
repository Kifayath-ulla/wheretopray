import type { Metadata } from "next";
import QuickAdd from "@/components/QuickAdd";
import TimetableShare from "@/components/TimetableShare";
export const metadata: Metadata = { title: "Quick add a masjid", description: "Add a missing mosque, dargah, idgah or prayer room in 30 seconds from your phone." };
export default function Add() {
  return (
    <main className="mx-auto max-w-md space-y-4 px-4 pb-10 pt-6">
      <h1 className="page-title">Quick add</h1>
      <p className="text-[15px] text-ink-2">Standing at a masjid or prayer room that is missing? Add it in 30 seconds. It is reviewed before it goes live.</p>
      <QuickAdd />
      <details className="card group p-5">
        <summary className="cursor-pointer font-semibold">Share the masjid timetable (optional)</summary>
        <div className="mt-4"><TimetableShare /></div>
      </details>
    </main>
  );
}
