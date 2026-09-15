import { describe, expect, it } from "vitest";
import { InMemorySpeakerRepository } from "@/test/in-memory-speaker-repository";
import { createSpeaker, deleteSpeaker } from "./speaker-service";

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

describe("deleteSpeaker", () => {
  it("removes the speaker", async () => {
    const repo = new InMemorySpeakerRepository();
    const created = await createSpeaker(repo, "event-1", { name: "A", title: "", bio: "" });
    if (created.status !== "created") throw new Error("setup failed");
    await deleteSpeaker(repo, created.speaker.id);
    expect(await repo.listByEvent("event-1")).toHaveLength(0);
  });
});
