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
  addSubmission(s: Omit<Submission, "id" | "status" | "created_at">, ipHash?: string): Promise<Submission>;
  /** Returns null when the admin token is not valid. */
  listSubmissions(token: string): Promise<Submission[] | null>;
  /** Returns "unauthorized" when the admin token is not valid. */
  setSubmissionStatus(token: string, id: string, status: Submission["status"]): Promise<Submission | null | "unauthorized">;
  cities(): Promise<CityCount[]>;
  slugs(): Promise<{ slug: string; last_verified: string }[]>;
  inBbox(w: number, s: number, e: number, n: number, limit?: number): Promise<Place[]>;
  adminSearch(token: string, q: string): Promise<Place[] | null>;
  adminUpdate(token: string, id: string, patch: Record<string, unknown>): Promise<Place | null | "unauthorized">;
  adminDelete(token: string, id: string): Promise<boolean | "unauthorized">;
}

export class RateLimitError extends Error { constructor() { super("rate_limited"); } }
export interface CityCount { state: string; city: string; n: number }
export const citySlug = (c: string) => c.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
/** Revalidation window for cached place reads. Admin changes also trigger revalidateTag("places") for instant refresh. */
export const PLACES_TTL = 60;

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
  async cities() {
    const m = new Map<string, CityCount>();
    for (const p of await this.all()) { const k = p.state + "|" + p.city; const c = m.get(k) ?? { state: p.state, city: p.city, n: 0 }; c.n++; m.set(k, c); }
    return [...m.values()];
  }
  async slugs() { return (await this.all()).map((p) => ({ slug: p.slug, last_verified: p.last_verified })); }
  async inBbox(w: number, s: number, e: number, n: number, limit = 2000) {
    return (await this.all()).filter((p) => p.lat >= s && p.lat <= n && p.lng >= w && p.lng <= e).slice(0, limit);
  }
  async adminSearch(token: string, q: string) {
    if (!isAdmin(token)) return null;
    const t = q.toLowerCase();
    return (await this.all()).filter((p) => !t || p.name.toLowerCase().includes(t) || p.id === q).slice(0, 50);
  }
  async adminUpdate(): Promise<Place | null | "unauthorized"> { return null; }
  async adminDelete(): Promise<boolean | "unauthorized"> { return false; }
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
  private async get<T>(qs: string, range?: [number, number]): Promise<T[]> {
    const r = await fetch(`${this.url}/rest/v1/${qs}`, {
      headers: this.headers(range ? { Range: `${range[0]}-${range[1]}` } : {}),
      next: { revalidate: PLACES_TTL, tags: ["places"] },
    });
    if (!r.ok) throw new Error(`Supabase fetch failed: ${r.status}`);
    return (await r.json()) as T[];
  }
  private async paged<T>(qs: string): Promise<T[]> {
    const out: T[] = [];
    for (let from = 0; ; from += 1000) {
      const page = await this.get<T>(qs, [from, from + 999]);
      out.push(...page);
      if (page.length < 1000) break;
    }
    return out;
  }
  private async pubRpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
    const r = await fetch(`${this.url}/rest/v1/rpc/${fn}`, {
      method: "POST", headers: this.headers(), body: JSON.stringify(args),
      next: { revalidate: PLACES_TTL, tags: ["places"] },
    });
    if (!r.ok) throw new Error(`Supabase rpc ${fn} failed: ${r.status}`);
    return (await r.json()) as T;
  }
  /** Places for one city (or all places when no city is given, avoid on large sets). */
  async listPlaces(city?: string) {
    const f = city ? `&city=eq.${encodeURIComponent(city)}` : "";
    return this.paged<Place>(`places?select=${PLACE_COLS}&status=eq.verified${f}&order=name.asc`);
  }
  async getPlace(slug: string) {
    const r = await this.get<Place>(`places?select=${PLACE_COLS}&status=eq.verified&slug=eq.${encodeURIComponent(slug)}&limit=1`);
    return r[0] ?? null;
  }
  async near(lat: number, lng: number, radiusKm: number) {
    return this.pubRpc<(Place & { distance_km: number })[]>("places_near", { p_lat: lat, p_lng: lng, p_radius_km: Math.min(Math.max(radiusKm, 0.1), 50), p_limit: 500, p_offset: 0 });
  }
  async cities() { return this.pubRpc<CityCount[]>("place_cities_json", {}); } // single jsonb value: not capped at 1000 rows
  async slugs() { return this.paged<{ slug: string; last_verified: string }>(`places?select=slug,last_verified&status=eq.verified&order=id.asc`); }
  async inBbox(w: number, s: number, e: number, n: number, limit = 2000) {
    return this.pubRpc<Place[]>("places_in_bbox", { p_west: w, p_south: s, p_east: e, p_north: n, p_limit: limit });
  }
  async adminSearch(token: string, q: string) {
    if (!token) return null;
    const res = await this.rpc("admin_search_places", { p_token: token, p_q: q, p_limit: 100 });
    return "unauthorized" in res ? null : (res.data as Place[]);
  }
  async adminUpdate(token: string, id: string, patch: Record<string, unknown>) {
    if (!token) return "unauthorized" as const;
    const res = await this.rpc("admin_update_place", { p_token: token, p_id: id, p: patch });
    if ("unauthorized" in res) return "unauthorized" as const;
    const d = res.data as Place | null;
    return d && d.id ? d : null;
  }
  async adminDelete(token: string, id: string) {
    if (!token) return "unauthorized" as const;
    const res = await this.rpc("admin_delete_place", { p_token: token, p_id: id });
    if ("unauthorized" in res) return "unauthorized" as const;
    return res.data === true;
  }
  async addSubmission(s: Omit<Submission, "id" | "status" | "created_at">, ipHash = "") {
    // Server-only RPC: it checks the server-held admin token, applies the per-IP rate limit and inserts.
    const res = await this.rpc("server_submit", { p_token: process.env.ADMIN_TOKEN ?? "", p_ip_hash: ipHash, p_kind: s.kind, p_place_id: s.place_id ?? null, p_payload: s.payload, p_max: 5 });
    if ("unauthorized" in res) throw new Error("server_submit unauthorized: check ADMIN_TOKEN");
    return { ...s, id: String(res.data), status: "pending" as const, created_at: new Date().toISOString() };
  }
  private async rpc(fn: string, args: Record<string, unknown>) {
    const r = await fetch(`${this.url}/rest/v1/rpc/${fn}`, { method: "POST", cache: "no-store", headers: this.headers(), body: JSON.stringify(args) });
    if (r.status === 401 || r.status === 403) return { unauthorized: true as const };
    if (!r.ok) {
      const t = await r.text();
      if (t.includes("unauthorized")) return { unauthorized: true as const };
      if (t.includes("rate_limited")) throw new RateLimitError();
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
