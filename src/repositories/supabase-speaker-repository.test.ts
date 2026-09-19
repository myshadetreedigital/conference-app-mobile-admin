import { describe, expect, it } from "vitest";
import { SPEAKER_LINK_FIELDS, type SpeakerLinks } from "@/lib/speaker-links";
import { createFakeSupabase } from "@/test/fake-supabase";
import { SupabaseSpeakerRepository } from "./supabase-speaker-repository";

const NO_LINK_COLUMNS = Object.fromEntries(SPEAKER_LINK_FIELDS.map((f) => [f.column, null]));

const row = {
  id: "sp-1",
  event_id: "evt-1",
  name: "Ada Lovelace",
  title: "Keynote",
  bio: "Mathematician",
  photo_url: "https://cdn.example.com/ada.png",
  featured: true,
  ...NO_LINK_COLUMNS,
  website_url: "example.com",
  instagram: "@ada",
  skool: "analytical-engine",
};

const noLinks = Object.fromEntries(SPEAKER_LINK_FIELDS.map((f) => [f.key, null])) as SpeakerLinks;

const expectedSpeaker = {
  id: "sp-1",
  eventId: "evt-1",
  name: "Ada Lovelace",
  title: "Keynote",
  bio: "Mathematician",
  photoUrl: "https://cdn.example.com/ada.png",
  featured: true,
  ...noLinks,
  websiteUrl: "example.com",
  instagram: "@ada",
  skool: "analytical-engine",
};

describe("SupabaseSpeakerRepository.listByEvent", () => {
  it("maps rows (including link columns) to speakers, oldest first", async () => {
    const fake = createFakeSupabase({ data: [row] });
    const speakers = await new SupabaseSpeakerRepository(fake.client).listByEvent("evt-1");

    expect(speakers).toEqual([expectedSpeaker]);
    const call = fake.only();
    expect(call.target).toBe("speakers");
    expect(call.ops).toEqual([
      { method: "select", args: ["*"] },
      { method: "eq", args: ["event_id", "evt-1"] },
      { method: "order", args: ["created_at", { ascending: true }] },
    ]);
  });

  it("maps a missing link column to null", async () => {
    // e.g. a row read before the link columns existed
    const withoutSomeLinks: Record<string, unknown> = { ...row };
    delete withoutSomeLinks.website_url;
    delete withoutSomeLinks.instagram;
    const fake = createFakeSupabase({ data: [withoutSomeLinks] });
    const [speaker] = await new SupabaseSpeakerRepository(fake.client).listByEvent("evt-1");
    expect(speaker.websiteUrl).toBeNull();
    expect(speaker.instagram).toBeNull();
    expect(speaker.skool).toBe("analytical-engine");
  });

  it("returns an empty list when there is no data", async () => {
    const fake = createFakeSupabase({ data: null });
    expect(await new SupabaseSpeakerRepository(fake.client).listByEvent("evt-1")).toEqual([]);
  });

  it("throws the Supabase error", async () => {
    const error = { message: "boom" };
    const fake = createFakeSupabase({ error });
    await expect(new SupabaseSpeakerRepository(fake.client).listByEvent("evt-1")).rejects.toBe(error);
  });
});

describe("SupabaseSpeakerRepository.create", () => {
  const input = {
    eventId: "evt-1",
    name: "Ada Lovelace",
    title: "Keynote",
    bio: "Mathematician",
    photoUrl: null,
    featured: false,
    ...noLinks,
    instagram: "@ada",
  };

  it("inserts snake_case columns including every link column, then reads the row back", async () => {
    const fake = createFakeSupabase({ data: row });
    const speaker = await new SupabaseSpeakerRepository(fake.client).create(input);

    const call = fake.only();
    expect(call.target).toBe("speakers");
    expect(call.arg("insert")).toEqual({
      event_id: "evt-1",
      name: "Ada Lovelace",
      title: "Keynote",
      bio: "Mathematician",
      photo_url: null,
      featured: false,
      ...NO_LINK_COLUMNS,
      instagram: "@ada",
    });
    expect(call.has("select")).toBe(true);
    expect(call.has("single")).toBe(true);
    expect(speaker).toEqual(expectedSpeaker);
  });

  it("throws the Supabase error", async () => {
    const error = { message: "denied" };
    const fake = createFakeSupabase({ error });
    await expect(new SupabaseSpeakerRepository(fake.client).create(input)).rejects.toBe(error);
  });
});

describe("SupabaseSpeakerRepository.update", () => {
  const data = {
    name: "Ada",
    title: "T",
    bio: "B",
    featured: true,
    ...noLinks,
    websiteUrl: "ada.dev",
    twitch: null,
  };

  it("updates fields and link columns by id, clearing links that are null", async () => {
    const fake = createFakeSupabase();
    await new SupabaseSpeakerRepository(fake.client).update("sp-1", data);

    const call = fake.only();
    expect(call.target).toBe("speakers");
    expect(call.arg("update")).toEqual({
      name: "Ada",
      title: "T",
      bio: "B",
      featured: true,
      ...NO_LINK_COLUMNS,
      website_url: "ada.dev",
    });
    expect(call.arg("eq", 0)).toBe("id");
    expect(call.arg("eq", 1)).toBe("sp-1");
  });

  it("leaves photo_url out of the patch when no new photo is given", async () => {
    const fake = createFakeSupabase();
    await new SupabaseSpeakerRepository(fake.client).update("sp-1", data);
    expect(fake.only().arg("update")).not.toHaveProperty("photo_url");
  });

  it("sets photo_url when a new photo is given, and clears it with null", async () => {
    const withPhoto = createFakeSupabase();
    await new SupabaseSpeakerRepository(withPhoto.client).update("sp-1", { ...data, photoUrl: "https://x/y.png" });
    expect(withPhoto.only().arg("update")).toHaveProperty("photo_url", "https://x/y.png");

    const cleared = createFakeSupabase();
    await new SupabaseSpeakerRepository(cleared.client).update("sp-1", { ...data, photoUrl: null });
    expect(cleared.only().arg("update")).toHaveProperty("photo_url", null);
  });

  it("throws the Supabase error", async () => {
    const error = { message: "nope" };
    const fake = createFakeSupabase({ error });
    await expect(new SupabaseSpeakerRepository(fake.client).update("sp-1", data)).rejects.toBe(error);
  });
});

describe("SupabaseSpeakerRepository.delete", () => {
  it("deletes by id", async () => {
    const fake = createFakeSupabase();
    await new SupabaseSpeakerRepository(fake.client).delete("sp-1");
    const call = fake.only();
    expect(call.target).toBe("speakers");
    expect(call.has("delete")).toBe(true);
    expect(call.ops.find((o) => o.method === "eq")?.args).toEqual(["id", "sp-1"]);
  });

  it("throws the Supabase error", async () => {
    const error = { message: "nope" };
    const fake = createFakeSupabase({ error });
    await expect(new SupabaseSpeakerRepository(fake.client).delete("sp-1")).rejects.toBe(error);
  });
});
