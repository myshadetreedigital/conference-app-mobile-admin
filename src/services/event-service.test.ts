import { describe, expect, it } from "vitest";
import { InMemoryEventRepository } from "@/test/in-memory-event-repository";
import { createEvent, publishEvent, archiveEvent, renameEvent, updateEventDetails } from "./event-service";

describe("createEvent", () => {
  it("derives the slug from the name", async () => {
    const repo = new InMemoryEventRepository();
    const result = await createEvent(repo, "org-1", { name: "The Opticon Expedition 2026!" });
    expect(result.status).toBe("created");
    if (result.status === "created") {
      expect(result.event.slug).toBe("the-opticon-expedition-2026");
    }
  });

  it("appends -2, -3 on slug collision", async () => {
    const repo = new InMemoryEventRepository();
    await createEvent(repo, "org-1", { name: "Opticon" });
    const second = await createEvent(repo, "org-2", { name: "Opticon" });
    const third = await createEvent(repo, "org-3", { name: "Opticon" });

    if (second.status === "created") expect(second.event.slug).toBe("opticon-2");
    if (third.status === "created") expect(third.event.slug).toBe("opticon-3");
  });

  it("falls back to a random slug when the name has nothing sluggable", async () => {
    const repo = new InMemoryEventRepository();
    const result = await createEvent(repo, "org-1", { name: "日本語" });
    expect(result.status).toBe("created");
    if (result.status === "created") {
      expect(result.event.slug.length).toBeGreaterThan(0);
    }
  });

  it("rejects an empty name", async () => {
    const repo = new InMemoryEventRepository();
    const result = await createEvent(repo, "org-1", { name: "   " });
    expect(result.status).toBe("invalid");
  });
});

describe("publishEvent / archiveEvent", () => {
  it("publishes an event with no other live event in the org", async () => {
    const repo = new InMemoryEventRepository();
    const created = await createEvent(repo, "org-1", { name: "2026 Conference" });
    if (created.status !== "created") throw new Error("setup failed");

    const result = await publishEvent(repo, created.event.id);
    expect(result.status).toBe("published");
  });

  it("refuses to publish a second live event in the same org", async () => {
    const repo = new InMemoryEventRepository();
    const first = await createEvent(repo, "org-1", { name: "2026 Conference" });
    const second = await createEvent(repo, "org-1", { name: "2027 Conference" });
    if (first.status !== "created" || second.status !== "created") throw new Error("setup failed");

    await publishEvent(repo, first.event.id);
    const result = await publishEvent(repo, second.event.id);
    expect(result.status).toBe("already_live_elsewhere");
  });

  it("allows publishing a second event once the first is archived", async () => {
    const repo = new InMemoryEventRepository();
    const first = await createEvent(repo, "org-1", { name: "2026 Conference" });
    const second = await createEvent(repo, "org-1", { name: "2027 Conference" });
    if (first.status !== "created" || second.status !== "created") throw new Error("setup failed");

    await publishEvent(repo, first.event.id);
    await archiveEvent(repo, first.event.id);
    const result = await publishEvent(repo, second.event.id);
    expect(result.status).toBe("published");
  });

  it("allows two different orgs to each have their own live event", async () => {
    const repo = new InMemoryEventRepository();
    const a = await createEvent(repo, "org-a", { name: "Conference A" });
    const b = await createEvent(repo, "org-b", { name: "Conference B" });
    if (a.status !== "created" || b.status !== "created") throw new Error("setup failed");

    const resultA = await publishEvent(repo, a.event.id);
    const resultB = await publishEvent(repo, b.event.id);
    expect(resultA.status).toBe("published");
    expect(resultB.status).toBe("published");
  });
});

describe("renameEvent", () => {
  it("updates the event's name", async () => {
    const repo = new InMemoryEventRepository();
    const created = await createEvent(repo, "org-1", { name: "Original Name" });
    if (created.status !== "created") throw new Error("setup failed");

    const result = await renameEvent(repo, created.event.id, { name: "New Name" });
    expect(result.status).toBe("renamed");

    const events = await repo.listByOrganization("org-1");
    expect(events[0].name).toBe("New Name");
  });

  it("does not change the slug", async () => {
    const repo = new InMemoryEventRepository();
    const created = await createEvent(repo, "org-1", { name: "Original Name" });
    if (created.status !== "created") throw new Error("setup failed");

    await renameEvent(repo, created.event.id, { name: "Completely Different Name" });
    const events = await repo.listByOrganization("org-1");
    expect(events[0].slug).toBe(created.event.slug);
  });

  it("rejects an empty name", async () => {
    const repo = new InMemoryEventRepository();
    const created = await createEvent(repo, "org-1", { name: "Original Name" });
    if (created.status !== "created") throw new Error("setup failed");

    const result = await renameEvent(repo, created.event.id, { name: "  " });
    expect(result.status).toBe("invalid");
  });
});

describe("updateEventDetails", () => {
  it("updates tagline, description, location, and dates", async () => {
    const repo = new InMemoryEventRepository();
    const created = await createEvent(repo, "org-1", { name: "2026 Conference" });
    if (created.status !== "created") throw new Error("setup failed");

    const result = await updateEventDetails(repo, created.event.id, {
      tagline: "Three days of talks",
      description: "A conference about developer tools.",
      location: "Javits Center, New York",
      startsAt: "2026-10-15",
      endsAt: "2026-10-17",
    });
    expect(result.status).toBe("updated");

    const [event] = await repo.listByOrganization("org-1");
    expect(event.tagline).toBe("Three days of talks");
    expect(event.location).toBe("Javits Center, New York");
    expect(event.startsAt).toBe("2026-10-15");
    expect(event.endsAt).toBe("2026-10-17");
  });

  it("leaves the logo unchanged when no new logo is given", async () => {
    const repo = new InMemoryEventRepository();
    const created = await createEvent(repo, "org-1", { name: "2026 Conference" });
    if (created.status !== "created") throw new Error("setup failed");

    await updateEventDetails(
      repo,
      created.event.id,
      { tagline: "", description: "", location: "", startsAt: null, endsAt: null },
      "https://example.com/original.png",
    );
    await updateEventDetails(repo, created.event.id, {
      tagline: "Updated",
      description: "",
      location: "",
      startsAt: null,
      endsAt: null,
    });

    const [event] = await repo.listByOrganization("org-1");
    expect(event.logoUrl).toBe("https://example.com/original.png");
  });

  it("replaces the logo when a new one is given", async () => {
    const repo = new InMemoryEventRepository();
    const created = await createEvent(repo, "org-1", { name: "2026 Conference" });
    if (created.status !== "created") throw new Error("setup failed");

    await updateEventDetails(
      repo,
      created.event.id,
      { tagline: "", description: "", location: "", startsAt: null, endsAt: null },
      "https://example.com/new.png",
    );

    const [event] = await repo.listByOrganization("org-1");
    expect(event.logoUrl).toBe("https://example.com/new.png");
  });
});
