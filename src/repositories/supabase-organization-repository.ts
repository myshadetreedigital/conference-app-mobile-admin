import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  NewOrganization,
  Organization,
  OrganizationRepository,
} from "./organization-repository";
import { OrganizationCreationRejectedError } from "./organization-repository";

interface OrganizationRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  flagged_duplicate_of: string | null;
  created_by: string;
}

function toOrganization(row: OrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    flaggedDuplicateOf: row.flagged_duplicate_of,
    createdBy: row.created_by,
  };
}

export class SupabaseOrganizationRepository implements OrganizationRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async findByAdminUserId(userId: string): Promise<Organization | null> {
    const { data, error } = await this.supabase
      .from("admin_memberships")
      .select("organizations(*)")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    const org = data?.organizations as unknown as OrganizationRow | null;
    return org ? toOrganization(org) : null;
  }

  async findPossibleDuplicate(name: string, phone: string, email: string): Promise<string | null> {
    const { data, error } = await this.supabase.rpc("find_possible_duplicate_org", {
      p_name: name,
      p_phone: phone,
      p_email: email,
    });
    if (error) throw error;
    return data ?? null;
  }

  async create(input: NewOrganization): Promise<Organization> {
    const { data, error } = await this.supabase
      .from("organizations")
      .insert({
        name: input.name,
        phone: input.phone,
        email: input.email,
        address: input.address,
        created_by: input.createdBy,
      })
      .select()
      .single();

    if (error) {
      // 42501 = insufficient_privilege — the RLS insert policy
      // rejected this row, which for `organizations` only happens
      // via the "one organization per admin" check.
      if (error.code === "42501") {
        throw new OrganizationCreationRejectedError(error.message);
      }
      throw error;
    }
    return toOrganization(data);
  }
}
