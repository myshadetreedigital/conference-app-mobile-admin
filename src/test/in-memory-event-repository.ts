import { randomUUID } from "node:crypto";
import type {
  Event,
  EventRepository,
  NewEvent,
  UpdateEventDetailsData,
} from "@/repositories/event-repository";

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
      tagline: "",
      description: "",
      location: "",
      startsAt: null,
      endsAt: null,
      banner1ImageUrl: null,
      banner1LinkUrl: null,
      banner2ImageUrl: null,
      banner2LinkUrl: null,
      locationImageUrl: null,
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

  async updateDetails(eventId: string, data: UpdateEventDetailsData): Promise<void> {
    const event = this.byId.get(eventId);
    if (!event) throw new Error("Event not found");
    event.tagline = data.tagline;
    event.description = data.description;
    event.location = data.location;
    event.startsAt = data.startsAt;
    event.endsAt = data.endsAt;
    event.banner1LinkUrl = data.banner1LinkUrl;
    event.banner2LinkUrl = data.banner2LinkUrl;
    event.primaryColor = data.primaryColor;
    if (data.logoUrl !== undefined) event.logoUrl = data.logoUrl;
    if (data.banner1ImageUrl !== undefined) event.banner1ImageUrl = data.banner1ImageUrl;
    if (data.banner2ImageUrl !== undefined) event.banner2ImageUrl = data.banner2ImageUrl;
    if (data.locationImageUrl !== undefined) event.locationImageUrl = data.locationImageUrl;
  }
}
