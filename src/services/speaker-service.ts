import { z } from "zod";
import type { Speaker, SpeakerRepository } from "@/repositories/speaker-repository";

export const createSpeakerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  title: z.string().trim().default(""),
  bio: z.string().trim().default(""),
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

export async function deleteSpeaker(repo: SpeakerRepository, speakerId: string): Promise<void> {
  await repo.delete(speakerId);
}
