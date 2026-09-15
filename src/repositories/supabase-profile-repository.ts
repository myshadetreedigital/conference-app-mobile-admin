import type { SupabaseClient } from "@supabase/supabase-js";
import type { Profile, ProfileRepository } from "./profile-repository";

interface ProfileRow {
  id: string;
  first_name: string;
  last_name: string;
}

function toProfile(row: ProfileRow): Profile {
  return { id: row.id, firstName: row.first_name, lastName: row.last_name };
}

export class SupabaseProfileRepository implements ProfileRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findById(userId: string): Promise<Profile | null> {
    const { data, error } = await this.supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    return data ? toProfile(data) : null;
  }
}
