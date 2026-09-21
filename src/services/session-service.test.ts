import { describe, expect, it } from "vitest";
import { InMemorySessionRepository } from "@/test/in-memory-session-repository";
import { createSession, deleteSession, updateSession } from "./session-service";

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

describe("session speakers", () => {
  const blank = { title: "Panel", description: "", location: "" };

  it("links the chosen speakers on create, once each", async () => {
    const repo = new InMemorySessionRepository();
    const result = await createSession(repo, "event-1", { ...blank, speakerIds: ["a", "b", "a"] }, ["a", "b", "c"]);
    expect(result.status).toBe("created");
    if (result.status === "created") expect(result.session.speakerIds).toEqual(["a", "b"]);
  });

  it("creates a session with no speakers when none are sent", async () => {
    const repo = new InMemorySessionRepository();
    const result = await createSession(repo, "event-1", blank, ["a"]);
    if (result.status === "created") expect(result.session.speakerIds).toEqual([]);
    expect(result.status).toBe("created");
  });

  it("rejects a speaker that isn't in this event's list, and saves nothing", async () => {
    const repo = new InMemorySessionRepository();
    const result = await createSession(repo, "event-1", { ...blank, speakerIds: ["other-event"] }, ["a"]);
    expect(result.status).toBe("invalid");
    expect(await repo.listByEvent("event-1")).toEqual([]);
  });
});

describe("updateSession", () => {
  async function setup() {
    const repo = new InMemorySessionRepository();
    const created = await createSession(repo, "event-1", { title: "Old", description: "", location: "", speakerIds: ["a"] }, ["a", "b"]);
    if (created.status !== "created") throw new Error("setup");
    return { repo, id: created.session.id };
  }

  it("changes the fields, times and speakers", async () => {
    const { repo, id } = await setup();
    const result = await updateSession(
      repo,
      id,
      { title: " New title ", description: "d", location: "Hall", startsAt: "2026-10-01T09:00", endsAt: "2026-10-01T10:00", speakerIds: ["b"] },
      ["a", "b"],
    );
    expect(result.status).toBe("updated");
    const [session] = await repo.listByEvent("event-1");
    expect(session).toMatchObject({ title: "New title", description: "d", location: "Hall", speakerIds: ["b"] });
    expect(session.startsAt).toBe(new Date("2026-10-01T09:00").toISOString());
  });

  it("can remove every speaker and clear the times", async () => {
    const { repo, id } = await setup();
    await updateSession(repo, id, { title: "Old", description: "", location: "", startsAt: "", endsAt: "", speakerIds: [] }, ["a"]);
    const [session] = await repo.listByEvent("event-1");
    expect(session.speakerIds).toEqual([]);
    expect(session.startsAt).toBeNull();
  });

  it.each([
    ["an empty title", { title: " " }],
    ["an end before the start", { startsAt: "2026-10-01T10:00", endsAt: "2026-10-01T09:00" }],
    ["a bad date", { startsAt: "not a date" }],
    ["a speaker from another event", { speakerIds: ["zzz"] }],
  ])("rejects %s and leaves the session unchanged", async (_label, bad) => {
    const { repo, id } = await setup();
    const result = await updateSession(repo, id, { title: "New", description: "", location: "", ...bad }, ["a", "b"]);
    expect(result.status).toBe("invalid");
    const [session] = await repo.listByEvent("event-1");
    expect(session.title).toBe("Old");
    expect(session.speakerIds).toEqual(["a"]);
  });
});
