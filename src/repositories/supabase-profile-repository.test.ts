import { describe, expect, it } from "vitest";
import { createFakeSupabase } from "@/test/fake-supabase";
import { SupabaseProfileRepository } from "./supabase-profile-repository";

describe("SupabaseProfileRepository.findById", () => {
  it("looks the profile up by id and maps it", async () => {
    const fake = createFakeSupabase({ data: { id: "u-1", first_name: "Tiya", last_name: "Rabb" } });
    const profile = await new SupabaseProfileRepository(fake.client).findById("u-1");

    expect(profile).toEqual({ id: "u-1", firstName: "Tiya", lastName: "Rabb" });
    const call = fake.only();
    expect(call.target).toBe("profiles");
    expect(call.ops).toEqual([
      { method: "select", args: ["*"] },
      { method: "eq", args: ["id", "u-1"] },
      { method: "maybeSingle", args: [] },
    ]);
  });

  it("returns null when there is no profile", async () => {
    const fake = createFakeSupabase({ data: null });
    expect(await new SupabaseProfileRepository(fake.client).findById("u-1")).toBeNull();
  });

  it("throws the Supabase error", async () => {
    const error = { message: "boom" };
    const fake = createFakeSupabase({ error });
    await expect(new SupabaseProfileRepository(fake.client).findById("u-1")).rejects.toBe(error);
  });
});
