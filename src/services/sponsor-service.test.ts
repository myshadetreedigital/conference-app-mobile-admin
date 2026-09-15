import { describe, expect, it } from "vitest";
import { InMemorySponsorRepository } from "@/test/in-memory-sponsor-repository";
import { createSponsor, updateSponsor, deleteSponsor } from "./sponsor-service";

describe("createSponsor", () => {
  it("creates a sponsor with a default tier when none is given", async () => {
    const repo = new InMemorySponsorRepository();
    const result = await createSponsor(repo, "event-1", { name: "Acme Corp" });
    expect(result.status).toBe("created");
    if (result.status === "created") {
      expect(result.sponsor.tier).toBe("a_la_carte");
    }
  });

  it("accepts an explicit tier", async () => {
    const repo = new InMemorySponsorRepository();
    const result = await createSponsor(repo, "event-1", { name: "Acme Corp", tier: "diamond" });
    expect(result.status).toBe("created");
    if (result.status === "created") {
      expect(result.sponsor.tier).toBe("diamond");
    }
  });

  it("rejects an invalid tier", async () => {
    const repo = new InMemorySponsorRepository();
    // @ts-expect-error deliberately invalid for the test
    const result = await createSponsor(repo, "event-1", { name: "Acme Corp", tier: "not-a-tier" });
    expect(result.status).toBe("invalid");
  });

  it("rejects an empty name", async () => {
    const repo = new InMemorySponsorRepository();
    const result = await createSponsor(repo, "event-1", { name: "" });
    expect(result.status).toBe("invalid");
  });
});

describe("updateSponsor", () => {
  it("updates the sponsor's name and tier", async () => {
    const repo = new InMemorySponsorRepository();
    const created = await createSponsor(repo, "event-1", { name: "Acme Corp", tier: "bronze" });
    if (created.status !== "created") throw new Error("setup failed");

    const result = await updateSponsor(repo, created.sponsor.id, {
      name: "Acme Corp Updated",
      tier: "gold",
    });
    expect(result.status).toBe("updated");

    const [sponsor] = await repo.listByEvent("event-1");
    expect(sponsor.name).toBe("Acme Corp Updated");
    expect(sponsor.tier).toBe("gold");
  });

  it("leaves the logo unchanged when no new logo is given", async () => {
    const repo = new InMemorySponsorRepository();
    const created = await createSponsor(repo, "event-1", {
      name: "Acme Corp",
      tier: "bronze",
      logoUrl: "https://example.com/original.png",
    });
    if (created.status !== "created") throw new Error("setup failed");

    await updateSponsor(repo, created.sponsor.id, { name: "Acme Corp", tier: "bronze" });

    const [sponsor] = await repo.listByEvent("event-1");
    expect(sponsor.logoUrl).toBe("https://example.com/original.png");
  });

  it("replaces the logo when a new one is given", async () => {
    const repo = new InMemorySponsorRepository();
    const created = await createSponsor(repo, "event-1", {
      name: "Acme Corp",
      tier: "bronze",
      logoUrl: "https://example.com/original.png",
    });
    if (created.status !== "created") throw new Error("setup failed");

    await updateSponsor(
      repo,
      created.sponsor.id,
      { name: "Acme Corp", tier: "bronze" },
      "https://example.com/new.png",
    );

    const [sponsor] = await repo.listByEvent("event-1");
    expect(sponsor.logoUrl).toBe("https://example.com/new.png");
  });

  it("rejects an empty name", async () => {
    const repo = new InMemorySponsorRepository();
    const created = await createSponsor(repo, "event-1", { name: "Acme Corp" });
    if (created.status !== "created") throw new Error("setup failed");

    const result = await updateSponsor(repo, created.sponsor.id, { name: "", tier: "bronze" });
    expect(result.status).toBe("invalid");
  });
});

describe("deleteSponsor", () => {
  it("removes the sponsor", async () => {
    const repo = new InMemorySponsorRepository();
    const created = await createSponsor(repo, "event-1", { name: "Acme Corp" });
    if (created.status !== "created") throw new Error("setup failed");
    await deleteSponsor(repo, created.sponsor.id);
    expect(await repo.listByEvent("event-1")).toHaveLength(0);
  });
});
