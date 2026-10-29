import { revalidatePath, revalidateTag } from "next/cache";
/** Refresh every cached page that shows places, right after an admin change. */
export function refreshPlaces(slug?: string) {
  revalidateTag("places");
  if (slug) revalidatePath(`/place/${slug}`);
  revalidatePath("/", "layout");
}
