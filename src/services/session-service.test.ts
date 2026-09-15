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

describe("createSession date/time", () => {
  it("accepts a session with no date/time at all", async () => {
    const repo = new InMemorySessionRepository();
    const result = await createSession(repo, "event-1", { title: "A", description: "", location: "" });
    expect(result.status).toBe("created");
    if (result.status === "created") {
      expect(result.session.startsAt).toBeNull();
      expect(result.session.endsAt).toBeNull();
    }
  });

  it("normalizes a valid start time to an ISO string", async () => {
    const repo = new InMemorySessionRepository();
    const result = await createSession(repo, "event-1", {
      title: "A",
      description: "",
      location: "",
      startsAt: "2026-09-20T14:30",
    });
    expect(result.status).toBe("created");
    if (result.status === "created") {
      expect(result.session.startsAt).toBe(new Date("2026-09-20T14:30").toISOString());
      expect(result.session.endsAt).toBeNull();
    }
  });

  it("rejects an unparseable date/time", async () => {
    const repo = new InMemorySessionRepository();
    const result = await createSession(repo, "event-1", {
      title: "A",
      description: "",
      location: "",
      startsAt: "not-a-date",
    });
    expect(result.status).toBe("invalid");
  });

  it("rejects an end time before the start time", async () => {
    const repo = new InMemorySessionRepository();
    const result = await createSession(repo, "event-1", {
      title: "A",
      description: "",
      location: "",
      startsAt: "2026-09-20T14:30",
      endsAt: "2026-09-20T10:00",
    });
    expect(result.status).toBe("invalid");
  });

  it("accepts an end time after the start time", async () => {
    const repo = new InMemorySessionRepository();
    const result = await createSession(repo, "event-1", {
      title: "A",
      description: "",
      location: "",
      startsAt: "2026-09-20T14:30",
      endsAt: "2026-09-20T15:30",
    });
    expect(result.status).toBe("created");
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
