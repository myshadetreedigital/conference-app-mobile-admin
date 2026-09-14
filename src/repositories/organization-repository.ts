export interface Organization {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  flaggedDuplicateOf: string | null;
  createdBy: string;
}

export interface NewOrganization {
  name: string;
  phone: string;
  email: string;
  address: string;
  createdBy: string;
}

/**
 * Scoped to the organizations aggregate only — a consumer that just
 * needs to check for a duplicate shouldn't have to depend on
 * anything that knows how to write events or speakers. See
 * docs/ARCHITECTURE.md's Layering section.
 */
export interface OrganizationRepository {
  findByAdminUserId(userId: string): Promise<Organization | null>;
  /** Wraps the `find_possible_duplicate_org` security-definer function. */
  findPossibleDuplicate(name: string, phone: string, email: string): Promise<string | null>;
  create(data: NewOrganization): Promise<Organization>;
}
