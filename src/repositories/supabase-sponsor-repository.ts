import type { SupabaseClient } from "@supabase/supabase-js";
import type { NewSponsor, Sponsor, SponsorRepository, SponsorTier } from "./sponsor-repository";

interface SponsorRow {
  id: string;
  event_id: string;
  name: string;
  tier: SponsorTier;
  logo_url: string | null;
  website_url: string | null;
}

function toSponsor(row: SponsorRow): Sponsor {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    tier: row.tier,
    logoUrl: row.logo_url,
    websiteUrl: row.website_url,
  };
}

// sponsors' SELECT policy is `using (true)` — safe to use RETURNING,
// same reasoning as speakers.
export class SupabaseSponsorRepository implements SponsorRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async listByEvent(eventId: string): Promise<Sponsor[]> {
    const { data, error } = await this.supabase
      .from("sponsors")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(toSponsor);
  }

  async create(input: NewSponsor): Promise<Sponsor> {
    const { data, error } = await this.supabase
      .from("sponsors")
      .insert({ event_id: input.eventId, name: input.name, tier: input.tier, logo_url: input.logoUrl })
      .select()
      .single();
    if (error) throw error;
    return toSponsor(data);
  }

  async delete(sponsorId: string): Promise<void> {
    const { error } = await this.supabase.from("sponsors").delete().eq("id", sponsorId);
    if (error) throw error;
  }
}
