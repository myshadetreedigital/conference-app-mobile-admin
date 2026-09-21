// An event has one time zone (an IANA name such as "America/New_York"). Organizers type
// session times as wall-clock time in that zone; these helpers convert between that and
// the absolute moment the database stores. No date library: Intl knows the zone rules.

export const DEFAULT_TIME_ZONE = "America/New_York";

export function isValidTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** Minutes the zone is ahead of UTC at the given moment (negative for the Americas). */
function offsetMinutes(utcMs: number, zone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"), value("second"));
  return (asUtc - Math.floor(utcMs / 1000) * 1000) / 60000;
}

const LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/** True for "YYYY-MM-DDTHH:mm" (what a datetime-local input sends): a time with no zone attached. */
export function isZonelessLocalTime(text: string): boolean {
  return LOCAL_PATTERN.test(text);
}

/**
 * The absolute moment (ISO string) at which the clock in `zone` reads the given local
 * time, or null if the text isn't a valid local time. A time in the hour that doesn't exist when
 * clocks spring forward lands an hour earlier (02:30 becomes 01:30 standard time); a time in
 * the hour that happens twice when they fall back means the first of the two.
 */
export function zonedLocalToIso(local: string, zone: string): string | null {
  const match = LOCAL_PATTERN.exec(local);
  if (!match) return null;
  const [year, month, day, hour, minute, second] = match.slice(1).map((part) => Number(part ?? 0));
  const wall = Date.UTC(year, month - 1, day, hour, minute, second);
  const check = new Date(wall);
  // Date.UTC rolls 2026-02-31 over into March; reject it instead.
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  if (hour > 23 || minute > 59 || second > 59) return null;
  const first = wall - offsetMinutes(wall, zone) * 60000;
  const settled = wall - offsetMinutes(first, zone) * 60000;
  return new Date(settled).toISOString();
}

/** "YYYY-MM-DDTHH:mm" showing the clock in `zone` at the given moment, for a datetime-local input. */
export function isoToZonedLocal(iso: string | null, zone: string): string {
  if (!iso) return "";
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "";
  const shifted = new Date(ms + offsetMinutes(ms, zone) * 60000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`;
}
