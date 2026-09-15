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

export const createSessionSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required"),
    description: z.string().trim().default(""),
    location: z.string().trim().default(""),
    startsAt: optionalDateTime,
    endsAt: optionalDateTime,
  })
  .refine((data) => !data.startsAt || !data.endsAt || data.startsAt <= data.endsAt, {
    message: "End time must be after start time",
    path: ["endsAt"],
  });

export type CreateSessionInput = z.input<typeof createSessionSchema>;

export type CreateSessionResult =
  | { status: "created"; session: Session }
  | { status: "invalid"; errors: z.ZodFormattedError<CreateSessionInput> };

export async function createSession(
  repo: SessionRepository,
  eventId: string,
  rawInput: CreateSessionInput,
): Promise<CreateSessionResult> {
  const parsed = createSessionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: "invalid", errors: parsed.error.format() };
  }
  const session = await repo.create({ eventId, ...parsed.data });
  return { status: "created", session };
}

export async function deleteSession(repo: SessionRepository, sessionId: string): Promise<void> {
  await repo.delete(sessionId);
}
