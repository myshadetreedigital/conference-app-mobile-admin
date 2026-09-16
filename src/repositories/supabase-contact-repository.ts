import type { SupabaseClient } from "@supabase/supabase-js";
import type { Contact, ContactRepository, NewContact, UpdateContactData } from "./contact-repository";

interface ContactRow {
  id: string;
  owner_id: string;
  event_id: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
}

function toContact(row: ContactRow): Contact {
  return {
    id: row.id,
    ownerId: row.owner_id,
    eventId: row.event_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    notes: row.notes,
  };
}

// personal_contacts' RLS policy is `using (owner_id = auth.uid())`
// with no trigger dependency or cross-table lookup, so RETURNING via
// .select() is safe here (unlike organizations — see that
// repository's create() for the contrasting case).
export class SupabaseContactRepository implements ContactRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async listByOwnerAndEvent(ownerId: string, eventId: string): Promise<Contact[]> {
    const { data, error } = await this.supabase
      .from("personal_contacts")
      .select("*")
      .eq("owner_id", ownerId)
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toContact);
  }

  async create(input: NewContact): Promise<Contact> {
    const { data, error } = await this.supabase
      .from("personal_contacts")
      .insert({
        owner_id: input.ownerId,
        event_id: input.eventId,
        name: input.name,
        email: input.email,
        phone: input.phone,
        notes: input.notes,
      })
      .select()
      .single();
    if (error) throw error;
    return toContact(data);
  }

  async update(contactId: string, data: UpdateContactData): Promise<void> {
    const { error } = await this.supabase
      .from("personal_contacts")
      .update({ name: data.name, email: data.email, phone: data.phone, notes: data.notes })
      .eq("id", contactId);
    if (error) throw error;
  }

  async delete(contactId: string): Promise<void> {
    const { error } = await this.supabase.from("personal_contacts").delete().eq("id", contactId);
    if (error) throw error;
  }
}
