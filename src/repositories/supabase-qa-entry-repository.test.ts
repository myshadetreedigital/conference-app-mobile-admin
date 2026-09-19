import { describe, expect, it } from "vitest";
import { createFakeSupabase } from "@/test/fake-supabase";
import { SupabaseQaEntryRepository } from "./supabase-qa-entry-repository";

const row = {
  id: "q-1",
  event_id: "evt-1",
  section_id: "sec-1",
  position: 0,
  question: "Is there parking?",
  answer: "Yes, in the garage.",
};

const expected = {
  id: "q-1",
  eventId: "evt-1",
  sectionId: "sec-1",
  position: 0,
  question: "Is there parking?",
  answer: "Yes, in the garage.",
};

describe("SupabaseQaEntryRepository.listByEvent", () => {
  it("maps rows, ordered by section, position, then creation time", async () => {
    const fake = createFakeSupabase({ data: [row] });
    expect(await new SupabaseQaEntryRepository(fake.client).listByEvent("evt-1")).toEqual([expected]);
    const call = fake.only();
    expect(call.target).toBe("event_info_qa_entries");
    expect(call.ops).toEqual([
      { method: "select", args: ["*"] },
      { method: "eq", args: ["event_id", "evt-1"] },
      { method: "order", args: ["section_id", { ascending: true }] },
      { method: "order", args: ["position", { ascending: true }] },
      { method: "order", args: ["created_at", { ascending: true }] },
    ]);
  });

  it("returns [] for no data and throws the Supabase error", async () => {
    expect(await new SupabaseQaEntryRepository(createFakeSupabase().client).listByEvent("evt-1")).toEqual([]);
    const error = { message: "boom" };
    await expect(new SupabaseQaEntryRepository(createFakeSupabase({ error }).client).listByEvent("e")).rejects.toBe(
      error,
    );
  });
});

describe("SupabaseQaEntryRepository.create", () => {
  const input = { eventId: "evt-1", sectionId: "sec-1", question: "Is there parking?", answer: "Yes." };

  it("appends after the section's last entry", async () => {
    const fake = createFakeSupabase([{ data: [{ position: 4 }] }, { data: { ...row, position: 5 } }]);
    const entry = await new SupabaseQaEntryRepository(fake.client).create(input);

    expect(fake.calls).toHaveLength(2);
    const [lookup, insert] = fake.calls;
    expect(lookup.target).toBe("event_info_qa_entries");
    expect(lookup.ops).toEqual([
      { method: "select", args: ["position"] },
      { method: "eq", args: ["section_id", "sec-1"] },
      { method: "order", args: ["position", { ascending: false }] },
      { method: "limit", args: [1] },
    ]);
    expect(insert.arg("insert")).toEqual({
      event_id: "evt-1",
      section_id: "sec-1",
      position: 5,
      question: "Is there parking?",
      answer: "Yes.",
    });
    expect(insert.has("select")).toBe(true);
    expect(insert.has("single")).toBe(true);
    expect(entry.position).toBe(5);
  });

  it("starts at position 0 in a section with no entries", async () => {
    const fake = createFakeSupabase([{ data: [] }, { data: row }]);
    await new SupabaseQaEntryRepository(fake.client).create(input);
    expect(fake.calls[1].arg("insert")).toMatchObject({ position: 0 });
  });

  it("treats a last position of 0 as an existing entry, not an empty section", async () => {
    const fake = createFakeSupabase([{ data: [{ position: 0 }] }, { data: row }]);
    await new SupabaseQaEntryRepository(fake.client).create(input);
    expect(fake.calls[1].arg("insert")).toMatchObject({ position: 1 });
  });

  it("throws the lookup error without inserting", async () => {
    const error = { message: "lookup failed" };
    const fake = createFakeSupabase([{ error }]);
    await expect(new SupabaseQaEntryRepository(fake.client).create(input)).rejects.toBe(error);
    expect(fake.calls).toHaveLength(1);
  });

  it("throws the insert error", async () => {
    const error = { message: "denied" };
    const fake = createFakeSupabase([{ data: [] }, { error }]);
    await expect(new SupabaseQaEntryRepository(fake.client).create(input)).rejects.toBe(error);
  });
});

describe("SupabaseQaEntryRepository update and delete", () => {
  it("update patches the question and answer by id", async () => {
    const fake = createFakeSupabase();
    await new SupabaseQaEntryRepository(fake.client).update("q-1", { question: "Q?", answer: "A." });
    expect(fake.only().arg("update")).toEqual({ question: "Q?", answer: "A." });
    expect(fake.only().ops.find((o) => o.method === "eq")?.args).toEqual(["id", "q-1"]);
  });

  it("delete removes by id", async () => {
    const fake = createFakeSupabase();
    await new SupabaseQaEntryRepository(fake.client).delete("q-1");
    expect(fake.only().has("delete")).toBe(true);
    expect(fake.only().ops.find((o) => o.method === "eq")?.args).toEqual(["id", "q-1"]);
  });

  it.each([
    ["update", (r: SupabaseQaEntryRepository) => r.update("q", { question: "Q", answer: "" })],
    ["delete", (r: SupabaseQaEntryRepository) => r.delete("q")],
  ])("%s throws the Supabase error", async (_name, run) => {
    const error = { message: "boom" };
    await expect(run(new SupabaseQaEntryRepository(createFakeSupabase({ error }).client))).rejects.toBe(error);
  });
});

describe("SupabaseQaEntryRepository.reorder", () => {
  it("writes each entry's new position, scoped to the section", async () => {
    const fake = createFakeSupabase();
    await new SupabaseQaEntryRepository(fake.client).reorder("sec-1", ["c", "a", "b"]);

    expect(fake.calls).toHaveLength(3);
    const written = fake.calls.map((c) => ({
      position: (c.arg("update") as { position: number }).position,
      filters: c.ops.filter((o) => o.method === "eq").map((o) => o.args),
    }));
    expect(written).toEqual([
      { position: 0, filters: [["id", "c"], ["section_id", "sec-1"]] },
      { position: 1, filters: [["id", "a"], ["section_id", "sec-1"]] },
      { position: 2, filters: [["id", "b"], ["section_id", "sec-1"]] },
    ]);
  });

  it("does nothing for an empty list", async () => {
    const fake = createFakeSupabase();
    await new SupabaseQaEntryRepository(fake.client).reorder("sec-1", []);
    expect(fake.calls).toHaveLength(0);
  });

  it("throws if any update fails", async () => {
    const error = { message: "denied" };
    const fake = createFakeSupabase([{}, { error }, {}]);
    await expect(new SupabaseQaEntryRepository(fake.client).reorder("sec-1", ["a", "b", "c"])).rejects.toBe(error);
  });
});
