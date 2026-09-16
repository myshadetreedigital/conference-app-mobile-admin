import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import type {
  NewOrganization,
  Organization,
  OrganizationRepository,
  UpdateOrganizationData,
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
    // Deliberately not chaining .select() (RETURNING): Postgres
    // requires a just-inserted row to satisfy the table's SELECT
    // policy (is_org_admin(id)) for RETURNING to succeed, and that
    // policy depends on a row the handle_new_organization() AFTER
    // INSERT trigger creates in the *same* statement — which Postgres
    // does not reliably see as visible in time for RETURNING's own
    // check, regardless of function volatility. Confirmed by direct
    // testing: the bare insert below succeeds and is immediately
    // visible to a separate, subsequent select; the identical insert
    // with .select() chained on fails every time. Generating the id
    // client-side means there's nothing left to fetch back — we
    // already know every field of the row we just wrote.
    const id = randomUUID();
    const { error } = await this.supabase.from("organizations").insert({
      id,
      name: input.name,
      phone: input.phone,
      email: input.email,
      address: input.address,
      created_by: input.createdBy,
    });

    if (error) {
      // 23505 = unique_violation — the "one organization per admin"
      // rule is enforced by admin_memberships_one_per_user, a unique
      // index on admin_memberships(user_id). The
      // handle_new_organization() trigger's insert into
      // admin_memberships fails this constraint when the admin
      // already has one, rolling back this entire organization
      // insert with it.
      if (error.code === "23505") {
        throw new OrganizationCreationRejectedError(error.message);
      }
      throw error;
    }

    return {
      id,
      name: input.name,
      phone: input.phone,
      email: input.email,
      address: input.address,
      flaggedDuplicateOf: null,
      createdBy: input.createdBy,
    };
  }

  async update(organizationId: string, data: UpdateOrganizationData): Promise<void> {
    const { error } = await this.supabase
      .from("organizations")
      .update({ name: data.name, phone: data.phone, email: data.email, address: data.address })
      .eq("id", organizationId);
    if (error) throw error;
  }
}
