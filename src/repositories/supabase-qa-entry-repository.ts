import type { SupabaseClient } from "@supabase/supabase-js";
import type { NewQaEntry, QaEntry, QaEntryRepository, UpdateQaEntryData } from "./qa-entry-repository";

interface QaEntryRow {
  id: string;
  event_id: string;
  section_id: string;
  position: number;
  question: string;
  answer: string;
}

function toQaEntry(row: QaEntryRow): QaEntry {
  return {
    id: row.id,
    eventId: row.event_id,
    sectionId: row.section_id,
    position: row.position,
    question: row.question,
    answer: row.answer,
  };
}

const TABLE = "event_info_qa_entries";

// public read (`using (true)`) like the other More Info tables — safe to
// .select() after insert.
export class SupabaseQaEntryRepository implements QaEntryRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async listByEvent(eventId: string): Promise<QaEntry[]> {
    const { data, error } = await this.supabase
      .from(TABLE)
      .select("*")
      .eq("event_id", eventId)
      .order("section_id", { ascending: true })
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toQaEntry);
  }

  async create(input: NewQaEntry): Promise<QaEntry> {
    const { data: last, error: lastError } = await this.supabase
      .from(TABLE)
      .select("position")
      .eq("section_id", input.sectionId)
      .order("position", { ascending: false })
      .limit(1);
    if (lastError) throw lastError;
    const lastPosition = (last?.[0] as { position: number } | undefined)?.position;
    const position = lastPosition === undefined ? 0 : lastPosition + 1;

    const { data, error } = await this.supabase
      .from(TABLE)
      .insert({
        event_id: input.eventId,
        section_id: input.sectionId,
        position,
        question: input.question,
        answer: input.answer,
      })
      .select()
      .single();
    if (error) throw error;
    return toQaEntry(data);
  }

  async update(entryId: string, data: UpdateQaEntryData): Promise<void> {
    const { error } = await this.supabase
      .from(TABLE)
      .update({ question: data.question, answer: data.answer })
      .eq("id", entryId);
    if (error) throw error;
  }

  async delete(entryId: string): Promise<void> {
    const { error } = await this.supabase.from(TABLE).delete().eq("id", entryId);
    if (error) throw error;
  }

  // One small update per entry; a section holds a handful of pairs, and each
  // update is idempotent, so a failure part-way just leaves a slightly
  // different order that the admin can fix by trying again.
  async reorder(sectionId: string, orderedIds: string[]): Promise<void> {
    const results = await Promise.all(
      orderedIds.map((id, position) =>
        this.supabase.from(TABLE).update({ position }).eq("id", id).eq("section_id", sectionId),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) throw failed.error;
  }
}
