import { describe, expect, it } from "vitest";
import { InMemorySessionRepository } from "@/test/in-memory-session-repository";
import { createSession, deleteSession } from "./session-service";

describe("createSession", () => {
  it("creates a session scoped to the given event", async () => {
    const repo = new InMemorySessionRepository();
    const result = await createSession(repo, "event-1", {
      title: "Opening Keynote",
      description: "Welcome remarks",
      location: "Main Hall",
    });
    expect(result.status).toBe("created");
    if (result.status === "created") {
      expect(result.session.eventId).toBe("event-1");
      expect(result.session.title).toBe("Opening Keynote");
    }
  });

  it("rejects an empty title", async () => {
    const repo = new InMemorySessionRepository();
    const result = await createSession(repo, "event-1", { title: "  ", description: "", location: "" });
    expect(result.status).toBe("invalid");
  });

  it("only lists sessions for the requested event", async () => {
    const repo = new InMemorySessionRepository();
    await createSession(repo, "event-1", { title: "A", description: "", location: "" });
    await createSession(repo, "event-2", { title: "B", description: "", location: "" });
    const list = await repo.listByEvent("event-1");
    expect(list).toHaveLength(1);
    expect(list[0].title).toBe("A");
  });
});

describe("deleteSession", () => {
  it("removes the session", async () => {
    const repo = new InMemorySessionRepository();
    const created = await createSession(repo, "event-1", { title: "A", description: "", location: "" });
    if (created.status !== "created") throw new Error("setup failed");
    await deleteSession(repo, created.session.id);
    expect(await repo.listByEvent("event-1")).toHaveLength(0);
  });
});
