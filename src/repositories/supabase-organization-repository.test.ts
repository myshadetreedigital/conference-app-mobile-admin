import { describe, expect, it } from "vitest";
import { createFakeSupabase } from "@/test/fake-supabase";
import { OrganizationCreationRejectedError } from "./organization-repository";
import { SupabaseOrganizationRepository } from "./supabase-organization-repository";

const orgRow = {
  id: "o-1",
  name: "Acme Events",
  phone: "555-0100",
  email: "hi@acme.example.com",
  address: "1 Main St",
  flagged_duplicate_of: null,
  created_by: "u-1",
};

const expectedOrg = {
  id: "o-1",
  name: "Acme Events",
  phone: "555-0100",
  email: "hi@acme.example.com",
  address: "1 Main St",
  flaggedDuplicateOf: null,
  createdBy: "u-1",
};

const newOrg = {
  name: "Acme Events",
  phone: "555-0100",
  email: "hi@acme.example.com",
  address: "1 Main St",
  createdBy: "u-1",
};

describe("SupabaseOrganizationRepository.findByAdminUserId", () => {
  it("reads the organization through the admin's membership", async () => {
    const fake = createFakeSupabase({ data: { organizations: orgRow } });
    const org = await new SupabaseOrganizationRepository(fake.client).findByAdminUserId("u-1");

    expect(org).toEqual(expectedOrg);
    const call = fake.only();
    expect(call.target).toBe("admin_memberships");
    expect(call.ops).toEqual([
      { method: "select", args: ["organizations(*)"] },
      { method: "eq", args: ["user_id", "u-1"] },
      { method: "maybeSingle", args: [] },
    ]);
  });

  it("returns null when the user has no membership", async () => {
    const fake = createFakeSupabase({ data: null });
    expect(await new SupabaseOrganizationRepository(fake.client).findByAdminUserId("u-1")).toBeNull();
  });

  it("returns null when the membership has no organization", async () => {
    const fake = createFakeSupabase({ data: { organizations: null } });
    expect(await new SupabaseOrganizationRepository(fake.client).findByAdminUserId("u-1")).toBeNull();
  });

  it("throws the Supabase error", async () => {
    const error = { message: "boom" };
    const fake = createFakeSupabase({ error });
    await expect(new SupabaseOrganizationRepository(fake.client).findByAdminUserId("u-1")).rejects.toBe(error);
  });
});

describe("SupabaseOrganizationRepository.findPossibleDuplicate", () => {
  it("calls the find_possible_duplicate_org function with prefixed params", async () => {
    const fake = createFakeSupabase({ data: "o-9" });
    const id = await new SupabaseOrganizationRepository(fake.client).findPossibleDuplicate("Acme", "555", "a@b.c");

    expect(id).toBe("o-9");
    const call = fake.only();
    expect(call.root).toBe("rpc");
    expect(call.target).toBe("find_possible_duplicate_org");
    expect(call.params).toEqual({ p_name: "Acme", p_phone: "555", p_email: "a@b.c" });
  });

  it("returns null when nothing matches", async () => {
    const fake = createFakeSupabase({ data: null });
    expect(await new SupabaseOrganizationRepository(fake.client).findPossibleDuplicate("A", "", "")).toBeNull();
  });

  it("throws the Supabase error", async () => {
    const error = { message: "boom" };
    const fake = createFakeSupabase({ error });
    await expect(new SupabaseOrganizationRepository(fake.client).findPossibleDuplicate("A", "", "")).rejects.toBe(
      error,
    );
  });
});

describe("SupabaseOrganizationRepository.create", () => {
  it("inserts with a client-generated id and returns the org without reading it back", async () => {
    const fake = createFakeSupabase();
    const org = await new SupabaseOrganizationRepository(fake.client).create(newOrg);

    const call = fake.only();
    expect(call.target).toBe("organizations");
    // RETURNING would fail the SELECT policy (see the repository comment), so
    // nothing may be chained after insert.
    expect(call.ops.map((o) => o.method)).toEqual(["insert"]);

    const inserted = call.arg("insert") as Record<string, unknown>;
    expect(inserted.id).toEqual(expect.stringMatching(/^[0-9a-f-]{36}$/));
    expect(inserted).toEqual({
      id: inserted.id,
      name: "Acme Events",
      phone: "555-0100",
      email: "hi@acme.example.com",
      address: "1 Main St",
      created_by: "u-1",
    });
    expect(org).toEqual({ ...expectedOrg, id: inserted.id });
  });

  it("turns a unique violation (one org per admin) into OrganizationCreationRejectedError", async () => {
    const fake = createFakeSupabase({ error: { message: "duplicate key", code: "23505" } });
    await expect(new SupabaseOrganizationRepository(fake.client).create(newOrg)).rejects.toBeInstanceOf(
      OrganizationCreationRejectedError,
    );
  });

  it("rethrows any other error unchanged", async () => {
    const error = { message: "permission denied", code: "42501" };
    const fake = createFakeSupabase({ error });
    await expect(new SupabaseOrganizationRepository(fake.client).create(newOrg)).rejects.toBe(error);
  });
});

describe("SupabaseOrganizationRepository.update", () => {
  it("patches the editable fields by id", async () => {
    const fake = createFakeSupabase();
    await new SupabaseOrganizationRepository(fake.client).update("o-1", {
      name: "N",
      phone: "1",
      email: "e@x.y",
      address: "A",
    });
    const call = fake.only();
    expect(call.target).toBe("organizations");
    expect(call.arg("update")).toEqual({ name: "N", phone: "1", email: "e@x.y", address: "A" });
    expect(call.ops.find((o) => o.method === "eq")?.args).toEqual(["id", "o-1"]);
  });

  it("throws the Supabase error", async () => {
    const error = { message: "boom" };
    const fake = createFakeSupabase({ error });
    const repo = new SupabaseOrganizationRepository(fake.client);
    await expect(repo.update("o-1", { name: "N", phone: "", email: "", address: "" })).rejects.toBe(error);
  });
});
