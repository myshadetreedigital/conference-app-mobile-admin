import { describe, expect, it } from "vitest";
import { InMemoryEventInfoSectionRepository } from "@/test/in-memory-event-info-section-repository";
import {
  createEventInfoSection,
  updateEventInfoSection,
  deleteEventInfoSection,
  type CreateEventInfoSectionInput,
} from "./event-info-section-service";

describe("createEventInfoSection", () => {
  it("creates a section scoped to the given event", async () => {
    const repo = new InMemoryEventInfoSectionRepository();
    const result = await createEventInfoSection(repo, "event-1", {
      icon: "plane",
      title: "Getting here",
      body: "Fly into JFK or LaGuardia.",
    });
    expect(result.status).toBe("created");
    if (result.status === "created") {
      expect(result.section.eventId).toBe("event-1");
      expect(result.section.title).toBe("Getting here");
      expect(result.section.icon).toBe("plane");
    }
  });

  it("rejects an empty title", async () => {
    const repo = new InMemoryEventInfoSectionRepository();
    const result = await createEventInfoSection(repo, "event-1", {
      icon: "info",
      title: "  ",
      body: "",
    });
    expect(result.status).toBe("invalid");
  });

  it("rejects an icon outside the fixed set", async () => {
    const repo = new InMemoryEventInfoSectionRepository();
    const result = await createEventInfoSection(repo, "event-1", {
      icon: "rocket" as CreateEventInfoSectionInput["icon"],
      title: "Getting here",
      body: "",
    });
    expect(result.status).toBe("invalid");
  });

  it("only lists sections for the requested event", async () => {
    const repo = new InMemoryEventInfoSectionRepository();
    await createEventInfoSection(repo, "event-1", { icon: "info", title: "A", body: "" });
    await createEventInfoSection(repo, "event-2", { icon: "info", title: "B", body: "" });
    const list = await repo.listByEvent("event-1");
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe("A");
  });
});

describe("updateEventInfoSection", () => {
  it("updates the section's fields", async () => {
    const repo = new InMemoryEventInfoSectionRepository();
    const created = await createEventInfoSection(repo, "event-1", {
      icon: "info",
      title: "Old title",
      body: "Old body",
    });
    if (created.status !== "created") throw new Error("setup failed");

    const result = await updateEventInfoSection(repo, created.section.id, {
      icon: "heart",
      title: "New title",
      body: "New body",
    });
    expect(result.status).toBe("updated");

    const [section] = await repo.listByEvent("event-1");
    expect(section.title).toBe("New title");
    expect(section.body).toBe("New body");
    expect(section.icon).toBe("heart");
  });

  it("rejects an empty title", async () => {
    const repo = new InMemoryEventInfoSectionRepository();
    const created = await createEventInfoSection(repo, "event-1", {
      icon: "info",
      title: "A",
      body: "",
    });
    if (created.status !== "created") throw new Error("setup failed");

    const result = await updateEventInfoSection(repo, created.section.id, {
      icon: "info",
      title: "  ",
      body: "",
    });
    expect(result.status).toBe("invalid");
  });
});

describe("deleteEventInfoSection", () => {
  it("removes the section", async () => {
    const repo = new InMemoryEventInfoSectionRepository();
    const created = await createEventInfoSection(repo, "event-1", {
      icon: "info",
      title: "A",
      body: "",
    });
    if (created.status !== "created") throw new Error("setup failed");
    await deleteEventInfoSection(repo, created.section.id);
    expect(await repo.listByEvent("event-1")).toHaveLength(0);
  });
});
