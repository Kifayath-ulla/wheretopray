export type PlaceType = "mosque" | "dargah" | "idgah" | "musalla" | "prayer_room";

export interface Place {
  id: string;
  slug: string;
  name: string;
  name_local?: string | null;
  type: PlaceType;
  lat: number;
  lng: number;
  address?: string | null;
  area?: string | null;
  city: string;
  state: string;
  country: string;
  denomination?: string | null;
  women_section?: boolean | null;
  wudu?: boolean | null;
  parking?: boolean | null;
  wheelchair?: boolean | null;
  phone?: string | null;
  website?: string | null;
  jumuah_time?: string | null;
  iqama_times?: Record<string, string> | null;
  /** exact = mapped point (OSM/admin); listing = business-listing pin; approximate = coarse/snapped */
  location_quality?: "exact" | "listing" | "approximate" | null;
  source: string;
  source_id: string;
  sources?: string[];
  source_ids?: Record<string, string[]>;
  last_verified: string;
  status: "pending" | "verified";
}

export const PLACE_TYPES: { value: PlaceType; label: string }[] = [
  { value: "mosque", label: "Mosque / Masjid" },
  { value: "dargah", label: "Dargah" },
  { value: "idgah", label: "Idgah" },
  { value: "musalla", label: "Musalla" },
  { value: "prayer_room", label: "Prayer room" },
];
