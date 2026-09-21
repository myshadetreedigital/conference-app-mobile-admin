import { z } from "zod";
import type { Session, SessionRepository } from "@/repositories/session-repository";

// Accepts an empty/missing value (-> null) or a string parseable as a
// date, and normalizes to a full ISO string for storage. Rejects
// anything non-empty that isn't a valid date/time.
const optionalDateTime = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => v === undefined || !Number.isNaN(Date.parse(v)), {
    message: "Must be a valid date/time",
  })
  .transform((v): string | null => (v === undefined ? null : new Date(v).toISOString()));

/**
 * Speakers may only be linked from the event's own speaker list. The database only
 * checks that the linked speaker exists, so without this an id copied from another
 * event would be accepted.
 */
function sessionSchema(allowedSpeakerIds: readonly string[]) {
  return z
    .object({
      title: z.string().trim().min(1, "Title is required"),
      description: z.string().trim().default(""),
      location: z.string().trim().default(""),
      startsAt: optionalDateTime,
      endsAt: optionalDateTime,
      speakerIds: z
        .array(z.string())
        .default([])
        .refine((ids) => ids.every((id) => allowedSpeakerIds.includes(id)), {
          message: "Choose speakers from this event's speaker list",
        })
        .transform((ids) => [...new Set(ids)]),
    })
    .refine((data) => !data.startsAt || !data.endsAt || data.startsAt <= data.endsAt, {
      message: "End time must be after start time",
      path: ["endsAt"],
    });
}

export type SessionInput = z.input<ReturnType<typeof sessionSchema>>;

export type CreateSessionResult =
  | { status: "created"; session: Session }
  | { status: "invalid"; errors: z.ZodFormattedError<SessionInput> };

export type UpdateSessionResult =
  | { status: "updated" }
  | { status: "invalid"; errors: z.ZodFormattedError<SessionInput> };

/** `eventSpeakerIds` is every speaker id of this event: the only ones a session may link. */
export async function createSession(
  repo: SessionRepository,
  eventId: string,
  rawInput: SessionInput,
  eventSpeakerIds: readonly string[] = [],
): Promise<CreateSessionResult> {
  const parsed = sessionSchema(eventSpeakerIds).safeParse(rawInput);
  if (!parsed.success) {
    return { status: "invalid", errors: parsed.error.format() };
  }
  const session = await repo.create({ eventId, ...parsed.data });
  return { status: "created", session };
}

export async function updateSession(
  repo: SessionRepository,
  sessionId: string,
  rawInput: SessionInput,
  eventSpeakerIds: readonly string[] = [],
): Promise<UpdateSessionResult> {
  const parsed = sessionSchema(eventSpeakerIds).safeParse(rawInput);
  if (!parsed.success) {
    return { status: "invalid", errors: parsed.error.format() };
  }
  await repo.update(sessionId, parsed.data);
  return { status: "updated" };
}

export async function deleteSession(repo: SessionRepository, sessionId: string): Promise<void> {
  await repo.delete(sessionId);
}
