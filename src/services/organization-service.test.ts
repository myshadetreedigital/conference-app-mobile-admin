import { describe, expect, it } from "vitest";
import { InMemoryOrganizationRepository } from "@/test/in-memory-organization-repository";
import { createOrganization, updateOrganization } from "./organization-service";

describe("createOrganization", () => {
  it("creates an organization when input is valid and no duplicate exists", async () => {
    const repo = new InMemoryOrganizationRepository();
    const result = await createOrganization(repo, "user-1", {
      name: "Opticon",
      phone: "555-0100",
      email: "hello@opticon.example",
      address: "",
    });

    expect(result.status).toBe("created");
    if (result.status === "created") {
      expect(result.organization.name).toBe("Opticon");
      expect(result.organization.createdBy).toBe("user-1");
    }
  });

  it("rejects invalid input before touching the repository", async () => {
    const repo = new InMemoryOrganizationRepository();
    const result = await createOrganization(repo, "user-1", {
      name: "",
      phone: "555-0100",
      email: "not-an-email",
      address: "",
    });

    expect(result.status).toBe("invalid");
  });

  it("flags a possible duplicate (2-of-3 match) instead of creating", async () => {
    const repo = new InMemoryOrganizationRepository();
    await createOrganization(repo, "user-1", {
      name: "Opticon",
      phone: "555-0100",
      email: "hello@opticon.example",
      address: "",
    });

    const result = await createOrganization(repo, "user-2", {
      name: "Opticon",
      phone: "555-0100",
      email: "different@example.com",
      address: "",
    });

    expect(result.status).toBe("possible_duplicate");
  });

  it("does not flag a duplicate on a single matching field", async () => {
    const repo = new InMemoryOrganizationRepository();
    await createOrganization(repo, "user-1", {
      name: "Opticon",
      phone: "555-0100",
      email: "hello@opticon.example",
      address: "",
    });

    const result = await createOrganization(repo, "user-2", {
      name: "Opticon",
      phone: "555-9999",
      email: "different@example.com",
      address: "",
    });

    expect(result.status).toBe("created");
  });

  it("reports already_has_organization instead of throwing when the admin already has one", async () => {
    const repo = new InMemoryOrganizationRepository();
    await createOrganization(repo, "user-1", {
      name: "Opticon",
      phone: "555-0100",
      email: "hello@opticon.example",
      address: "",
    });

    // Same user, a genuinely different org this time (so it isn't
    // caught by the duplicate check) — the DB's "one org per admin"
    // rule is what should reject this, not duplicate detection.
    const result = await createOrganization(repo, "user-1", {
      name: "A Totally Different Event",
      phone: "555-8888",
      email: "different@example.com",
      address: "",
    });

    expect(result.status).toBe("already_has_organization");
  });

  it("creates despite a duplicate when explicitly confirmed", async () => {
    const repo = new InMemoryOrganizationRepository();
    await createOrganization(repo, "user-1", {
      name: "Opticon",
      phone: "555-0100",
      email: "hello@opticon.example",
      address: "",
    });

    const result = await createOrganization(
      repo,
      "user-2",
      { name: "Opticon", phone: "555-0100", email: "different@example.com", address: "" },
      { confirmDespiteDuplicate: true },
    );

    expect(result.status).toBe("created");
  });
});

describe("updateOrganization", () => {
  it("updates the organization's fields when input is valid", async () => {
    const repo = new InMemoryOrganizationRepository();
    const created = await createOrganization(repo, "user-1", {
      name: "Opticon",
      phone: "555-0100",
      email: "hello@opticon.example",
      address: "",
    });
    if (created.status !== "created") throw new Error("setup failed");

    const result = await updateOrganization(repo, created.organization.id, {
      name: "Opticon Renamed",
      phone: "555-0199",
      email: "new@opticon.example",
      address: "123 Main St",
    });

    expect(result.status).toBe("updated");
    const updated = await repo.findByAdminUserId("user-1");
    expect(updated?.name).toBe("Opticon Renamed");
    expect(updated?.phone).toBe("555-0199");
    expect(updated?.email).toBe("new@opticon.example");
    expect(updated?.address).toBe("123 Main St");
  });

  it("rejects invalid input before touching the repository", async () => {
    const repo = new InMemoryOrganizationRepository();
    const created = await createOrganization(repo, "user-1", {
      name: "Opticon",
      phone: "555-0100",
      email: "hello@opticon.example",
      address: "",
    });
    if (created.status !== "created") throw new Error("setup failed");

    const result = await updateOrganization(repo, created.organization.id, {
      name: "",
      phone: "555-0199",
      email: "not-an-email",
      address: "",
    });

    expect(result.status).toBe("invalid");
    const unchanged = await repo.findByAdminUserId("user-1");
    expect(unchanged?.name).toBe("Opticon");
  });
});
