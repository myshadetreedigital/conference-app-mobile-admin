import { z } from "zod";
import type { Session, SessionRepository } from "@/repositories/session-repository";

export const createSessionSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().default(""),
  location: z.string().trim().default(""),
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
