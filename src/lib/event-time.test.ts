import { describe, expect, it } from "vitest";
import { isoToZonedLocal, isValidTimeZone, isZonelessLocalTime, zonedLocalToIso } from "./event-time";

const NY = "America/New_York";

describe("isValidTimeZone", () => {
  it.each(["America/New_York", "Europe/London", "UTC", "Asia/Kolkata"])("accepts %s", (zone) => {
    expect(isValidTimeZone(zone)).toBe(true);
  });
  it.each(["", "Mars/Olympus", "not a zone", "America/", "../etc"])("rejects %j", (zone) => {
    expect(isValidTimeZone(zone)).toBe(false);
  });
});

describe("zonedLocalToIso", () => {
  it("reads a summer time as daylight time (UTC-4 in New York)", () => {
    expect(zonedLocalToIso("2026-10-09T21:30", NY)).toBe("2026-10-10T01:30:00.000Z");
  });
  it("reads a winter time as standard time (UTC-5)", () => {
    expect(zonedLocalToIso("2026-12-01T09:00", NY)).toBe("2026-12-01T14:00:00.000Z");
  });
  it("handles zones east of UTC and half-hour zones", () => {
    expect(zonedLocalToIso("2026-10-09T09:00", "Asia/Kolkata")).toBe("2026-10-09T03:30:00.000Z");
    expect(zonedLocalToIso("2026-07-01T12:00", "Europe/London")).toBe("2026-07-01T11:00:00.000Z");
  });
  it("accepts seconds", () => {
    expect(zonedLocalToIso("2026-12-01T09:00:30", NY)).toBe("2026-12-01T14:00:30.000Z");
  });
  it("puts a time in the skipped spring-forward hour an hour earlier, so it still lands next to that night", () => {
    // 2026-03-08 02:30 doesn't exist in New York; clocks go 02:00 -> 03:00.
    expect(zonedLocalToIso("2026-03-08T02:30", NY)).toBe("2026-03-08T06:30:00.000Z");
  });
  it("uses the first of the two repeated fall-back times", () => {
    // 2026-11-01 01:30 happens twice; the first is still daylight time (UTC-4).
    expect(zonedLocalToIso("2026-11-01T01:30", NY)).toBe("2026-11-01T05:30:00.000Z");
  });
  it.each(["", "2026-10-09", "2026-13-01T09:00", "2026-02-31T09:00", "2026-10-09T24:00", "2026-10-09T09:60", "garbage", "2026-10-09T09:00Z"])(
    "rejects %j",
    (text) => {
      expect(zonedLocalToIso(text, NY)).toBeNull();
    },
  );
});

describe("isoToZonedLocal", () => {
  it("shows the clock in the zone", () => {
    expect(isoToZonedLocal("2026-10-10T01:30:00.000Z", NY)).toBe("2026-10-09T21:30");
    expect(isoToZonedLocal("2026-12-01T14:00:00Z", NY)).toBe("2026-12-01T09:00");
  });
  it.each([null, "", "garbage"])("returns an empty string for %j", (value) => {
    expect(isoToZonedLocal(value, NY)).toBe("");
  });
  it("round-trips with zonedLocalToIso across a year of times", () => {
    for (let day = 0; day < 366; day += 7) {
      const local = new Date(Date.UTC(2026, 0, 1 + day, 13, 45)).toISOString().slice(0, 16);
      const iso = zonedLocalToIso(local, NY);
      expect(iso).not.toBeNull();
      expect(isoToZonedLocal(iso, NY)).toBe(local);
    }
  });
});

describe("isZonelessLocalTime", () => {
  it("is true only for a time with no zone attached", () => {
    expect(isZonelessLocalTime("2026-10-09T09:00")).toBe(true);
    expect(isZonelessLocalTime("2026-10-09T09:00:00")).toBe(true);
    expect(isZonelessLocalTime("2026-10-09T09:00:00Z")).toBe(false);
    expect(isZonelessLocalTime("2026-10-09T09:00:00-04:00")).toBe(false);
    expect(isZonelessLocalTime("Oct 9 2026 9am")).toBe(false);
  });
});
