import { describe, expect, it } from "vitest";
import { createFakeSupabase } from "@/test/fake-supabase";
import { SupabaseEventInfoSectionRepository } from "./supabase-event-info-section-repository";

const row = { id: "i-1", event_id: "evt-1", icon: "plane", title: "Getting here", body: "Fly to ATL" };
const expected = { id: "i-1", eventId: "evt-1", icon: "plane", title: "Getting here", body: "Fly to ATL" };

describe("SupabaseEventInfoSectionRepository", () => {
  it("listByEvent maps rows and filters/orders by event and creation time", async () => {
    const fake = createFakeSupabase({ data: [row] });
    expect(await new SupabaseEventInfoSectionRepository(fake.client).listByEvent("evt-1")).toEqual([expected]);
    const call = fake.only();
    expect(call.target).toBe("event_info_sections");
    expect(call.ops).toEqual([
      { method: "select", args: ["*"] },
      { method: "eq", args: ["event_id", "evt-1"] },
      { method: "order", args: ["created_at", { ascending: true }] },
    ]);
  });

  it("listByEvent returns [] for no data", async () => {
    const repo = new SupabaseEventInfoSectionRepository(createFakeSupabase().client);
    expect(await repo.listByEvent("evt-1")).toEqual([]);
  });

  it("create inserts snake_case columns and returns the stored row", async () => {
    const fake = createFakeSupabase({ data: row });
    const section = await new SupabaseEventInfoSectionRepository(fake.client).create({
      eventId: "evt-1",
      icon: "plane",
      title: "Getting here",
      body: "Fly to ATL",
    });
    expect(fake.only().arg("insert")).toEqual({
      event_id: "evt-1",
      icon: "plane",
      title: "Getting here",
      body: "Fly to ATL",
    });
    expect(section).toEqual(expected);
  });

  it("update patches icon, title, and body by id", async () => {
    const fake = createFakeSupabase();
    await new SupabaseEventInfoSectionRepository(fake.client).update("i-1", {
      icon: "map",
      title: "T",
      body: "B",
    });
    expect(fake.only().arg("update")).toEqual({ icon: "map", title: "T", body: "B" });
    expect(fake.only().ops.find((o) => o.method === "eq")?.args).toEqual(["id", "i-1"]);
  });

  it("delete removes by id", async () => {
    const fake = createFakeSupabase();
    await new SupabaseEventInfoSectionRepository(fake.client).delete("i-1");
    expect(fake.only().has("delete")).toBe(true);
    expect(fake.only().ops.find((o) => o.method === "eq")?.args).toEqual(["id", "i-1"]);
  });

  it.each([
    ["listByEvent", (r: SupabaseEventInfoSectionRepository) => r.listByEvent("e")],
    [
      "create",
      (r: SupabaseEventInfoSectionRepository) => r.create({ eventId: "e", icon: "info", title: "t", body: "" }),
    ],
    ["update", (r: SupabaseEventInfoSectionRepository) => r.update("i", { icon: "info", title: "t", body: "" })],
    ["delete", (r: SupabaseEventInfoSectionRepository) => r.delete("i")],
  ])("%s throws the Supabase error", async (_name, run) => {
    const error = { message: "boom" };
    const repo = new SupabaseEventInfoSectionRepository(createFakeSupabase({ error }).client);
    await expect(run(repo)).rejects.toBe(error);
  });
});
