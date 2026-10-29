import type { Metadata } from "next";
import QuickAdd from "@/components/QuickAdd";
export const metadata: Metadata = { title: "Quick add a masjid", description: "Add a missing mosque, dargah, idgah or prayer room in 30 seconds from your phone." };
export default function Add() {
  return (
    <main className="mx-auto max-w-md space-y-3 p-4">
      <h1 className="text-2xl font-bold">Quick add</h1>
      <p className="text-sm text-gray-600">Standing at a masjid or prayer room that is missing? Add it in 30 seconds. It is reviewed before it goes live.</p>
      <QuickAdd />
    </main>
  );
}
