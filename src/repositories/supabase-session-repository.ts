import type { SupabaseClient } from "@supabase/supabase-js";
import type { NewSession, Session, SessionRepository } from "./session-repository";

interface SessionRow {
  id: string;
  event_id: string;
  title: string;
  description: string;
  starts_at: string | null;
  ends_at: string | null;
  location: string;
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
  };
}

// sessions' SELECT policy is `using (true)` — safe to use RETURNING,
// same reasoning as speakers/sponsors.
export class SupabaseSessionRepository implements SessionRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async listByEvent(eventId: string): Promise<Session[]> {
    const { data, error } = await this.supabase
      .from("sessions")
      .select("*")
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
      })
      .select()
      .single();
    if (error) throw error;
    return toSession(data);
  }

  async delete(sessionId: string): Promise<void> {
    const { error } = await this.supabase.from("sessions").delete().eq("id", sessionId);
    if (error) throw error;
  }
}
