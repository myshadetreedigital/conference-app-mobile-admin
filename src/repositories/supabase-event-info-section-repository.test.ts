import { describe, expect, it } from "vitest";
import { createFakeSupabase } from "@/test/fake-supabase";
import { SupabaseEventInfoSectionRepository } from "./supabase-event-info-section-repository";

const row = {
  id: "i-1",
  event_id: "evt-1",
  icon: "plane",
  title: "Getting here",
  body: "Fly to ATL",
  link_target: null,
  page_style: "text",
};
const expected = {
  id: "i-1",
  eventId: "evt-1",
  icon: "plane",
  title: "Getting here",
  body: "Fly to ATL",
  linkTarget: null,
  pageStyle: "text",
};

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
      linkTarget: null,
      pageStyle: "text",
    });
    expect(fake.only().arg("insert")).toEqual({
      event_id: "evt-1",
      icon: "plane",
      title: "Getting here",
      body: "Fly to ATL",
      link_target: null,
      page_style: "text",
    });
    expect(section).toEqual(expected);
  });

  it("update patches icon, title, and body by id", async () => {
    const fake = createFakeSupabase();
    await new SupabaseEventInfoSectionRepository(fake.client).update("i-1", {
      icon: "map",
      title: "T",
      body: "B",
      linkTarget: null,
      pageStyle: "text",
    });
    expect(fake.only().arg("update")).toEqual({
      icon: "map",
      title: "T",
      body: "B",
      link_target: null,
      page_style: "text",
    });
    expect(fake.only().ops.find((o) => o.method === "eq")?.args).toEqual(["id", "i-1"]);
  });

  it("maps a row that opens an existing screen, and writes the target on create and update", async () => {
    const readFake = createFakeSupabase({ data: [{ ...row, icon: "presentation", title: "Speakers", link_target: "speakers" }] });
    const [section] = await new SupabaseEventInfoSectionRepository(readFake.client).listByEvent("evt-1");
    expect(section.linkTarget).toBe("speakers");

    const createFake = createFakeSupabase({ data: row });
    await new SupabaseEventInfoSectionRepository(createFake.client).create({
      eventId: "evt-1",
      icon: "presentation",
      title: "Speakers",
      body: "",
      linkTarget: "speakers",
      pageStyle: "text",
    });
    expect(createFake.only().arg("insert")).toMatchObject({ link_target: "speakers" });

    const updateFake = createFakeSupabase();
    await new SupabaseEventInfoSectionRepository(updateFake.client).update("i-1", {
      icon: "presentation",
      title: "Speakers",
      body: "",
      linkTarget: "speakers",
      pageStyle: "text",
    });
    expect(updateFake.only().arg("update")).toMatchObject({ link_target: "speakers" });
  });

  it("maps a Q&A row's page style, and writes it on create and update", async () => {
    const readFake = createFakeSupabase({ data: [{ ...row, title: "FAQ", page_style: "qa" }] });
    const [section] = await new SupabaseEventInfoSectionRepository(readFake.client).listByEvent("evt-1");
    expect(section.pageStyle).toBe("qa");

    const createFake = createFakeSupabase({ data: row });
    await new SupabaseEventInfoSectionRepository(createFake.client).create({
      eventId: "evt-1",
      icon: "info",
      title: "FAQ",
      body: "",
      linkTarget: null,
      pageStyle: "qa",
    });
    expect(createFake.only().arg("insert")).toMatchObject({ page_style: "qa" });

    const updateFake = createFakeSupabase();
    await new SupabaseEventInfoSectionRepository(updateFake.client).update("i-1", {
      icon: "info",
      title: "FAQ",
      body: "",
      linkTarget: null,
      pageStyle: "qa",
    });
    expect(updateFake.only().arg("update")).toMatchObject({ page_style: "qa" });
  });

  it.each([undefined, null, "", "text", "unknown"])("maps page_style %j to a text page", async (pageStyle) => {
    const fake = createFakeSupabase({ data: [{ ...row, page_style: pageStyle }] });
    const [section] = await new SupabaseEventInfoSectionRepository(fake.client).listByEvent("evt-1");
    expect(section.pageStyle).toBe("text");
  });

  it("maps a missing link_target column to null", async () => {
    const { link_target: _omit, ...withoutTarget } = row;
    void _omit;
    const fake = createFakeSupabase({ data: [withoutTarget] });
    const [section] = await new SupabaseEventInfoSectionRepository(fake.client).listByEvent("evt-1");
    expect(section.linkTarget).toBeNull();
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
      (r: SupabaseEventInfoSectionRepository) => r.create({ eventId: "e", icon: "info", title: "t", body: "", linkTarget: null, pageStyle: "text" }),
    ],
    ["update", (r: SupabaseEventInfoSectionRepository) => r.update("i", { icon: "info", title: "t", body: "", linkTarget: null, pageStyle: "text" })],
    ["delete", (r: SupabaseEventInfoSectionRepository) => r.delete("i")],
  ])("%s throws the Supabase error", async (_name, run) => {
    const error = { message: "boom" };
    const repo = new SupabaseEventInfoSectionRepository(createFakeSupabase({ error }).client);
    await expect(run(repo)).rejects.toBe(error);
  });
});
