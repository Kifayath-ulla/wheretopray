import type { Metadata } from "next";
import SubmissionForm from "@/components/SubmissionForm";
export const metadata: Metadata = { title: "Add a place" };
export default function Submit() {
  return (
    <main className="mx-auto max-w-xl space-y-4 p-4">
      <h1 className="text-2xl font-bold">Add a mosque, dargah or prayer room</h1>
      <p className="text-sm text-gray-600">Submissions are reviewed before they appear. Mosque admins can add iqama and Jumu&apos;ah times in the notes.</p>
      <SubmissionForm kind="new_place" />
    </main>
  );
}
