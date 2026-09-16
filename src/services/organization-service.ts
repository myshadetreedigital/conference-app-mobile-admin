import { z } from "zod";
import {
  OrganizationCreationRejectedError,
  type Organization,
  type OrganizationRepository,
} from "@/repositories/organization-repository";

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  email: z.string().trim().min(1, "Email is required").email("Must be a valid email"),
  address: z.string().trim().default(""),
});

export type CreateOrganizationInput = z.input<typeof createOrganizationSchema>;

export type CreateOrganizationResult =
  | { status: "created"; organization: Organization }
  | { status: "possible_duplicate"; duplicateOfId: string }
  | { status: "invalid"; errors: z.ZodFormattedError<CreateOrganizationInput> }
  | { status: "already_has_organization" };

/**
 * One responsibility per step, per docs/ARCHITECTURE.md's Single
 * Responsibility section: validation is the schema's job,
 * duplicate-detection and persistence are the repository's job, this
 * function only orchestrates between them. No navigation/redirect
 * logic belongs here — that's the caller's (route/action's) job.
 */
export async function createOrganization(
  repo: OrganizationRepository,
  userId: string,
  rawInput: CreateOrganizationInput,
  options: { confirmDespiteDuplicate?: boolean } = {},
): Promise<CreateOrganizationResult> {
  const parsed = createOrganizationSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: "invalid", errors: parsed.error.format() };
  }
  const input = parsed.data;

  if (!options.confirmDespiteDuplicate) {
    const duplicateOfId = await repo.findPossibleDuplicate(input.name, input.phone, input.email);
    if (duplicateOfId) {
      return { status: "possible_duplicate", duplicateOfId };
    }
  }

  try {
    const organization = await repo.create({ ...input, createdBy: userId });
    return { status: "created", organization };
  } catch (err) {
    if (err instanceof OrganizationCreationRejectedError) {
      return { status: "already_has_organization" };
    }
    throw err;
  }
}

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  phone: z.string().trim().min(1, "Phone is required"),
  email: z.string().trim().min(1, "Email is required").email("Must be a valid email"),
  address: z.string().trim().default(""),
});

export type UpdateOrganizationInput = z.input<typeof updateOrganizationSchema>;

export type UpdateOrganizationResult =
  | { status: "updated" }
  | { status: "invalid"; errors: z.ZodFormattedError<UpdateOrganizationInput> };

// No duplicate-detection here on purpose: that check exists to keep
// two admins from unknowingly onboarding the same organization
// twice, which doesn't apply when an existing admin is editing their
// own org's details.
export async function updateOrganization(
  repo: OrganizationRepository,
  organizationId: string,
  rawInput: UpdateOrganizationInput,
): Promise<UpdateOrganizationResult> {
  const parsed = updateOrganizationSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: "invalid", errors: parsed.error.format() };
  }
  await repo.update(organizationId, parsed.data);
  return { status: "updated" };
}
