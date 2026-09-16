import { describe, expect, it } from "vitest";
import { InMemorySpeakerRepository } from "@/test/in-memory-speaker-repository";
import { createSpeaker, updateSpeaker, deleteSpeaker } from "./speaker-service";

describe("createSpeaker", () => {
  it("creates a speaker scoped to the given event", async () => {
    const repo = new InMemorySpeakerRepository();
    const result = await createSpeaker(repo, "event-1", {
      name: "Ada Lovelace",
      title: "Keynote",
      bio: "Mathematician",
    });
    expect(result.status).toBe("created");
    if (result.status === "created") {
      expect(result.speaker.eventId).toBe("event-1");
      expect(result.speaker.name).toBe("Ada Lovelace");
      expect(result.speaker.featured).toBe(false);
    }
  });

  it("creates a featured speaker when requested", async () => {
    const repo = new InMemorySpeakerRepository();
    const result = await createSpeaker(repo, "event-1", {
      name: "Ada Lovelace",
      title: "",
      bio: "",
      featured: true,
    });
    expect(result.status).toBe("created");
    if (result.status === "created") {
      expect(result.speaker.featured).toBe(true);
    }
  });

  it("rejects an empty name", async () => {
    const repo = new InMemorySpeakerRepository();
    const result = await createSpeaker(repo, "event-1", { name: "  ", title: "", bio: "" });
    expect(result.status).toBe("invalid");
  });

  it("only lists speakers for the requested event", async () => {
    const repo = new InMemorySpeakerRepository();
    await createSpeaker(repo, "event-1", { name: "A", title: "", bio: "" });
    await createSpeaker(repo, "event-2", { name: "B", title: "", bio: "" });
    const list = await repo.listByEvent("event-1");
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("A");
  });
});

describe("updateSpeaker", () => {
  it("updates the speaker's fields", async () => {
    const repo = new InMemorySpeakerRepository();
    const created = await createSpeaker(repo, "event-1", { name: "A", title: "Old Title", bio: "" });
    if (created.status !== "created") throw new Error("setup failed");

    const result = await updateSpeaker(repo, created.speaker.id, {
      name: "A Updated",
      title: "New Title",
      bio: "New bio",
    });
    expect(result.status).toBe("updated");

    const [speaker] = await repo.listByEvent("event-1");
    expect(speaker.name).toBe("A Updated");
    expect(speaker.title).toBe("New Title");
    expect(speaker.bio).toBe("New bio");
  });

  it("toggles featured on and off", async () => {
    const repo = new InMemorySpeakerRepository();
    const created = await createSpeaker(repo, "event-1", { name: "A", title: "", bio: "" });
    if (created.status !== "created") throw new Error("setup failed");

    await updateSpeaker(repo, created.speaker.id, {
      name: "A",
      title: "",
      bio: "",
      featured: true,
    });
    expect((await repo.listByEvent("event-1"))[0].featured).toBe(true);

    await updateSpeaker(repo, created.speaker.id, {
      name: "A",
      title: "",
      bio: "",
      featured: false,
    });
    expect((await repo.listByEvent("event-1"))[0].featured).toBe(false);
  });

  it("leaves the photo unchanged when no new photo is given", async () => {
    const repo = new InMemorySpeakerRepository();
    const created = await createSpeaker(repo, "event-1", {
      name: "A",
      title: "",
      bio: "",
      photoUrl: "https://example.com/original.png",
    });
    if (created.status !== "created") throw new Error("setup failed");

    await updateSpeaker(repo, created.speaker.id, { name: "A", title: "", bio: "" });

    const [speaker] = await repo.listByEvent("event-1");
    expect(speaker.photoUrl).toBe("https://example.com/original.png");
  });

  it("replaces the photo when a new one is given", async () => {
    const repo = new InMemorySpeakerRepository();
    const created = await createSpeaker(repo, "event-1", {
      name: "A",
      title: "",
      bio: "",
      photoUrl: "https://example.com/original.png",
    });
    if (created.status !== "created") throw new Error("setup failed");

    await updateSpeaker(
      repo,
      created.speaker.id,
      { name: "A", title: "", bio: "" },
      "https://example.com/new.png",
    );

    const [speaker] = await repo.listByEvent("event-1");
    expect(speaker.photoUrl).toBe("https://example.com/new.png");
  });

  it("rejects an empty name", async () => {
    const repo = new InMemorySpeakerRepository();
    const created = await createSpeaker(repo, "event-1", { name: "A", title: "", bio: "" });
    if (created.status !== "created") throw new Error("setup failed");

    const result = await updateSpeaker(repo, created.speaker.id, { name: "  ", title: "", bio: "" });
    expect(result.status).toBe("invalid");
  });
});

describe("deleteSpeaker", () => {
  it("removes the speaker", async () => {
    const repo = new InMemorySpeakerRepository();
    const created = await createSpeaker(repo, "event-1", { name: "A", title: "", bio: "" });
    if (created.status !== "created") throw new Error("setup failed");
    await deleteSpeaker(repo, created.speaker.id);
    expect(await repo.listByEvent("event-1")).toHaveLength(0);
  });
});
