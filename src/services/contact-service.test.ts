import { describe, expect, it } from "vitest";
import { InMemoryContactRepository } from "@/test/in-memory-contact-repository";
import { createContact, deleteContact, updateContact } from "./contact-service";

describe("createContact", () => {
  it("creates a contact scoped to the owner and event", async () => {
    const repo = new InMemoryContactRepository();
    const result = await createContact(repo, "user-1", "event-1", {
      name: "Jordan Lee",
      email: "jordan@example.com",
      phone: "555-0100",
      notes: "Met at the sponsor booth",
    });

    expect(result.status).toBe("created");
    if (result.status === "created") {
      expect(result.contact.ownerId).toBe("user-1");
      expect(result.contact.eventId).toBe("event-1");
      expect(result.contact.name).toBe("Jordan Lee");
    }
  });

  it("allows saving a contact with just a name", async () => {
    const repo = new InMemoryContactRepository();
    const result = await createContact(repo, "user-1", "event-1", { name: "Jordan Lee" });

    expect(result.status).toBe("created");
  });

  it("rejects invalid input before touching the repository", async () => {
    const repo = new InMemoryContactRepository();
    const result = await createContact(repo, "user-1", "event-1", { name: "" });

    expect(result.status).toBe("invalid");
  });

  it("keeps contacts scoped per event for the same owner", async () => {
    const repo = new InMemoryContactRepository();
    await createContact(repo, "user-1", "event-1", { name: "Jordan Lee" });
    await createContact(repo, "user-1", "event-2", { name: "Alex Kim" });

    const eventOneContacts = await repo.listByOwnerAndEvent("user-1", "event-1");
    expect(eventOneContacts).toHaveLength(1);
    expect(eventOneContacts[0].name).toBe("Jordan Lee");
  });
});

describe("updateContact", () => {
  it("updates an existing contact's fields", async () => {
    const repo = new InMemoryContactRepository();
    const created = await createContact(repo, "user-1", "event-1", { name: "Jordan Lee" });
    if (created.status !== "created") throw new Error("setup failed");

    const result = await updateContact(repo, created.contact.id, {
      name: "Jordan Lee-Park",
      email: "jordan@newcompany.com",
      phone: "",
      notes: "Now at a different company",
    });

    expect(result.status).toBe("updated");
    const contacts = await repo.listByOwnerAndEvent("user-1", "event-1");
    expect(contacts[0].name).toBe("Jordan Lee-Park");
    expect(contacts[0].email).toBe("jordan@newcompany.com");
  });
});

describe("deleteContact", () => {
  it("removes the contact", async () => {
    const repo = new InMemoryContactRepository();
    const created = await createContact(repo, "user-1", "event-1", { name: "Jordan Lee" });
    if (created.status !== "created") throw new Error("setup failed");

    await deleteContact(repo, created.contact.id);

    const contacts = await repo.listByOwnerAndEvent("user-1", "event-1");
    expect(contacts).toHaveLength(0);
  });
});
