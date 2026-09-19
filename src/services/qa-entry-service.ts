import { z } from "zod";
import type { QaEntryRepository } from "@/repositories/qa-entry-repository";
import { htmlField } from "./html-field";

// A Q&A page's pairs are edited together with the row, in one form: the admin
// adds, removes and reorders pairs in the browser and saves once. This service
// checks the whole set, then makes the stored entries match it.

import { MAX_ANSWER_LENGTH, MAX_QA_PAIRS, MAX_QUESTION_LENGTH } from "@/lib/qa-limits";

export { MAX_ANSWER_LENGTH, MAX_QA_PAIRS, MAX_QUESTION_LENGTH };

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

/** One pair as submitted from the form. `id` is the stored entry's id, or "" for a pair that is new. */
export interface QaPairInput {
  id: string;
  question: string;
  answer: string;
}

/** A pair that passed every check, ready to store. */
export interface ValidQaPair {
  id: string | undefined;
  question: string;
  answer: string;
}

export type QaPairsResult = { ok: true; pairs: ValidQaPair[] } | { ok: false; errors: string[] };

/**
 * Checks every submitted pair. A pair with both boxes empty is ignored (the
 * form always offers a spare one). Problems are reported against the pair's
 * number as shown in the form, and nothing is stored if there are any.
 */
export function validateQaPairs(submitted: QaPairInput[]): QaPairsResult {
  if (submitted.length > MAX_QA_PAIRS) {
    return { ok: false, errors: [`A Q&A page can have at most ${MAX_QA_PAIRS} questions.`] };
  }

  const pairs: ValidQaPair[] = [];
  const errors = new Set<string>();
  submitted.forEach((pair, index) => {
    if (pair.question.trim() === "" && pair.answer.trim() === "") return;
    const parsed = qaEntrySchema.safeParse({ question: pair.question, answer: pair.answer });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) errors.add(`Question ${index + 1}: ${issue.message}`);
      return;
    }
    pairs.push({ id: pair.id || undefined, ...parsed.data });
  });

  return errors.size > 0 ? { ok: false, errors: [...errors] } : { ok: true, pairs };
}

/**
 * Makes a section's stored entries match the given pairs, in this order:
 * pairs that are no longer there are deleted, pairs with a known id are
 * updated, the rest are created. An id that doesn't belong to this section is
 * treated as new, so a forged id can't touch another section's entry.
 *
 * These are several small writes, not one transaction; if one fails, saving
 * again brings everything into line.
 */
export async function saveQaPairs(
  repo: QaEntryRepository,
  target: { eventId: string; sectionId: string },
  pairs: ValidQaPair[],
): Promise<void> {
  const existing = (await repo.listByEvent(target.eventId)).filter((e) => e.sectionId === target.sectionId);
  const existingIds = new Set(existing.map((e) => e.id));
  const kept = new Set(pairs.flatMap((p) => (p.id && existingIds.has(p.id) ? [p.id] : [])));

  for (const entry of existing) {
    if (!kept.has(entry.id)) await repo.delete(entry.id);
  }

  const orderedIds: string[] = [];
  const used = new Set<string>();
  for (const pair of pairs) {
    if (pair.id && existingIds.has(pair.id) && !used.has(pair.id)) {
      used.add(pair.id);
      await repo.update(pair.id, { question: pair.question, answer: pair.answer });
      orderedIds.push(pair.id);
    } else {
      const created = await repo.create({ ...target, question: pair.question, answer: pair.answer });
      orderedIds.push(created.id);
    }
  }

  if (orderedIds.length > 0) await repo.reorder(target.sectionId, orderedIds);
}
