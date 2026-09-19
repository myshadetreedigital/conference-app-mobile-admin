import { describe, expect, it } from "vitest";
import { createFakeSupabase } from "@/test/fake-supabase";
import { SupabaseEventRepository } from "./supabase-event-repository";

const row = {
  id: "e-1",
  organization_id: "o-1",
  name: "Summit 2026",
  slug: "summit-2026",
  status: "draft",
  logo_url: "https://cdn.example.com/logo.png",
  primary_color: "#1A237E",
  background_color: null,
  text_color: null,
  tagline: "Build together",
  description: "Three days",
  location: "Atlanta",
  starts_at: "2026-10-01T09:00:00Z",
  ends_at: "2026-10-03T17:00:00Z",
  banner_1_image_url: "https://cdn.example.com/b1.png",
  banner_1_link_url: "https://example.com/1",
  banner_2_image_url: null,
  banner_2_link_url: null,
};

const expected = {
  id: "e-1",
  organizationId: "o-1",
  name: "Summit 2026",
  slug: "summit-2026",
  status: "draft",
  logoUrl: "https://cdn.example.com/logo.png",
  primaryColor: "#1A237E",
  backgroundColor: null,
  textColor: null,
  tagline: "Build together",
  description: "Three days",
  location: "Atlanta",
  startsAt: "2026-10-01T09:00:00Z",
  endsAt: "2026-10-03T17:00:00Z",
  banner1ImageUrl: "https://cdn.example.com/b1.png",
  banner1LinkUrl: "https://example.com/1",
  banner2ImageUrl: null,
  banner2LinkUrl: null,
};

const details = {
  tagline: "T",
  description: "D",
  location: "L",
  startsAt: "2026-10-01T09:00:00Z",
  endsAt: null,
  banner1LinkUrl: "https://example.com/1",
  banner2LinkUrl: null,
  primaryColor: "#1A237E",
};

describe("SupabaseEventRepository reads", () => {
  it("listByOrganization maps rows, newest first", async () => {
    const fake = createFakeSupabase({ data: [row] });
    expect(await new SupabaseEventRepository(fake.client).listByOrganization("o-1")).toEqual([expected]);
    const call = fake.only();
    expect(call.target).toBe("events");
    expect(call.ops).toEqual([
      { method: "select", args: ["*"] },
      { method: "eq", args: ["organization_id", "o-1"] },
      { method: "order", args: ["created_at", { ascending: false }] },
    ]);
  });

  it("listByOrganization returns [] for no data", async () => {
    expect(await new SupabaseEventRepository(createFakeSupabase().client).listByOrganization("o-1")).toEqual([]);
  });

  it("findById looks up by id, maps the row, and returns null when absent", async () => {
    const found = createFakeSupabase({ data: row });
    expect(await new SupabaseEventRepository(found.client).findById("e-1")).toEqual(expected);
    expect(found.only().ops).toEqual([
      { method: "select", args: ["*"] },
      { method: "eq", args: ["id", "e-1"] },
      { method: "maybeSingle", args: [] },
    ]);

    const missing = createFakeSupabase({ data: null });
    expect(await new SupabaseEventRepository(missing.client).findById("e-1")).toBeNull();
  });

  it("findBySlug looks up by slug and returns null when absent", async () => {
    const found = createFakeSupabase({ data: row });
    expect(await new SupabaseEventRepository(found.client).findBySlug("summit-2026")).toEqual(expected);
    expect(found.only().ops.find((o) => o.method === "eq")?.args).toEqual(["slug", "summit-2026"]);

    const missing = createFakeSupabase({ data: null });
    expect(await new SupabaseEventRepository(missing.client).findBySlug("nope")).toBeNull();
  });
});

describe("SupabaseEventRepository writes", () => {
  it("create inserts organization, name, and slug and returns the stored row", async () => {
    const fake = createFakeSupabase({ data: row });
    const event = await new SupabaseEventRepository(fake.client).create({
      organizationId: "o-1",
      name: "Summit 2026",
      slug: "summit-2026",
    });
    expect(fake.only().arg("insert")).toEqual({ organization_id: "o-1", name: "Summit 2026", slug: "summit-2026" });
    expect(event).toEqual(expected);
  });

  it("publish sets status to live, archive sets it to archived, both by id", async () => {
    const publish = createFakeSupabase();
    await new SupabaseEventRepository(publish.client).publish("e-1");
    expect(publish.only().arg("update")).toEqual({ status: "live" });
    expect(publish.only().ops.find((o) => o.method === "eq")?.args).toEqual(["id", "e-1"]);

    const archive = createFakeSupabase();
    await new SupabaseEventRepository(archive.client).archive("e-1");
    expect(archive.only().arg("update")).toEqual({ status: "archived" });
  });

  it("rename updates only the name", async () => {
    const fake = createFakeSupabase();
    await new SupabaseEventRepository(fake.client).rename("e-1", "New name");
    expect(fake.only().arg("update")).toEqual({ name: "New name" });
    expect(fake.only().ops.find((o) => o.method === "eq")?.args).toEqual(["id", "e-1"]);
  });

  it("updateDetails leaves image columns out of the patch unless new images are given", async () => {
    const fake = createFakeSupabase();
    await new SupabaseEventRepository(fake.client).updateDetails("e-1", details);
    expect(fake.only().arg("update")).toEqual({
      tagline: "T",
      description: "D",
      location: "L",
      starts_at: "2026-10-01T09:00:00Z",
      ends_at: null,
      banner_1_link_url: "https://example.com/1",
      banner_2_link_url: null,
      primary_color: "#1A237E",
    });
  });

  it("updateDetails includes each image column that is provided, including null to clear", async () => {
    const fake = createFakeSupabase();
    await new SupabaseEventRepository(fake.client).updateDetails("e-1", {
      ...details,
      logoUrl: "https://x/logo.png",
      banner1ImageUrl: null,
      banner2ImageUrl: "https://x/b2.png",
    });
    expect(fake.only().arg("update")).toMatchObject({
      logo_url: "https://x/logo.png",
      banner_1_image_url: null,
      banner_2_image_url: "https://x/b2.png",
    });
  });

  it.each([
    ["listByOrganization", (r: SupabaseEventRepository) => r.listByOrganization("o")],
    ["findById", (r: SupabaseEventRepository) => r.findById("e")],
    ["findBySlug", (r: SupabaseEventRepository) => r.findBySlug("s")],
    ["create", (r: SupabaseEventRepository) => r.create({ organizationId: "o", name: "n", slug: "s" })],
    ["publish", (r: SupabaseEventRepository) => r.publish("e")],
    ["archive", (r: SupabaseEventRepository) => r.archive("e")],
    ["rename", (r: SupabaseEventRepository) => r.rename("e", "n")],
    ["updateDetails", (r: SupabaseEventRepository) => r.updateDetails("e", details)],
  ])("%s throws the Supabase error", async (_name, run) => {
    const error = { message: "boom" };
    const repo = new SupabaseEventRepository(createFakeSupabase({ error }).client);
    await expect(run(repo)).rejects.toBe(error);
  });
});
