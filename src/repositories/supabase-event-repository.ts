import type { SupabaseClient } from "@supabase/supabase-js";
import type { Event, EventRepository, EventStatus, NewEvent } from "./event-repository";

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
}
