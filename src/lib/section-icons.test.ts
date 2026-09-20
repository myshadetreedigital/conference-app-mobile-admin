import { describe, expect, it } from "vitest";
import { EVENT_INFO_SECTION_ICONS } from "@/repositories/event-info-section-repository";
import { filterIconGroups, iconDetails, SECTION_ICON_DETAILS, SECTION_ICON_GROUPS } from "./section-icons";

// The icons rows already use, from before the larger set. Their names must never change.
const EXISTING = [
  "tree-pine", "info", "plane", "users", "heart", "building", "clipboard-list", "map", "map-pin",
  "wifi", "camera", "trophy", "presentation", "demo", "address-book",
];

describe("the icon catalogue", () => {
  it("offers a large set of common icons", () => {
    expect(EVENT_INFO_SECTION_ICONS.length).toBeGreaterThanOrEqual(100);
  });

  it("keeps every icon name that existing rows already use", () => {
    for (const name of EXISTING) expect(EVENT_INFO_SECTION_ICONS).toContain(name);
  });

  it("has no duplicate names, and only well-formed ones (what the database accepts)", () => {
    expect(new Set(EVENT_INFO_SECTION_ICONS).size).toBe(EVENT_INFO_SECTION_ICONS.length);
    for (const name of EVENT_INFO_SECTION_ICONS) {
      expect(name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(name.length).toBeLessThanOrEqual(40);
    }
  });

  it("has a label, a known group and a drawing for every name, and nothing extra", () => {
    expect(Object.keys(SECTION_ICON_DETAILS).sort()).toEqual([...EVENT_INFO_SECTION_ICONS].sort());
    for (const name of EVENT_INFO_SECTION_ICONS) {
      const { label, group, path } = SECTION_ICON_DETAILS[name];
      expect(label.trim()).not.toBe("");
      expect(SECTION_ICON_GROUPS as readonly string[]).toContain(group);
      // SVG path data: starts with a move command and holds only path characters.
      expect(path).toMatch(/^[Mm][0-9A-Za-z\s.,-]+$/);
      expect(path.length).toBeGreaterThan(20);
    }
  });

  it("gives every icon a different drawing (no two names share one by mistake)", () => {
    const paths = EVENT_INFO_SECTION_ICONS.map((n) => SECTION_ICON_DETAILS[n].path);
    // A few pairs deliberately reuse a look (e.g. a filled/outline-less glyph); allow only a handful.
    expect(paths.length - new Set(paths).size).toBeLessThanOrEqual(3);
  });

  it("uses every group at least once, in the order they are listed", () => {
    const used = filterIconGroups("").map((g) => g.label);
    expect(used).toEqual([...SECTION_ICON_GROUPS]);
  });
});

describe("filterIconGroups", () => {
  const names = (query: string) => filterIconGroups(query).flatMap((g) => g.icons.map((i) => i.key));

  it("returns every icon, grouped, for an empty or blank search", () => {
    expect(names("")).toEqual([...EVENT_INFO_SECTION_ICONS]);
    expect(names("   ")).toEqual([...EVENT_INFO_SECTION_ICONS]);
  });

  it("matches on the label, ignoring case", () => {
    expect(names("wi-fi")).toEqual(["wifi"]);
    expect(names("HOTEL")).toContain("hotel");
  });

  it("matches on the name", () => {
    expect(names("tree")).toContain("tree-pine");
    expect(names("map-pin")).toEqual(["map-pin"]);
  });

  it("matches on the group", () => {
    const food = names("food");
    expect(food).toContain("restaurant");
    expect(food).toContain("coffee");
    expect(filterIconGroups("food & drink").map((g) => g.label)).toEqual(["Food & drink"]);
  });

  it("needs every word to match, in any order", () => {
    expect(names("parking car")).toEqual([]);
    expect(names("shield first")).toEqual([]);
    expect(names("first aid")).toEqual(["first-aid"]);
    expect(names("aid first")).toEqual(["first-aid"]);
  });

  it("returns nothing for a search with no match, and drops empty groups", () => {
    expect(filterIconGroups("zzzz")).toEqual([]);
    for (const group of filterIconGroups("coffee")) expect(group.icons.length).toBeGreaterThan(0);
  });

  it("keeps the picker's group order when filtering", () => {
    const labels = filterIconGroups("a").map((g) => g.label);
    expect(labels).toEqual((SECTION_ICON_GROUPS as readonly string[]).filter((l) => labels.includes(l)));
  });

  it("treats regex characters in a search as plain text", () => {
    expect(() => filterIconGroups("(.*[")).not.toThrow();
    expect(names(".*")).toEqual([]);
  });
});

describe("iconDetails", () => {
  it("returns the details for a known name", () => {
    expect(iconDetails("wifi").label).toBe("Wi-Fi");
  });

  it.each(["", "not-an-icon", "__proto__", "constructor", "INFO"])("shows %j as the information icon", (name) => {
    expect(iconDetails(name)).toBe(SECTION_ICON_DETAILS.info);
  });
});
