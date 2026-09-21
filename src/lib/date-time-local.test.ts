import { describe, expect, it } from "vitest";
import { toDateTimeLocal } from "./date-time-local";

describe("toDateTimeLocal", () => {
  it.each([null, "", "garbage"])("returns an empty string for %j", (value) => {
    expect(toDateTimeLocal(value)).toBe("");
  });

  it("pads to the format a datetime-local input expects", () => {
    expect(toDateTimeLocal(new Date(2026, 0, 2, 3, 4).toISOString())).toBe("2026-01-02T03:04");
  });

  it("round-trips: what the form shows is read back as the same instant", () => {
    const iso = new Date(2026, 9, 9, 21, 30).toISOString();
    expect(new Date(toDateTimeLocal(iso)).toISOString()).toBe(iso);
  });
});
