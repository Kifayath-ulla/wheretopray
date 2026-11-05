import Explorer from "@/components/Explorer";
import { repo } from "@/lib/data";

export const revalidate = 60;

export default async function Home() {
  const places = await repo.listPlaces("Bengaluru");
  // Send only what the Explorer needs, keeping the HTML payload small.
  const slim = places.map((p) => ({
    id: p.id, slug: p.slug, name: p.name, name_local: p.name_local, type: p.type,
    lat: p.lat, lng: p.lng, area: p.area, city: p.city, address: p.address,
    women_section: p.women_section, wudu: p.wudu, parking: p.parking, wheelchair: p.wheelchair,
    phone: p.phone, jumuah_time: p.jumuah_time, iqama_times: p.iqama_times,
    location_quality: p.location_quality,
  })) as typeof places;
  return <Explorer places={slim} center={[77.5946, 12.9716]} />;
}
