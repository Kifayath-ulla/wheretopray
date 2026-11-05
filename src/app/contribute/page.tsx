import type { Metadata } from "next";
import ContributeForm from "@/components/ContributeForm";
import { CONTRIBUTE_TLDR, TLDR } from "@/lib/copy";
export const metadata: Metadata = { title: "Contribute", description: CONTRIBUTE_TLDR };
export default function Contribute() {
  return (
    <main className="mx-auto max-w-md space-y-4 px-4 pb-8 pt-4">
      <h1 className="text-3xl font-bold tracking-tight">Contribute</h1>
      <section className="card space-y-2 p-5 text-[15px] leading-relaxed">
        <p>{TLDR}</p>
        <p className="text-ink-2">{CONTRIBUTE_TLDR} Leave your details and we will reach out.</p>
      </section>
      <ContributeForm />
    </main>
  );
}
