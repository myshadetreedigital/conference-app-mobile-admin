import type { SupabaseClient } from "@supabase/supabase-js";
import { SPEAKER_LINK_FIELDS, type SpeakerLinks } from "@/lib/speaker-links";
import type { NewSpeaker, Speaker, SpeakerRepository, UpdateSpeakerData } from "./speaker-repository";

interface SpeakerRow {
  id: string;
  event_id: string;
  name: string;
  title: string;
  bio: string;
  photo_url: string | null;
  featured: boolean;
  // Plus one nullable text column per SPEAKER_LINK_FIELDS entry,
  // read by name in the helpers below.
}

function toLinks(row: Record<string, unknown>): SpeakerLinks {
  const links = {} as SpeakerLinks;
  for (const { key, column } of SPEAKER_LINK_FIELDS) {
    links[key] = (row[column] as string | null) ?? null;
  }
  return links;
}

function toLinkColumns(links: SpeakerLinks): Record<string, string | null> {
  const columns: Record<string, string | null> = {};
  for (const { key, column } of SPEAKER_LINK_FIELDS) {
    columns[column] = links[key];
  }
  return columns;
}

function toSpeaker(row: SpeakerRow): Speaker {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    title: row.title,
    bio: row.bio,
    photoUrl: row.photo_url,
    featured: row.featured,
    ...toLinks(row as unknown as Record<string, unknown>),
  };
}

// speakers' SELECT policy is `using (true)` (unconditional public
// read) — unlike organizations, it has no dependency on a
// trigger-created row, so RETURNING via .select() is safe here.
export class SupabaseSpeakerRepository implements SpeakerRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async listByEvent(eventId: string): Promise<Speaker[]> {
    const { data, error } = await this.supabase
      .from("speakers")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toSpeaker);
  }

  async create(input: NewSpeaker): Promise<Speaker> {
    const { data, error } = await this.supabase
      .from("speakers")
      .insert({
        event_id: input.eventId,
        name: input.name,
        title: input.title,
        bio: input.bio,
        photo_url: input.photoUrl,
        featured: input.featured,
        ...toLinkColumns(input),
      })
      .select()
      .single();
    if (error) throw error;
    return toSpeaker(data);
  }

  async update(speakerId: string, data: UpdateSpeakerData): Promise<void> {
    const patch: Record<string, unknown> = {
      name: data.name,
      title: data.title,
      bio: data.bio,
      featured: data.featured,
      ...toLinkColumns(data),
    };
    if (data.photoUrl !== undefined) patch.photo_url = data.photoUrl;
    const { error } = await this.supabase.from("speakers").update(patch).eq("id", speakerId);
    if (error) throw error;
  }

  async delete(speakerId: string): Promise<void> {
    const { error } = await this.supabase.from("speakers").delete().eq("id", speakerId);
    if (error) throw error;
  }
}
