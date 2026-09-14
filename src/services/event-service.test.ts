import { describe, expect, it } from "vitest";
import { InMemoryEventRepository } from "@/test/in-memory-event-repository";
import { createEvent, publishEvent, archiveEvent } from "./event-service";

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
