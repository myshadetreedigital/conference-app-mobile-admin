import { describe, expect, it } from "vitest";
import { EVENT_INFO_SECTION_LINK_TARGETS } from "@/repositories/event-info-section-repository";
import {
  fieldsForRowType,
  isScreenRowType,
  ROW_TYPE_GROUPS,
  ROW_TYPES,
  rowTypeLabel,
  rowTypeOf,
} from "./row-type";

describe("fieldsForRowType", () => {
  it("maps text and Q&A to the stored fields", () => {
    expect(fieldsForRowType("text")).toEqual({ pageStyle: "text", linkTarget: null });
    expect(fieldsForRowType("qa")).toEqual({ pageStyle: "qa", linkTarget: null });
  });

  it.each(EVENT_INFO_SECTION_LINK_TARGETS)("maps the %s screen to a link target", (target) => {
    expect(fieldsForRowType(`screen:${target}`)).toEqual({ pageStyle: "text", linkTarget: target });
  });

  it.each([null, undefined, "", "admin", "QA", "screen:", "screen:home", "screen:more", "screen:admin", "speakers", "__proto__"])(
    "treats %j as a text page",
    (value) => {
      expect(fieldsForRowType(value)).toEqual({ pageStyle: "text", linkTarget: null });
    },
  );

  it("never produces a Q&A page that also opens a screen", () => {
    for (const type of ROW_TYPES) {
      const { pageStyle, linkTarget } = fieldsForRowType(type);
      expect(pageStyle === "qa" && linkTarget !== null).toBe(false);
    }
  });
});

describe("rowTypeOf", () => {
  it("is the inverse of fieldsForRowType for every choice", () => {
    for (const type of ROW_TYPES) expect(rowTypeOf(fieldsForRowType(type))).toBe(type);
  });

  it("shows a row that opens a screen as that screen, whatever its page style", () => {
    expect(rowTypeOf({ pageStyle: "qa", linkTarget: "schedule" })).toBe("screen:schedule");
  });
});

describe("the choices", () => {
  it("offers Speakers, Schedule, Sponsors and Contacts, and not Home", () => {
    const screens = ROW_TYPES.filter(isScreenRowType);
    expect(screens).toEqual(["screen:speakers", "screen:schedule", "screen:sponsors", "screen:contacts"]);
    expect(ROW_TYPES).not.toContain("screen:home");
  });

  it("groups every choice exactly once, with the screens under \"Opens an existing screen\"", () => {
    const grouped = ROW_TYPE_GROUPS.flatMap((g) => g.types);
    expect([...grouped].sort()).toEqual([...ROW_TYPES].sort());
    expect(ROW_TYPE_GROUPS.find((g) => g.label === "Opens an existing screen")?.types.every(isScreenRowType)).toBe(true);
  });

  it("has a readable label for each", () => {
    expect(rowTypeLabel("text")).toBe("A page of text");
    expect(rowTypeLabel("qa")).toContain("Q&A");
    expect(rowTypeLabel("screen:contacts")).toBe("Contacts");
  });
});
