import { z } from "zod";
import type { Organization, OrganizationRepository } from "@/repositories/organization-repository";

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
  | { status: "invalid"; errors: z.ZodFormattedError<CreateOrganizationInput> };

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

  const organization = await repo.create({ ...input, createdBy: userId });
  return { status: "created", organization };
}
