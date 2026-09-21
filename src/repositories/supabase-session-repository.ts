import type { SupabaseClient } from "@supabase/supabase-js";
import type { NewSession, Session, SessionRepository, UpdateSessionData } from "./session-repository";

interface SessionRow {
  id: string;
  event_id: string;
  title: string;
  description: string;
  starts_at: string | null;
  ends_at: string | null;
  location: string;
  session_speakers?: { speaker_id: string }[] | null;
}

function toSession(row: SessionRow): Session {
  return {
    id: row.id,
    eventId: row.event_id,
    title: row.title,
    description: row.description,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    location: row.location,
    speakerIds: (row.session_speakers ?? []).map((link) => link.speaker_id),
  };
}

// sessions' SELECT policy is `using (true)` — safe to use RETURNING,
// same reasoning as speakers/sponsors.
export class SupabaseSessionRepository implements SessionRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async listByEvent(eventId: string): Promise<Session[]> {
    const { data, error } = await this.supabase
      .from("sessions")
      .select("*, session_speakers(speaker_id)")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toSession);
  }

  async create(input: NewSession): Promise<Session> {
    const { data, error } = await this.supabase
      .from("sessions")
      .insert({
        event_id: input.eventId,
        title: input.title,
        description: input.description,
        location: input.location,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
      })
      .select()
      .single();
    if (error) throw error;
    if (input.speakerIds.length > 0) {
      const { error: linkError } = await this.supabase
        .from("session_speakers")
        .insert(input.speakerIds.map((speakerId) => ({ session_id: data.id, speaker_id: speakerId })));
      if (linkError) throw linkError;
    }
    return { ...toSession(data), speakerIds: input.speakerIds };
  }

  async update(sessionId: string, data: UpdateSessionData): Promise<void> {
    const { error } = await this.supabase
      .from("sessions")
      .update({
        title: data.title,
        description: data.description,
        location: data.location,
        starts_at: data.startsAt,
        ends_at: data.endsAt,
      })
      .eq("id", sessionId);
    if (error) throw error;

    // Bring the speaker links in line with the list, changing only the difference. New
    // links go in before old ones come out, so a failure part-way never leaves the
    // session with fewer speakers than it had.
    const { data: current, error: readError } = await this.supabase
      .from("session_speakers")
      .select("speaker_id")
      .eq("session_id", sessionId);
    if (readError) throw readError;
    const existing = new Set((current ?? []).map((link: { speaker_id: string }) => link.speaker_id));
    const wanted = new Set(data.speakerIds);
    const added = [...wanted].filter((id) => !existing.has(id));
    const removed = [...existing].filter((id) => !wanted.has(id));
    if (added.length > 0) {
      const { error: addError } = await this.supabase
        .from("session_speakers")
        .insert(added.map((speakerId) => ({ session_id: sessionId, speaker_id: speakerId })));
      if (addError) throw addError;
    }
    if (removed.length > 0) {
      const { error: removeError } = await this.supabase
        .from("session_speakers")
        .delete()
        .eq("session_id", sessionId)
        .in("speaker_id", removed);
      if (removeError) throw removeError;
    }
  }

  async delete(sessionId: string): Promise<void> {
    const { error } = await this.supabase.from("sessions").delete().eq("id", sessionId);
    if (error) throw error;
  }
}
