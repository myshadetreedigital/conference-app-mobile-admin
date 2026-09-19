import { describe, expect, it } from "vitest";
import { InMemoryEventInfoSectionRepository } from "@/test/in-memory-event-info-section-repository";
import { createEventInfoSection, updateEventInfoSection } from "./event-info-section-service";

const base = { icon: "info", title: "About", body: "" } as const;

describe("event info section text and link target", () => {
  it("defaults linkTarget to null (a page of text)", async () => {
    const repo = new InMemoryEventInfoSectionRepository();
    const result = await createEventInfoSection(repo, "evt-1", base);
    expect(result.status === "created" && result.section.linkTarget).toBeNull();
  });

  it("stores a row that opens the Speakers screen", async () => {
    const repo = new InMemoryEventInfoSectionRepository();
    const result = await createEventInfoSection(repo, "evt-1", {
      icon: "presentation",
      title: "Speakers",
      body: "",
      linkTarget: "speakers",
    });
    expect(result.status === "created" && result.section.linkTarget).toBe("speakers");
  });

  it("rejects an unknown link target", async () => {
    const repo = new InMemoryEventInfoSectionRepository();
    const result = await createEventInfoSection(repo, "evt-1", {
      ...base,
      // @ts-expect-error deliberately not one of EVENT_INFO_SECTION_LINK_TARGETS
      linkTarget: "admin",
    });
    expect(result.status).toBe("invalid");
    expect(await repo.listByEvent("evt-1")).toHaveLength(0);
  });

  it.each(["wifi", "camera", "trophy", "presentation", "demo", "address-book"] as const)(
    "accepts the %s icon",
    async (icon) => {
      const repo = new InMemoryEventInfoSectionRepository();
      const result = await createEventInfoSection(repo, "evt-1", { ...base, icon });
      expect(result.status).toBe("created");
    },
  );

  it("rejects an icon outside the fixed set", async () => {
    const repo = new InMemoryEventInfoSectionRepository();
    // @ts-expect-error deliberately not one of EVENT_INFO_SECTION_ICONS
    const result = await createEventInfoSection(repo, "evt-1", { ...base, icon: "skull" });
    expect(result.status).toBe("invalid");
  });

  it("accepts formatted text with safe https links", async () => {
    const repo = new InMemoryEventInfoSectionRepository();
    const body = "# Got 10 minutes?\n\nLeave a review on [G2](https://www.g2.com/products/x) and get **$25**.";
    const result = await createEventInfoSection(repo, "evt-1", { ...base, body });
    expect(result.status === "created" && result.section.body).toBe(body);
  });

  it.each([
    "[a](http://example.com)",
    "[a](javascript:alert(1))",
    "[a](https://user:pw@example.com)",
    "[paypal.com](https://evil.example.com)",
  ])("rejects text containing the unsafe link %j and stores nothing", async (body) => {
    const repo = new InMemoryEventInfoSectionRepository();
    const result = await createEventInfoSection(repo, "evt-1", { ...base, body });
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") expect(result.errors.body?._errors[0]).toBeTruthy();
    expect(await repo.listByEvent("evt-1")).toHaveLength(0);
  });

  it("rejects text over the length limit", async () => {
    const repo = new InMemoryEventInfoSectionRepository();
    const result = await createEventInfoSection(repo, "evt-1", { ...base, body: "a".repeat(10_001) });
    expect(result.status).toBe("invalid");
  });

  it("validates on update too, leaving the stored section unchanged", async () => {
    const repo = new InMemoryEventInfoSectionRepository();
    const created = await createEventInfoSection(repo, "evt-1", { ...base, body: "safe" });
    if (created.status !== "created") throw new Error("setup failed");

    const bad = await updateEventInfoSection(repo, created.section.id, {
      ...base,
      body: "[a](http://example.com)",
    });
    expect(bad.status).toBe("invalid");
    expect((await repo.listByEvent("evt-1"))[0].body).toBe("safe");

    const good = await updateEventInfoSection(repo, created.section.id, {
      ...base,
      body: "now [ok](https://example.com)",
      linkTarget: "speakers",
    });
    expect(good.status).toBe("updated");
    const [section] = await repo.listByEvent("evt-1");
    expect(section.body).toBe("now [ok](https://example.com)");
    expect(section.linkTarget).toBe("speakers");
  });
});
