import { describe, expect, it } from "vitest";
import { InMemoryEventRepository } from "@/test/in-memory-event-repository";
import { createEvent, updateEventDetails } from "./event-service";

const details = { tagline: "", description: "", location: "", startsAt: null, endsAt: null, primaryColor: null };

async function setup() {
  const repo = new InMemoryEventRepository();
  const created = await createEvent(repo, "org-1", { name: "Summit" });
  if (created.status !== "created") throw new Error("setup failed");
  return { repo, eventId: created.event.id };
}

describe("event details: banner links", () => {
  it("stores https links, adds https to a bare domain, and nulls blanks", async () => {
    const { repo, eventId } = await setup();
    const result = await updateEventDetails(repo, eventId, {
      ...details,
      banner1LinkUrl: "https://example.com/register?ref=app",
      banner2LinkUrl: "  ",
    });
    expect(result.status).toBe("updated");
    const event = await repo.findById(eventId);
    expect(event?.banner1LinkUrl).toBe("https://example.com/register?ref=app");
    expect(event?.banner2LinkUrl).toBeNull();

    await updateEventDetails(repo, eventId, { ...details, banner1LinkUrl: "example.com/sale", banner2LinkUrl: null });
    expect((await repo.findById(eventId))?.banner1LinkUrl).toBe("https://example.com/sale");
  });

  it.each([
    ["banner1LinkUrl", "http://example.com", "Banner 1 link"],
    ["banner2LinkUrl", "javascript:alert(1)", "Banner 2 link"],
    ["banner1LinkUrl", "https://127.0.0.1/admin", "Banner 1 link"],
    ["banner2LinkUrl", "https://user:pw@example.com", "Banner 2 link"],
  ] as const)("rejects an unsafe %s (%s) and changes nothing", async (key, value, label) => {
    const { repo, eventId } = await setup();
    const result = await updateEventDetails(repo, eventId, {
      ...details,
      banner1LinkUrl: null,
      banner2LinkUrl: null,
      tagline: "should not be saved",
      [key]: value,
    });
    expect(result.status).toBe("invalid");
    if (result.status === "invalid") expect(result.errors[key]?._errors[0]).toContain(label);
    expect((await repo.findById(eventId))?.tagline).toBe("");
  });
});

describe("event details: location image", () => {
  it("sets the location image when a new one is uploaded and leaves it alone otherwise", async () => {
    const { repo, eventId } = await setup();
    const input = { ...details, banner1LinkUrl: null, banner2LinkUrl: null };

    await updateEventDetails(repo, eventId, input, undefined, undefined, undefined, "https://cdn.example.com/venue.png");
    expect((await repo.findById(eventId))?.locationImageUrl).toBe("https://cdn.example.com/venue.png");

    await updateEventDetails(repo, eventId, { ...input, tagline: "later edit" });
    expect((await repo.findById(eventId))?.locationImageUrl).toBe("https://cdn.example.com/venue.png");

    await updateEventDetails(repo, eventId, input, undefined, undefined, undefined, null);
    expect((await repo.findById(eventId))?.locationImageUrl).toBeNull();
  });
});
