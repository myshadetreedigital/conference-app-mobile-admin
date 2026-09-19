import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  EventInfoSection,
  EventInfoSectionIcon,
  EventInfoSectionLinkTarget,
  EventInfoSectionRepository,
  NewEventInfoSection,
  UpdateEventInfoSectionData,
} from "./event-info-section-repository";

interface EventInfoSectionRow {
  id: string;
  event_id: string;
  icon: string;
  title: string;
  body: string;
  link_target: string | null;
  page_style?: string | null;
}

function toEventInfoSection(row: EventInfoSectionRow): EventInfoSection {
  return {
    id: row.id,
    eventId: row.event_id,
    icon: row.icon as EventInfoSectionIcon,
    title: row.title,
    body: row.body,
    linkTarget: (row.link_target as EventInfoSectionLinkTarget | null) ?? null,
    pageStyle: row.page_style === "qa" ? "qa" : "text",
  };
}

// public read (`using (true)`) like speakers/sponsors — safe to
// .select() after insert/update.
export class SupabaseEventInfoSectionRepository implements EventInfoSectionRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async listByEvent(eventId: string): Promise<EventInfoSection[]> {
    const { data, error } = await this.supabase
      .from("event_info_sections")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toEventInfoSection);
  }

  async create(input: NewEventInfoSection): Promise<EventInfoSection> {
    const { data, error } = await this.supabase
      .from("event_info_sections")
      .insert({
        event_id: input.eventId,
        icon: input.icon,
        title: input.title,
        body: input.body,
        link_target: input.linkTarget,
        page_style: input.pageStyle,
      })
      .select()
      .single();
    if (error) throw error;
    return toEventInfoSection(data);
  }

  async update(sectionId: string, data: UpdateEventInfoSectionData): Promise<void> {
    const { error } = await this.supabase
      .from("event_info_sections")
      .update({
        icon: data.icon,
        title: data.title,
        body: data.body,
        link_target: data.linkTarget,
        page_style: data.pageStyle,
      })
      .eq("id", sectionId);
    if (error) throw error;
  }

  async delete(sectionId: string): Promise<void> {
    const { error } = await this.supabase.from("event_info_sections").delete().eq("id", sectionId);
    if (error) throw error;
  }
}
