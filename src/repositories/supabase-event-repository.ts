import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Event,
  EventRepository,
  EventStatus,
  NewEvent,
  UpdateEventDetailsData,
} from "./event-repository";

interface EventRow {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  status: EventStatus;
  logo_url: string | null;
  primary_color: string | null;
  background_color: string | null;
  text_color: string | null;
  tagline: string;
  description: string;
  location: string;
  starts_at: string | null;
  ends_at: string | null;
  banner_1_image_url: string | null;
  banner_1_link_url: string | null;
  banner_2_image_url: string | null;
  banner_2_link_url: string | null;
}

function toEvent(row: EventRow): Event {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    logoUrl: row.logo_url,
    primaryColor: row.primary_color,
    backgroundColor: row.background_color,
    textColor: row.text_color,
    tagline: row.tagline,
    description: row.description,
    location: row.location,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    banner1ImageUrl: row.banner_1_image_url,
    banner1LinkUrl: row.banner_1_link_url,
    banner2ImageUrl: row.banner_2_image_url,
    banner2LinkUrl: row.banner_2_link_url,
  };
}

export class SupabaseEventRepository implements EventRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async listByOrganization(organizationId: string): Promise<Event[]> {
    const { data, error } = await this.supabase
      .from("events")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(toEvent);
  }

  async findById(eventId: string): Promise<Event | null> {
    const { data, error } = await this.supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .maybeSingle();
    if (error) throw error;
    return data ? toEvent(data) : null;
  }

  async findBySlug(slug: string): Promise<Event | null> {
    const { data, error } = await this.supabase
      .from("events")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return data ? toEvent(data) : null;
  }

  async create(input: NewEvent): Promise<Event> {
    const { data, error } = await this.supabase
      .from("events")
      .insert({ organization_id: input.organizationId, name: input.name, slug: input.slug })
      .select()
      .single();
    if (error) throw error;
    return toEvent(data);
  }

  async publish(eventId: string): Promise<void> {
    // Relies on the events_one_live_per_org partial unique index to
    // reject this if another event in the org is already live —
    // that's the real enforcement, not application logic.
    const { error } = await this.supabase
      .from("events")
      .update({ status: "live" })
      .eq("id", eventId);
    if (error) throw error;
  }

  async archive(eventId: string): Promise<void> {
    const { error } = await this.supabase
      .from("events")
      .update({ status: "archived" })
      .eq("id", eventId);
    if (error) throw error;
  }

  async rename(eventId: string, name: string): Promise<void> {
    const { error } = await this.supabase.from("events").update({ name }).eq("id", eventId);
    if (error) throw error;
  }

  async updateDetails(eventId: string, data: UpdateEventDetailsData): Promise<void> {
    const patch: Record<string, unknown> = {
      tagline: data.tagline,
      description: data.description,
      location: data.location,
      starts_at: data.startsAt,
      ends_at: data.endsAt,
      banner_1_link_url: data.banner1LinkUrl,
      banner_2_link_url: data.banner2LinkUrl,
    };
    if (data.logoUrl !== undefined) patch.logo_url = data.logoUrl;
    if (data.banner1ImageUrl !== undefined) patch.banner_1_image_url = data.banner1ImageUrl;
    if (data.banner2ImageUrl !== undefined) patch.banner_2_image_url = data.banner2ImageUrl;
    const { error } = await this.supabase.from("events").update(patch).eq("id", eventId);
    if (error) throw error;
  }
}
