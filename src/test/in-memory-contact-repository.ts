import { randomUUID } from "node:crypto";
import type {
  Contact,
  ContactRepository,
  NewContact,
  UpdateContactData,
} from "@/repositories/contact-repository";

export class InMemoryContactRepository implements ContactRepository {
  private readonly byId = new Map<string, Contact>();

  async listByOwnerAndEvent(ownerId: string, eventId: string): Promise<Contact[]> {
    return [...this.byId.values()].filter((c) => c.ownerId === ownerId && c.eventId === eventId);
  }

  async create(input: NewContact): Promise<Contact> {
    const contact: Contact = { id: randomUUID(), ...input };
    this.byId.set(contact.id, contact);
    return contact;
  }

  async update(contactId: string, data: UpdateContactData): Promise<void> {
    const contact = this.byId.get(contactId);
    if (!contact) throw new Error(`Contact not found: ${contactId}`);
    this.byId.set(contactId, { ...contact, ...data });
  }

  async delete(contactId: string): Promise<void> {
    this.byId.delete(contactId);
  }
}
