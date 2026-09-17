export type EventStatus = "draft" | "live" | "archived";

export interface Event {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  status: EventStatus;
  logoUrl: string | null;
  primaryColor: string | null;
  backgroundColor: string | null;
  textColor: string | null;
  tagline: string;
  description: string;
  location: string;
  startsAt: string | null;
  endsAt: string | null;
}

export interface NewEvent {
  organizationId: string;
  name: string;
  slug: string;
}

export interface UpdateEventDetailsData {
  tagline: string;
  description: string;
  location: string;
  startsAt: string | null;
  endsAt: string | null;
  /** Omit to leave the existing logo unchanged — only set this when a
   *  new file was actually uploaded (or explicitly to null to clear it). */
  logoUrl?: string | null;
}

/** Scoped to the events aggregate only — see docs/ARCHITECTURE.md's Layering section. */
export interface EventRepository {
  listByOrganization(organizationId: string): Promise<Event[]>;
  findById(eventId: string): Promise<Event | null>;
  findBySlug(slug: string): Promise<Event | null>;
  create(data: NewEvent): Promise<Event>;
  /** Publish is exclusive per org — the DB's partial unique index is the real
   *  enforcement; this just performs the write and surfaces its rejection. */
  publish(eventId: string): Promise<void>;
  archive(eventId: string): Promise<void>;
  rename(eventId: string, name: string): Promise<void>;
  updateDetails(eventId: string, data: UpdateEventDetailsData): Promise<void>;
}
