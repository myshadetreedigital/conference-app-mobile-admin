import { describe, expect, it } from "vitest";
import { createFakeSupabase } from "@/test/fake-supabase";
import { SupabaseSponsorRepository } from "./supabase-sponsor-repository";

const row = {
  id: "sp-1",
  event_id: "evt-1",
  name: "Acme",
  tier: "gold",
  logo_url: "https://cdn.example.com/acme.png",
  website_url: "https://acme.example.com",
};

const expected = {
  id: "sp-1",
  eventId: "evt-1",
  name: "Acme",
  tier: "gold",
  logoUrl: "https://cdn.example.com/acme.png",
  websiteUrl: "https://acme.example.com",
};

describe("SupabaseSponsorRepository", () => {
  it("listByEvent maps rows and filters/orders by event and creation time", async () => {
    const fake = createFakeSupabase({ data: [row] });
    expect(await new SupabaseSponsorRepository(fake.client).listByEvent("evt-1")).toEqual([expected]);
    const call = fake.only();
    expect(call.target).toBe("sponsors");
    expect(call.ops).toEqual([
      { method: "select", args: ["*"] },
      { method: "eq", args: ["event_id", "evt-1"] },
      { method: "order", args: ["created_at", { ascending: true }] },
    ]);
  });

  it("listByEvent returns [] for no data and maps null urls through", async () => {
    expect(await new SupabaseSponsorRepository(createFakeSupabase().client).listByEvent("evt-1")).toEqual([]);
    const fake = createFakeSupabase({ data: [{ ...row, logo_url: null, website_url: null }] });
    const [sponsor] = await new SupabaseSponsorRepository(fake.client).listByEvent("evt-1");
    expect(sponsor.logoUrl).toBeNull();
    expect(sponsor.websiteUrl).toBeNull();
  });

  it("create inserts the sponsor's columns and returns the stored row", async () => {
    const fake = createFakeSupabase({ data: row });
    const sponsor = await new SupabaseSponsorRepository(fake.client).create({
      eventId: "evt-1",
      name: "Acme",
      tier: "gold",
      logoUrl: "https://cdn.example.com/acme.png",
      websiteUrl: "https://acme.example.com/",
    });
    expect(fake.only().arg("insert")).toEqual({
      event_id: "evt-1",
      name: "Acme",
      tier: "gold",
      logo_url: "https://cdn.example.com/acme.png",
      website_url: "https://acme.example.com/",
    });
    expect(sponsor).toEqual(expected);
  });

  it("update omits logo_url unless a new logo is given", async () => {
    const keep = createFakeSupabase();
    await new SupabaseSponsorRepository(keep.client).update("sp-1", {
      name: "N",
      tier: "silver",
      websiteUrl: null,
    });
    expect(keep.only().arg("update")).toEqual({ name: "N", tier: "silver", website_url: null });

    const replace = createFakeSupabase();
    await new SupabaseSponsorRepository(replace.client).update("sp-1", {
      name: "N",
      tier: "silver",
      websiteUrl: "https://acme.example.com/",
      logoUrl: "https://x/new.png",
    });
    expect(replace.only().arg("update")).toEqual({
      name: "N",
      tier: "silver",
      website_url: "https://acme.example.com/",
      logo_url: "https://x/new.png",
    });
    expect(replace.only().ops.find((o) => o.method === "eq")?.args).toEqual(["id", "sp-1"]);
  });

  it("delete removes by id", async () => {
    const fake = createFakeSupabase();
    await new SupabaseSponsorRepository(fake.client).delete("sp-1");
    expect(fake.only().has("delete")).toBe(true);
    expect(fake.only().ops.find((o) => o.method === "eq")?.args).toEqual(["id", "sp-1"]);
  });

  it.each([
    ["listByEvent", (r: SupabaseSponsorRepository) => r.listByEvent("evt-1")],
    ["create", (r: SupabaseSponsorRepository) => r.create({ eventId: "e", name: "n", tier: "gold", logoUrl: null, websiteUrl: null })],
    ["update", (r: SupabaseSponsorRepository) => r.update("sp-1", { name: "n", tier: "gold", websiteUrl: null })],
    ["delete", (r: SupabaseSponsorRepository) => r.delete("sp-1")],
  ])("%s throws the Supabase error", async (_name, run) => {
    const error = { message: "boom" };
    const repo = new SupabaseSponsorRepository(createFakeSupabase({ error }).client);
    await expect(run(repo)).rejects.toBe(error);
  });
});
