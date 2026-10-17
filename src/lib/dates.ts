/** Data lokalna w formacie RRRR-MM-DD */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return toISODate(new Date(y, m - 1, d + days));
}

export const today = () => toISODate(new Date());
export const tomorrow = () => addDays(today(), 1);

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
}

export function formatDateShort(iso: string): string {
  return parseISODate(iso).toLocaleDateString("pl-PL", { weekday: "short", day: "numeric", month: "2-digit" });
}

/** „dziś”, „jutro” albo data */
export function formatDeliveryDate(iso: string): string {
  if (iso === today()) return `dziś, ${formatDateShort(iso)}`;
  if (iso === tomorrow()) return `jutro, ${formatDateShort(iso)}`;
  return formatDateShort(iso);
}

export function formatDateTime(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleString("pl-PL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Czy minęła godzina graniczna zamówień (np. "20:00")? */
export function isAfterCutoff(cutoff: string, now = new Date()): boolean {
  const [h, m] = cutoff.split(":").map(Number);
  return now.getHours() * 60 + now.getMinutes() >= h * 60 + m;
}

/** Najwcześniejsza możliwa data dostawy: jutro, a po godzinie granicznej – pojutrze. */
export function earliestDeliveryDate(cutoff: string, now = new Date()): string {
  return addDays(toISODate(now), isAfterCutoff(cutoff, now) ? 2 : 1);
}

/** Godzina "HH:MM" przesunięta o podaną liczbę minut. */
export function shiftTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const t = (h * 60 + m + minutes + 24 * 60) % (24 * 60);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}
