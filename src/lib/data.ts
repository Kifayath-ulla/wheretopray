/**
 * Data-access layer. With NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY set, places and
 * submissions live in Supabase (see supabase/migrations/0002_supabase_live.sql). Admin actions go
 * through SECURITY DEFINER RPCs that verify the admin token against a hash stored in the database.
 * Without those env vars it falls back to data/places.json + data/queue/submissions.json.
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { PLACE_TYPES, type Place, type PlaceType } from "./types";
import { distanceKm } from "./geo";
import { isAdmin } from "./admin";

export interface Submission {
  id: string;
  kind: "new_place" | "fix";
  place_id?: string | null;
  payload: Record<string, unknown>;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export interface PlaceRepository {
  listPlaces(city?: string): Promise<Place[]>;
  getPlace(slug: string): Promise<Place | null>;
  near(lat: number, lng: number, radiusKm: number): Promise<(Place & { distance_km: number })[]>;
  addSubmission(s: Omit<Submission, "id" | "status" | "created_at">): Promise<Submission>;
  /** Returns null when the admin token is not valid. */
  listSubmissions(token: string): Promise<Submission[] | null>;
  /** Returns "unauthorized" when the admin token is not valid. */
  setSubmissionStatus(token: string, id: string, status: Submission["status"]): Promise<Submission | null | "unauthorized">;
}

const DATA = path.join(process.cwd(), "data");
const QUEUE = path.join(DATA, "queue", "submissions.json");

class JsonRepository implements PlaceRepository {
  private base: Place[] | null = null;
  /** Imported places plus approved community submissions (new places added, fixes applied). */
  private async all(): Promise<Place[]> {
    if (!this.base) this.base = JSON.parse(await fs.readFile(path.join(DATA, "places.json"), "utf8")) as Place[];
    const approved = (await this.readQueue()).filter((s) => s.status === "approved");
    const places = this.base.map((p) => ({ ...p }));
    const byId = new Map(places.map((p) => [p.id, p]));
    const slugs = new Set(places.map((p) => p.slug));
    for (const s of approved) {
      const pl = s.payload as Record<string, string>;
      if (s.kind === "new_place") {
        const lat = parseFloat(pl.lat), lng = parseFloat(pl.lng);
        if (!pl.name || !isFinite(lat) || !isFinite(lng)) continue;
        let slug = pl.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "place";
        if (slugs.has(slug)) slug = `${slug}-${s.id.slice(0, 6)}`;
        slugs.add(slug);
        const type = (PLACE_TYPES.some((t) => t.value === pl.type) ? pl.type : "mosque") as PlaceType;
        places.push({
          id: `user-${s.id}`, slug, name: pl.name, type, lat, lng, address: pl.address || null, area: pl.area || null,
          city: "Bengaluru", state: "Karnataka", country: "IN",
          women_section: pl.women_section === "yes" ? true : null, wudu: pl.wudu === "yes" ? true : null,
          parking: pl.parking === "yes" ? true : null, wheelchair: null, phone: null, website: null,
          jumuah_time: pl.jumuah_time || null, iqama_times: null, source: "user", source_id: s.id, sources: ["user"],
          source_ids: { user: [s.id] }, last_verified: s.created_at, status: "verified",
        });
      } else if (s.kind === "fix" && s.place_id) {
        const p = byId.get(s.place_id);
        if (!p) continue;
        if (pl.issue === "Permanently closed") { const i = places.indexOf(p); if (i >= 0) places.splice(i, 1); continue; }
        for (const k of ["name", "address", "jumuah_time", "phone", "website"] as const) if (pl[k]) (p as unknown as Record<string, unknown>)[k] = pl[k];
        const lat = parseFloat(pl.lat), lng = parseFloat(pl.lng);
        if (isFinite(lat) && isFinite(lng)) { p.lat = lat; p.lng = lng; }
        p.last_verified = s.created_at;
      }
    }
    return places;
  }
  async listPlaces(city?: string) {
    const all = await this.all();
    return city ? all.filter((p) => p.city.toLowerCase() === city.toLowerCase()) : all;
  }
  async getPlace(slug: string) {
    return (await this.all()).find((p) => p.slug === slug) ?? null;
  }
  async near(lat: number, lng: number, radiusKm: number) {
    return (await this.all())
      .map((p) => ({ ...p, distance_km: distanceKm(lat, lng, p.lat, p.lng) }))
      .filter((p) => p.distance_km <= radiusKm)
      .sort((a, b) => a.distance_km - b.distance_km);
  }
  private async readQueue(): Promise<Submission[]> {
    try { return JSON.parse(await fs.readFile(QUEUE, "utf8")); } catch { return []; }
  }
  private async writeQueue(q: Submission[]) {
    await fs.mkdir(path.dirname(QUEUE), { recursive: true });
    await fs.writeFile(QUEUE, JSON.stringify(q, null, 2));
  }
  async addSubmission(s: Omit<Submission, "id" | "status" | "created_at">) {
    const q = await this.readQueue();
    const sub: Submission = { ...s, id: randomUUID(), status: "pending", created_at: new Date().toISOString() };
    q.push(sub);
    await this.writeQueue(q);
    return sub;
  }
  async listSubmissions(token: string) {
    if (!isAdmin(token)) return null;
    return (await this.readQueue()).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  async setSubmissionStatus(token: string, id: string, status: Submission["status"]) {
    if (!isAdmin(token)) return "unauthorized" as const;
    const q = await this.readQueue();
    const s = q.find((x) => x.id === id);
    if (!s) return null;
    s.status = status;
    await this.writeQueue(q);
    return s;
  }
}

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PLACE_COLS =
  "id,slug,name,name_local,type,lat,lng,address,area,city,state,country,denomination,women_section,wudu,parking,wheelchair,phone,website,jumuah_time,iqama_times,source,source_id,sources,source_ids,last_verified,status";

class SupabaseRepository implements PlaceRepository {
  constructor(private url: string, private key: string) {}
  private headers(extra: Record<string, string> = {}) {
    return { apikey: this.key, Authorization: `Bearer ${this.key}`, "content-type": "application/json", ...extra };
  }
  /** All visible places, cached by Next for 5 minutes and revalidated on admin approval (tag "places"). */
  private async all(): Promise<Place[]> {
    const out: Place[] = [];
    for (let from = 0; ; from += 1000) {
      const r = await fetch(`${this.url}/rest/v1/places?select=${PLACE_COLS}&status=eq.verified&order=name.asc`, {
        headers: this.headers({ Range: `${from}-${from + 999}` }),
        next: { revalidate: 300, tags: ["places"] },
      });
      if (!r.ok) throw new Error(`Supabase places fetch failed: ${r.status}`);
      const page = (await r.json()) as Place[];
      out.push(...page);
      if (page.length < 1000) break;
    }
    return out;
  }
  async listPlaces(city?: string) {
    const all = await this.all();
    return city ? all.filter((p) => p.city.toLowerCase() === city.toLowerCase()) : all;
  }
  async getPlace(slug: string) {
    return (await this.all()).find((p) => p.slug === slug) ?? null;
  }
  async near(lat: number, lng: number, radiusKm: number) {
    return (await this.all())
      .map((p) => ({ ...p, distance_km: distanceKm(lat, lng, p.lat, p.lng) }))
      .filter((p) => p.distance_km <= radiusKm)
      .sort((a, b) => a.distance_km - b.distance_km);
  }
  async addSubmission(s: Omit<Submission, "id" | "status" | "created_at">) {
    const id = randomUUID();
    const r = await fetch(`${this.url}/rest/v1/submissions`, {
      method: "POST", cache: "no-store", headers: this.headers({ Prefer: "return=minimal" }),
      body: JSON.stringify({ id, kind: s.kind, place_id: s.place_id ?? null, payload: s.payload }),
    });
    if (!r.ok) throw new Error(`Supabase submission insert failed: ${r.status}`);
    return { ...s, id, status: "pending" as const, created_at: new Date().toISOString() };
  }
  private async rpc(fn: string, args: Record<string, unknown>) {
    const r = await fetch(`${this.url}/rest/v1/rpc/${fn}`, { method: "POST", cache: "no-store", headers: this.headers(), body: JSON.stringify(args) });
    if (r.status === 401 || r.status === 403) return { unauthorized: true as const };
    if (!r.ok) {
      const t = await r.text();
      if (t.includes("unauthorized")) return { unauthorized: true as const };
      throw new Error(`Supabase rpc ${fn} failed: ${r.status} ${t.slice(0, 200)}`);
    }
    return { data: await r.json() };
  }
  async listSubmissions(token: string) {
    if (!token) return null;
    const res = await this.rpc("admin_list_submissions", { p_token: token });
    return "unauthorized" in res ? null : (res.data as Submission[]);
  }
  async setSubmissionStatus(token: string, id: string, status: Submission["status"]) {
    if (!token) return "unauthorized" as const;
    const res = await this.rpc("admin_set_submission_status", { p_token: token, p_id: id, p_status: status });
    if ("unauthorized" in res) return "unauthorized" as const;
    return (res.data as Submission | null) ?? null;
  }
}

export const usingSupabase = !!(SB_URL && SB_KEY);
export const repo: PlaceRepository = SB_URL && SB_KEY ? new SupabaseRepository(SB_URL, SB_KEY) : new JsonRepository();
