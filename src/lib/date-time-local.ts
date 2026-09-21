/**
 * Formats a stored timestamp for a `datetime-local` input ("YYYY-MM-DDTHH:mm"), using
 * the same clock the save path reads it with (`new Date("YYYY-MM-DDTHH:mm")` reads
 * local time), so opening a session to edit and saving it unchanged keeps the same time.
 */
export function toDateTimeLocal(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
