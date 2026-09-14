import { randomUUID } from "node:crypto";
import type {
  NewOrganization,
  Organization,
  OrganizationRepository,
} from "@/repositories/organization-repository";

/**
 * Test double for OrganizationRepository. Duplicate matching mirrors
 * the real `find_possible_duplicate_org` Postgres function's rule:
 * 2-of-3 {name, phone, email} match, both sides non-empty required
 * for a field to count. See docs/PRODUCT-DECISIONS.md.
 */
export class InMemoryOrganizationRepository implements OrganizationRepository {
  private readonly byId = new Map<string, Organization>();
  private readonly membershipByUserId = new Map<string, string>();

  async findByAdminUserId(userId: string): Promise<Organization | null> {
    const orgId = this.membershipByUserId.get(userId);
    return orgId ? (this.byId.get(orgId) ?? null) : null;
  }

  async findPossibleDuplicate(name: string, phone: string, email: string): Promise<string | null> {
    const candidateName = name.trim().toLowerCase();
    const candidatePhone = phone.trim().replace(/\D/g, "");
    const candidateEmail = email.trim().toLowerCase();

    for (const org of this.byId.values()) {
      let matches = 0;
      if (org.name.trim().toLowerCase() === candidateName) matches++;
      const orgPhone = org.phone.trim().replace(/\D/g, "");
      if (orgPhone !== "" && candidatePhone !== "" && orgPhone === candidatePhone) matches++;
      const orgEmail = org.email.trim().toLowerCase();
      if (orgEmail !== "" && candidateEmail !== "" && orgEmail === candidateEmail) matches++;
      if (matches >= 2) return org.id;
    }
    return null;
  }

  async create(input: NewOrganization): Promise<Organization> {
    const org: Organization = { id: randomUUID(), flaggedDuplicateOf: null, ...input };
    this.byId.set(org.id, org);
    this.membershipByUserId.set(input.createdBy, org.id);
    return org;
  }
}
