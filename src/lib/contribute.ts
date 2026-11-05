export const HELP = [
  { id: "places", label: "Add or check places in my area" },
  { id: "timetables", label: "Share jamaat timetables" },
  { id: "tech", label: "Design or code" },
  { id: "translate", label: "Translate" },
  { id: "spread", label: "Spread the word" },
  { id: "other", label: "Other" },
] as const;
export const HELP_IDS = HELP.map((h) => h.id);
export type Contributor = { name: string; email: string; phone: string; city: string; note: string; help: string[] };
export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export function validateContributor(v: Contributor): string | null {
  if (!v.name || v.name.length > 80) return "Please enter your name.";
  if (!EMAIL_RE.test(v.email) || v.email.length > 254) return "Please enter a valid email.";
  if (v.phone && !/^\+?[0-9 ()-]{7,20}$/.test(v.phone)) return "Please check the phone number.";
  if (v.note.length > 1000) return "Note is too long.";
  if (v.city.length > 80) return "City is too long.";
  return null;
}
