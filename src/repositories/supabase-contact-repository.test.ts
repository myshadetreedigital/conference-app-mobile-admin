import { describe, expect, it } from "vitest";
import { createFakeSupabase } from "@/test/fake-supabase";
import { SupabaseContactRepository } from "./supabase-contact-repository";

const row = {
  id: "c-1",
  owner_id: "u-1",
  event_id: "evt-1",
  name: "Grace Hopper",
  email: "grace@example.com",
  phone: "555-0100",
  notes: "Met at the keynote",
};

const expected = {
  id: "c-1",
  ownerId: "u-1",
  eventId: "evt-1",
  name: "Grace Hopper",
  email: "grace@example.com",
  phone: "555-0100",
  notes: "Met at the keynote",
};

describe("SupabaseContactRepository", () => {
  it("listByOwnerAndEvent filters by both owner and event, oldest first", async () => {
    const fake = createFakeSupabase({ data: [row] });
    expect(await new SupabaseContactRepository(fake.client).listByOwnerAndEvent("u-1", "evt-1")).toEqual([
      expected,
    ]);
    const call = fake.only();
    expect(call.target).toBe("personal_contacts");
    expect(call.ops).toEqual([
      { method: "select", args: ["*"] },
      { method: "eq", args: ["owner_id", "u-1"] },
      { method: "eq", args: ["event_id", "evt-1"] },
      { method: "order", args: ["created_at", { ascending: true }] },
    ]);
  });

  it("listByOwnerAndEvent returns [] for no data", async () => {
    const repo = new SupabaseContactRepository(createFakeSupabase().client);
    expect(await repo.listByOwnerAndEvent("u-1", "evt-1")).toEqual([]);
  });

  it("create inserts snake_case columns and returns the stored row", async () => {
    const fake = createFakeSupabase({ data: row });
    const contact = await new SupabaseContactRepository(fake.client).create({
      ownerId: "u-1",
      eventId: "evt-1",
      name: "Grace Hopper",
      email: "grace@example.com",
      phone: "555-0100",
      notes: "Met at the keynote",
    });
    expect(fake.only().arg("insert")).toEqual({
      owner_id: "u-1",
      event_id: "evt-1",
      name: "Grace Hopper",
      email: "grace@example.com",
      phone: "555-0100",
      notes: "Met at the keynote",
    });
    expect(contact).toEqual(expected);
  });

  it("update patches the editable fields only, by id", async () => {
    const fake = createFakeSupabase();
    await new SupabaseContactRepository(fake.client).update("c-1", {
      name: "G",
      email: "g@example.com",
      phone: "1",
      notes: "n",
    });
    const call = fake.only();
    expect(call.arg("update")).toEqual({ name: "G", email: "g@example.com", phone: "1", notes: "n" });
    expect(call.ops.find((o) => o.method === "eq")?.args).toEqual(["id", "c-1"]);
  });

  it("delete removes by id", async () => {
    const fake = createFakeSupabase();
    await new SupabaseContactRepository(fake.client).delete("c-1");
    expect(fake.only().has("delete")).toBe(true);
    expect(fake.only().ops.find((o) => o.method === "eq")?.args).toEqual(["id", "c-1"]);
  });

  it.each([
    ["listByOwnerAndEvent", (r: SupabaseContactRepository) => r.listByOwnerAndEvent("u", "e")],
    [
      "create",
      (r: SupabaseContactRepository) =>
        r.create({ ownerId: "u", eventId: "e", name: "n", email: "", phone: "", notes: "" }),
    ],
    ["update", (r: SupabaseContactRepository) => r.update("c", { name: "n", email: "", phone: "", notes: "" })],
    ["delete", (r: SupabaseContactRepository) => r.delete("c")],
  ])("%s throws the Supabase error", async (_name, run) => {
    const error = { message: "boom" };
    const repo = new SupabaseContactRepository(createFakeSupabase({ error }).client);
    await expect(run(repo)).rejects.toBe(error);
  });
});
