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
};

describe("SupabaseSessionRepository", () => {
  it("listByEvent maps rows and filters/orders by event and creation time", async () => {
    const fake = createFakeSupabase({ data: [row] });
    expect(await new SupabaseSessionRepository(fake.client).listByEvent("evt-1")).toEqual([expected]);
    const call = fake.only();
    expect(call.target).toBe("sessions");
    expect(call.ops).toEqual([
      { method: "select", args: ["*"] },
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
        r.create({ eventId: "e", title: "t", description: "", location: "", startsAt: null, endsAt: null }),
    ],
    ["delete", (r: SupabaseSessionRepository) => r.delete("s-1")],
  ])("%s throws the Supabase error", async (_name, run) => {
    const error = { message: "boom" };
    const repo = new SupabaseSessionRepository(createFakeSupabase({ error }).client);
    await expect(run(repo)).rejects.toBe(error);
  });
});
