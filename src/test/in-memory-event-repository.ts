import { randomUUID } from "node:crypto";
import type { Event, EventRepository, NewEvent } from "@/repositories/event-repository";

/** Test double for EventRepository. `publish` mirrors the real
 *  events_one_live_per_org partial unique index by throwing if
 *  another event in the same org is already live. */
export class InMemoryEventRepository implements EventRepository {
  private readonly byId = new Map<string, Event>();

  async listByOrganization(organizationId: string): Promise<Event[]> {
    return [...this.byId.values()].filter((e) => e.organizationId === organizationId);
  }

  async findById(eventId: string): Promise<Event | null> {
    return this.byId.get(eventId) ?? null;
  }

  async findBySlug(slug: string): Promise<Event | null> {
    return [...this.byId.values()].find((e) => e.slug === slug) ?? null;
  }

  async create(input: NewEvent): Promise<Event> {
    const event: Event = {
      id: randomUUID(),
      organizationId: input.organizationId,
      name: input.name,
      slug: input.slug,
      status: "draft",
      logoUrl: null,
      primaryColor: null,
      backgroundColor: null,
      textColor: null,
    };
    this.byId.set(event.id, event);
    return event;
  }

  async publish(eventId: string): Promise<void> {
    const event = this.byId.get(eventId);
    if (!event) throw new Error("Event not found");
    const alreadyLive = [...this.byId.values()].some(
      (e) => e.organizationId === event.organizationId && e.status === "live" && e.id !== eventId,
    );
    if (alreadyLive) {
      throw new Error("Another event in this organization is already live");
    }
    event.status = "live";
  }

  async archive(eventId: string): Promise<void> {
    const event = this.byId.get(eventId);
    if (!event) throw new Error("Event not found");
    event.status = "archived";
  }

  async rename(eventId: string, name: string): Promise<void> {
    const event = this.byId.get(eventId);
    if (!event) throw new Error("Event not found");
    event.name = name;
  }
}
