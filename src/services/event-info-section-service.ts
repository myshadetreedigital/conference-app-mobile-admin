import { z } from "zod";
import { findBadLink, MAX_SECTION_BODY_LENGTH } from "@/lib/markdown-links";
import {
  EVENT_INFO_SECTION_ICONS,
  EVENT_INFO_SECTION_LINK_TARGETS,
  EVENT_INFO_SECTION_PAGE_STYLES,
} from "@/repositories/event-info-section-repository";
import type { EventInfoSection, EventInfoSectionRepository } from "@/repositories/event-info-section-repository";

const iconSchema = z.enum(EVENT_INFO_SECTION_ICONS);

// Section text may contain Markdown links; each must be a safe https link
// (see src/lib/markdown-links.ts).
const bodySchema = z
  .string()
  .trim()
  .max(MAX_SECTION_BODY_LENGTH, "Text is too long.")
  .superRefine((body, ctx) => {
    const problem = findBadLink(body);
    if (problem) ctx.addIssue({ code: "custom", message: problem });
  })
  .default("");

// Blank/missing = a normal page of text; otherwise the row opens that screen.
const linkTargetSchema = z.enum(EVENT_INFO_SECTION_LINK_TARGETS).nullish().transform((v) => v ?? null);

// How the row's own page is laid out: "text" (the body) or "qa" (its Q&A entries).
const pageStyleSchema = z.enum(EVENT_INFO_SECTION_PAGE_STYLES).default("text");

// A row either opens a screen or has its own page — never a Q&A page that also
// jumps somewhere else.
const qaOrScreenCheck = (v: { pageStyle: string; linkTarget: string | null }) =>
  !(v.pageStyle === "qa" && v.linkTarget);
const qaOrScreenIssue = { message: "A Q&A page can't also open a screen.", path: ["pageStyle"] };

export const createEventInfoSectionSchema = z.object({
  icon: iconSchema,
  title: z.string().trim().min(1, "Title is required"),
  body: bodySchema,
  linkTarget: linkTargetSchema,
  pageStyle: pageStyleSchema,
}).refine(qaOrScreenCheck, qaOrScreenIssue);

export type CreateEventInfoSectionInput = z.input<typeof createEventInfoSectionSchema>;

export type CreateEventInfoSectionResult =
  | { status: "created"; section: EventInfoSection }
  | { status: "invalid"; errors: z.ZodFormattedError<CreateEventInfoSectionInput> };

export async function createEventInfoSection(
  repo: EventInfoSectionRepository,
  eventId: string,
  rawInput: CreateEventInfoSectionInput,
): Promise<CreateEventInfoSectionResult> {
  const parsed = createEventInfoSectionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: "invalid", errors: parsed.error.format() };
  }
  const section = await repo.create({ eventId, ...parsed.data });
  return { status: "created", section };
}

export const updateEventInfoSectionSchema = z.object({
  icon: iconSchema,
  title: z.string().trim().min(1, "Title is required"),
  body: bodySchema,
  linkTarget: linkTargetSchema,
  pageStyle: pageStyleSchema,
}).refine(qaOrScreenCheck, qaOrScreenIssue);

export type UpdateEventInfoSectionInput = z.input<typeof updateEventInfoSectionSchema>;

export type UpdateEventInfoSectionResult =
  | { status: "updated" }
  | { status: "invalid"; errors: z.ZodFormattedError<UpdateEventInfoSectionInput> };

export async function updateEventInfoSection(
  repo: EventInfoSectionRepository,
  sectionId: string,
  rawInput: UpdateEventInfoSectionInput,
): Promise<UpdateEventInfoSectionResult> {
  const parsed = updateEventInfoSectionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { status: "invalid", errors: parsed.error.format() };
  }
  await repo.update(sectionId, parsed.data);
  return { status: "updated" };
}

export async function deleteEventInfoSection(
  repo: EventInfoSectionRepository,
  sectionId: string,
): Promise<void> {
  await repo.delete(sectionId);
}
