export const SOURCES: Record<string, { label: string; license: string; url: (id: string) => string | null }> = {
  osm: { label: "OpenStreetMap", license: "© OpenStreetMap contributors, ODbL", url: (id) => `https://www.openstreetmap.org/${id}` },
  overture: { label: "Overture Maps Places", license: "Overture Maps Foundation, CDLA-Permissive-2.0", url: () => null },
  wikidata: { label: "Wikidata", license: "CC0", url: (id) => `https://www.wikidata.org/wiki/${id}` },
  geonames: { label: "GeoNames", license: "CC BY 4.0", url: (id) => `https://www.geonames.org/${id}` },
  user: { label: "Community submission", license: "Submitted to wheretopray", url: () => null },
};
