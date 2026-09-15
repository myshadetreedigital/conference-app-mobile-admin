import { z } from "zod";
import type { Sponsor, SponsorRepository } from "@/repositories/sponsor-repository";

const TIERS = ["diamond", "platinum", "gold", "silver", "bronze", "a_la_carte"] as const;

export const createSponsorSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  tier: z.enum(TIERS).default("a_la_carte"),
  // Already a Storage public URL by the time it reaches here — same
  // reasoning as speaker-service's photoUrl.
  logoUrl: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((v): string | null => (v ? v : null)),
});

export type CreateSponsorInput = z.input<typeof createSponsorSchema>;

export type CreateSponsorResult =
  | { status: "created"; sponsor: Sponsor }
  | { status: "invalid"; errors: z.ZodFormattedError<CreateSponsorInput> };

export async function createSponsor(
  repo: SponsorRepository,
  eventId: string,
  rawInput: CreateSponsorInput,
): Promise<CreateSponsorResult> {
  const parsed = createSponsorSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: "invalid", errors: parsed.error.format() };
  }
  const sponsor = await repo.create({ eventId, ...parsed.data });
  return { status: "created", sponsor };
}

export const updateSponsorSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  tier: z.enum(TIERS).default("a_la_carte"),
});

export type UpdateSponsorInput = z.input<typeof updateSponsorSchema>;

export type UpdateSponsorResult =
  | { status: "updated" }
  | { status: "invalid"; errors: z.ZodFormattedError<UpdateSponsorInput> };

/** newLogoUrl works the same way as updateSpeaker's newPhotoUrl — see
 *  that function's comment. */
export async function updateSponsor(
  repo: SponsorRepository,
  sponsorId: string,
  rawInput: UpdateSponsorInput,
  newLogoUrl?: string | null,
): Promise<UpdateSponsorResult> {
  const parsed = updateSponsorSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: "invalid", errors: parsed.error.format() };
  }
  await repo.update(sponsorId, { ...parsed.data, logoUrl: newLogoUrl });
  return { status: "updated" };
}

export async function deleteSponsor(repo: SponsorRepository, sponsorId: string): Promise<void> {
  await repo.delete(sponsorId);
}
