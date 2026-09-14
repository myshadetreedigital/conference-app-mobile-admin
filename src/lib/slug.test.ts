import { describe, expect, it } from "vitest";
import { toSlug } from "./slug";

describe("toSlug", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(toSlug("The Opticon Expedition 2026!")).toBe("the-opticon-expedition-2026");
  });

  it("strips accents/diacritics", () => {
    expect(toSlug("Café René's Annual Gala")).toBe("cafe-renes-annual-gala");
    expect(toSlug("Ñoño & Associates Summit")).toBe("nono-associates-summit");
  });

  it("converts underscores to hyphens rather than dropping them", () => {
    // Regression test: an earlier version stripped disallowed
    // characters before converting underscores to hyphens, which
    // silently deleted underscores instead of converting them.
    expect(toSlug("Multiple   Spaces_and_Underscores")).toBe("multiple-spaces-and-underscores");
  });

  it("collapses repeated whitespace/hyphens into a single hyphen", () => {
    expect(toSlug("  Multiple   Spaces  ")).toBe("multiple-spaces");
    expect(toSlug("already---hyphenated")).toBe("already-hyphenated");
  });

  it("leaves an already-clean slug unchanged", () => {
    expect(toSlug("already-a-slug")).toBe("already-a-slug");
  });

  it("trims leading and trailing hyphens", () => {
    expect(toSlug("---leading and trailing---")).toBe("leading-and-trailing");
  });

  it("drops punctuation entirely rather than converting it to a hyphen", () => {
    expect(toSlug("Wait, what?! (Really)")).toBe("wait-what-really");
  });

  it("returns an empty string for input with nothing sluggable", () => {
    // The empty case is intentionally the caller's problem to handle
    // — this function's contract is just "produce the WordPress-style
    // slug, possibly empty," not "always produce something non-empty."
    expect(toSlug("")).toBe("");
    expect(toSlug("   ")).toBe("");
    expect(toSlug("!!!")).toBe("");
    expect(toSlug("日本語のイベント")).toBe("");
  });
});
