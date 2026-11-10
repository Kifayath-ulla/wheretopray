import type { Place } from "./types";

/**
 * Where a listing's information comes from. Being on a map is not the same as
 * confirmed visitor access, so imported records are never called "verified".
 */
export type Provenance = "confirmed" | "community" | "imported";

const OPEN_DATA = new Set(["osm", "overture", "wikidata", "geonames"]);

export function provenance(p: Pick<Place, "source" | "sources"> & { access_confirmed_at?: string | null }): Provenance {
  if (p.access_confirmed_at) return "confirmed";
  const all = [p.source, ...(p.sources ?? [])];
  if (all.some((s) => s && !OPEN_DATA.has(s))) return "community";
  return "imported";
}

export function provenanceText(p: Pick<Place, "source" | "sources" | "last_verified"> & { access_confirmed_at?: string | null }): { title: string; body: string; dateLabel: string } {
  const kind = provenance(p);
  if (kind === "confirmed") {
    return {
      title: `Visitor access confirmed ${p.access_confirmed_at!.slice(0, 10)}`,
      body: "Our team checked who can pray here. Things change, so use Report a fix if it is different when you visit.",
      dateLabel: "Last updated",
    };
  }
  if (kind === "community") {
    return {
      title: "Added by the community",
      body: "Reviewed by our moderators before it went live. Details come from the person who added it.",
      dateLabel: "Last updated",
    };
  }
  return {
    title: "From open map data",
    body: "This place is on public maps. Nobody has confirmed visitor access, timings or facilities here yet. If you pray here, use Report a fix to add what you know.",
    dateLabel: "Imported",
  };
}
