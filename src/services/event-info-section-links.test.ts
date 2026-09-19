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

  it("stores formatted text in its canonical form", async () => {
    const repo = new InMemoryEventInfoSectionRepository();
    const body = '<h1>Got 10 minutes?</h1><p>Leave a review on <a href="https://www.g2.com/products/x">G2</a> and get <b>$25</b>.</p>';
    const result = await createEventInfoSection(repo, "evt-1", { ...base, body });
    expect(result.status === "created" && result.section.body).toBe(
      '<h1>Got 10 minutes?</h1>\n\n<p>Leave a review on <a href="https://www.g2.com/products/x">G2</a> and get <strong>$25</strong>.</p>',
    );
  });

  it("turns plain text into paragraphs", async () => {
    const repo = new InMemoryEventInfoSectionRepository();
    const result = await createEventInfoSection(repo, "evt-1", { ...base, body: "First.\n\nSecond." });
    expect(result.status === "created" && result.section.body).toBe("<p>First.</p>\n\n<p>Second.</p>");
  });

  it.each([
    '<a href="http://example.com">a</a>',
    '<a href="javascript:alert(1)">a</a>',
    '<a href="https://user:pw@example.com">a</a>',
    '<a href="https://evil.example.com">paypal.com</a>',
    "<script>alert(1)</script>",
    "<div>not allowed</div>",
    '<img src="https://example.com/x.png">',
    '<p style="color:red">x</p>',
  ])("rejects the disallowed text %j and stores nothing", async (body) => {
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
      body: '<a href="http://example.com">a</a>',
    });
    expect(bad.status).toBe("invalid");
    expect((await repo.listByEvent("evt-1"))[0].body).toBe("<p>safe</p>");

    const good = await updateEventInfoSection(repo, created.section.id, {
      ...base,
      body: 'now <a href="https://example.com">ok</a>',
      linkTarget: "speakers",
    });
    expect(good.status).toBe("updated");
    const [section] = await repo.listByEvent("evt-1");
    expect(section.body).toBe('<p>now <a href="https://example.com/">ok</a></p>');
    expect(section.linkTarget).toBe("speakers");
  });
});
