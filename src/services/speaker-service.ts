import { z } from "zod";
import type { Speaker, SpeakerRepository } from "@/repositories/speaker-repository";

export const createSpeakerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  title: z.string().trim().default(""),
  bio: z.string().trim().default(""),
  featured: z.boolean().default(false),
  // Already a Storage public URL by the time it reaches here — the
  // upload itself is an I/O side effect handled by the action, not
  // this validation/persistence service (see docs/ARCHITECTURE.md's
  // Single Responsibility section).
  photoUrl: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((v): string | null => (v ? v : null)),
});

export type CreateSpeakerInput = z.input<typeof createSpeakerSchema>;

export type CreateSpeakerResult =
  | { status: "created"; speaker: Speaker }
  | { status: "invalid"; errors: z.ZodFormattedError<CreateSpeakerInput> };

export async function createSpeaker(
  repo: SpeakerRepository,
  eventId: string,
  rawInput: CreateSpeakerInput,
): Promise<CreateSpeakerResult> {
  const parsed = createSpeakerSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: "invalid", errors: parsed.error.format() };
  }
  const speaker = await repo.create({ eventId, ...parsed.data });
  return { status: "created", speaker };
}

export const updateSpeakerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  title: z.string().trim().default(""),
  bio: z.string().trim().default(""),
  featured: z.boolean().default(false),
});

export type UpdateSpeakerInput = z.input<typeof updateSpeakerSchema>;

export type UpdateSpeakerResult =
  | { status: "updated" }
  | { status: "invalid"; errors: z.ZodFormattedError<UpdateSpeakerInput> };

/**
 * newPhotoUrl is a separate parameter, not part of the validated
 * form fields — it's only set by the action when a new file was
 * actually uploaded, matching the same "I/O side effect handled by
 * the action" reasoning as create's photoUrl. Leaving it undefined
 * keeps the existing photo untouched.
 */
export async function updateSpeaker(
  repo: SpeakerRepository,
  speakerId: string,
  rawInput: UpdateSpeakerInput,
  newPhotoUrl?: string | null,
): Promise<UpdateSpeakerResult> {
  const parsed = updateSpeakerSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: "invalid", errors: parsed.error.format() };
  }
  await repo.update(speakerId, { ...parsed.data, photoUrl: newPhotoUrl });
  return { status: "updated" };
}

export async function deleteSpeaker(repo: SpeakerRepository, speakerId: string): Promise<void> {
  await repo.delete(speakerId);
}
