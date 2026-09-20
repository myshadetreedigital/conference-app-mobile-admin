import { describe, expect, it } from "vitest";
import { describeSaveError } from "./save-error";

describe("describeSaveError", () => {
  it("explains the missing icon migration", () => {
    const message = describeSaveError({
      message: 'new row for relation "event_info_sections" violates check constraint "event_info_sections_icon_check"',
    });
    expect(message).toContain("0020_more_info_icon_names.sql");
    expect(message).toContain("save again");
  });

  it("also recognises it on a real Error", () => {
    expect(describeSaveError(new Error('violates check constraint "event_info_sections_icon_check"'))).toContain("0020");
  });

  it("passes any other problem through in plain words", () => {
    expect(describeSaveError({ message: "connection reset" })).toBe("Couldn't save this row: connection reset");
    expect(describeSaveError(new Error("boom"))).toBe("Couldn't save this row: boom");
    expect(describeSaveError("just a string")).toBe("Couldn't save this row: just a string");
    expect(describeSaveError(undefined)).toBe("Couldn't save this row: undefined");
  });

  it("doesn't mistake other constraints for the icon one", () => {
    expect(describeSaveError({ message: 'violates check constraint "event_info_sections_link_target_check"' })).not.toContain("0020");
  });
});
