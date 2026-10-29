import Explorer from "@/components/Explorer";
import { repo } from "@/lib/data";

export default async function Home() {
  const places = await repo.listPlaces("Bengaluru");
  return <Explorer places={places} center={[77.5946, 12.9716]} />;
}
