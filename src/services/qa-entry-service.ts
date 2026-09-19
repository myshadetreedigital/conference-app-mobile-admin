import { z } from "zod";
import { htmlField } from "./html-field";
import type { QaEntry, QaEntryRepository } from "@/repositories/qa-entry-repository";

export const MAX_QUESTION_LENGTH = 300;
export const MAX_ANSWER_LENGTH = 5000;

// Questions are plain text on one line — they render as a heading, so line
// breaks and formatting have no place in them.
const questionSchema = z
  .string()
  .trim()
  .min(1, "Question is required")
  .max(MAX_QUESTION_LENGTH, `Question is too long (${MAX_QUESTION_LENGTH} characters max).`)
  .transform((q) => q.replace(/\s+/g, " "));

// Answers use the same small subset of HTML as text pages (see
// src/lib/html-content.ts): checked and rewritten into a canonical form when
// submitted, or rejected with a readable error.
const answerSchema = htmlField(MAX_ANSWER_LENGTH);

export const qaEntrySchema = z.object({ question: questionSchema, answer: answerSchema });

export type QaEntryInput = z.input<typeof qaEntrySchema>;

export type CreateQaEntryResult =
  | { status: "created"; entry: QaEntry }
  | { status: "invalid"; errors: z.ZodFormattedError<QaEntryInput> };

export async function createQaEntry(
  repo: QaEntryRepository,
  target: { eventId: string; sectionId: string },
  rawInput: QaEntryInput,
): Promise<CreateQaEntryResult> {
  const parsed = qaEntrySchema.safeParse(rawInput);
  if (!parsed.success) return { status: "invalid", errors: parsed.error.format() };
  const entry = await repo.create({ ...target, ...parsed.data });
  return { status: "created", entry };
}

export type UpdateQaEntryResult =
  | { status: "updated" }
  | { status: "invalid"; errors: z.ZodFormattedError<QaEntryInput> };

export async function updateQaEntry(
  repo: QaEntryRepository,
  entryId: string,
  rawInput: QaEntryInput,
): Promise<UpdateQaEntryResult> {
  const parsed = qaEntrySchema.safeParse(rawInput);
  if (!parsed.success) return { status: "invalid", errors: parsed.error.format() };
  await repo.update(entryId, parsed.data);
  return { status: "updated" };
}

export async function deleteQaEntry(repo: QaEntryRepository, entryId: string): Promise<void> {
  await repo.delete(entryId);
}

/**
 * The ids after moving one entry a place up or down. Moving the first entry
 * up, or the last down, changes nothing; an unknown id changes nothing.
 */
export function movedIds(orderedIds: string[], entryId: string, direction: "up" | "down"): string[] {
  const from = orderedIds.indexOf(entryId);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from === -1 || to < 0 || to >= orderedIds.length) return orderedIds;
  const next = [...orderedIds];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

export async function moveQaEntry(
  repo: QaEntryRepository,
  target: { eventId: string; sectionId: string },
  entryId: string,
  direction: "up" | "down",
): Promise<void> {
  const siblings = (await repo.listByEvent(target.eventId))
    .filter((e) => e.sectionId === target.sectionId)
    .sort((a, b) => a.position - b.position);
  const ids = siblings.map((e) => e.id);
  const next = movedIds(ids, entryId, direction);
  if (next !== ids) await repo.reorder(target.sectionId, next);
}
