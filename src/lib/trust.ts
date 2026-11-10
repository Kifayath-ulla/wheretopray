import type { Place } from "./types";

/**
 * Where a listing's information comes from. Being on a map is not the same as
 * confirmed visitor access, so imported records are never called "verified".
 */
export type Provenance = "community" | "imported";

const OPEN_DATA = new Set(["osm", "overture", "wikidata", "geonames"]);

export function provenance(p: Pick<Place, "source" | "sources">): Provenance {
  const all = [p.source, ...(p.sources ?? [])];
  if (all.some((s) => s && !OPEN_DATA.has(s))) return "community";
  return "imported";
}

export function provenanceText(p: Pick<Place, "source" | "sources" | "last_verified">): { title: string; body: string; dateLabel: string } {
  if (provenance(p) === "community") {
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
