import { describe, expect, it } from "vitest";
import { createFakeSupabase } from "@/test/fake-supabase";
import { SupabaseSessionRepository } from "./supabase-session-repository";

const row = {
  id: "s-1",
  event_id: "evt-1",
  title: "Opening keynote",
  description: "Welcome",
  starts_at: "2026-10-01T09:00:00Z",
  ends_at: "2026-10-01T10:00:00Z",
  location: "Main hall",
};

const expected = {
  id: "s-1",
  eventId: "evt-1",
  title: "Opening keynote",
  description: "Welcome",
  startsAt: "2026-10-01T09:00:00Z",
  endsAt: "2026-10-01T10:00:00Z",
  location: "Main hall",
  speakerIds: [],
};

describe("SupabaseSessionRepository", () => {
  it("listByEvent maps rows and filters/orders by event and creation time", async () => {
    const fake = createFakeSupabase({ data: [row] });
    expect(await new SupabaseSessionRepository(fake.client).listByEvent("evt-1")).toEqual([expected]);
    const call = fake.only();
    expect(call.target).toBe("sessions");
    expect(call.ops).toEqual([
      { method: "select", args: ["*, session_speakers(speaker_id)"] },
      { method: "eq", args: ["event_id", "evt-1"] },
      { method: "order", args: ["created_at", { ascending: true }] },
    ]);
  });

  it("listByEvent returns [] for no data and keeps null times", async () => {
    expect(await new SupabaseSessionRepository(createFakeSupabase().client).listByEvent("evt-1")).toEqual([]);
    const fake = createFakeSupabase({ data: [{ ...row, starts_at: null, ends_at: null }] });
    const [session] = await new SupabaseSessionRepository(fake.client).listByEvent("evt-1");
    expect(session.startsAt).toBeNull();
    expect(session.endsAt).toBeNull();
  });

  it("create inserts snake_case columns and returns the stored row", async () => {
    const fake = createFakeSupabase({ data: row });
    const session = await new SupabaseSessionRepository(fake.client).create({
      eventId: "evt-1",
      title: "Opening keynote",
      description: "Welcome",
      location: "Main hall",
      startsAt: "2026-10-01T09:00:00Z",
      endsAt: "2026-10-01T10:00:00Z",
      speakerIds: [],
    });
    expect(fake.only().arg("insert")).toEqual({
      event_id: "evt-1",
      title: "Opening keynote",
      description: "Welcome",
      location: "Main hall",
      starts_at: "2026-10-01T09:00:00Z",
      ends_at: "2026-10-01T10:00:00Z",
    });
    expect(session).toEqual(expected);
  });

  it("listByEvent returns each session's linked speaker ids", async () => {
    const fake = createFakeSupabase({
      data: [{ ...row, session_speakers: [{ speaker_id: "sp-1" }, { speaker_id: "sp-2" }] }, { ...row, id: "s-2", session_speakers: [] }],
    });
    const [first, second] = await new SupabaseSessionRepository(fake.client).listByEvent("evt-1");
    expect(first.speakerIds).toEqual(["sp-1", "sp-2"]);
    expect(second.speakerIds).toEqual([]);
  });

  it("create also links the chosen speakers, and skips the link insert when there are none", async () => {
    const fake = createFakeSupabase([{ data: row }, {}]);
    const session = await new SupabaseSessionRepository(fake.client).create({
      eventId: "evt-1",
      title: "t",
      description: "",
      location: "",
      startsAt: null,
      endsAt: null,
      speakerIds: ["sp-1", "sp-2"],
    });
    expect(fake.calls.map((c) => c.target)).toEqual(["sessions", "session_speakers"]);
    expect(fake.calls[1].arg("insert")).toEqual([
      { session_id: "s-1", speaker_id: "sp-1" },
      { session_id: "s-1", speaker_id: "sp-2" },
    ]);
    expect(session.speakerIds).toEqual(["sp-1", "sp-2"]);

    const none = createFakeSupabase({ data: row });
    await new SupabaseSessionRepository(none.client).create({
      eventId: "evt-1", title: "t", description: "", location: "", startsAt: null, endsAt: null, speakerIds: [],
    });
    expect(none.calls.map((c) => c.target)).toEqual(["sessions"]);
  });

  describe("update", () => {
    const data = {
      title: "New",
      description: "d",
      location: "l",
      startsAt: "2026-10-01T09:00:00Z",
      endsAt: null,
      speakerIds: ["sp-2", "sp-3"],
    };

    it("updates the session's columns by id", async () => {
      const fake = createFakeSupabase([{}, { data: [] }]);
      await new SupabaseSessionRepository(fake.client).update("s-1", data);
      const call = fake.calls[0];
      expect(call.target).toBe("sessions");
      expect(call.arg("update")).toEqual({
        title: "New",
        description: "d",
        location: "l",
        starts_at: "2026-10-01T09:00:00Z",
        ends_at: null,
      });
      expect(call.ops.find((o) => o.method === "eq")?.args).toEqual(["id", "s-1"]);
    });

    it("adds only the new links and removes only the dropped ones, adding first", async () => {
      const fake = createFakeSupabase([{}, { data: [{ speaker_id: "sp-1" }, { speaker_id: "sp-2" }] }, {}, {}]);
      await new SupabaseSessionRepository(fake.client).update("s-1", data);
      expect(fake.calls.map((c) => `${c.target}:${["insert", "delete", "select"].find((m) => c.has(m))}`)).toEqual([
        "sessions:undefined",
        "session_speakers:select",
        "session_speakers:insert",
        "session_speakers:delete",
      ]);
      expect(fake.calls[2].arg("insert")).toEqual([{ session_id: "s-1", speaker_id: "sp-3" }]);
      const del = fake.calls[3];
      expect(del.ops.filter((o) => o.method === "eq").map((o) => o.args)).toEqual([["session_id", "s-1"]]);
      expect(del.ops.find((o) => o.method === "in")?.args).toEqual(["speaker_id", ["sp-1"]]);
    });

    it("touches no links when they already match", async () => {
      const fake = createFakeSupabase([{}, { data: [{ speaker_id: "sp-3" }, { speaker_id: "sp-2" }] }]);
      await new SupabaseSessionRepository(fake.client).update("s-1", data);
      expect(fake.calls.map((c) => c.target)).toEqual(["sessions", "session_speakers"]);
    });

    it("throws the error from whichever step fails", async () => {
      const error = { message: "boom" };
      await expect(
        new SupabaseSessionRepository(createFakeSupabase([{ error }]).client).update("s-1", data),
      ).rejects.toBe(error);
      await expect(
        new SupabaseSessionRepository(createFakeSupabase([{}, { error }]).client).update("s-1", data),
      ).rejects.toBe(error);
      await expect(
        new SupabaseSessionRepository(createFakeSupabase([{}, { data: [] }, { error }]).client).update("s-1", data),
      ).rejects.toBe(error);
    });
  });

  it("delete removes by id", async () => {
    const fake = createFakeSupabase();
    await new SupabaseSessionRepository(fake.client).delete("s-1");
    expect(fake.only().has("delete")).toBe(true);
    expect(fake.only().ops.find((o) => o.method === "eq")?.args).toEqual(["id", "s-1"]);
  });

  it.each([
    ["listByEvent", (r: SupabaseSessionRepository) => r.listByEvent("evt-1")],
    [
      "create",
      (r: SupabaseSessionRepository) =>
        r.create({ eventId: "e", title: "t", description: "", location: "", startsAt: null, endsAt: null, speakerIds: [] }),
    ],
    ["delete", (r: SupabaseSessionRepository) => r.delete("s-1")],
  ])("%s throws the Supabase error", async (_name, run) => {
    const error = { message: "boom" };
    const repo = new SupabaseSessionRepository(createFakeSupabase({ error }).client);
    await expect(run(repo)).rejects.toBe(error);
  });
});
