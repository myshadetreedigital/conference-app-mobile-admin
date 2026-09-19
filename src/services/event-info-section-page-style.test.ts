import { describe, expect, it } from "vitest";
import { InMemoryEventInfoSectionRepository } from "@/test/in-memory-event-info-section-repository";
import { createEventInfoSection, updateEventInfoSection } from "./event-info-section-service";

const base = { icon: "info", title: "Before you're here", body: "" } as const;

describe("event info section page style", () => {
  it("defaults to a text page", async () => {
    const repo = new InMemoryEventInfoSectionRepository();
    const result = await createEventInfoSection(repo, "evt-1", base);
    expect(result.status === "created" && result.section.pageStyle).toBe("text");
  });

  it("stores a Q&A page", async () => {
    const repo = new InMemoryEventInfoSectionRepository();
    const result = await createEventInfoSection(repo, "evt-1", { ...base, pageStyle: "qa" });
    expect(result.status === "created" && result.section.pageStyle).toBe("qa");
    expect(result.status === "created" && result.section.linkTarget).toBeNull();
  });

  it("rejects an unknown page style", async () => {
    const repo = new InMemoryEventInfoSectionRepository();
    // @ts-expect-error deliberately not one of EVENT_INFO_SECTION_PAGE_STYLES
    const result = await createEventInfoSection(repo, "evt-1", { ...base, pageStyle: "gallery" });
    expect(result.status).toBe("invalid");
    expect(await repo.listByEvent("evt-1")).toHaveLength(0);
  });

  it("rejects a Q&A page that also opens a screen", async () => {
    const repo = new InMemoryEventInfoSectionRepository();
    const result = await createEventInfoSection(repo, "evt-1", { ...base, pageStyle: "qa", linkTarget: "speakers" });
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") expect(result.errors.pageStyle?._errors[0]).toContain("can't also open a screen");
    expect(await repo.listByEvent("evt-1")).toHaveLength(0);
  });

  it("allows a text row that opens a screen", async () => {
    const repo = new InMemoryEventInfoSectionRepository();
    const result = await createEventInfoSection(repo, "evt-1", { ...base, pageStyle: "text", linkTarget: "speakers" });
    expect(result.status).toBe("created");
  });

  it("switches a row between text and Q&A on update, and enforces the same rule", async () => {
    const repo = new InMemoryEventInfoSectionRepository();
    const created = await createEventInfoSection(repo, "evt-1", base);
    if (created.status !== "created") throw new Error("setup failed");

    expect((await updateEventInfoSection(repo, created.section.id, { ...base, pageStyle: "qa" })).status).toBe("updated");
    expect((await repo.listByEvent("evt-1"))[0].pageStyle).toBe("qa");

    const bad = await updateEventInfoSection(repo, created.section.id, { ...base, pageStyle: "qa", linkTarget: "speakers" });
    expect(bad.status).toBe("invalid");
    expect((await repo.listByEvent("evt-1"))[0].linkTarget).toBeNull();

    expect((await updateEventInfoSection(repo, created.section.id, { ...base, pageStyle: "text" })).status).toBe("updated");
    expect((await repo.listByEvent("evt-1"))[0].pageStyle).toBe("text");
  });
});
