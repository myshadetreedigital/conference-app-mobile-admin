import { z } from "zod";
import { DEFAULT_TIME_ZONE, isZonelessLocalTime, zonedLocalToIso } from "@/lib/event-time";
import type { Session, SessionRepository } from "@/repositories/session-repository";

// Accepts an empty/missing value (-> null) or a date/time, and normalizes it to a full ISO
// string for storage. A time typed without a zone (what the form's datetime-local input
// sends) is the clock time in the event's time zone; a time that carries its own zone
// (an ISO string) is taken as it is. Anything else non-empty is rejected.
function optionalDateTime(timeZone: string) {
  return z
    .string()
    .trim()
    .optional()
    .transform((value, ctx): string | null => {
      if (!value) return null;
      const iso = isZonelessLocalTime(value)
        ? zonedLocalToIso(value, timeZone)
        : Number.isNaN(Date.parse(value))
          ? null
          : new Date(value).toISOString();
      if (iso === null) {
        ctx.addIssue({ code: "custom", message: "Must be a valid date/time" });
        return z.NEVER;
      }
      return iso;
    });
}

/**
 * Speakers may only be linked from the event's own speaker list. The database only
 * checks that the linked speaker exists, so without this an id copied from another
 * event would be accepted.
 */
function sessionSchema(allowedSpeakerIds: readonly string[], timeZone: string) {
  return z
    .object({
      title: z.string().trim().min(1, "Title is required"),
      description: z.string().trim().default(""),
      location: z.string().trim().default(""),
      startsAt: optionalDateTime(timeZone),
      endsAt: optionalDateTime(timeZone),
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

/**
 * `eventSpeakerIds` is every speaker id of this event: the only ones a session may link.
 * `timeZone` is the event's zone, which typed times are read in.
 */
export async function createSession(
  repo: SessionRepository,
  eventId: string,
  rawInput: SessionInput,
  eventSpeakerIds: readonly string[] = [],
  timeZone: string = DEFAULT_TIME_ZONE,
): Promise<CreateSessionResult> {
  const parsed = sessionSchema(eventSpeakerIds, timeZone).safeParse(rawInput);
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
  timeZone: string = DEFAULT_TIME_ZONE,
): Promise<UpdateSessionResult> {
  const parsed = sessionSchema(eventSpeakerIds, timeZone).safeParse(rawInput);
  if (!parsed.success) {
    return { status: "invalid", errors: parsed.error.format() };
  }
  await repo.update(sessionId, parsed.data);
  return { status: "updated" };
}

export async function deleteSession(repo: SessionRepository, sessionId: string): Promise<void> {
  await repo.delete(sessionId);
}
